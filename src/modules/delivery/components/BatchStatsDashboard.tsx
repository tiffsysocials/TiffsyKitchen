import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { deliveryService } from '../../../services/delivery.service';
import { ordersService } from '../../../services/orders.service';
import { Card } from '../../../components/common/Card';

interface Props {
  kitchenId: string;
  mealWindow: 'LUNCH' | 'DINNER';
  isAdmin: boolean;
  onViewHistory: () => void;
}

const BatchStatsDashboard: React.FC<Props> = ({ kitchenId, mealWindow, isAdmin, onViewHistory }) => {
  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateFrom = today.toISOString();
  const dateTo = tomorrow.toISOString();

  // Fetch batches
  const { data: batchData, isLoading: batchesLoading } = useQuery({
    queryKey: ['deliveryMgmt_batches', kitchenId, dateFrom],
    queryFn: () => {
      if (isAdmin) {
        return deliveryService.getBatches({ kitchenId, dateFrom, dateTo, limit: 100 });
      }
      return deliveryService.getMyKitchenBatches({ dateFrom, dateTo, limit: 100 });
    },
  });

  const batches = batchData?.data?.batches || [];

  // Fetch orders for "available for batching" count
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['deliveryMgmt_orders', kitchenId],
    queryFn: () => ordersService.getOrders({ kitchenId, limit: 100 }),
  });

  const orders = ordersData?.orders || [];

  // Fetch delivery stats (admin only)
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['deliveryMgmt_stats', dateFrom],
    queryFn: () => deliveryService.getDeliveryStats({ dateFrom, dateTo }),
    enabled: isAdmin,
  });

  const deliveryStats = statsData?.data || null;

  const isLoading = batchesLoading || ordersLoading || (isAdmin && statsLoading);

  // Compute stats
  const availableForBatching = orders.filter(
    (o: any) =>
      o.mealWindow === mealWindow &&
      ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status) &&
      !o.batchId
  ).length;

  const readyToDispatch = batches.filter(
    (b: any) => b.mealWindow === mealWindow && b.status === 'COLLECTING'
  ).length;

  const statusCounts = {
    COLLECTING: batches.filter((b: any) => b.status === 'COLLECTING' && b.mealWindow === mealWindow).length,
    READY_FOR_DISPATCH: batches.filter((b: any) => b.status === 'READY_FOR_DISPATCH' && b.mealWindow === mealWindow).length,
    DISPATCHED: batches.filter((b: any) => b.status === 'DISPATCHED' && b.mealWindow === mealWindow).length,
    IN_PROGRESS: batches.filter((b: any) => b.status === 'IN_PROGRESS' && b.mealWindow === mealWindow).length,
    COMPLETED: batches.filter((b: any) => b.status === 'COMPLETED' && b.mealWindow === mealWindow).length,
    PARTIAL_COMPLETE: batches.filter((b: any) => b.status === 'PARTIAL_COMPLETE' && b.mealWindow === mealWindow).length,
    CANCELLED: batches.filter((b: any) => b.status === 'CANCELLED' && b.mealWindow === mealWindow).length,
  };

  const totalBatches = batches.filter((b: any) => b.mealWindow === mealWindow).length;

  const statusItems = [
    { label: 'Collecting', value: statusCounts.COLLECTING, color: '#fef3c7' },
    { label: 'Ready', value: statusCounts.READY_FOR_DISPATCH, color: '#dcfce7' },
    { label: 'Dispatched', value: statusCounts.DISPATCHED, color: '#dbeafe' },
    { label: 'In Progress', value: statusCounts.IN_PROGRESS, color: '#e0e7ff' },
    { label: 'Completed', value: statusCounts.COMPLETED, color: '#d1fae5' },
    { label: 'Partial', value: statusCounts.PARTIAL_COMPLETE, color: '#fed7aa' },
    { label: 'Cancelled', value: statusCounts.CANCELLED, color: '#fecaca' },
    { label: 'Total', value: totalBatches, color: '#FE8733' },
  ];

  if (isLoading) {
    return (
      <View className="px-4 py-8 items-center">
        <ActivityIndicator color="#FE8733" />
        <Text className="text-sm text-gray-500 mt-2">Loading statistics...</Text>
      </View>
    );
  }

  return (
    <View className="px-4">
      {/* Section Title */}
      <Text className="text-base font-semibold text-gray-800 mb-3">{mealWindow} Statistics</Text>

      {/* Row 1: Quick stats */}
      <View className="flex-row mb-3">
        <Card className="flex-1 p-4 mr-1.5 items-center">
          <View className="w-11 h-11 rounded-lg bg-orange-50 items-center justify-center mb-2">
            <Icon name="inventory-2" size={24} color="#FE8733" />
          </View>
          <Text className="text-3xl font-bold text-gray-800">{availableForBatching}</Text>
          <Text className="text-[11px] font-semibold text-gray-500 text-center leading-[14px]">
            Available{'\n'}for Batching
          </Text>
        </Card>
        <Card className="flex-1 p-4 ml-1.5 items-center">
          <View className="w-11 h-11 rounded-lg bg-blue-50 items-center justify-center mb-2">
            <Icon name="local-shipping" size={24} color="#3b82f6" />
          </View>
          <Text className="text-3xl font-bold text-gray-800">{readyToDispatch}</Text>
          <Text className="text-[11px] font-semibold text-gray-500 text-center leading-[14px]">
            Ready to{'\n'}Dispatch
          </Text>
        </Card>
      </View>

      {/* Row 2: Batch status grid */}
      <Card className="p-4 mb-3">
        <View className="flex-row items-center mb-3 pb-2 border-b border-gray-100">
          <Icon name="history" size={20} color="#374151" />
          <Text className="text-sm font-semibold text-gray-800 ml-2">{mealWindow} Batches (Today)</Text>
        </View>
        <View className="flex-row flex-wrap">
          {statusItems.map((item) => (
            <View key={item.label} className="w-1/4 items-center py-2">
              <View
                style={{ backgroundColor: item.color, width: 10, height: 10, borderRadius: 5, marginBottom: 6 }}
              />
              <Text className="text-[9px] text-gray-500 mb-0.5 text-center">{item.label}</Text>
              <Text className={`text-lg font-semibold text-gray-800 ${item.label === 'Total' ? 'font-bold' : ''}`}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Row 3: Delivery performance (admin only) */}
      {isAdmin && deliveryStats && (
        <Card className="p-4 mb-3">
          <View className="flex-row items-center mb-3 pb-2 border-b border-gray-100">
            <Icon name="trending-up" size={20} color="#374151" />
            <Text className="text-sm font-semibold text-gray-800 ml-2">Delivery Performance (Today)</Text>
          </View>
          <View className="flex-row justify-around mb-3">
            <View className="items-center">
              <Icon name="inventory" size={28} color="#6366f1" />
              <Text className="text-2xl font-bold text-gray-800">{deliveryStats.totalOrders || 0}</Text>
              <Text className="text-[10px] text-gray-500">Total Orders</Text>
            </View>
            <View className="items-center">
              <Icon name="check-circle" size={28} color="#10b981" />
              <Text className="text-2xl font-bold text-gray-800">{deliveryStats.successfulDeliveries || 0}</Text>
              <Text className="text-[10px] text-gray-500">Delivered</Text>
            </View>
            <View className="items-center">
              <Icon name="cancel" size={28} color="#ef4444" />
              <Text className="text-2xl font-bold text-gray-800">{deliveryStats.failedDeliveries || 0}</Text>
              <Text className="text-[10px] text-gray-500">Failed</Text>
            </View>
            <View className="items-center">
              <Icon name="percent" size={28} color="#FE8733" />
              <Text className="text-2xl font-bold text-gray-800">{Math.round(deliveryStats.successRate || 0)}%</Text>
              <Text className="text-[10px] text-gray-500">Success</Text>
            </View>
          </View>
          <View className="flex-row items-center justify-center pt-2 border-t border-gray-100">
            <Icon name="local-shipping" size={18} color="#6b7280" />
            <Text className="text-xs text-gray-500 font-medium ml-1">
              Avg {(deliveryStats.avgDeliveriesPerBatch || 0).toFixed(1)} orders per batch
            </Text>
          </View>
        </Card>
      )}

      {/* View History Button */}
      <TouchableOpacity
        className="flex-row items-center justify-center bg-white p-4 rounded-xl border border-[#FE8733] mb-6"
        onPress={onViewHistory}
      >
        <Icon name="view-list" size={20} color="#FE8733" />
        <Text className="text-sm font-semibold text-[#FE8733] ml-2 text-center">
          View Detailed Batch History
        </Text>
        <Icon name="chevron-right" size={20} color="#FE8733" />
      </TouchableOpacity>
    </View>
  );
};

export default BatchStatsDashboard;
