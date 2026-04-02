import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {ordersService} from '../../../services/orders.service';
import {Order, OrderStatus} from '../../../types/api.types';
import OrderCardAdminImproved from '../components/OrderCardAdminImproved';
import OrderStatsCardImproved from '../components/OrderStatsCardImproved';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GradientBox } from '../../../components/common/GradientBox';

const STATUS_FILTERS: {label: string; value: OrderStatus | 'ALL'; icon: string}[] = [
  {label: 'All', value: 'ALL', icon: 'apps'},
  {label: 'Placed', value: 'PLACED', icon: 'shopping-cart'},
  {label: 'Accepted', value: 'ACCEPTED', icon: 'check-circle'},
  {label: 'Preparing', value: 'PREPARING', icon: 'restaurant'},
  {label: 'Ready', value: 'READY', icon: 'done-all'},
  {label: 'Delivering', value: 'OUT_FOR_DELIVERY', icon: 'local-shipping'},
  {label: 'Delivered', value: 'DELIVERED', icon: 'check-circle-outline'},
  {label: 'Cancelled', value: 'CANCELLED', icon: 'cancel'},
];

interface OrdersScreenProps {
  onMenuPress?: () => void;
  navigation?: any;
}

const OrdersScreenImproved = ({onMenuPress, navigation}: OrdersScreenProps) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  const {
    data: statsData,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['orderStats'],
    queryFn: () => ordersService.getOrderStatistics(),
  });

  const {
    data: ordersData,
    isLoading: ordersLoading,
    refetch: refetchOrders,
    isFetching,
  } = useQuery({
    queryKey: ['orders', selectedStatus, page],
    queryFn: () =>
      ordersService.getOrders({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        page,
        limit: 20,
      }),
  });

  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchOrders();
  }, [refetchStats, refetchOrders]);

  const handleStatusFilter = (status: OrderStatus | 'ALL') => {
    setSelectedStatus(status);
    setPage(1);
  };

  const handleOrderPress = (orderId: string) => {
    if (navigation) {
      navigation.navigate('OrderDetail', {orderId});
    } else {
      Alert.alert(
        'Order Details',
        `Order ID: ${orderId}\n\nNote: Order detail screen requires React Navigation to be configured.`,
      );
    }
  };

  const handleLoadMore = () => {
    if (
      ordersData &&
      ordersData.pagination.page < ordersData.pagination.pages &&
      !isFetching
    ) {
      setPage(prev => prev + 1);
    }
  };

  const renderStatsSection = () => {
    if (statsLoading || !statsData) {
      return (
        <View style={styles.statsLoadingContainer}>
          <ActivityIndicator size="large" color="#FE8733" />
        </View>
      );
    }

    const {today, revenue} = statsData;

    const stats = [
      {
        label: "Today's Orders",
        value: today.total,
        color: '#FE8733',
        icon: 'receipt-long',
        trend: '+12%',
      },
      {
        label: 'Placed',
        value: today.placed,
        color: '#FF9500',
        icon: 'pending',
        highlight: today.placed > 0,
      },
      {
        label: 'Preparing',
        value: today.preparing,
        color: '#FFCC00',
        icon: 'restaurant',
      },
      {
        label: 'Delivered',
        value: today.delivered,
        color: '#34C759',
        icon: 'check-circle',
      },
      {
        label: 'Cancelled',
        value: today.cancelled,
        color: '#FF3B30',
        icon: 'cancel',
      },
      {
        label: 'Revenue',
        value: `₹${revenue.today.toLocaleString('en-IN')}`,
        color: '#5856D6',
        icon: 'account-balance-wallet',
        trend: '+8%',
      },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsContainer}>
        {stats.map((stat, index) => (
          <OrderStatsCardImproved key={index} {...stat} />
        ))}
      </ScrollView>
    );
  };

  const renderStatusFilters = () => {
    return (
      <View style={styles.filtersSection}>
        <View style={styles.filtersSectionHeader}>
          <Text style={styles.filtersSectionTitle}>Filter by Status</Text>
          {selectedStatus !== 'ALL' && (
            <TouchableOpacity onPress={() => handleStatusFilter('ALL')}>
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}>
          {STATUS_FILTERS.map(filter => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                selectedStatus === filter.value && styles.filterChipActive,
              ]}
              onPress={() => handleStatusFilter(filter.value)}>
              <Icon
                name={filter.icon}
                size={18}
                color={
                  selectedStatus === filter.value ? '#FFFFFF' : '#8E8E93'
                }
              />
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
    );
  };

  const renderOrderItem = ({item}: {item: Order}) => {
    return (
      <OrderCardAdminImproved
        order={item}
        onPress={() => handleOrderPress(item._id)}
      />
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Icon name="inbox" size={64} color="#C7C7CC" />
        </View>
        <Text style={styles.emptyStateText}>No orders found</Text>
        <Text style={styles.emptyStateSubtext}>
          {selectedStatus === 'ALL'
            ? 'Orders will appear here once customers place them'
            : `No orders with status "${selectedStatus}"`}
        </Text>
        {selectedStatus !== 'ALL' && (
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={() => handleStatusFilter('ALL')}>
            <Text style={styles.clearFilterButtonText}>View All Orders</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (!isFetching) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#FE8733" />
        <Text style={styles.loadingFooterText}>Loading more...</Text>
      </View>
    );
  };

  const renderListHeader = () => {
    if (!ordersData?.orders || ordersData.orders.length === 0) return null;

    return (
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>
          {ordersData.pagination.total} order
          {ordersData.pagination.total !== 1 ? 's' : ''}
          {selectedStatus !== 'ALL' && ` · ${selectedStatus.toLowerCase()}`}
        </Text>
        <View style={styles.listHeaderBadge}>
          <Text style={styles.listHeaderBadgeText}>
            Page {ordersData.pagination.page} of {ordersData.pagination.pages}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      {onMenuPress && (
        <GradientBox style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
              <Icon name="menu" size={26} color="#ffffff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Orders</Text>
              <Text style={styles.headerSubtitle}>Manage all orders</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Icon name="notifications-none" size={24} color="#ffffff" />
            {(statsData?.today?.placed || 0) > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {statsData?.today?.placed}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </GradientBox>
      )}

      {renderStatsSection()}
      {renderStatusFilters()}

      <FlatList
        data={ordersData?.orders || []}
        renderItem={renderOrderItem}
        keyExtractor={item => item._id}
        refreshControl={
          <RefreshControl
            refreshing={ordersLoading && !isFetching}
            onRefresh={handleRefresh}
            colors={['#FE8733']}
            tintColor="#FE8733"
          />
        }
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={!ordersLoading ? renderEmptyState : null}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FFFFFF99',
    fontWeight: '500',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FE8733',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  statsScroll: {
    backgroundColor: '#F8F9FA',
  },
  statsLoadingContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  filtersSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filtersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filtersSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3C3C43',
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FE8733',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#FE8733',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3C3C43',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3C3C43',
  },
  listHeaderBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  listHeaderBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3C3C43',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  clearFilterButton: {
    marginTop: 24,
    backgroundColor: '#FE8733',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  clearFilterButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingFooter: {
    paddingVertical: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  loadingFooterText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
});

export default OrdersScreenImproved;
