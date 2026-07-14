import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { Coupon } from '../../../types/api.types';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useAlert } from '../../../hooks/useAlert';
import { getDiscountTypeLabel, getStatusColor, formatDiscountValue } from '../models/types';

interface CouponCardProps {
  coupon: Coupon;
  onPress: (coupon: Coupon) => void;
  onEdit: (coupon: Coupon) => void;
  onToggleStatus: (coupon: Coupon) => void;
  onDelete: (coupon: Coupon) => void;
}

export const CouponCard: React.FC<CouponCardProps> = ({
  coupon,
  onPress,
  onEdit,
  onToggleStatus,
  onDelete,
}) => {
  const { showConfirm } = useAlert();
  const statusColor = getStatusColor(coupon.status);
  const isActive = coupon.status === 'ACTIVE';
  const canDelete = (coupon.totalUsageCount || 0) === 0;

  const handleDelete = () => {
    if (!canDelete) return;
    showConfirm(
      'Delete Coupon',
      `Are you sure you want to delete coupon "${coupon.code}"?\n\nThis action cannot be undone.`,
      () => onDelete(coupon),
      undefined,
      { confirmText: 'Delete', cancelText: 'Cancel', isDestructive: true }
    );
  };

  const handleToggleStatus = () => {
    if (coupon.status === 'EXPIRED' || coupon.status === 'EXHAUSTED') return;
    const action = isActive ? 'deactivate' : 'activate';
    showConfirm(
      `${isActive ? 'Deactivate' : 'Activate'} Coupon`,
      `Are you sure you want to ${action} coupon "${coupon.code}"?`,
      () => onToggleStatus(coupon),
      undefined,
      { confirmText: isActive ? 'Deactivate' : 'Activate', cancelText: 'Cancel' }
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const usageText = coupon.usageStats
    ? `${coupon.usageStats.used}/${coupon.usageStats.remaining === 'Unlimited' ? '∞' : coupon.usageStats.remaining} used`
    : coupon.totalUsageLimit
      ? `${coupon.totalUsageCount || 0}/${coupon.totalUsageLimit} used`
      : `${coupon.totalUsageCount || 0} used`;

  return (
    <TouchableOpacity
      style={[styles.card, !isActive && coupon.status !== 'EXPIRED' && coupon.status !== 'EXHAUSTED' && styles.cardInactive]}
      onPress={() => onPress(coupon)}
      activeOpacity={0.95}
    >
      {/* Top Accent Bar */}
      <View style={[styles.accentBar, { backgroundColor: statusColor }]} />

      {/* Header: Code + Status */}
      <View style={styles.cardHeader}>
        <View style={styles.codeContainer}>
          <Icon name="ticket-percent" size={20} color={colors.primary} />
          <Text style={styles.codeText}>{coupon.code}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {coupon.status}
          </Text>
        </View>
      </View>

      {/* Name + Discount Type */}
      <View style={styles.nameRow}>
        <Text style={styles.nameText} numberOfLines={1}>{coupon.name}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{getDiscountTypeLabel(coupon.discountType)}</Text>
        </View>
      </View>

      {/* Discount Value */}
      <View style={styles.discountRow}>
        <Icon name="sale" size={16} color={colors.primary} />
        <Text style={styles.discountText}>{formatDiscountValue(coupon)}</Text>
      </View>

      {/* Info Grid */}
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Icon name="calendar-range" size={14} color={colors.textMuted} />
          <Text style={styles.infoText}>
            {formatDate(coupon.validFrom)} - {formatDate(coupon.validTill)}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Icon name="account-group" size={14} color={colors.textMuted} />
          <Text style={styles.infoText}>{usageText}</Text>
        </View>
      </View>

      {/* Applies-to + Menu Types */}
      {((coupon.applicableMenuTypes && coupon.applicableMenuTypes.length > 0) ||
        coupon.applicableFor?.includes('PLAN_PURCHASE')) && (
        <View style={styles.menuTypesRow}>
          {coupon.applicableFor?.includes('PLAN_PURCHASE') && (
            <View style={[styles.menuTypeBadge, { backgroundColor: '#EDE9FE' }]}>
              <Text style={[styles.menuTypeText, { color: '#7C3AED' }]}>
                Plan Purchase{coupon.applicablePlanIds && coupon.applicablePlanIds.length > 0 ? ` (${coupon.applicablePlanIds.length})` : ' (all plans)'}
              </Text>
            </View>
          )}
          {(coupon.applicableMenuTypes || []).map((mt) => (
            <View key={mt} style={styles.menuTypeBadge}>
              <Text style={styles.menuTypeText}>
                {mt === 'MEAL_MENU' ? 'Meal' : 'On Demand'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity style={styles.primaryActionButton} onPress={() => onEdit(coupon)} activeOpacity={0.8}>
          <Icon name="pencil" size={16} color="#FFFFFF" />
          <Text style={styles.primaryActionText}>Edit</Text>
        </TouchableOpacity>

        <View style={styles.secondaryActions}>
          {(coupon.status === 'ACTIVE' || coupon.status === 'INACTIVE') && (
            <TouchableOpacity
              style={[styles.secondaryActionButton, styles.statusActionButton]}
              onPress={handleToggleStatus}
              activeOpacity={0.8}
            >
              <Icon
                name={isActive ? 'pause' : 'play'}
                size={16}
                color={isActive ? '#f59e0b' : '#10b981'}
              />
            </TouchableOpacity>
          )}

          {canDelete && (
            <TouchableOpacity
              style={[styles.secondaryActionButton, styles.deleteActionButton]}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Icon name="delete" size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardInactive: {
    opacity: 0.65,
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7c3aed',
    letterSpacing: 0.3,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 6,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  infoGrid: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  menuTypesRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 6,
  },
  menuTypeBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  menuTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563eb',
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    gap: 6,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusActionButton: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde047',
  },
  deleteActionButton: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
});
