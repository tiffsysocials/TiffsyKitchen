import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { adminUsersService } from '../../../services/admin-users.service';
import { User, Kitchen, UserDetailsResponse, Order } from '../../../types/api.types';
import { Subscription } from '../../../types/subscription.types';
import { subscriptionsService } from '../../../services/subscriptions.service';
import { ordersService } from '../../../services/orders.service';
import { addressService, Address } from '../../../services/address.service';
import { RoleBadge } from '../components/RoleBadge';
import { StatusBadge } from '../components/StatusBadge';
import { SuspendUserModal } from '../components/SuspendUserModal';
import { ResetPasswordModal } from '../components/ResetPasswordModal';
import { EditUserModal } from '../components/EditUserModal';
import { useAlert } from '../../../hooks/useAlert';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';

interface UserDetailAdminScreenProps {
  userId: string;
  onBack: () => void;
}

const colors = {
  primary: '#FE8733',
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

export const UserDetailAdminScreen: React.FC<UserDetailAdminScreenProps> = ({
  userId,
  onBack,
}) => {
  const { showSuccess, showError, showConfirm } = useAlert();
  const [userData, setUserData] = useState<UserDetailsResponse | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchUserDetails = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await adminUsersService.getUserById(userId);
      setUserData(data);

      // For customers, fetch subscriptions, orders, and addresses
      if (data.user.role === 'CUSTOMER') {
        fetchSubscriptions();
        fetchOrders();
        fetchAddresses();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load user details');
      showError('Error', err.message || 'Failed to load user details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoadingSubscriptions(true);
      const response = await subscriptionsService.getAllSubscriptions({ userId, limit: 10 });
      setSubscriptions(response.subscriptions || []);
    } catch (err: any) {
      console.log('Failed to fetch subscriptions:', err);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const response = await ordersService.getOrdersByUser(userId, { limit: 10 });
      setOrders(response.orders || []);
    } catch (err: any) {
      console.log('Failed to fetch orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const response = await addressService.getAllUserAddresses(userId);
      setAddresses(response.addresses || []);
    } catch (err: any) {
      console.log('Failed to fetch addresses:', err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const onRefresh = () => {
    fetchUserDetails(true);
  };

  const handleCall = () => {
    if (userData?.user.phone) {
      Linking.openURL(`tel:${userData.user.phone}`);
    }
  };

  const handleActivate = async () => {
    showConfirm(
      'Activate User',
      `Are you sure you want to activate ${userData?.user.name}?`,
      async () => {
        try {
          setActionLoading(true);
          await adminUsersService.activateUser(userId);
          showSuccess('Success', 'User activated successfully');
          fetchUserDetails();
        } catch (error: any) {
          showError('Error', error.message || 'Failed to activate user');
        } finally {
          setActionLoading(false);
        }
      },
      undefined,
      { confirmText: 'Activate', cancelText: 'Cancel' }
    );
  };

  const handleDeactivate = async () => {
    showConfirm(
      'Deactivate User',
      `Are you sure you want to deactivate ${userData?.user.name}?`,
      async () => {
        try {
          setActionLoading(true);
          await adminUsersService.deactivateUser(userId);
          showSuccess('Success', 'User deactivated successfully');
          fetchUserDetails();
        } catch (error: any) {
          showError('Error', error.message || 'Failed to deactivate user');
        } finally {
          setActionLoading(false);
        }
      },
      undefined,
      { confirmText: 'Deactivate', cancelText: 'Cancel', isDestructive: true }
    );
  };

  const handleDelete = async () => {
    showConfirm(
      'Delete User',
      `Are you sure you want to delete ${userData?.user.name}? This action cannot be undone.`,
      async () => {
        try {
          setActionLoading(true);
          await adminUsersService.deleteUser(userId);
          showSuccess('Success', 'User deleted successfully');
          onBack();
        } catch (error: any) {
          showError('Error', error.message || 'Failed to delete user');
          setActionLoading(false);
        }
      },
      undefined,
      { confirmText: 'Delete', cancelText: 'Cancel', isDestructive: true }
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaScreen topBackgroundColor={colors.white} bottomBackgroundColor={colors.lightGray} backgroundColor={colors.lightGray}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={colors.black} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>User Details</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading user details...</Text>
          </View>
        </View>
      </SafeAreaScreen>
    );
  }

  if (error || !userData) {
    return (
      <SafeAreaScreen topBackgroundColor={colors.white} bottomBackgroundColor={colors.lightGray} backgroundColor={colors.lightGray}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={colors.black} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>User Details</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color={colors.danger} />
            <Text style={styles.errorTitle}>Failed to load</Text>
            <Text style={styles.errorSubtitle}>{error || 'User not found'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchUserDetails()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaScreen>
    );
  }

  const { user, kitchen, stats } = userData;

  return (
    <SafeAreaScreen topBackgroundColor={colors.white} bottomBackgroundColor={colors.lightGray} backgroundColor={colors.lightGray}>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
            <MaterialIcons name="edit" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCall} style={styles.callButton}>
            <MaterialIcons name="phone" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <MaterialIcons
                name={
                  user.role === 'DRIVER'
                    ? 'local-shipping'
                    : user.role === 'KITCHEN_STAFF'
                    ? 'restaurant'
                    : user.role === 'ADMIN'
                    ? 'admin-panel-settings'
                    : 'person'
                }
                size={48}
                color={colors.primary}
              />
            </View>
          </View>

          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userPhone}>{user.phone}</Text>
          {user.email && <Text style={styles.userEmail}>{user.email}</Text>}

          <View style={styles.badgesRow}>
            <RoleBadge role={user.role} size="medium" />
            <StatusBadge status={user.status} size="medium" />
          </View>

          {/* Voucher Count for Customers */}
          {user.role === 'CUSTOMER' && stats && (
            <View style={styles.voucherInfoCard}>
              <MaterialIcons name="confirmation-number" size={20} color="#4ECDC4" />
              <Text style={styles.voucherInfoLabel}>Available Vouchers:</Text>
              <Text style={styles.voucherInfoValue}>{stats.availableVouchers || 0}</Text>
            </View>
          )}

          {user.status === 'SUSPENDED' && user.suspensionReason && (
            <View style={styles.suspensionBanner}>
              <MaterialIcons name="warning" size={16} color={colors.danger} />
              <Text style={styles.suspensionText}>{user.suspensionReason}</Text>
            </View>
          )}
        </View>

        {/* Role-Specific Info */}
        {user.role === 'KITCHEN_STAFF' && kitchen && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="restaurant" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Assigned Kitchen</Text>
            </View>
            <View style={styles.kitchenCard}>
              <Text style={styles.kitchenName}>{kitchen.name}</Text>
              <Text style={styles.kitchenCode}>{kitchen.code}</Text>
              <View style={styles.kitchenMeta}>
                <MaterialIcons name="location-on" size={14} color={colors.gray} />
                <Text style={styles.kitchenMetaText}>
                  {kitchen.address.city}, {kitchen.address.pincode}
                </Text>
              </View>
            </View>
          </View>
        )}

        {user.role === 'ADMIN' && user.username && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="account-circle" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Admin Info</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username:</Text>
              <Text style={styles.infoValue}>@{user.username}</Text>
            </View>
          </View>
        )}

        {/* Statistics */}
        {stats && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="analytics" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Statistics</Text>
            </View>
            <View style={styles.statsGrid}>
              {user.role === 'CUSTOMER' && (
                <>
                  <View style={styles.statBox}>
                    <MaterialIcons name="shopping-bag" size={24} color={colors.primary} />
                    <Text style={styles.statValue}>{stats.totalOrders || 0}</Text>
                    <Text style={styles.statLabel}>Total Orders</Text>
                  </View>
                  <View style={styles.statBox}>
                    <MaterialIcons name="account-balance-wallet" size={24} color={colors.success} />
                    <Text style={styles.statValue}>₹{stats.totalSpent || 0}</Text>
                    <Text style={styles.statLabel}>Total Spent</Text>
                  </View>
                  <View style={styles.statBox}>
                    <MaterialIcons name="confirmation-number" size={24} color={colors.warning} />
                    <Text style={styles.statValue}>{stats.availableVouchers || 0}</Text>
                    <Text style={styles.statLabel}>Vouchers</Text>
                  </View>
                </>
              )}
              {user.role === 'KITCHEN_STAFF' && (
                <>
                  <View style={styles.statBox}>
                    <MaterialIcons name="today" size={24} color={colors.primary} />
                    <Text style={styles.statValue}>{stats.ordersProcessedToday || 0}</Text>
                    <Text style={styles.statLabel}>Today</Text>
                  </View>
                  <View style={styles.statBox}>
                    <MaterialIcons name="calendar-month" size={24} color={colors.success} />
                    <Text style={styles.statValue}>{stats.ordersProcessedThisMonth || 0}</Text>
                    <Text style={styles.statLabel}>This Month</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Subscription Plans (for Customers) */}
        {user.role === 'CUSTOMER' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="card-membership" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Subscriptions</Text>
            </View>
            {loadingSubscriptions ? (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading subscriptions...</Text>
              </View>
            ) : subscriptions.length > 0 ? (
              subscriptions.map(subscription => (
                <View key={subscription._id} style={styles.subscriptionCard}>
                  <View style={styles.subscriptionHeader}>
                    <Text style={styles.subscriptionPlanName}>{subscription.planId.name}</Text>
                    <View
                      style={[
                        styles.subscriptionStatusBadge,
                        subscription.status === 'ACTIVE' && styles.subscriptionStatusActive,
                        subscription.status === 'EXPIRED' && styles.subscriptionStatusExpired,
                        subscription.status === 'CANCELLED' && styles.subscriptionStatusCancelled,
                      ]}
                    >
                      <Text style={styles.subscriptionStatusText}>{subscription.status}</Text>
                    </View>
                  </View>
                  <View style={styles.subscriptionMeta}>
                    <View style={styles.subscriptionMetaRow}>
                      <MaterialIcons name="calendar-today" size={14} color={colors.gray} />
                      <Text style={styles.subscriptionMetaText}>
                        {subscription.planId.durationDays} days
                      </Text>
                    </View>
                    <View style={styles.subscriptionMetaRow}>
                      <MaterialIcons name="confirmation-number" size={14} color={colors.gray} />
                      <Text style={styles.subscriptionMetaText}>
                        {subscription.vouchersRemaining}/{subscription.vouchersIssued} vouchers
                      </Text>
                    </View>
                  </View>
                  <View style={styles.subscriptionDates}>
                    <Text style={styles.subscriptionDateText}>
                      Purchased: {new Date(subscription.purchasedAt).toLocaleDateString('en-IN')}
                    </Text>
                    <Text style={styles.subscriptionDateText}>
                      Expires: {new Date(subscription.expiresAt).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.subscriptionAmount}>
                    <Text style={styles.subscriptionAmountLabel}>Amount Paid:</Text>
                    <Text style={styles.subscriptionAmountValue}>₹{subscription.amountPaid}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No subscriptions found</Text>
            )}
          </View>
        )}

        {/* Addresses (for Customers) */}
        {user.role === 'CUSTOMER' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="location-on" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Saved Addresses</Text>
            </View>
            {loadingAddresses ? (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading addresses...</Text>
              </View>
            ) : addresses.length > 0 ? (
              addresses.map(address => (
                <View key={address._id} style={styles.addressCard}>
                  <View style={styles.addressHeader}>
                    <Text style={styles.addressLabel}>{address.label}</Text>
                    {address.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addressText}>
                    {address.addressLine1}
                    {address.addressLine2 && `, ${address.addressLine2}`}
                  </Text>
                  <Text style={styles.addressText}>
                    {address.locality}, {address.city}
                  </Text>
                  <Text style={styles.addressText}>
                    {address.state} - {address.pincode}
                  </Text>
                  {address.landmark && (
                    <View style={styles.addressLandmark}>
                      <MaterialIcons name="place" size={14} color={colors.gray} />
                      <Text style={styles.addressLandmarkText}>{address.landmark}</Text>
                    </View>
                  )}
                  {address.zoneId && (
                    <View style={styles.addressZone}>
                      <MaterialIcons name="location-city" size={14} color={colors.primary} />
                      <Text style={styles.addressZoneText}>{address.zoneId.name}</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No addresses found</Text>
            )}
          </View>
        )}

        {/* Orders (for Customers) */}
        {user.role === 'CUSTOMER' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="shopping-bag" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Recent Orders</Text>
            </View>
            {loadingOrders ? (
              <View style={styles.loadingSection}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading orders...</Text>
              </View>
            ) : orders.length > 0 ? (
              orders.map(order => (
                <View key={order._id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                    <View
                      style={[
                        styles.orderStatusBadge,
                        order.status === 'DELIVERED' && styles.orderStatusDelivered,
                        order.status === 'CANCELLED' && styles.orderStatusCancelled,
                        order.status === 'REJECTED' && styles.orderStatusRejected,
                        order.status === 'FAILED' && styles.orderStatusFailed,
                      ]}
                    >
                      <Text style={styles.orderStatusText}>{order.status}</Text>
                    </View>
                  </View>
                  <View style={styles.orderMeta}>
                    <MaterialIcons name="restaurant" size={14} color={colors.gray} />
                    <Text style={styles.orderMetaText} numberOfLines={1}>
                      {order.kitchenId.name}
                    </Text>
                  </View>
                  {order.mealWindow && (
                    <View style={styles.orderMeta}>
                      <MaterialIcons
                        name={order.mealWindow === 'LUNCH' ? 'wb-sunny' : 'nights-stay'}
                        size={14}
                        color={colors.gray}
                      />
                      <Text style={styles.orderMetaText}>{order.mealWindow}</Text>
                    </View>
                  )}
                  <View style={styles.orderFooter}>
                    <Text style={styles.orderDate}>
                      {new Date(order.placedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.orderAmount}>₹{order.grandTotal}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No orders found</Text>
            )}
          </View>
        )}

        {/* Account Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="info" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Account Info</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>
              {new Date(user.createdAt || '').toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
          {user.lastLoginAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Login:</Text>
              <Text style={styles.infoValue}>
                {new Date(user.lastLoginAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Actions Section */}
        {user.role !== 'CUSTOMER' && (
          <View style={styles.actionsSection}>
            <Text style={styles.actionsTitle}>Actions</Text>

            {/* Status Actions */}
            <View style={styles.actionButtons}>
              {user.status === 'ACTIVE' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.warningButton]}
                    onPress={handleDeactivate}
                    disabled={actionLoading}
                  >
                    <MaterialIcons name="cancel" size={18} color={colors.white} />
                    <Text style={styles.actionButtonText}>Deactivate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.dangerButton]}
                    onPress={() => setShowSuspendModal(true)}
                    disabled={actionLoading}
                  >
                    <MaterialIcons name="block" size={18} color={colors.white} />
                    <Text style={styles.actionButtonText}>Suspend</Text>
                  </TouchableOpacity>
                </>
              )}
              {user.status === 'INACTIVE' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.successButton]}
                  onPress={handleActivate}
                  disabled={actionLoading}
                >
                  <MaterialIcons name="check-circle" size={18} color={colors.white} />
                  <Text style={styles.actionButtonText}>Activate</Text>
                </TouchableOpacity>
              )}
              {user.status === 'SUSPENDED' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.successButton]}
                  onPress={handleActivate}
                  disabled={actionLoading}
                >
                  <MaterialIcons name="check-circle" size={18} color={colors.white} />
                  <Text style={styles.actionButtonText}>Reactivate</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Admin-specific actions */}
            {user.role === 'ADMIN' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton, styles.fullWidthButton]}
                onPress={() => setShowResetPasswordModal(true)}
                disabled={actionLoading}
              >
                <MaterialIcons name="lock-reset" size={18} color={colors.white} />
                <Text style={styles.actionButtonText}>Reset Password</Text>
              </TouchableOpacity>
            )}

            {/* Delete Action */}
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton, styles.fullWidthButton]}
              onPress={handleDelete}
              disabled={actionLoading}
            >
              <MaterialIcons name="delete" size={18} color={colors.white} />
              <Text style={styles.actionButtonText}>Delete User</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <EditUserModal
        visible={showEditModal}
        user={user}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => fetchUserDetails()}
      />
      <SuspendUserModal
        visible={showSuspendModal}
        user={user}
        onClose={() => setShowSuspendModal(false)}
        onSuccess={() => fetchUserDetails()}
      />
      <ResetPasswordModal
        visible={showResetPasswordModal}
        user={user}
        onClose={() => setShowResetPasswordModal(false)}
        onSuccess={() => fetchUserDetails()}
      />
    </View>
    </SafeAreaScreen>
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
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
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
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarSection: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  userPhone: {
    fontSize: 16,
    color: colors.gray,
    marginBottom: spacing.xs / 2,
  },
  userEmail: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: spacing.md,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  voucherInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: '#f0fdfa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99f6e4',
    width: '100%',
  },
  voucherInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray,
    flex: 1,
  },
  voucherInfoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4ECDC4',
  },
  suspensionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    width: '100%',
  },
  suspensionText: {
    flex: 1,
    fontSize: 13,
    color: colors.danger,
    fontWeight: '500',
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
  },
  kitchenCard: {
    padding: spacing.md,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
  },
  kitchenName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  kitchenCode: {
    fontSize: 13,
    color: colors.gray,
    marginBottom: spacing.sm,
  },
  kitchenMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  kitchenMetaText: {
    fontSize: 13,
    color: colors.gray,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.gray,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.black,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray,
    marginTop: spacing.xs,
  },
  addressCard: {
    padding: spacing.md,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.black,
  },
  defaultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  addressText: {
    fontSize: 13,
    color: colors.gray,
    lineHeight: 18,
  },
  addressLandmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addressLandmarkText: {
    fontSize: 12,
    color: colors.gray,
    fontStyle: 'italic',
  },
  addressZone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs / 2,
  },
  addressZoneText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  actionsSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    marginBottom: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
    flex: 1,
    minWidth: '48%',
  },
  fullWidthButton: {
    width: '100%',
    marginTop: spacing.sm,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  successButton: {
    backgroundColor: colors.success,
  },
  warningButton: {
    backgroundColor: colors.warning,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  deleteButton: {
    backgroundColor: '#991b1b',
  },
  loadingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  noDataText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  subscriptionCard: {
    padding: spacing.md,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  subscriptionPlanName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    flex: 1,
  },
  subscriptionStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 4,
  },
  subscriptionStatusActive: {
    backgroundColor: '#dcfce7',
  },
  subscriptionStatusExpired: {
    backgroundColor: '#fecaca',
  },
  subscriptionStatusCancelled: {
    backgroundColor: '#e5e7eb',
  },
  subscriptionStatusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subscriptionMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  subscriptionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  subscriptionMetaText: {
    fontSize: 13,
    color: colors.gray,
  },
  subscriptionDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subscriptionDateText: {
    fontSize: 12,
    color: colors.gray,
  },
  subscriptionAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionAmountLabel: {
    fontSize: 13,
    color: colors.gray,
  },
  subscriptionAmountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
  },
  orderCard: {
    padding: spacing.md,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.black,
  },
  orderStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  orderStatusDelivered: {
    backgroundColor: '#dcfce7',
  },
  orderStatusCancelled: {
    backgroundColor: '#fecaca',
  },
  orderStatusRejected: {
    backgroundColor: '#fed7aa',
  },
  orderStatusFailed: {
    backgroundColor: '#fecaca',
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.black,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  orderMetaText: {
    fontSize: 13,
    color: colors.gray,
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  orderDate: {
    fontSize: 12,
    color: colors.gray,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
  },
});
