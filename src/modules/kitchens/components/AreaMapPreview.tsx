import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Area } from '../../../types/api.types';
import { colors } from '../../../theme/colors';

type GeoJsonPolygon = { type: 'Polygon'; coordinates: number[][][] };

interface AreaMapPreviewProps {
  kitchenCoords?: { latitude: number; longitude: number };
  areas: Area[];
  onRemoveArea?: (areaId: string) => void;
  /** Pass true when already inside a Modal — avoids nested-Modal crash on Android */
  embeddedInModal?: boolean;
  /** Optional outer boundary polygon rendered as a light overlay */
  boundary?: GeoJsonPolygon;
}

function getAreaCoords(area: Area): { latitude: number; longitude: number } | null {
  const coords = area.coordinates as any;
  if (!coords) return null;
  if (typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
    return { latitude: coords.latitude, longitude: coords.longitude };
  }
  if (Array.isArray(coords.coordinates) && coords.coordinates.length === 2) {
    return { latitude: coords.coordinates[1], longitude: coords.coordinates[0] };
  }
  return null;
}

/**
 * Generate a regular polygon (16 sides) centered at (lat, lng) with the given
 * radius in meters. Used as a fallback when no real OSM boundary exists.
 */
function generateApproxPolygon(
  latitude: number,
  longitude: number,
  radiusMeters: number = 700,
): { latitude: number; longitude: number }[] {
  const SIDES = 16;
  const R = 6371000;
  const latRad = (latitude * Math.PI) / 180;
  const pts: { latitude: number; longitude: number }[] = [];
  for (let i = 0; i <= SIDES; i++) {
    const angle = (2 * Math.PI * i) / SIDES;
    const dLat = (radiusMeters / R) * (180 / Math.PI) * Math.cos(angle);
    const dLng =
      (radiusMeters / R) * (180 / Math.PI) * (Math.sin(angle) / Math.cos(latRad));
    pts.push({ latitude: latitude + dLat, longitude: longitude + dLng });
  }
  return pts;
}

/**
 * Converts an area's real OSM boundary to coordinate ring arrays.
 * Returns empty array if no real boundary exists.
 */
function getRealBoundaryRings(
  boundary: Area['boundary'],
): { latitude: number; longitude: number }[][] {
  if (!boundary) return [];
  if (boundary.type === 'Polygon') {
    const outerRing = (boundary.coordinates as number[][][])[0];
    if (!outerRing?.length) return [];
    return [outerRing.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))];
  }
  // MultiPolygon
  return (boundary.coordinates as number[][][][])
    .map((polygon) => {
      const outer = polygon[0];
      return outer?.length ? outer.map(([lng, lat]) => ({ latitude: lat, longitude: lng })) : null;
    })
    .filter((r): r is { latitude: number; longitude: number }[] => r !== null);
}

function computeRegion(
  kitchenCoords?: { latitude: number; longitude: number },
  areas?: Area[],
): Region {
  const points: { latitude: number; longitude: number }[] = [];
  if (kitchenCoords) points.push(kitchenCoords);

  (areas ?? []).forEach((a) => {
    if (a.boundary) {
      const rings = getRealBoundaryRings(a.boundary);
      rings.forEach((ring) => ring.forEach((pt) => points.push(pt)));
    } else {
      const c = getAreaCoords(a);
      if (c) points.push(c);
    }
  });

  if (points.length === 0) {
    return { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 10, longitudeDelta: 10 };
  }

  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latPad = Math.max((maxLat - minLat) * 0.4, 0.03);
  const lngPad = Math.max((maxLng - minLng) * 0.4, 0.03);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: maxLat - minLat + latPad,
    longitudeDelta: maxLng - minLng + lngPad,
  };
}

