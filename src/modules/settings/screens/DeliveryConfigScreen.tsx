import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Slider from '@react-native-community/slider';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import adminDashboardService, { DeliveryConfig } from '../../../services/admin-dashboard.service';
import { Card } from '../../../components/common/Card';
import { GradientBox } from '../../../components/common/GradientBox';
import { useAlert } from '../../../hooks/useAlert';
import { useNavigation } from '../../../context/NavigationContext';

const DeliveryConfigScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();
  const { goBack } = useNavigation();

  const { data: config, isLoading } = useQuery({
    queryKey: ['deliveryConfig'],
    queryFn: () => adminDashboardService.getDeliveryConfig(),
  });

  const [formData, setFormData] = useState<Partial<DeliveryConfig>>({
    maxBatchSize: 15,
    failedOrderPolicy: 'NO_RETURN',
    autoDispatchDelay: 0,
  });

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<DeliveryConfig>) => adminDashboardService.updateDeliveryConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryConfig'] });
      showSuccess('Success', 'Delivery configuration updated successfully');
    },
    onError: () => {
      showError('Error', 'Failed to update delivery configuration');
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const policyOptions = [
    { value: 'NO_RETURN', label: 'No Return' },
    { value: 'RETURN_TO_KITCHEN', label: 'Return to Kitchen' },
    { value: 'RETRY_DELIVERY', label: 'Retry Delivery' },
  ];

  if (isLoading) {
    return (
      <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
        <View className="flex-1 justify-center items-center bg-gray-50">
          <ActivityIndicator size="large" color="#FE8733" />
          <Text className="text-gray-500 mt-2">Loading config...</Text>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
      {/* Header */}
      <GradientBox style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={goBack} className="mr-4">
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-semibold">Batch Configuration</Text>
      </GradientBox>

      <ScrollView className="flex-1">
      {/* Max Batch Size */}
      <View className="p-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-4">
            <Icon name="list-alt" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Max Batch Size</Text>
          </View>

          <View className="mb-2">
            <Text className="text-3xl font-bold text-gray-800 text-center">
              {formData.maxBatchSize}
            </Text>
            <Text className="text-sm text-gray-600 text-center mb-4">Orders per batch</Text>
          </View>

          <Slider
            value={formData.maxBatchSize || 15}
            onValueChange={(value) => setFormData({ ...formData, maxBatchSize: Math.round(value) })}
            minimumValue={5}
            maximumValue={25}
            step={1}
            minimumTrackTintColor="#FE8733"
            maximumTrackTintColor="#d1d5db"
            thumbTintColor="#FE8733"
          />

          <View className="flex-row justify-between mt-2">
            <Text className="text-xs text-gray-500">5</Text>
            <Text className="text-xs text-gray-500">25</Text>
          </View>

          <View className="mt-4 bg-blue-50 p-3 rounded-lg">
            <Text className="text-sm text-blue-800">
              Recommended: 10-15 orders per batch for optimal delivery efficiency
            </Text>
          </View>
        </Card>
      </View>

      {/* Failed Order Policy */}
      <View className="px-4 pb-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-4">
            <Icon name="error-outline" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Failed Order Policy</Text>
          </View>

          {policyOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setFormData({ ...formData, failedOrderPolicy: option.value })}
              className={`flex-row items-center p-4 mb-3 rounded-lg border ${formData.failedOrderPolicy === option.value
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white'
                }`}
            >
              <View
                className={`w-5 h-5 rounded-full border-2 mr-3 ${formData.failedOrderPolicy === option.value
                    ? 'border-orange-500'
                    : 'border-gray-300'
                  }`}
              >
                {formData.failedOrderPolicy === option.value && (
                  <View className="w-3 h-3 rounded-full bg-orange-500 m-0.5" />
                )}
              </View>
              <Text
                className={`text-base ${formData.failedOrderPolicy === option.value
                    ? 'text-orange-800 font-semibold'
                    : 'text-gray-700'
                  }`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}

          <View className="mt-2 bg-gray-50 p-3 rounded-lg">
            <Text className="text-sm text-gray-600">
              {formData.failedOrderPolicy === 'NO_RETURN' &&
                'Failed orders will not be returned to the kitchen. The customer will be notified.'}
              {formData.failedOrderPolicy === 'RETURN_TO_KITCHEN' &&
                'Failed orders will be returned to the kitchen for reprocessing.'}
              {formData.failedOrderPolicy === 'RETRY_DELIVERY' &&
                'The system will attempt to retry delivery with a different driver.'}
            </Text>
          </View>
        </Card>
      </View>

      {/* Auto Dispatch Delay */}
      <View className="px-4 pb-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-4">
            <Icon name="access-time" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Auto Dispatch Delay</Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Delay (Minutes)</Text>
            <TextInput
              value={formData.autoDispatchDelay?.toString()}
              onChangeText={(value) =>
                setFormData({ ...formData, autoDispatchDelay: parseInt(value) || 0 })
              }
              placeholder="0"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>

          <View className="bg-yellow-50 p-3 rounded-lg">
            <Text className="text-sm text-yellow-800">
              Set to 0 for immediate dispatch. Add a delay (in minutes) if you want to wait before automatically dispatching batches.
            </Text>
          </View>
        </Card>
      </View>

      {/* Current Settings Summary */}
      <View className="px-4 pb-4">
        <Card className="p-4 bg-gradient-to-r from-orange-50 to-white">
          <View className="flex-row items-center mb-3">
            <Icon name="info" size={20} color="#FE8733" />
            <Text className="text-base font-semibold text-gray-800 ml-2">Current Configuration</Text>
          </View>

          <View className="space-y-2">
            <View className="flex-row justify-between py-2 border-b border-gray-200">
              <Text className="text-sm text-gray-600">Max Batch Size</Text>
              <Text className="text-sm font-semibold text-gray-800">{formData.maxBatchSize} orders</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b border-gray-200">
              <Text className="text-sm text-gray-600">Failed Order Policy</Text>
              <Text className="text-sm font-semibold text-gray-800">
                {policyOptions.find((opt) => opt.value === formData.failedOrderPolicy)?.label}
              </Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-sm text-gray-600">Auto Dispatch Delay</Text>
              <Text className="text-sm font-semibold text-gray-800">{formData.autoDispatchDelay} min</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Save Button */}
      <View className="p-4">
        <TouchableOpacity
          onPress={handleSave}
          disabled={updateMutation.isPending}
          className={`py-4 rounded-lg ${updateMutation.isPending ? 'bg-gray-300' : 'bg-orange-500'}`}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white font-semibold text-center text-lg">Save Configuration</Text>
          )}
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaScreen>
  );
};

export default DeliveryConfigScreen;