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

interface GeofencingForm {
  enabled: boolean;
  defaultAutoAcceptRadiusKm: number;
  defaultMaxDeliveryRadiusKm: number;
  kitchenAcceptanceTimeoutMinutes: number;
  autoRejectOnTimeout: boolean;
  refundOnAutoReject: boolean;
}

const DEFAULT_FORM: GeofencingForm = {
  enabled: false,
  defaultAutoAcceptRadiusKm: 5,
  defaultMaxDeliveryRadiusKm: 10,
  kitchenAcceptanceTimeoutMinutes: 5,
  autoRejectOnTimeout: true,
  refundOnAutoReject: true,
};

const GeofencingConfigScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();
  const { goBack } = useNavigation();

  const { data: config, isLoading, isError, error } = useQuery({
    queryKey: ['systemConfig'],
    queryFn: async () => {
      const result = await adminDashboardService.getSystemConfig();
      return result;
    },
  });

  const [formData, setFormData] = useState<GeofencingForm>(DEFAULT_FORM);

  useEffect(() => {
    if (config?.geofencing) {
      setFormData({ ...DEFAULT_FORM, ...config.geofencing });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async (data: GeofencingForm) => {
      return await adminDashboardService.updateSystemConfig({ geofencing: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemConfig'] });
      showSuccess('Success', 'Geofencing configuration updated');
    },
    onError: () => {
      showError('Error', 'Failed to update geofencing configuration');
    },
  });

  const handleSave = () => {
    if (formData.defaultAutoAcceptRadiusKm > formData.defaultMaxDeliveryRadiusKm) {
      showError('Validation Error', 'Auto-accept radius must be less than or equal to max delivery radius');
      return;
    }
    updateMutation.mutate(formData);
  };

  const updateField = (field: keyof GeofencingForm, value: any) => {
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
          <Text className="text-white text-xl font-semibold">Geofencing</Text>
        </GradientBox>
        <View className="flex-1 justify-center items-center bg-gray-50 p-4">
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text className="text-red-600 text-lg font-semibold mt-2">Failed to load config</Text>
          <Text className="text-gray-500 text-sm mt-1 text-center">
            {(error as any)?.message || 'Unknown error'}
          </Text>
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
      {/* Header */}
      <GradientBox style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={goBack} className="mr-4">
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-semibold">Geofencing</Text>
      </GradientBox>

      <ScrollView className="flex-1">
        {/* Master Toggle */}
        <View className="p-4">
          <Card className="p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Icon name="my-location" size={24} color="#FE8733" />
                <Text className="text-lg font-semibold text-gray-800 ml-2">Enable Geofencing</Text>
              </View>
              <TouchableOpacity
                onPress={() => updateField('enabled', !formData.enabled)}
                className={`w-12 h-6 rounded-full ${formData.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${formData.enabled ? 'self-end' : 'self-start'}`} />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-gray-500 mt-2">
              When OFF, all orders use zone-based matching regardless of distance
            </Text>
          </Card>
        </View>

        {/* Default Radii */}
        <View className="px-4 pb-4">
          <Card className="p-4">
            <View className="flex-row items-center mb-4">
              <Icon name="radar" size={24} color="#FE8733" />
              <Text className="text-lg font-semibold text-gray-800 ml-2">Default Radii</Text>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Auto-Accept Radius (km)</Text>
              <TextInput
                value={formData.defaultAutoAcceptRadiusKm?.toString()}
                onChangeText={(v) => updateField('defaultAutoAcceptRadiusKm', parseFloat(v) || 1)}
                placeholder="5"
                keyboardType="decimal-pad"
                className="bg-gray-100 p-3 rounded-lg text-gray-800"
              />
              <Text className="text-xs text-gray-500 mt-1">
                Orders within this radius are auto-accepted (Range: 1-50 km)
              </Text>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Max Delivery Radius (km)</Text>
              <TextInput
                value={formData.defaultMaxDeliveryRadiusKm?.toString()}
                onChangeText={(v) => updateField('defaultMaxDeliveryRadiusKm', parseFloat(v) || 1)}
                placeholder="10"
                keyboardType="decimal-pad"
                className="bg-gray-100 p-3 rounded-lg text-gray-800"
              />
              <Text className="text-xs text-gray-500 mt-1">
                Orders beyond this radius are rejected. Must be {'>='} auto-accept radius (Range: 1-50 km)
              </Text>
            </View>
          </Card>
        </View>

        {/* Kitchen Acceptance Settings */}
        <View className="px-4 pb-4">
          <Card className="p-4">
            <View className="flex-row items-center mb-4">
              <Icon name="timer" size={24} color="#FE8733" />
              <Text className="text-lg font-semibold text-gray-800 ml-2">Kitchen Acceptance</Text>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Acceptance Timeout (minutes)</Text>
              <TextInput
                value={formData.kitchenAcceptanceTimeoutMinutes?.toString()}
                onChangeText={(v) => updateField('kitchenAcceptanceTimeoutMinutes', parseInt(v) || 1)}
                placeholder="5"
                keyboardType="numeric"
                className="bg-gray-100 p-3 rounded-lg text-gray-800"
              />
              <Text className="text-xs text-gray-500 mt-1">
                Time for kitchen to accept/reject orders in the manual zone (Range: 1-60 min)
              </Text>
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-sm font-medium text-gray-700">Auto-Reject on Timeout</Text>
                <Text className="text-xs text-gray-500 mt-1">
                  Automatically reject orders when kitchen doesn't respond
                </Text>
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
                  <Text className="text-xs text-gray-500 mt-1">
                    Issue refund when order is auto-rejected due to timeout
                  </Text>
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
              <Text className="text-white font-semibold text-center text-lg">Save Settings</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaScreen>
  );
};

export default GeofencingConfigScreen;
