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
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Area } from '../../../types/api.types';
import { colors } from '../../../theme/colors';

interface AreaMapPreviewProps {
  kitchenCoords?: { latitude: number; longitude: number };
  areas: Area[];
  onRemoveArea?: (areaId: string) => void;
  /** Pass true when already inside a Modal — avoids nested-Modal crash on Android */
  embeddedInModal?: boolean;
}

const AREA_RADIUS_METERS = 600;

/**
 * Handles both coordinate formats:
 * - Normalized { latitude, longitude } — from GET /api/areas via toApiArea()
 * - Raw GeoJSON { type: "Point", coordinates: [lng, lat] } — from Mongoose populate
 */
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

function computeRegion(
  kitchenCoords?: { latitude: number; longitude: number },
  areas?: Area[],
): Region {
  const points: { latitude: number; longitude: number }[] = [];
  if (kitchenCoords) points.push(kitchenCoords);
  (areas ?? []).forEach((a) => {
    const c = getAreaCoords(a);
    if (c) points.push(c);
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
  const latPad = Math.max((maxLat - minLat) * 0.4, 0.02);
  const lngPad = Math.max((maxLng - minLng) * 0.4, 0.02);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: maxLat - minLat + latPad,
    longitudeDelta: maxLng - minLng + lngPad,
  };
}

// ─── Map layer (shared between thumbnail, embedded, and full-screen) ───────────
const MapLayer: React.FC<{
  kitchenCoords?: { latitude: number; longitude: number };
  areasWithCoords: { area: Area; coords: { latitude: number; longitude: number } }[];
  region: Region;
  interactive: boolean;
}> = ({ kitchenCoords, areasWithCoords, region, interactive }) => {
  const mapRef = useRef<MapView>(null);

  const fitAll = () => {
    const coords: { latitude: number; longitude: number }[] = [];
    if (kitchenCoords) coords.push(kitchenCoords);
    areasWithCoords.forEach(({ coords: c }) => coords.push(c));
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
        {kitchenCoords && (
          <Marker coordinate={kitchenCoords} title="Kitchen" pinColor={colors.primary} />
        )}
        {areasWithCoords.map(({ area, coords }) => (
          <React.Fragment key={area._id}>
            <Circle
              center={coords}
              radius={AREA_RADIUS_METERS}
              fillColor="rgba(245,107,76,0.18)"
              strokeColor="#F56B4C"
              strokeWidth={1.5}
            />
            <Marker
              coordinate={coords}
              title={area.name}
              description={[area.city, area.state].filter(Boolean).join(', ') || undefined}
              pinColor="#F56B4C"
            />
          </React.Fragment>
        ))}
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

// ─── Full-screen modal — separate component so useSafeAreaInsets hook is at top level ──
const CoverageMapModal: React.FC<{
  kitchenCoords?: { latitude: number; longitude: number };
  areasWithCoords: { area: Area; coords: { latitude: number; longitude: number } }[];
  region: Region;
  onRemoveArea?: (areaId: string) => void;
  onClose: () => void;
}> = ({ kitchenCoords, areasWithCoords, region, onRemoveArea, onClose }) => {
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

  // ── Embedded mode: already inside a Modal, show interactive map inline ──────
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
          />
        </View>
      </View>
    );
  }

  // ── Normal mode: static thumbnail + full-screen modal ──────────────────────
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
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // Thumbnail
  thumbnailContainer: {
    marginTop: 12,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 180,
  },
  tapOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  tapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tapBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
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
  legendText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 5,
  },
  // Placeholder
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
  placeholderText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 6,
  },
  // Fit button
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
  // Embedded (inside another Modal)
  embeddedContainer: {
    marginTop: 12,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  embeddedMap: {
    height: 260,
  },
  // Full-screen modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalMapContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  // Chip section
  chipSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  chipSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 6,
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
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
  chipRemoveBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});