// ─── Map layer ─────────────────────────────────────────────────────────────────
const MapLayer: React.FC<{
  kitchenCoords?: { latitude: number; longitude: number };
  areasWithCoords: { area: Area; coords: { latitude: number; longitude: number } }[];
  region: Region;
  interactive: boolean;
  boundary?: GeoJsonPolygon;
}> = ({ kitchenCoords, areasWithCoords, region, interactive, boundary }) => {
  const mapRef = useRef<MapView>(null);

  const outerPolygonCoords = boundary?.coordinates?.[0]?.map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }));

  const fitAll = () => {
    const coords: { latitude: number; longitude: number }[] = [];
    if (kitchenCoords) coords.push(kitchenCoords);
    areasWithCoords.forEach(({ area, coords: centroid }) => {
      const rings = getRealBoundaryRings(area.boundary);
      if (rings.length > 0) {
        rings.forEach((ring) => ring.forEach((pt) => coords.push(pt)));
      } else {
        coords.push(centroid);
      }
    });
    if (outerPolygonCoords) coords.push(...outerPolygonCoords);
    if (coords.length > 0) {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: 60, left: 40 },
        animated: true,
      });
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={region}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        pitchEnabled={false}
        rotateEnabled={false}
        onMapReady={interactive ? fitAll : undefined}>

        {/* Optional outer service zone hull */}
        {outerPolygonCoords && (
          <Polygon
            coordinates={outerPolygonCoords}
            fillColor="rgba(245,107,76,0.04)"
            strokeColor="rgba(245,107,76,0.3)"
            strokeWidth={1}
          />
        )}

        {/* Area boundaries — real OSM polygon or generated approximation */}
        {areasWithCoords.flatMap(({ area, coords }) => {
          const realRings = getRealBoundaryRings(area.boundary);
          const isReal = realRings.length > 0;
          const rings = isReal ? realRings : [generateApproxPolygon(coords.latitude, coords.longitude)];

          return rings.map((ring, i) => (
            <Polygon
              key={`poly-${area._id}-${i}`}
              coordinates={ring}
              fillColor={isReal ? 'rgba(245,107,76,0.18)' : 'rgba(245,107,76,0.10)'}
              strokeColor={isReal ? colors.primary : 'rgba(245,107,76,0.55)'}
              strokeWidth={isReal ? 2 : 1.5}
            />
          ));
        })}

        {kitchenCoords && (
          <Marker coordinate={kitchenCoords} title="Kitchen" pinColor={colors.primary} />
        )}
      </MapView>

      {interactive && (
        <TouchableOpacity style={styles.fitButton} onPress={fitAll}>
          <Icon name="fit-to-page-outline" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Collapsible area chip list ────────────────────────────────────────────────
const AreaChipList: React.FC<{
  areasWithCoords: { area: Area; coords: { latitude: number; longitude: number } }[];
  onRemove?: (areaId: string) => void;
}> = ({ areasWithCoords, onRemove }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <View style={styles.chipSection}>
      <TouchableOpacity
        style={styles.chipSectionHeader}
        onPress={() => setCollapsed((v) => !v)}
        activeOpacity={0.7}>
        <View style={styles.chipSectionHeaderLeft}>
          <Icon name="map-marker-multiple" size={15} color={colors.primary} />
          <Text style={styles.chipSectionTitle}>
            {areasWithCoords.length} area{areasWithCoords.length !== 1 ? 's' : ''} selected
          </Text>
        </View>
        <Icon
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={18}
          color={colors.textPrimary}
        />
      </TouchableOpacity>

      {!collapsed && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {areasWithCoords.map(({ area }) => (
            <View key={area._id} style={styles.areaChip}>
              <Text style={styles.areaChipText} numberOfLines={1}>
                {area.name}
              </Text>
              {onRemove && (
                <TouchableOpacity
                  style={styles.chipRemoveBtn}
                  onPress={() => onRemove(area._id)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Icon name="close-circle" size={15} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// ─── Full-screen modal ─────────────────────────────────────────────────────────
const CoverageMapModal: React.FC<{
  kitchenCoords?: { latitude: number; longitude: number };
  areasWithCoords: { area: Area; coords: { latitude: number; longitude: number } }[];
  region: Region;
  onRemoveArea?: (areaId: string) => void;
  onClose: () => void;
  boundary?: GeoJsonPolygon;
}> = ({ kitchenCoords, areasWithCoords, region, onRemoveArea, onClose, boundary }) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View
        style={[
          styles.modalContainer,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Coverage Map</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <AreaChipList areasWithCoords={areasWithCoords} onRemove={onRemoveArea} />
        <View style={styles.modalMapContainer}>
          <MapLayer
            kitchenCoords={kitchenCoords}
            areasWithCoords={areasWithCoords}
            region={region}
            interactive={true}
            boundary={boundary}
          />
        </View>
      </View>
    </Modal>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────
export const AreaMapPreview: React.FC<AreaMapPreviewProps> = ({
  kitchenCoords,
  areas,
  onRemoveArea,
  embeddedInModal = false,
  boundary,
}) => {
  const [fullScreen, setFullScreen] = useState(false);

  const areasWithCoords = areas
    .map((a) => ({ area: a, coords: getAreaCoords(a) }))
    .filter(
      (x): x is { area: Area; coords: { latitude: number; longitude: number } } =>
        x.coords !== null,
    );

  const region = computeRegion(kitchenCoords, areas);

  if (!kitchenCoords && areasWithCoords.length === 0) {
    return (
      <View style={styles.placeholder}>
        <Icon name="map-outline" size={20} color="#9CA3AF" />
        <Text style={styles.placeholderText}>Set kitchen location to see map preview</Text>
      </View>
    );
  }

  if (embeddedInModal) {
    return (
      <View style={styles.embeddedContainer}>
        <AreaChipList areasWithCoords={areasWithCoords} onRemove={onRemoveArea} />
        <View style={styles.embeddedMap}>
          <MapLayer
            kitchenCoords={kitchenCoords}
            areasWithCoords={areasWithCoords}
            region={region}
            interactive={true}
            boundary={boundary}
          />
        </View>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.thumbnailContainer}
        onPress={() => setFullScreen(true)}
        activeOpacity={0.9}>
        <MapLayer
          kitchenCoords={kitchenCoords}
          areasWithCoords={areasWithCoords}
          region={region}
          interactive={false}
          boundary={boundary}
        />
        <View style={styles.tapOverlay}>
          <View style={styles.tapBadge}>
            <Icon name="fullscreen" size={14} color="#fff" />
            <Text style={styles.tapBadgeText}>Tap to explore</Text>
          </View>
        </View>
        <View style={styles.thumbnailLegend}>
          <Icon name="map-marker-multiple" size={13} color={colors.primary} />
          <Text style={styles.legendText}>
            {areasWithCoords.length} area{areasWithCoords.length !== 1 ? 's' : ''}
            {kitchenCoords ? ' · Kitchen pinned' : ''}
          </Text>
        </View>
      </TouchableOpacity>

      {fullScreen && (
        <CoverageMapModal
          kitchenCoords={kitchenCoords}
          areasWithCoords={areasWithCoords}
          region={region}
          onRemoveArea={onRemoveArea}
          onClose={() => setFullScreen(false)}
          boundary={boundary}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  thumbnailContainer: {
    marginTop: 12,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 180,
  },
  tapOverlay: { position: 'absolute', top: 10, right: 10 },
  tapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tapBadgeText: { color: '#fff', fontSize: 11, fontWeight: '500', marginLeft: 4 },
  thumbnailLegend: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  legendText: { fontSize: 11, color: '#374151', fontWeight: '500', marginLeft: 5 },
  placeholder: {
    marginTop: 12,
    height: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
  },
  placeholderText: { fontSize: 13, color: '#9CA3AF', marginLeft: 6 },
  fitButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  embeddedContainer: {
    marginTop: 12,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  embeddedMap: { height: 260 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalMapContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  closeButton: { padding: 4 },
  chipSection: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  chipSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipSectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  chipSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 6,
  },
  chipRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10 },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3EE',
    borderRadius: 20,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#FDCDB8',
    marginRight: 6,
  },
  areaChipText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    maxWidth: 110,
  },
  chipRemoveBtn: { justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
});
