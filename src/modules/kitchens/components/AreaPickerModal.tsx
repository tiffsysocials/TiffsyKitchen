import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  AreaAutocompleteSuggestion,
  NearbyArea,
  NearbyAreasMeta,
} from '../../../types/api.types';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import areaService, { NearbyAreasResult } from '../../../services/area.service';

interface AreaPickerModalProps {
  visible: boolean;
  selectedAreaIds: string[];
  latitude?: number;
  longitude?: number;
  cityHint?: string;
  stateHint?: string;
  onClose: () => void;
  onSave: (areaIds: string[], areas: NearbyArea[]) => void;
}

const RADIUS_OPTIONS = [5, 10, 15, 25];

export const AreaPickerModal: React.FC<AreaPickerModalProps> = ({
  visible,
  selectedAreaIds,
  latitude,
  longitude,
  cityHint,
  stateHint,
  onClose,
  onSave,
}) => {
  const [areas, setAreas] = useState<NearbyArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<NearbyAreasMeta | undefined>(undefined);
  const [searchText, setSearchText] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [tempSelected, setTempSelected] = useState<string[]>(selectedAreaIds);

  const [suggestions, setSuggestions] = useState<AreaAutocompleteSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [resolvingPlaceId, setResolvingPlaceId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeqRef = useRef(0);

  const loadAreas = useCallback(async () => {
    if (latitude == null || longitude == null) {
      setAreas([]);
      setMeta(undefined);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result: NearbyAreasResult = await areaService.getNearbyAreas({
        latitude,
        longitude,
        radiusKm,
        cityHint,
        stateHint,
      });
      setAreas(result.areas);
      setMeta(result.meta);
    } catch (err: any) {
      console.error('Error loading nearby areas:', err);
      setError(err?.message || 'Failed to load areas');
      setAreas([]);
      setMeta(undefined);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, radiusKm, cityHint, stateHint]);

  useEffect(() => {
    if (visible) {
      setTempSelected(selectedAreaIds);
      loadAreas();
    }
  }, [visible, selectedAreaIds, loadAreas]);

  // Debounced server-side autocomplete. Runs while the user types and hits
  // the backend (which merges local DB + Google Places Autocomplete).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchText.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const seq = ++searchSeqRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await areaService.autocompleteAreas(
          q,
          latitude,
          longitude,
          50,
        );
        if (seq === searchSeqRef.current) {
          setSuggestions(results);
        }
      } catch (err) {
        if (seq === searchSeqRef.current) setSuggestions([]);
      } finally {
        if (seq === searchSeqRef.current) setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText, latitude, longitude]);

  const toggleArea = (id: string) => {
    setTempSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  // Resolve a Google Places suggestion into a saved Area row, then add it to
  // the selection and the visible nearby list. Idempotent on the backend.
  const handleAddRemote = async (item: AreaAutocompleteSuggestion) => {
    if (!item.placeId) return;
    setResolvingPlaceId(item.placeId);
    try {
      const saved = await areaService.resolveArea(item.placeId, item.name);
      const id = saved.id || (saved as any)._id;
      if (!id) throw new Error('Resolve returned no id');

      const distanceKm =
        latitude != null &&
        longitude != null &&
        saved.coordinates?.latitude != null &&
        saved.coordinates?.longitude != null
          ? haversineKm(
              latitude,
              longitude,
              saved.coordinates.latitude,
              saved.coordinates.longitude,
            )
          : 0;

      const asNearby: NearbyArea = {
        id: String(id),
        name: saved.name,
        city: saved.city,
        state: saved.state,
        distanceKm: Number(distanceKm.toFixed(3)),
        pincodeCount: saved.pincodeCount ?? (saved.pincodes?.length || 0),
      };

      setAreas((prev) =>
        prev.some((a) => a.id === asNearby.id) ? prev : [asNearby, ...prev],
      );
      setTempSelected((prev) =>
        prev.includes(asNearby.id) ? prev : [...prev, asNearby.id],
      );

      // Refresh the suggestion list — replace this remote with a local entry.
      setSuggestions((prev) =>
        prev.map((s) =>
          s.placeId === item.placeId
            ? {
                _remote: false,
                id: asNearby.id,
                name: asNearby.name,
                city: asNearby.city,
                state: asNearby.state,
                distanceKm: asNearby.distanceKm,
                pincodeCount: asNearby.pincodeCount,
              }
            : s,
        ),
      );
    } catch (err: any) {
      console.error('Error resolving area:', err);
      setError(err?.message || 'Failed to add area');
    } finally {
      setResolvingPlaceId(null);
    }
  };

  const handleSave = () => {
    const selectedObjects = areas.filter((a) => tempSelected.includes(a.id));
    onSave(tempSelected, selectedObjects);
    onClose();
  };

  const handleCancel = () => {
    setTempSelected(selectedAreaIds);
    setSearchText('');
    setSuggestions([]);
    onClose();
  };

  const isSearching = searchText.trim().length >= 2;

  // Items shown in the list: search suggestions if searching, else nearby.
  const listItems = useMemo(() => {
    if (isSearching) return suggestions;
    return areas;
  }, [isSearching, suggestions, areas]);

  const renderNearby = ({ item }: { item: NearbyArea }) => {
    const isSelected = tempSelected.includes(item.id);
    const subtitle = [item.city, item.state].filter(Boolean).join(', ');
    return (
      <TouchableOpacity
        style={[styles.row, isSelected && styles.rowSelected]}
        onPress={() => toggleArea(item.id)}>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.distance}>{item.distanceKm.toFixed(2)} km</Text>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {typeof item.pincodeCount === 'number' && item.pincodeCount > 0 ? (
            <Text style={styles.pincodes}>
              {item.pincodeCount} pincode{item.pincodeCount === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Icon name="check" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSuggestion = ({ item }: { item: AreaAutocompleteSuggestion }) => {
    if (item._remote) {
      const isResolving = resolvingPlaceId === item.placeId;
      return (
        <TouchableOpacity
          style={[styles.row, styles.rowRemote]}
          onPress={() => handleAddRemote(item)}
          disabled={isResolving}>
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.googleBadge}>
                <Icon name="google" size={12} color={colors.primary} />
                <Text style={styles.googleBadgeText}>Maps</Text>
              </View>
            </View>
            {item.secondaryText ? (
              <Text style={styles.subtitle}>{item.secondaryText}</Text>
            ) : null}
          </View>
          <View style={styles.addCircle}>
            {isResolving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="plus" size={18} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
      );
    }

    const id = item.id || item._id || '';
    const isSelected = tempSelected.includes(id);
    const subtitle = [item.city, item.state].filter(Boolean).join(', ');
    return (
      <TouchableOpacity
        style={[styles.row, isSelected && styles.rowSelected]}
        onPress={() => toggleArea(id)}>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.name}</Text>
            {item.distanceKm != null ? (
              <Text style={styles.distance}>{item.distanceKm.toFixed(2)} km</Text>
            ) : null}
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {typeof item.pincodeCount === 'number' && item.pincodeCount > 0 ? (
            <Text style={styles.pincodes}>
              {item.pincodeCount} pincode{item.pincodeCount === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Icon name="check" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  const noLocation = latitude == null || longitude == null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Serviceable Areas</Text>
            <TouchableOpacity onPress={handleCancel}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.radiusRow}>
            <Text style={styles.radiusLabel}>Radius:</Text>
            {RADIUS_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusChip, radiusKm === r && styles.radiusChipActive]}
                onPress={() => setRadiusKm(r)}
                disabled={noLocation || loading}>
                <Text
                  style={[
                    styles.radiusChipText,
                    radiusKm === r && styles.radiusChipTextActive,
                  ]}>
                  {r} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search any area (e.g. Navalakha, Palasia)"
              placeholderTextColor={colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              autoCorrect={false}
              autoCapitalize="words"
            />
            {searchLoading && <ActivityIndicator size="small" color={colors.primary} />}
            {!searchLoading && searchText !== '' && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Icon name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.summary}>
            <Icon name="map-marker-multiple" size={16} color={colors.primary} />
            <Text style={styles.summaryText}>
              {tempSelected.length} area{tempSelected.length === 1 ? '' : 's'} selected
              {!noLocation && !isSearching &&
                ` · ${areas.length} within ${radiusKm} km`}
              {isSearching && ` · ${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}`}
            </Text>
          </View>

          {/* Select All / Clear buttons for visible areas */}
          {!noLocation && !isSearching && areas.length > 0 && (
            <View style={bulkButtonStyles.row}>
              <TouchableOpacity
                style={bulkButtonStyles.button}
                onPress={() => {
                  const visibleIds = areas.map((a) => a.id);
                  setTempSelected((prev) => {
                    const merged = new Set(prev);
                    visibleIds.forEach((id) => merged.add(id));
                    return Array.from(merged);
                  });
                }}
              >
                <Icon name="select-all" size={14} color={colors.primary} />
                <Text style={bulkButtonStyles.buttonText}>Select all visible</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={bulkButtonStyles.button}
                onPress={() => setTempSelected([])}
              >
                <Icon name="close-circle-outline" size={14} color={colors.textSecondary} />
                <Text style={[bulkButtonStyles.buttonText, { color: colors.textSecondary }]}>
                  Clear selection
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {meta?.outOfScope && (
            <View style={styles.scopeBanner}>
              <Icon name="information-outline" size={14} color="#92400e" />
              <Text style={styles.scopeBannerText}>
                Coverage is currently restricted to {meta.scopeCity || 'Indore'}.
                This kitchen's location is outside that area, so no nearby areas
                are returned. You can still search by name to find areas inside
                {' '}{meta.scopeCity || 'Indore'}.
              </Text>
            </View>
          )}

          {noLocation ? (
            <View style={styles.emptyContainer}>
              <Icon name="map-marker-question" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                Set the kitchen location first (use "Detect Location" or enter latitude/longitude)
                to load nearby areas.
              </Text>
            </View>
          ) : loading && !isSearching ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading nearby areas...</Text>
            </View>
          ) : error && !isSearching ? (
            <View style={styles.emptyContainer}>
              <Icon name="alert-circle" size={48} color={colors.error} />
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadAreas}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={listItems as any[]}
              renderItem={
                isSearching
                  ? (renderSuggestion as any)
                  : (renderNearby as any)
              }
              keyExtractor={(item: any, idx) =>
                item.placeId || item.id || item._id || `idx-${idx}`
              }
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon
                    name={isSearching ? 'magnify-close' : 'map-marker-off'}
                    size={48}
                    color={colors.textMuted}
                  />
                  <Text style={styles.emptyText}>
                    {isSearching
                      ? searchLoading
                        ? 'Searching...'
                        : 'No matches. Try a different spelling.'
                      : `No areas within ${radiusKm} km. Try a larger radius or search by name.`}
                  </Text>
                  {!isSearching && meta && (
                    <View style={styles.metaBox}>
                      {meta.geocodeFailed && !meta.usedHint && (
                        <Text style={styles.metaWarn}>
                          Backend couldn't reverse-geocode this location and no city hint
                          was provided. Check that the kitchen address has city + state filled
                          in.
                        </Text>
                      )}
                      {meta.geocodeFailed && meta.usedHint && (
                        <Text style={styles.metaWarn}>
                          Reverse-geocode failed; tried "{meta.enrichmentCity}" — got
                          {' '}{meta.enrichmentAddedCount} new areas. They may not be in radius;
                          try a larger one.
                        </Text>
                      )}
                      {!meta.geocodeFailed && meta.triggeredEnrichment && !meta.enrichmentRan && (
                        <Text style={styles.metaWarn}>
                          City "{meta.enrichmentCity}" was already cached but has no areas in
                          this radius. Try a larger radius or use the search box above.
                        </Text>
                      )}
                      {!meta.triggeredEnrichment && meta.initialLocalCount === 0 && (
                        <Text style={styles.metaWarn}>
                          Local DB is empty for this area but enrichment did not trigger.
                          This is unexpected — please check backend logs.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              }
            />
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={tempSelected.length === 0}>
              <Text style={styles.saveButtonText}>Save ({tempSelected.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.card,
    borderTopLeftRadius: spacing.borderRadiusLg,
    borderTopRightRadius: spacing.borderRadiusLg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  radiusLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  radiusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: spacing.borderRadiusSm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  radiusChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  radiusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  radiusChipTextActive: {
    color: colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    margin: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  scopeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#fef3c7',
    borderRadius: spacing.borderRadiusSm,
  },
  scopeBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#92400e',
    lineHeight: 15,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  rowRemote: {
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  distance: {
    fontSize: 12,
    color: colors.textMuted,
  },
  googleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: spacing.borderRadiusSm,
  },
  googleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  pincodes: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: spacing.borderRadiusSm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  addCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  emptyContainer: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  metaBox: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  metaWarn: {
    fontSize: 11,
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: spacing.sm,
    borderRadius: spacing.borderRadiusSm,
    lineHeight: 16,
    textAlign: 'left',
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadiusMd,
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

const bulkButtonStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FE8733',
  },
});
