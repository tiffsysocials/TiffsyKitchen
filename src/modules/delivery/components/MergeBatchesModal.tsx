import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  onSuccess: (mergedBatchId?: string) => void;
}

const MergeBatchesModal: React.FC<Props> = ({ visible, batches, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();
  const [reason, setReason] = useState('');

  const totalOrders = batches.reduce((sum, b) => sum + (b.orderCount || 0), 0);

  const mergeMutation = useMutation({
    mutationFn: () =>
      deliveryService.mergeBatches(
        batches.map((b) => b._id),
        reason.trim() || undefined,
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      showSuccess('Merged', `${batches.length} batches merged into one`);
      setReason('');
      onSuccess(res?.data?.mergedBatch?._id);
    },
    onError: (error: any) => {
      showError('Error', error?.message || 'Failed to merge batches');
    },
  });

  const canSubmit = batches.length >= 2 && !mergeMutation.isPending;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-center items-center bg-black/50 px-6">
        <View className="bg-white rounded-2xl w-full">
          {/* Header */}
          <View className="flex-row items-center p-4 border-b border-gray-200">
            <Icon name="merge-type" size={24} color="#FE8733" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Merge Batches</Text>
          </View>

          {/* Body */}
          <View className="p-4">
            <View className="bg-orange-50 p-3 rounded-lg mb-4">
              <Text className="text-sm text-gray-700">
                Merge {batches.length} batches ({totalOrders} orders) into one new batch. The
                delivery route will be re-optimized by distance. The original batches will be
                archived. The driver can still reorder stops afterward.
              </Text>
            </View>

            {/* Selected batch list */}
            <Text className="text-xs font-medium text-gray-500 mb-1">Selected batches</Text>
            <ScrollView style={{ maxHeight: 120 }} className="mb-4">
              {batches.map((b) => (
                <View key={b._id} className="flex-row items-center justify-between py-1">
                  <Text className="text-sm text-gray-700" numberOfLines={1}>
                    {b.batchNumber}
                  </Text>
                  <Text className="text-xs text-gray-400 ml-2">{b.orderCount} orders</Text>
                </View>
              ))}
            </ScrollView>

            {/* Optional reason */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Reason (optional)</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g., Combine small adjacent batches"
              multiline
              numberOfLines={2}
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
              maxLength={200}
            />
          </View>

          {/* Actions */}
          <View className="flex-row p-4 border-t border-gray-200">
            <TouchableOpacity
              onPress={onClose}
              disabled={mergeMutation.isPending}
              className="flex-1 py-3 mr-2 rounded-lg border border-gray-300"
            >
              <Text className="text-center text-gray-700 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => mergeMutation.mutate()}
              disabled={!canSubmit}
              className={`flex-1 py-3 ml-2 rounded-lg ${canSubmit ? 'bg-primary' : 'bg-gray-300'}`}
              style={canSubmit ? { backgroundColor: '#FE8733' } : undefined}
            >
              {mergeMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-white font-semibold">Merge {batches.length}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default MergeBatchesModal;
