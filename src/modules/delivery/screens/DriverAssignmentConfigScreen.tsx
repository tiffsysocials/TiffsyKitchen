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
import ScoringWeightsSliders from '../components/ScoringWeightsSliders';

interface DriverAssignmentForm {
  enabled: boolean;
  mode: string;
  broadcastDriverCount: number;
  broadcastTimeoutSeconds: number;
  scoringWeights: {
    proximity: number;
    completionRate: number;
    activeLoad: number;
    recency: number;
  };
  maxDriverSearchRadiusMeters: number;
  autoReassignOnTimeout: boolean;
  manualAssignmentEnabled: boolean;
}

const DEFAULT_FORM: DriverAssignmentForm = {
  enabled: false,
  mode: 'SELF_ACCEPT',
  broadcastDriverCount: 3,
  broadcastTimeoutSeconds: 60,
  scoringWeights: {
    proximity: 40,
    completionRate: 25,
    activeLoad: 20,
    recency: 15,
  },
  maxDriverSearchRadiusMeters: 10000,
  autoReassignOnTimeout: true,
  manualAssignmentEnabled: true,
};

const modeOptions = [
  { value: 'SELF_ACCEPT', label: 'Self Accept', description: 'Drivers browse and pick batches' },
  { value: 'AUTO_ASSIGNMENT', label: 'Auto Assign', description: 'System picks the best driver' },
  { value: 'SMART_BROADCAST', label: 'Broadcast', description: 'Notify top drivers, first to accept wins' },
  { value: 'MANUAL', label: 'Manual', description: 'Admin assigns each batch' },
];

const DriverAssignmentConfigScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();
  const { goBack } = useNavigation();

  const { data: config, isLoading } = useQuery({
    queryKey: ['systemConfig'],
    queryFn: () => adminDashboardService.getSystemConfig(),
  });

  const [formData, setFormData] = useState<DriverAssignmentForm>(DEFAULT_FORM);

  useEffect(() => {
    if (config?.driverAssignment) {
      setFormData({ ...DEFAULT_FORM, ...config.driverAssignment });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (data: DriverAssignmentForm) =>
      adminDashboardService.updateSystemConfig({ driverAssignment: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemConfig'] });
      showSuccess('Success', 'Driver assignment configuration updated');
    },
    onError: () => {
      showError('Error', 'Failed to update driver assignment configuration');
    },
  });

  const weightsTotal =
    formData.scoringWeights.proximity +
    formData.scoringWeights.completionRate +
    formData.scoringWeights.activeLoad +
    formData.scoringWeights.recency;

  const handleSave = () => {
    if (weightsTotal !== 100) {
      showError('Validation Error', 'Scoring weights must sum to exactly 100');
      return;
    }
    updateMutation.mutate(formData);
  };

  const updateField = (field: keyof DriverAssignmentForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
        <View className="flex-1 justify-center items-center bg-gray-50">
          <ActivityIndicator size="large" color="#FE8733" />
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
        <Text className="text-white text-xl font-semibold">Driver Assignment</Text>
      </GradientBox>

      <ScrollView className="flex-1">
        {/* Master Toggle */}
        <View className="p-4">
          <Card className="p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Icon name="person-pin" size={24} color="#FE8733" />
                <Text className="text-lg font-semibold text-gray-800 ml-2">Enable Smart Assignment</Text>
              </View>
              <TouchableOpacity
                onPress={() => updateField('enabled', !formData.enabled)}
                className={`w-12 h-6 rounded-full ${formData.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${formData.enabled ? 'self-end' : 'self-start'}`} />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-gray-500 mt-2">
              When OFF, uses basic Self Accept mode
            </Text>
          </Card>
        </View>

        {/* Assignment Mode */}
        <View className="px-4 pb-4">
          <Card className="p-4">
            <View className="flex-row items-center mb-4">
              <Icon name="swap-horiz" size={24} color="#FE8733" />
              <Text className="text-lg font-semibold text-gray-800 ml-2">Assignment Mode</Text>
            </View>

            {modeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => updateField('mode', option.value)}
                className={`flex-row items-center p-3 mb-2 rounded-lg border ${
                  formData.mode === option.value
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <View
                  className={`w-5 h-5 rounded-full border-2 mr-3 ${
                    formData.mode === option.value
                      ? 'border-orange-500'
                      : 'border-gray-300'
                  }`}
                >
                  {formData.mode === option.value && (
                    <View className="w-3 h-3 rounded-full bg-orange-500 m-0.5" />
                  )}
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-base ${
                      formData.mode === option.value
                        ? 'text-orange-800 font-semibold'
                        : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </Text>
                  <Text className="text-xs text-gray-500">{option.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        </View>

        {/* Scoring Weights */}
        <View className="px-4 pb-4">
          <Card className="p-4">
            <View className="flex-row items-center mb-4">
              <Icon name="speed" size={24} color="#FE8733" />
              <Text className="text-lg font-semibold text-gray-800 ml-2">Scoring Weights</Text>
            </View>
            <Text className="text-sm text-gray-500 mb-4">Must sum to exactly 100</Text>

            <ScoringWeightsSliders
              weights={formData.scoringWeights}
              onChange={(weights) => updateField('scoringWeights', weights)}
            />
          </Card>
        </View>

        {/* Broadcast Settings - only shown for SMART_BROADCAST */}
        {formData.mode === 'SMART_BROADCAST' && (
          <View className="px-4 pb-4">
            <Card className="p-4">
              <View className="flex-row items-center mb-4">
                <Icon name="cell-tower" size={24} color="#FE8733" />
                <Text className="text-lg font-semibold text-gray-800 ml-2">Broadcast Settings</Text>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">Drivers to Notify</Text>
                <TextInput
                  value={formData.broadcastDriverCount?.toString()}
                  onChangeText={(v) => updateField('broadcastDriverCount', parseInt(v) || 1)}
                  placeholder="3"
                  keyboardType="numeric"
                  className="bg-gray-100 p-3 rounded-lg text-gray-800"
                />
                <Text className="text-xs text-gray-500 mt-1">Range: 1-10</Text>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">Response Timeout (sec)</Text>
                <TextInput
                  value={formData.broadcastTimeoutSeconds?.toString()}
                  onChangeText={(v) => updateField('broadcastTimeoutSeconds', parseInt(v) || 30)}
                  placeholder="60"
                  keyboardType="numeric"
                  className="bg-gray-100 p-3 rounded-lg text-gray-800"
                />
                <Text className="text-xs text-gray-500 mt-1">Range: 30-300</Text>
              </View>

              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-gray-700">Auto-Reassign on Timeout</Text>
                <TouchableOpacity
                  onPress={() => updateField('autoReassignOnTimeout', !formData.autoReassignOnTimeout)}
                  className={`w-12 h-6 rounded-full ${formData.autoReassignOnTimeout ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${formData.autoReassignOnTimeout ? 'self-end' : 'self-start'}`} />
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        )}

        {/* General */}
        <View className="px-4 pb-4">
          <Card className="p-4">
            <View className="flex-row items-center mb-4">
              <Icon name="settings" size={24} color="#FE8733" />
              <Text className="text-lg font-semibold text-gray-800 ml-2">General</Text>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Driver Search Radius (m)</Text>
              <TextInput
                value={formData.maxDriverSearchRadiusMeters?.toString()}
                onChangeText={(v) => updateField('maxDriverSearchRadiusMeters', parseInt(v) || 1000)}
                placeholder="10000"
                keyboardType="numeric"
                className="bg-gray-100 p-3 rounded-lg text-gray-800"
              />
              <Text className="text-xs text-gray-500 mt-1">Range: 1000-50000</Text>
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-gray-700">Allow Manual Assignment</Text>
              <TouchableOpacity
                onPress={() => updateField('manualAssignmentEnabled', !formData.manualAssignmentEnabled)}
                className={`w-12 h-6 rounded-full ${formData.manualAssignmentEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${formData.manualAssignmentEnabled ? 'self-end' : 'self-start'}`} />
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Save Button */}
        <View className="p-4">
          <TouchableOpacity
            onPress={handleSave}
            disabled={updateMutation.isPending || weightsTotal !== 100}
            className={`py-4 rounded-lg ${
              updateMutation.isPending || weightsTotal !== 100 ? 'bg-gray-300' : 'bg-orange-500'
            }`}
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

export default DriverAssignmentConfigScreen;
