/**
 * Enhanced Orders List Screen - Real API Integration
 *
 * Fetches real orders from API and displays them
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useApi } from '../../../hooks/useApi';
import { Order as APIOrder, OrderListResponse } from '../../../types/api.types';
import { SummaryStatCard } from '../components';
import { colors } from '../../../theme';
import { GradientBox } from '../../../components/common/GradientBox';

interface OrdersListScreenProps {
  onMenuPress: () => void;
  onOrderPress: (order: APIOrder) => void;
}

type TabType = 'all' | 'action_needed';

export const OrdersListScreenEnhanced: React.FC<OrdersListScreenProps> = ({
  onMenuPress,
  onOrderPress,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Fetch orders from API
   * Endpoint returns: { success, message, data: { orders: [], pagination: {} } }
   */
  const endpoint = activeTab === 'action_needed'
    ? '/api/orders/admin/all?status=PLACED'
    : '/api/orders/admin/all';

  const {
    data: ordersResponse,
    loading,
    error,
    refresh,
  } = useApi<OrderListResponse>(endpoint, { cache: 10000 }); // 10 second cache

  // Extract orders array from response
  const orders = ordersResponse?.orders || [];

  /**
   * Filter orders by search query
   */
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;

    const query = searchQuery.toLowerCase();
    return orders.filter((order: APIOrder) =>
      order._id.toLowerCase().includes(query) ||
      order.userId.toLowerCase().includes(query) ||
      order.kitchenId.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  /**
   * Calculate summary stats
   */
  const summaryStats = useMemo(() => {
    return {
      totalOrders: filteredOrders.length,
      totalRevenue: filteredOrders.reduce((sum: number, o: APIOrder) => sum + o.totalAmount, 0),
      delivered: filteredOrders.filter((o: APIOrder) => o.status === 'DELIVERED').length,
      pending: filteredOrders.filter((o: APIOrder) => o.status === 'PLACED').length,
    };
  }, [filteredOrders]);

  /**
   * Get status color
   */
  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      PLACED: '#3b82f6',
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
   * Render order item
   */
  const renderOrderItem = ({ item }: { item: APIOrder }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => onOrderPress(item)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <MaterialIcons name="receipt-long" size={20} color={colors.primary} />
          <Text style={styles.orderId}>#{item._id.slice(-6).toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="restaurant" size={16} color="#6b7280" />
          <Text style={styles.detailText}>Kitchen: {item.kitchenId.slice(-6)}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={16} color="#6b7280" />
          <Text style={styles.detailText}>Zone: {item.zoneId.slice(-6)}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="schedule" size={16} color="#6b7280" />
          <Text style={styles.detailText}>
            {new Date(item.scheduledFor).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="attach-money" size={16} color="#6b7280" />
          <Text style={styles.detailText}>₹{item.totalAmount.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.placedAt}>
          Placed: {new Date(item.placedAt).toLocaleString()}
        </Text>
        <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  /**
   * Render empty state
   */
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="inbox" size={64} color="#9ca3af" />
      <Text style={styles.emptyTitle}>No Orders Found</Text>
      <Text style={styles.emptyText}>
        {activeTab === 'action_needed'
          ? 'No orders require your attention'
          : searchQuery
          ? 'No orders match your search'
          : 'No orders available'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <GradientBox style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
          <MaterialIcons name="menu" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Orders</Text>
        <View style={styles.headerRight} />
      </GradientBox>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'action_needed' && styles.tabActive]}
          onPress={() => setActiveTab('action_needed')}
        >
          <Text style={[styles.tabText, activeTab === 'action_needed' && styles.tabTextActive]}>
            Action Needed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsContainer}
        contentContainerStyle={styles.statsContent}
      >
        <SummaryStatCard
          title="Total Orders"
          value={summaryStats.totalOrders}
          icon="receipt-long"
          iconColor={colors.primary}
          iconBgColor={colors.primaryLight}
          style={styles.statCard}
          compact
        />
        <SummaryStatCard
          title="Delivered"
          value={summaryStats.delivered}
          icon="check-circle"
          iconColor={colors.success}
          iconBgColor={colors.successLight}
          style={styles.statCard}
          compact
        />
        <SummaryStatCard
          title="Pending"
          value={summaryStats.pending}
          icon="pending"
          iconColor="#f59e0b"
          iconBgColor="#fff7ed"
          style={styles.statCard}
          compact
        />
        <SummaryStatCard
          title="Revenue"
          value={`₹${summaryStats.totalRevenue.toFixed(0)}`}
          icon="payments"
          iconColor="#8b5cf6"
          iconBgColor="#ede9fe"
          style={styles.statCard}
          compact
        />
      </ScrollView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by order ID, user, or kitchen..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Orders List */}
      {loading && !ordersResponse ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Unable to Load Orders</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <MaterialIcons name="refresh" size={20} color="#ffffff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={loading && !!ordersResponse}
              onRefresh={refresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerRight: {
    width: 40,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Stats
  statsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statCard: {
    marginRight: 12,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },

  // List
  listContent: {
    padding: 16,
  },

  // Order Card
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  placedAt: {
    fontSize: 12,
    color: '#9ca3af',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default OrdersListScreenEnhanced;
