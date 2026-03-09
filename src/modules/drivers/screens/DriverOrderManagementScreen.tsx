import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../theme/colors';
import { useAlert } from '../../../hooks/useAlert';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { deliveryService } from '../../../services/delivery.service';

// Types
interface AvailableBatch {
  _id: string;
  batchNumber: string;
  kitchenId: {
    _id: string;
    name: string;
    address: string;
  };
  zoneId: {
    _id: string;
    name: string;
    code: string;
  };
  mealWindow: 'LUNCH' | 'DINNER';
  orderCount: number;
  estimatedEarnings?: number;
  pickupAddress: string;
  windowEndTime: string;
}

interface ActiveBatch {
  _id: string;
  batchNumber: string;
  status: string;
  kitchenId: {
    _id: string;
    name: string;
  };
  zoneId: {
    _id: string;
    name: string;
  };
  mealWindow: 'LUNCH' | 'DINNER';
  orderIds: string[];
  orderCount: number;
  totalDelivered: number;
  totalFailed: number;
  pickedUpAt?: string;
  orders?: Array<{
    _id: string;
    orderNumber: string;
    status: string;
    customer: {
      name: string;
      phone: string;
    };
    deliveryAddress: {
      street: string;
      area: string;
      coordinates: { lat: number; lng: number };
    };
    grandTotal: number;
    specialInstructions?: string;
  }>;
}

type TabType = 'AVAILABLE' | 'ACTIVE' | 'HISTORY';

