import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { GradientBox } from '../../../components/common/GradientBox';
import { colors } from '../../../theme/colors';
import { DeliveryZone, Kitchen } from '../../../types/api.types';
import kitchenService from '../../../services/kitchen.service';
import deliveryZoneService from '../../../services/deliveryZone.service';
import { DeliveryZoneFormModal } from '../components/DeliveryZoneFormModal';
import { useAlert } from '../../../hooks/useAlert';

interface KitchenDeliveryZonesScreenProps {
  onMenuPress: () => void;
}

/**
 * Admin screen: per-kitchen Delivery Zone management.
 *
 * Flow:
 *   1. Admin picks a kitchen from the dropdown
 *   2. Sees that kitchen's zones (or empty state)
 *   3. "Add Zone" opens DeliveryZoneFormModal in create mode
 *   4. Tap an existing zone to edit
 *   5. Long-press a zone for delete confirmation
 */
export const KitchenDeliveryZonesScreen: React.FC<KitchenDeliveryZonesScreenProps> = ({
  onMenuPress,
}) => {
  const { showSuccess, showError } = useAlert();

  // ─── Kitchen picker state ─────────────────────────────────────────────────
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [kitchensLoading, setKitchensLoading] = useState(true);
  const [selectedKitchen, setSelectedKitchen] = useState<Kitchen | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Zones state ──────────────────────────────────────────────────────────
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Form modal state ─────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | undefined>(undefined);

  // Initial kitchen load
  const loadKitchens = useCallback(async (q?: string) => {
    setKitchensLoading(true);
    try {
      const result = await kitchenService.getKitchens({
        search: q || undefined,
        limit: 50,
      });
      setKitchens(result.kitchens);
    } catch (e) {
      console.warn('Failed to load kitchens:', e);
    } finally {
      setKitchensLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKitchens();
  }, [loadKitchens]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadKitchens(text), 400);
  };

  // Zones for selected kitchen
  const loadZones = useCallback(
    async (kitchenId: string) => {
      setZonesLoading(true);
      try {
        const list = await deliveryZoneService.getZonesForKitchen(kitchenId);
        setZones(list);
      } catch (e: any) {
        showError('Failed to load zones', e?.message || 'Try again');
        setZones([]);
      } finally {
        setZonesLoading(false);
      }
    },
    [showError],
  );

  useEffect(() => {
    if (selectedKitchen) loadZones(selectedKitchen._id);
    else setZones([]);
  }, [selectedKitchen, loadZones]);

  const handleRefresh = async () => {
    if (!selectedKitchen) return;
    setRefreshing(true);
    await loadZones(selectedKitchen._id);
    setRefreshing(false);
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handlePickKitchen = (k: Kitchen) => {
    setSelectedKitchen(k);
    setPickerOpen(false);
    setSearch('');
  };

  const handleAddZone = () => {
    if (!selectedKitchen) return;
    if (!selectedKitchen.address?.coordinates?.latitude) {
      Alert.alert(
        'Kitchen location missing',
        'This kitchen has no coordinates set. Add a location on the kitchen profile before creating a zone.',
      );
      return;
    }
    setEditingZone(undefined);
    setFormOpen(true);
  };

  const handleEditZone = (z: DeliveryZone) => {
    setEditingZone(z);
    setFormOpen(true);
  };

  const handleZoneSaved = async (saved: DeliveryZone) => {
    setFormOpen(false);
    setEditingZone(undefined);
    showSuccess(
      editingZone ? 'Zone updated' : 'Zone created',
      `"${saved.name}" saved successfully.`,
    );
    if (selectedKitchen) await loadZones(selectedKitchen._id);
  };

  const handleDeleteZone = (z: DeliveryZone) => {
    Alert.alert(
      'Delete delivery zone?',
      `"${z.name}" will be removed. Past orders keep their snapshot. For temporary disable, edit and set status to INACTIVE instead.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deliveryZoneService.deleteDeliveryZone(z._id);
              showSuccess('Zone deleted', `"${z.name}" removed.`);
              if (selectedKitchen) await loadZones(selectedKitchen._id);
            } catch (e: any) {
              showError('Delete failed', e?.message || 'Try again');
            }
          },
        },
      ],
    );
  };

  const maxPriority = zones.reduce((m, z) => Math.max(m, z.priority), 0);

  // ─── Render ────────────────────────────────────────────────────────────────
  const renderKitchenPicker = () => {
    if (selectedKitchen && !pickerOpen) {
      return (
        <View style={s.pickerRow}>
          <View style={s.pickerSelected}>
            <Icon name="silverware-fork-knife" size={20} color={colors.primary} />
            <View style={s.pickerSelectedInfo}>
              <Text style={s.pickerSelectedName} numberOfLines={1}>
                {selectedKitchen.name}
              </Text>
              <Text style={s.pickerSelectedSub} numberOfLines={1}>
                {selectedKitchen.address?.city || '—'} ·{' '}
                {selectedKitchen.needsZoneReview ? '⚠ Needs review' : `${zones.length} zone${zones.length !== 1 ? 's' : ''}`}
              </Text>
            </View>
            <TouchableOpacity
              style={s.pickerChangeBtn}
              onPress={() => setPickerOpen(true)}
              activeOpacity={0.7}>
              <Text style={s.pickerChangeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={s.picker}>
        <View style={s.pickerSearchRow}>
          <Icon name="magnify" size={18} color="#9CA3AF" />
          <TextInput
            style={s.pickerSearchInput}
            placeholder="Search kitchen..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus={pickerOpen}
          />
          {pickerOpen && (
            <TouchableOpacity
              onPress={() => {
                setPickerOpen(false);
                setSearch('');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={18} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {kitchensLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ padding: 18 }} />
        ) : (
          <ScrollView
            style={s.pickerList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {kitchens.length === 0 ? (
              <Text style={s.pickerEmpty}>No kitchens found</Text>
            ) : (
              kitchens.map((k) => (
                <TouchableOpacity
                  key={k._id}
                  style={s.pickerRowItem}
                  onPress={() => handlePickKitchen(k)}
                  activeOpacity={0.7}>
                  <View style={s.pickerDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerName} numberOfLines={1}>
                      {k.name}
                    </Text>
                    <Text style={s.pickerSub} numberOfLines={1}>
                      {k.address?.city || '—'} ·{' '}
                      {k.address?.coordinates?.latitude ? 'Has location' : 'No location'}
                      {k.needsZoneReview ? ' · ⚠ Needs review' : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderZoneCard = (z: DeliveryZone) => {
    const isInactive = z.status === 'INACTIVE';
    const areaCount = Array.isArray(z.areaIds) ? z.areaIds.length : 0;
    return (
      <TouchableOpacity
        key={z._id}
        style={[s.zoneCard, isInactive && s.zoneCardInactive]}
        onPress={() => handleEditZone(z)}
        onLongPress={() => handleDeleteZone(z)}
        activeOpacity={0.7}
        delayLongPress={400}>
        <View style={s.zoneHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.zoneName}>{z.name}</Text>
            <Text style={s.zoneMeta}>
              Priority {z.priority} · {areaCount} area{areaCount !== 1 ? 's' : ''} · {z.radiusKm} km
            </Text>
          </View>
          <View style={[s.statusPill, isInactive ? s.statusInactive : s.statusActive]}>
            <Text style={[s.statusText, isInactive ? s.statusTextInactive : s.statusTextActive]}>
              {z.status}
            </Text>
          </View>
          {/* Tap-target Delete button so admins don't have to discover long-press. */}
          <TouchableOpacity
            onPress={() => handleDeleteZone(z)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginLeft: 8, padding: 4 }}>
            <Icon name="trash-can-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <View style={s.priceRow}>
          <View style={s.priceCol}>
            <View style={s.priceColLabel}>
              <Icon name="weather-sunny" size={12} color="#6B7280" />
              <Text style={s.priceColText}>Lunch</Text>
            </View>
            <Text style={s.priceVal}>₹{z.pricing.lunch.deliveryFee}</Text>
          </View>
          <View style={s.priceCol}>
            <View style={s.priceColLabel}>
              <Icon name="weather-night" size={12} color="#6B7280" />
              <Text style={s.priceColText}>Dinner</Text>
            </View>
            <Text style={s.priceVal}>₹{z.pricing.dinner.deliveryFee}</Text>
          </View>
          {z.createdByMigration && (
            <View style={s.migratedTag}>
              <Icon name="auto-fix" size={11} color="#92400E" />
              <Text style={s.migratedTagText}>Auto-created</Text>
            </View>
          )}
        </View>

        <View style={s.zoneFooter}>
          <Text style={s.zoneFooterHint}>Tap card to edit · Tap 🗑 to delete</Text>
          <Icon name="chevron-right" size={18} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaScreen style={{ flex: 1 }} backgroundColor={colors.primary}>
      <GradientBox style={s.header}>
        <TouchableOpacity onPress={onMenuPress} style={s.menuBtn}>
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Delivery Zones</Text>
        <View style={{ width: 32 }} />
      </GradientBox>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#F9FAFB' }}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        keyboardShouldPersistTaps="handled">
        {renderKitchenPicker()}

        {selectedKitchen && !pickerOpen && (
          <>
            {selectedKitchen.needsZoneReview && (
              <View style={s.banner}>
                <Icon name="information" size={18} color="#92400E" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={s.bannerTitle}>Migrated kitchen — review needed</Text>
                  <Text style={s.bannerText}>
                    A Default Zone was auto-created from this kitchen's legacy areas. Review the
                    zone, customize pricing, and remove this banner when done.
                  </Text>
                </View>
              </View>
            )}

            <View style={s.actionRow}>
              <Text style={s.sectionTitle}>
                {zones.length} zone{zones.length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity
                style={s.addBtn}
                onPress={handleAddZone}
                activeOpacity={0.8}>
                <Icon name="plus" size={16} color="#fff" />
                <Text style={s.addBtnText}>Add Zone</Text>
              </TouchableOpacity>
            </View>

            {zonesLoading && !refreshing ? (
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ marginTop: 30 }}
              />
            ) : zones.length === 0 ? (
              <View style={s.emptyState}>
                <Icon name="map-marker-off" size={48} color="#D1D5DB" />
                <Text style={s.emptyTitle}>No delivery zones yet</Text>
                <Text style={s.emptySub}>
                  Tap "Add Zone" to create the first one. Each zone covers a set of areas with
                  its own per-meal-window pricing.
                </Text>
              </View>
            ) : (
              <View>
                {zones
                  .slice()
                  .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name))
                  .map(renderZoneCard)}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {formOpen && selectedKitchen && (
        <DeliveryZoneFormModal
          visible={formOpen}
          kitchen={selectedKitchen}
          zone={editingZone}
          defaultPriority={editingZone ? undefined : maxPriority + 1}
          onClose={() => {
            setFormOpen(false);
            setEditingZone(undefined);
          }}
          onSaved={handleZoneSaved}
        />
      )}
    </SafeAreaScreen>
  );
};

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuBtn: { padding: 4, width: 32 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },

  // Picker
  pickerRow: { marginBottom: 14 },
  pickerSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerSelectedInfo: { flex: 1, marginLeft: 10 },
  pickerSelectedName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  pickerSelectedSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  pickerChangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FEF3EE',
    borderRadius: 6,
  },
  pickerChangeBtnText: { fontSize: 12, color: colors.primary, fontWeight: '600' },

  picker: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 14,
  },
  pickerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pickerList: { maxHeight: 280 },
  pickerEmpty: { textAlign: 'center', color: '#9CA3AF', padding: 18, fontSize: 13 },
  pickerRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  pickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 10,
  },
  pickerName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  pickerSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bannerTitle: { fontSize: 13, fontWeight: '600', color: '#92400E' },
  bannerText: { fontSize: 12, color: '#92400E', marginTop: 2, lineHeight: 17 },

  // Action row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { fontSize: 13, color: '#fff', fontWeight: '600', marginLeft: 4 },

  // Zone card
  zoneCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  zoneCardInactive: { opacity: 0.55 },
  zoneHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  zoneName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  zoneMeta: { fontSize: 11, color: '#6B7280', marginTop: 3 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusInactive: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 10, fontWeight: '700' },
  statusTextActive: { color: '#166534' },
  statusTextInactive: { color: '#6B7280' },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceCol: { marginRight: 20 },
  priceColLabel: { flexDirection: 'row', alignItems: 'center' },
  priceColText: { fontSize: 10, color: '#6B7280', marginLeft: 4, textTransform: 'uppercase' },
  priceVal: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 2 },
  migratedTag: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  migratedTagText: { fontSize: 10, color: '#92400E', marginLeft: 3, fontWeight: '600' },

  zoneFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  zoneFooterHint: { fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' },

  // Empty state
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginTop: 10 },
  emptySub: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },
});
