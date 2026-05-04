import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
  ToastAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { GradientBox } from '../../../components/common/GradientBox';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useAlert } from '../../../hooks/useAlert';
import pincodeService from '../../../services/pincode.service';
import { PincodeRecord, PincodeSource, WarmCityResponse } from '../../../types/api.types';
import { PincodeCard } from '../components/PincodeCard';
import { PincodeFormModal } from '../components/PincodeFormModal';
import { WarmCityModal } from '../components/WarmCityModal';
import { PincodeFilters, PincodeFormState } from '../models/types';

interface Props {
  onMenuPress?: () => void;
}

const SOURCE_FILTERS: Array<{ key: PincodeSource | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'GOOGLE', label: 'Google' },
  { key: 'INDIA_POST', label: 'India Post' },
  { key: 'MANUAL', label: 'Manual' },
  { key: 'SEED', label: 'Seed' },
];

export const PincodesManagementScreen: React.FC<Props> = ({ onMenuPress }) => {
  const { showSuccess, showError } = useAlert();

  const [pincodes, setPincodes] = useState<PincodeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [filters, setFilters] = useState<PincodeFilters>({
    source: 'ALL',
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<PincodeRecord | null>(null);
  const [warmVisible, setWarmVisible] = useState(false);

  const toast = useCallback((msg: string, type: 'success' | 'error') => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else if (type === 'success') {
      showSuccess('Success', msg);
    } else {
      showError('Error', msg);
    }
  }, [showSuccess, showError]);

  const load = useCallback(
    async (reset = false) => {
      if (reset) {
        setPage(1);
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        const params = {
          source: filters.source === 'ALL' ? undefined : filters.source,
          search: filters.search || undefined,
          city: filters.city || undefined,
          state: filters.state || undefined,
          page: reset ? 1 : page,
          limit: 25,
        };
        const res = await pincodeService.getPincodes(params);
        setPincodes((prev) => (reset ? res.pincodes : [...prev, ...res.pincodes]));
        setTotalCount(res.pagination.total);
        setHasMore(res.pagination.page < res.pagination.pages);
        setPage(res.pagination.page + 1);
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || 'Failed to load pincodes';
        setError(msg);
        toast(msg, 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filters, page, toast],
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) load(false);
  };

  const applySearch = () => {
    setFilters((f) => ({ ...f, search: searchInput.trim() || undefined }));
  };

  const handleSourceChip = (k: PincodeSource | 'ALL') => {
    setFilters((f) => ({ ...f, source: k }));
  };

  const handleCreate = () => {
    setEditing(null);
    setFormVisible(true);
  };

  const handleEdit = (p: PincodeRecord) => {
    setEditing(p);
    setFormVisible(true);
  };

  const handleSave = async (form: PincodeFormState) => {
    try {
      const payload = {
        officeName: form.officeName.trim() || undefined,
        city: form.city.trim(),
        district: form.district.trim() || undefined,
        state: form.state.trim(),
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
      };
      if (editing) {
        await pincodeService.updatePincode(editing.pincode, payload);
        toast('Pincode updated', 'success');
      } else {
        await pincodeService.createPincode({ pincode: form.pincode.trim(), ...payload });
        toast('Pincode created', 'success');
      }
      setFormVisible(false);
      setEditing(null);
      load(true);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Save failed';
      toast(msg, 'error');
    }
  };

  const handleDelete = async (p: PincodeRecord) => {
    try {
      await pincodeService.deletePincode(p.pincode);
      toast(`Deleted ${p.pincode}`, 'success');
      load(true);
    } catch (e: any) {
      toast(e?.response?.data?.message || e?.message || 'Delete failed', 'error');
    }
  };

  const handleWarmed = (res: WarmCityResponse) => {
    toast(
      res.alreadyWarmed
        ? `${res.city} already warmed`
        : `${res.city}: added ${res.addedCount} pincodes`,
      'success',
    );
    load(true);
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.countText}>
        {totalCount} {totalCount === 1 ? 'pincode' : 'pincodes'}
      </Text>
    </View>
  );

  const renderFooter = () =>
    loadingMore ? (
      <View style={{ paddingVertical: 16, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    ) : null;

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.empty}>
        <Icon name="map-marker-off" size={56} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No pincodes</Text>
        <Text style={styles.emptyMsg}>
          {filters.search || filters.source !== 'ALL'
            ? 'Try adjusting your filters'
            : 'Pre-warm a city or add a pincode manually to get started'}
        </Text>
        <View style={styles.emptyActions}>
          <TouchableOpacity style={styles.emptyBtnPrimary} onPress={() => setWarmVisible(true)}>
            <Icon name="fire" size={16} color="#fff" />
            <Text style={styles.emptyBtnText}>Warm City</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.emptyBtnSecondary} onPress={handleCreate}>
            <Icon name="plus" size={16} color={colors.primary} />
            <Text style={[styles.emptyBtnText, { color: colors.primary }]}>Add Pincode</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaScreen
      style={{ flex: 1 }}
      topBackgroundColor={colors.primary}
      bottomBackgroundColor={colors.background}>
      {onMenuPress && (
        <GradientBox style={styles.header}>
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <MaterialIcon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pincode Management</Text>
          <TouchableOpacity onPress={() => setWarmVisible(true)} style={styles.warmBtn}>
            <Icon name="fire" size={18} color="#fff" />
            <Text style={styles.warmBtnText}>Warm City</Text>
          </TouchableOpacity>
        </GradientBox>
      )}

      {/* Filters */}
      <View style={styles.filterBar}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Icon name="magnify" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={searchInput}
              onChangeText={setSearchInput}
              onSubmitEditing={applySearch}
              placeholder="Search pincode, city, office"
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
            />
            {searchInput !== '' && (
              <TouchableOpacity onPress={() => { setSearchInput(''); setFilters((f) => ({ ...f, search: undefined })); }}>
                <Icon name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
            <Icon name="refresh" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.chipRow}>
          {SOURCE_FILTERS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.chip, filters.source === s.key && styles.chipActive]}
              onPress={() => handleSourceChip(s.key)}>
              <Text style={[styles.chipText, filters.source === s.key && styles.chipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      {loading && pincodes.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading pincodes...</Text>
        </View>
      ) : error && pincodes.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="alert-circle" size={56} color={colors.error} />
          <Text style={styles.emptyTitle}>Couldn't load pincodes</Text>
          <Text style={styles.emptyMsg}>{error}</Text>
          <TouchableOpacity style={styles.emptyBtnPrimary} onPress={() => load(true)}>
            <Icon name="refresh" size={16} color="#fff" />
            <Text style={styles.emptyBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pincodes}
          renderItem={({ item }) => (
            <PincodeCard pincode={item} onEdit={handleEdit} onDelete={handleDelete} />
          )}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={pincodes.length === 0 ? styles.emptyList : undefined}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleCreate}>
        <Icon name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      <PincodeFormModal
        visible={formVisible}
        pincode={editing}
        onClose={() => {
          setFormVisible(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />
      <WarmCityModal
        visible={warmVisible}
        onClose={() => setWarmVisible(false)}
        onWarmed={handleWarmed}
      />
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
  },
  menuButton: { marginRight: spacing.lg },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff' },
  warmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  warmBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  filterBar: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: colors.background },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: colors.textPrimary },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: spacing.borderRadiusMd,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.primary },

  listHeader: { paddingHorizontal: 16, paddingVertical: 8 },
  countText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 13, color: colors.textSecondary },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 12 },
  emptyMsg: { fontSize: 12, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  emptyActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  emptyBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  emptyBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
