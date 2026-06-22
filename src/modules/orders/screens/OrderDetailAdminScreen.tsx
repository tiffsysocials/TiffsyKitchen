import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { ordersService } from '../../../services/orders.service';
import { Order, OrderStatus } from '../../../types/api.types';
import { OrderSourceBadge } from '../components/OrderSourceBadge';
import StatusTimeline from '../components/StatusTimeline';
import CancelOrderModal from '../components/CancelOrderModal';
import { AcceptOrderModal } from '../components/AcceptOrderModal';
import { RejectOrderModal } from '../components/RejectOrderModal';
import { UpdateStatusModal } from '../components/UpdateStatusModal';
import { DeliveryStatusModal } from '../components/DeliveryStatusModal';
import OrderStatusDropdown from '../components/OrderStatusDropdown';
import { formatDistanceToNow } from 'date-fns';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf, rs } from '../../../theme/responsive';
import { getAutoAcceptBadgeInfo, getAutoAcceptDescription } from '../../../utils/autoAccept';
import { useAlert } from '../../../hooks/useAlert';
import { GradientBox } from '../../../components/common/GradientBox';

interface OrderDetailAdminScreenProps {
  route: {
    params: {
      orderId: string;
    };
  };
  navigation: any;
  isKitchenMode?: boolean;
}

const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    PENDING_KITCHEN_ACCEPTANCE: '#D97706',
    PLACED: '#007AFF',
    SCHEDULED: '#6366f1',
    ACCEPTED: '#00C7BE',
    REJECTED: '#FF3B30',
    PREPARING: '#FFCC00',
    READY: '#FF9500',
    PICKED_UP: '#AF52DE',
    OUT_FOR_DELIVERY: '#5856D6',
    DELIVERED: '#34C759',
    CANCELLED: '#FF3B30',
    FAILED: '#8B0000',
  };
  return colors[status] || '#8E8E93';
};

const safeFormatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return 'Unknown date';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'Invalid date';
  }
};

