import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService } from '../../../services/orders.service';
import kitchenService from '../../../services/kitchen.service';
import { Order, OrderStatus } from '../../../types/api.types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import OrderCardKitchen from '../components/OrderCardKitchen';
import OrderDetailAdminScreen from './OrderDetailAdminScreen';
import { AcceptOrderModal } from '../components/AcceptOrderModal';
import { RejectOrderModal } from '../components/RejectOrderModal';
import { Calendar } from 'react-native-calendars';
import { isAutoOrder, isAutoAccepted } from '../../../utils/autoAccept';
import { useAlert } from '../../../hooks/useAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GradientBox } from '../../../components/common/GradientBox';

type StatusFilterValue = OrderStatus | 'ALL' | 'AUTO_ORDERS' | 'FAILED_PAYMENTS';

const STATUS_FILTERS: { label: string; value: StatusFilterValue }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Pending', value: 'PENDING_KITCHEN_ACCEPTANCE' },
  { label: 'Placed', value: 'PLACED' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Auto-Orders', value: 'AUTO_ORDERS' },
  { label: 'Preparing', value: 'PREPARING' },
  { label: 'Ready', value: 'READY' },
  { label: 'Failed Payments', value: 'FAILED_PAYMENTS' },
];

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MEAL_WINDOW_FILTERS: { label: string; value: 'ALL' | 'LUNCH' | 'DINNER' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Lunch', value: 'LUNCH' },
  { label: 'Dinner', value: 'DINNER' },
];

interface KitchenOrdersScreenProps {
  onMenuPress?: () => void;
  navigation?: any;
}

