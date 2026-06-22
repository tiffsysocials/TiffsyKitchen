// Map-based location picker for the kitchen form (Zomato-style: pan the map
// under a fixed center pin, reverse-geocode on settle). Lets an admin place a
// kitchen anywhere — not just at their current GPS position.
//
// Unlike the Consumer app's equivalent screen, this is a Modal (the Admin app
// uses context-based navigation + nested Modals) and it routes all Google calls
// through the backend proxy in area.service.ts, so no Google JS key ships in the
// app bundle.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  FlatList,
  Keyboard,
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAlert } from '../../../hooks/useAlert';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import areaService, { ReverseGeocodeResult } from '../../../services/area.service';
import { AreaAutocompleteSuggestion } from '../../../types/api.types';

interface LocationPickerModalProps {
  visible: boolean;
  initialCoords?: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onConfirm: (result: {
    latitude: number;
    longitude: number;
    addressLine1?: string;
    addressLine2?: string;
    locality?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }) => void;
}

// Indore as fallback center (Tiffsy's primary delivery city).
const DEFAULT_REGION: Region = {
  latitude: 22.7196,
  longitude: 75.8577,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const PIN_REGION: Pick<Region, 'latitudeDelta' | 'longitudeDelta'> = {
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const REVERSE_GEOCODE_DEBOUNCE_MS = 400;
const SEARCH_DEBOUNCE_MS = 350;

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location Permission',
      message: 'This app needs access to your location to center the map.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  initialCoords,
  onClose,
  onConfirm,
}) => {
  const { showError } = useAlert();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [resolved, setResolved] = useState<ReverseGeocodeResult | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AreaAutocompleteSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [resolvingPlace, setResolvingPlace] = useState(false);

  const reverseGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic request id so out-of-order reverse-geocode responses don't
  // clobber the address resolved for the latest pin location.
  const geocodeRequestId = useRef(0);
  // Keep the live region in a ref so timer callbacks read the latest value.
  const regionRef = useRef<Region>(DEFAULT_REGION);

  const setRegionTracked = useCallback((next: Region) => {
    regionRef.current = next;
    setRegion(next);
  }, []);

  const runReverseGeocode = useCallback(async (lat: number, lng: number) => {
    const requestId = ++geocodeRequestId.current;
    setIsResolving(true);
    try {
      const result = await areaService.reverseGeocode(lat, lng);
      if (requestId !== geocodeRequestId.current) return;
      setResolved(result);
    } catch (err) {
      if (requestId !== geocodeRequestId.current) return;
      console.warn('[LocationPickerModal] reverse-geocode failed:', err);
      setResolved(null);
    } finally {
      if (requestId === geocodeRequestId.current) setIsResolving(false);
    }
  }, []);

  const goToCoords = useCallback(
    (lat: number, lng: number, animate = true) => {
      const next: Region = { latitude: lat, longitude: lng, ...PIN_REGION };
      setRegionTracked(next);
      if (animate) mapRef.current?.animateToRegion(next, 500);
      runReverseGeocode(lat, lng);
    },
    [runReverseGeocode, setRegionTracked],
  );

  // When the modal opens, center on the existing coords (edit/typed) or current GPS.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    // Reset transient UI each time it opens.
    setSearchQuery('');
    setSuggestions([]);
    setResolved(null);

    (async () => {
      if (initialCoords) {
        const start: Region = {
          latitude: initialCoords.latitude,
          longitude: initialCoords.longitude,
          ...PIN_REGION,
        };
        // Track immediately so Confirm works even before the animation; then
        // animate once the modal's slide-in has presented and the map is laid out.
        setRegionTracked(start);
        runReverseGeocode(initialCoords.latitude, initialCoords.longitude);
        setTimeout(() => {
          if (!cancelled) mapRef.current?.animateToRegion(start, 400);
        }, 350);
        return;
      }
      try {
        const granted = await requestLocationPermission();
        if (!granted || cancelled) {
          setRegionTracked(DEFAULT_REGION);
          runReverseGeocode(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude);
          return;
        }
        Geolocation.getCurrentPosition(
          (position) => {
            if (cancelled) return;
            const { latitude, longitude } = position.coords;
            goToCoords(latitude, longitude);
          },
          () => {
            if (cancelled) return;
            setRegionTracked(DEFAULT_REGION);
            runReverseGeocode(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
        );
      } catch {
        if (!cancelled) {
          setRegionTracked(DEFAULT_REGION);
          runReverseGeocode(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const onRegionChangeComplete = (next: Region) => {
    setRegionTracked(next);
    if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
    reverseGeocodeTimer.current = setTimeout(() => {
      runReverseGeocode(next.latitude, next.longitude);
    }, REVERSE_GEOCODE_DEBOUNCE_MS);
  };

  // Search via the backend proxy (local DB matches + Google Places suggestions).
  const searchPlaces = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const { latitude, longitude } = regionRef.current;
      const results = await areaService.autocompleteAreas(query, latitude, longitude);
      setSuggestions(results.slice(0, 6));
    } catch (err) {
      console.warn('[LocationPickerModal] autocomplete failed:', err);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const onSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchPlaces(text), SEARCH_DEBOUNCE_MS);
  };

  // Resolve a suggestion to coordinates and move the map there.
  const selectSuggestion = async (s: AreaAutocompleteSuggestion) => {
    Keyboard.dismiss();
    setSearchQuery(s.name);
    setSuggestions([]);
    setResolvingPlace(true);
    try {
      let coords: { latitude: number; longitude: number } | null = null;
      if (s.placeId) {
        const area = await areaService.resolveArea(s.placeId, s.name);
        if (area.coordinates) coords = area.coordinates;
      } else {
        const id = s._id || s.id;
        if (id) {
          const [area] = await areaService.getAreasByIds([id]);
          if (area?.coordinates) coords = area.coordinates;
        }
      }
      if (coords) {
        goToCoords(coords.latitude, coords.longitude);
      } else {
        showError('No coordinates', 'Could not locate that place. Try panning the map instead.');
      }
    } catch (err) {
      console.warn('[LocationPickerModal] resolve place failed:', err);
      showError('Search failed', 'Could not locate that place. Please try again.');
    } finally {
      setResolvingPlace(false);
    }
  };

  const handleLocateMe = useCallback(async () => {
    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        showError('Permission Denied', 'Location permission is required to center the map.');
        return;
      }
      setIsResolving(true);
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          goToCoords(latitude, longitude);
        },
        () => {
          setIsResolving(false);
          showError('Location Error', 'Could not detect your location.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    } catch {
      setIsResolving(false);
      showError('Error', 'Failed to detect location.');
    }
  }, [goToCoords, showError]);

  const handleConfirm = () => {
    onConfirm({
      latitude: region.latitude,
      longitude: region.longitude,
      addressLine1: resolved?.addressLine1,
      addressLine2: resolved?.addressLine2,
      locality: resolved?.locality,
      city: resolved?.city,
      state: resolved?.state,
      pincode: resolved?.pincode,
    });
  };

  const formattedAddress =
    resolved?.formattedAddress ||
    (resolved
      ? [resolved.addressLine1, resolved.locality, resolved.city, resolved.pincode]
          .filter(Boolean)
          .join(', ')
      : '');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Top bar: close + search */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Icon name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.searchWrap}>
            <Icon name="magnify" size={20} color={colors.textMuted} style={{ marginRight: 6 }} />
            <TextInput
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder="Search a city or area…"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
        </View>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsCard}>
            <FlatList
              data={suggestions}
              keyExtractor={(item, index) => item.placeId || item._id || item.id || `s-${index}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => selectSuggestion(item)} style={styles.suggestionRow}>
                  <Icon
                    name="map-marker-outline"
                    size={18}
                    color={colors.primary}
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {!!(item.secondaryText || item.city) && (
                      <Text style={styles.suggestionSub} numberOfLines={1}>
                        {item.secondaryText ||
                          [item.city, item.state].filter(Boolean).join(', ')}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Map */}
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={DEFAULT_REGION}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
            toolbarEnabled={false}
          />

          {/* Fixed center pin overlay (does not move; the map pans under it) */}
          <View pointerEvents="none" style={styles.centerPinWrap}>
            <Icon name="map-marker" size={44} color={colors.primary} />
          </View>

          {resolvingPlace && (
            <View pointerEvents="none" style={styles.placeLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}

          {/* Floating "Locate Me" button */}
          <TouchableOpacity
            onPress={handleLocateMe}
            activeOpacity={0.85}
            style={styles.locateMeButton}
            accessibilityLabel="Center map on my location">
            <Icon name="crosshairs-gps" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Bottom panel: address + confirm */}
        <View style={[styles.bottomPanel, { paddingBottom: spacing.lg + insets.bottom }]}>
          <View style={styles.addressRow}>
            <View style={styles.addressIconWrap}>
              <Icon name="map-marker-radius" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Selected location</Text>
              {isResolving ? (
                <View style={styles.resolvingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.addressText, { marginLeft: 8 }]}>Locating…</Text>
                </View>
              ) : (
                <Text style={styles.addressText} numberOfLines={2}>
                  {formattedAddress || 'Move the map to set a location'}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={isResolving}
            style={[styles.confirmButton, isResolving && { opacity: 0.6 }]}
            activeOpacity={0.85}>
            <Text style={styles.confirmText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  suggestionsCard: {
    position: 'absolute',
    top: 64,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadiusMd,
    maxHeight: 280,
    zIndex: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  suggestionSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  centerPinWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -22,
    marginTop: -44,
    alignItems: 'center',
  },
  placeLoading: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 4 },
    }),
  },
  locateMeButton: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 4 },
    }),
  },
  bottomPanel: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addressIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  addressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  resolvingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  addressText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 18,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadiusMd,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
