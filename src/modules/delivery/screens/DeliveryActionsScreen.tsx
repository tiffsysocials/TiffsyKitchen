import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { GradientBox } from '../../../components/common/GradientBox';
import { deliveryService } from '../../../services/delivery.service';
import { Card } from '../../../components/common/Card';
import { useAlert } from '../../../hooks/useAlert';
import KitchenSelector from '../components/KitchenSelector';
import MealWindowSelector from '../components/MealWindowSelector';

interface Props {
  onMenuPress: () => void;
}

const DeliveryActionsScreen: React.FC<Props> = ({ onMenuPress }) => {
  const { showSuccess, showError } = useAlert();
  const [selectedKitchenId, setSelectedKitchenId] = useState<string | null>(null);
  const [selectedKitchenName, setSelectedKitchenName] = useState<string | null>(null);
  const [mealWindow, setMealWindow] = useState<'LUNCH' | 'DINNER' | null>(null);
  const [forceDispatch, setForceDispatch] = useState(false);

  // Results state
  const [batchResult, setBatchResult] = useState<any>(null);
  const [dispatchResult, setDispatchResult] = useState<any>(null);
  const [reminderResult, setReminderResult] = useState<any>(null);

  // Auto-Batch mutation
  const batchMutation = useMutation({
    mutationFn: () => {
      const data: any = {};
      if (mealWindow) data.mealWindow = mealWindow;
      if (selectedKitchenId) data.kitchenId = selectedKitchenId;
      return deliveryService.autoBatchOrders(data);
    },
    onSuccess: (response: any) => {
      const result = response?.data || response;
      setBatchResult(result);
      showSuccess('Success', `Auto-batching complete: ${result?.batchesCreated || 0} batches created`);
    },
    onError: (error: any) => {
      showError('Error', error?.message || 'Failed to auto-batch orders');
    },
  });

  // Dispatch mutation
  const dispatchMutation = useMutation({
    mutationFn: () => {
      if (!mealWindow) {
        throw new Error('Please select a meal window for dispatch');
      }
      if (!selectedKitchenId) {
        throw new Error('Please select a kitchen for dispatch');
      }
      return deliveryService.dispatchBatches({
        mealWindow,
        kitchenId: selectedKitchenId,
        forceDispatch,
      });
    },
    onSuccess: (response: any) => {
      const result = response?.data || response;
      setDispatchResult(result);
      showSuccess('Success', `${result?.batchesDispatched || 0} batches dispatched`);
    },
    onError: (error: any) => {
      showError('Error', error?.message || 'Failed to dispatch batches');
    },
  });

  // Kitchen reminder mutation
  const reminderMutation = useMutation({
    mutationFn: () => {
      const data: any = {};
      if (mealWindow) data.mealWindow = mealWindow;
      if (selectedKitchenId) data.kitchenId = selectedKitchenId;
      return deliveryService.sendKitchenReminder(data);
    },
    onSuccess: (response: any) => {
      const result = response?.data || response;
      setReminderResult(result);
      showSuccess('Success', `${result?.kitchensNotified || 0} kitchens notified`);
    },
    onError: (error: any) => {
      showError('Error', error?.message || 'Failed to send reminder');
    },
  });

  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
      {/* Header */}
      <GradientBox style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onMenuPress} className="mr-4">
          <Icon name="menu" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-semibold">Delivery Actions</Text>
      </GradientBox>

      <ScrollView className="flex-1">
        {/* Selectors */}
        <View className="p-4">
          <Card className="p-4">
            <KitchenSelector
              selectedKitchenId={selectedKitchenId}
              onSelect={(id, name) => {
                setSelectedKitchenId(id);
                setSelectedKitchenName(name);
              }}
            />
            <View className="mt-4">
              <MealWindowSelector selected={mealWindow} onSelect={setMealWindow} />
            </View>
          </Card>
        </View>

        {/* Auto-Batch Section */}
        <View className="px-4 pb-4">
          <Card className="p-4">
            <View className="flex-row items-center mb-2">
              <Icon name="layers" size={24} color="#FE8733" />
              <Text className="text-lg font-semibold text-gray-800 ml-2">Batch Orders</Text>
            </View>
            <Text className="text-sm text-gray-500 mb-4">
              Group pending orders into delivery batches
            </Text>

            <TouchableOpacity
              onPress={() => batchMutation.mutate()}
              disabled={batchMutation.isPending}
              className={`py-3 rounded-lg ${batchMutation.isPending ? 'bg-gray-300' : 'bg-blue-500'}`}
            >
              {batchMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold text-center">Batch Orders</Text>
              )}
            </TouchableOpacity>

            {batchResult && (
              <View className="mt-3 bg-green-50 p-3 rounded-lg">
                <Text className="text-sm text-green-700">
                  {batchResult.batchesCreated} batches created, {batchResult.ordersProcessed} orders processed
                  {batchResult.optimized ? ' (optimized)' : ''}
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Dispatch Section */}
        <View className="px-4 pb-4">
          <Card className="p-4">
            <View className="flex-row items-center mb-2">
              <Icon name="local-shipping" size={24} color="#FE8733" />
              <Text className="text-lg font-semibold text-gray-800 ml-2">Dispatch Batches</Text>
            </View>
            <Text className="text-sm text-gray-500 mb-4">
              Send collecting batches to drivers
            </Text>

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-sm font-medium text-gray-700">Force Dispatch (bypass cutoff)</Text>
              <TouchableOpacity
                onPress={() => setForceDispatch(!forceDispatch)}
                className={`w-12 h-6 rounded-full ${forceDispatch ? 'bg-orange-500' : 'bg-gray-300'}`}
              >
                <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${forceDispatch ? 'self-end' : 'self-start'}`} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => dispatchMutation.mutate()}
              disabled={dispatchMutation.isPending}
              className={`py-3 rounded-lg ${dispatchMutation.isPending ? 'bg-gray-300' : 'bg-teal-500'}`}
            >
              {dispatchMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold text-center">Dispatch</Text>
              )}
            </TouchableOpacity>

            {dispatchResult && (
              <View className="mt-3 bg-green-50 p-3 rounded-lg">
                <Text className="text-sm text-green-700">
                  {dispatchResult.batchesDispatched} batches dispatched
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Kitchen Reminder Section */}
        <View className="px-4 pb-4">
          <Card className="p-4">
            <View className="flex-row items-center mb-2">
              <Icon name="notifications-active" size={24} color="#FE8733" />
              <Text className="text-lg font-semibold text-gray-800 ml-2">Send Kitchen Reminder</Text>
            </View>
            <Text className="text-sm text-gray-500 mb-4">
              Notify kitchen staff about pending orders before cutoff
            </Text>

            <TouchableOpacity
              onPress={() => reminderMutation.mutate()}
              disabled={reminderMutation.isPending}
              className={`py-3 rounded-lg ${reminderMutation.isPending ? 'bg-gray-300' : 'bg-purple-500'}`}
            >
              {reminderMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-semibold text-center">Send Reminder</Text>
              )}
            </TouchableOpacity>

            {reminderResult && (
              <View className="mt-3 bg-green-50 p-3 rounded-lg">
                <Text className="text-sm text-green-700">
                  {reminderResult.kitchensNotified} kitchens notified
                </Text>
                {reminderResult.details?.map((d: any, i: number) => (
                  <Text key={i} className="text-xs text-green-600 mt-1">
                    {d.kitchenName}: {d.orderCount} orders, {d.staffNotified} staff notified
                  </Text>
                ))}
              </View>
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaScreen>
  );
};

export default DeliveryActionsScreen;
