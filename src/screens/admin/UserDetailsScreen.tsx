import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,

} from 'react-native';
import { useAlert } from '../../hooks/useAlert';
import { SafeAreaScreen } from '../../components/common/SafeAreaScreen';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  User,
  UserDetailTab,
  UserStatus,
  SubscriptionSummary,
  OrderSummary,
  SupportTicketSummary,
  FeedbackSummary,
} from '../../types/user';
import { useUsersStore } from '../../stores/useUsersStore';
import { Chip } from '../../components/common';
import { colors, spacing } from '../../theme';
import { GradientBox } from '../../components/common/GradientBox';

interface UserDetailsScreenProps {
  userId: string;
  onBack: () => void;
}

const tabs: { key: UserDetailTab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'person' },
  { key: 'subscriptions', label: 'Subscriptions', icon: 'card-membership' },
  { key: 'orders', label: 'Orders', icon: 'shopping-bag' },
  { key: 'support', label: 'Support', icon: 'support-agent' },
];

const getStatusConfig = (status: UserStatus) => {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', color: colors.statusActive, bgColor: colors.successLight };
    case 'BLOCKED':
      return { label: 'Blocked', color: colors.statusBlocked, bgColor: colors.errorLight };
    case 'PENDING':
      return { label: 'Pending', color: colors.statusPending, bgColor: colors.warningLight };
    case 'UNVERIFIED':
      return { label: 'Unverified', color: colors.statusUnverified, bgColor: colors.background };
    default:
      return { label: 'Unknown', color: colors.textMuted, bgColor: colors.background };
  }
};

const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'customer':
      return 'Customer';
    case 'driver':
      return 'Delivery Partner';
    case 'kitchen_staff':
      return 'Kitchen Staff';
    case 'kitchen_admin':
      return 'Admin';
    default:
      return 'Unknown';
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

