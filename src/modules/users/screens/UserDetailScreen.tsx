import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../../../services/users.service';
import { Customer, Order, CustomerVoucher } from '../../../types/api.types';
import { useAlert } from '../../../hooks/useAlert';

const colors = {
  primary: '#FE8733',
  secondary: '#4ECDC4',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
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
  lg: 24,
  xl: 32,
};

interface UserDetailScreenProps {
  userId: string;
  onBack: () => void;
}

export const UserDetailScreen: React.FC<UserDetailScreenProps> = ({
  userId,
  onBack,
}) => {
  const { showError } = useAlert();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vouchers, setVouchers] = useState<CustomerVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'vouchers'>('orders');

  const fetchCustomerDetails = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch customer details, orders, and vouchers in parallel
      const [customerData, ordersData, vouchersData] = await Promise.all([
        usersService.getCustomerById(userId),
        usersService.getCustomerOrders(userId, { limit: 20 }),
        usersService.getCustomerVouchers(userId),
      ]);

      setCustomer(customerData);
      setOrders(ordersData.orders || []);
      setVouchers(vouchersData.vouchers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load customer details');
      showError('Error', err.message || 'Failed to load customer details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [userId]);

  const onRefresh = () => {
    fetchCustomerDetails(true);
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      PLACED: '#3b82f6',
      ACCEPTED: '#10b981',
      PREPARING: '#f59e0b',
      READY: '#8b5cf6',
      PICKED_UP: '#6366f1',
      OUT_FOR_DELIVERY: '#06b6d4',
      DELIVERED: '#10b981',
      REJECTED: '#ef4444',
      CANCELLED: '#6b7280',
      FAILED: '#ef4444',
    };
    return statusColors[status] || colors.gray;
  };

  const getVoucherStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      AVAILABLE: colors.success,
      REDEEMED: colors.gray,
      EXPIRED: colors.danger,
      RESTORED: colors.warning,
      CANCELLED: colors.gray,
    };
    return statusColors[status] || colors.gray;
  };

  const renderOrderCard = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <MaterialIcons name="receipt-long" size={18} color={colors.primary} />
          <Text style={styles.orderId}>#{item._id.slice(-8).toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.orderRow}>
          <MaterialIcons name="calendar-today" size={14} color={colors.gray} />
          <Text style={styles.orderLabel}>Scheduled:</Text>
          <Text style={styles.orderValue}>
            {new Date(item.scheduledFor).toLocaleDateString('en-IN')}
          </Text>
        </View>

        <View style={styles.orderRow}>
          <MaterialIcons name="attach-money" size={14} color={colors.gray} />
          <Text style={styles.orderLabel}>Amount:</Text>
          <Text style={styles.orderValue}>₹{item.totalAmount.toFixed(2)}</Text>
        </View>

        <View style={styles.orderRow}>
          <MaterialIcons name="access-time" size={14} color={colors.gray} />
          <Text style={styles.orderLabel}>Placed:</Text>
          <Text style={styles.orderValue}>
            {new Date(item.placedAt).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderVoucherCard = ({ item }: { item: CustomerVoucher }) => (
    <View style={styles.voucherCard}>
      <View style={styles.voucherHeader}>
        <View style={styles.voucherCodeContainer}>
          <MaterialIcons name="confirmation-number" size={18} color={colors.primary} />
          <Text style={styles.voucherCode}>{item.voucherCode}</Text>
        </View>
        <View style={[styles.voucherStatus, { backgroundColor: `${getVoucherStatusColor(item.status)}20` }]}>
          <Text style={[styles.voucherStatusText, { color: getVoucherStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.voucherDetails}>
        <View style={styles.voucherRow}>
          <MaterialIcons name="event" size={14} color={colors.gray} />
          <Text style={styles.voucherLabel}>Expires:</Text>
          <Text style={styles.voucherValue}>
            {new Date(item.expiresAt).toLocaleDateString('en-IN')}
          </Text>
        </View>

        {item.redeemedAt && (
          <View style={styles.voucherRow}>
            <MaterialIcons name="check-circle" size={14} color={colors.gray} />
            <Text style={styles.voucherLabel}>Redeemed:</Text>
            <Text style={styles.voucherValue}>
              {new Date(item.redeemedAt).toLocaleDateString('en-IN')}
            </Text>
          </View>
        )}

        {item.orderId && (
          <View style={styles.voucherRow}>
            <MaterialIcons name="receipt" size={14} color={colors.gray} />
            <Text style={styles.voucherLabel}>Order:</Text>
            <Text style={styles.voucherValue}>#{item.orderId.slice(-8).toUpperCase()}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading customer details...</Text>
        </View>
      </View>
    );
  }

  if (error || !customer) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={colors.danger} />
          <Text style={styles.errorTitle}>Failed to load</Text>
          <Text style={styles.errorSubtitle}>{error || 'Customer not found'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchCustomerDetails()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>
        {/* Customer Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={48} color={colors.primary} />
            </View>
            {customer.hasActiveSubscription && (
              <View style={styles.activeBadge}>
                <MaterialIcons name="verified" size={20} color={colors.success} />
                <Text style={styles.activeBadgeText}>Active Plan</Text>
              </View>
            )}
          </View>

          <Text style={styles.customerNameLarge}>{customer.name}</Text>
          <Text style={styles.customerPhoneLarge}>{customer.phone}</Text>
          {customer.email && (
            <Text style={styles.customerEmailLarge}>{customer.email}</Text>
          )}

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <MaterialIcons name="shopping-bag" size={24} color={colors.primary} />
              <Text style={styles.statBoxValue}>{customer.totalOrders}</Text>
              <Text style={styles.statBoxLabel}>Total Orders</Text>
            </View>

            <View style={styles.statBox}>
              <MaterialIcons name="account-balance-wallet" size={24} color={colors.success} />
              <Text style={styles.statBoxValue}>₹{customer.totalSpent.toFixed(0)}</Text>
              <Text style={styles.statBoxLabel}>Total Spent</Text>
            </View>

            <View style={styles.statBox}>
              <MaterialIcons name="confirmation-number" size={24} color={colors.secondary} />
              <Text style={styles.statBoxValue}>{customer.availableVouchers}</Text>
              <Text style={styles.statBoxLabel}>Vouchers</Text>
            </View>
          </View>

          <View style={styles.metaInfo}>
            <View style={styles.metaRow}>
              <MaterialIcons name="person-add" size={16} color={colors.gray} />
              <Text style={styles.metaText}>
                Joined {new Date(customer.createdAt).toLocaleDateString('en-IN')}
              </Text>
            </View>
            {customer.lastOrderAt && (
              <View style={styles.metaRow}>
                <MaterialIcons name="shopping-cart" size={16} color={colors.gray} />
                <Text style={styles.metaText}>
                  Last order {new Date(customer.lastOrderAt).toLocaleDateString('en-IN')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
            onPress={() => setActiveTab('orders')}>
            <MaterialIcons
              name="receipt-long"
              size={20}
              color={activeTab === 'orders' ? colors.primary : colors.gray}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'orders' && styles.tabTextActive,
              ]}>
              Orders ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'vouchers' && styles.tabActive]}
            onPress={() => setActiveTab('vouchers')}>
            <MaterialIcons
              name="confirmation-number"
              size={20}
              color={activeTab === 'vouchers' ? colors.primary : colors.gray}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'vouchers' && styles.tabTextActive,
              ]}>
              Vouchers ({vouchers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'orders' ? (
            orders.length > 0 ? (
              <FlatList
                data={orders}
                renderItem={renderOrderCard}
                keyExtractor={item => item._id}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyTab}>
                <MaterialIcons name="receipt-long" size={48} color={colors.gray} />
                <Text style={styles.emptyTabText}>No orders yet</Text>
              </View>
            )
          ) : vouchers.length > 0 ? (
            <FlatList
              data={vouchers}
              renderItem={renderVoucherCard}
              keyExtractor={item => item._id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyTab}>
              <MaterialIcons name="confirmation-number" size={48} color={colors.gray} />
              <Text style={styles.emptyTabText}>No vouchers yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.black,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
    marginTop: spacing.md,
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.gray,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.white,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    gap: spacing.xs,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  customerNameLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  customerPhoneLarge: {
    fontSize: 16,
    color: colors.gray,
    marginBottom: spacing.xs / 2,
  },
  customerEmailLarge: {
    fontSize: 14,
    color: colors.gray,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statBox: {
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.black,
    marginTop: spacing.sm,
  },
  statBoxLabel: {
    fontSize: 12,
    color: colors.gray,
    marginTop: spacing.xs,
  },
  metaInfo: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metaText: {
    fontSize: 13,
    color: colors.gray,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: 6,
    gap: spacing.sm,
  },
  tabActive: {
    backgroundColor: `${colors.primary}10`,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.black,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  orderDetails: {
    gap: spacing.sm,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderLabel: {
    fontSize: 13,
    color: colors.gray,
  },
  orderValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.black,
    flex: 1,
  },
  voucherCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  voucherCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  voucherCode: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.black,
  },
  voucherStatus: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  voucherStatusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  voucherDetails: {
    gap: spacing.sm,
  },
  voucherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  voucherLabel: {
    fontSize: 13,
    color: colors.gray,
  },
  voucherValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.black,
    flex: 1,
  },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTabText: {
    fontSize: 16,
    color: colors.gray,
    marginTop: spacing.md,
  },
});
