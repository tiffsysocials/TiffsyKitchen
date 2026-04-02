import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { GradientBox } from '../../../components/common/GradientBox';
import { deliveryService } from '../../../services/delivery.service';
import { Card } from '../../../components/common/Card';

interface Props {
  onMenuPress: () => void;
}

const DATE_RANGES = [
  { label: 'Today', getValue: () => { const d = new Date().toISOString().split('T')[0]; return { dateFrom: d, dateTo: d }; }},
  { label: 'Last 7 Days', getValue: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 7); return { dateFrom: from.toISOString().split('T')[0], dateTo: to.toISOString().split('T')[0] }; }},
  { label: 'Last 30 Days', getValue: () => { const to = new Date(); const from = new Date(); from.setDate(from.getDate() - 30); return { dateFrom: from.toISOString().split('T')[0], dateTo: to.toISOString().split('T')[0] }; }},
  { label: 'All Time', getValue: () => ({}) },
];

const DeliveryStatsScreen: React.FC<Props> = ({ onMenuPress }) => {
  const [selectedRange, setSelectedRange] = useState(0);
  const dateRange = DATE_RANGES[selectedRange].getValue();

  console.log('[DeliveryStats] Screen render, selectedRange:', selectedRange, 'dateRange:', dateRange);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['deliveryStats', selectedRange],
    queryFn: async () => {
      console.log('[DeliveryStats] queryFn executing with dateRange:', JSON.stringify(dateRange));
      try {
        const result = await deliveryService.getDeliveryStats(dateRange as any);
        console.log('[DeliveryStats] queryFn result:', JSON.stringify(result, null, 2));
        return result;
      } catch (err: any) {
        console.error('[DeliveryStats] queryFn ERROR:', err);
        console.error('[DeliveryStats] error message:', err?.message);
        console.error('[DeliveryStats] error response:', JSON.stringify(err?.response, null, 2));
        throw err;
      }
    },
  });

  console.log('[DeliveryStats] Query state:', { isLoading, isError, hasData: !!data });
  if (isError) {
    console.error('[DeliveryStats] Query error:', error);
  }
  if (data) {
    console.log('[DeliveryStats] data:', JSON.stringify(data, null, 2));
    console.log('[DeliveryStats] data?.data:', JSON.stringify(data?.data, null, 2));
  }

  const stats = data?.data;

  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
      {/* Header */}
      <GradientBox style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onMenuPress} className="mr-4">
          <Icon name="menu" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-semibold">Delivery Statistics</Text>
      </GradientBox>

      {/* Date Range Selector */}
      <View className="px-4 py-3 flex-row">
        {DATE_RANGES.map((range, index) => (
          <TouchableOpacity
            key={range.label}
            onPress={() => setSelectedRange(index)}
            className={`px-4 py-2 rounded-full mr-2 ${
              selectedRange === index ? 'bg-orange-500' : 'bg-white border border-gray-300'
            }`}
          >
            <Text className={`text-sm ${selectedRange === index ? 'text-white font-semibold' : 'text-gray-600'}`}>
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FE8733" />
        </View>
      ) : isError ? (
        <View className="flex-1 justify-center items-center p-4">
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text className="text-red-600 text-lg font-semibold mt-2">Failed to load stats</Text>
          <Text className="text-gray-500 text-sm mt-1 text-center">
            {(error as any)?.message || JSON.stringify(error)}
          </Text>
        </View>
      ) : stats ? (
        <ScrollView className="flex-1">
          {/* Summary Cards */}
          <View className="flex-row flex-wrap px-4">
            <View className="w-1/2 pr-2 mb-3">
              <Card className="p-4 items-center">
                <Icon name="layers" size={24} color="#3b82f6" />
                <Text className="text-2xl font-bold text-gray-800 mt-1">{stats.totalBatches || 0}</Text>
                <Text className="text-xs text-gray-500">Total Batches</Text>
              </Card>
            </View>
            <View className="w-1/2 pl-2 mb-3">
              <Card className="p-4 items-center">
                <Icon name="receipt-long" size={24} color="#8b5cf6" />
                <Text className="text-2xl font-bold text-gray-800 mt-1">{stats.totalOrders || 0}</Text>
                <Text className="text-xs text-gray-500">Total Orders</Text>
              </Card>
            </View>
            <View className="w-1/2 pr-2 mb-3">
              <Card className="p-4 items-center">
                <Icon name="check-circle" size={24} color="#16a34a" />
                <Text className="text-2xl font-bold text-green-600 mt-1">{stats.successRate || 0}%</Text>
                <Text className="text-xs text-gray-500">Success Rate</Text>
              </Card>
            </View>
            <View className="w-1/2 pl-2 mb-3">
              <Card className="p-4 items-center">
                <Icon name="cancel" size={24} color="#dc2626" />
                <Text className="text-2xl font-bold text-red-600 mt-1">{stats.totalFailed || 0}</Text>
                <Text className="text-xs text-gray-500">Failed</Text>
              </Card>
            </View>
          </View>

          {/* By Status */}
          {(stats.byStatus?.length ?? 0) > 0 && (
            <View className="px-4 pb-4">
              <Card className="p-4">
                <View className="flex-row items-center mb-4">
                  <Icon name="pie-chart" size={24} color="#FE8733" />
                  <Text className="text-lg font-semibold text-gray-800 ml-2">By Status</Text>
                </View>

                {stats.byStatus!.map((item: any, index: number) => {
                  const statusColors: Record<string, string> = {
                    COLLECTING: '#f59e0b',
                    READY_FOR_DISPATCH: '#3b82f6',
                    DISPATCHED: '#8b5cf6',
                    IN_PROGRESS: '#06b6d4',
                    COMPLETED: '#16a34a',
                    PARTIAL_COMPLETE: '#84cc16',
                    CANCELLED: '#ef4444',
                  };
                  const statusLabels: Record<string, string> = {
                    COLLECTING: 'Collecting',
                    READY_FOR_DISPATCH: 'Ready for Dispatch',
                    DISPATCHED: 'Dispatched',
                    IN_PROGRESS: 'In Progress',
                    COMPLETED: 'Completed',
                    PARTIAL_COMPLETE: 'Partial Complete',
                    CANCELLED: 'Cancelled',
                  };
                  const pct = stats.totalBatches > 0
                    ? Math.round((item.count / stats.totalBatches) * 100)
                    : 0;
                  return (
                    <View key={item._id || index} className="mb-3">
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center">
                          <View
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: statusColors[item._id] || '#9ca3af' }}
                          />
                          <Text className="text-sm font-medium text-gray-700">
                            {statusLabels[item._id] || item._id}
                          </Text>
                        </View>
                        <Text className="text-sm text-gray-500">
                          {item.count} batches · {item.orders} orders
                        </Text>
                      </View>
                      <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View
                          className="h-2 rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: statusColors[item._id] || '#9ca3af',
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </Card>
            </View>
          )}

          {/* By Zone */}
          {(stats.byZone?.length ?? 0) > 0 && (
            <View className="px-4 pb-4">
              <Card className="p-4">
                <View className="flex-row items-center mb-4">
                  <Icon name="location-on" size={24} color="#FE8733" />
                  <Text className="text-lg font-semibold text-gray-800 ml-2">By Zone</Text>
                </View>

                {stats.byZone!.map((zone: any, index: number) => (
                  <View key={zone._id || index} className="flex-row items-center justify-between py-2 border-b border-gray-100">
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-700">
                        {zone.zone || 'Unknown'}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {zone.batches || 0} batches · {zone.orders || 0} orders
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-semibold text-gray-800">
                        {zone.deliveries || 0} delivered
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            </View>
          )}

          {/* By Driver */}
          {stats.byDriver?.length > 0 && (
            <View className="px-4 pb-4">
              <Card className="p-4">
                <View className="flex-row items-center mb-4">
                  <Icon name="person" size={24} color="#FE8733" />
                  <Text className="text-lg font-semibold text-gray-800 ml-2">By Driver</Text>
                </View>

                {stats.byDriver.map((driver: any, index: number) => (
                  <View key={driver.driver?._id || index} className="flex-row items-center justify-between py-2 border-b border-gray-100">
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-700">{driver.driver?.name || 'Unknown'}</Text>
                      <Text className="text-xs text-gray-500">{driver.batches} batches · {driver.orders} orders</Text>
                    </View>
                    <View className="items-end">
                      <Text className={`text-sm font-semibold ${(driver.successRate || 0) >= 90 ? 'text-green-600' : 'text-orange-600'}`}>
                        {driver.successRate || 0}%
                      </Text>
                      {driver.failed > 0 && (
                        <Text className="text-xs text-red-500">{driver.failed} failed</Text>
                      )}
                    </View>
                  </View>
                ))}
              </Card>
            </View>
          )}
        </ScrollView>
      ) : (
        <View className="flex-1 justify-center items-center">
          <Icon name="bar-chart" size={48} color="#d1d5db" />
          <Text className="text-gray-400 text-base mt-4">No statistics available</Text>
        </View>
      )}
    </SafeAreaScreen>
  );
};

export default DeliveryStatsScreen;
