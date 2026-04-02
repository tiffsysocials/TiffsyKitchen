import React from 'react';
import { View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Card } from '../../../components/common/Card';
import adminDashboardService from '../../../services/admin-dashboard.service';

interface DeliveryOverviewCardProps {
  dateFrom?: string;
  dateTo?: string;
}

const DeliveryOverviewCard: React.FC<DeliveryOverviewCardProps> = ({ dateFrom, dateTo }) => {
  const today = new Date().toISOString().split('T')[0];
  const effectiveDateFrom = dateFrom || today;
  const effectiveDateTo = dateTo || today;

  const { data } = useQuery({
    queryKey: ['deliveryStats', effectiveDateFrom, effectiveDateTo],
    queryFn: () => adminDashboardService.getDeliveryStats({ dateFrom: effectiveDateFrom, dateTo: effectiveDateTo }),
  });

  const stats = data as any;
  if (!stats) return null;

  const isToday = effectiveDateFrom === today && effectiveDateTo === today;

  return (
    <Card className="p-4">
      <View className="flex-row items-center mb-3">
        <Icon name="local-shipping" size={20} color="#FE8733" />
        <Text className="text-base font-semibold text-gray-800 ml-2">
          {isToday ? "Today's Deliveries" : 'Deliveries'}
        </Text>
      </View>

      <View className="flex-row mb-3">
        <View className="flex-1 items-center">
          <Text className="text-xl font-bold text-gray-800">{stats.totalBatches || 0}</Text>
          <Text className="text-xs text-gray-500">Batches</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-xl font-bold text-gray-800">{stats.totalDeliveries || 0}</Text>
          <Text className="text-xs text-gray-500">Deliveries</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-xl font-bold text-green-600">{stats.successRate || 0}%</Text>
          <Text className="text-xs text-gray-500">Success</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-xl font-bold text-red-600">{stats.totalFailed || 0}</Text>
          <Text className="text-xs text-gray-500">Failed</Text>
        </View>
      </View>

      {stats.byZone?.length > 0 && (
        <View className="border-t border-gray-100 pt-2">
          {stats.byZone.slice(0, 3).map((zone: any, index: number) => (
            <View key={zone._id || index} className="flex-row items-center justify-between py-1">
              <Text className="text-xs text-gray-600">{zone.zone || zone._id}</Text>
              <Text className="text-xs text-gray-500">
                {zone.deliveries} deliveries ({zone.successRate}%)
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
};

export default DeliveryOverviewCard;
