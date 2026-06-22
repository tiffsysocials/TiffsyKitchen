import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { deliveryService } from '../../../services/delivery.service';
import { useAlert } from '../../../hooks/useAlert';

interface SelectedBatch {
  _id: string;
  batchNumber: string;
  orderCount: number;
}

interface Props {
  visible: boolean;
  batches: SelectedBatch[];
  onClose: () => void;
  onSuccess: () => void;
}

const AssignBatchesToDriverModal: React.FC<Props> = ({ visible, batches, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();
  const [ordered, setOrdered] = useState<SelectedBatch[]>(batches);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Re-sync the working order whenever the modal opens with a new selection.
  useEffect(() => {
    if (visible) setOrdered(batches);
  }, [visible, batches]);

  const { data: driversResponse, isLoading } = useQuery({
    queryKey: ['availableDrivers'],
    queryFn: () => deliveryService.getAvailableDrivers(),
    enabled: visible,
  });
  const drivers = driversResponse?.data?.users || driversResponse?.error?.users || [];

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    setOrdered(next);
  };

  const assignMutation = useMutation({
    mutationFn: () =>
      deliveryService.assignBatchesToDriver(
        selectedDriverId!,
        ordered.map((b) => b._id),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      showSuccess('Assigned', `${ordered.length} batches assigned to driver`);
      setSelectedDriverId(null);
      onSuccess();
    },
    onError: (error: any) => {
      showError('Error', error?.message || 'Failed to assign batches');
    },
  });

  const canSubmit = !!selectedDriverId && ordered.length >= 1 && !assignMutation.isPending;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-2xl max-h-[88%]">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-800">Assign Batches to Driver</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View className="p-4 border-b border-gray-100">
            <View className="bg-orange-50 p-3 rounded-lg">
              <Text className="text-sm text-gray-700">
                The driver will deliver these {ordered.length} batches in the order below.
                Reorder with the arrows.
              </Text>
            </View>
          </View>

          {/* Ordered batch list */}
          <Text className="text-sm font-medium text-gray-700 px-4 pt-3 pb-1">Delivery sequence</Text>
          <ScrollView style={{ maxHeight: 200 }}>
            {ordered.map((b, i) => (
              <View key={b._id} className="flex-row items-center px-4 py-2 border-b border-gray-100">
                <View className="w-6 h-6 rounded-full bg-primary items-center justify-center mr-3" style={{ backgroundColor: '#FE8733' }}>
                  <Text className="text-white text-xs font-bold">{i + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-800" numberOfLines={1}>{b.batchNumber}</Text>
                  <Text className="text-xs text-gray-400">{b.orderCount} orders</Text>
                </View>
                <TouchableOpacity onPress={() => move(i, -1)} disabled={i === 0} className="px-2">
                  <Icon name="keyboard-arrow-up" size={24} color={i === 0 ? '#d1d5db' : '#374151'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => move(i, 1)} disabled={i === ordered.length - 1} className="px-2">
                  <Icon name="keyboard-arrow-down" size={24} color={i === ordered.length - 1 ? '#d1d5db' : '#374151'} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Driver picker */}
          <Text className="text-sm font-medium text-gray-700 px-4 pt-4 pb-2">Select Driver</Text>
          {isLoading ? (
            <View className="p-8 items-center">
              <ActivityIndicator color="#FE8733" />
            </View>
          ) : (
            <FlatList
              data={drivers}
              keyExtractor={(item: any) => item._id}
              className="max-h-48"
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity
                  onPress={() => setSelectedDriverId(item._id)}
                  className={`flex-row items-center p-4 border-b border-gray-100 ${
                    selectedDriverId === item._id ? 'bg-orange-50' : ''
                  }`}
                >
                  <View
                    className={`w-5 h-5 rounded-full border-2 mr-3 ${
                      selectedDriverId === item._id ? 'border-primary' : 'border-gray-300'
                    }`}
                    style={selectedDriverId === item._id ? { borderColor: '#FE8733' } : undefined}
                  >
                    {selectedDriverId === item._id && (
                      <View className="w-3 h-3 rounded-full m-0.5" style={{ backgroundColor: '#FE8733' }} />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-base text-gray-800">{item.name}</Text>
                    <Text className="text-xs text-gray-500">{item.phone}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text className="text-center text-gray-400 p-8">No available drivers</Text>}
            />
          )}

          {/* Actions */}
          <View className="flex-row p-4 border-t border-gray-200">
            <TouchableOpacity onPress={onClose} className="flex-1 py-3 mr-2 rounded-lg border border-gray-300">
              <Text className="text-center text-gray-700 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => assignMutation.mutate()}
              disabled={!canSubmit}
              className={`flex-1 py-3 ml-2 rounded-lg ${canSubmit ? '' : 'bg-gray-300'}`}
              style={canSubmit ? { backgroundColor: '#FE8733' } : undefined}
            >
              {assignMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-white font-semibold">Assign {ordered.length}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AssignBatchesToDriverModal;
