import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BatchTracking } from '../../../types/delivery';

interface Props {
  tracking: BatchTracking;
}

const ETA_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  EARLY: { bg: '#dcfce7', text: '#16a34a' },
  ON_TIME: { bg: '#dbeafe', text: '#1d4ed8' },
  LATE: { bg: '#fef9c3', text: '#a16207' },
  CRITICAL: { bg: '#fee2e2', text: '#dc2626' },
};

const DELIVERY_STATUS_CONFIG: Record<string, { icon: string; color: string }> = {
  ASSIGNED: { icon: 'radio-button-unchecked', color: '#9ca3af' },
  EN_ROUTE: { icon: 'directions-car', color: '#eab308' },
  ARRIVED: { icon: 'place', color: '#eab308' },
  DELIVERED: { icon: 'check-circle', color: '#16a34a' },
  FAILED: { icon: 'cancel', color: '#dc2626' },
};

const BatchTrackingList: React.FC<Props> = ({ tracking }) => {
  const { driver, deliveries } = tracking;

  const getTimeSince = (isoDate: string) => {
    const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const isStale = driver && (Date.now() - new Date(driver.updatedAt).getTime()) > 5 * 60 * 1000; // 5 minutes

  const sortedDeliveries = [...deliveries]
    .filter((delivery, index, self) => 
      index === self.findIndex(d => d.orderId === delivery.orderId)
    )
    .sort((a, b) => {
      const seqA = a.sequence?.sequenceNumber ?? 999;
      const seqB = b.sequence?.sequenceNumber ?? 999;
      return seqA - seqB;
    });

  return (
    <View className="px-4 py-2">
      {/* Driver Status */}
      <View className="bg-blue-50 p-3 rounded-lg mb-4">
        <View className="flex-row items-center">
          <Icon name="directions-car" size={20} color="#1d4ed8" />
          {driver ? (
            <View className="flex-1 ml-2">
              <Text className="text-sm font-semibold text-blue-800">{driver.name}</Text>
              <Text className="text-xs text-blue-600">
                Last seen: {getTimeSince(driver.updatedAt)} · {driver.driverStatus}
                {isStale && <Text className="text-red-500"> (stale)</Text>}
              </Text>
            </View>
          ) : (
            <Text className="text-sm text-blue-600 ml-2">No driver location data</Text>
          )}
        </View>
      </View>

      {/* Progress Summary */}
      <View className="flex-row mb-4">
        <View className="flex-1 items-center">
          <Text className="text-2xl font-bold text-gray-800">{tracking.deliveredCount}</Text>
          <Text className="text-xs text-gray-500">Delivered</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-2xl font-bold text-red-600">{tracking.failedCount}</Text>
          <Text className="text-xs text-gray-500">Failed</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-2xl font-bold text-gray-800">
            {tracking.totalOrders - tracking.deliveredCount - tracking.failedCount}
          </Text>
          <Text className="text-xs text-gray-500">Remaining</Text>
        </View>
      </View>

      {/* Route Info */}
      {tracking.routeOptimization && (
        <View className="bg-gray-50 p-3 rounded-lg mb-4">
          <Text className="text-xs text-gray-500">
            Route: {tracking.routeOptimization.algorithm}{tracking.routeOptimization.totalDistanceMeters != null ? ` · ${(tracking.routeOptimization.totalDistanceMeters / 1000).toFixed(1)} km` : ''}{tracking.routeOptimization.totalDurationSeconds != null ? ` · ~${Math.round(tracking.routeOptimization.totalDurationSeconds / 60)} min` : ''}{tracking.routeOptimization.improvementPercent != null ? ` · ${tracking.routeOptimization.improvementPercent}% optimized` : ''}
          </Text>
        </View>
      )}

      {/* Delivery Stops */}
      <Text className="text-base font-semibold text-gray-800 mb-3">Delivery Stops</Text>
      {sortedDeliveries.map((delivery, index) => {
        const statusConfig = DELIVERY_STATUS_CONFIG[delivery.deliveryStatus || 'ASSIGNED'] || DELIVERY_STATUS_CONFIG.ASSIGNED;
        const etaColors = delivery.etaStatus ? ETA_STATUS_COLORS[delivery.etaStatus] : null;
        const isLast = index === sortedDeliveries.length - 1;

        return (
          <View key={delivery.orderId} className="flex-row">
            {/* Sequence line */}
            <View className="items-center" style={{ width: 32 }}>
              <View
                className="w-6 h-6 rounded-full items-center justify-center"
                style={{ backgroundColor: statusConfig.color + '20' }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: statusConfig.color }}>
                  {delivery.sequence?.sequenceNumber || index + 1}
                </Text>
              </View>
              {!isLast && <View className="w-0.5 flex-1 bg-gray-200 my-1" />}
            </View>

            {/* Content */}
            <View className="flex-1 ml-3 pb-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <Icon name={statusConfig.icon} size={16} color={statusConfig.color} />
                  <Text className="text-sm font-medium text-gray-800 ml-1">
                    #{delivery.orderNumber}
                  </Text>
                </View>
                {etaColors && delivery.etaStatus && (
                  <View style={{ backgroundColor: etaColors.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                    <Text style={{ color: etaColors.text, fontSize: 10, fontWeight: '600' }}>
                      {delivery.etaStatus}
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row items-center mt-1">
                {delivery.etaSeconds != null && (
                  <Text className="text-xs text-gray-500 mr-3">
                    ETA: ~{Math.round(delivery.etaSeconds / 60)} min
                  </Text>
                )}
                {delivery.distanceFromDriverMeters != null && (
                  <Text className="text-xs text-gray-500">
                    {(delivery.distanceFromDriverMeters / 1000).toFixed(1)} km away
                  </Text>
                )}
              </View>

              <Text className="text-xs text-gray-400 mt-0.5">
                {delivery.deliveryStatus || 'Pending'} · {delivery.orderStatus}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default BatchTrackingList;