const getInitials = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const UserDetailsScreen: React.FC<UserDetailsScreenProps> = ({
  userId,
  onBack,
}) => {
  const { selectedUser, selectUser, clearSelectedUser, updateUserStatus, isLoading } = useUsersStore();
  const [activeTab, setActiveTab] = useState<UserDetailTab>('overview');
  const { showConfirm, showInfo } = useAlert();

  useEffect(() => {
    selectUser(userId);
    return () => clearSelectedUser();
  }, [userId, selectUser, clearSelectedUser]);

  const handleStatusChange = (newStatus: UserStatus) => {
    showConfirm(
      'Change Status',
      `Are you sure you want to change user status to ${newStatus}?`,
      () => updateUserStatus(userId, newStatus)
    );
  };

  if (isLoading || !selectedUser) {
    return (
      <SafeAreaScreen style={{ flex: 1 }} topBackgroundColor={colors.primary} bottomBackgroundColor={colors.background}>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaScreen>
    );
  }

  const user = selectedUser;
  const statusConfig = getStatusConfig(user.status);

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Basic Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="phone" label="Phone" value={user.phone} />
          <InfoRow icon="email" label="Email" value={user.email || 'Not provided'} />
          <InfoRow icon="badge" label="Role" value={getRoleLabel(user.role)} />
          <InfoRow icon="calendar-today" label="Joined" value={formatDate(user.createdAt)} />
          <InfoRow icon="access-time" label="Last Active" value={formatDate(user.lastActiveAt || user.updatedAt)} />
        </View>
      </View>

      {/* Statistics (for customers) */}
      {user.role === 'customer' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <StatBox label="Total Orders" value={user.totalOrders?.toString() || '0'} icon="shopping-bag" />
            <StatBox label="Total Spent" value={formatCurrency(user.totalSpent || 0)} icon="payments" />
            <StatBox label="Avg. Rating" value={user.averageRating?.toFixed(1) || '-'} icon="star" />
            <StatBox label="Active Subs" value={user.subscriptions?.filter(s => s.status === 'ACTIVE').length.toString() || '0'} icon="card-membership" />
          </View>
        </View>
      )}

      {/* Addresses */}
      {user.addresses && user.addresses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Addresses</Text>
          {user.addresses.map((address) => (
            <View key={address.id} style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <View style={styles.addressLabelContainer}>
                  <MaterialIcons name="location-on" size={16} color={colors.primary} />
                  <Text style={styles.addressLabel}>{address.label}</Text>
                </View>
                {address.isDefault && (
                  <Chip label="Default" size="small" />
                )}
              </View>
              <Text style={styles.addressText}>{address.street}</Text>
              <Text style={styles.addressText}>{address.city}, {address.state} {address.zipCode}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          {user.status !== 'ACTIVE' && (
            <ActionButton
              icon="check-circle"
              label="Activate"
              color={colors.statusActive}
              onPress={() => handleStatusChange('ACTIVE')}
            />
          )}
          {user.status !== 'BLOCKED' && (
            <ActionButton
              icon="block"
              label="Block"
              color={colors.statusBlocked}
              onPress={() => handleStatusChange('BLOCKED')}
            />
          )}
          <ActionButton
            icon="message"
            label="Message"
            color={colors.info}
            onPress={() => showInfo('Coming Soon', 'Messaging feature is coming soon')}
          />
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const renderSubscriptionsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {user.subscriptions && user.subscriptions.length > 0 ? (
        user.subscriptions.map((sub) => (
          <SubscriptionCard key={sub.id} subscription={sub} />
        ))
      ) : (
        <EmptyState icon="card-membership" message="No subscriptions found" />
      )}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const renderOrdersTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {user.orders && user.orders.length > 0 ? (
        user.orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))
      ) : (
        <EmptyState icon="shopping-bag" message="No orders found" />
      )}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const renderSupportTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Support Tickets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support Tickets</Text>
        {user.supportTickets && user.supportTickets.length > 0 ? (
          user.supportTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))
        ) : (
          <EmptyState icon="support-agent" message="No support tickets" />
        )}
      </View>

      {/* Feedback */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feedback & Ratings</Text>
        {user.feedback && user.feedback.length > 0 ? (
          user.feedback.map((fb) => (
            <FeedbackCard key={fb.id} feedback={fb} />
          ))
        ) : (
          <EmptyState icon="rate-review" message="No feedback given" />
        )}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'subscriptions':
        return renderSubscriptionsTab();
      case 'orders':
        return renderOrdersTab();
      case 'support':
        return renderSupportTab();
      default:
        return null;
    }
  };

  return (
    <SafeAreaScreen style={{ flex: 1 }} topBackgroundColor={colors.primary} bottomBackgroundColor={colors.background}>
      {/* Header */}
      <GradientBox style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <TouchableOpacity style={styles.moreButton}>
          <MaterialIcons name="more-vert" size={24} color={colors.white} />
        </TouchableOpacity>
      </GradientBox>
      <View style={{ flex: 1, backgroundColor: colors.background }}>

        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarTextLarge}>{getInitials(user.fullName)}</Text>
          </View>
          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userRole}>{getRoleLabel(user.role)}</Text>
          <Chip
            label={statusConfig.label}
            color={statusConfig.color}
            backgroundColor={statusConfig.bgColor}
            size="medium"
            style={styles.statusChip}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <MaterialIcons
                  name={tab.icon}
                  size={18}
                  color={activeTab === tab.key ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.key && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </View>
    </SafeAreaScreen>
  );
};

// Helper Components
const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <MaterialIcons name={icon} size={18} color={colors.textMuted} />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const StatBox: React.FC<{ label: string; value: string; icon: string }> = ({ label, value, icon }) => (
  <View style={styles.statBox}>
    <MaterialIcons name={icon} size={20} color={colors.primary} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ActionButton: React.FC<{ icon: string; label: string; color: string; onPress: () => void }> = ({
  icon,
  label,
  color,
  onPress,
}) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <View style={[styles.actionIcon, { backgroundColor: color + '20' }]}>
      <MaterialIcons name={icon} size={20} color={color} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const EmptyState: React.FC<{ icon: string; message: string }> = ({ icon, message }) => (
  <View style={styles.emptyState}>
    <MaterialIcons name={icon} size={40} color={colors.textMuted} />
    <Text style={styles.emptyStateText}>{message}</Text>
  </View>
);

const SubscriptionCard: React.FC<{ subscription: SubscriptionSummary }> = ({ subscription }) => {
  const getStatusColor = () => {
    switch (subscription.status) {
      case 'ACTIVE':
        return colors.statusActive;
      case 'PAUSED':
        return colors.statusPending;
      case 'CANCELLED':
      case 'EXPIRED':
        return colors.statusBlocked;
      default:
        return colors.textMuted;
    }
  };

  return (
    <View style={styles.cardItem}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{subscription.planName}</Text>
        <Chip
          label={subscription.status}
          color={getStatusColor()}
          backgroundColor={getStatusColor() + '20'}
          size="small"
        />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardDetail}>Meal: {subscription.mealType}</Text>
        <Text style={styles.cardDetail}>
          Progress: {subscription.deliveredMeals}/{subscription.totalMeals} meals
        </Text>
        <Text style={styles.cardDetail}>{subscription.daysRemaining} days remaining</Text>
        <Text style={styles.cardAmount}>{formatCurrency(subscription.amount)}</Text>
      </View>
    </View>
  );
};

