import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/colors';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { Header } from '../../../components/common/Header';
import { kitchenStaffService } from '../../../services/kitchen-staff.service';
import { useInAppNotifications } from '../../../context/InAppNotificationContext';
import { useNavigation } from '../../../context/NavigationContext';

interface KitchenDashboardScreenProps {
  onMenuPress: () => void;
}

export const KitchenDashboardScreen: React.FC<KitchenDashboardScreenProps> = ({
  onMenuPress,
}) => {
  const { unreadCount } = useInAppNotifications();
  const { navigate } = useNavigation();

  const handleNotificationPress = () => {
    navigate('Notifications');
  };

  return (
    <SafeAreaScreen
      topBackgroundColor={colors.primary}
      bottomBackgroundColor={colors.background}
    >
      <Header
        title="Kitchen Dashboard"
        onMenuPress={onMenuPress}
        rightComponent={
          <TouchableOpacity onPress={handleNotificationPress} style={styles.notificationButton}>
            <MaterialIcons name="notifications-none" size={24} color="#ffffff" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <View style={styles.container}>
        <OverviewTab />
      </View>
    </SafeAreaScreen>
  );
};

// Overview Tab Component
const OverviewTab: React.FC = () => {
  const { navigate } = useNavigation();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['kitchenDashboard'],
    queryFn: () => kitchenStaffService.getDashboardStats(),
    refetchInterval: 60000, // Refresh every minute
  });

  const stats = data?.data?.todayStats;
  const batchStats = data?.data?.batchStats;
  const menuStats = data?.data?.menuStats;
  const recentOrders = data?.data?.recentOrders || [];

  if (isLoading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.tabScrollView}
      contentContainerStyle={styles.tabScrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome back! 👋</Text>
        <Text style={styles.welcomeSubtitle}>
          {data?.data?.kitchen?.name || 'Your Kitchen'}
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Today's Orders"
          value={stats?.ordersCount || 0}
          icon="receipt"
          color={colors.info}
          onPress={() => navigate('Orders')}
        />
        <StatCard
          label="Revenue"
          value={`₹${stats?.ordersRevenue || 0}`}
          icon="cash-multiple"
          color={colors.success}
          onPress={() => navigate('Orders')}
        />
        <StatCard
          label="Awaiting Accept"
          value={stats?.pendingAcceptanceOrders || 0}
          icon="timer-sand"
          color="#D97706"
          onPress={() => navigate('Orders')}
        />
        <StatCard
          label="Pending"
          value={stats?.pendingOrders || 0}
          icon="progress-clock"
          color={colors.warning}
          onPress={() => navigate('Orders')}
        />
        <StatCard
          label="Completed"
          value={stats?.completedOrders || 0}
          icon="check-decagram"
          color={colors.success}
          onPress={() => navigate('Orders')}
        />
      </View>

      {/* Meal Window Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meal Windows</Text>
        <View style={styles.mealWindowsGrid}>
          <MealWindowCard
            title="Lunch"
            orders={stats?.lunchOrders || 0}
            revenue={stats?.lunchRevenue || 0}
            icon="weather-sunny"
            color="#F59E0B"
          />
          <MealWindowCard
            title="Dinner"
            orders={stats?.dinnerOrders || 0}
            revenue={stats?.dinnerRevenue || 0}
            icon="weather-night"
            color="#6366F1"
          />
        </View>
      </View>

      {/* Batch Status */}
      {batchStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Batch Status</Text>
          <View style={styles.batchStatsCard}>
            <BatchStatRow
              label="Collecting"
              value={batchStats.collectingBatches}
              color={colors.warning}
            />
            <BatchStatRow
              label="Ready"
              value={batchStats.readyBatches}
              color={colors.info}
            />
            <BatchStatRow
              label="Dispatched"
              value={batchStats.dispatchedBatches}
              color={colors.success}
            />
            <BatchStatRow
              label="Completed"
              value={batchStats.completedBatches}
              color={colors.gray600}
            />
          </View>
        </View>
      )}

      {/* Menu Stats */}
      {menuStats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menu Overview</Text>
          <View style={styles.menuStatsCard}>
            <View style={styles.menuStatItem}>
              <View style={[styles.menuIconBubble, { backgroundColor: colors.primary + '15' }]}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={colors.primary} />
              </View>
              <Text style={styles.menuStatValue}>{menuStats.totalMenuItems}</Text>
              <Text style={styles.menuStatLabel}>Total Items</Text>
            </View>
            <View style={styles.menuStatItem}>
              <View style={[styles.menuIconBubble, { backgroundColor: colors.success + '15' }]}>
                <MaterialCommunityIcons name="shield-check" size={24} color={colors.success} />
              </View>
              <Text style={styles.menuStatValue}>{menuStats.activeMenuItems}</Text>
              <Text style={styles.menuStatLabel}>Active</Text>
            </View>
            <View style={styles.menuStatItem}>
              <View style={[styles.menuIconBubble, { backgroundColor: colors.gray400 + '20' }]}>
                <MaterialCommunityIcons name="close-circle" size={24} color={colors.gray400} />
              </View>
              <Text style={styles.menuStatValue}>{menuStats.unavailableItems}</Text>
              <Text style={styles.menuStatLabel}>Unavailable</Text>
            </View>
          </View>
        </View>
      )}

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {recentOrders.slice(0, 5).map((order) => (
            <View key={order._id} style={styles.recentOrderCard}>
              <View style={styles.recentOrderHeader}>
                <Text style={styles.recentOrderNumber}>{order.orderNumber}</Text>
                <Text style={styles.recentOrderAmount}>₹{order.totalAmount}</Text>
              </View>
              <View style={styles.recentOrderFooter}>
                <Text style={styles.recentOrderStatus}>{order.status}</Text>
                <Text style={styles.recentOrderTime}>
                  {new Date(order.placedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

// Helper Components

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: string;
  color: string;
  onPress?: () => void;
}> = ({ label, value, icon, color, onPress }) => {
  const content = (
    <>
      <View style={[styles.statIconBubble, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={styles.statCard}>{content}</View>;
};

const MealWindowCard: React.FC<{
  title: string;
  orders: number;
  revenue: number;
  icon: string;
  color: string;
}> = ({ title, orders, revenue, icon, color }) => (
  <View style={styles.mealWindowCard}>
    <View style={[styles.mealIconBubble, { backgroundColor: color + '15' }]}>
      <MaterialCommunityIcons name={icon} size={26} color={color} />
    </View>
    <Text style={styles.mealWindowTitle}>{title}</Text>
    <Text style={styles.mealWindowOrders}>{orders} orders</Text>
    <Text style={[styles.mealWindowRevenue, { color }]}>₹{revenue}</Text>
  </View>
);

const BatchStatRow: React.FC<{
  label: string;
  value: number;
  color: string;
}> = ({ label, value, color }) => (
  <View style={styles.batchStatRow}>
    <View style={[styles.batchStatDot, { backgroundColor: color }]} />
    <Text style={styles.batchStatLabel}>{label}</Text>
    <Text style={styles.batchStatValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.gray600,
  },
  tabScrollView: {
    flex: 1,
  },
  tabScrollContent: {
    padding: 16,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.gray900,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: colors.gray600,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F0EE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray900,
    marginTop: 8,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray600,
    marginTop: 4,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 12,
  },
  mealWindowsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  mealWindowCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F0EE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  mealIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  mealWindowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    marginTop: 10,
    letterSpacing: -0.2,
  },
  mealWindowOrders: {
    fontSize: 13,
    color: colors.gray600,
    marginTop: 4,
    fontWeight: '500',
  },
  mealWindowRevenue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.success,
    marginTop: 4,
  },
  batchStatsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F0EE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  batchStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  batchStatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  batchStatLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.gray700,
  },
  batchStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
  },
  menuStatsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#F1F0EE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuStatItem: {
    alignItems: 'center',
  },
  menuIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  menuStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
    marginTop: 8,
    letterSpacing: -0.3,
  },
  menuStatLabel: {
    fontSize: 12,
    color: colors.gray600,
    marginTop: 4,
    fontWeight: '500',
  },
  recentOrderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F0EE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  recentOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recentOrderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray900,
  },
  recentOrderAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  recentOrderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recentOrderStatus: {
    fontSize: 12,
    color: colors.gray600,
  },
  recentOrderTime: {
    fontSize: 12,
    color: colors.gray500,
  },
});