const OrderDetailAdminScreen: React.FC<OrderDetailAdminScreenProps> = ({
  route,
  navigation,
  isKitchenMode = false,
}) => {
  const { orderId } = route.params;
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [showDeliveryStatusModal, setShowDeliveryStatusModal] = useState(false);
  const [pendingDeliveryStatus, setPendingDeliveryStatus] = useState<OrderStatus | null>(null);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();

  // Fetch order details
  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      console.log('📥 Fetching order:', orderId);
      try {
        const result = await ordersService.getOrderById(orderId);
        console.log('✅ Order fetched successfully:', result?._id);
        return result;
      } catch (err) {
        console.error('❌ Error fetching order:', err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 0, // Always fetch fresh data
  });

  // Accept order mutation
  const acceptMutation = useMutation({
    mutationFn: (estimatedPrepTime: number) =>
      ordersService.acceptOrder(orderId, estimatedPrepTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderStats'] });
      showSuccess('Success', 'Order accepted successfully');
      setShowAcceptModal(false);
    },
    onError: (error: any) => {
      showError(
        'Error',
        error?.response?.data?.error?.message ||
        'Failed to accept order. Please try again.',
      );
    },
  });

  // Reject order mutation
  const rejectMutation = useMutation({
    mutationFn: (reason: string) => ordersService.rejectOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderStats'] });
      showSuccess('Order Rejected', 'Order has been rejected successfully', () => setShowRejectModal(false));
    },
    onError: (error: any) => {
      showError(
        'Error',
        error?.response?.data?.error?.message ||
        'Failed to reject order. Please try again.',
      );
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ status, notes }: { status: OrderStatus; notes?: string }) => {
      // 🔍 LOG: About to call API for regular status update
      console.log('====================================');
      console.log('🚀 API CALL: updateOrderStatus');
      console.log('====================================');
      console.log('Order ID:', orderId);
      console.log('Status Data:');
      console.log('  - Status:', status);
      console.log('  - Status Type:', typeof status);
      console.log('  - Status Length:', status.length);
      console.log('  - Status Bytes:', JSON.stringify([...status].map(c => c.charCodeAt(0))));
      console.log('  - Has Notes?', !!notes);
      if (notes) {
        console.log('  - Notes:', notes);
      }
      console.log('====================================');
      console.log('📤 RAW API REQUEST PAYLOAD:');
      console.log(JSON.stringify({ status, notes }, null, 2));
      console.log('Using Admin Endpoint: /api/orders/admin/:id/status');
      console.log('====================================');

      // Use ADMIN endpoint which allows ALL statuses
      return ordersService.updateOrderStatusAdmin(orderId, { status, notes });
    },
    onSuccess: (response) => {
      console.log('====================================');
      console.log('✅ REGULAR STATUS UPDATE SUCCESS');
      console.log('====================================');
      console.log('Response:', response);
      console.log('====================================');

      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderStats'] });
      showSuccess('Success', 'Order status updated successfully');
      setShowUpdateStatusModal(false);
    },
    onError: (error: any) => {
      console.log('====================================');
      console.log('❌ REGULAR STATUS UPDATE FAILED');
      console.log('====================================');
      console.log('Error Object:', error);
      console.log('Error Message:', error?.message);
      console.log('Response Data:', error?.response?.data);
      console.log('====================================');

      showError(
        'Error',
        error?.response?.data?.error?.message ||
        'Failed to update order status. Please try again.',
      );
    },
  });

  // Update delivery status mutation
  const updateDeliveryStatusMutation = useMutation({
    mutationFn: (data: {
      status: 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
      notes?: string;
      proofOfDelivery?: {
        type: 'OTP' | 'SIGNATURE' | 'PHOTO';
        value: string;
      };
    }) => {
      // 🔍 LOG: About to call API for delivery status update
      console.log('====================================');
      console.log('🚀 API CALL: updateDeliveryStatus');
      console.log('====================================');
      console.log('Order ID:', orderId);
      console.log('Delivery Data:');
      console.log('  - Status:', data.status);
      console.log('  - Status Type:', typeof data.status);
      console.log('  - Status Bytes:', JSON.stringify([...data.status].map(c => c.charCodeAt(0))));
      console.log('  - Has Notes?', !!data.notes);
      if (data.notes) {
        console.log('  - Notes:', data.notes);
      }
      console.log('  - Has Proof of Delivery?', !!data.proofOfDelivery);
      if (data.proofOfDelivery) {
        console.log('  - Proof Type:', data.proofOfDelivery.type);
        console.log('  - Proof Value:', data.proofOfDelivery.value);
      }
      console.log('====================================');
      console.log('📤 RAW API REQUEST PAYLOAD:');
      console.log(JSON.stringify(data, null, 2));
      console.log('====================================');

      return ordersService.updateDeliveryStatus(orderId, data);
    },
    onSuccess: (response) => {
      console.log('====================================');
      console.log('✅ DELIVERY STATUS UPDATE SUCCESS');
      console.log('====================================');
      console.log('Response:', response);
      console.log('====================================');

      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderStats'] });
      showSuccess('Success', 'Delivery status updated successfully');
      setShowDeliveryStatusModal(false);
    },
    onError: (error: any) => {
      console.log('====================================');
      console.log('❌ DELIVERY STATUS UPDATE FAILED');
      console.log('====================================');
      console.log('Error Object:', error);
      console.log('Error Message:', error?.message);
      console.log('Response Data:', error?.response?.data);
      console.log('====================================');

      showError(
        'Error',
        error?.response?.data?.error?.message ||
        'Failed to update delivery status. Please try again.',
      );
    },
  });

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: (data: {
      reason: string;
      issueRefund: boolean;
      restoreVouchers: boolean;
    }) => ordersService.cancelOrder(orderId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderStats'] });

      const refundLine = data.refundInitiated ? '\nRefund initiated' : '';
      const voucherLine = (data.vouchersRestored && data.vouchersRestored > 0)
        ? `\n${data.vouchersRestored} voucher(s) restored`
        : '';

      // If admin asked to restore vouchers but backend restored zero, warn
      const voucherRestoreFailed =
        variables.restoreVouchers &&
        (order?.voucherUsage?.voucherCount ?? 0) > 0 &&
        (!data.vouchersRestored || data.vouchersRestored === 0);
      const warningLine = voucherRestoreFailed
        ? '\n⚠️ Voucher restore returned 0 — check voucher status on user profile.'
        : '';

      showSuccess(
        'Order Cancelled',
        `Order cancelled successfully${refundLine}${voucherLine}${warningLine}`,
        () => setShowCancelModal(false),
      );
    },
    onError: (error: any) => {
      // api.service.ts throws Error with .response = { status, data: { success, message, error } }
      console.log('🚫 cancelOrder error:', JSON.stringify(error, null, 2));
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to cancel order. Please try again.';
      showError('Error', backendMessage);
    },
  });

  const handleCallCustomer = () => {
    const phone = order?.userId?.phone || order?.deliveryAddress?.contactPhone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleCancelOrder = (data: {
    reason: string;
    issueRefund: boolean;
    restoreVouchers: boolean;
  }) => {
    cancelMutation.mutate(data);
  };

  const handleStatusChangeFromProgress = (newStatus: OrderStatus) => {
    // 🔍 LOG: What status we received from dropdown
    console.log('====================================');
    console.log('🔄 STATUS CHANGE TRIGGERED');
    console.log('====================================');
    console.log('New Status:', newStatus);
    console.log('Status Type:', typeof newStatus);
    console.log('Status Length:', newStatus.length);
    console.log('Status Bytes:', JSON.stringify([...newStatus].map(c => c.charCodeAt(0))));
    console.log('====================================');

    // Use the appropriate mutation based on the new status
    if (newStatus === 'PICKED_UP' || newStatus === 'OUT_FOR_DELIVERY' || newStatus === 'DELIVERED') {
      console.log('📦 DELIVERY STATUS - Opening modal for:', newStatus);
      // These require delivery status modal - store the pending status
      setPendingDeliveryStatus(newStatus);
      setShowDeliveryStatusModal(true);
    } else {
      console.log('📤 REGULAR STATUS UPDATE');
      console.log('Sending to API:', { status: newStatus });
      console.log('Raw JSON:', JSON.stringify({ status: newStatus }, null, 2));
      // Use regular status update
      updateStatusMutation.mutate({ status: newStatus });
    }
  };

  const canCancelOrder = (order?: Order): boolean => {
    if (!order) return false;
    // Kitchen staff cannot cancel orders, only admins can
    if (isKitchenMode) return false;
    const cancellableStatuses: OrderStatus[] = [
      'PENDING_KITCHEN_ACCEPTANCE',
      'PLACED',
      'ACCEPTED',
      'PREPARING',
      'READY',
    ];
    return cancellableStatuses.includes(order.status);
  };

  const canAcceptOrder = (order?: Order): boolean => {
    return order?.status === 'PLACED' || order?.status === 'PENDING_KITCHEN_ACCEPTANCE';
  };

  const canRejectOrder = (order?: Order): boolean => {
    return order?.status === 'PLACED' || order?.status === 'PENDING_KITCHEN_ACCEPTANCE';
  };

  const canUpdateStatus = (order?: Order): boolean => {
    if (!order) return false;

    // Kitchen mode: Only allow ACCEPTED → PREPARING and PREPARING → READY
    if (isKitchenMode) {
      const kitchenUpdatableStatuses: OrderStatus[] = [
        'PENDING_KITCHEN_ACCEPTANCE', // Can accept or reject
        'ACCEPTED',  // Can move to PREPARING
        'PREPARING', // Can move to READY
      ];
      return kitchenUpdatableStatuses.includes(order.status);
    }

    // Admin mode: Allow more statuses
    const updatableStatuses: OrderStatus[] = [
      'ACCEPTED',
      'PREPARING',
      'READY',
    ];
    return updatableStatuses.includes(order.status);
  };

  const canUpdateDeliveryStatus = (order?: Order): boolean => {
    if (!order) return false;
    // Kitchen staff cannot update delivery status
    if (isKitchenMode) return false;
    const deliveryStatuses: OrderStatus[] = [
      'READY',
      'PICKED_UP',
      'OUT_FOR_DELIVERY',
    ];
    return deliveryStatuses.includes(order.status);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (error || (!order && !isLoading)) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>Failed to load order details</Text>
        <Text style={styles.errorSubtext}>
          Order ID: {orderId}
        </Text>
        {error && (
          <Text style={styles.errorDetail}>
            {(error as any)?.message || 'Unknown error occurred'}
          </Text>
        )}
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <MaterialIcons name="refresh" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButtonError}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonErrorText}>Back to Orders</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Safety check - should not happen due to loading/error checks above
  if (!order) {
    return null;
  }

  // Log order data for debugging
  console.log('📦 Order Data:', {
    _id: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    placedAt: order.placedAt,
    menuType: order.menuType,
    hasUserId: !!order.userId,
    hasKitchenId: !!order.kitchenId,
    hasItems: !!order.items && order.items.length > 0,
  });

  return (
    <SafeAreaScreen style={{ flex: 1 }} backgroundColor="#FE8733">
      <ScrollView style={[styles.scrollView, { backgroundColor: '#F5F5F5' }]}>
        {/* Header */}
        <GradientBox style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={styles.orderNumber}>{order.orderNumber || 'N/A'}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{order.status}</Text>
                </View>
                <OrderSourceBadge orderSource={order.orderSource} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <Text style={styles.placedTime}>
                  Placed {safeFormatDate(order.placedAt)}
                </Text>
                <Text style={styles.menuTypeText}>
                  {order.menuType === 'MEAL_MENU' ? 'Meal Menu' : 'On-Demand'}
                  {order.mealWindow ? ` • ${order.mealWindow}` : ''}
                </Text>
              </View>
            </View>
          </View>
        </GradientBox>

        {/* Auto-Accept Info Alert */}
        {(() => {
          const badgeInfo = getAutoAcceptBadgeInfo(order);
          const description = getAutoAcceptDescription(order);
          if (badgeInfo && description) {
            return (
              <View
                style={[
                  styles.autoAcceptAlert,
                  { borderLeftColor: badgeInfo.color },
                ]}>
                <MaterialIcons
                  name={badgeInfo.icon}
                  size={20}
                  color={badgeInfo.color}
                />
                <View style={styles.autoAcceptAlertContent}>
                  <Text
                    style={[
                      styles.autoAcceptAlertTitle,
                      { color: badgeInfo.color },
                    ]}>
                    {badgeInfo.label}
                  </Text>
                  <Text style={styles.autoAcceptAlertText}>
                    {description}
                  </Text>
                </View>
              </View>
            );
          }
          return null;
        })()}

        {/* Customer Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>
                {order.userId?.name || order.deliveryAddress?.contactName || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone:</Text>
              <TouchableOpacity onPress={handleCallCustomer}>
                <Text style={[styles.value, styles.linkText]}>
                  {order.userId?.phone || order.deliveryAddress?.contactPhone || 'N/A'}
                </Text>
              </TouchableOpacity>
            </View>
            {order.userId?.email && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{order.userId?.email}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Delivery Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.card}>
            {order.deliveryAddress ? (
              <>
                <Text style={styles.addressText}>
                  {order.deliveryAddress.addressLine1 || 'N/A'}
                </Text>
                {order.deliveryAddress.addressLine2 && (
                  <Text style={styles.addressText}>
                    {order.deliveryAddress.addressLine2}
                  </Text>
                )}
                {order.deliveryAddress.landmark && (
                  <Text style={styles.addressText}>
                    Landmark: {order.deliveryAddress.landmark}
                  </Text>
                )}
                <Text style={styles.addressText}>
                  {order.deliveryAddress.locality || 'N/A'}, {order.deliveryAddress.city || 'N/A'}
                </Text>
                <Text style={styles.addressText}>
                  {order.deliveryAddress.pincode || 'N/A'}
                </Text>
                {order.deliveryAddress.contactPhone && (
                  <Text style={styles.addressText}>
                    Contact: {order.deliveryAddress.contactPhone}
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.value}>No address provided</Text>
            )}
          </View>
        </View>

        {/* Zone Section */}
        {order.zoneId && typeof order.zoneId === 'object' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Zone</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Zone:</Text>
                <Text style={styles.value}>{order.zoneId.name || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Pincode:</Text>
                <Text style={styles.value}>{order.zoneId.pincode || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>City:</Text>
                <Text style={styles.value}>{order.zoneId.city || 'N/A'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Kitchen Section - Hidden for kitchen staff */}
        {!isKitchenMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kitchen</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{order.kitchenId?.name || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Code:</Text>
                <Text style={styles.value}>{order.kitchenId?.code || 'N/A'}</Text>
              </View>
              {order.kitchenId?.contactPhone && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Phone:</Text>
                  <Text style={styles.value}>{order.kitchenId?.contactPhone}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.card}>
            {order.items && order.items.length > 0 ? (
              order.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>
                      {item.quantity || 0}x {item.name || 'Unknown Item'}
                    </Text>
                    {item.addons && item.addons.length > 0 && (
                      <View style={styles.addonsContainer}>
                        {item.addons.map((addon, addonIndex) => (
                          <Text key={addonIndex} style={styles.addonText}>
                            + {addon.quantity || 0}x {addon.name || 'Unknown'} (₹
                            {(addon.unitPrice || 0).toFixed(2)})
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemPrice}>
                    ₹{(item.totalPrice || 0).toFixed(2)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.value}>No items</Text>
            )}
          </View>
        </View>

        {/* Pricing Section - Hidden for kitchen staff */}
        {!isKitchenMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing Breakdown</Text>
            <View style={styles.card}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Subtotal</Text>
                <Text style={styles.priceValue}>
                  ₹{(order.subtotal || 0).toFixed(2)}
                </Text>
              </View>
              {order.charges && order.charges.deliveryFee > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Delivery Fee</Text>
                  <Text style={styles.priceValue}>
                    ₹{(order.charges.deliveryFee || 0).toFixed(2)}
                  </Text>
                </View>
              )}
              {/* Phase 8 — surface the distance + source label admins need to
                  audit pricing discrepancies. Reads the per-order snapshot
                  (distanceMetadata) so it reflects what was charged, not
                  current config. */}
              {(() => {
                const dm = (order as any).distanceMetadata;
                if (!dm) return null;
                const parts: string[] = [];
                if (dm.distanceFromKitchenKm != null) {
                  parts.push(`${Number(dm.distanceFromKitchenKm).toFixed(1)} km`);
                }
                if (dm.appliedSourceLabel) {
                  const label =
                    dm.appliedSourceLabel === 'zone' ? 'Zone pricing' :
                    dm.appliedSourceLabel === 'global' ? 'Global distance pricing' :
                    'Flat rate';
                  parts.push(label);
                }
                if (dm.computedDeliveryFee != null && dm.computedDeliveryFee !== order.charges?.deliveryFee) {
                  parts.push(`formula ₹${Number(dm.computedDeliveryFee).toFixed(2)}`);
                }
                if (dm.acceptanceZone) {
                  parts.push(dm.acceptanceZone === 'AUTO_ACCEPT' ? 'auto-accepted' : 'manual accept');
                }
                if (parts.length === 0) return null;
                return (
                  <View style={{ marginTop: -2, marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                      {parts.join(' · ')}
                    </Text>
                  </View>
                );
              })()}
              {order.charges && order.charges.packagingFee > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Packaging Fee</Text>
                  <Text style={styles.priceValue}>
                    ₹{(order.charges.packagingFee || 0).toFixed(2)}
                  </Text>
                </View>
              )}
              {order.charges && order.charges.serviceFee > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Service Fee</Text>
                  <Text style={styles.priceValue}>
                    ₹{(order.charges.serviceFee || 0).toFixed(2)}
                  </Text>
                </View>
              )}
              {order.charges && order.charges.handlingFee > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Handling Fee</Text>
                  <Text style={styles.priceValue}>
                    ₹{(order.charges.handlingFee || 0).toFixed(2)}
                  </Text>
                </View>
              )}
              {order.charges && order.charges.taxAmount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Tax</Text>
                  <Text style={styles.priceValue}>
                    ₹{(order.charges.taxAmount || 0).toFixed(2)}
                  </Text>
                </View>
              )}
              {order.charges?.taxBreakdown && order.charges.taxBreakdown.length > 0 && (
                order.charges.taxBreakdown.map((tax, idx) => (
                  <View key={idx} style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { paddingLeft: 12, fontSize: 12 }]}>
                      {tax.taxType} ({tax.rate}%)
                    </Text>
                    <Text style={[styles.priceValue, { fontSize: 12 }]}>
                      ₹{(tax.amount || 0).toFixed(2)}
                    </Text>
                  </View>
                ))
              )}
              {order.discount && order.discount.discountAmount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, styles.discountText]}>
                    Discount{order.discount.couponCode ? ` (${order.discount.couponCode})` : ''}
                  </Text>
                  <Text style={[styles.priceValue, styles.discountText]}>
                    -₹{(order.discount.discountAmount || 0).toFixed(2)}
                  </Text>
                </View>
              )}
              {order.voucherUsage && order.voucherUsage.voucherCount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: '#5856D6' }]}>
                    Vouchers redeemed ({order.voucherUsage.voucherCount})
                  </Text>
                  <Text style={[styles.priceValue, { color: '#5856D6' }]}>
                    -₹{(order.voucherUsage.voucherCoverage || 0).toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>Grand Total</Text>
                <Text style={styles.totalValue}>
                  ₹{(order.grandTotal || 0).toFixed(2)}
                </Text>
              </View>
              <View style={[styles.priceRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#fee2d4' }]}>
                <Text style={[styles.totalLabel, { color: '#FE8733' }]}>Amount Paid (cash)</Text>
                <Text style={[styles.totalValue, { color: '#FE8733' }]}>
                  ₹{(order.amountPaid || 0).toFixed(2)}
                </Text>
              </View>
              {(order.voucherUsage?.voucherCount ?? 0) > 0 && (order.amountPaid || 0) === 0 && (
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontStyle: 'italic' }}>
                  Paid entirely via vouchers — no cash collected.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Voucher Usage */}
        {order.voucherUsage && order.voucherUsage.voucherCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Voucher Usage</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Vouchers Used:</Text>
                <Text style={styles.value}>{order.voucherUsage.voucherCount}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Main Courses Covered:</Text>
                <Text style={styles.value}>
                  {order.voucherUsage.mainCoursesCovered}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment Status (status, method, ID — totals live in Pricing Breakdown above) */}
        {!isKitchenMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Status:</Text>
                <Text style={[styles.value, {
                  color: order.paymentStatus === 'PAID' ? '#34C759' :
                    order.paymentStatus === 'FAILED' ? '#FF3B30' :
                    order.paymentStatus === 'REFUNDED' ? '#5856D6' : '#FF9500',
                  fontWeight: '700',
                }]}>
                  {order.paymentStatus || 'N/A'}
                </Text>
              </View>
              {order.paymentMethod && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Method:</Text>
                  <Text style={styles.value}>{order.paymentMethod}</Text>
                </View>
              )}
              {order.paymentId && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Payment ID:</Text>
                  <Text style={[styles.value, { fontSize: 12 }]}>{order.paymentId}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Delivery & Logistics Section */}
        {!isKitchenMode && (order.estimatedDeliveryTime || order.batchId || order.driverId || order.acceptedAt || order.deliveredAt) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery & Logistics</Text>
            <View style={styles.card}>
              {order.estimatedDeliveryTime && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Estimated Delivery:</Text>
                  <Text style={styles.value}>
                    {new Date(order.estimatedDeliveryTime).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
              )}
              {order.acceptedAt && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Accepted At:</Text>
                  <Text style={styles.value}>
                    {new Date(order.acceptedAt).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
              )}
              {order.deliveredAt && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Delivered At:</Text>
                  <Text style={styles.value}>
                    {new Date(order.deliveredAt).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
              )}
              {order.batchId && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Batch ID:</Text>
                  <Text style={[styles.value, { fontSize: 12 }]}>
                    {typeof order.batchId === 'object'
                      ? (order.batchId.batchNumber || order.batchId._id)
                      : order.batchId}
                  </Text>
                </View>
              )}
              {order.driverId && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Driver:</Text>
                  <Text style={[styles.value, { fontSize: 12 }]}>
                    {typeof order.driverId === 'object'
                      ? `${order.driverId.name || 'Unknown'}${order.driverId.phone ? ` • ${order.driverId.phone}` : ''}`
                      : order.driverId}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Cancellation Section */}
        {order.status === 'CANCELLED' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cancellation Details</Text>
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#FF3B30' }]}>
              {order.cancellationReason && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Reason:</Text>
                  <Text style={styles.value}>{order.cancellationReason}</Text>
                </View>
              )}
              {order.cancelledBy && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Cancelled By:</Text>
                  <Text style={styles.value}>{order.cancelledBy}</Text>
                </View>
              )}
              {order.cancelledAt && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Cancelled At:</Text>
                  <Text style={styles.value}>
                    {new Date(order.cancelledAt).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Special Instructions */}
        {(order.specialInstructions || order.leaveAtDoor || order.doNotContact) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <View style={styles.card}>
              {order.specialInstructions && (
                <Text style={styles.instructionsText}>
                  {order.specialInstructions}
                </Text>
              )}
              {(order.leaveAtDoor || order.doNotContact) && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: order.specialInstructions ? 8 : 0, gap: 8 }}>
                  {order.leaveAtDoor && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <MaterialIcons name="door-front" size={14} color="#1976D2" />
                      <Text style={{ marginLeft: 4, fontSize: 12, color: '#1976D2', fontWeight: '600' }}>Leave at Door</Text>
                    </View>
                  )}
                  {order.doNotContact && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <MaterialIcons name="phone-disabled" size={14} color="#D32F2F" />
                      <Text style={{ marginLeft: 4, fontSize: 12, color: '#D32F2F', fontWeight: '600' }}>Do Not Contact</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Quick Status Changer - Dropdown */}
        {canUpdateStatus(order) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Status Change</Text>
            <View style={styles.card}>
              <OrderStatusDropdown
                currentStatus={order.status}
                onStatusChange={handleStatusChangeFromProgress}
                disabled={updateStatusMutation.isPending || updateDeliveryStatusMutation.isPending}
                isKitchenMode={isKitchenMode}
              />
            </View>
          </View>
        )}

        {/* Status Timeline - History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status History</Text>
          <View style={styles.card}>
            <StatusTimeline
              timeline={order.statusTimeline}
              currentStatus={order.status}
              onStatusClick={handleStatusChangeFromProgress}
              allowStatusChange={false}
            />
          </View>
        </View>

        {/* Order Metadata */}
        {!isKitchenMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Info</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Order ID:</Text>
                <Text style={[styles.value, { fontSize: 11 }]}>{order._id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Created:</Text>
                <Text style={styles.value}>
                  {new Date(order.createdAt).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Updated:</Text>
                <Text style={styles.value}>
                  {new Date(order.updatedAt).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Action Buttons — outside ScrollView to avoid touch conflicts */}
      {(canAcceptOrder(order) || canRejectOrder(order) || canUpdateStatus(order) || canUpdateDeliveryStatus(order) || canCancelOrder(order)) && (
        <View style={styles.actionsSection}>
          <View style={styles.actionsGrid}>
            {canAcceptOrder(order) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => setShowAcceptModal(true)}>
                <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Accept Order</Text>
              </TouchableOpacity>
            )}
            {canRejectOrder(order) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => setShowRejectModal(true)}>
                <MaterialIcons name="cancel" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Reject Order</Text>
              </TouchableOpacity>
            )}
            {canUpdateStatus(order) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.updateButton]}
                onPress={() => setShowUpdateStatusModal(true)}>
                <MaterialIcons name="update" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Update Status</Text>
              </TouchableOpacity>
            )}
            {canUpdateDeliveryStatus(order) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deliveryButton]}
                onPress={() => setShowDeliveryStatusModal(true)}>
                <MaterialIcons name="local-shipping" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Delivery Status</Text>
              </TouchableOpacity>
            )}
            {canCancelOrder(order) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => {
                  console.log('🔴 Cancel Order button pressed');
                  setShowCancelModal(true);
                }}>
                <MaterialIcons name="close" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Cancel Order</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Modals */}
      <AcceptOrderModal
        visible={showAcceptModal}
        orderNumber={order.orderNumber}
        onClose={() => setShowAcceptModal(false)}
        onAccept={async (prepTime) => {
          await acceptMutation.mutateAsync(prepTime);
        }}
      />

      <RejectOrderModal
        visible={showRejectModal}
        orderNumber={order.orderNumber}
        onClose={() => setShowRejectModal(false)}
        onReject={async (reason) => {
          await rejectMutation.mutateAsync(reason);
        }}
      />

      <UpdateStatusModal
        visible={showUpdateStatusModal}
        orderNumber={order.orderNumber}
        currentStatus={order.status}
        onClose={() => setShowUpdateStatusModal(false)}
        onUpdate={async (status, notes) => {
          await updateStatusMutation.mutateAsync({ status, notes });
        }}
      />

      <DeliveryStatusModal
        visible={showDeliveryStatusModal}
        orderNumber={order.orderNumber}
        onClose={() => {
          setShowDeliveryStatusModal(false);
          setPendingDeliveryStatus(null);
        }}
        onUpdate={async (data) => {
          await updateDeliveryStatusMutation.mutateAsync(data);
          setPendingDeliveryStatus(null);
        }}
        initialStatus={pendingDeliveryStatus as 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | undefined}
      />

      <CancelOrderModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelOrder}
        loading={cancelMutation.isPending}
        hasVouchers={order.voucherUsage?.voucherCount > 0}
      />
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 13,
    color: '#FF3B30',
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonError: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonErrorText: {
    color: '#3C3C43',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: rs(12),
    paddingBottom: rs(20),
    paddingHorizontal: wp(5),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  autoAcceptAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    marginHorizontal: wp(4),
    marginTop: hp(2),
    padding: rs(12),
    borderRadius: 8,
    borderLeftWidth: 4,
    gap: rs(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  autoAcceptAlertContent: {
    flex: 1,
    gap: rs(4),
  },
  autoAcceptAlertTitle: {
    fontSize: rf(14),
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  autoAcceptAlertText: {
    fontSize: rf(12),
    color: '#3C3C43',
    lineHeight: rf(16),
  },
  statusSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: rs(12),
    padding: rs(4),
  },
  headerContent: {
    flex: 1,
  },
  orderNumber: {
    fontSize: rf(20),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: rs(4),
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placedTime: {
    fontSize: rf(14),
    color: '#FFFFFF',
    opacity: 0.9,
  },
  menuTypeText: {
    fontSize: rf(13),
    color: '#FFFFFF',
    opacity: 0.85,
  },
  actionsSection: {
    backgroundColor: '#FFFFFF',
    padding: wp(4),
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    borderRadius: rs(8),
    gap: rs(6),
    minHeight: rs(44), // Minimum touch target size
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  updateButton: {
    backgroundColor: '#007AFF',
  },
  deliveryButton: {
    backgroundColor: '#5856D6',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: rf(14),
    fontWeight: '600',
  },
  section: {
    marginTop: rs(12),
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: '600',
    color: '#000000',
    marginBottom: rs(8),
    paddingHorizontal: wp(4),
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: wp(4),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: rs(12),
  },
  pricingDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: rs(8),
  },
  label: {
    fontSize: rf(14),
    color: '#8E8E93',
    flex: 1,
  },
  value: {
    fontSize: rf(14),
    color: '#000000',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  linkText: {
    color: '#007AFF',
  },
  addressText: {
    fontSize: 14,
    color: '#3C3C43',
    marginBottom: 4,
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  itemDetails: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  addonsContainer: {
    marginTop: 4,
    marginLeft: 12,
  },
  addonText: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#3C3C43',
  },
  priceValue: {
    fontSize: 14,
    color: '#3C3C43',
    fontWeight: '500',
  },
  discountText: {
    color: '#34C759',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  instructionsText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
  trackOrderButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FE8733',
    borderRadius: 8,
  },
  trackOrderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FE8733',
  },
});

export default OrderDetailAdminScreen;
