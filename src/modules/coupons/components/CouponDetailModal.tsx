import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CouponDetailsResponse, Coupon } from '../../../types/api.types';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useAlert } from '../../../hooks/useAlert';
import {
  getDiscountTypeLabel,
  getStatusColor,
  formatDiscountValue,
  TARGET_USER_OPTIONS,
} from '../models/types';

interface CouponDetailModalProps {
  visible: boolean;
  data: CouponDetailsResponse | null;
  loading: boolean;
  onClose: () => void;
  onEdit: (coupon: Coupon) => void;
  onToggleStatus: (coupon: Coupon) => void;
  onDelete: (coupon: Coupon) => void;
}

export const CouponDetailModal: React.FC<CouponDetailModalProps> = ({
  visible,
  data,
  loading,
  onClose,
  onEdit,
  onToggleStatus,
  onDelete,
}) => {
  const { showConfirm } = useAlert();
  const insets = useSafeAreaInsets();
  const coupon = data?.coupon;
  const stats = data?.usageStats;
  const recentUsage = data?.recentUsage || [];

  const handleDelete = () => {
    if (!coupon || (coupon.totalUsageCount || 0) > 0) return;
    showConfirm(
      'Delete Coupon',
      `Are you sure you want to delete "${coupon.code}"?\n\nThis action cannot be undone.`,
      () => { onDelete(coupon); onClose(); },
      undefined,
      { confirmText: 'Delete', cancelText: 'Cancel', isDestructive: true }
    );
  };

  const handleToggle = () => {
    if (!coupon) return;
    if (coupon.status !== 'ACTIVE' && coupon.status !== 'INACTIVE') return;
    const action = coupon.status === 'ACTIVE' ? 'deactivate' : 'activate';
    showConfirm(
      `${coupon.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} Coupon`,
      `Are you sure you want to ${action} "${coupon.code}"?`,
      () => { onToggleStatus(coupon); onClose(); }
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try { return format(new Date(dateStr), 'dd MMM yyyy, hh:mm a'); } catch { return dateStr; }
  };

  const formatDateShort = (dateStr?: string) => {
    if (!dateStr) return '-';
    try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
  };

  const renderInfoRow = (label: string, value: string | number | undefined, icon?: string) => (
    <View style={styles.infoRow}>
      {icon && <Icon name={icon} size={16} color={colors.textMuted} style={styles.infoIcon} />}
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? '-'}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Coupon Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading coupon details...</Text>
            </View>
          ) : coupon ? (
            <ScrollView style={styles.scrollContent}>
              {/* Code + Status Header */}
              <View style={styles.codeHeader}>
                <View style={styles.codeRow}>
                  <Icon name="ticket-percent" size={24} color={colors.primary} />
                  <Text style={styles.codeText}>{coupon.code}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(coupon.status) + '20' }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(coupon.status) }]} />
                  <Text style={[styles.statusText, { color: getStatusColor(coupon.status) }]}>{coupon.status}</Text>
                </View>
              </View>

              {/* Name & Discount */}
              <View style={styles.section}>
                <Text style={styles.couponName}>{coupon.name}</Text>
                {coupon.description && <Text style={styles.couponDesc}>{coupon.description}</Text>}
                <View style={styles.discountBanner}>
                  <Icon name="sale" size={20} color={colors.primary} />
                  <Text style={styles.discountText}>{formatDiscountValue(coupon)}</Text>
                </View>
              </View>

              {/* Usage Stats */}
              {stats && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Usage Statistics</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>{stats.totalUsed}</Text>
                      <Text style={styles.statLabel}>Total Used</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>{stats.uniqueUsers}</Text>
                      <Text style={styles.statLabel}>Unique Users</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>Rs.{stats.totalDiscountGiven}</Text>
                      <Text style={styles.statLabel}>Discount Given</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statValue}>
                        {stats.remainingUses === 'Unlimited' ? '∞' : stats.remainingUses}
                      </Text>
                      <Text style={styles.statLabel}>Remaining</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Configuration</Text>
                {renderInfoRow('Type', getDiscountTypeLabel(coupon.discountType), 'tag')}
                {renderInfoRow('Valid From', formatDateShort(coupon.validFrom), 'calendar-start')}
                {renderInfoRow('Valid Till', formatDateShort(coupon.validTill), 'calendar-end')}
                {renderInfoRow('Target', TARGET_USER_OPTIONS.find(o => o.value === coupon.targetUserType)?.label, 'account-group')}
                {renderInfoRow('First Order Only', coupon.isFirstOrderOnly ? 'Yes' : 'No', 'numeric-1-circle')}
                {renderInfoRow('Per User Limit', coupon.perUserLimit, 'account-lock')}
                {renderInfoRow('Total Limit', coupon.totalUsageLimit ?? 'Unlimited', 'counter')}
                {renderInfoRow('Min Order', coupon.minOrderValue ? `Rs.${coupon.minOrderValue}` : 'None', 'cash')}
                {renderInfoRow('Min Items', coupon.minItems || 'None', 'cart')}
                {renderInfoRow('Visible', coupon.isVisible ? 'Yes' : 'No', 'eye')}
                {renderInfoRow('Display Order', coupon.displayOrder, 'sort-numeric-ascending')}
                {coupon.applicableMenuTypes && coupon.applicableMenuTypes.length > 0 && (
                  renderInfoRow('Menu Types', coupon.applicableMenuTypes.map(t => t === 'MEAL_MENU' ? 'Meal' : 'On Demand').join(', '), 'food')
                )}
              </View>

              {/* Terms */}
              {coupon.termsAndConditions && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Terms & Conditions</Text>
                  <Text style={styles.termsText}>{coupon.termsAndConditions}</Text>
                </View>
              )}

              {/* Recent Usage */}
              {recentUsage.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent Usage</Text>
                  {recentUsage.map((usage, index) => (
                    <View key={usage.order || String(index)} style={styles.usageItem}>
                      <View style={styles.usageInfo}>
                        <Text style={styles.usageName}>{usage.user?.name || 'Unknown'}</Text>
                        <Text style={styles.usageOrder}>Order: {usage.order}</Text>
                      </View>
                      <View style={styles.usageRight}>
                        <Text style={styles.usageAmount}>Rs.{usage.discount}</Text>
                        <Text style={styles.usageDate}>{formatDateShort(usage.date)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Metadata */}
              <View style={styles.section}>
                <Text style={styles.metaText}>Created: {formatDate(coupon.createdAt)}</Text>
                {coupon.updatedAt && <Text style={styles.metaText}>Updated: {formatDate(coupon.updatedAt)}</Text>}
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>
          ) : (
            <View style={styles.loadingContainer}>
              <Icon name="alert-circle" size={48} color={colors.error} />
              <Text style={styles.loadingText}>Failed to load coupon details</Text>
            </View>
          )}

          {/* Actions Footer */}
          {coupon && !loading && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => { onEdit(coupon); onClose(); }}
                activeOpacity={0.8}
              >
                <Icon name="pencil" size={18} color="#fff" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>

              {(coupon.status === 'ACTIVE' || coupon.status === 'INACTIVE') && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.toggleButton]}
                  onPress={handleToggle}
                  activeOpacity={0.8}
                >
                  <Icon
                    name={coupon.status === 'ACTIVE' ? 'pause' : 'play'}
                    size={18}
                    color={coupon.status === 'ACTIVE' ? '#f59e0b' : '#10b981'}
                  />
                </TouchableOpacity>
              )}

              {(coupon.totalUsageCount || 0) === 0 && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={handleDelete}
                  activeOpacity={0.8}
                >
                  <Icon name="delete" size={18} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          )}
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
    maxHeight: '95%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
  scrollContent: {
    flex: 1,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#f8fafc',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  couponName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  couponDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  discountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadiusMd,
    gap: 8,
  },
  discountText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderRadius: spacing.borderRadiusMd,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  termsText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  usageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  usageInfo: {
    flex: 1,
  },
  usageName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  usageOrder: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  usageRight: {
    alignItems: 'flex-end',
  },
  usageAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  usageDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: spacing.borderRadiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.primary,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  toggleButton: {
    width: 48,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  deleteButton: {
    width: 48,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
});