const OrderCard: React.FC<{ order: OrderSummary }> = ({ order }) => {
  const getStatusColor = () => {
    switch (order.status) {
      case 'DELIVERED':
        return colors.statusActive;
      case 'PREPARING':
      case 'PACKED':
        return colors.statusPending;
      case 'OUT_FOR_DELIVERY':
        return colors.info;
      case 'CANCELLED':
        return colors.statusBlocked;
      default:
        return colors.textMuted;
    }
  };

  return (
    <View style={styles.cardItem}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{order.orderNumber}</Text>
        <Chip
          label={order.status.replace(/_/g, ' ')}
          color={getStatusColor()}
          backgroundColor={getStatusColor() + '20'}
          size="small"
        />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardDetail}>{formatDate(order.date)} • {order.mealType}</Text>
        {order.items && (
          <Text style={styles.cardDetail} numberOfLines={1}>
            {order.items.join(', ')}
          </Text>
        )}
        <Text style={styles.cardAmount}>{formatCurrency(order.amount)}</Text>
      </View>
    </View>
  );
};

const TicketCard: React.FC<{ ticket: SupportTicketSummary }> = ({ ticket }) => {
  const getStatusColor = () => {
    switch (ticket.status) {
      case 'RESOLVED':
      case 'CLOSED':
        return colors.statusActive;
      case 'OPEN':
        return colors.statusBlocked;
      case 'IN_PROGRESS':
        return colors.statusPending;
      default:
        return colors.textMuted;
    }
  };

  return (
    <View style={styles.cardItem}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{ticket.ticketNumber}</Text>
        <Chip
          label={ticket.status.replace(/_/g, ' ')}
          color={getStatusColor()}
          backgroundColor={getStatusColor() + '20'}
          size="small"
        />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardSubject}>{ticket.subject}</Text>
        <Text style={styles.cardDetail}>{ticket.category} • {formatDate(ticket.createdAt)}</Text>
      </View>
    </View>
  );
};

const FeedbackCard: React.FC<{ feedback: FeedbackSummary }> = ({ feedback }) => (
  <View style={styles.cardItem}>
    <View style={styles.cardHeader}>
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialIcons
            key={star}
            name={star <= feedback.rating ? 'star' : 'star-border'}
            size={16}
            color={star <= feedback.rating ? colors.warning : colors.textMuted}
          />
        ))}
      </View>
      <Text style={styles.feedbackDate}>{formatDate(feedback.date)}</Text>
    </View>
    <Text style={styles.feedbackComment}>{feedback.comment}</Text>
    {feedback.response && (
      <View style={styles.responseContainer}>
        <Text style={styles.responseLabel}>Response:</Text>
        <Text style={styles.responseText}>{feedback.response}</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    flex: 1,
    marginLeft: spacing.md,
  },
  moreButton: {
    padding: spacing.xs,
  },
  profileCard: {
    backgroundColor: colors.card,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarTextLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  userRole: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusChip: {
    marginTop: spacing.md,
  },
  tabsContainer: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabContent: {
    flex: 1,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: spacing.sm,
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  statBox: {
    width: '50%',
    padding: spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  addressCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addressLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  addressText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    paddingVertical: spacing.md,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  cardItem: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardBody: {},
  cardSubject: {
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  feedbackDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  feedbackComment: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  responseContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  responseLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  responseText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  bottomPadding: {
    height: spacing.xxxl,
  },
});

UserDetailsScreen.displayName = 'UserDetailsScreen';

export default UserDetailsScreen;
