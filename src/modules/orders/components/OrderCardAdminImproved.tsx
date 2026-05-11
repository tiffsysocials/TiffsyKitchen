import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Modal,
  ScrollView,
  Vibration,
} from 'react-native';
import {Order, OrderStatus, MenuType} from '../../../types/api.types';

import Icon from 'react-native-vector-icons/MaterialIcons';
import AutoAcceptBadge from './AutoAcceptBadge';
import {OrderSourceBadge} from './OrderSourceBadge';

interface OrderCardAdminImprovedProps {
  order: Order;
  onPress: () => void;
  onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
  isUpdating?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
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

const getStatusIcon = (status: OrderStatus): string => {
  const icons: Record<OrderStatus, string> = {
    PLACED: 'receipt',
    SCHEDULED: 'event',
    ACCEPTED: 'check-circle',
    PREPARING: 'restaurant',
    READY: 'done-all',
    PICKED_UP: 'local-shipping',
    OUT_FOR_DELIVERY: 'delivery-dining',
    DELIVERED: 'home',
    CANCELLED: 'close',
    REJECTED: 'cancel',
    FAILED: 'error',
  };
  return icons[status] || 'fiber-manual-record';
};

const formatStatusText = (status: OrderStatus): string => {
  const formatted: Record<OrderStatus, string> = {
    PLACED: 'Placed',
    SCHEDULED: 'Scheduled',
    ACCEPTED: 'Accepted',
    PREPARING: 'Preparing',
    READY: 'Ready',
    PICKED_UP: 'Picked Up',
    OUT_FOR_DELIVERY: 'Out for Delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    REJECTED: 'Rejected',
    FAILED: 'Failed',
  };
  return formatted[status] || status;
};

const getMenuTypeColor = (menuType: MenuType): string => {
  return menuType === 'MEAL_MENU' ? '#34C759' : '#007AFF';
};

const formatDateTime = (date: string): string => {
  try {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return 'Unknown';
  }
};

// Quick status change options based on current status
// Backend accepts: PLACED, ACCEPTED, REJECTED, READY, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED
// Other statuses (PREPARING, CANCELLED, FAILED) are read-only
const getQuickStatusOptions = (currentStatus: OrderStatus): OrderStatus[] => {
  const statusFlow: Record<OrderStatus, OrderStatus[]> = {
    PLACED: ['ACCEPTED', 'REJECTED'],
    SCHEDULED: [], // Managed by cron, not manually changeable
    ACCEPTED: ['READY'],
    REJECTED: [], // Terminal - cannot change
    PREPARING: ['READY'], // Fallback: PREPARING not accepted by backend
    READY: ['PICKED_UP'],
    PICKED_UP: ['OUT_FOR_DELIVERY'],
    OUT_FOR_DELIVERY: ['DELIVERED'],
    DELIVERED: [], // Terminal - cannot change
    CANCELLED: [], // Terminal - cannot change
    FAILED: [], // Terminal - cannot change
  };

  return statusFlow[currentStatus] || [];
};

const OrderCardAdminImproved: React.FC<OrderCardAdminImprovedProps> = ({
  order,
  onPress,
  onStatusChange,
  isUpdating = false,
  selectionMode = false,
  isSelected = false,
  onSelect,
}) => {
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Log that the improved card is being used
  React.useEffect(() => {
    console.log('📦 OrderCardAdminImproved rendered for order:', order.orderNumber);
  }, [order.orderNumber]);

  const handleCallCustomer = (e: any) => {
    e.stopPropagation();
    if (order.userId?.phone) {
      Linking.openURL(`tel:${order.userId.phone}`);
    }
  };

  const handleStatusPress = (e: any) => {
    e.stopPropagation();
    if (!isUpdating && onStatusChange) {
      try {
        Vibration.vibrate(5);
      } catch (error) {
        // Ignore vibration errors
      }
      setShowStatusModal(true);
    }
  };

  const handleStatusSelect = (newStatus: OrderStatus) => {
    try {
      Vibration.vibrate(10);
    } catch (error) {
      // Ignore vibration errors
    }

    setShowStatusModal(false);
    if (onStatusChange) {
      onStatusChange(order._id, newStatus);
    }
  };

  const quickStatusOptions = getQuickStatusOptions(order.status);
  const canChangeStatus = onStatusChange && quickStatusOptions.length > 0 && !selectionMode;
  // Thalis = main-course items (or fallback to total items if isMainCourse flag is missing)
  const thaliCount = order.items?.reduce((sum, it) => {
    const isMain = (it as any).isMainCourse;
    if (isMain === undefined) return sum + (it.quantity || 0);
    return sum + (isMain ? (it.quantity || 0) : 0);
  }, 0) ?? 0;
  const addonCount = order.items?.reduce(
    (sum, it) => sum + ((it as any).addons?.reduce((s: number, a: any) => s + (a.quantity || 0), 0) ?? 0),
    0,
  ) ?? 0;

  return (
    <>
      <TouchableOpacity
        style={[styles.card, selectionMode && isSelected && styles.cardSelected]}
        onPress={onPress}
        activeOpacity={0.7}>
        {/* Selection Checkbox */}
        {selectionMode && (
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Icon name="check" size={14} color="#FFFFFF" />}
            </View>
          </View>
        )}

        {/* Header with Status Dropdown */}
        <View style={styles.header}>
          <View style={[styles.headerLeft, selectionMode && styles.headerLeftWithCheckbox]}>
            <Text style={styles.orderNumber} numberOfLines={1}>
              {order.orderNumber || 'N/A'}
            </Text>
            <Text style={styles.timeAgo} numberOfLines={1}>
              {formatDateTime(order.placedAt)}
            </Text>
          </View>

          {/* Thali + Addon count pills (next to status) */}
          <View style={styles.countPillsRow}>
            {thaliCount > 0 && (
              <View style={styles.thaliPill}>
                <Icon name="restaurant" size={12} color="#FFFFFF" />
                <Text style={styles.thaliPillText}>{thaliCount} {thaliCount === 1 ? 'thali' : 'thalis'}</Text>
              </View>
            )}
            {addonCount > 0 && (
              <View style={styles.addonPill}>
                <Icon name="add-circle" size={12} color="#FFFFFF" />
                <Text style={styles.addonPillText}>{addonCount} {addonCount === 1 ? 'addon' : 'addons'}</Text>
              </View>
            )}
          </View>

          {/* Status Badge with Dropdown */}
          <TouchableOpacity
            onPress={handleStatusPress}
            disabled={!canChangeStatus || isUpdating}
            activeOpacity={0.8}
            style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                {backgroundColor: getStatusColor(order.status)},
                !canChangeStatus && styles.statusBadgeDisabled,
              ]}>
              <Icon
                name={getStatusIcon(order.status)}
                size={12}
                color="#FFFFFF"
                style={styles.statusIcon}
              />
              <Text style={styles.statusText} numberOfLines={1}>
                {formatStatusText(order.status)}
              </Text>
              {canChangeStatus && !isUpdating && (
                <Icon name="arrow-drop-down" size={14} color="#FFFFFF" />
              )}
              {isUpdating && (
                <Icon name="sync" size={12} color="#FFFFFF" style={styles.syncIcon} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Auto-Accept Badge */}
        <AutoAcceptBadge order={order} size="small" showLabel={true} />

        {/* Customer Info - Compact */}
        <View style={styles.compactInfoRow}>
          <Icon name="person" size={16} color="#6b7280" style={styles.compactIcon} />
          <Text style={styles.compactText} numberOfLines={1}>
            {order.userId?.name || 'Unknown'}
          </Text>
          <TouchableOpacity onPress={handleCallCustomer} style={styles.compactPhoneButton}>
            <Icon name="phone" size={14} color="#f97316" />
          </TouchableOpacity>
        </View>

        {/* Kitchen Info - Compact */}
        <View style={styles.compactInfoRow}>
          <Icon name="restaurant" size={16} color="#6b7280" style={styles.compactIcon} />
          <Text style={styles.compactText} numberOfLines={1}>
            {order.kitchenId?.name || 'Unknown'}
          </Text>
        </View>

        {/* Items Summary */}
        {order.items && order.items.length > 0 && (
          <View style={styles.itemsSummary}>
            <Icon name="fastfood" size={14} color="#6b7280" style={styles.compactIcon} />
            <Text style={styles.itemsSummaryText} numberOfLines={2}>
              {order.items.map(item => `${item.name} x${item.quantity}`).join(', ')}
            </Text>
          </View>
        )}

        {/* Delivery Address */}
        {order.deliveryAddress && (
          <View style={styles.compactInfoRow}>
            <Icon name="location-on" size={16} color="#6b7280" style={styles.compactIcon} />
            <Text style={styles.compactText} numberOfLines={2}>
              {[
                order.deliveryAddress.addressLine1,
                order.deliveryAddress.locality,
                order.deliveryAddress.pincode,
              ].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}

        {/* Zone Info */}
        {order.zoneId && typeof order.zoneId === 'object' && (
          <View style={styles.compactInfoRow}>
            <Icon name="map" size={16} color="#6b7280" style={styles.compactIcon} />
            <Text style={styles.compactText} numberOfLines={1}>
              {order.zoneId.name} - {order.zoneId.pincode}
            </Text>
          </View>
        )}

        {/* Scheduled Delivery Date — only while the order is still pending promotion */}
        {order.status === 'SCHEDULED' && (
          <View style={styles.scheduledDateRow}>
            <Icon name="event" size={16} color="#6366f1" style={styles.compactIcon} />
            <Text style={styles.scheduledDateText} numberOfLines={1}>
              Scheduled for: {new Date(order.scheduledFor || order.estimatedDeliveryTime || order.createdAt).toLocaleDateString('en-IN', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                timeZone: 'Asia/Kolkata',
              })}{order.mealWindow ? ` · ${order.mealWindow}` : ''}
            </Text>
          </View>
        )}

        {/* Estimated Delivery Time - for non-scheduled orders */}
        {order.status !== 'SCHEDULED' && order.estimatedDeliveryTime && (
          <View style={styles.compactInfoRow}>
            <Icon name="schedule" size={16} color="#6b7280" style={styles.compactIcon} />
            <Text style={styles.compactText} numberOfLines={1}>
              ETA: {new Date(order.estimatedDeliveryTime).toLocaleString('en-IN', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </View>
        )}

        {/* Special Instructions */}
        {order.specialInstructions && (
          <View style={styles.specialInstructionsRow}>
            <Icon name="note" size={14} color="#d97706" style={styles.compactIcon} />
            <Text style={styles.specialInstructionsText} numberOfLines={2}>
              {order.specialInstructions}
            </Text>
          </View>
        )}

        {/* Cancellation Info */}
        {order.status === 'CANCELLED' && order.cancellationReason && (
          <View style={styles.cancellationRow}>
            <Icon name="info" size={14} color="#dc2626" style={styles.compactIcon} />
            <Text style={styles.cancellationText} numberOfLines={2}>
              {order.cancelledBy ? `By ${order.cancelledBy}: ` : ''}{order.cancellationReason}
            </Text>
          </View>
        )}

        {/* Tags Row */}
        <View style={styles.tagsRow}>
          {order.orderSource !== 'SCHEDULED' && <OrderSourceBadge orderSource={order.orderSource} />}
          <View
            style={[
              styles.tag,
              {
                borderColor: getMenuTypeColor(order.menuType),
                backgroundColor: `${getMenuTypeColor(order.menuType)}10`,
              },
            ]}>
            <Text
              style={[
                styles.tagText,
                {color: getMenuTypeColor(order.menuType)},
              ]}>
              {order.menuType === 'MEAL_MENU' ? 'MEAL' : 'ON-DEMAND'}
            </Text>
          </View>

          {order.mealWindow && (
            <View style={[styles.tag, styles.mealWindowTag]}>
              <Text style={styles.mealWindowText} numberOfLines={1}>
                {order.mealWindow}
              </Text>
            </View>
          )}

          {/* Payment Status Tag */}
          {order.paymentStatus && (
            <View style={[styles.tag, {
              borderColor: order.paymentStatus === 'PAID' ? '#16a34a' : order.paymentStatus === 'FAILED' ? '#dc2626' : '#d97706',
              backgroundColor: order.paymentStatus === 'PAID' ? '#dcfce7' : order.paymentStatus === 'FAILED' ? '#fef2f2' : '#fefce8',
            }]}>
              <Text style={[styles.tagText, {
                color: order.paymentStatus === 'PAID' ? '#16a34a' : order.paymentStatus === 'FAILED' ? '#dc2626' : '#d97706',
              }]}>
                {order.paymentStatus}
              </Text>
            </View>
          )}

          {/* Payment Method Tag */}
          {order.paymentMethod && (
            <View style={[styles.tag, { borderColor: '#9ca3af', backgroundColor: '#f9fafb' }]}>
              <Text style={[styles.tagText, { color: '#6b7280' }]}>
                {order.paymentMethod}
              </Text>
            </View>
          )}

          {(order.items?.length ?? 0) > 0 && (
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText} numberOfLines={1}>
                {order.items?.length} {order.items?.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total:</Text>
            <Text style={styles.amountValue} numberOfLines={1}>
              ₹{(order.grandTotal || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.footerRight}>
            {order.discount && order.discount.discountAmount > 0 && (
              <View style={styles.discountBadge}>
                <Icon name="local-offer" size={10} color="#16a34a" />
                <Text style={styles.discountText} numberOfLines={1}>
                  -{'\u20B9'}{order.discount.discountAmount.toFixed(0)}
                  {order.discount.couponCode ? ` (${order.discount.couponCode})` : ''}
                </Text>
              </View>
            )}
            {order.voucherUsage && order.voucherUsage.voucherCount > 0 && (
              <View style={styles.voucherBadge}>
                <Text style={styles.voucherText} numberOfLines={1}>
                  {order.voucherUsage.voucherCount}V
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Status Change Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="swap-vert" size={20} color="#007AFF" />
              <Text style={styles.modalTitle}>Quick Status Change</Text>
              <TouchableOpacity
                onPress={() => setShowStatusModal(false)}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Icon name="close" size={20} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalOrderNumber}>{order.orderNumber}</Text>

            <View style={styles.currentStatusRow}>
              <Text style={styles.currentStatusLabel}>Current:</Text>
              <View
                style={[
                  styles.currentStatusBadge,
                  {backgroundColor: getStatusColor(order.status)},
                ]}>
                <Icon
                  name={getStatusIcon(order.status)}
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.currentStatusText}>
                  {formatStatusText(order.status)}
                </Text>
              </View>
            </View>

            <Text style={styles.optionsLabel}>Change to:</Text>
            <ScrollView style={styles.statusList}>
              {quickStatusOptions.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={styles.statusOption}
                  onPress={() => handleStatusSelect(status)}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.statusOptionIcon,
                      {backgroundColor: getStatusColor(status)},
                    ]}>
                    <Icon
                      name={getStatusIcon(status)}
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>
                  <Text style={styles.statusOptionText}>
                    {formatStatusText(status)}
                  </Text>
                  <Icon name="chevron-right" size={20} color="#8E8E93" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={() => {
                setShowStatusModal(false);
                onPress();
              }}>
              <Text style={styles.viewDetailsText}>View Full Details</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardSelected: {
    borderColor: '#FE8733',
    borderWidth: 2,
    backgroundColor: '#FFF5F3',
  },
  checkboxContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#FE8733',
    borderColor: '#FE8733',
  },
  headerLeftWithCheckbox: {
    marginLeft: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
    minWidth: 0,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  timeAgo: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  statusContainer: {
    flexShrink: 0,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusBadgeDisabled: {
    opacity: 0.9,
  },
  countPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 6,
  },
  thaliPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FE8733',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#FE8733',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  thaliPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  addonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  addonPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  statusIcon: {
    marginRight: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  syncIcon: {
    marginLeft: 2,
  },
  compactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 1,
  },
  compactIcon: {
    marginRight: 8,
    flexShrink: 0,
  },
  compactText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    lineHeight: 18,
  },
  compactPhoneButton: {
    padding: 4,
    marginLeft: 4,
  },
  itemsSummary: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingVertical: 1,
  },
  itemsSummaryText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    lineHeight: 17,
    fontStyle: 'italic',
  },
  specialInstructionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#d97706',
  },
  specialInstructionsText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#92400e',
    lineHeight: 17,
  },
  scheduledDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#eef2ff',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  scheduledDateText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#4338ca',
    lineHeight: 18,
  },
  cancellationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  cancellationText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#991b1b',
    lineHeight: 17,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  mealWindowTag: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  mealWindowText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.3,
  },
  itemCountBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemCountText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
    marginTop: 6,
  },
  amountContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
  },
  amountLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginBottom: 3,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#16a34a',
    gap: 3,
  },
  discountText: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  voucherBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10b981',
    flexShrink: 0,
  },
  voucherText: {
    fontSize: 10,
    color: '#047857',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 380,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  modalOrderNumber: {
    fontSize: 13,
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  currentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  currentStatusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  currentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  currentStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusList: {
    maxHeight: 240,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  statusOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  viewDetailsButton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    backgroundColor: '#F9F9F9',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default OrderCardAdminImproved;
