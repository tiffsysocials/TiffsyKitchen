import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { User, Kitchen } from '../../../types/api.types';
import { RoleBadge } from './RoleBadge';
import { StatusBadge } from './StatusBadge';

interface UserCardProps {
  user: User & { availableVouchers?: number; hasActiveSubscription?: boolean };
  onPress: (user: User) => void;
}

const colors = {
  primary: '#FE8733',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  white: '#ffffff',
  black: '#1f2937',
  border: '#e5e7eb',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
};

export const UserCard: React.FC<UserCardProps> = ({ user, onPress }) => {
  // Debug logging for customer vouchers
  if (user.role === 'CUSTOMER') {
    console.log(`🎫 UserCard rendering customer: ${user.name}`, {
      hasActiveSubscription: user.hasActiveSubscription,
      availableVouchers: user.availableVouchers,
      willShowSubscriptionBadge: user.hasActiveSubscription,
      willShowVoucherBadge: (user.availableVouchers ?? 0) > 0,
    });
  }

  const formatLastLogin = (lastLoginAt?: string) => {
    if (!lastLoginAt) return 'Never';

    const now = new Date();
    const loginDate = new Date(lastLoginAt);
    const diffMs = now.getTime() - loginDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return loginDate.toLocaleDateString('en-IN');
  };

  const getKitchenName = () => {
    if (user.role !== 'KITCHEN_STAFF' || !user.kitchenId) return null;
    if (typeof user.kitchenId === 'string') return null;
    return (user.kitchenId as Kitchen).name;
  };

  const kitchenName = getKitchenName();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(user)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <MaterialIcons
            name={user.role === 'DRIVER' ? 'local-shipping' : user.role === 'KITCHEN_STAFF' ? 'restaurant' : user.role === 'ADMIN' ? 'admin-panel-settings' : 'person'}
            size={32}
            color={colors.primary}
          />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name} numberOfLines={1}>
            {user.name}
          </Text>
          <Text style={styles.phone}>{user.phone}</Text>
          {user.email && (
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
          )}
        </View>
        <View style={styles.badges}>
          <RoleBadge role={user.role} size="small" />
          {user.role === 'CUSTOMER' && user.hasActiveSubscription && (
            <View style={styles.subscriptionBadge}>
              <MaterialIcons name="verified" size={16} color="#10b981" />
            </View>
          )}
        </View>
      </View>

      {/* Voucher Info for Customers */}
      {user.role === 'CUSTOMER' && (
        <View style={styles.voucherSection}>
          <MaterialIcons name="confirmation-number" size={16} color="#6b7280" />
          <Text style={styles.voucherLabel}>Vouchers:</Text>
          <Text style={styles.voucherValue}>{user.availableVouchers ?? 0}</Text>
        </View>
      )}

      {kitchenName && (
        <View style={[styles.kitchenInfo, styles.withBorderTop]}>
          <MaterialIcons name="restaurant" size={14} color={colors.gray} />
          <Text style={styles.kitchenText} numberOfLines={1}>
            {kitchenName}
          </Text>
        </View>
      )}

      {user.role === 'ADMIN' && user.username && (
        <View style={[styles.kitchenInfo, styles.withBorderTop]}>
          <MaterialIcons name="account-circle" size={14} color={colors.gray} />
          <Text style={styles.kitchenText}>@{user.username}</Text>
        </View>
      )}

      {user.appInfo?.version ? (
        <View style={[styles.kitchenInfo, styles.withBorderTop]}>
          <MaterialIcons name="smartphone" size={14} color={colors.gray} />
          <Text style={styles.kitchenText} numberOfLines={1}>
            {`v${user.appInfo.version}`}
            {user.appInfo.appType ? ` · ${user.appInfo.appType}` : ''}
            {user.appInfo.platform ? ` · ${user.appInfo.platform}` : ''}
          </Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <StatusBadge status={user.status} size="small" />
        </View>
        <View style={styles.footerRight}>
          <MaterialIcons name="access-time" size={12} color={colors.gray} />
          <Text style={styles.lastLogin}>
            {formatLastLogin(user.lastLoginAt)}
          </Text>
        </View>
      </View>

      {user.status === 'SUSPENDED' && user.suspensionReason && (
        <View style={styles.suspensionBanner}>
          <MaterialIcons name="warning" size={14} color="#ef4444" />
          <Text style={styles.suspensionText} numberOfLines={1}>
            {user.suspensionReason}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    marginBottom: spacing.xs / 2,
  },
  phone: {
    fontSize: 13,
    color: colors.gray,
    marginBottom: spacing.xs / 2,
  },
  email: {
    fontSize: 12,
    color: colors.gray,
  },
  badges: {
    flexDirection: 'column',
    gap: spacing.xs,
    alignItems: 'flex-end',
  },
  subscriptionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voucherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm - 2,
    paddingVertical: spacing.xs / 2,
    borderRadius: 10,
    backgroundColor: '#4ECDC4',
    minWidth: 24,
    justifyContent: 'center',
  },
  voucherBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  voucherSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  voucherLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray,
  },
  voucherValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4ECDC4',
  },
  kitchenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  withBorderTop: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  kitchenText: {
    fontSize: 13,
    color: colors.gray,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  lastLogin: {
    fontSize: 12,
    color: colors.gray,
  },
  suspensionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
  },
  suspensionText: {
    fontSize: 12,
    color: '#ef4444',
    flex: 1,
  },
});
