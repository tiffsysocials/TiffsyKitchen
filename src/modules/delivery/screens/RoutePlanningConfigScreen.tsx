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
import { GradientBox } from '../../../components/common/GradientBox';
import adminDashboardService from '../../../services/admin-dashboard.service';
import { Card } from '../../../components/common/Card';
import { useAlert } from '../../../hooks/useAlert';
import { useNavigation } from '../../../context/NavigationContext';

interface RoutePlanningForm {
  enabled: boolean;
  useOsrm: boolean;
  osrmServerUrl: string;
  clusteringEpsilonMeters: number;
  maxOrdersPerBatch: number;
  optimizationAlgorithm: string;
  etaRecalcIntervalSeconds: number;
  haversineRoadFactor: number;
  osrmTimeoutMs: number;
  cacheExpiryMinutes: number;
}

const DEFAULT_FORM: RoutePlanningForm = {
  enabled: false,
  useOsrm: false,
  osrmServerUrl: '',
  clusteringEpsilonMeters: 1500,
  maxOrdersPerBatch: 8,
  optimizationAlgorithm: 'auto',
  etaRecalcIntervalSeconds: 60,
  haversineRoadFactor: 1.4,
  osrmTimeoutMs: 10000,
  cacheExpiryMinutes: 60,
};

const algorithmOptions = [
  { value: 'auto', label: 'Auto (Recommended)' },
  { value: 'brute_force', label: 'Brute Force' },
  { value: 'two_opt', label: '2-Opt' },
  { value: 'nearest_neighbor', label: 'Nearest Neighbor' },
];

const RoutePlanningConfigScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();
  const { goBack } = useNavigation();

  console.log('[RoutePlanning] Screen mounted');

  const { data: config, isLoading, isError, error, status, fetchStatus } = useQuery({
    queryKey: ['systemConfig'],
    queryFn: async () => {
      console.log('[RoutePlanning] useQuery queryFn executing...');
      try {
        const result = await adminDashboardService.getSystemConfig();
        console.log('[RoutePlanning] queryFn result:', JSON.stringify(result, null, 2));
        console.log('[RoutePlanning] routePlanning in result:', JSON.stringify(result?.routePlanning, null, 2));
        return result;
      } catch (err: any) {
        console.error('[RoutePlanning] queryFn ERROR:', err);
        console.error('[RoutePlanning] queryFn error message:', err?.message);
        throw err;
      }
    },
  });

  console.log('[RoutePlanning] Query state:', { status, fetchStatus, isLoading, isError, hasConfig: !!config });
  if (isError) {
    console.error('[RoutePlanning] Query error:', error);
  }
  if (config) {
    console.log('[RoutePlanning] config received, routePlanning:', JSON.stringify(config?.routePlanning, null, 2));
  }

  const [formData, setFormData] = useState<RoutePlanningForm>(DEFAULT_FORM);

  useEffect(() => {
    console.log('[RoutePlanning] useEffect triggered, config:', !!config, 'routePlanning:', !!config?.routePlanning);
    if (config?.routePlanning) {
      const merged = { ...DEFAULT_FORM, ...config.routePlanning };
      console.log('[RoutePlanning] Setting formData:', JSON.stringify(merged, null, 2));
      setFormData(merged);
    } else {
      console.log('[RoutePlanning] No routePlanning in config, using defaults');
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async (data: RoutePlanningForm) => {
      console.log('[RoutePlanning] Mutation executing with data:', JSON.stringify(data, null, 2));
      try {
        const result = await adminDashboardService.updateSystemConfig({ routePlanning: data });
        console.log('[RoutePlanning] Mutation result:', JSON.stringify(result, null, 2));
        return result;
      } catch (err: any) {
        console.error('[RoutePlanning] Mutation ERROR:', err);
        console.error('[RoutePlanning] Mutation error message:', err?.message);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log('[RoutePlanning] Mutation onSuccess, data:', JSON.stringify(data, null, 2));
      queryClient.invalidateQueries({ queryKey: ['systemConfig'] });
      showSuccess('Success', 'Route planning configuration updated');
    },
    onError: (err: any) => {
      console.error('[RoutePlanning] Mutation onError:', err);
      console.error('[RoutePlanning] Mutation onError message:', err?.message);
      showError('Error', 'Failed to update route planning configuration');
    },
  });

  const handleSave = () => {
    console.log('[RoutePlanning] handleSave pressed, formData:', JSON.stringify(formData, null, 2));
    updateMutation.mutate(formData);
  };

  const updateField = (field: keyof RoutePlanningForm, value: any) => {
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
          <Text className="text-white text-xl font-semibold">Route Planning</Text>
        </GradientBox>
        <View className="flex-1 justify-center items-center bg-gray-50 p-4">
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text className="text-red-600 text-lg font-semibold mt-2">Failed to load config</Text>
          <Text className="text-gray-500 text-sm mt-1 text-center">
            {(error as any)?.message || JSON.stringify(error)}
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
        <Text className="text-white text-xl font-semibold">Route Planning</Text>
      </GradientBox>

      <ScrollView className="flex-1">
        {/* Master Toggle */}
        <View className="p-4">
          <Card className="p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Icon name="route" size={24} color="#FE8733" />
                <Text className="text-lg font-semibold text-gray-800 ml-2">Enable Route Planning</Text>
              </View>
              <TouchableOpacity
                onPress={() => updateField('enabled', !formData.enabled)}
                className={`w-12 h-6 rounded-full ${formData.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${formData.enabled ? 'self-end' : 'self-start'}`} />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-gray-500 mt-2">
              When OFF, batching uses simple FIFO grouping
            </Text>
          </Card>
        </View>

        {/* Algorithm Settings */}
        <View className="px-4 pb-4">
          <Card className="p-4">
            <View className="flex-row items-center mb-4">
              <Icon name="tune" size={24} color="#FE8733" />
              <Text className="text-lg font-semibold text-gray-800 ml-2">Algorithm Settings</Text>
            </View>

            {/* Optimization Algorithm */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Optimization Algorithm</Text>
            {algorithmOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => updateField('optimizationAlgorithm', option.value)}
                className={`flex-row items-center p-3 mb-2 rounded-lg border ${
                  formData.optimizationAlgorithm === option.value
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View
                  className={`w-5 h-5 rounded-full border-2 mr-3 ${
                    formData.optimizationAlgorithm === option.value
                      ? 'border-orange-500'
                      : 'border-gray-300'
                  }`}
                >
                  {formData.optimizationAlgorithm === option.value && (
                    <View className="w-3 h-3 rounded-full bg-orange-500 m-0.5" />
                  )}
                </View>
                <Text
                  className={`text-base ${
                    formData.optimizationAlgorithm === option.value
                      ? 'text-orange-800 font-semibold'
                      : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Max Orders Per Batch */}
            <View className="mt-4 mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Max Orders Per Batch</Text>
              <TextInput
                value={formData.maxOrdersPerBatch?.toString()}
                onChangeText={(v) => updateField('maxOrdersPerBatch', parseInt(v) || 3)}
                placeholder="8"
                keyboardType="numeric"
                className="bg-gray-100 p-3 rounded-lg text-gray-800"
              />
              <Text className="text-xs text-gray-500 mt-1">Range: 3-20</Text>
            </View>

            {/* Clustering Radius */}
            <View>
              <View className="flex-row justify-between mb-1">
                <Text className="text-sm font-medium text-gray-700">Clustering Radius (m)</Text>
                <Text className="text-sm font-bold text-gray-800">{formData.clusteringEpsilonMeters}</Text>
              </View>
              <Slider
                value={formData.clusteringEpsilonMeters}
                onValueChange={(v) => updateField('clusteringEpsilonMeters', Math.round(v / 100) * 100)}
                minimumValue={500}
                maximumValue={5000}
                step={100}
                minimumTrackTintColor="#FE8733"
                maximumTrackTintColor="#d1d5db"
                thumbTintColor="#FE8733"
              />
              <View className="flex-row justify-between">
                <Text className="text-xs text-gray-500">500m</Text>
                <Text className="text-xs text-gray-500">5000m</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Distance Calculation */}
        <View className="px-4 pb-4">
          <Card className="p-4">
            <View className="flex-row items-center mb-4">
              <Icon name="straighten" size={24} color="#FE8733" />
              <Text className="text-lg font-semibold text-gray-800 ml-2">Distance Calculation</Text>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Road Distance Factor</Text>
              <TextInput
                value={formData.haversineRoadFactor?.toString()}
                onChangeText={(v) => updateField('haversineRoadFactor', parseFloat(v) || 1.1)}
                placeholder="1.4"
                keyboardType="decimal-pad"
                className="bg-gray-100 p-3 rounded-lg text-gray-800"
              />
              <Text className="text-xs text-gray-500 mt-1">
                Multiplier for straight-line to road distance (1.1 - 2.0)
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">ETA Recalculation (sec)</Text>
              <TextInput
                value={formData.etaRecalcIntervalSeconds?.toString()}
                onChangeText={(v) => updateField('etaRecalcIntervalSeconds', parseInt(v) || 15)}
                placeholder="60"
                keyboardType="numeric"
                className="bg-gray-100 p-3 rounded-lg text-gray-800"
              />
              <Text className="text-xs text-gray-500 mt-1">Range: 15-300</Text>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Cache Duration (min)</Text>
              <TextInput
                value={formData.cacheExpiryMinutes?.toString()}
                onChangeText={(v) => updateField('cacheExpiryMinutes', parseInt(v) || 15)}
                placeholder="60"
                keyboardType="numeric"
                className="bg-gray-100 p-3 rounded-lg text-gray-800"
              />
              <Text className="text-xs text-gray-500 mt-1">Range: 15-1440</Text>
            </View>
          </Card>
        </View>

        {/* OSRM (Advanced) */}
        <View className="px-4 pb-4">
          <Card className="p-4">
            <View className="flex-row items-center mb-4">
              <Icon name="cloud" size={24} color="#FE8733" />
              <Text className="text-lg font-semibold text-gray-800 ml-2">OSRM (Advanced)</Text>
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-sm font-medium text-gray-700">Use OSRM Server</Text>
              <TouchableOpacity
                onPress={() => updateField('useOsrm', !formData.useOsrm)}
                className={`w-12 h-6 rounded-full ${formData.useOsrm ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${formData.useOsrm ? 'self-end' : 'self-start'}`} />
              </TouchableOpacity>
            </View>

            {formData.useOsrm && (
              <>
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">OSRM Server URL</Text>
                  <TextInput
                    value={formData.osrmServerUrl}
                    onChangeText={(v) => updateField('osrmServerUrl', v)}
                    placeholder="http://router.project-osrm.org"
                    className="bg-gray-100 p-3 rounded-lg text-gray-800"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">OSRM Timeout (ms)</Text>
                  <TextInput
                    value={formData.osrmTimeoutMs?.toString()}
                    onChangeText={(v) => updateField('osrmTimeoutMs', parseInt(v) || 3000)}
                    placeholder="10000"
                    keyboardType="numeric"
                    className="bg-gray-100 p-3 rounded-lg text-gray-800"
                  />
                  <Text className="text-xs text-gray-500 mt-1">Range: 3000-30000</Text>
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
              <Text className="text-white font-semibold text-center text-lg">Save Settings</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaScreen>
  );
};

export default RoutePlanningConfigScreen;
