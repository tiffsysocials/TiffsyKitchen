/**
 * Enhanced Order Detail Screen - Real API Integration
 *
 * Displays full order details and allows status updates
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Order as APIOrder, OrderStatus } from '../../../types/api.types';
import { ordersService } from '../../../services/orders.service';
import { colors, spacing } from '../../../theme';
import { useAlert } from '../../../hooks/useAlert';

interface OrderDetailScreenProps {
  orderId: string;
  onBack: () => void;
}

const STATUS_FLOW: OrderStatus[] = [
  'PLACED',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const OrderDetailScreenEnhanced: React.FC<OrderDetailScreenProps> = ({
  orderId,
  onBack,
}) => {
  const [order, setOrder] = useState<APIOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError, showWarning, showConfirm } = useAlert();
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  /**
   * Fetch order details
   */
  const fetchOrderDetails = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const orderData = await ordersService.getOrderById(orderId);
      setOrder(orderData);
    } catch (err: any) {
      console.error('Error fetching order:', err);
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  /**
   * Update order status
   */
  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!order) return;

    showConfirm(
      'Update Status',
      `Change order status to ${newStatus.replace(/_/g, ' ')}?`,
      async () => {
        try {
          setUpdating(true);
          // Use ADMIN endpoint which allows ALL statuses
          const updatedOrder = await ordersService.updateOrderStatusAdmin(orderId, {
            status: newStatus,
          });
          setOrder(updatedOrder);
          showSuccess('Success', 'Order status updated successfully');
        } catch (err: any) {
          console.error('Error updating status:', err);
          showError('Error', err.message || 'Failed to update status');
        } finally {
          setUpdating(false);
        }
      },
      undefined,
      { confirmText: 'Update', cancelText: 'Cancel' }
    );
  };

  /**
   * Cancel order
   */
  const handleCancelOrder = () => {
    setCancelReason('');
    setCancelError('');
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    const trimmed = cancelReason.trim();
    if (!trimmed) {
      setCancelError('Please provide a cancellation reason');
      return;
    }
    try {
      setUpdating(true);
      const updatedOrder = await ordersService.cancelOrder(orderId, trimmed);
      setOrder(updatedOrder);
      setCancelModalVisible(false);
      showSuccess('Success', 'Order cancelled successfully');
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      showError('Error', err.message || 'Failed to cancel order');
    } finally {
      setUpdating(false);
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: OrderStatus): string => {
    const statusColors: Record<OrderStatus, string> = {
      PLACED: '#3b82f6',
      SCHEDULED: '#6366f1',
      ACCEPTED: '#10b981',
      REJECTED: '#ef4444',
      PREPARING: '#f59e0b',
      READY: '#8b5cf6',
      PICKED_UP: '#6366f1',
      OUT_FOR_DELIVERY: '#06b6d4',
      DELIVERED: '#10b981',
      CANCELLED: '#6b7280',
      FAILED: '#ef4444',
    };
    return statusColors[status] || '#6b7280';
  };

  /**
   * Get next available status
   */
  const getNextStatus = (): OrderStatus | null => {
    if (!order) return null;
    const currentIndex = STATUS_FLOW.indexOf(order.status as OrderStatus);
    if (currentIndex === -1 || currentIndex === STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[currentIndex + 1];
  };

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </View>
    );
  }

  /**
   * Render error state
   */
  if (error || !order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Unable to Load Order</Text>
          <Text style={styles.errorMessage}>{error || 'Order not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchOrderDetails()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const nextStatus = getNextStatus();
  const canUpdateStatus =
    !['DELIVERED', 'CANCELLED', 'FAILED', 'REJECTED'].includes(order.status) && nextStatus;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order._id.slice(-6).toUpperCase()}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchOrderDetails(true)} />
        }
      >
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(order.status as OrderStatus) + '20' },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(order.status as OrderStatus) }]}
            >
              {order.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        {/* Order Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="receipt-long" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Order ID</Text>
              <Text style={styles.infoValue}>#{order._id.slice(-8).toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="restaurant" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Kitchen ID</Text>
              <Text style={styles.infoValue}>{order.kitchenId}</Text>
              <Text style={styles.infoSubtext}>ID: {order.kitchenId.slice(-6)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="location-on" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Zone ID</Text>
              <Text style={styles.infoValue}>{order.zoneId}</Text>
              <Text style={styles.infoSubtext}>ID: {order.zoneId.slice(-6)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="person" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Customer ID</Text>
              <Text style={styles.infoValue}>{order.userId}</Text>
              <Text style={styles.infoSubtext}>ID: {order.userId.slice(-6)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="category" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Menu Type</Text>
              <Text style={styles.infoValue}>
                {order.menuType === 'MEAL_MENU' ? 'Meal Menu' : 'On-Demand Menu'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="schedule" size={20} color="#f59e0b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Scheduled For</Text>
              <Text style={styles.infoValue}>
                {new Date(order.scheduledFor).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'Asia/Kolkata',
                })}
              </Text>
              <Text style={styles.infoSubtext}>{order.mealWindow}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="access-time" size={20} color="#3b82f6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Placed At</Text>
              <Text style={styles.infoValue}>
                {new Date(order.placedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.infoSubtext}>
                {new Date(order.placedAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>

          {order.deliveredAt && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="check-circle" size={20} color="#10b981" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Delivered At</Text>
                  <Text style={[styles.infoValue, { color: '#10b981' }]}>
                    {new Date(order.deliveredAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.infoSubtext}>
                    {new Date(order.deliveredAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            </>
          )}

          {order.cancelledAt && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="cancel" size={20} color="#ef4444" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Cancelled At</Text>
                  <Text style={[styles.infoValue, { color: '#ef4444' }]}>
                    {new Date(order.cancelledAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.infoSubtext}>
                    {new Date(order.cancelledAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Delivery Address */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="place" size={22} color={colors.primary} />
            <Text style={styles.cardTitle}>Delivery Address</Text>
          </View>
          <View style={styles.addressBox}>
            <Text style={styles.addressLine}>{order.deliveryAddress.addressLine1}</Text>
            {order.deliveryAddress.addressLine2 && (
              <Text style={styles.addressLine}>{order.deliveryAddress.addressLine2}</Text>
            )}
            <Text style={styles.addressLine}>
              {order.deliveryAddress.locality}
            </Text>
            <Text style={styles.addressLine}>
              {order.deliveryAddress.city}, {order.deliveryAddress.state}
            </Text>
            <Text style={[styles.addressLine, styles.pincode]}>
              PIN: {order.deliveryAddress.pincode}
            </Text>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="payments" size={22} color={colors.primary} />
            <Text style={styles.cardTitle}>Order Total</Text>
          </View>
          <View style={styles.pricingBox}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Total Amount</Text>
              <Text style={styles.pricingValue}>₹{order.totalAmount.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Items ({order.items.length})</Text>
            {order.items.map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemText}>• Item {index + 1}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Cancellation Reason */}
        {order.cancellationReason && (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.cardTitle}>Cancellation Reason</Text>
            <Text style={styles.errorText}>{order.cancellationReason}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {canUpdateStatus && (
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton, updating && styles.disabledButton]}
            onPress={() => handleStatusUpdate(nextStatus!)}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>
                  Move to {nextStatus!.replace(/_/g, ' ')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {!['DELIVERED', 'CANCELLED', 'FAILED', 'REJECTED'].includes(order.status) && (
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton, updating && styles.disabledButton]}
            onPress={handleCancelOrder}
            disabled={updating}
          >
            <MaterialIcons name="cancel" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !updating && setCancelModalVisible(false)}
      >
        <View style={styles.cancelOverlay}>
          <View style={styles.cancelContainer}>
            <Text style={styles.cancelTitle}>Cancel Order</Text>
            <Text style={styles.cancelMessage}>
              Please provide a reason for cancellation:
            </Text>
            <TextInput
              style={[styles.cancelInput, cancelError ? styles.cancelInputError : null]}
              value={cancelReason}
              onChangeText={(text) => {
                setCancelReason(text);
                if (cancelError) setCancelError('');
              }}
              placeholder="Enter cancellation reason..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!updating}
              autoFocus
            />
            {!!cancelError && <Text style={styles.cancelErrorText}>{cancelError}</Text>}
            <View style={styles.cancelActions}>
              <TouchableOpacity
                style={[styles.cancelDialogButton, styles.cancelCancelButton]}
                onPress={() => setCancelModalVisible(false)}
                disabled={updating}
              >
                <Text style={styles.cancelCancelText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.cancelDialogButton,
                  styles.cancelConfirmButton,
                  updating && { opacity: 0.6 },
                ]}
                onPress={handleConfirmCancel}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.cancelConfirmText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: spacing.md,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  statusContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '600',
    marginBottom: 2,
  },
  infoSubtext: {
    fontSize: 13,
    color: '#9ca3af',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addressBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addressLine: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 22,
    marginBottom: 4,
  },
  pincode: {
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
  },
  pricingBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingLabel: {
    fontSize: 16,
    color: '#15803d',
    fontWeight: '600',
  },
  pricingValue: {
    fontSize: 24,
    color: '#15803d',
    fontWeight: '700',
  },
  itemRow: {
    paddingVertical: spacing.xs,
  },
  itemText: {
    fontSize: 14,
    color: '#1f2937',
  },
  errorText: {
    fontSize: 14,
    color: '#991b1b',
    lineHeight: 20,
  },
  actionsContainer: {
    padding: spacing.md,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  cancelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cancelContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  cancelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  cancelMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  cancelInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
  },
  cancelInputError: {
    borderColor: '#ef4444',
  },
  cancelErrorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  cancelActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  cancelDialogButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelCancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  cancelConfirmButton: {
    backgroundColor: '#ef4444',
  },
  cancelConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