export const DriverOrderManagementScreen: React.FC = () => {
  const { showSuccess, showError, showConfirm } = useAlert();
  const [activeTab, setActiveTab] = useState<TabType>('AVAILABLE');
  const [availableBatches, setAvailableBatches] = useState<AvailableBatch[]>([]);
  const [activeBatch, setActiveBatch] = useState<ActiveBatch | null>(null);
  const [historyBatches, setHistoryBatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'AVAILABLE') {
        await loadAvailableBatches();
      } else if (activeTab === 'ACTIVE') {
        await loadActiveBatch();
      } else {
        await loadHistory();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadAvailableBatches = async () => {
    try {
      const response = await deliveryService.getAvailableBatches();
      setAvailableBatches(response.data.batches || []);
    } catch (error: any) {
      console.error('Failed to load available batches:', error);
      if (error.message?.includes('404') || error.message?.includes('Not found')) {
        // Endpoint not implemented yet
        setAvailableBatches([]);
      } else {
        showError('Error', 'Failed to load available batches');
      }
    }
  };

  const loadActiveBatch = async () => {
    try {
      const deliveries = await deliveryService.getDriverDeliveries();
      // Find IN_PROGRESS batch
      const active = deliveries.find((d: any) =>
        d.status === 'DISPATCHED' || d.status === 'IN_PROGRESS'
      );
      setActiveBatch(active || null);
    } catch (error: any) {
      console.error('Failed to load active batch:', error);
      showError('Error', 'Failed to load active deliveries');
    }
  };

  const loadHistory = async () => {
    try {
      // Get completed deliveries
      const deliveries = await deliveryService.getDriverDeliveries();
      const completed = deliveries.filter((d: any) =>
        d.status === 'COMPLETED' || d.status === 'PARTIAL_COMPLETE'
      );
      setHistoryBatches(completed);
    } catch (error: any) {
      console.error('Failed to load history:', error);
      showError('Error', 'Failed to load delivery history');
    }
  };

  const handleAcceptBatch = async (batchId: string) => {
    showConfirm(
      'Accept Batch',
      'Are you sure you want to accept this batch for delivery?',
      async () => {
        setIsAccepting(batchId);
        try {
          const response = await deliveryService.acceptBatch(batchId);
          showSuccess(
            'Success',
            `Batch accepted! ${response.data.orders?.length || 0} orders assigned.`
          );
          // Switch to active tab
          setActiveTab('ACTIVE');
          loadData();
        } catch (error: any) {
          showError('Error', error.message || 'Failed to accept batch');
        } finally {
          setIsAccepting(null);
        }
      },
      undefined,
      { confirmText: 'Accept', cancelText: 'Cancel' }
    );
  };

  const handleStartDelivery = async (batchId: string) => {
    showConfirm(
      'Start Delivery',
      'Have you picked up all orders from the kitchen?',
      async () => {
        try {
          await deliveryService.pickupBatch(batchId);
          showSuccess('Success', 'Delivery started! You can now deliver orders.');
          loadActiveBatch();
        } catch (error: any) {
          showError('Error', error.message || 'Failed to start delivery');
        }
      },
      undefined,
      { confirmText: 'Start', cancelText: 'Cancel' }
    );
  };

  const handleMarkDelivered = async (orderId: string, orderNumber: string) => {
    // Note: Alert.prompt is iOS-only. Consider using a custom modal for cross-platform support.
    Alert.prompt(
      'Delivery OTP',
      `Enter the 4-digit OTP from customer to confirm delivery of ${orderNumber}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async (otp?: string) => {
            if (!otp || otp.length !== 4) {
              showError('Error', 'Please enter a valid 4-digit OTP');
              return;
            }

            try {
              await deliveryService.updateOrderDeliveryStatus(orderId, {
                status: 'DELIVERED',
                proofOfDelivery: {
                  type: 'OTP',
                  value: otp,
                },
              });
              showSuccess('Success', 'Order marked as delivered!');
              loadActiveBatch();
            } catch (error: any) {
              showError('Error', error.message || 'Failed to mark order as delivered');
            }
          },
        },
      ],
      'plain-text',
      '',
      'number-pad'
    );
  };

  const handleMarkFailed = async (orderId: string, orderNumber: string) => {
    // Note: Alert.prompt is iOS-only. Consider using a custom modal for cross-platform support.
    Alert.prompt(
      'Order Failed',
      `Why couldn't you deliver ${orderNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (reason?: string) => {
            if (!reason || reason.trim().length < 10) {
              showError('Error', 'Please provide a detailed reason (min 10 characters)');
              return;
            }

            try {
              await deliveryService.updateOrderDeliveryStatus(orderId, {
                status: 'FAILED',
                failureReason: reason.trim(),
              });
              showSuccess('Order Marked Failed', 'The order has been marked as failed.');
              loadActiveBatch();
            } catch (error: any) {
              showError('Error', error.message || 'Failed to mark order as failed');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [activeTab]);

  const renderAvailableBatchCard = ({ item }: { item: AvailableBatch }) => (
    <View style={styles.batchCard}>
      <View style={styles.batchHeader}>
        <View style={styles.batchInfo}>
          <Text style={styles.batchNumber}>{item.batchNumber}</Text>
          <View style={[styles.mealBadge, getMealBadgeStyle(item.mealWindow)]}>
            <MaterialIcons
              name={item.mealWindow === 'LUNCH' ? 'wb-sunny' : 'nights-stay'}
              size={14}
              color={colors.white}
            />
            <Text style={styles.mealBadgeText}>{item.mealWindow}</Text>
          </View>
        </View>
      </View>

      <View style={styles.batchDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="store" size={18} color={colors.textSecondary} />
          <Text style={styles.detailText}>{item.kitchenId.name}</Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={18} color={colors.textSecondary} />
          <Text style={styles.detailText}>{item.zoneId.name}</Text>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons name="shopping-bag" size={18} color={colors.textSecondary} />
          <Text style={styles.detailText}>{item.orderCount} orders</Text>
        </View>

        {item.estimatedEarnings && (
          <View style={styles.detailRow}>
            <MaterialIcons name="payments" size={18} color={colors.success} />
            <Text style={[styles.detailText, { color: colors.success, fontWeight: '600' }]}>
              ₹{item.estimatedEarnings}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.pickupAddress}>
        <Text style={styles.pickupLabel}>Pickup from:</Text>
        <Text style={styles.pickupText}>{item.pickupAddress}</Text>
      </View>

      <TouchableOpacity
        style={[styles.acceptButton, isAccepting === item._id && styles.acceptButtonDisabled]}
        onPress={() => handleAcceptBatch(item._id)}
        disabled={isAccepting === item._id}
      >
        {isAccepting === item._id ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <>
            <MaterialIcons name="check-circle" size={20} color={colors.white} />
            <Text style={styles.acceptButtonText}>Accept Batch</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderActiveBatch = () => {
    if (!activeBatch) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="local-shipping" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Active Deliveries</Text>
          <Text style={styles.emptySubtitle}>
            Accept a batch from the Available tab to start delivering
          </Text>
        </View>
      );
    }

    const isPickedUp = activeBatch.status === 'IN_PROGRESS';

    return (
      <ScrollView
        style={styles.activeBatchContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Batch Header */}
        <View style={styles.activeBatchHeader}>
          <Text style={styles.activeBatchNumber}>{activeBatch.batchNumber}</Text>
          <View style={[styles.statusBadge, getStatusBadgeStyle(activeBatch.status)]}>
            <Text style={styles.statusBadgeText}>{activeBatch.status}</Text>
          </View>
        </View>

        {/* Batch Info */}
        <View style={styles.activeBatchInfo}>
          <View style={styles.infoRow}>
            <MaterialIcons name="store" size={20} color={colors.textSecondary} />
            <Text style={styles.infoText}>{activeBatch.kitchenId.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={20} color={colors.textSecondary} />
            <Text style={styles.infoText}>{activeBatch.zoneId.name}</Text>
          </View>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Delivery Progress</Text>
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={styles.progressValue}>{activeBatch.totalDelivered}</Text>
              <Text style={styles.progressLabel}>Delivered</Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={[styles.progressValue, { color: colors.warning }]}>
                {activeBatch.orderCount - activeBatch.totalDelivered - activeBatch.totalFailed}
              </Text>
              <Text style={styles.progressLabel}>Pending</Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={[styles.progressValue, { color: colors.error }]}>
                {activeBatch.totalFailed}
              </Text>
              <Text style={styles.progressLabel}>Failed</Text>
            </View>
          </View>
        </View>

        {/* Start Delivery Button */}
        {!isPickedUp && (
          <TouchableOpacity
            style={styles.startDeliveryButton}
            onPress={() => handleStartDelivery(activeBatch._id)}
          >
            <MaterialIcons name="local-shipping" size={20} color={colors.white} />
            <Text style={styles.startDeliveryButtonText}>Mark as Picked Up & Start Delivery</Text>
          </TouchableOpacity>
        )}

        {/* Orders List */}
        <View style={styles.ordersSection}>
          <Text style={styles.ordersSectionTitle}>Orders ({activeBatch.orderCount})</Text>
          {activeBatch.orders?.map((order, index) => (
            <TouchableOpacity key={order._id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderNumber}>#{index + 1} {order.orderNumber}</Text>
                <View style={[styles.orderStatusBadge, getOrderStatusBadgeStyle(order.status)]}>
                  <Text style={styles.orderStatusText}>{order.status}</Text>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <View style={styles.orderDetailRow}>
                  <MaterialIcons name="person" size={16} color={colors.textSecondary} />
                  <Text style={styles.orderDetailText}>{order.customer.name}</Text>
                </View>
                <View style={styles.orderDetailRow}>
                  <MaterialIcons name="phone" size={16} color={colors.textSecondary} />
                  <Text style={styles.orderDetailText}>{order.customer.phone}</Text>
                </View>
                <View style={styles.orderDetailRow}>
                  <MaterialIcons name="location-on" size={16} color={colors.textSecondary} />
                  <Text style={styles.orderDetailText}>
                    {order.deliveryAddress.area}, {order.deliveryAddress.street}
                  </Text>
                </View>
                <View style={styles.orderDetailRow}>
                  <MaterialIcons name="payments" size={16} color={colors.success} />
                  <Text style={[styles.orderDetailText, { color: colors.success, fontWeight: '600' }]}>
                    ₹{order.grandTotal}
                  </Text>
                </View>
              </View>

              {order.specialInstructions && (
                <View style={styles.instructionsBox}>
                  <MaterialIcons name="info-outline" size={14} color={colors.warning} />
                  <Text style={styles.instructionsText}>{order.specialInstructions}</Text>
                </View>
              )}

              {(order.leaveAtDoor || order.doNotContact) && (
                <View style={[styles.instructionsBox, { marginTop: 4 }]}>
                  {order.leaveAtDoor && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                      <MaterialIcons name="door-front" size={14} color={colors.primary} />
                      <Text style={[styles.instructionsText, { color: colors.primary }]}>Leave at Door</Text>
                    </View>
                  )}
                  {order.doNotContact && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialIcons name="phone-disabled" size={14} color={colors.error} />
                      <Text style={[styles.instructionsText, { color: colors.error }]}>Do Not Contact</Text>
                    </View>
                  )}
                </View>
              )}

              {isPickedUp && order.status !== 'DELIVERED' && order.status !== 'FAILED' && (
                <View style={styles.orderActions}>
                  <TouchableOpacity
                    style={styles.deliverButton}
                    onPress={() => handleMarkDelivered(order._id, order.orderNumber)}
                  >
                    <MaterialIcons name="check-circle" size={18} color={colors.white} />
                    <Text style={styles.deliverButtonText}>Mark Delivered</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.failButton}
                    onPress={() => handleMarkFailed(order._id, order.orderNumber)}
                  >
                    <MaterialIcons name="cancel" size={18} color={colors.white} />
                    <Text style={styles.failButtonText}>Mark Failed</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderHistoryCard = ({ item }: { item: any }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyBatchNumber}>{item.batchNumber}</Text>
        <Text style={styles.historyDate}>
          {new Date(item.completedAt || item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.historyStats}>
        <Text style={styles.historyStatText}>
          {item.totalDelivered}/{item.orderCount} delivered
        </Text>
        <Text style={[styles.historyStatText, { color: colors.success }]}>
          ₹{item.earnings || 0}
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons
        name={activeTab === 'AVAILABLE' ? 'inbox' : 'history'}
        size={64}
        color={colors.textMuted}
      />
      <Text style={styles.emptyTitle}>
        {activeTab === 'AVAILABLE' ? 'No Batches Available' : 'No Delivery History'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'AVAILABLE'
          ? 'New batches will appear here when they are ready for delivery'
          : 'Your completed deliveries will be shown here'}
      </Text>
    </View>
  );

  const getMealBadgeStyle = (mealWindow: string) => ({
    backgroundColor: mealWindow === 'LUNCH' ? colors.warning : colors.info,
  });

  const getStatusBadgeStyle = (status: string) => {
    const styles: any = {
      'DISPATCHED': { backgroundColor: '#fef3c7', borderColor: '#d97706' },
      'IN_PROGRESS': { backgroundColor: '#e0e7ff', borderColor: '#6366f1' },
    };
    return styles[status] || { backgroundColor: colors.background, borderColor: colors.border };
  };

  const getOrderStatusBadgeStyle = (status: string) => {
    const styles: any = {
      'OUT_FOR_DELIVERY': { backgroundColor: '#e0e7ff' },
      'DELIVERED': { backgroundColor: '#dcfce7' },
      'FAILED': { backgroundColor: '#fee2e2' },
    };
    return styles[status] || { backgroundColor: colors.background };
  };

  return (
    <SafeAreaScreen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Deliveries</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <MaterialIcons name="refresh" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'AVAILABLE' && styles.tabActive]}
            onPress={() => setActiveTab('AVAILABLE')}
          >
            <MaterialIcons name="local-shipping" size={20} color={activeTab === 'AVAILABLE' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'AVAILABLE' && styles.tabTextActive]}>
              Available
            </Text>
            {availableBatches.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{availableBatches.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'ACTIVE' && styles.tabActive]}
            onPress={() => setActiveTab('ACTIVE')}
          >
            <MaterialIcons name="assignment" size={20} color={activeTab === 'ACTIVE' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
              Active
            </Text>
            {activeBatch && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>1</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'HISTORY' && styles.tabActive]}
            onPress={() => setActiveTab('HISTORY')}
          >
            <MaterialIcons name="history" size={20} color={activeTab === 'HISTORY' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : activeTab === 'AVAILABLE' ? (
          <FlatList
            data={availableBatches}
            renderItem={renderAvailableBatchCard}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={renderEmptyState}
          />
        ) : activeTab === 'ACTIVE' ? (
          renderActiveBatch()
        ) : (
          <FlatList
            data={historyBatches}
            renderItem={renderHistoryCard}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={renderEmptyState}
          />
        )}
      </View>
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 16,
  },
  batchCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  batchHeader: {
    marginBottom: 12,
  },
  batchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  batchNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  mealBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  batchDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  pickupAddress: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  pickupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pickupText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  activeBatchContainer: {
    flex: 1,
  },
  activeBatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activeBatchNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  activeBatchInfo: {
    padding: 16,
    backgroundColor: colors.white,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  progressCard: {
    margin: 16,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.success,
  },
  progressLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  startDeliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  startDeliveryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
  ordersSection: {
    padding: 16,
  },
  ordersSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  orderDetails: {
    gap: 8,
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderDetailText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  instructionsText: {
    fontSize: 12,
    color: '#92400e',
    flex: 1,
    lineHeight: 16,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  deliverButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  deliverButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  failButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  failButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyBatchNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  historyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyStatText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
