import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,

} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAlert } from '../../hooks/useAlert';
import { SafeAreaScreen } from '../../components/common/SafeAreaScreen';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  KpiCard,
  OrderStatusFunnel,
  BusinessChart,
  RecentActivityList,
  SectionHeader,
} from '../../components/dashboard';
import DeliveryOverviewCard from '../../modules/delivery/components/DeliveryOverviewCard';
import adminDashboardService from '../../services/admin-dashboard.service';
import { DashboardData } from '../../types/api.types';
import { useInAppNotifications } from '../../context/InAppNotificationContext';

const DATE_RANGES = [
  { label: 'Today', getValue: () => { const d = new Date().toISOString().split('T')[0]; return { dateFrom: d, dateTo: d }; } },
  { label: '7 Days', getValue: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 7); return { dateFrom: from.toISOString().split('T')[0], dateTo: to.toISOString().split('T')[0] }; } },
  { label: '30 Days', getValue: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 30); return { dateFrom: from.toISOString().split('T')[0], dateTo: to.toISOString().split('T')[0] }; } },
  { label: 'All Time', getValue: () => ({}) },
];

interface DashboardScreenProps {
  onMenuPress: () => void;
  onNotificationPress?: () => void;
  onLogout?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onMenuPress,
  onNotificationPress,
  onLogout,

}) => {
  const [selectedRange, setSelectedRange] = useState(0);
  const { showInfo } = useAlert();

  // Compute date range from selected filter
  const dateRangeParams = DATE_RANGES[selectedRange].getValue();

  // Fetch real dashboard data from API
  const { data: apiData, isLoading: loading, isFetching, error: queryError, refetch } = useQuery<DashboardData>({
    queryKey: ['adminDashboard', dateRangeParams],
    queryFn: () => adminDashboardService.getDashboard(dateRangeParams),
    staleTime: 30000,
    refetchInterval: 60000,
  });
  const error = queryError ? (queryError as Error).message : null;

  // Get unread notification count
  const { unreadCount } = useInAppNotifications();

  const getOverviewTitle = (): string => {
    const labels: Record<number, string> = {
      0: "Today's Overview",
      1: 'Last 7 Days Overview',
      2: 'Last 30 Days Overview',
      3: 'All Time Overview',
    };
    return labels[selectedRange] || "Today's Overview";
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const handleOrderStatusPress = (status: string) => {
    showInfo('Order Status', `Viewing orders with status: ${status}`);
  };

  const handleActivityPress = (activityId: string) => {
    showInfo('Activity Details', `Viewing activity: ${activityId}`);
  };

  const handleViewAllActivity = () => {
    showInfo('Activity', 'Navigating to all activity');
  };

  // Transform API activity data to match component format
  const getTransformedActivity = () => {
    if (!apiData?.recentActivity) return [];

    return apiData.recentActivity.map((activity) => {
      const actionColors: Record<string, string> = {
        CREATE: '#22c55e',
        UPDATE: '#3b82f6',
        DELETE: '#ef4444',
        LOGIN: '#8b5cf6',
        LOGOUT: '#6b7280',
      };

      const actionIcons: Record<string, string> = {
        CREATE: 'add-circle',
        UPDATE: 'edit',
        DELETE: 'delete',
        LOGIN: 'login',
        LOGOUT: 'logout',
      };

      return {
        id: activity._id,
        type: 'system' as const,
        title: `${activity.action} ${activity.entityType}`,
        description: `by ${activity.userId?.name || 'Unknown'} (${activity.userId?.role || 'Unknown'})`,
        timestamp: new Date(activity.createdAt),
        icon: actionIcons[activity.action] || 'info',
        color: actionColors[activity.action] || '#6b7280',
      };
    });
  };

  // Map real API data to KPI metrics
  const getKpiMetrics = () => {
    if (!apiData) return [];

    return [
      {
        id: 'total-orders',
        label: 'Total Orders',
        value: apiData.overview.totalOrders,
        changePercent: 0,
        changeDirection: 'neutral' as const,
        icon: 'receipt-long',
        color: '#3b82f6',
      },
      {
        id: 'total-revenue',
        label: 'Total Revenue',
        value: apiData.overview.totalRevenue,
        changePercent: 0,
        changeDirection: 'neutral' as const,
        icon: 'currency-rupee',
        color: '#10b981',
        prefix: '₹',
      },
      {
        id: 'active-customers',
        label: 'Active Customers',
        value: apiData.overview.activeCustomers,
        changePercent: 0,
        changeDirection: 'neutral' as const,
        icon: 'people',
        color: '#8b5cf6',
      },
      {
        id: 'active-kitchens',
        label: 'Active Kitchens',
        value: apiData.overview.activeKitchens,
        changePercent: 0,
        changeDirection: 'neutral' as const,
        icon: 'restaurant',
        color: '#f59e0b',
      },
      {
        id: 'today-orders',
        label: selectedRange === 0 ? "Today's Orders" : "Period Orders",
        value: selectedRange === 0 ? apiData.today.orders : apiData.overview.totalOrders,
        changePercent: 0,
        changeDirection: 'neutral' as const,
        icon: 'shopping-cart',
        color: '#06b6d4',
      },
      /*
      {
        id: 'today-revenue',
        label: "Today's Revenue",
        value: apiData.today.revenue,
        changePercent: 0,
        changeDirection: 'neutral' as const,
        icon: 'currency-rupee',
        color: '#22c55e',
        prefix: '₹',
      },
      {
        id: 'new-customers',
        label: 'New Customers Today',
        value: apiData.today.newCustomers,
        changePercent: 0,
        changeDirection: 'neutral' as const,
        icon: 'person-add',
        color: '#f59e0b',
      },
      */
      {
        id: 'pending-orders',
        label: 'Pending Orders',
        value: apiData.pendingActions.pendingOrders,
        changePercent: 0,
        changeDirection: 'neutral' as const,
        icon: 'pending',
        color: '#ef4444',
      },
    ];
  };

  // Map real API order status counts to funnel items
  const getOrderStatus = () => {
    if (!apiData?.orderStatusCounts) return [];

    const sc = apiData.orderStatusCounts;
    const statusConfig = [
      { status: 'PLACED', label: 'Pending', icon: 'pending', color: '#f59e0b' },
      { status: 'ACCEPTED', label: 'Confirmed', icon: 'check-circle', color: '#3b82f6' },
      { status: 'PREPARING', label: 'Preparing', icon: 'restaurant-menu', color: '#8b5cf6' },
      { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: 'delivery-dining', color: '#06b6d4' },
      { status: 'DELIVERED', label: 'Delivered', icon: 'done-all', color: '#10b981' },
      { status: 'CANCELLED', label: 'Cancelled', icon: 'cancel', color: '#ef4444' },
    ];

    return statusConfig.map((item) => ({
      ...item,
      count: sc[item.status] || 0,
    }));
  };

  // Map real API chart data to chart format
  const getChartData = () => {
    const emptyChart = {
      title: 'Revenue & Orders',
      primaryLabel: 'Revenue (₹)',
      secondaryLabel: 'Orders',
      primaryColor: '#F56B4C',
      secondaryColor: '#3b82f6',
      points: [] as Array<{ date: string; label: string; value: number; secondaryValue: number }>,
    };

    if (!apiData?.chartData || apiData.chartData.length === 0) return emptyChart;

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const points = apiData.chartData.map((item) => {
      const d = new Date(item.date + 'T00:00:00');
      return {
        date: item.date,
        label: dayLabels[d.getDay()],
        value: Math.round(item.revenue),
        secondaryValue: item.orders,
      };
    });

    return { ...emptyChart, points };
  };

  const filteredKpis = getKpiMetrics();
  const filteredOrderStatus = getOrderStatus();
  const chartData = getChartData();

  return (
    <SafeAreaScreen style={{ flex: 1 }} topBackgroundColor="#F56B4C" bottomBackgroundColor="#f3f4f6">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <MaterialIcons name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tiffsy Kitchen</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={onNotificationPress}
            style={styles.notificationButton}
          >
            <MaterialIcons name="notifications-none" size={24} color="#ffffff" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </View>
        </View>
      </View>
      <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>

        {/* Loading State */}
        {loading && !apiData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F56B4C" />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : error ? (
          /* Error State */
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#ef4444" />
            <Text style={styles.errorTitle}>Unable to Load Dashboard</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <MaterialIcons name="refresh" size={20} color="#ffffff" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Dashboard Content */
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !!apiData}
                onRefresh={handleRefresh}
                colors={['#F56B4C']}
                tintColor="#F56B4C"
              />
            }
          >
            {/* Date Range Quick Filters */}
            <View style={styles.dateRangeRow}>
              {DATE_RANGES.map((range, index) => (
                <TouchableOpacity
                  key={range.label}
                  onPress={() => setSelectedRange(index)}
                  style={[styles.dateRangeChip, selectedRange === index && styles.dateRangeChipActive]}
                >
                  <Text style={[styles.dateRangeText, selectedRange === index && styles.dateRangeTextActive]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* KPI Cards */}
            <SectionHeader title={getOverviewTitle()} />
            <View style={styles.kpiGrid}>
              {filteredKpis.map((metric) => (
                <KpiCard key={metric.id} metric={metric} />
              ))}
            </View>

            {/* Order Status Funnel */}
            <OrderStatusFunnel
              items={filteredOrderStatus}
              onItemPress={handleOrderStatusPress}
              filterLabel={DATE_RANGES[selectedRange].label.toLowerCase()}
            />

            {/* Delivery Overview */}
            <SectionHeader title="Delivery Overview" />
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              <DeliveryOverviewCard dateFrom={(dateRangeParams as any).dateFrom} dateTo={(dateRangeParams as any).dateTo} />
            </View>

            {/* Business Chart */}
            <BusinessChart data={chartData} />

            {/* Recent Activity */}
            <RecentActivityList
              activities={getTransformedActivity()}
              onActivityPress={handleActivityPress}
              onViewAllPress={handleViewAllActivity}
              maxItems={5}
            />

            {/* Bottom Spacing - Use dynamic safe area padding */}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}

      </View>
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#F56B4C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginLeft: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    padding: 4,
    marginRight: 12,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F56B4C',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bottomSpacing: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F56B4C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dateRangeRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  dateRangeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateRangeChipActive: {
    backgroundColor: '#F56B4C',
    borderColor: '#F56B4C',
  },
  dateRangeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  dateRangeTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

DashboardScreen.displayName = 'DashboardScreen';

export default DashboardScreen;
