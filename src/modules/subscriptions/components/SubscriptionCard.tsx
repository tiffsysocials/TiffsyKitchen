/**
 * Subscription Card Component
 *
 * Displays customer subscription details
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Subscription, SubscriptionStatus } from '../../../types/subscription.types';
import { formatDistanceToNow } from 'date-fns';

interface SubscriptionCardProps {
  subscription: Subscription;
  onPress: () => void;
}

const PRIMARY_COLOR = '#FE8733';

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ subscription, onPress }) => {
  // Calculate voucher usage percentage
  const usagePercentage =
    subscription.vouchersIssued > 0
      ? Math.round((subscription.vouchersUsed / subscription.vouchersIssued) * 100)
      : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Header with Customer Info */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Icon name="person" size={24} color="#ffffff" />
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{subscription.userId.name}</Text>
          <Text style={styles.customerPhone}>{subscription.userId.phone}</Text>
        </View>
        {subscription.autoOrderingEnabled && (
          <View style={styles.autoBadge}>
            <Icon name="autorenew" size={12} color="#7c3aed" />
            <Text style={styles.autoBadgeText}>Auto</Text>
          </View>
        )}
        <StatusBadge status={subscription.status} />
      </View>

      {/* Plan Details */}
      <View style={styles.planRow}>
        <Icon name="card-membership" size={16} color="#6b7280" />
        <Text style={styles.planName}>{subscription.planId.name}</Text>
        <Text style={styles.planDuration}>({subscription.vouchersIssued} meals)</Text>
      </View>

      {/* Voucher Progress */}
      <View style={styles.voucherSection}>
        <View style={styles.voucherHeader}>
          <Text style={styles.voucherLabel}>Vouchers</Text>
          <Text style={styles.voucherCount}>
            {subscription.vouchersUsed}/{subscription.vouchersIssued}
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${usagePercentage}%` }]} />
        </View>
        <Text style={styles.vouchersRemaining}>
          {subscription.vouchersRemaining} left
        </Text>
      </View>

      {/* Footer with Payment and Date */}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Icon name="payments" size={14} color="#6b7280" />
          <Text style={styles.footerText}>₹{subscription.amountPaid}</Text>
          {subscription.paymentMethod && (
            <Text style={styles.paymentMethod}>• {subscription.paymentMethod}</Text>
          )}
        </View>
        <Text style={styles.dateText}>
          {subscription.purchasedAt
            ? formatDistanceToNow(new Date(subscription.purchasedAt), { addSuffix: true })
            : 'N/A'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Status Badge Component
 */
const StatusBadge: React.FC<{ status: SubscriptionStatus }> = ({ status }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'ACTIVE':
        return { backgroundColor: '#dcfce7', color: '#15803d', icon: 'check-circle' };
      case 'EXPIRED':
        return { backgroundColor: '#f3f4f6', color: '#6b7280', icon: 'schedule' };
      case 'CANCELLED':
        return { backgroundColor: '#fee2e2', color: '#dc2626', icon: 'cancel' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#6b7280', icon: 'help' };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
      <Icon name={statusStyle.icon} size={12} color={statusStyle.color} />
      <Text style={[styles.statusText, { color: statusStyle.color }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  customerPhone: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#ede9fe',
    marginRight: 6,
  },
  autoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7c3aed',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  planName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  planDuration: {
    fontSize: 13,
    color: '#9ca3af',
  },
  voucherSection: {
    marginBottom: 12,
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  voucherLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  voucherCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: PRIMARY_COLOR,
  },
  vouchersRemaining: {
    fontSize: 12,
    color: '#6b7280',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  paymentMethod: {
    fontSize: 12,
    color: '#9ca3af',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
