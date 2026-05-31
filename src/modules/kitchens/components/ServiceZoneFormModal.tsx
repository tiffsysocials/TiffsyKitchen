import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NearbyArea, Kitchen, Area } from '../../../types/api.types';
import { colors } from '../../../theme/colors';
import serviceZoneService from '../../../services/serviceZone.service';
import kitchenService from '../../../services/kitchen.service';
import areaService from '../../../services/area.service';
import { AreaPickerModal } from './AreaPickerModal';
import { AreaMapPreview } from './AreaMapPreview';

interface ServiceZoneFormModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

// ─── Kitchen picker ──────────────────────────────────────────────────────────
const KitchenPickerRow: React.FC<{
  selectedKitchen: Kitchen | null;
  onSelect: (k: Kitchen | null) => void;
}> = ({ selectedKitchen, onSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (text: string) => {
    setLoading(true);
    try {
      const result = await kitchenService.getKitchens({
        search: text || undefined,
        status: 'ACTIVE',
        limit: 20,
      });
      setKitchens(result.kitchens);
    } catch {
      setKitchens([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpen = () => {
    setExpanded(true);
    search('');
  };

  const handleQuery = (text: string) => {
    setQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => search(text), 400);
  };

  const handleSelect = (k: Kitchen) => {
    onSelect(k);
    setExpanded(false);
    setQuery('');
  };

  const handleClear = () => {
    onSelect(null);
    setExpanded(false);
    setQuery('');
  };

  if (selectedKitchen) {
    return (
      <View style={kpStyles.selected}>
        <View style={kpStyles.selectedIcon}>
          <Icon name="silverware-fork-knife" size={16} color={colors.primary} />
        </View>
        <View style={kpStyles.selectedInfo}>
          <Text style={kpStyles.selectedName} numberOfLines={1}>{selectedKitchen.name}</Text>
          <Text style={kpStyles.selectedSub} numberOfLines={1}>
            {selectedKitchen.address?.city || 'No city'}
            {selectedKitchen.address?.coordinates?.latitude
              ? ' · Areas fetched near this kitchen'
              : ' · No location saved'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="close-circle" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    );
  }

  if (!expanded) {
    return (
      <TouchableOpacity style={kpStyles.trigger} onPress={handleOpen} activeOpacity={0.7}>
        <Icon name="silverware-fork-knife" size={16} color="#9CA3AF" />
        <Text style={kpStyles.triggerText}>Select kitchen (optional)</Text>
        <Icon name="chevron-down" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={kpStyles.dropdown}>
      <View style={kpStyles.searchRow}>
        <Icon name="magnify" size={18} color="#9CA3AF" />
        <TextInput
          style={kpStyles.searchInput}
          value={query}
          onChangeText={handleQuery}
          placeholder="Search kitchens..."
          placeholderTextColor="#9CA3AF"
          autoFocus
        />
        <TouchableOpacity onPress={() => { setExpanded(false); setQuery(''); }}>
          <Icon name="close" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
      ) : (
        <ScrollView
          style={kpStyles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {kitchens.length === 0 ? (
            <Text style={kpStyles.emptyText}>No kitchens found</Text>
          ) : (
            kitchens.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={kpStyles.kitchenRow}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}>
                <View style={kpStyles.kitchenDot} />
                <View style={{ flex: 1 }}>
                  <Text style={kpStyles.kitchenName} numberOfLines={1}>{item.name}</Text>
                  <Text style={kpStyles.kitchenSub} numberOfLines={1}>
                    {item.address?.city || ''}
                    {item.address?.coordinates?.latitude
                      ? ` · ${item.address.coordinates.latitude.toFixed(4)}, ${item.address.coordinates.longitude.toFixed(4)}`
                      : ' · No coordinates'}
                  </Text>
                </View>
                {!item.address?.coordinates?.latitude && (
                  <Text style={kpStyles.noCoords}>No location</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
      <TouchableOpacity
        style={kpStyles.skipBtn}
        onPress={() => { setExpanded(false); setQuery(''); }}>
        <Text style={kpStyles.skipText}>Skip — search all areas by name</Text>
      </TouchableOpacity>
    </View>
  );
};

const kpStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
  },
  triggerText: { flex: 1, fontSize: 14, color: '#9CA3AF', marginLeft: 8 },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDCDB8',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#FEF3EE',
  },
  selectedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  selectedInfo: { flex: 1 },
  selectedName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  selectedSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  dropdown: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', paddingHorizontal: 8, paddingVertical: 2 },
  list: { maxHeight: 200 },
  kitchenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  kitchenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 10,
  },
  kitchenName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  kitchenSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  noCoords: {
    fontSize: 10,
    color: '#EF4444',
    backgroundColor: '#FEF2F2',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  skipText: { fontSize: 12, color: '#6B7280' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 16 },
});

// ─── Main Modal ───────────────────────────────────────────────────────────────
export const ServiceZoneFormModal: React.FC<ServiceZoneFormModalProps> = ({
  visible,
  onClose,
  onCreated,
}) => {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [selectedKitchen, setSelectedKitchen] = useState<Kitchen | null>(null);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<NearbyArea[]>([]);
  const [areaPickerVisible, setAreaPickerVisible] = useState(false);

  // Full Area objects (with coordinates + boundary) — used for the map preview
  const [mapAreas, setMapAreas] = useState<Area[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const kitchenCoords = selectedKitchen?.address?.coordinates?.latitude
    ? {
        latitude: selectedKitchen.address.coordinates.latitude,
        longitude: selectedKitchen.address.coordinates.longitude,
      }
    : undefined;

  const reset = () => {
    setName('');
    setCity('');
    setDescription('');
    setSelectedKitchen(null);
    setSelectedAreaIds([]);
    setSelectedAreas([]);
    setMapAreas([]);
    setErrors({});
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleKitchenSelect = (kitchen: Kitchen | null) => {
    setSelectedKitchen(kitchen);
    if (kitchen?.address?.city && !city.trim()) {
      setCity(kitchen.address.city);
    }
    // Clear areas when kitchen changes
    setSelectedAreaIds([]);
    setSelectedAreas([]);
    setMapAreas([]);
  };

  const handleAreasSaved = async (areaIds: string[], areas: NearbyArea[]) => {
    setAreaPickerVisible(false);
    setSelectedAreaIds(areaIds);
    setSelectedAreas(areas);
    setMapAreas([]);

    if (areaIds.length === 0) return;

    setPreviewing(true);
    try {
      // Fetch full Area objects (with real boundary polygons) for the map preview
      const fullAreas = await areaService.getAreasByIds(areaIds);
      setMapAreas(fullAreas);
    } catch {
      // map preview is non-critical
    } finally {
      setPreviewing(false);
    }
  };

  const handleRemoveArea = (areaId: string) => {
    setSelectedAreaIds((ids) => ids.filter((id) => id !== areaId));
    setSelectedAreas((arr) => arr.filter((a) => a.id !== areaId));
    setMapAreas((arr) => arr.filter((a) => a._id !== areaId));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Zone name is required';
    if (!city.trim()) e.city = 'City is required';
    if (selectedAreaIds.length === 0) e.areas = 'Select at least one area';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await serviceZoneService.createServiceZone({
        name: name.trim(),
        city: city.trim(),
        description: description.trim() || undefined,
        areaIds: selectedAreaIds,
      });
      reset();
      onCreated();
    } catch (err: any) {
      setErrors({ submit: err?.message || 'Failed to create service zone' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.container,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>New Service Zone</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Zone Name */}
            <Text style={styles.label}>Zone Name *</Text>
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : null]}
              value={name}
              onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: '' })); }}
              placeholder="e.g. Indore North"
              placeholderTextColor="#9CA3AF"
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

            {/* City */}
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={[styles.input, errors.city ? styles.inputError : null]}
              value={city}
              onChangeText={(v) => { setCity(v); setErrors((e) => ({ ...e, city: '' })); }}
              placeholder="e.g. Indore"
              placeholderTextColor="#9CA3AF"
            />
            {errors.city ? <Text style={styles.errorText}>{errors.city}</Text> : null}

            {/* Description */}
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional description..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            {/* Kitchen picker */}
            <Text style={styles.label}>Kitchen</Text>
            <Text style={styles.hint}>
              Select a kitchen to fetch nearby areas automatically, or skip to search by name.
            </Text>
            <KitchenPickerRow
              selectedKitchen={selectedKitchen}
              onSelect={handleKitchenSelect}
            />

            {/* Areas */}
            <View style={styles.sectionRow}>
              <Text style={[styles.label, { marginTop: 0 }]}>Areas *</Text>
              <TouchableOpacity
                style={styles.pickBtn}
                onPress={() => setAreaPickerVisible(true)}
                activeOpacity={0.7}>
                <Icon name="map-marker-plus" size={16} color={colors.primary} />
                <Text style={styles.pickBtnText}>
                  {selectedAreaIds.length > 0
                    ? `${selectedAreaIds.length} area${selectedAreaIds.length !== 1 ? 's' : ''}`
                    : 'Pick Areas'}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.areas ? <Text style={styles.errorText}>{errors.areas}</Text> : null}

            {/* Map Preview — same component as kitchen modal */}
            {previewing && (
              <View style={styles.previewLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.previewLoadingText}>Loading map preview...</Text>
              </View>
            )}

            {mapAreas.length > 0 && !previewing && (
              <AreaMapPreview
                kitchenCoords={kitchenCoords}
                areas={mapAreas}
                onRemoveArea={handleRemoveArea}
                embeddedInModal={false}
              />
            )}

            {errors.submit ? (
              <Text style={[styles.errorText, { marginTop: 8 }]}>{errors.submit}</Text>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, saving && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={saving}
              activeOpacity={0.8}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createBtnText}>Create Zone</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {areaPickerVisible && (
        <AreaPickerModal
          visible={areaPickerVisible}
          selectedAreaIds={selectedAreaIds}
          latitude={kitchenCoords?.latitude}
          longitude={kitchenCoords?.longitude}
          cityHint={city || selectedKitchen?.address?.city}
          stateHint={selectedKitchen?.address?.state}
          onClose={() => setAreaPickerVisible(false)}
          onSave={handleAreasSaved}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 17, fontWeight: '600', color: '#111827' },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 32 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 16,
  },
  hint: { fontSize: 11, color: '#9CA3AF', marginBottom: 6, marginTop: -3 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  inputError: { borderColor: '#EF4444' },
  textArea: { minHeight: 60 },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 4,
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3EE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#FDCDB8',
  },
  pickBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600', marginLeft: 5 },
  previewLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  previewLoadingText: { fontSize: 13, color: '#6B7280', marginLeft: 8 },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  createBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
