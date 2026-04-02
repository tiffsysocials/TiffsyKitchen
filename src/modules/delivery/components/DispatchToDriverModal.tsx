import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { deliveryService } from '../../../services/delivery.service';
import { useAlert } from '../../../hooks/useAlert';

interface Props {
  visible: boolean;
  batchId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const DispatchToDriverModal: React.FC<Props> = ({ visible, batchId, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const { data: driversResponse, isLoading } = useQuery({
    queryKey: ['availableDrivers'],
    queryFn: () => deliveryService.getAvailableDrivers(),
    enabled: visible,
  });

  const drivers = driversResponse?.data?.users || driversResponse?.error?.users || [];

  const dispatchMutation = useMutation({
    mutationFn: () =>
      deliveryService.dispatchBatchToDriver(batchId, {
        driverId: selectedDriverId!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchDetail', batchId] });
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      showSuccess('Success', 'Batch dispatched to driver');
      setSelectedDriverId(null);
      onSuccess();
    },
    onError: (error: any) => {
      showError('Error', error?.message || 'Failed to dispatch batch');
    },
  });

  const canSubmit = !!selectedDriverId;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-2xl max-h-[80%]">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-800">Dispatch to Driver</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Info banner */}
          <View className="p-4 border-b border-gray-100">
            <View className="bg-blue-50 p-3 rounded-lg">
              <Text className="text-sm text-blue-700">
                This will dispatch the batch and assign it directly to the selected driver.
              </Text>
            </View>
          </View>

          {/* Driver List */}
          <Text className="text-sm font-medium text-gray-700 px-4 pt-4 pb-2">Select Driver</Text>
          {isLoading ? (
            <View className="p-8 items-center">
              <ActivityIndicator color="#FE8733" />
            </View>
          ) : (
            <FlatList
              data={drivers}
              keyExtractor={(item: any) => item._id}
              className="max-h-64"
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity
                  onPress={() => setSelectedDriverId(item._id)}
                  className={`flex-row items-center p-4 border-b border-gray-100 ${
                    selectedDriverId === item._id ? 'bg-green-50' : ''
                  }`}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 mr-3 ${
                      selectedDriverId === item._id ? 'border-green-600' : 'border-gray-300'
                    }`}
                  >
                    {selectedDriverId === item._id && (
                      <View className="w-3 h-3 rounded-full bg-green-600 m-0.5" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-base text-gray-800">{item.name}</Text>
                    <Text className="text-xs text-gray-500">{item.phone}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text className="text-center text-gray-400 p-8">No available drivers</Text>
              }
            />
          )}

          {/* Actions */}
          <View className="flex-row p-4 border-t border-gray-200">
            <TouchableOpacity onPress={onClose} className="flex-1 py-3 mr-2 rounded-lg border border-gray-300">
              <Text className="text-center text-gray-700 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => dispatchMutation.mutate()}
              disabled={!canSubmit || dispatchMutation.isPending}
              className={`flex-1 py-3 ml-2 rounded-lg ${canSubmit && !dispatchMutation.isPending ? 'bg-green-600' : 'bg-gray-300'}`}
            >
              {dispatchMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-white font-semibold">Dispatch</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default DispatchToDriverModal;
