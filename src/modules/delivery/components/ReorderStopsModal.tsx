import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { deliveryService } from '../../../services/delivery.service';
import { useAlert } from '../../../hooks/useAlert';

export interface ReorderStop {
  orderId: string;
  orderNumber: string;
  address?: string;
}

interface Props {
  visible: boolean;
  batchId: string;
  stops: ReorderStop[];
  onClose: () => void;
  onSuccess: () => void;
}

const ReorderStopsModal: React.FC<Props> = ({ visible, batchId, stops, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();
  const [ordered, setOrdered] = useState<ReorderStop[]>(stops);

  useEffect(() => {
    if (visible) setOrdered(stops);
  }, [visible, stops]);

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    setOrdered(next);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      deliveryService.updateDeliverySequence(
        batchId,
        ordered.map((s, i) => ({ orderId: s.orderId, sequenceNumber: i + 1 })),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchDetail', batchId] });
      queryClient.invalidateQueries({ queryKey: ['batchTracking', batchId] });
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      showSuccess('Saved', 'Delivery order updated');
      onSuccess();
    },
    onError: (error: any) => {
      showError('Error', error?.message || 'Failed to update delivery order');
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-2xl max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-800">Reorder Stops</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View className="p-4 border-b border-gray-100">
            <View className="bg-orange-50 p-3 rounded-lg">
              <Text className="text-sm text-gray-700">
                Set the delivery order. The driver can still change it afterward.
              </Text>
            </View>
          </View>

          {/* Ordered stops */}
          <ScrollView style={{ maxHeight: 380 }}>
            {ordered.map((s, i) => (
              <View key={s.orderId} className="flex-row items-center px-4 py-3 border-b border-gray-100">
                <View
                  className="w-7 h-7 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: '#FE8733' }}
                >
                  <Text className="text-white text-xs font-bold">{i + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                    #{s.orderNumber}
                  </Text>
                  {!!s.address && (
                    <Text className="text-xs text-gray-400" numberOfLines={1}>{s.address}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => move(i, -1)} disabled={i === 0} className="px-2">
                  <Icon name="keyboard-arrow-up" size={26} color={i === 0 ? '#d1d5db' : '#374151'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => move(i, 1)} disabled={i === ordered.length - 1} className="px-2">
                  <Icon name="keyboard-arrow-down" size={26} color={i === ordered.length - 1 ? '#d1d5db' : '#374151'} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Actions */}
          <View className="flex-row p-4 border-t border-gray-200">
            <TouchableOpacity onPress={onClose} className="flex-1 py-3 mr-2 rounded-lg border border-gray-300">
              <Text className="text-center text-gray-700 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || ordered.length < 2}
              className={`flex-1 py-3 ml-2 rounded-lg ${saveMutation.isPending || ordered.length < 2 ? 'bg-gray-300' : ''}`}
              style={!saveMutation.isPending && ordered.length >= 2 ? { backgroundColor: '#FE8733' } : undefined}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-white font-semibold">Save Order</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ReorderStopsModal;
