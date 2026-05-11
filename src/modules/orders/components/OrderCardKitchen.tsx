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
import { wp, hp, rf, rs } from '../../../theme/responsive';
import AutoAcceptBadge from './AutoAcceptBadge';

interface OrderCardKitchenProps {
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

const getStatusIcon = (status: OrderStatus): string => {
  const icons: Record<OrderStatus, string> = {
    PENDING_KITCHEN_ACCEPTANCE: 'hourglass-top',
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
    PENDING_KITCHEN_ACCEPTANCE: 'Pending Acceptance',
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

// Helper function to check if order is auto-accepted
const isAutoAccepted = (order: Order): boolean => {
  const acceptEntry = order.statusTimeline?.find(
    entry => entry.status === 'ACCEPTED'
  );
  return acceptEntry?.notes?.toLowerCase().includes('auto-accepted') || false;
};

// Helper function to check if order is auto-order (subscription-based)
const isAutoOrder = (order: Order | any): boolean => {
  // Check explicit flag if available
  if ('isAutoOrder' in order && order.isAutoOrder === true) {
    return true;
  }
  // Check special instructions
  if (order.specialInstructions?.toLowerCase() === 'auto-order') {
    return true;
  }
  // Check payment method and voucher usage
  if (order.paymentMethod === 'VOUCHER_ONLY' &&
      order.voucherUsage?.voucherCount > 0 &&
      order.status === 'ACCEPTED') {
    return true;
  }
  return false;
};

// Kitchen-specific status flow: PLACED → ACCEPTED/REJECTED → PREPARING → READY
const getKitchenStatusOptions = (currentStatus: OrderStatus): OrderStatus[] => {
  const statusFlow: Record<OrderStatus, OrderStatus[]> = {
    PENDING_KITCHEN_ACCEPTANCE: ['ACCEPTED', 'REJECTED'],
    PLACED: ['ACCEPTED', 'REJECTED'],
    SCHEDULED: [], // Managed by cron
    ACCEPTED: ['PREPARING'],
    REJECTED: [], // Terminal - cannot change
    PREPARING: ['READY'],
    READY: [], // Terminal for kitchen - no more actions
    PICKED_UP: [], // Not kitchen responsibility
    OUT_FOR_DELIVERY: [], // Not kitchen responsibility
    DELIVERED: [], // Terminal
    CANCELLED: [], // Terminal
    FAILED: [], // Terminal
  };

  return statusFlow[currentStatus] || [];
};

const OrderCardKitchen: React.FC<OrderCardKitchenProps> = ({
  order,
  onPress,
  onStatusChange,
  isUpdating = false,
  selectionMode = false,
  isSelected = false,
  onSelect,
}) => {
  const [showStatusModal, setShowStatusModal] = useState(false);

  const handleCardPress = () => {
    console.log('🔵 OrderCardKitchen: Card pressed for order:', order._id);
    onPress();
  };

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

  const kitchenStatusOptions = getKitchenStatusOptions(order.status);
  const canChangeStatus = onStatusChange && kitchenStatusOptions.length > 0;
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
        style={[
          styles.card,
          selectionMode && isSelected && styles.cardSelected,
        ]}
        onPress={handleCardPress}
        activeOpacity={0.7}
      >
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

        {/* Customer Info - Compact - Only show if customer name is available */}
        {order.userId?.name && (
          <View style={styles.compactInfoRow}>
            <Icon name="person" size={16} color="#6b7280" style={styles.compactIcon} />
            <Text style={styles.compactText} numberOfLines={1}>
              {order.userId.name}
            </Text>
            <TouchableOpacity onPress={handleCallCustomer} style={styles.compactPhoneButton}>
              <Icon name="phone" size={14} color="#f97316" />
            </TouchableOpacity>
          </View>
        )}

        {/* Kitchen Info - Hidden for kitchen staff as they're viewing their own orders */}

        {/* Tags Row */}
        <View style={styles.tagsRow}>
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

          <View style={styles.itemCountBadge}>
            <Text style={styles.itemCountText} numberOfLines={1}>
              {order.items?.reduce((sum, item) => sum + item.quantity, 0) || order.itemCount || 0} items
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Total:</Text>
            <Text style={styles.amountValue} numberOfLines={1}>
              ₹{(order.grandTotal || 0).toFixed(2)}
            </Text>
          </View> */}
          {order.voucherUsage && order.voucherUsage.voucherCount > 0 && (
            <View style={styles.voucherBadge}>
              <Text style={styles.voucherText} numberOfLines={1}>
                {order.voucherUsage.voucherCount}V
              </Text>
            </View>
          )}
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
              <Icon name="swap-vert" size={20} color="#FE8733" />
              <Text style={styles.modalTitle}>Kitchen Status Update</Text>
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
              {kitchenStatusOptions.map((status) => (
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
    borderRadius: rs(12),
    padding: wp(3),
    marginBottom: rs(10),
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: rs(4),
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
    top: rs(10),
    left: rs(10),
    zIndex: 10,
  },
  checkbox: {
    width: rs(20),
    height: rs(20),
    borderRadius: rs(10),
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
  headerLeftWithCheckbox: {
    marginLeft: rs(38),
  },
  orderNumber: {
    fontSize: rf(15),
    fontWeight: '700',
    color: '#111827',
    marginBottom: rs(3),
    letterSpacing: 0.2,
  },
  timeAgo: {
    fontSize: rf(11),
    color: '#9ca3af',
    fontWeight: '600',
  },
  statusContainer: {
    flexShrink: 0,
  },
  statusBadge: {
    paddingHorizontal: rs(10),
    paddingVertical: rs(6),
    borderRadius: rs(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: rs(2),
    minHeight: rs(32),
  },
  statusBadgeDisabled: {
    opacity: 0.9,
  },
  countPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    marginRight: rs(6),
  },
  thaliPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FE8733',
    paddingHorizontal: rs(8),
    paddingVertical: rs(5),
    borderRadius: rs(14),
    elevation: 2,
    shadowColor: '#FE8733',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: rs(2),
  },
  thaliPillText: {
    fontSize: rf(11),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  addonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#34C759',
    paddingHorizontal: rs(8),
    paddingVertical: rs(5),
    borderRadius: rs(14),
    elevation: 2,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: rs(2),
  },
  addonPillText: {
    fontSize: rf(11),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  statusIcon: {
    marginRight: 2,
  },
  statusText: {
    fontSize: rf(10),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  syncIcon: {
    marginLeft: rs(2),
  },
  compactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rs(8),
    paddingVertical: rs(1),
  },
  compactIcon: {
    marginRight: rs(8),
    flexShrink: 0,
  },
  compactText: {
    flex: 1,
    fontSize: rf(13),
    fontWeight: '600',
    color: '#374151',
    lineHeight: rf(18),
  },
  compactPhoneButton: {
    padding: 4,
    marginLeft: 4,
  },
  scheduledDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rs(8),
    backgroundColor: '#eef2ff',
    padding: rs(8),
    borderRadius: rs(6),
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  scheduledDateText: {
    flex: 1,
    fontSize: rf(13),
    fontWeight: '700',
    color: '#4338ca',
    lineHeight: rf(18),
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
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
    // borderTopWidth: 1,
    // borderTopColor: '#f3f4f6',
    paddingTop: 4,
    marginTop: 2,
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
    color: '#FE8733',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default OrderCardKitchen;
