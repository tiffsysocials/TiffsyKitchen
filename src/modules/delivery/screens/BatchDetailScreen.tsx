import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { GradientBox } from '../../../components/common/GradientBox';
import { deliveryService } from '../../../services/delivery.service';
import { Card } from '../../../components/common/Card';
import BatchStatusBadge from '../components/BatchStatusBadge';
import BatchOrdersList from '../components/BatchOrdersList';
import BatchTimeline from '../components/BatchTimeline';
import BatchTrackingList from '../components/BatchTrackingList';
import ReassignDriverModal from '../components/ReassignDriverModal';
import CancelBatchModal from '../components/CancelBatchModal';
import DispatchToDriverModal from '../components/DispatchToDriverModal';

interface Props {
  batchId: string;
  onBack: () => void;
}

type TabName = 'orders' | 'tracking';

const BatchDetailScreen: React.FC<Props> = ({ batchId, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabName>('orders');
  const [showReassign, setShowReassign] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showDispatchToDriver, setShowDispatchToDriver] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('userRole').then(setUserRole);
  }, []);

  const isAdmin = userRole === 'ADMIN';

  // Batch detail query
  const { data: detailData, isLoading, refetch } = useQuery({
    queryKey: ['batchDetail', batchId],
    queryFn: () => deliveryService.getBatchDetails(batchId),
  });

  const batch = detailData?.data?.batch;
  const orders = detailData?.data?.orders || [];
  const assignments = detailData?.data?.assignments || [];

  // Tracking query - polls every 12s when batch is active
  const isActive = batch?.status === 'DISPATCHED' || batch?.status === 'IN_PROGRESS';

  const { data: trackingData } = useQuery({
    queryKey: ['batchTracking', batchId],
    queryFn: () => deliveryService.getBatchTracking(batchId),
    enabled: isActive && activeTab === 'tracking',
    refetchInterval: isActive && activeTab === 'tracking' ? 12000 : false,
  });

  const tracking = trackingData?.data;

  const canDispatchToDriver = batch?.status === 'COLLECTING' || batch?.status === 'READY_FOR_DISPATCH';
  const canReassign = batch?.status === 'DISPATCHED' || batch?.status === 'IN_PROGRESS';
  const canCancel = batch && batch.status !== 'COMPLETED' && batch.status !== 'CANCELLED';

  if (isLoading) {
    return (
      <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
        <View className="flex-1 justify-center items-center bg-gray-50">
          <ActivityIndicator size="large" color="#FE8733" />
        </View>
      </SafeAreaScreen>
    );
  }

  if (!batch) {
    return (
      <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
        <View className="flex-1 justify-center items-center bg-gray-50">
          <Icon name="error-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-400 text-base mt-4">Batch not found</Text>
          <TouchableOpacity onPress={onBack} className="mt-4">
            <Text className="text-orange-500 font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
      {/* Header */}
      <GradientBox style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onBack} className="mr-4">
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold" numberOfLines={1}>
            {batch.batchNumber}
          </Text>
        </View>
        <BatchStatusBadge status={batch.status} />
      </GradientBox>

      <ScrollView className="flex-1">
        {/* Batch Info Card */}
        <View className="p-4">
          <Card className="p-4">
            <View className="flex-row items-center mb-3">
              <Icon name="store" size={18} color="#6b7280" />
              <Text className="text-sm text-gray-600 ml-2">
                {batch.kitchenId?.name} → {batch.zoneId?.name}
              </Text>
            </View>

            <View className="flex-row items-center mb-3">
              <Icon name={batch.mealWindow === 'LUNCH' ? 'wb-sunny' : 'nights-stay'} size={18} color="#6b7280" />
              <Text className="text-sm text-gray-600 ml-2">
                {batch.mealWindow} · {batch.orderIds?.length || 0} orders
              </Text>
            </View>

            {/* Driver */}
            <View className="flex-row items-center mb-3">
              <Icon name="person" size={18} color="#6b7280" />
              {batch.driverId ? (
                <Text className="text-sm text-gray-600 ml-2">
                  {batch.driverId.name} · {batch.driverId.phone}
                  {batch.assignmentStrategy?.assignedScore
                    ? ` · Score: ${batch.assignmentStrategy.assignedScore}`
                    : ''}
                </Text>
              ) : (
                <Text className="text-sm text-gray-400 italic ml-2">No driver assigned</Text>
              )}
            </View>

            {/* Route Optimization */}
            {batch.routeOptimization && (
              <View className="flex-row items-center">
                <Icon name="route" size={18} color="#6b7280" />
                <Text className="text-sm text-gray-600 ml-2">
                  {batch.routeOptimization.algorithm}{batch.routeOptimization.totalDistanceMeters != null ? ` · ${(batch.routeOptimization.totalDistanceMeters / 1000).toFixed(1)} km` : ''}{batch.routeOptimization.totalDurationSeconds != null ? ` · ~${Math.round(batch.routeOptimization.totalDurationSeconds / 60)} min` : ''}{batch.routeOptimization.improvementPercent != null ? ` · ${batch.routeOptimization.improvementPercent}% optimized` : ''}
                </Text>
              </View>
            )}

            {/* Delivery Progress */}
            {(batch.totalDelivered > 0 || batch.totalFailed > 0) && (
              <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100">
                <View className="flex-row items-center mr-4">
                  <Icon name="check-circle" size={16} color="#16a34a" />
                  <Text className="text-sm text-green-600 ml-1">{batch.totalDelivered} delivered</Text>
                </View>
                <View className="flex-row items-center">
                  <Icon name="cancel" size={16} color="#dc2626" />
                  <Text className="text-sm text-red-600 ml-1">{batch.totalFailed} failed</Text>
                </View>
              </View>
            )}
          </Card>
        </View>

        {/* Tabs */}
        <View className="flex-row mx-4 mb-2">
          <TouchableOpacity
            onPress={() => setActiveTab('orders')}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeTab === 'orders' ? 'border-orange-500' : 'border-gray-200'
            }`}
          >
            <Text className={`text-sm font-semibold ${activeTab === 'orders' ? 'text-orange-600' : 'text-gray-500'}`}>
              Orders & Timeline
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('tracking')}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeTab === 'tracking' ? 'border-orange-500' : 'border-gray-200'
            }`}
          >
            <View className="flex-row items-center">
              <Text className={`text-sm font-semibold ${activeTab === 'tracking' ? 'text-orange-600' : 'text-gray-500'}`}>
                Live Tracking
              </Text>
              {isActive && (
                <View className="w-2 h-2 rounded-full bg-green-500 ml-2" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'orders' ? (
          <>
            <BatchOrdersList orders={orders} assignments={assignments} />
            <BatchTimeline batch={batch} orders={orders} assignments={assignments} />
          </>
        ) : (
          tracking ? (
            <BatchTrackingList tracking={tracking} />
          ) : (
            <View className="items-center py-16">
              {isActive ? (
                <ActivityIndicator color="#FE8733" />
              ) : (
                <>
                  <Icon name="location-off" size={48} color="#d1d5db" />
                  <Text className="text-gray-400 text-base mt-4">
                    Tracking available when batch is dispatched
                  </Text>
                </>
              )}
            </View>
          )
        )}

        {/* Action Buttons - Admin only */}
        {isAdmin && (
          <View className="p-4">
            {canDispatchToDriver && (
              <TouchableOpacity
                onPress={() => setShowDispatchToDriver(true)}
                className="flex-row items-center justify-center py-3 rounded-lg bg-green-600 mb-3"
              >
                <Icon name="local-shipping" size={20} color="#ffffff" />
                <Text className="text-white font-semibold ml-2">Dispatch to Driver</Text>
              </TouchableOpacity>
            )}

            {canReassign && (
              <TouchableOpacity
                onPress={() => setShowReassign(true)}
                className="flex-row items-center justify-center py-3 rounded-lg bg-orange-500 mb-3"
              >
                <Icon name="swap-horiz" size={20} color="#ffffff" />
                <Text className="text-white font-semibold ml-2">Reassign Driver</Text>
              </TouchableOpacity>
            )}

            {canCancel && (
              <TouchableOpacity
                onPress={() => setShowCancel(true)}
                className="flex-row items-center justify-center py-3 rounded-lg border border-red-500"
              >
                <Icon name="cancel" size={20} color="#dc2626" />
                <Text className="text-red-600 font-semibold ml-2">Cancel Batch</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals - Admin only */}
      {isAdmin && (
        <>
          <ReassignDriverModal
            visible={showReassign}
            batchId={batchId}
            onClose={() => setShowReassign(false)}
            onSuccess={() => {
              setShowReassign(false);
              refetch();
            }}
          />

          <CancelBatchModal
            visible={showCancel}
            batchId={batchId}
            batchNumber={batch.batchNumber}
            onClose={() => setShowCancel(false)}
            onSuccess={() => {
              setShowCancel(false);
              refetch();
            }}
          />

          <DispatchToDriverModal
            visible={showDispatchToDriver}
            batchId={batchId}
            onClose={() => setShowDispatchToDriver(false)}
            onSuccess={() => {
              setShowDispatchToDriver(false);
              refetch();
            }}
          />
        </>
      )}
    </SafeAreaScreen>
  );
};

export default BatchDetailScreen;
