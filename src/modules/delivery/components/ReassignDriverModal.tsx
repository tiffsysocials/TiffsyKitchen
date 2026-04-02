import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, FlatList, ActivityIndicator } from 'react-native';
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

const ReassignDriverModal: React.FC<Props> = ({ visible, batchId, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const { data: driversResponse, isLoading } = useQuery({
    queryKey: ['availableDrivers'],
    queryFn: () => deliveryService.getAvailableDrivers(),
    enabled: visible,
  });

  const drivers = driversResponse?.data?.users || driversResponse?.error?.users || [];

  const reassignMutation = useMutation({
    mutationFn: () =>
      deliveryService.reassignBatchDriver(batchId, {
        driverId: selectedDriverId!,
        reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchDetail', batchId] });
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      showSuccess('Success', 'Driver reassigned successfully');
      setSelectedDriverId(null);
      setReason('');
      onSuccess();
    },
    onError: (error: any) => {
      showError('Error', error?.message || 'Failed to reassign driver');
    },
  });

  const canSubmit = selectedDriverId && reason.length >= 5 && reason.length <= 200;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-2xl max-h-[80%]">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-800">Reassign Driver</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Reason Input */}
          <View className="p-4 border-b border-gray-100">
            <Text className="text-sm font-medium text-gray-700 mb-2">Reason for reassignment</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g., Driver reported vehicle breakdown"
              multiline
              numberOfLines={2}
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
              maxLength={200}
            />
            <Text className="text-xs text-gray-400 mt-1">{reason.length}/200 (min 5 chars)</Text>
          </View>

          {/* Driver List */}
          <Text className="text-sm font-medium text-gray-700 px-4 pt-4 pb-2">Select New Driver</Text>
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
                    selectedDriverId === item._id ? 'bg-orange-50' : ''
                  }`}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 mr-3 ${
                      selectedDriverId === item._id ? 'border-orange-500' : 'border-gray-300'
                    }`}
                  >
                    {selectedDriverId === item._id && (
                      <View className="w-3 h-3 rounded-full bg-orange-500 m-0.5" />
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
              onPress={() => reassignMutation.mutate()}
              disabled={!canSubmit || reassignMutation.isPending}
              className={`flex-1 py-3 ml-2 rounded-lg ${canSubmit && !reassignMutation.isPending ? 'bg-orange-500' : 'bg-gray-300'}`}
            >
              {reassignMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-white font-semibold">Reassign</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ReassignDriverModal;
