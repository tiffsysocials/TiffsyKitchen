import React, { useState, useEffect, useCallback } from 'react';
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
import { NearbyArea } from '../../../types/api.types';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import areaService, { NearbyAreasResult } from '../../../services/area.service';
import { NearbyAreasMeta } from '../../../types/api.types';

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
  const [filtered, setFiltered] = useState<NearbyArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<NearbyAreasMeta | undefined>(undefined);
  const [searchText, setSearchText] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [tempSelected, setTempSelected] = useState<string[]>(selectedAreaIds);

  const loadAreas = useCallback(async () => {
    if (latitude == null || longitude == null) {
      setAreas([]);
      setFiltered([]);
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
      setFiltered(result.areas);
      setMeta(result.meta);
    } catch (err: any) {
      console.error('Error loading nearby areas:', err);
      setError(err?.message || 'Failed to load areas');
      setAreas([]);
      setFiltered([]);
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

  useEffect(() => {
    if (searchText === '') {
      setFiltered(areas);
    } else {
      const q = searchText.toLowerCase();
      setFiltered(
        areas.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            (a.city || '').toLowerCase().includes(q) ||
            (a.state || '').toLowerCase().includes(q),
        ),
      );
    }
  }, [searchText, areas]);

  const toggleArea = (id: string) => {
    setTempSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSave = () => {
    const selectedObjects = areas.filter((a) => tempSelected.includes(a.id));
    onSave(tempSelected, selectedObjects);
    onClose();
  };

  const handleCancel = () => {
    setTempSelected(selectedAreaIds);
    setSearchText('');
    onClose();
  };

  const renderItem = ({ item }: { item: NearbyArea }) => {
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
              placeholder="Search by area or city"
              placeholderTextColor={colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText !== '' && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Icon name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.summary}>
            <Icon name="map-marker-multiple" size={16} color={colors.primary} />
            <Text style={styles.summaryText}>
              {tempSelected.length} area{tempSelected.length === 1 ? '' : 's'} selected
              {!noLocation && ` · ${areas.length} within ${radiusKm} km`}
            </Text>
          </View>

          {noLocation ? (
            <View style={styles.emptyContainer}>
              <Icon name="map-marker-question" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                Set the kitchen location first (use "Detect Location" or enter latitude/longitude)
                to load nearby areas.
              </Text>
            </View>
          ) : loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading nearby areas...</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyContainer}>
              <Icon name="alert-circle" size={48} color={colors.error} />
              <Text style={styles.emptyText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadAreas}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filtered}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="map-marker-off" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>
                    {searchText
                      ? 'No matching areas'
                      : `No areas within ${radiusKm} km. Try a larger radius.`}
                  </Text>
                  {meta && !searchText && (
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
                          this radius. Try a larger radius.
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
