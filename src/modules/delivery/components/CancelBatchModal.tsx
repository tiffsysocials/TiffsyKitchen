import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { deliveryService } from '../../../services/delivery.service';
import { useAlert } from '../../../hooks/useAlert';

interface Props {
  visible: boolean;
  batchId: string;
  batchNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CancelBatchModal: React.FC<Props> = ({ visible, batchId, batchNumber, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();
  const [reason, setReason] = useState('');

  const cancelMutation = useMutation({
    mutationFn: () => deliveryService.cancelBatch(batchId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchDetail', batchId] });
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      showSuccess('Success', 'Batch cancelled successfully');
      setReason('');
      onSuccess();
    },
    onError: (error: any) => {
      showError('Error', error?.message || 'Failed to cancel batch');
    },
  });

  const canSubmit = reason.length >= 5 && reason.length <= 200;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-center items-center bg-black/50 px-6">
        <View className="bg-white rounded-2xl w-full">
          {/* Header */}
          <View className="flex-row items-center p-4 border-b border-gray-200">
            <Icon name="cancel" size={24} color="#dc2626" />
            <Text className="text-lg font-semibold text-red-700 ml-2">Cancel Batch</Text>
          </View>

          {/* Warning */}
          <View className="p-4">
            <View className="bg-red-50 p-3 rounded-lg mb-4">
              <Text className="text-sm text-red-700">
                Cancel batch {batchNumber}? Its orders will be released back to the pool
                (set to Ready) and can be re-batched. Any assigned driver will be freed.
              </Text>
            </View>

            {/* Reason Input */}
            <Text className="text-sm font-medium text-gray-700 mb-2">Reason for cancellation</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g., Kitchen unable to fulfill orders"
              multiline
              numberOfLines={3}
              className="bg-gray-100 p-3 rounded-lg text-gray-800"
              maxLength={200}
            />
            <Text className="text-xs text-gray-400 mt-1">{reason.length}/200 (min 5 chars)</Text>
          </View>

          {/* Actions */}
          <View className="flex-row p-4 border-t border-gray-200">
            <TouchableOpacity onPress={onClose} className="flex-1 py-3 mr-2 rounded-lg border border-gray-300">
              <Text className="text-center text-gray-700 font-semibold">Keep Batch</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => cancelMutation.mutate()}
              disabled={!canSubmit || cancelMutation.isPending}
              className={`flex-1 py-3 ml-2 rounded-lg ${canSubmit && !cancelMutation.isPending ? 'bg-red-500' : 'bg-gray-300'}`}
            >
              {cancelMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-white font-semibold">Cancel Batch</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CancelBatchModal;