const KitchenOrdersScreen: React.FC<KitchenOrdersScreenProps> = ({
  onMenuPress,
  navigation,
}) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError, showWarning, showConfirm } = useAlert();
  const [selectedStatus, setSelectedStatus] = useState<StatusFilterValue>('ALL');
  const [selectedMealWindow, setSelectedMealWindow] = useState<'ALL' | 'LUNCH' | 'DINNER'>('ALL');
  const [page, setPage] = useState(1);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [pendingAcceptOrderId, setPendingAcceptOrderId] = useState<string | null>(null);
  const [pendingRejectOrderId, setPendingRejectOrderId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(getTodayDateString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [kitchenId, setKitchenId] = useState<string | null>(null);

  // Load kitchenId from AsyncStorage for geo accept/reject
  React.useEffect(() => {
    const loadKitchenId = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          setKitchenId(parsed.kitchenId || null);
        }
      } catch (error) {
        console.error('Error loading kitchenId:', error);
      }
    };
    loadKitchenId();
  }, []);

  // Fetch kitchen orders
  const {
    data: ordersData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['kitchenOrders', selectedStatus, selectedMealWindow, selectedDate, page],
    queryFn: () => {
      const params: any = {
        mealWindow: selectedMealWindow === 'ALL' ? undefined : selectedMealWindow,
        page,
        limit: 50,
      };
      // For SCHEDULED filter, use orderSource instead of status
      // because scheduled orders transition to PLACED/ACCEPTED etc. but keep orderSource='SCHEDULED'
      if (selectedStatus === 'SCHEDULED') {
        params.orderSource = 'SCHEDULED';
      } else if (
        selectedStatus !== 'ALL' &&
        selectedStatus !== 'AUTO_ORDERS' &&
        selectedStatus !== 'FAILED_PAYMENTS'
      ) {
        params.status = selectedStatus;
      }
      // Skip date filter for SCHEDULED orders (they have future delivery dates)
      if (selectedStatus !== 'SCHEDULED') {
        params.date = selectedDate || undefined;
      }
      return ordersService.getKitchenOrders(params);
    },
  });

  // Helper to check if an order is scheduled
  const isScheduledOrder = (order: Order) =>
    order.orderSource === 'SCHEDULED' || order.isScheduledMeal || order.status === 'SCHEDULED';

  // Hide orders whose payment never completed (PENDING) or failed (FAILED) from default views.
  // These are surfaced only via the dedicated "Failed Payments" filter.
  const hasVisiblePayment = (order: Order) =>
    order.paymentStatus !== 'PENDING' && order.paymentStatus !== 'FAILED';

  // Filter orders for auto-orders view, exclude SCHEDULED from "All"
  const filteredOrders = useMemo(() => {
    const orders = ordersData?.orders || [];
    if (selectedStatus === 'FAILED_PAYMENTS') {
      return orders.filter(order => order.paymentStatus === 'FAILED');
    }
    if (selectedStatus === 'AUTO_ORDERS') {
      return orders.filter(order =>
        (isAutoOrder(order) || isAutoAccepted(order)) && hasVisiblePayment(order)
      );
    }
    if (selectedStatus === 'ALL') {
      // Exclude scheduled orders and pending/failed payments from "All" view
      return orders.filter(order => !isScheduledOrder(order) && hasVisiblePayment(order));
    }
    if (selectedStatus === 'SCHEDULED') {
      // Client-side filter: show orders that are scheduled (via any field)
      return orders.filter(order => isScheduledOrder(order) && hasVisiblePayment(order));
    }
    return orders.filter(hasVisiblePayment);
  }, [ordersData, selectedStatus]);

  // Update order status mutation (Kitchen-specific endpoint)
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      console.log('====================================');
      console.log('🔄 KITCHEN STATUS UPDATE');
      console.log('====================================');
      console.log('Order ID:', orderId);
      console.log('New Status:', status);
      console.log('Using Kitchen Endpoint: /api/orders/:id/status');
      console.log('====================================');

      // Use the kitchen endpoint for status updates
      return ordersService.updateOrderStatus(orderId, { status });
    },
    onMutate: ({ orderId }) => {
      setUpdatingOrderId(orderId);
    },
    onSuccess: (updatedOrder, variables) => {
      const newStatus = updatedOrder?.status || variables.status;
      console.log('✅ Status updated successfully to:', newStatus);

      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['kitchenOrders'] });

      showSuccess('Success', `Order status updated to ${newStatus}`);
      setUpdatingOrderId(null);
    },
    onError: (error: any, { orderId }) => {
      console.log('❌ Status update failed:', error);

      setUpdatingOrderId(null);
      showError(
        'Update Failed',
        error?.response?.data?.error?.message || 'Failed to update order status',
      );
    },
  });

  // Accept order mutation
  const acceptMutation = useMutation({
    mutationFn: ({ orderId, estimatedPrepTime }: { orderId: string; estimatedPrepTime: number }) =>
      ordersService.acceptOrder(orderId, estimatedPrepTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchenOrders'] });
      showSuccess('Success', 'Order accepted successfully');
      setPendingAcceptOrderId(null);
    },
    onError: (error: any) => {
      showError(
        'Error',
        error?.response?.data?.error?.message || 'Failed to accept order. Please try again.',
      );
    },
  });

  // Reject order mutation
  const rejectMutation = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      ordersService.rejectOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchenOrders'] });
      showSuccess('Success', 'Order rejected successfully');
      setPendingRejectOrderId(null);
    },
    onError: (error: any) => {
      showError(
        'Error',
        error?.response?.data?.error?.message || 'Failed to reject order. Please try again.',
      );
    },
  });

  // Geo accept mutation (for PENDING_KITCHEN_ACCEPTANCE orders)
  const geoAcceptMutation = useMutation({
    mutationFn: ({ kitchenId: kId, orderId }: { kitchenId: string; orderId: string }) =>
      kitchenService.acceptPendingOrder(kId, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchenOrders'] });
      showSuccess('Success', 'Order accepted successfully');
      setPendingAcceptOrderId(null);
    },
    onError: (error: any) => {
      showError(
        'Error',
        error?.response?.data?.error?.message || 'Failed to accept order. Please try again.',
      );
    },
  });

  // Geo reject mutation (for PENDING_KITCHEN_ACCEPTANCE orders)
  const geoRejectMutation = useMutation({
    mutationFn: ({ kitchenId: kId, orderId, reason }: { kitchenId: string; orderId: string; reason: string }) =>
      kitchenService.rejectPendingOrder(kId, orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchenOrders'] });
      showSuccess('Success', 'Order rejected successfully');
      setPendingRejectOrderId(null);
    },
    onError: (error: any) => {
      showError(
        'Error',
        error?.response?.data?.error?.message || 'Failed to reject order. Please try again.',
      );
    },
  });

  // Bulk status update mutation
  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ orderIds, status }: { orderIds: string[]; status: OrderStatus }) => {
      console.log('====================================');
      console.log('🔄 BULK STATUS UPDATE');
      console.log('====================================');
      console.log('Order IDs:', orderIds);
      console.log('New Status:', status);
      console.log('====================================');

      // Update all orders in parallel
      const promises = orderIds.map(orderId =>
        ordersService.updateOrderStatus(orderId, { status })
      );
      return Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kitchenOrders'] });
      showSuccess('Success', `${variables.orderIds.length} order(s) updated to ${variables.status}`);
      setSelectedOrderIds(new Set());
      setSelectionMode(false);
      setShowBulkStatusModal(false);
    },
    onError: (error: any) => {
      showError(
        'Update Failed',
        error?.response?.data?.error?.message || 'Failed to update orders. Please try again.',
      );
    },
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleStatusFilter = (status: StatusFilterValue) => {
    setSelectedStatus(status);
    setPage(1);
  };

  const handleMealWindowFilter = (mealWindow: 'ALL' | 'LUNCH' | 'DINNER') => {
    setSelectedMealWindow(mealWindow);
    setPage(1);
  };

  const handleDateSelect = (dateString: string) => {
    setSelectedDate(dateString);
    setShowDatePicker(false);
    setPage(1);
  };

  const handleClearDate = () => {
    setSelectedDate(null);
    setPage(1);
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time part for comparison
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return 'Today';
    } else if (date.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const handleOrderPress = (orderId: string) => {
    console.log('🔍 ORDER CARD CLICKED - Opening order details for:', orderId);
    setSelectedOrderId(orderId);
  };

  const handleBackFromOrderDetail = () => {
    setSelectedOrderId(null);
    // Refresh orders list
    refetch();
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    // Handle ACCEPTED and REJECTED specially - they require modals with additional data
    if (newStatus === 'ACCEPTED') {
      setPendingAcceptOrderId(orderId);
      return;
    }

    if (newStatus === 'REJECTED') {
      setPendingRejectOrderId(orderId);
      return;
    }

    // For other status changes (PREPARING, READY), use regular update
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedOrderIds(new Set());
  };

  const handleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrderIds);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrderIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.size === ordersData?.orders.length) {
      setSelectedOrderIds(new Set());
    } else {
      const allIds = new Set(ordersData?.orders.map(order => order._id) || []);
      setSelectedOrderIds(allIds);
    }
  };

  const handleBulkStatusUpdate = (status: OrderStatus) => {
    if (selectedOrderIds.size === 0) {
      showWarning('No Selection', 'Please select at least one order');
      return;
    }

    showConfirm(
      'Confirm Bulk Update',
      `Update ${selectedOrderIds.size} order(s) to ${status}?`,
      () => {
        bulkUpdateStatusMutation.mutate({
          orderIds: Array.from(selectedOrderIds),
          status,
        });
      },
      undefined,
      { confirmText: 'Update', cancelText: 'Cancel' }
    );
  };

  const handleLoadMore = () => {
    if (
      ordersData &&
      ordersData.pagination.page < ordersData.pagination.pages &&
      !isFetching
    ) {
      setPage((prev) => prev + 1);
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    return (
      <OrderCardKitchen
        order={item}
        onPress={() => selectionMode ? handleOrderSelection(item._id) : handleOrderPress(item._id)}
        onStatusChange={handleStatusChange}
        isUpdating={updatingOrderId === item._id}
        selectionMode={selectionMode}
        isSelected={selectedOrderIds.has(item._id)}
        onSelect={() => handleOrderSelection(item._id)}
      />
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyState}>
        <Icon name="restaurant" size={64} color="#E5E5EA" />
        <Text style={styles.emptyStateText}>No orders found</Text>
        <Text style={styles.emptyStateSubtext}>
          {selectedStatus === 'ALL'
            ? 'No orders available'
            : selectedStatus === 'FAILED_PAYMENTS'
              ? 'No failed payments for the selected date'
              : `No orders with status "${selectedStatus}"`}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isFetching) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#FE8733" />
      </View>
    );
  };

  // If an order is selected, show the order detail screen
  if (selectedOrderId) {
    return (
      <OrderDetailAdminScreen
        route={{ params: { orderId: selectedOrderId } }}
        navigation={{ goBack: handleBackFromOrderDetail }}
        isKitchenMode={true}
      />
    );
  }

  return (
    <SafeAreaScreen
      topBackgroundColor="#FE8733"
      bottomBackgroundColor="#f9fafb"
      backgroundColor="#f9fafb"
    >
      {/* Header */}
      {onMenuPress && (
        <GradientBox style={[styles.header, { paddingTop: 8 }]}>
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <Icon name="menu" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {selectionMode ? `${selectedOrderIds.size} Selected` : 'Kitchen Orders'}
          </Text>
          <View style={styles.headerActions}>
            {selectionMode ? (
              <>
                <TouchableOpacity onPress={handleSelectAll} style={styles.iconButton}>
                  <Icon
                    name={selectedOrderIds.size === ordersData?.orders.length ? "check-box" : "check-box-outline-blank"}
                    size={22}
                    color="#ffffff"
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleSelectionMode} style={styles.iconButton}>
                  <Icon name="close" size={22} color="#ffffff" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={toggleSelectionMode} style={styles.iconButton}>
                  <Icon name="checklist" size={22} color="#ffffff" />
                </TouchableOpacity>
                {selectedDate && (
                  <TouchableOpacity onPress={handleClearDate} style={styles.clearDateButton}>
                    <Icon name="close" size={20} color="#ffffff" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
                  <Icon name="calendar-today" size={22} color="#ffffff" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </GradientBox>
      )}

      {/* Selected Date Display */}
      {selectedDate && (
        <View style={styles.selectedDateContainer}>
          <Icon name="event" size={18} color="#FE8733" />
          <Text style={styles.selectedDateText}>{formatDisplayDate(selectedDate)}</Text>
        </View>
      )}

      {/* Meal Window Filters */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Meal Window:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}>
          {MEAL_WINDOW_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                selectedMealWindow === filter.value && styles.filterChipActive,
              ]}
              onPress={() => handleMealWindowFilter(filter.value)}>
              <Text
                style={[
                  styles.filterChipText,
                  selectedMealWindow === filter.value && styles.filterChipTextActive,
                ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Status Filters */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Status:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}>
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                selectedStatus === filter.value && styles.filterChipActive,
              ]}
              onPress={() => handleStatusFilter(filter.value)}>
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === filter.value && styles.filterChipTextActive,
                ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      <View style={styles.ordersSection}>
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && !isFetching}
              onRefresh={handleRefresh}
            />
          }
          ListEmptyComponent={!isLoading ? renderEmptyState : null}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={[
            styles.listContainer,
            (!ordersData || ordersData.orders.length === 0) &&
            styles.emptyListContainer,
          ]}
        />
      </View>

      {/* Bulk Action Bar */}
      {selectionMode && selectedOrderIds.size > 0 && (
        <View style={styles.bulkActionBar}>
          <View style={styles.bulkActionHeader}>
            <Text style={styles.bulkActionTitle}>
              {selectedOrderIds.size} selected
            </Text>
            <TouchableOpacity onPress={() => setSelectedOrderIds(new Set())} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bulkActionButtons}>
            <TouchableOpacity
              style={[styles.bulkButton, styles.preparingButton]}
              onPress={() => handleBulkStatusUpdate('PREPARING')}
              disabled={bulkUpdateStatusMutation.isPending}
            >
              <Icon name="restaurant" size={18} color="#FFFFFF" />
              <Text style={styles.bulkButtonText}>Preparing</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkButton, styles.readyButton]}
              onPress={() => handleBulkStatusUpdate('READY')}
              disabled={bulkUpdateStatusMutation.isPending}
            >
              <Icon name="done-all" size={18} color="#FFFFFF" />
              <Text style={styles.bulkButtonText}>Ready</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Accept Order Modal */}
      {pendingAcceptOrderId && (
        <AcceptOrderModal
          visible={!!pendingAcceptOrderId}
          orderNumber={
            ordersData?.orders.find((o) => o._id === pendingAcceptOrderId)?.orderNumber || ''
          }
          onClose={() => setPendingAcceptOrderId(null)}
          onAccept={async (prepTime) => {
            const order = filteredOrders.find(o => o._id === pendingAcceptOrderId);
            if (order?.status === 'PENDING_KITCHEN_ACCEPTANCE' && kitchenId) {
              await geoAcceptMutation.mutateAsync({ kitchenId, orderId: pendingAcceptOrderId });
            } else {
              await acceptMutation.mutateAsync({
                orderId: pendingAcceptOrderId,
                estimatedPrepTime: prepTime,
              });
            }
          }}
        />
      )}

      {/* Reject Order Modal */}
      {pendingRejectOrderId && (
        <RejectOrderModal
          visible={!!pendingRejectOrderId}
          orderNumber={
            ordersData?.orders.find((o) => o._id === pendingRejectOrderId)?.orderNumber || ''
          }
          onClose={() => setPendingRejectOrderId(null)}
          onReject={async (reason) => {
            const order = filteredOrders.find(o => o._id === pendingRejectOrderId);
            if (order?.status === 'PENDING_KITCHEN_ACCEPTANCE' && kitchenId) {
              await geoRejectMutation.mutateAsync({ kitchenId, orderId: pendingRejectOrderId, reason });
            } else {
              await rejectMutation.mutateAsync({
                orderId: pendingRejectOrderId,
                reason,
              });
            }
          }}
        />
      )}

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Icon name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={(day) => handleDateSelect(day.dateString)}
              markedDates={
                selectedDate
                  ? {
                      [selectedDate]: {
                        selected: true,
                        selectedColor: '#FE8733',
                      },
                    }
                  : {}
              }
              theme={{
                todayTextColor: '#FE8733',
                selectedDayBackgroundColor: '#FE8733',
                selectedDayTextColor: '#ffffff',
                arrowColor: '#FE8733',
                monthTextColor: '#111827',
                textMonthFontWeight: '600',
                textDayFontSize: 14,
                textMonthFontSize: 16,
              }}
              maxDate={new Date().toISOString().split('T')[0]}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  clearDateButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FE8733',
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#FE8733',
    borderColor: '#FE8733',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  ordersSection: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingFooter: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  bulkActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderTopColor: '#FE8733',
    paddingHorizontal: 16,
    paddingVertical: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bulkActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bulkActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  preparingButton: {
    backgroundColor: '#FFCC00',
  },
  readyButton: {
    backgroundColor: '#FF9500',
  },
  bulkButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  iconButton: {
    padding: 4,
  },
});

export default KitchenOrdersScreen;
