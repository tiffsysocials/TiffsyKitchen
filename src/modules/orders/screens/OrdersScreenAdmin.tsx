import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
// import {useSafeAreaInsets} from 'react-native-safe-area-context'; // Removed
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { ordersService } from '../../../services/orders.service';
import kitchenService from '../../../services/kitchen.service';
import { Order, OrderStatus } from '../../../types/api.types';
import OrderCardAdminImproved from '../components/OrderCardAdminImproved';
import OrderStatsCard from '../components/OrderStatsCard';
import ExpandableKitchenOrderCard from '../components/ExpandableKitchenOrderCard';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAlert } from '../../../hooks/useAlert';
import { GradientBox } from '../../../components/common/GradientBox';

type StatusFilterValue = OrderStatus | 'ALL' | 'FAILED_PAYMENTS';

const STATUS_FILTERS: { label: string; value: StatusFilterValue }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'Placed', value: 'PLACED' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Preparing', value: 'PREPARING' },
  { label: 'Ready', value: 'READY' },
  { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Failed Payments', value: 'FAILED_PAYMENTS' },
];

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface OrdersScreenAdminProps {
  onMenuPress?: () => void;
  navigation?: any;
}

const OrdersScreenAdmin = ({ onMenuPress, navigation }: OrdersScreenAdminProps) => {
  console.log('✨ OrdersScreenAdmin RENDERED - New version with inline status editing');

  const onMenuPressProp = onMenuPress; // Renaming to avoid lint issues if needed, or just keep as is
  // const insets = useSafeAreaInsets(); // Removed
  const queryClient = useQueryClient();
  const { showSuccess, showError, showInfo, showWarning, showConfirm } = useAlert();
  const [selectedStatus, setSelectedStatus] = useState<StatusFilterValue>('ALL');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(getTodayDateString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);

  // Fetch all kitchens upfront to resolve unpopulated kitchenId strings
  const {
    data: kitchensData,
    refetch: refetchKitchens,
  } = useQuery({
    queryKey: ['allKitchens'],
    queryFn: () => kitchenService.getKitchens({ limit: 100 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Build a lookup map from kitchen ID -> { name, code }
  const kitchenMap = useMemo(() => {
    const map = new Map<string, { name: string; code: string }>();
    if (kitchensData?.kitchens) {
      kitchensData.kitchens.forEach((k) => {
        map.set(k._id, { name: k.name, code: k.code });
      });
    }
    return map;
  }, [kitchensData]);

  // Cache stats from the ALL tab so they persist when switching to specific status filters
  const cachedStatsRef = useRef({
    confirmedToday: 0,
    totalMealsToday: 0,
    pendingAcceptance: 0,
    outForDelivery: 0,
    failedOrders: 0,
    revenue: 0,
  });

  // Fetch orders with infinite query to accumulate pages
  const {
    data: ordersData,
    isLoading: ordersLoading,
    refetch: refetchOrders,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['orders', selectedStatus, selectedDate],
    queryFn: ({ pageParam = 1 }) => {
      const params: any = {
        page: pageParam,
        limit: 20,
      };
      // For SCHEDULED filter, use orderSource instead of status
      // because scheduled orders transition to PLACED/ACCEPTED etc. but keep orderSource='SCHEDULED'
      if (selectedStatus === 'SCHEDULED') {
        params.orderSource = 'SCHEDULED';
      } else if (selectedStatus !== 'ALL' && selectedStatus !== 'FAILED_PAYMENTS') {
        params.status = selectedStatus;
      }
      // Skip date filter for SCHEDULED orders (they have future delivery dates)
      if (selectedDate && selectedStatus !== 'SCHEDULED') {
        // Use local timezone (not UTC 'Z') so the date range matches IST orders
        const start = new Date(`${selectedDate}T00:00:00`);
        const end = new Date(`${selectedDate}T23:59:59.999`);
        params.dateFrom = start.toISOString();
        params.dateTo = end.toISOString();
      }
      return ordersService.getOrders(params);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.pages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache
    refetchOnMount: 'always', // Always refetch when component mounts
  });

  // Update order status mutation (using ADMIN endpoint)
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      console.log('====================================');
      console.log('🔄 QUICK STATUS UPDATE FROM LIST (ADMIN ENDPOINT)');
      console.log('====================================');
      console.log('Order ID:', orderId);
      console.log('New Status:', status);
      console.log('Using Admin Endpoint: /api/orders/admin/:id/status');
      console.log('====================================');

      // Use the ADMIN endpoint which allows ALL statuses
      return ordersService.updateOrderStatusAdmin(orderId, { status });
    },
    onMutate: ({ orderId }) => {
      // Set loading state for this specific order
      setUpdatingOrderId(orderId);
    },
    onSuccess: (updatedOrder, variables) => {
      // Use variables.status since response might not have the order object
      const newStatus = updatedOrder?.status || variables.status;
      console.log('✅ Status updated successfully to:', newStatus);

      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderStats'] });

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

  // Bulk status update mutation (using ADMIN endpoint)
  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ orderIds, status }: { orderIds: string[]; status: OrderStatus }) => {
      console.log('====================================');
      console.log('🔄 BULK ADMIN STATUS UPDATE');
      console.log('====================================');
      console.log('Order IDs:', orderIds);
      console.log('New Status:', status);
      console.log('Using Admin Endpoint: /api/orders/admin/:id/status');
      console.log('====================================');

      const promises = orderIds.map(orderId =>
        ordersService.updateOrderStatusAdmin(orderId, { status })
      );
      return Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderStats'] });
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
    refetchKitchens();
    refetchOrders();
  }, [refetchKitchens, refetchOrders]);

  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    setSelectedOrderIds(new Set());
  };

  const handleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleSelectAllVisible = (visibleOrderIds: string[]) => {
    if (visibleOrderIds.every(id => selectedOrderIds.has(id))) {
      // All visible are selected -> deselect them
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        visibleOrderIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedOrderIds(prev => {
        const next = new Set(prev);
        visibleOrderIds.forEach(id => next.add(id));
        return next;
      });
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

  const handleStatusFilter = (status: StatusFilterValue) => {
    setSelectedStatus(status);
    // Query resets automatically when selectedStatus changes in queryKey
  };

  const handleDateSelect = (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
    setShowDatePicker(false);
  };

  const handleClearDate = () => {
    setSelectedDate(null);
  };

  const formatDisplayDate = (dateStr: string) => {
    const today = getTodayDateString();
    if (dateStr === today) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (dateStr === yStr) return 'Yesterday';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleOrderPress = (orderId: string) => {
    if (navigation) {
      navigation.navigate('OrderDetail', { orderId });
    } else {
      showInfo(
        'Order Details',
        `Order ID: ${orderId}\n\nNote: Order detail screen requires React Navigation to be configured.`,
      );
    }
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Helper to check if an order is *currently* pending promotion.
  // Keyed off status — `orderSource`/`isScheduledMeal` are immutable creation
  // metadata and stay true even after the order is promoted/delivered.
  const isScheduledOrder = (order: Order) => order.status === 'SCHEDULED';

  // Hide orders whose payment never completed (PENDING) or failed (FAILED) from default views.
  // These are surfaced only via the dedicated "Failed Payments" filter.
  const hasVisiblePayment = (order: Order) =>
    order.paymentStatus !== 'PENDING' && order.paymentStatus !== 'FAILED';

  // Flatten all pages into a single orders array, exclude SCHEDULED from "All"
  const allOrders = useMemo(() => {
    const orders = ordersData?.pages?.flatMap(page => page.orders) ?? [];
    if (selectedStatus === 'FAILED_PAYMENTS') {
      return orders.filter(order => order.paymentStatus === 'FAILED');
    }
    if (selectedStatus === 'ALL') {
      // Exclude scheduled orders and orders with pending/failed payments from "All" view
      return orders.filter(order => !isScheduledOrder(order) && hasVisiblePayment(order));
    }
    if (selectedStatus === 'SCHEDULED') {
      // Client-side filter: show orders that are scheduled (via any field)
      return orders.filter(order => isScheduledOrder(order) && hasVisiblePayment(order));
    }
    return orders.filter(hasVisiblePayment);
  }, [ordersData, selectedStatus]);

  // Group orders by kitchen with search filtering
  const kitchenOrdersGroups = useMemo(() => {
    if (allOrders.length === 0) return [];

    // Filter orders based on search query
    let filteredOrders = allOrders;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredOrders = allOrders.filter((order) => {
        const orderNumber = order.orderNumber?.toLowerCase() || '';
        const customerName = (typeof order.userId === 'string' || !order.userId)
          ? ''
          : order.userId.name?.toLowerCase() || '';
        const customerPhone = (typeof order.userId === 'string' || !order.userId)
          ? ''
          : order.userId.phone?.toLowerCase() || '';
        let kitchenName = '';
        let kitchenCode = '';
        if (order.kitchenId) {
          if (typeof order.kitchenId === 'string') {
            const cached = kitchenMap.get(order.kitchenId);
            kitchenName = cached?.name?.toLowerCase() || '';
            kitchenCode = cached?.code?.toLowerCase() || '';
          } else {
            kitchenName = order.kitchenId.name?.toLowerCase() || '';
            kitchenCode = order.kitchenId.code?.toLowerCase() || '';
          }
        }

        return (
          orderNumber.includes(query) ||
          customerName.includes(query) ||
          customerPhone.includes(query) ||
          kitchenName.includes(query) ||
          kitchenCode.includes(query)
        );
      });
    }

    const groupedMap = new Map<string, {
      kitchenId: string;
      kitchenName: string;
      kitchenCode: string;
      orders: Order[];
    }>();

    filteredOrders.forEach((order) => {
      // Handle null or undefined kitchenId - group under "Unassigned"
      let kitchenId: string;
      let kitchenName: string;
      let kitchenCode: string;

      if (!order.kitchenId) {
        kitchenId = 'unassigned';
        kitchenName = 'Unassigned Kitchen';
        kitchenCode = 'N/A';
      } else if (typeof order.kitchenId === 'string') {
        // Backend didn't populate - resolve from kitchenMap
        kitchenId = order.kitchenId;
        const cached = kitchenMap.get(order.kitchenId);
        kitchenName = cached?.name || 'Unknown Kitchen';
        kitchenCode = cached?.code || kitchenId.substring(0, 8);
      } else {
        kitchenId = order.kitchenId._id;
        kitchenName = order.kitchenId.name;
        kitchenCode = order.kitchenId.code;
      }

      if (!groupedMap.has(kitchenId)) {
        groupedMap.set(kitchenId, {
          kitchenId,
          kitchenName,
          kitchenCode,
          orders: [],
        });
      }

      groupedMap.get(kitchenId)!.orders.push(order);
    });

    // Convert map to array and sort by kitchen name
    return Array.from(groupedMap.values()).sort((a, b) =>
      a.kitchenName.localeCompare(b.kitchenName)
    );
  }, [allOrders, searchQuery, kitchenMap]);

  // Compute stats from the main orders data (only when on ALL tab which has all statuses).
  // Confirmed = orders to actually be delivered today: excludes CANCELLED/REJECTED/FAILED and scheduled.
  // Failed   = CANCELLED, REJECTED, FAILED, or PAID-but-failed orders (today).
  const todayStats = useMemo(() => {
    if (selectedStatus !== 'ALL' || !ordersData?.pages?.length) {
      return cachedStatsRef.current;
    }
    const allLoadedOrders = ordersData.pages.flatMap(page => page.orders);

    const CONFIRMED_STATUSES = new Set([
      'PENDING_KITCHEN_ACCEPTANCE', 'PLACED', 'ACCEPTED',
      'PREPARING', 'READY', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED',
    ]);
    const FAILED_STATUSES = new Set(['CANCELLED', 'REJECTED', 'FAILED']);

    // Confirmed orders to be delivered today (exclude scheduled, exclude failed)
    const confirmedOrders = allLoadedOrders.filter(o =>
      !isScheduledOrder(o) && CONFIRMED_STATUSES.has(o.status) && hasVisiblePayment(o)
    );

    const confirmedToday = confirmedOrders.length;
    const totalMealsToday = confirmedOrders.reduce(
      (sum: number, o: Order) =>
        sum + (o.items?.reduce((s: number, it: any) => s + (it.quantity || 0), 0) ?? 0),
      0
    );
    const pendingAcceptance = allLoadedOrders.filter(
      o => o.status === 'PENDING_KITCHEN_ACCEPTANCE' && hasVisiblePayment(o)
    ).length;
    const outForDelivery = allLoadedOrders.filter(
      o => (o.status === 'OUT_FOR_DELIVERY' || o.status === 'PICKED_UP') && hasVisiblePayment(o)
    ).length;
    const failedOrders = allLoadedOrders.filter(o =>
      FAILED_STATUSES.has(o.status) || o.paymentStatus === 'FAILED'
    ).length;
    const revenue = confirmedOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    const stats = { confirmedToday, totalMealsToday, pendingAcceptance, outForDelivery, failedOrders, revenue };
    cachedStatsRef.current = stats;
    return stats;
  }, [ordersData, selectedStatus]);

  const renderStatsSection = () => {
    if (ordersLoading && !ordersData) {
      return (
        <View style={styles.statsLoadingContainer}>
          <ActivityIndicator size="small" color="#FE8733" />
        </View>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsContainer}>
        <OrderStatsCard
          label="Today's Orders"
          value={todayStats.confirmedToday}
          color="#FE8733"
          icon="receipt-long"
        />
        <OrderStatsCard
          label="Total Meals Today"
          value={todayStats.totalMealsToday}
          color="#34C759"
          icon="restaurant"
          highlight={todayStats.totalMealsToday > 0}
        />
        <OrderStatsCard
          label="Pending Acceptance"
          value={todayStats.pendingAcceptance}
          color="#FF9500"
          icon="pending"
          highlight={todayStats.pendingAcceptance > 0}
        />
        <OrderStatsCard
          label="Out for Delivery"
          value={todayStats.outForDelivery}
          color="#5856D6"
          icon="delivery-dining"
        />
        <OrderStatsCard
          label="Failed Orders"
          value={todayStats.failedOrders}
          color="#FF3B30"
          icon="cancel"
        />
        <OrderStatsCard
          label="Today's Revenue"
          value={`₹${todayStats.revenue.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          color="#00C7BE"
          icon="currency-rupee"
        />
      </ScrollView>
    );
  };

  const renderStatusFilters = () => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
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
    );
  };

  const renderKitchenGroup = ({ item }: { item: {
    kitchenId: string;
    kitchenName: string;
    kitchenCode: string;
    orders: Order[];
  } }) => {
    return (
      <ExpandableKitchenOrderCard
        kitchenId={item.kitchenId}
        kitchenName={item.kitchenName}
        kitchenCode={item.kitchenCode}
        orders={item.orders}
        onOrderPress={handleOrderPress}
        onStatusChange={handleStatusChange}
        updatingOrderId={updatingOrderId}
        selectionMode={selectionMode}
        selectedOrderIds={selectedOrderIds}
        onOrderSelect={handleOrderSelection}
      />
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyState}>
        <Icon name="inbox" size={64} color="#d1d5db" />
        <Text style={styles.emptyStateText}>No orders found</Text>
        <Text style={styles.emptyStateSubtext}>
          {selectedStatus === 'ALL'
            ? 'There are no orders yet'
            : selectedStatus === 'FAILED_PAYMENTS'
              ? 'No failed payments for the selected date'
              : `No orders with status "${selectedStatus}"`}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  return (
    <SafeAreaScreen style={{ flex: 1 }} backgroundColor="#FE8733">
      {/* Header */}
      {onMenuPress && (
        <GradientBox style={[styles.header, { paddingTop: 8 }]}>
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <Icon name="menu" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {selectionMode ? `${selectedOrderIds.size} Selected` : 'Orders Management'}
          </Text>
          <View style={styles.headerActions}>
            {selectionMode ? (
              <>
                <TouchableOpacity
                  onPress={() => handleSelectAllVisible(allOrders.map(o => o._id))}
                  style={styles.iconButton}
                >
                  <Icon
                    name={
                      allOrders.length > 0 && allOrders.every(o => selectedOrderIds.has(o._id))
                        ? 'check-box'
                        : 'check-box-outline-blank'
                    }
                    size={22}
                    color="#ffffff"
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleSelectionMode} style={styles.iconButton}>
                  <Icon name="close" size={22} color="#ffffff" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={toggleSelectionMode} style={styles.iconButton}>
                <Icon name="checklist" size={22} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </GradientBox>
      )}

      {/* Stats and Filters Section */}
      <View style={styles.topSection}>
        {renderStatsSection()}
        {renderStatusFilters()}

        {/* Date Filter */}
        <View style={styles.dateFilterRow}>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}>
            <Icon name="calendar-today" size={18} color="#FE8733" />
            <Text style={styles.datePickerButtonText}>
              {selectedDate ? formatDisplayDate(selectedDate) : 'All Dates'}
            </Text>
          </TouchableOpacity>
          {selectedDate && (
            <TouchableOpacity
              onPress={handleClearDate}
              style={styles.clearDateButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={16} color="#6b7280" />
              <Text style={styles.clearDateText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order number, customer, kitchen..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={(text) => {
              console.log('🔍 Search query changed:', text);
              setSearchQuery(text);
            }}
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            clearButtonMode="never"
            underlineColorAndroid="transparent"
            returnKeyType="search"
            enablesReturnKeyAutomatically
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Orders List Section - Grouped by Kitchen */}
      <View style={styles.ordersSection}>
        <FlatList
          data={kitchenOrdersGroups}
          renderItem={renderKitchenGroup}
          keyExtractor={(item) => item.kitchenId}
          refreshControl={
            <RefreshControl
              refreshing={ordersLoading && !isFetching}
              onRefresh={handleRefresh}
              tintColor="#FE8733"
              colors={['#FE8733']}
            />
          }
          ListEmptyComponent={!ordersLoading ? renderEmptyState : null}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={[
            styles.listContainer,
            allOrders.length === 0 && styles.emptyListContainer,
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
            <TouchableOpacity
              onPress={() => setSelectedOrderIds(new Set())}
              style={styles.clearSelectionButton}
            >
              <Text style={styles.clearSelectionText}>Clear</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.changeStatusButton}
            onPress={() => setShowBulkStatusModal(true)}
            disabled={bulkUpdateStatusMutation.isPending}
          >
            {bulkUpdateStatusMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Icon name="swap-vert" size={18} color="#ffffff" />
                <Text style={styles.changeStatusText}>Change Status</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Bulk Status Selection Modal */}
      <Modal
        visible={showBulkStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBulkStatusModal(false)}
      >
        <TouchableOpacity
          style={styles.dateModalOverlay}
          activeOpacity={1}
          onPress={() => setShowBulkStatusModal(false)}
        >
          <View style={styles.bulkStatusModalContent}>
            <View style={styles.dateModalHeader}>
              <Text style={styles.dateModalTitle}>
                Change Status ({selectedOrderIds.size})
              </Text>
              <TouchableOpacity onPress={() => setShowBulkStatusModal(false)}>
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {(
                [
                  { status: 'ACCEPTED', label: 'Accepted', color: '#00C7BE', icon: 'check-circle' },
                  { status: 'PREPARING', label: 'Preparing', color: '#FFCC00', icon: 'restaurant' },
                  { status: 'READY', label: 'Ready', color: '#FF9500', icon: 'done-all' },
                  { status: 'PICKED_UP', label: 'Picked Up', color: '#AF52DE', icon: 'local-shipping' },
                  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', color: '#5856D6', icon: 'delivery-dining' },
                  { status: 'DELIVERED', label: 'Delivered', color: '#34C759', icon: 'home' },
                  { status: 'CANCELLED', label: 'Cancel order', color: '#FF3B30', icon: 'cancel' },
                ] as { status: OrderStatus; label: string; color: string; icon: string }[]
              ).map(opt => (
                <TouchableOpacity
                  key={opt.status}
                  style={styles.bulkStatusOption}
                  onPress={() => {
                    setShowBulkStatusModal(false);
                    handleBulkStatusUpdate(opt.status);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.bulkStatusIcon, { backgroundColor: opt.color }]}>
                    <Icon name={opt.icon} size={18} color="#ffffff" />
                  </View>
                  <Text style={styles.bulkStatusLabel}>{opt.label}</Text>
                  <Icon name="chevron-right" size={20} color="#8E8E93" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity
          style={styles.dateModalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}>
          <View style={styles.dateModalContent}>
            <View style={styles.dateModalHeader}>
              <Text style={styles.dateModalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Icon name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={handleDateSelect}
              markedDates={selectedDate ? {
                [selectedDate]: { selected: true, selectedColor: '#FE8733' },
              } : {}}
              maxDate={getTodayDateString()}
              theme={{
                todayTextColor: '#FE8733',
                selectedDayBackgroundColor: '#FE8733',
                arrowColor: '#FE8733',
              }}
            />
          </View>
        </TouchableOpacity>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
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
    paddingVertical: 10,
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
    marginBottom: 8,
  },
  bulkActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  clearSelectionButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  clearSelectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  changeStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FE8733',
    gap: 6,
  },
  changeStatusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  bulkStatusModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  bulkStatusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  bulkStatusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkStatusLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  topSection: {
    backgroundColor: '#f9fafb',
  },
  ordersSection: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  menuButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  statsLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsScroll: {
    backgroundColor: '#f9fafb',
    paddingVertical: 6,
    maxHeight: 110,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 10,
    paddingRight: 24,
  },
  filtersScroll: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    maxHeight: 60,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filterChipActive: {
    backgroundColor: '#FE8733',
    borderColor: '#FE8733',
    elevation: 3,
    shadowColor: '#FE8733',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  datePickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  clearDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearDateText: {
    fontSize: 13,
    color: '#6b7280',
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
});

export default OrdersScreenAdmin;
