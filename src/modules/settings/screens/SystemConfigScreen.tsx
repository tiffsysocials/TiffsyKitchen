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
import adminDashboardService, { SystemConfig } from '../../../services/admin-dashboard.service';
import { Card } from '../../../components/common/Card';
import { useAlert } from '../../../hooks/useAlert';

const SystemConfigScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();

  const { data: config, isLoading } = useQuery({
    queryKey: ['systemConfig'],
    queryFn: () => adminDashboardService.getSystemConfig(),
  });

  const [formData, setFormData] = useState<Partial<SystemConfig>>({});

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SystemConfig>) => adminDashboardService.updateSystemConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemConfig'] });
      showSuccess('Success', 'System configuration updated successfully');
    },
    onError: () => {
      showError('Error', 'Failed to update system configuration');
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const updateField = (section: keyof SystemConfig, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#FE8733" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Cutoff Times */}
      <View className="p-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-4">
            <Icon name="schedule" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Cutoff Times</Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Lunch Cutoff Time</Text>
            <TextInput
              value={formData.cutoffTimes?.lunch}
              onChangeText={(value) => updateField('cutoffTimes', 'lunch', value)}
              placeholder="HH:MM (e.g., 10:30)"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Dinner Cutoff Time</Text>
            <TextInput
              value={formData.cutoffTimes?.dinner}
              onChangeText={(value) => updateField('cutoffTimes', 'dinner', value)}
              placeholder="HH:MM (e.g., 17:30)"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>
        </Card>
      </View>

      {/* Fees */}
      <View className="px-4 pb-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-4">
            <Icon name="attach-money" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Fees</Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Delivery Fee (₹)</Text>
            <TextInput
              value={formData.fees?.deliveryFee?.toString()}
              onChangeText={(value) => updateField('fees', 'deliveryFee', parseFloat(value) || 0)}
              placeholder="30"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Service Fee (₹)</Text>
            <TextInput
              value={formData.fees?.serviceFee?.toString()}
              onChangeText={(value) => updateField('fees', 'serviceFee', parseFloat(value) || 0)}
              placeholder="10"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Packaging Fee (₹)</Text>
            <TextInput
              value={formData.fees?.packagingFee?.toString()}
              onChangeText={(value) => updateField('fees', 'packagingFee', parseFloat(value) || 0)}
              placeholder="15"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Handling Fee (₹)</Text>
            <TextInput
              value={formData.fees?.handlingFee?.toString()}
              onChangeText={(value) => updateField('fees', 'handlingFee', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</Text>
            <TextInput
              value={(formData.fees?.taxRate ? formData.fees.taxRate * 100 : 0).toString()}
              onChangeText={(value) => updateField('fees', 'taxRate', (parseFloat(value) || 0) / 100)}
              placeholder="5"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>
        </Card>
      </View>

      {/* Cancellation Policy */}
      <View className="px-4 pb-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-4">
            <Icon name="cancel" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Cancellation Policy</Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Cancellation Window (Minutes)</Text>
            <TextInput
              value={formData.cancellation?.windowMinutes?.toString()}
              onChangeText={(value) => updateField('cancellation', 'windowMinutes', parseInt(value) || 0)}
              placeholder="10"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-700">Allow Voucher Orders Anytime</Text>
            <TouchableOpacity
              onPress={() => updateField('cancellation', 'voucherOrdersAnytime', !formData.cancellation?.voucherOrdersAnytime)}
              className={`w-12 h-6 rounded-full ${formData.cancellation?.voucherOrdersAnytime ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${formData.cancellation?.voucherOrdersAnytime ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>
        </Card>
      </View>

      {/* Refund Settings */}
      <View className="px-4 pb-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-4">
            <Icon name="money-off" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Refund Settings</Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Max Retries</Text>
            <TextInput
              value={formData.refund?.maxRetries?.toString()}
              onChangeText={(value) => updateField('refund', 'maxRetries', parseInt(value) || 0)}
              placeholder="3"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Auto Process Delay (Minutes)</Text>
            <TextInput
              value={formData.refund?.autoProcessDelay?.toString()}
              onChangeText={(value) => updateField('refund', 'autoProcessDelay', parseInt(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>
        </Card>
      </View>

      {/* Auto-Order Settings */}
      <View className="px-4 pb-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-4">
            <Icon name="autorenew" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Auto-Order Settings</Text>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-sm font-medium text-gray-700">Auto-Ordering Enabled</Text>
            <TouchableOpacity
              onPress={() => updateField('autoOrder', 'enabled', !formData.autoOrder?.enabled)}
              className={`w-12 h-6 rounded-full ${formData.autoOrder?.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${formData.autoOrder?.enabled ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-sm font-medium text-gray-700">Auto-Accept Orders</Text>
            <TouchableOpacity
              onPress={() => updateField('autoOrder', 'autoAcceptOrders', !formData.autoOrder?.autoAcceptOrders)}
              className={`w-12 h-6 rounded-full ${formData.autoOrder?.autoAcceptOrders ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${formData.autoOrder?.autoAcceptOrders ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Lunch Cron Time (HH:mm)</Text>
            <TextInput
              value={formData.autoOrder?.lunchCronTime}
              onChangeText={(value) => updateField('autoOrder', 'lunchCronTime', value)}
              placeholder="10:00"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Dinner Cron Time (HH:mm)</Text>
            <TextInput
              value={formData.autoOrder?.dinnerCronTime}
              onChangeText={(value) => updateField('autoOrder', 'dinnerCronTime', value)}
              placeholder="19:00"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Addon Payment Window (Minutes)</Text>
            <TextInput
              value={formData.autoOrder?.addonPaymentWindowMinutes?.toString()}
              onChangeText={(value) => updateField('autoOrder', 'addonPaymentWindowMinutes', parseInt(value) || 0)}
              placeholder="30"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>
        </Card>
      </View>

      {/* Scheduled Meals Settings */}
      <View className="px-4 pb-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-4">
            <Icon name="event" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Scheduled Meals</Text>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-sm font-medium text-gray-700">Scheduled Meals Enabled</Text>
            <TouchableOpacity
              onPress={() => updateField('scheduledMeals', 'enabled', !formData.scheduledMeals?.enabled)}
              className={`w-12 h-6 rounded-full ${formData.scheduledMeals?.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${formData.scheduledMeals?.enabled ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Max Scheduled Meals</Text>
            <TextInput
              value={formData.scheduledMeals?.maxScheduledMeals?.toString()}
              onChangeText={(value) => updateField('scheduledMeals', 'maxScheduledMeals', parseInt(value) || 0)}
              placeholder="14"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Max Schedule Days Ahead</Text>
            <TextInput
              value={formData.scheduledMeals?.maxScheduleDaysAhead?.toString()}
              onChangeText={(value) => updateField('scheduledMeals', 'maxScheduleDaysAhead', parseInt(value) || 0)}
              placeholder="7"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>
        </Card>
      </View>

      {/* Notifications */}
      <View className="px-4 pb-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-4">
            <Icon name="notifications" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Notifications</Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-medium text-gray-700">New Order Alerts</Text>
              <Text className="text-xs text-gray-500 mt-1">
                Notify admins on every new order (manual, auto & scheduled)
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => updateField('adminNotifications', 'newOrderEnabled', !formData.adminNotifications?.newOrderEnabled)}
              className={`w-12 h-6 rounded-full ${formData.adminNotifications?.newOrderEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${formData.adminNotifications?.newOrderEnabled ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
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
  );
};

export default SystemConfigScreen;