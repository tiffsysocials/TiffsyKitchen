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
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { GradientBox } from '../../../components/common/GradientBox';
import adminDashboardService from '../../../services/admin-dashboard.service';
import { Card } from '../../../components/common/Card';
import { useAlert } from '../../../hooks/useAlert';
import { useNavigation } from '../../../context/NavigationContext';

interface OrderAcceptanceForm {
  requireKitchenAcceptance: boolean;
  kitchenAcceptanceTimeoutMinutes: number;
  autoRejectOnTimeout: boolean;
  refundOnAutoReject: boolean;
}

const DEFAULT_FORM: OrderAcceptanceForm = {
  requireKitchenAcceptance: true,
  kitchenAcceptanceTimeoutMinutes: 5,
  autoRejectOnTimeout: true,
  refundOnAutoReject: true,
};

const OrderAcceptanceConfigScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();
  const { goBack } = useNavigation();

  const { data: config, isLoading, isError, error } = useQuery({
    queryKey: ['systemConfig'],
    queryFn: () => adminDashboardService.getSystemConfig(),
  });

  const [formData, setFormData] = useState<OrderAcceptanceForm>(DEFAULT_FORM);

  useEffect(() => {
    if (config?.orderAcceptance) {
      setFormData({ ...DEFAULT_FORM, ...(config.orderAcceptance as any) });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (data: OrderAcceptanceForm) =>
      adminDashboardService.updateSystemConfig({ orderAcceptance: data } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemConfig'] });
      showSuccess('Success', 'Order acceptance settings updated');
    },
    onError: () => {
      showError('Error', 'Failed to update order acceptance settings');
    },
  });

  const updateField = (field: keyof OrderAcceptanceForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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

  if (isError) {
    return (
      <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
        <GradientBox style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={goBack} className="mr-4">
            <Icon name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-semibold">Order Acceptance</Text>
        </GradientBox>
        <View className="flex-1 justify-center items-center bg-gray-50 p-4">
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text className="text-red-600 text-lg font-semibold mt-2">Failed to load config</Text>
          <Text className="text-gray-500 text-sm mt-1 text-center">{(error as any)?.message || 'Unknown error'}</Text>
          <TouchableOpacity
            onPress={() => queryClient.invalidateQueries({ queryKey: ['systemConfig'] })}
            className="mt-4 bg-orange-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
      <GradientBox style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={goBack} className="mr-4">
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-semibold">Order Acceptance</Text>
      </GradientBox>

      <ScrollView className="flex-1">
        {/* Require kitchen acceptance master toggle */}
        <View className="p-4">
          <Card className="p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <Icon name="how-to-reg" size={24} color="#FE8733" />
                <View className="ml-2 flex-1">
                  <Text className="text-lg font-semibold text-gray-800">Require Kitchen Acceptance</Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    When ON, every order waits for the kitchen to accept (or reject) it before proceeding.
                    When OFF, orders skip manual acceptance.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => updateField('requireKitchenAcceptance', !formData.requireKitchenAcceptance)}
                className={`w-12 h-6 rounded-full ${formData.requireKitchenAcceptance ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${formData.requireKitchenAcceptance ? 'self-end' : 'self-start'}`} />
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Timeout + auto-reject */}
        {formData.requireKitchenAcceptance && (
          <View className="px-4 pb-4">
            <Card className="p-4">
              <View className="flex-row items-center mb-4">
                <Icon name="timer" size={24} color="#FE8733" />
                <Text className="text-lg font-semibold text-gray-800 ml-2">Acceptance Timeout</Text>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">Timeout (minutes)</Text>
                <TextInput
                  value={formData.kitchenAcceptanceTimeoutMinutes?.toString()}
                  onChangeText={(v) => updateField('kitchenAcceptanceTimeoutMinutes', parseInt(v) || 1)}
                  placeholder="5"
                  keyboardType="numeric"
                  className="bg-gray-100 p-3 rounded-lg text-gray-800"
                />
                <Text className="text-xs text-gray-500 mt-1">
                  How long the kitchen has to accept/reject before timeout (Range: 1-60 min)
                </Text>
              </View>

              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1 mr-2">
                  <Text className="text-sm font-medium text-gray-700">Auto-Reject on Timeout</Text>
                  <Text className="text-xs text-gray-500 mt-1">Automatically reject orders the kitchen doesn't respond to.</Text>
                </View>
                <TouchableOpacity
                  onPress={() => updateField('autoRejectOnTimeout', !formData.autoRejectOnTimeout)}
                  className={`w-12 h-6 rounded-full ${formData.autoRejectOnTimeout ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${formData.autoRejectOnTimeout ? 'self-end' : 'self-start'}`} />
                </TouchableOpacity>
              </View>

              {formData.autoRejectOnTimeout && (
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-2">
                    <Text className="text-sm font-medium text-gray-700">Refund on Auto-Reject</Text>
                    <Text className="text-xs text-gray-500 mt-1">Issue a refund when an order is auto-rejected on timeout.</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => updateField('refundOnAutoReject', !formData.refundOnAutoReject)}
                    className={`w-12 h-6 rounded-full ${formData.refundOnAutoReject ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${formData.refundOnAutoReject ? 'self-end' : 'self-start'}`} />
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          </View>
        )}

        {/* Save */}
        <View className="p-4">
          <TouchableOpacity
            onPress={() => updateMutation.mutate(formData)}
            disabled={updateMutation.isPending}
            className={`py-4 rounded-lg ${updateMutation.isPending ? 'bg-gray-300' : 'bg-orange-500'}`}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-semibold text-center text-lg">Save Settings</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaScreen>
  );
};

export default OrderAcceptanceConfigScreen;
