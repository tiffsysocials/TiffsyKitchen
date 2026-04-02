import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { PieChart, BarChart, ProgressChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';
import adminDashboardService from '../../services/admin-dashboard.service';
import { Card } from '../../components/common/Card';
import { GradientBox } from '../../components/common/GradientBox';
import { format } from 'date-fns';
import { SafeAreaScreen } from '../../components/common/SafeAreaScreen';

const screenWidth = Dimensions.get('window').width;

interface EnhancedDashboardScreenProps {
  onMenuPress: () => void;
  onNavigate: (screen: string) => void;
}

const EnhancedDashboardScreen: React.FC<EnhancedDashboardScreenProps> = ({
  onMenuPress,
  onNavigate,
}) => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'orders' | 'delivery' | 'vouchers' | 'refunds'>('overview');

  // Fetch all dashboard data
  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => adminDashboardService.getDashboard(),
    staleTime: 30000,
  });

  const { data: orderStats, isLoading: orderStatsLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['orderStats'],
    queryFn: () => adminDashboardService.getOrderStats(),
    staleTime: 60000,
  });

  const { data: deliveryStats, isLoading: deliveryStatsLoading, refetch: refetchDelivery } = useQuery({
    queryKey: ['deliveryStats'],
    queryFn: () => adminDashboardService.getDeliveryStats(),
    staleTime: 60000,
  });

  const { data: voucherStats, isLoading: voucherStatsLoading, refetch: refetchVouchers } = useQuery({
    queryKey: ['voucherStats'],
    queryFn: () => adminDashboardService.getVoucherStats(),
    staleTime: 60000,
  });

  const { data: refundStats, isLoading: refundStatsLoading, refetch: refetchRefunds } = useQuery({
    queryKey: ['refundStats'],
    queryFn: () => adminDashboardService.getRefundStats(),
    staleTime: 60000,
  });

  const handleRefresh = () => {
    refetchDashboard();
    refetchOrders();
    refetchDelivery();
    refetchVouchers();
    refetchRefunds();
  };

  const isRefreshing = dashboardLoading || orderStatsLoading || deliveryStatsLoading || voucherStatsLoading || refundStatsLoading;

  // Render Overview Tab
  const renderOverview = () => (
    <View className="p-4">
      {/* Main KPIs */}
      <Text className="text-xl font-bold text-gray-800 mb-4">Overview</Text>
      <View className="flex-row flex-wrap -mx-2 mb-4">
        <View className="w-1/2 px-2 mb-4">
          <Card className="p-4">
            <Text className="text-2xl font-bold text-gray-800">
              {dashboard?.overview.totalOrders.toLocaleString()}
            </Text>
            <Text className="text-sm text-gray-600 mt-1">Total Orders</Text>
          </Card>
        </View>
        <View className="w-1/2 px-2 mb-4">
          <Card className="p-4">
            <Text className="text-2xl font-bold text-gray-800">
              ₹{dashboard?.overview.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text className="text-sm text-gray-600 mt-1">Total Revenue</Text>
          </Card>
        </View>
        <View className="w-1/2 px-2 mb-4">
          <Card className="p-4">
            <Text className="text-2xl font-bold text-gray-800">
              {dashboard?.overview.activeCustomers.toLocaleString()}
            </Text>
            <Text className="text-sm text-gray-600 mt-1">Active Customers</Text>
          </Card>
        </View>
        <View className="w-1/2 px-2 mb-4">
          <Card className="p-4">
            <Text className="text-2xl font-bold text-gray-800">
              {dashboard?.overview.activeKitchens}
            </Text>
            <Text className="text-sm text-gray-600 mt-1">Active Kitchens</Text>
          </Card>
        </View>
      </View>

      {/* Today's Stats */}
      <Text className="text-lg font-semibold text-gray-800 mb-3">Today's Performance</Text>
      <View className="flex-row flex-wrap -mx-2 mb-4">
        <View className="w-1/3 px-2 mb-4">
          <Card className="p-3">
            <Text className="text-xl font-bold text-blue-600">
              {dashboard?.today.orders}
            </Text>
            <Text className="text-xs text-gray-600 mt-1">Orders</Text>
          </Card>
        </View>
        <View className="w-1/3 px-2 mb-4">
          <Card className="p-3">
            <Text className="text-xl font-bold text-green-600">
              ₹{dashboard?.today.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text className="text-xs text-gray-600 mt-1">Revenue</Text>
          </Card>
        </View>
        <View className="w-1/3 px-2 mb-4">
          <Card className="p-3">
            <Text className="text-xl font-bold text-purple-600">
              {dashboard?.today.newCustomers}
            </Text>
            <Text className="text-xs text-gray-600 mt-1">New Customers</Text>
          </Card>
        </View>
      </View>

      {/* Pending Actions */}
      <Text className="text-lg font-semibold text-gray-800 mb-3">Pending Actions</Text>
      <Card className="p-4 mb-4">
        <TouchableOpacity onPress={() => onNavigate('Orders')} className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Icon name="pending-actions" size={24} color="#FE8733" />
            <Text className="text-base text-gray-800 ml-3">Pending Orders</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-lg font-semibold text-[#FE8733] mr-2">
              {dashboard?.pendingActions.pendingOrders}
            </Text>
            <Icon name="chevron-right" size={20} color="#9ca3af" />
          </View>
        </TouchableOpacity>
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Icon name="money-off" size={24} color="#ef4444" />
            <Text className="text-base text-gray-800 ml-3">Pending Refunds</Text>
          </View>
          <Text className="text-lg font-semibold text-red-600">
            {dashboard?.pendingActions.pendingRefunds}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onNavigate('Kitchens')} className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Icon name="restaurant" size={24} color="#3b82f6" />
            <Text className="text-base text-gray-800 ml-3">Kitchen Approvals</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-lg font-semibold text-blue-600 mr-2">
              {dashboard?.pendingActions.pendingKitchenApprovals}
            </Text>
            <Icon name="chevron-right" size={20} color="#9ca3af" />
          </View>
        </TouchableOpacity>
      </Card>

      {/* Recent Activity */}
      <Text className="text-lg font-semibold text-gray-800 mb-3">Recent Activity</Text>
      <Card className="p-3">
        {dashboard?.recentActivity && dashboard.recentActivity.length > 0 ? (
          dashboard.recentActivity.slice(0, 5).map((activity, index) => (
            <View
              key={activity._id}
              className={`py-3 ${index !== dashboard.recentActivity.length - 1 && index !== 4 ? 'border-b border-gray-100' : ''}`}
            >
              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center mr-3">
                  <Icon name="history" size={16} color="#FE8733" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800">
                    {activity.action} {activity.entityType}
                  </Text>
                  <Text className="text-xs text-gray-600 mt-1">
                    by {activity.userId.name} • {format(new Date(activity.createdAt), 'MMM dd, HH:mm')}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text className="text-center text-gray-500 py-4">No recent activity</Text>
        )}
      </Card>
    </View>
  );

  // Render Orders Tab
  const renderOrders = () => {
    if (!orderStats) return null;

    const statusChartData = Object.entries(orderStats.byStatus).slice(0, 6).map(([key, value], index) => ({
      name: key.replace(/_/g, ' ').substring(0, 10),
      population: value,
      color: getStatusColor(key, index),
      legendFontColor: '#6b7280',
      legendFontSize: 10,
    }));

    const menuTypeData = {
      labels: ['Meal', 'On Demand'],
      datasets: [{
        data: [
          orderStats.byMenuType.MEAL_MENU || 0,
          orderStats.byMenuType.ON_DEMAND_MENU || 0,
        ],
      }],
    };

    return (
      <View className="p-4">
        <Text className="text-xl font-bold text-gray-800 mb-4">Order Analytics</Text>

        {/* Key Metrics */}
        <View className="flex-row flex-wrap -mx-2 mb-4">
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-4">
              <Text className="text-2xl font-bold text-gray-800">
                {orderStats.totalOrders.toLocaleString()}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">Total Orders</Text>
            </Card>
          </View>
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-4">
              <Text className="text-2xl font-bold text-gray-800">
                ₹{orderStats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">Revenue</Text>
            </Card>
          </View>
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-4">
              <Text className="text-2xl font-bold text-gray-800">
                ₹{orderStats.avgOrderValue.toFixed(2)}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">Avg Order Value</Text>
            </Card>
          </View>
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-4">
              <Text className="text-2xl font-bold text-gray-800">
                {orderStats.totalVouchersUsed.toLocaleString()}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">Vouchers Used</Text>
            </Card>
          </View>
        </View>

        {/* Status Pie Chart */}
        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Order Status Breakdown</Text>
          {statusChartData.length > 0 && (
            <PieChart
              data={statusChartData}
              width={screenWidth - 64}
              height={200}
              chartConfig={{
                color: (opacity = 1) => `rgba(245, 107, 76, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          )}
        </Card>

        {/* Menu Type Chart */}
        <Card className="p-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Orders by Menu Type</Text>
          {menuTypeData.datasets[0].data.length > 0 && (
            <BarChart
              data={menuTypeData}
              width={screenWidth - 64}
              height={200}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(245, 107, 76, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
              }}
              showValuesOnTopOfBars
            />
          )}
        </Card>
      </View>
    );
  };

  // Render Delivery Tab
  const renderDelivery = () => {
    if (!deliveryStats) return null;

    const getSuccessRateColor = (rate: number): string => {
      if (rate >= 95) return 'bg-green-100 text-green-800';
      if (rate >= 85) return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-800';
    };

    return (
      <View className="p-4">
        <Text className="text-xl font-bold text-gray-800 mb-4">Delivery Analytics</Text>

        {/* Key Metrics */}
        <View className="flex-row flex-wrap -mx-2 mb-4">
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-4">
              <Text className="text-2xl font-bold text-gray-800">
                {deliveryStats.totalBatches}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">Total Batches</Text>
            </Card>
          </View>
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-4">
              <Text className="text-2xl font-bold text-gray-800">
                {deliveryStats.totalDeliveries.toLocaleString()}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">Deliveries</Text>
            </Card>
          </View>
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-4">
              <Text className={`text-2xl font-bold ${deliveryStats.successRate >= 95 ? 'text-green-600' : deliveryStats.successRate >= 85 ? 'text-yellow-600' : 'text-red-600'}`}>
                {deliveryStats.successRate}%
              </Text>
              <Text className="text-sm text-gray-600 mt-1">Success Rate</Text>
            </Card>
          </View>
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-4">
              <Text className="text-2xl font-bold text-red-600">
                {deliveryStats.totalFailed}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">Failed</Text>
            </Card>
          </View>
        </View>

        {/* Zone Performance */}
        <Card className="p-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Zone-wise Performance</Text>
          <View className="flex-row pb-2 border-b border-gray-200 mb-2">
            <Text className="flex-1 text-xs font-semibold text-gray-700">Zone</Text>
            <Text className="w-20 text-xs font-semibold text-gray-700 text-right">Deliveries</Text>
            <Text className="w-20 text-xs font-semibold text-gray-700 text-right">Success</Text>
          </View>
          {deliveryStats.byZone.map((zone, index) => (
            <View
              key={zone._id}
              className={`flex-row py-2 ${index !== deliveryStats.byZone.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <Text className="flex-1 text-sm text-gray-800">{zone.zone}</Text>
              <Text className="w-20 text-sm text-gray-800 text-right">{zone.deliveries}</Text>
              <View className="w-20 items-end">
                <View className={`px-2 py-0.5 rounded ${getSuccessRateColor(zone.successRate)}`}>
                  <Text className="text-xs font-medium">{zone.successRate}%</Text>
                </View>
              </View>
            </View>
          ))}
        </Card>
      </View>
    );
  };

  // Render Vouchers Tab
  const renderVouchers = () => {
    if (!voucherStats) return null;

    const redemptionRate = parseFloat(voucherStats.redemptionRate) / 100;
    const expiryRate = parseFloat(voucherStats.expiryRate) / 100;

    const rateData = {
      labels: ['Redemption', 'Expiry'],
      data: [redemptionRate, expiryRate],
    };

    const mealWindowData = {
      labels: ['Lunch', 'Dinner'],
      datasets: [{
        data: [
          voucherStats.byMealWindow.lunch.redeemed,
          voucherStats.byMealWindow.dinner.redeemed,
        ],
      }],
    };

    return (
      <View className="p-4">
        <Text className="text-xl font-bold text-gray-800 mb-4">Voucher Analytics</Text>

        {/* Key Metrics */}
        <View className="flex-row flex-wrap -mx-2 mb-4">
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-3">
              <Text className="text-xl font-bold text-gray-800">{voucherStats.totalIssued.toLocaleString()}</Text>
              <Text className="text-xs text-gray-600 mt-1">Issued</Text>
            </Card>
          </View>
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-3">
              <Text className="text-xl font-bold text-green-600">{voucherStats.totalRedeemed.toLocaleString()}</Text>
              <Text className="text-xs text-gray-600 mt-1">Redeemed</Text>
            </Card>
          </View>
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-3">
              <Text className="text-xl font-bold text-red-600">{voucherStats.totalExpired.toLocaleString()}</Text>
              <Text className="text-xs text-gray-600 mt-1">Expired</Text>
            </Card>
          </View>
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-3">
              <Text className="text-xl font-bold text-blue-600">{voucherStats.totalAvailable.toLocaleString()}</Text>
              <Text className="text-xs text-gray-600 mt-1">Available</Text>
            </Card>
          </View>
        </View>

        {/* Rates */}
        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Performance Rates</Text>
          <ProgressChart
            data={rateData}
            width={screenWidth - 64}
            height={180}
            strokeWidth={12}
            radius={28}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              color: (opacity = 1, index) => {
                if (index === 0) return `rgba(34, 197, 94, ${opacity})`;
                return `rgba(239, 68, 68, ${opacity})`;
              },
              labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
            }}
            hideLegend={false}
          />
          <View className="mt-3 flex-row justify-around">
            <View className="items-center">
              <Text className="text-sm text-gray-600">Redemption</Text>
              <Text className="text-lg font-semibold text-green-600">{voucherStats.redemptionRate}%</Text>
            </View>
            <View className="items-center">
              <Text className="text-sm text-gray-600">Expiry</Text>
              <Text className="text-lg font-semibold text-red-600">{voucherStats.expiryRate}%</Text>
            </View>
          </View>
        </Card>

        {/* Meal Window */}
        <Card className="p-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Redemptions by Meal</Text>
          <BarChart
            data={mealWindowData}
            width={screenWidth - 64}
            height={180}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(245, 107, 76, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
            }}
            showValuesOnTopOfBars
          />
        </Card>
      </View>
    );
  };

  // Render Refunds Tab
  const renderRefunds = () => {
    if (!refundStats) return null;

    const getStatusColor = (status: string): string => {
      const colors: Record<string, string> = {
        COMPLETED: 'bg-green-100 text-green-800',
        PENDING: 'bg-yellow-100 text-yellow-800',
        PROCESSING: 'bg-blue-100 text-blue-800',
        FAILED: 'bg-red-100 text-red-800',
      };
      return colors[status] || 'bg-gray-100 text-gray-800';
    };

    return (
      <View className="p-4">
        <Text className="text-xl font-bold text-gray-800 mb-4">Refund Analytics</Text>

        {/* Key Metrics */}
        <View className="flex-row flex-wrap -mx-2 mb-4">
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-3">
              <Text className="text-xl font-bold text-gray-800">{refundStats.totalRefunds}</Text>
              <Text className="text-xs text-gray-600 mt-1">Total Refunds</Text>
            </Card>
          </View>
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-3">
              <Text className="text-xl font-bold text-gray-800">
                ₹{refundStats.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
              <Text className="text-xs text-gray-600 mt-1">Total Amount</Text>
            </Card>
          </View>
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-3">
              <Text className={`text-xl font-bold ${refundStats.successRate >= 95 ? 'text-green-600' : refundStats.successRate >= 85 ? 'text-yellow-600' : 'text-red-600'}`}>
                {refundStats.successRate}%
              </Text>
              <Text className="text-xs text-gray-600 mt-1">Success Rate</Text>
            </Card>
          </View>
          <View className="w-1/2 px-2 mb-4">
            <Card className="p-3">
              <Text className="text-xl font-bold text-gray-800">{refundStats.avgProcessingTimeHours}h</Text>
              <Text className="text-xs text-gray-600 mt-1">Avg Processing</Text>
            </Card>
          </View>
        </View>

        {/* Status Breakdown */}
        <Card className="p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Status Breakdown</Text>
          <View className="flex-row pb-2 border-b border-gray-200 mb-2">
            <Text className="flex-1 text-xs font-semibold text-gray-700">Status</Text>
            <Text className="w-16 text-xs font-semibold text-gray-700 text-right">Count</Text>
            <Text className="w-20 text-xs font-semibold text-gray-700 text-right">Amount</Text>
          </View>
          {Object.entries(refundStats.byStatus).map(([status, data]) => (
            <View key={status} className="flex-row py-2 border-b border-gray-100">
              <View className="flex-1">
                <View className={`self-start px-2 py-0.5 rounded ${getStatusColor(status)}`}>
                  <Text className="text-xs font-medium">{status}</Text>
                </View>
              </View>
              <Text className="w-16 text-sm text-gray-800 text-right">{data.count}</Text>
              <Text className="w-20 text-sm text-gray-800 text-right">
                ₹{Math.round(data.amount).toLocaleString()}
              </Text>
            </View>
          ))}
        </Card>

        {/* Top Reasons */}
        <Card className="p-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Top Refund Reasons</Text>
          {Object.entries(refundStats.byReason)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([reason, count]) => (
              <View key={reason} className="flex-row justify-between py-2 border-b border-gray-100">
                <Text className="flex-1 text-sm text-gray-700 pr-2">{reason.replace(/_/g, ' ')}</Text>
                <Text className="text-sm font-semibold text-gray-800">{count}</Text>
              </View>
            ))}
        </Card>
      </View>
    );
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'orders', label: 'Orders', icon: 'shopping-cart' },
    { key: 'delivery', label: 'Delivery', icon: 'local-shipping' },
    { key: 'vouchers', label: 'Vouchers', icon: 'confirmation-number' },
    { key: 'refunds', label: 'Refunds', icon: 'money-off' },
  ];

  if (dashboardLoading && !dashboard) {
    return (
      <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
        <View className="flex-1 justify-center items-center bg-gray-50">
          <ActivityIndicator size="large" color="#FE8733" />
          <Text className="text-gray-600 mt-4">Loading dashboard...</Text>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
      {/* Header */}
      <GradientBox style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={onMenuPress} className="p-1">
          <Icon name="menu" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white flex-1 ml-3">Admin Dashboard</Text>
        <TouchableOpacity onPress={() => onNavigate('Reports')} className="p-1">
          <Icon name="insert-chart" size={24} color="#ffffff" />
        </TouchableOpacity>
      </GradientBox>

      {/* Tabs */}
      <View className="bg-white border-b border-gray-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2">
          <View className="flex-row py-2">
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setSelectedTab(tab.key as any)}
                className={`px-4 py-2 mr-2 rounded-lg flex-row items-center ${selectedTab === tab.key ? 'bg-[#FE8733]' : 'bg-gray-100'
                  }`}
              >
                <Icon
                  name={tab.icon}
                  size={16}
                  color={selectedTab === tab.key ? '#ffffff' : '#6b7280'}
                />
                <Text
                  className={`font-medium ml-1.5 ${selectedTab === tab.key ? 'text-white' : 'text-gray-700'
                    }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#FE8733']} />
        }
      >
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'orders' && renderOrders()}
        {selectedTab === 'delivery' && renderDelivery()}
        {selectedTab === 'vouchers' && renderVouchers()}
        {selectedTab === 'refunds' && renderRefunds()}
      </ScrollView>
    </SafeAreaScreen>
  );
};

const getStatusColor = (status: string, index: number): string => {
  const colors: Record<string, string> = {
    DELIVERED: '#22c55e',
    CANCELLED: '#ef4444',
    PLACED: '#3b82f6',
    ACCEPTED: '#8b5cf6',
    PREPARING: '#eab308',
    READY: '#06b6d4',
    PICKED_UP: '#10b981',
    OUT_FOR_DELIVERY: '#f59e0b',
    REJECTED: '#dc2626',
    FAILED: '#991b1b',
  };
  return colors[status] || `hsl(${index * 40}, 70%, 50%)`;
};

export default EnhancedDashboardScreen;
