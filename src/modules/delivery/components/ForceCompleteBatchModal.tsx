import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { deliveryService } from '../../../services/delivery.service';
import { ordersService } from '../../../services/orders.service';
import { OrderStatus } from '../../../types/api.types';
import { useAlert } from '../../../hooks/useAlert';

interface Props {
  visible: boolean;
  batchId: string;
  batchNumber: string;
  orders: any[];
  onClose: () => void;
  onSuccess: () => void;
}

type Outcome = 'DELIVERED' | 'FAILED';

// Backend FAILURE_REASONS enum (delivery.validation.js).
const FAILURE_REASONS = [
  'CUSTOMER_UNAVAILABLE',
  'WRONG_ADDRESS',
  'CUSTOMER_REFUSED',
  'ADDRESS_NOT_FOUND',
  'CUSTOMER_UNREACHABLE',
  'OTHER',
] as const;

// Orders already in a terminal state don't need to be touched.
const TERMINAL_STATUSES = ['DELIVERED', 'FAILED', 'CANCELLED'];

const shortAddress = (o: any): string =>
  [o.deliveryAddress?.addressLine1, o.deliveryAddress?.locality, o.deliveryAddress?.city]
    .filter(Boolean)
    .join(', ');

const ForceCompleteBatchModal: React.FC<Props> = ({
  visible,
  batchId,
  batchNumber,
  orders,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();

  const pendingOrders = useMemo(
    () => (orders || []).filter((o) => !TERMINAL_STATUSES.includes(o.status)),
    [orders]
  );

  // Per-order chosen outcome, keyed by order id. Defaults to DELIVERED.
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [failureReason, setFailureReason] = useState<(typeof FAILURE_REASONS)[number]>('OTHER');

  const outcomeFor = (orderId: string): Outcome => outcomes[orderId] || 'DELIVERED';
  const anyFailed = pendingOrders.some((o) => outcomeFor(o._id) === 'FAILED');

  const setOutcome = (orderId: string, outcome: Outcome) =>
    setOutcomes((prev) => ({ ...prev, [orderId]: outcome }));

  const completeMutation = useMutation({
    mutationFn: async () => {
      // 1. Resolve each still-pending order via the admin order-status endpoint
      //    (no proof required, sets the status directly).
      for (const order of pendingOrders) {
        const outcome = outcomeFor(order._id);
        try {
          await ordersService.updateOrderStatusAdmin(order._id, {
            status: outcome as OrderStatus,
            notes:
              outcome === 'FAILED'
                ? `Force-completed by admin · ${failureReason}`
                : 'Force-completed by admin',
          });
        } catch (err: any) {
          throw new Error(
            `Failed to update order ${order.orderNumber || order._id}: ${err?.message || 'unknown error'}`
          );
        }
      }

      // 2. Finalize the batch — backend reconciles counters and sets the final status.
      return deliveryService.completeBatch(batchId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchDetail', batchId] });
      queryClient.invalidateQueries({ queryKey: ['batchTracking', batchId] });
      queryClient.invalidateQueries({ queryKey: ['adminBatches'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      showSuccess('Success', 'Batch force-completed');
      setOutcomes({});
      onSuccess();
    },
    onError: (error: any) => {
      showError('Error', error?.message || 'Failed to complete batch');
    },
  });

  const hasPending = pendingOrders.length > 0;
  const submitLabel = hasPending ? 'Force Complete' : 'Complete Batch';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-center items-center bg-black/50 px-6">
        <View className="bg-white rounded-2xl w-full max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center p-4 border-b border-gray-200">
            <Icon name="done-all" size={24} color="#2563eb" />
            <Text className="text-lg font-semibold text-blue-700 ml-2">Force Complete Batch</Text>
          </View>

          <ScrollView className="px-4">
            {/* Warning */}
            <View className="bg-amber-50 p-3 rounded-lg my-4">
              <Text className="text-sm text-amber-800">
                Force-complete batch {batchNumber}? This overrides the status of any in-flight
                order below and notifies those customers. The batch is then finalized and the
                assigned driver is freed.
              </Text>
            </View>

            {hasPending ? (
              <>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  {pendingOrders.length} pending order{pendingOrders.length > 1 ? 's' : ''} — choose an outcome
                </Text>

                {pendingOrders.map((order) => {
                  const outcome = outcomeFor(order._id);
                  return (
                    <View key={order._id} className="bg-gray-50 rounded-lg p-3 mb-3">
                      <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>
                        {order.orderNumber || order._id}
                      </Text>
                      {!!shortAddress(order) && (
                        <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                          {shortAddress(order)}
                        </Text>
                      )}
                      <Text className="text-xs text-gray-400 mt-0.5">Current: {order.status}</Text>

                      {/* Outcome toggle */}
                      <View className="flex-row mt-2">
                        <TouchableOpacity
                          onPress={() => setOutcome(order._id, 'DELIVERED')}
                          className={`flex-1 py-2 mr-1 rounded-lg items-center border ${
                            outcome === 'DELIVERED' ? 'bg-green-600 border-green-600' : 'border-gray-300'
                          }`}
                        >
                          <Text
                            className={`text-sm font-semibold ${
                              outcome === 'DELIVERED' ? 'text-white' : 'text-gray-600'
                            }`}
                          >
                            Delivered
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setOutcome(order._id, 'FAILED')}
                          className={`flex-1 py-2 ml-1 rounded-lg items-center border ${
                            outcome === 'FAILED' ? 'bg-red-500 border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <Text
                            className={`text-sm font-semibold ${
                              outcome === 'FAILED' ? 'text-white' : 'text-gray-600'
                            }`}
                          >
                            Failed
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {/* Shared failure reason — only relevant when something is marked Failed */}
                {anyFailed && (
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 mb-2">Failure reason</Text>
                    <View className="flex-row flex-wrap">
                      {FAILURE_REASONS.map((reason) => {
                        const selected = failureReason === reason;
                        return (
                          <TouchableOpacity
                            key={reason}
                            onPress={() => setFailureReason(reason)}
                            className={`px-3 py-2 mr-2 mb-2 rounded-full border ${
                              selected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
                            }`}
                          >
                            <Text className={`text-xs ${selected ? 'text-white' : 'text-gray-600'}`}>
                              {reason.replace(/_/g, ' ')}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View className="bg-gray-50 p-3 rounded-lg mb-4">
                <Text className="text-sm text-gray-600">
                  All orders are already resolved. This will finalize the batch.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View className="flex-row p-4 border-t border-gray-200">
            <TouchableOpacity
              onPress={onClose}
              disabled={completeMutation.isPending}
              className="flex-1 py-3 mr-2 rounded-lg border border-gray-300"
            >
              <Text className="text-center text-gray-700 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className={`flex-1 py-3 ml-2 rounded-lg ${
                completeMutation.isPending ? 'bg-gray-300' : 'bg-blue-600'
              }`}
            >
              {completeMutation.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-center text-white font-semibold">{submitLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ForceCompleteBatchModal;
