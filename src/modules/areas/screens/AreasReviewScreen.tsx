import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import areaService from '../../../services/area.service';
import { Area } from '../../../types/api.types';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useAlert } from '../../../hooks/useAlert';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';

interface AreasReviewScreenProps {
  onMenuPress?: () => void;
}

export const AreasReviewScreen: React.FC<AreasReviewScreenProps> = ({ onMenuPress }) => {
  const { showSuccess, showError } = useAlert();
  const queryClient = useQueryClient();
  const [rejectFor, setRejectFor] = useState<Area | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pendingQuery = useQuery({
    queryKey: ['areas', 'pending'],
    queryFn: () => areaService.listAreas({ status: 'PENDING_REVIEW', limit: 200 }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => areaService.approveArea(id),
    onSuccess: (area) => {
      showSuccess('Approved', `${area.name} is now active.`);
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
    onError: (err: any) => showError('Approve failed', err?.message || 'Try again'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      areaService.rejectArea(id, reason),
    onSuccess: (area) => {
      showSuccess('Rejected', `${area.name} is now inactive.`);
      setRejectFor(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
    onError: (err: any) => showError('Reject failed', err?.message || 'Try again'),
  });

  const areas = pendingQuery.data?.areas || [];
  const isWorking = approveMutation.isPending || rejectMutation.isPending;

  return (
    <SafeAreaScreen topBackgroundColor={colors.primary}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
          <Icon name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Areas — Review Queue</Text>
        <TouchableOpacity onPress={() => pendingQuery.refetch()} style={styles.refreshBtn}>
          <Icon name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={pendingQuery.isFetching}
            onRefresh={() => pendingQuery.refetch()}
          />
        }>
        {pendingQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : pendingQuery.error ? (
          <View style={styles.center}>
            <Icon name="error-outline" size={40} color={colors.error} />
            <Text style={styles.errorText}>
              {(pendingQuery.error as any)?.message || 'Failed to load'}
            </Text>
          </View>
        ) : areas.length === 0 ? (
          <View style={styles.center}>
            <Icon name="inbox" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nothing pending</Text>
            <Text style={styles.emptyDesc}>
              Areas auto-derived from Google Places + OSM Nominatim land here for
              review before they appear in the kitchen-form picker.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            <Text style={styles.summary}>
              {areas.length} pending area{areas.length === 1 ? '' : 's'}
            </Text>
            {areas.map((area) => (
              <AreaRow
                key={area._id}
                area={area}
                disabled={isWorking}
                onApprove={() => approveMutation.mutate(area._id)}
                onReject={() => setRejectFor(area)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!rejectFor}
        animationType="fade"
        transparent
        onRequestClose={() => setRejectFor(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject "{rejectFor?.name}"?</Text>
            <Text style={styles.modalSub}>
              This area will move to INACTIVE and won't appear in any kitchen picker.
            </Text>
            <Text style={styles.modalLabel}>Reason (optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. duplicate of Vijay Nagar, wrong centroid"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => {
                  setRejectFor(null);
                  setRejectReason('');
                }}
                disabled={rejectMutation.isPending}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalReject]}
                disabled={rejectMutation.isPending}
                onPress={() => {
                  if (rejectFor) {
                    rejectMutation.mutate({
                      id: rejectFor._id,
                      reason: rejectReason.trim() || undefined,
                    });
                  }
                }}>
                {rejectMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalRejectText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaScreen>
  );
};

interface AreaRowProps {
  area: Area;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
}

const AreaRow: React.FC<AreaRowProps> = ({ area, disabled, onApprove, onReject }) => {
  const sources = area.sources && area.sources.length > 0
    ? area.sources
    : area.source ? [area.source] : [];
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{area.name}</Text>
          <Text style={styles.cardSub}>
            {[area.city, area.state].filter(Boolean).join(', ') || '—'}
          </Text>
        </View>
        <View style={styles.badges}>
          {sources.map((s) => (
            <View key={s} style={[styles.badge, badgeStyle(s)]}>
              <Text style={[styles.badgeText, badgeTextStyle(s)]}>{s}</Text>
            </View>
          ))}
          {area.hasBoundary && (
            <View style={[styles.badge, styles.badgePolygon]}>
              <Text style={[styles.badgeText, styles.badgePolygonText]}>POLYGON</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.metaRow}>
        <Icon name="pin-drop" size={14} color={colors.textMuted} />
        <Text style={styles.metaText}>
          {area.pincodeCount ?? area.pincodes?.length ?? 0} pincode
          {(area.pincodeCount ?? area.pincodes?.length ?? 0) === 1 ? '' : 's'}
        </Text>
        {area.coordinates && (
          <>
            <Icon
              name="my-location"
              size={14}
              color={colors.textMuted}
              style={{ marginLeft: spacing.md }}
            />
            <Text style={styles.metaText}>
              {area.coordinates.latitude.toFixed(4)},{' '}
              {area.coordinates.longitude.toFixed(4)}
            </Text>
          </>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={onReject}
          disabled={disabled}>
          <Icon name="close" size={18} color={colors.error} />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.approveBtn]}
          onPress={onApprove}
          disabled={disabled}>
          <Icon name="check" size={18} color="#fff" />
          <Text style={styles.approveText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const badgeStyle = (source: string) => {
  if (source === 'GOOGLE') return styles.badgeGoogle;
  if (source === 'NOMINATIM') return styles.badgeOsm;
  if (source === 'MANUAL') return styles.badgeManual;
  return styles.badgeNeutral;
};
const badgeTextStyle = (source: string) => {
  if (source === 'GOOGLE') return styles.badgeGoogleText;
  if (source === 'NOMINATIM') return styles.badgeOsmText;
  if (source === 'MANUAL') return styles.badgeManualText;
  return styles.badgeNeutralText;
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  menuBtn: { padding: 4 },
  refreshBtn: { padding: 4 },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  scroll: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { marginTop: spacing.md, color: colors.error, textAlign: 'center' },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  list: { padding: spacing.md },
  summary: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusMd,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  cardSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', maxWidth: 160, justifyContent: 'flex-end' },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
    marginBottom: 2,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeGoogle: { backgroundColor: '#dbeafe' },
  badgeGoogleText: { color: '#1e40af' },
  badgeOsm: { backgroundColor: '#dcfce7' },
  badgeOsmText: { color: '#166534' },
  badgeManual: { backgroundColor: '#fef3c7' },
  badgeManualText: { color: '#92400e' },
  badgeNeutral: { backgroundColor: '#e5e7eb' },
  badgeNeutralText: { color: '#374151' },
  badgePolygon: { backgroundColor: '#ede9fe' },
  badgePolygonText: { color: '#5b21b6' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 4,
  },
  metaText: { fontSize: 11, color: colors.textMuted, marginLeft: 4 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: spacing.borderRadiusSm,
    gap: 4,
  },
  rejectBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.error,
  },
  rejectText: { color: colors.error, fontWeight: '600' },
  approveBtn: { backgroundColor: colors.primary },
  approveText: { color: '#fff', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    padding: spacing.lg,
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  modalSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadiusSm,
    padding: spacing.sm,
    minHeight: 80,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadiusSm,
    minWidth: 90,
    alignItems: 'center',
  },
  modalCancel: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  modalCancelText: { color: colors.textPrimary, fontWeight: '600' },
  modalReject: { backgroundColor: colors.error },
  modalRejectText: { color: '#fff', fontWeight: '600' },
});

export default AreasReviewScreen;
