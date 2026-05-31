import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TouchableOpacity } from 'react-native';
import { ServiceZone, Area } from '../../../types/api.types';
import { colors } from '../../../theme/colors';

interface ServiceZoneMapViewProps {
  serviceZone: ServiceZone;
  kitchenCoords?: { latitude: number; longitude: number };
  /** Height of the map. Defaults to 260. */
  height?: number;
  interactive?: boolean;
}

function getAreaCoords(area: Area): { latitude: number; longitude: number } | null {
  const c = area.coordinates as any;
  if (!c) return null;
  if (typeof c.latitude === 'number' && typeof c.longitude === 'number') {
    return { latitude: c.latitude, longitude: c.longitude };
  }
  if (Array.isArray(c.coordinates) && c.coordinates.length === 2) {
    return { latitude: c.coordinates[1], longitude: c.coordinates[0] };
  }
  return null;
}

/** Convert GeoJSON [lng, lat] ring to react-native-maps {latitude, longitude}[] */
function geoJsonRingToCoords(ring: number[][]): { latitude: number; longitude: number }[] {
  return ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

/**
 * Returns outer-ring coordinate arrays for an area's real OSM boundary.
 * Handles both Polygon and MultiPolygon.
 */
function getAreaBoundaryRings(
  boundary: Area['boundary'],
): { latitude: number; longitude: number }[][] {
  if (!boundary) return [];
  if (boundary.type === 'Polygon') {
    const outer = (boundary.coordinates as number[][][])[0];
    if (!outer?.length) return [];
    return [geoJsonRingToCoords(outer)];
  }
  return (boundary.coordinates as number[][][][])
    .map((poly) => {
      const outer = poly[0];
      return outer?.length ? geoJsonRingToCoords(outer) : null;
    })
    .filter((r): r is { latitude: number; longitude: number }[] => r !== null);
}

function computeInitialRegion(
  serviceZone: ServiceZone,
  kitchenCoords?: { latitude: number; longitude: number },
): Region {
  const points: { latitude: number; longitude: number }[] = [];

  if (kitchenCoords) points.push(kitchenCoords);

  const areas = Array.isArray(serviceZone.areaIds)
    ? (serviceZone.areaIds as Area[]).filter((a) => typeof a === 'object')
    : [];

  areas.forEach((a) => {
    if (a.boundary) {
      const rings = getAreaBoundaryRings(a.boundary);
      rings.forEach((ring) => ring.forEach((pt) => points.push(pt)));
    } else {
      const c = getAreaCoords(a);
      if (c) points.push(c);
    }
  });

  // Fall back to service zone hull boundary vertices if no areas populated
  if (points.length === 0 && serviceZone.boundary?.coordinates?.[0]) {
    serviceZone.boundary.coordinates[0].forEach(([lng, lat]) => {
      points.push({ latitude: lat, longitude: lng });
    });
  }

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

export const ServiceZoneMapView: React.FC<ServiceZoneMapViewProps> = ({
  serviceZone,
  kitchenCoords,
  height = 260,
  interactive = false,
}) => {
  const mapRef = useRef<MapView>(null);
  const region = computeInitialRegion(serviceZone, kitchenCoords);

  const populatedAreas = Array.isArray(serviceZone.areaIds)
    ? (serviceZone.areaIds as Area[]).filter((a) => typeof a === 'object')
    : [];

  const areasWithCoords = populatedAreas
    .map((a) => ({ area: a, coords: getAreaCoords(a) }))
    .filter((x): x is { area: Area; coords: { latitude: number; longitude: number } } =>
      x.coords !== null,
    );

  const fitAll = () => {
    const coords: { latitude: number; longitude: number }[] = [];
    if (kitchenCoords) coords.push(kitchenCoords);
    areasWithCoords.forEach(({ area, coords: centroid }) => {
      if (area.boundary) {
        const rings = getAreaBoundaryRings(area.boundary);
        rings.forEach((ring) => ring.forEach((pt) => coords.push(pt)));
      } else {
        coords.push(centroid);
      }
    });
    if (coords.length > 0) {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  };

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        pitchEnabled={false}
        rotateEnabled={false}
        onMapReady={interactive ? fitAll : undefined}>

        {/* Individual area boundaries — real OSM polygons */}
        {areasWithCoords.flatMap(({ area, coords }) => {
          const rings = getAreaBoundaryRings(area.boundary);
          if (rings.length > 0) {
            return rings.map((ring, i) => (
              <Polygon
                key={`poly-${area._id}-${i}`}
                coordinates={ring}
                fillColor="rgba(245,107,76,0.15)"
                strokeColor={colors.primary}
                strokeWidth={2}
              />
            ));
          }
          // Fallback: marker for areas without boundary yet
          return [
            <Marker
              key={`m-${area._id}`}
              coordinate={coords}
              title={area.name}
              description={[area.city, area.state].filter(Boolean).join(', ') || undefined}
              pinColor="#F56B4C"
            />,
          ];
        })}

        {kitchenCoords && (
          <Marker coordinate={kitchenCoords} title="Kitchen" pinColor={colors.primary} />
        )}
      </MapView>

      {interactive && (
        <TouchableOpacity style={styles.fitButton} onPress={fitAll} activeOpacity={0.8}>
          <Icon name="fit-to-page-outline" size={20} color="#374151" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fitButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});
