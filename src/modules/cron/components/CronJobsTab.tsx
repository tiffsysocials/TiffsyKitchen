/**
 * Cron Jobs Tab
 *
 * Shows cron job status overview and manual trigger buttons
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAlert } from '../../../hooks/useAlert';
import {
  getCronStatus,
  triggerAutoOrders,
  promoteScheduledMeals,
  autoCancelUnpaid,
  triggerVoucherExpiry,
  triggerKitchenAcceptanceTimeout,
} from '../../../services/cron.service';

const PRIMARY_COLOR = '#FE8733';

export const CronJobsTab: React.FC = () => {
  const { showSuccess, showError, showConfirm } = useAlert();
  const [selectedMealWindow, setSelectedMealWindow] = useState<'LUNCH' | 'DINNER'>('LUNCH');
  const [promoteMealWindow, setPromoteMealWindow] = useState<'LUNCH' | 'DINNER'>('LUNCH');
  const [dryRun, setDryRun] = useState(false);

  // Fetch cron status
  const {
    data: statusData,
    isLoading: statusLoading,
    refetch: refetchStatus,
    isRefetching,
  } = useQuery({
    queryKey: ['cronStatus'],
    queryFn: getCronStatus,
  });

  // Mutations
  const autoOrderMutation = useMutation({
    mutationFn: () => triggerAutoOrders(selectedMealWindow, dryRun),
    onSuccess: (data) => {
      if (data.disabled) {
        showError('Disabled', 'Auto-ordering is globally disabled in system config.');
        return;
      }
      showSuccess(
        dryRun ? 'Dry Run Complete' : 'Auto-Orders Triggered',
        `${data.ordersCreated} orders created, ${data.skipped} skipped, ${data.failed} failed`,
      );
      refetchStatus();
    },
    onError: (error: any) => {
      showError('Error', error?.response?.data?.message || 'Failed to trigger auto-orders');
    },
  });

  const promoteMutation = useMutation({
    mutationFn: () => promoteScheduledMeals(promoteMealWindow),
    onSuccess: (data) => {
      showSuccess(
        'Promotion Complete',
        `${data.promoted} orders promoted, ${data.failed} failed`,
      );
      refetchStatus();
    },
    onError: (error: any) => {
      showError('Error', error?.response?.data?.message || 'Failed to promote scheduled meals');
    },
  });

  const cancelUnpaidMutation = useMutation({
    mutationFn: autoCancelUnpaid,
    onSuccess: (data) => {
      showSuccess(
        'Cancel Complete',
        `${data.cancelled} unpaid orders cancelled (window: ${data.windowMinutes} min)`,
      );
      refetchStatus();
    },
    onError: (error: any) => {
      showError('Error', error?.response?.data?.message || 'Failed to cancel unpaid orders');
    },
  });

  const voucherExpiryMutation = useMutation({
    mutationFn: triggerVoucherExpiry,
    onSuccess: (data) => {
      showSuccess('Voucher Expiry Complete', `Duration: ${data.duration}`);
      refetchStatus();
    },
    onError: (error: any) => {
      showError('Error', error?.response?.data?.message || 'Failed to trigger voucher expiry');
    },
  });

  const kitchenTimeoutMutation = useMutation({
    mutationFn: triggerKitchenAcceptanceTimeout,
    onSuccess: (data) => {
      showSuccess(
        'Timeout Check Complete',
        `${data.autoRejected} orders auto-rejected, ${data.refundsInitiated} refunds initiated`,
      );
      refetchStatus();
    },
    onError: (error: any) => {
      showError('Error', error?.response?.data?.message || 'Failed to process kitchen acceptance timeouts');
    },
  });

  const confirmAndTrigger = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    showConfirm(title, message, onConfirm, undefined, {
      confirmText: 'Confirm',
      isDestructive: true,
    });
  };

  const renderMealWindowSelector = (
    value: 'LUNCH' | 'DINNER',
    onChange: (v: 'LUNCH' | 'DINNER') => void,
  ) => (
    <View style={styles.mealWindowRow}>
      {(['LUNCH', 'DINNER'] as const).map((mw) => (
        <TouchableOpacity
          key={mw}
          style={[styles.mealWindowChip, value === mw && styles.mealWindowChipActive]}
          onPress={() => onChange(mw)}
        >
          <Text
            style={[
              styles.mealWindowChipText,
              value === mw && styles.mealWindowChipTextActive,
            ]}
          >
            {mw}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (statusLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading cron status...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetchStatus()}
          tintColor={PRIMARY_COLOR}
        />
      }
    >
      {/* Cron Status Section */}
      <Text style={styles.sectionTitle}>Cron Job Status</Text>
      {statusData?.jobs && Object.entries(statusData.jobs).map(([name, job]) => (
        <View key={name} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Icon name="schedule" size={20} color={PRIMARY_COLOR} />
              <Text style={styles.cardTitle}>
                {name.replace(/([A-Z])/g, ' $1').trim()}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: job.status === 'scheduled' ? '#dcfce7' : '#fef3c7' },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: job.status === 'scheduled' ? '#16a34a' : '#d97706' },
                ]}
              >
                {job.status}
              </Text>
            </View>
          </View>
          <Text style={styles.cardDescription}>{job.description}</Text>
          <View style={styles.cardDetails}>
            <Text style={styles.detailLabel}>Schedule: <Text style={styles.detailValue}>{job.schedule}</Text></Text>
            <Text style={styles.detailLabel}>
              Last Run: <Text style={styles.detailValue}>
                {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}
              </Text>
            </Text>
            <Text style={styles.detailLabel}>
              Next Run: <Text style={styles.detailValue}>
                {job.nextRun ? new Date(job.nextRun).toLocaleString() : 'N/A'}
              </Text>
            </Text>
          </View>
        </View>
      ))}

      {!statusData?.jobs || Object.keys(statusData.jobs).length === 0 ? (
        <View style={styles.emptyCard}>
          <Icon name="info-outline" size={24} color="#9ca3af" />
          <Text style={styles.emptyText}>No cron jobs configured</Text>
        </View>
      ) : null}

      {/* Manual Triggers Section */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Manual Triggers</Text>

      {/* Auto-Orders Trigger */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Icon name="autorenew" size={20} color="#7c3aed" />
            <Text style={styles.cardTitle}>Trigger Auto-Orders</Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>
          Process auto-orders for subscribers with active subscriptions
        </Text>

        {renderMealWindowSelector(selectedMealWindow, setSelectedMealWindow)}

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Dry Run (simulate only)</Text>
          <TouchableOpacity
            onPress={() => setDryRun(!dryRun)}
            style={[styles.toggle, dryRun && styles.toggleActive]}
          >
            <View style={[styles.toggleKnob, dryRun && styles.toggleKnobActive]} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.triggerButton, autoOrderMutation.isPending && styles.triggerButtonDisabled]}
          disabled={autoOrderMutation.isPending}
          onPress={() =>
            confirmAndTrigger(
              'Trigger Auto-Orders',
              `${dryRun ? '[DRY RUN] ' : ''}Trigger ${selectedMealWindow} auto-orders?`,
              () => autoOrderMutation.mutate(),
            )
          }
        >
          {autoOrderMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Icon name="play-arrow" size={20} color="#ffffff" />
              <Text style={styles.triggerButtonText}>
                {dryRun ? 'Simulate' : 'Trigger'} {selectedMealWindow}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Promote Scheduled Meals */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Icon name="upgrade" size={20} color="#2563eb" />
            <Text style={styles.cardTitle}>Promote Scheduled Meals</Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>
          Promote SCHEDULED orders to PLACED status for today
        </Text>

        {renderMealWindowSelector(promoteMealWindow, setPromoteMealWindow)}

        <TouchableOpacity
          style={[styles.triggerButton, styles.triggerButtonBlue, promoteMutation.isPending && styles.triggerButtonDisabled]}
          disabled={promoteMutation.isPending}
          onPress={() =>
            confirmAndTrigger(
              'Promote Scheduled Meals',
              `Promote ${promoteMealWindow} scheduled meals to PLACED?`,
              () => promoteMutation.mutate(),
            )
          }
        >
          {promoteMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Icon name="upgrade" size={20} color="#ffffff" />
              <Text style={styles.triggerButtonText}>Promote {promoteMealWindow}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Auto-Cancel Unpaid */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Icon name="cancel" size={20} color="#dc2626" />
            <Text style={styles.cardTitle}>Auto-Cancel Unpaid Orders</Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>
          Cancel auto-order orders with pending payment past the configured window
        </Text>

        <TouchableOpacity
          style={[styles.triggerButton, styles.triggerButtonRed, cancelUnpaidMutation.isPending && styles.triggerButtonDisabled]}
          disabled={cancelUnpaidMutation.isPending}
          onPress={() =>
            confirmAndTrigger(
              'Auto-Cancel Unpaid',
              'Cancel all unpaid auto-order orders past the payment window?',
              () => cancelUnpaidMutation.mutate(),
            )
          }
        >
          {cancelUnpaidMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Icon name="cancel" size={20} color="#ffffff" />
              <Text style={styles.triggerButtonText}>Cancel Unpaid Orders</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Voucher Expiry */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Icon name="timer-off" size={20} color="#d97706" />
            <Text style={styles.cardTitle}>Trigger Voucher Expiry</Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>
          Manually expire vouchers past their expiry date and send notifications
        </Text>

        <TouchableOpacity
          style={[styles.triggerButton, styles.triggerButtonAmber, voucherExpiryMutation.isPending && styles.triggerButtonDisabled]}
          disabled={voucherExpiryMutation.isPending}
          onPress={() =>
            confirmAndTrigger(
              'Trigger Voucher Expiry',
              'Run voucher expiry check and send notifications?',
              () => voucherExpiryMutation.mutate(),
            )
          }
        >
          {voucherExpiryMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Icon name="timer-off" size={20} color="#ffffff" />
              <Text style={styles.triggerButtonText}>Run Voucher Expiry</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Kitchen Acceptance Timeout */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Icon name="hourglass-disabled" size={20} color="#d97706" />
            <Text style={styles.cardTitle}>Kitchen Acceptance Timeout</Text>
          </View>
        </View>
        <Text style={styles.cardDescription}>
          Auto-reject orders where kitchen did not respond within the acceptance deadline
        </Text>

        <TouchableOpacity
          style={[styles.triggerButton, styles.triggerButtonAmber, kitchenTimeoutMutation.isPending && styles.triggerButtonDisabled]}
          disabled={kitchenTimeoutMutation.isPending}
          onPress={() =>
            confirmAndTrigger(
              'Kitchen Acceptance Timeout',
              'Process expired kitchen acceptance orders? Orders past deadline will be auto-rejected.',
              () => kitchenTimeoutMutation.mutate(),
            )
          }
        >
          {kitchenTimeoutMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Icon name="hourglass-disabled" size={20} color="#ffffff" />
              <Text style={styles.triggerButtonText}>Process Timeouts</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  cardDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  cardDetails: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  detailValue: {
    color: '#374151',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  mealWindowRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  mealWindowChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mealWindowChipActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#7c3aed',
  },
  mealWindowChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  mealWindowChipTextActive: {
    color: '#7c3aed',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#374151',
  },
  toggle: {
    width: 48,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#34C759',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    borderRadius: 8,
  },
  triggerButtonBlue: {
    backgroundColor: '#2563eb',
  },
  triggerButtonRed: {
    backgroundColor: '#dc2626',
  },
  triggerButtonAmber: {
    backgroundColor: '#d97706',
  },
  triggerButtonDisabled: {
    opacity: 0.6,
  },
  triggerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
