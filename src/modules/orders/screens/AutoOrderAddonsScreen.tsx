/**
 * AutoOrderAddonsScreen
 * Admin view of pre-paid auto-order addon selections.
 * Shows upcoming (isApplied: false) paid selections, grouped by date.
 * Supports Cancel & Refund.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../../services/api.service';
import { useAlert } from '../../../hooks/useAlert';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GradientBox } from '../../../components/common/GradientBox';

const PRIMARY = '#FE8733';

// ---- Types ----------------------------------------------------------------

interface AddonEntry {
  addonId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface UserInfo {
  name?: string;
  phone?: string;
}

interface AddressInfo {
  line1?: string;
  city?: string;
}

interface AutoOrderAddonSelectionAdmin {
  _id: string;
  userId: string;
  addressId: string;
  date: string;
  mealWindow: 'LUNCH' | 'DINNER';
  addons: AddonEntry[];
  addonsCost: number;
  paymentStatus: 'PENDING_PAYMENT' | 'PAID' | 'REFUNDED';
  isApplied: boolean;
  batchId: string;
  razorpayPaymentId?: string;
  user?: UserInfo;
  address?: AddressInfo;
}

interface ListResponse {
  selections: AutoOrderAddonSelectionAdmin[];
  total: number;
  page: number;
  pages: number;
}

// ---- Helpers ---------------------------------------------------------------

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'PAID': return { bg: '#D1FAE5', text: '#059669' };
    case 'REFUNDED': return { bg: '#FEE2E2', text: '#DC2626' };
    default: return { bg: '#FEF3C7', text: '#D97706' };
  }
};

// ---- Component -------------------------------------------------------------

interface AutoOrderAddonsScreenProps {
  onMenuPress?: () => void;
}

const AutoOrderAddonsScreen = ({ onMenuPress }: AutoOrderAddonsScreenProps) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();

  // Filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('PAID');
  const [confirmCancel, setConfirmCancel] = useState<AutoOrderAddonSelectionAdmin | null>(null);

  // Fetch list
  const { data, isLoading, isFetching, refetch } = useQuery<ListResponse>({
    queryKey: ['adminAutoOrderAddons', statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({
        paymentStatus: statusFilter,
        isApplied: 'false',
        page: String(page),
        limit: '20',
      });
      return apiService.get<ListResponse>(`/api/admin/auto-order-addons?${params.toString()}`);
    },
    staleTime: 60 * 1000,
  });

  // Cancel + refund mutation
  const cancelMutation = useMutation({
    mutationFn: (selectionId: string) =>
      apiService.delete(`/api/admin/auto-order-addons/${selectionId}`),
    onSuccess: () => {
      showSuccess('Refund initiated and selection cancelled.');
      queryClient.invalidateQueries({ queryKey: ['adminAutoOrderAddons'] });
      setConfirmCancel(null);
    },
    onError: (err: any) => {
      showError(err?.message || 'Failed to cancel selection. Please try again.');
      setConfirmCancel(null);
    },
  });

  const handleCancelConfirm = useCallback(() => {
    if (confirmCancel) {
      cancelMutation.mutate(confirmCancel._id);
    }
  }, [confirmCancel, cancelMutation]);

  const selections = data?.selections || [];

  // ---- Render item ----------------------------------------------------------

  const renderItem = ({ item }: { item: AutoOrderAddonSelectionAdmin }) => {
    const badge = statusBadge(item.paymentStatus);
    const mealIcon = item.mealWindow === 'LUNCH' ? 'wb-sunny' : 'nights-stay';
    const mealColor = item.mealWindow === 'LUNCH' ? '#F59E0B' : '#6366F1';

    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Icon name={mealIcon} size={18} color={mealColor} style={{ marginRight: 6 }} />
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            <Text style={[styles.mealLabel, { color: mealColor }]}>
              {' · '}{item.mealWindow === 'LUNCH' ? 'Lunch' : 'Dinner'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.text }]}>{item.paymentStatus}</Text>
          </View>
        </View>

        {/* Customer + Address */}
        <View style={styles.cardMeta}>
          <View style={styles.metaRow}>
            <Icon name="person" size={14} color="#9CA3AF" style={{ marginRight: 4 }} />
            <Text style={styles.metaText}>
              {item.user?.name || 'Unknown'}{item.user?.phone ? ` · ${item.user.phone}` : ''}
            </Text>
          </View>
          {item.address && (
            <View style={styles.metaRow}>
              <Icon name="place" size={14} color="#9CA3AF" style={{ marginRight: 4 }} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.address.line1}{item.address.city ? `, ${item.address.city}` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Add-ons list */}
        <View style={styles.addonList}>
          {item.addons.map((a, i) => (
            <View key={i} style={styles.addonRow}>
              <Text style={styles.addonName}>{a.name} ×{a.quantity}</Text>
              <Text style={styles.addonPrice}>₹{a.totalPrice}</Text>
            </View>
          ))}
        </View>

        {/* Footer: total + action */}
        <View style={styles.cardFooter}>
          <Text style={styles.totalText}>Total: ₹{item.addonsCost}</Text>
          {item.paymentStatus === 'PAID' && !item.isApplied && (
            <TouchableOpacity
              onPress={() => setConfirmCancel(item)}
              style={styles.cancelBtn}
              activeOpacity={0.8}
            >
              <Icon name="cancel" size={14} color="#DC2626" style={{ marginRight: 4 }} />
              <Text style={styles.cancelBtnText}>Cancel & Refund</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ---- Main render ----------------------------------------------------------

  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#F9FAFB" backgroundColor="#F9FAFB">
      {/* Header */}
      <GradientBox style={styles.header}>
        {onMenuPress && (
          <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
            <Icon name="menu" size={24} color="white" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Auto-Order Add-ons</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <Icon name="refresh" size={22} color="white" />
        </TouchableOpacity>
      </GradientBox>

      {/* Status filter pills */}
      <View style={styles.filterRow}>
        {['PAID', 'REFUNDED', 'PENDING_PAYMENT'].map(s => (
          <TouchableOpacity
            key={s}
            onPress={() => { setStatusFilter(s); setPage(1); }}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
              {s === 'PENDING_PAYMENT' ? 'Pending' : s === 'PAID' ? 'Paid' : 'Refunded'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      {data && (
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {data.total} selection{data.total !== 1 ? 's' : ''} · Page {data.page}/{data.pages}
          </Text>
        </View>
      )}

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading selections...</Text>
        </View>
      ) : selections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="event-busy" size={56} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No selections found</Text>
          <Text style={styles.emptySubtitle}>
            {statusFilter === 'PAID'
              ? 'No upcoming paid add-on selections.'
              : `No ${statusFilter.toLowerCase()} selections.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={selections}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => refetch()} colors={[PRIMARY]} />}
          ListFooterComponent={
            data && data.page < data.pages ? (
              <TouchableOpacity
                onPress={() => setPage(p => p + 1)}
                style={styles.loadMoreBtn}
              >
                <Text style={styles.loadMoreText}>Load More</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={!!confirmCancel}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmCancel(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Icon name="warning" size={40} color="#F59E0B" style={{ marginBottom: 12 }} />
            <Text style={styles.modalTitle}>Cancel & Refund</Text>
            {confirmCancel && (
              <Text style={styles.modalBody}>
                Cancel add-ons for {formatDate(confirmCancel.date)}{' '}
                {confirmCancel.mealWindow === 'LUNCH' ? 'Lunch' : 'Dinner'} and refund ₹{confirmCancel.addonsCost} to the customer?
              </Text>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setConfirmCancel(null)}
                style={[styles.modalBtn, styles.modalBtnSecondary]}
              >
                <Text style={styles.modalBtnSecondaryText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCancelConfirm}
                disabled={cancelMutation.isPending}
                style={[styles.modalBtn, styles.modalBtnDanger]}
              >
                {cancelMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalBtnDangerText}>Refund & Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuBtn: { marginRight: 12, padding: 4 },
  refreshBtn: { marginLeft: 'auto', padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: 'white', flex: 1 },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#FFF7ED', borderColor: PRIMARY },
  filterChipText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  filterChipTextActive: { color: PRIMARY, fontWeight: '700' },

  statsBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#F9FAFB',
  },
  statsText: { fontSize: 12, color: '#9CA3AF' },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },

  listContent: { padding: 16, gap: 12 },

  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dateText: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  mealLabel: { fontSize: 13, fontWeight: '600' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  cardMeta: { marginBottom: 8, gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 12, color: '#6B7280', flex: 1 },

  addonList: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    marginBottom: 8,
    gap: 4,
  },
  addonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  addonName: { fontSize: 13, color: '#374151' },
  addonPrice: { fontSize: 13, color: '#374151', fontWeight: '600' },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  totalText: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },

  loadMoreBtn: {
    margin: 16,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadMoreText: { fontSize: 14, color: PRIMARY, fontWeight: '600' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  modalBody: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnSecondary: { backgroundColor: '#F3F4F6' },
  modalBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  modalBtnDanger: { backgroundColor: '#DC2626' },
  modalBtnDangerText: { fontSize: 14, fontWeight: '600', color: 'white' },
});

export default AutoOrderAddonsScreen;
