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
import adminDashboardService, { SystemConfig } from '../../../services/admin-dashboard.service';
import { Card } from '../../../components/common/Card';
import { useAlert } from '../../../hooks/useAlert';
import { GradientBox } from '../../../components/common/GradientBox';

interface OrderChargesScreenProps {
  onMenuPress?: () => void;
}

const OrderChargesScreen: React.FC<OrderChargesScreenProps> = ({ onMenuPress }) => {
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
      showSuccess('Success', 'Order charges updated successfully');
    },
    onError: () => {
      showError('Error', 'Failed to update order charges');
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ fees: formData.fees } as Partial<SystemConfig>);
  };

  const updateFee = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      fees: {
        ...(prev.fees as any),
        [field]: value,
      },
    }));
  };

  const updateNestedFee = (parent: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      fees: {
        ...(prev.fees as any),
        [parent]: {
          ...((prev.fees as any)?.[parent] || {}),
          [field]: value,
        },
      },
    }));
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

  const fees = formData.fees as any;

  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
      {/* Header */}
      <GradientBox style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onMenuPress} className="mr-4">
          <Icon name="menu" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-semibold">Order Charges</Text>
      </GradientBox>

      <ScrollView className="flex-1">
      {/* Basic Charges */}
      <View className="px-4 pb-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-4">
            <Icon name="attach-money" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Basic Charges</Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Delivery Fee (₹)</Text>
            <TextInput
              value={fees?.deliveryFee?.toString()}
              onChangeText={(value) => updateFee('deliveryFee', parseFloat(value) || 0)}
              placeholder="30"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Service Fee (₹)</Text>
            <TextInput
              value={fees?.serviceFee?.toString()}
              onChangeText={(value) => updateFee('serviceFee', parseFloat(value) || 0)}
              placeholder="5"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Packaging Fee (₹)</Text>
            <TextInput
              value={fees?.packagingFee?.toString()}
              onChangeText={(value) => updateFee('packagingFee', parseFloat(value) || 0)}
              placeholder="10"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Handling Fee (₹)</Text>
            <TextInput
              value={fees?.handlingFee?.toString()}
              onChangeText={(value) => updateFee('handlingFee', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Platform Fee (₹)</Text>
            <TextInput
              value={fees?.platformFee?.toString()}
              onChangeText={(value) => updateFee('platformFee', parseFloat(value) || 0)}
              placeholder="0"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
            <Text className="text-xs text-gray-400 mt-1">Set to 0 to disable</Text>
          </View>
        </Card>
      </View>

      {/* Tax */}
      <View className="px-4 pb-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-4">
            <Icon name="receipt" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Tax</Text>
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</Text>
            <TextInput
              value={(fees?.taxRate ? fees.taxRate * 100 : 0).toString()}
              onChangeText={(value) => updateFee('taxRate', (parseFloat(value) || 0) / 100)}
              placeholder="5"
              keyboardType="numeric"
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
            />
            <Text className="text-xs text-gray-400 mt-1">
              Applied to: subtotal + service fee + packaging fee + platform fee + surge fee
            </Text>
          </View>
        </Card>
      </View>

      {/* Surge Pricing */}
      <View className="px-4 pb-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-4">
            <Icon name="trending-up" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Surge Pricing</Text>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-sm font-medium text-gray-700">Enabled</Text>
            <TouchableOpacity
              onPress={() => updateNestedFee('surgePricing', 'enabled', !fees?.surgePricing?.enabled)}
              className={`w-12 h-6 rounded-full ${fees?.surgePricing?.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${fees?.surgePricing?.enabled ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>

          {fees?.surgePricing?.enabled && (
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Surge Amount (₹)</Text>
              <TextInput
                value={fees?.surgePricing?.amount?.toString()}
                onChangeText={(value) => updateNestedFee('surgePricing', 'amount', parseFloat(value) || 0)}
                placeholder="0"
                keyboardType="numeric"
                className="bg-gray-100 p-3 rounded-lg text-gray-800"
              />
              <Text className="text-xs text-gray-400 mt-1">Flat surcharge added to every order while enabled</Text>
            </View>
          )}
        </Card>
      </View>

      {/* Small Order Fee */}
      <View className="px-4 pb-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-4">
            <Icon name="shopping-cart" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Small Order Fee</Text>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-sm font-medium text-gray-700">Enabled</Text>
            <TouchableOpacity
              onPress={() => updateNestedFee('smallOrderFee', 'enabled', !fees?.smallOrderFee?.enabled)}
              className={`w-12 h-6 rounded-full ${fees?.smallOrderFee?.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${fees?.smallOrderFee?.enabled ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>

          {fees?.smallOrderFee?.enabled && (
            <>
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">Minimum Order Amount (₹)</Text>
                <TextInput
                  value={fees?.smallOrderFee?.minOrderAmount?.toString()}
                  onChangeText={(value) => updateNestedFee('smallOrderFee', 'minOrderAmount', parseFloat(value) || 0)}
                  placeholder="100"
                  keyboardType="numeric"
                  className="bg-gray-100 p-3 rounded-lg text-gray-800"
                />
                <Text className="text-xs text-gray-400 mt-1">Fee applies when order subtotal is below this amount</Text>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Fee Amount (₹)</Text>
                <TextInput
                  value={fees?.smallOrderFee?.amount?.toString()}
                  onChangeText={(value) => updateNestedFee('smallOrderFee', 'amount', parseFloat(value) || 0)}
                  placeholder="20"
                  keyboardType="numeric"
                  className="bg-gray-100 p-3 rounded-lg text-gray-800"
                />
              </View>
            </>
          )}
        </Card>
      </View>

      {/* Late Night Fee */}
      <View className="px-4 pb-4">
        <Card className="p-4">
          <View className="flex-row items-center mb-4">
            <Icon name="nightlight-round" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Late Night Fee</Text>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-sm font-medium text-gray-700">Enabled</Text>
            <TouchableOpacity
              onPress={() => updateNestedFee('lateNightFee', 'enabled', !fees?.lateNightFee?.enabled)}
              className={`w-12 h-6 rounded-full ${fees?.lateNightFee?.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${fees?.lateNightFee?.enabled ? 'self-end' : 'self-start'}`} />
            </TouchableOpacity>
          </View>

          {fees?.lateNightFee?.enabled && (
            <>
              <View className="flex-row mb-4">
                <View className="flex-1 mr-2">
                  <Text className="text-sm font-medium text-gray-700 mb-2">Start Hour (0-23)</Text>
                  <TextInput
                    value={fees?.lateNightFee?.startHour?.toString()}
                    onChangeText={(value) => updateNestedFee('lateNightFee', 'startHour', parseInt(value) || 0)}
                    placeholder="22"
                    keyboardType="numeric"
                    className="bg-gray-100 p-3 rounded-lg text-gray-800"
                  />
                </View>
                <View className="flex-1 ml-2">
                  <Text className="text-sm font-medium text-gray-700 mb-2">End Hour (0-23)</Text>
                  <TextInput
                    value={fees?.lateNightFee?.endHour?.toString()}
                    onChangeText={(value) => updateNestedFee('lateNightFee', 'endHour', parseInt(value) || 0)}
                    placeholder="6"
                    keyboardType="numeric"
                    className="bg-gray-100 p-3 rounded-lg text-gray-800"
                  />
                </View>
              </View>
              <Text className="text-xs text-gray-400 mb-4">
                e.g., Start 22 End 6 = 10 PM to 6 AM (overnight window supported)
              </Text>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Fee Amount (₹)</Text>
                <TextInput
                  value={fees?.lateNightFee?.amount?.toString()}
                  onChangeText={(value) => updateNestedFee('lateNightFee', 'amount', parseFloat(value) || 0)}
                  placeholder="15"
                  keyboardType="numeric"
                  className="bg-gray-100 p-3 rounded-lg text-gray-800"
                />
              </View>
            </>
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
            <Text className="text-white font-semibold text-center text-lg">Save Charges</Text>
          )}
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaScreen>
  );
};

export default OrderChargesScreen;
