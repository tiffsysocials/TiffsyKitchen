import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { deliveryService } from '../../../services/delivery.service';
import kitchenService from '../../../services/kitchen.service';
import { ordersService } from '../../../services/orders.service';
import { Batch, BatchStatus, MealWindow, Kitchen } from '../../../types/api.types';
import { GradientBox } from '../../../components/common/GradientBox';
import { useAlert } from '../../../hooks/useAlert';

interface BatchManagementScreenProps {
  route: {
    params: {
      kitchenId: string;
      kitchenName: string;
    };
  };
  navigation: any;
}

// Helper functions for meal window time calculations
const getMealWindowEndTime = (kitchen: Kitchen | null, mealWindow: MealWindow): { hours: number; minutes: number } | null => {
  if (!kitchen?.operatingHours) return null;

  const endTime = mealWindow === 'LUNCH'
    ? kitchen.operatingHours.lunch?.endTime
    : kitchen.operatingHours.dinner?.endTime;

  if (!endTime) return null;

  const [hours, minutes] = endTime.split(':').map(Number);
  return { hours, minutes };
};

const canDispatchMealWindow = (kitchen: Kitchen | null, mealWindow: MealWindow): boolean => {
  const endTime = getMealWindowEndTime(kitchen, mealWindow);
  if (!endTime) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const endTimeInMinutes = endTime.hours * 60 + endTime.minutes;

  return currentTimeInMinutes >= endTimeInMinutes;
};

const getTimeUntilDispatch = (kitchen: Kitchen | null, mealWindow: MealWindow): string => {
  const endTime = getMealWindowEndTime(kitchen, mealWindow);
  if (!endTime) return 'N/A';

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const endTimeInMinutes = endTime.hours * 60 + endTime.minutes;

  if (currentTimeInMinutes >= endTimeInMinutes) {
    return 'Now';
  }

  const minutesLeft = endTimeInMinutes - currentTimeInMinutes;
  const hoursLeft = Math.floor(minutesLeft / 60);
  const minsLeft = minutesLeft % 60;

  if (hoursLeft > 0) {
    return `${hoursLeft}h ${minsLeft}m`;
  }
  return `${minsLeft}m`;
};

const getMealWindowEndTimeFormatted = (kitchen: Kitchen | null, mealWindow: MealWindow): string => {
  const endTime = getMealWindowEndTime(kitchen, mealWindow);
  if (!endTime) return 'N/A';

  const hours = endTime.hours;
  const minutes = endTime.minutes;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;

  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Status badge colors
const getStatusColor = (status: BatchStatus): { bg: string; text: string } => {
  switch (status) {
    case 'COLLECTING':
      return { bg: '#dbeafe', text: '#2563eb' };
    case 'READY_FOR_DISPATCH':
      return { bg: '#fef3c7', text: '#d97706' };
    case 'DISPATCHED':
      return { bg: '#fce7f3', text: '#db2777' };
    case 'IN_PROGRESS':
      return { bg: '#e0e7ff', text: '#6366f1' };
    case 'COMPLETED':
      return { bg: '#dcfce7', text: '#16a34a' };
    case 'PARTIAL_COMPLETE':
      return { bg: '#fed7aa', text: '#ea580c' };
    case 'CANCELLED':
      return { bg: '#fee2e2', text: '#dc2626' };
    default:
      return { bg: '#f3f4f6', text: '#6b7280' };
  }
};

export const BatchManagementScreen: React.FC<BatchManagementScreenProps> = ({
  route,
  navigation,
}) => {
  const { kitchenId, kitchenName } = route.params;
  const { showError, showSuccess, showConfirm, showWarning } = useAlert();
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBatching, setIsBatching] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [selectedMealWindow, setSelectedMealWindow] = useState<MealWindow>('LUNCH');
  const [filterStatus, setFilterStatus] = useState<BatchStatus | 'ALL'>('ALL');
  const [orderCount, setOrderCount] = useState<number>(0);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  useEffect(() => {
    loadKitchenData();
  }, [kitchenId]);

  const loadKitchenData = async () => {
    try {
      const kitchenData = await kitchenService.getKitchenById(kitchenId);
      setKitchen(kitchenData);
    } catch (error) {
      console.error('Error loading kitchen data:', error);
      showError('Error', 'Failed to load kitchen data');
    }
  };

  useEffect(() => {
    loadBatches();
    loadOrderCount();
  }, [kitchenId, filterStatus, selectedMealWindow]);

  const loadOrderCount = async () => {
    setIsLoadingOrders(true);
    try {
      // Fetch orders for this kitchen and meal window
      const result = await ordersService.getOrders({
        kitchenId,
        status: 'READY', // Only count READY orders that can be batched
        page: 1,
        limit: 1, // We only need the total count, not the actual orders
      });

      // Get total count from pagination
      setOrderCount(result.pagination?.total || 0);
    } catch (error) {
      console.error('Error loading order count:', error);
      setOrderCount(0);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      // Note: Uncomment this when backend is ready
      // const result = await deliveryService.getBatches({
      //   kitchenId,
      //   status: filterStatus === 'ALL' ? undefined : filterStatus,
      // });
      // setBatches(result.batches);
      setBatches([]);
    } catch (error) {
      console.error('Error loading batches:', error);
      showError('Error', 'Failed to load batches');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleAutoBatch = async () => {
    showConfirm(
      'Auto-Batch Orders',
      `Create batches for ${selectedMealWindow} orders?`,
      async () => {
        setIsBatching(true);
        try {
          const result = await deliveryService.autoBatchOrders({
            mealWindow: selectedMealWindow,
            kitchenId,
          });

          // Backend quirk: actual data is in result.error (same as orders endpoint)
          const responseData = result.error || result.data || result;
          const batchesCreated = responseData?.batchesCreated ?? 0;
          const ordersProcessed = responseData?.ordersProcessed ?? 0;

          showSuccess(
            'Success',
            `Created ${batchesCreated} batch(es) with ${ordersProcessed} order(s)`
          );

          await loadBatches();
          await loadOrderCount();
        } catch (error: any) {
          showError('Error', error.message || 'Failed to create batches');
        } finally {
          setIsBatching(false);
        }
      },
      undefined,
      { confirmText: 'Batch Orders' }
    );
  };

  const handleDispatch = async () => {
    if (!canDispatchMealWindow(kitchen, selectedMealWindow)) {
      showWarning(
        'Cannot Dispatch Yet',
        `${selectedMealWindow} meal window ends in ${getTimeUntilDispatch(kitchen, selectedMealWindow)}. Dispatch is only allowed after the meal window ends.`
      );
      return;
    }

    showConfirm(
      'Dispatch Batches',
      `Dispatch all ${selectedMealWindow} batches to drivers?`,
      async () => {
        setIsDispatching(true);
        try {
          const result = await deliveryService.dispatchBatches({
            mealWindow: selectedMealWindow,
            kitchenId,
          });

          // Backend quirk: actual data is in result.error (same as orders endpoint)
          const responseData = result.error || result.data || result;
          const batchesDispatched = responseData?.batchesDispatched ?? 0;

          showSuccess(
            'Success',
            `Dispatched ${batchesDispatched} batch(es) to drivers`
          );

          await loadBatches();
        } catch (error: any) {
          showError('Error', error.message || 'Failed to dispatch batches');
        } finally {
          setIsDispatching(false);
        }
      },
      undefined,
      { confirmText: 'Dispatch' }
    );
  };

  const filteredBatches = batches.filter(
    (batch) => filterStatus === 'ALL' || batch.status === filterStatus
  );

  const renderBatchCard = (batch: Batch) => {
    const statusColor = getStatusColor(batch.status);

    return (
      <View key={batch._id} style={styles.batchCard}>
        <View style={styles.batchHeader}>
          <View style={styles.batchInfo}>
            <Text style={styles.batchId}>Batch #{batch._id.slice(-6)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.statusText, { color: statusColor.text }]}>
                {batch.status.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>
          <Text style={styles.batchMealWindow}>{batch.mealWindow}</Text>
        </View>

        <View style={styles.batchDetails}>
          <View style={styles.detailRow}>
            <Icon name="shopping-bag" size={16} color={colors.textMuted} />
            <Text style={styles.detailText}>{batch.orders.length} orders</Text>
          </View>

          {batch.driverId && (
            <View style={styles.detailRow}>
              <Icon name="account" size={16} color={colors.textMuted} />
              <Text style={styles.detailText}>Driver assigned</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Icon name="clock-outline" size={16} color={colors.textMuted} />
            <Text style={styles.detailText}>
              {new Date(batch.createdAt).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <GradientBox style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.headerTitle}>Batch Management</Text>
          <Text style={styles.headerSubtitle}>{kitchenName}</Text>
        </View>
      </GradientBox>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadBatches();
              loadOrderCount();
            }}
          />
        }
      >
        {/* Control Panel */}
        <View style={styles.controlPanel}>
          <Text style={styles.sectionTitle}>Batch Operations</Text>

          {/* Meal Window Selector */}
          <View style={styles.mealWindowSelector}>
            <TouchableOpacity
              style={[
                styles.mealWindowButton,
                selectedMealWindow === 'LUNCH' && styles.mealWindowButtonActive,
              ]}
              onPress={() => setSelectedMealWindow('LUNCH')}
            >
              <Icon
                name="white-balance-sunny"
                size={18}
                color={selectedMealWindow === 'LUNCH' ? '#fff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.mealWindowText,
                  selectedMealWindow === 'LUNCH' && styles.mealWindowTextActive,
                ]}
              >
                Lunch
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.mealWindowButton,
                selectedMealWindow === 'DINNER' && styles.mealWindowButtonActive,
              ]}
              onPress={() => setSelectedMealWindow('DINNER')}
            >
              <Icon
                name="moon-waning-crescent"
                size={18}
                color={selectedMealWindow === 'DINNER' ? '#fff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.mealWindowText,
                  selectedMealWindow === 'DINNER' && styles.mealWindowTextActive,
                ]}
              >
                Dinner
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.batchButton,
              (orderCount === 0 || isLoadingOrders) && styles.actionButtonDisabled,
            ]}
            onPress={handleAutoBatch}
            disabled={isBatching || orderCount === 0 || isLoadingOrders}
          >
            {isBatching || isLoadingOrders ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="auto-fix" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>
                  {orderCount === 0 ? 'No Orders Available' : `Batch Orders (${orderCount})`}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* No Orders Info */}
          {orderCount === 0 && !isLoadingOrders && (
            <View style={styles.infoBox}>
              <Icon name="information-outline" size={16} color={colors.info} />
              <Text style={styles.infoText}>
                No orders ready for batching in {selectedMealWindow.toLowerCase()} meal window
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.dispatchButton,
              !canDispatchMealWindow(kitchen, selectedMealWindow) && styles.actionButtonDisabled,
            ]}
            onPress={handleDispatch}
            disabled={isDispatching || !canDispatchMealWindow(kitchen, selectedMealWindow)}
          >
            {isDispatching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="truck-delivery" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>
                  {canDispatchMealWindow(kitchen, selectedMealWindow)
                    ? 'Dispatch to Drivers'
                    : `Wait ${getTimeUntilDispatch(kitchen, selectedMealWindow)}`}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Dispatch Info */}
          {!canDispatchMealWindow(kitchen, selectedMealWindow) && (
            <View style={styles.infoBox}>
              <Icon name="information-outline" size={16} color={colors.info} />
              <Text style={styles.infoText}>
                Dispatch available after {getMealWindowEndTimeFormatted(kitchen, selectedMealWindow)}
              </Text>
            </View>
          )}
        </View>

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <Text style={styles.filterLabel}>Filter:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, filterStatus === 'ALL' && styles.filterChipActive]}
              onPress={() => setFilterStatus('ALL')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterStatus === 'ALL' && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {(['COLLECTING', 'READY_FOR_DISPATCH', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED'] as BatchStatus[]).map(
              (status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
                  onPress={() => setFilterStatus(status)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterStatus === status && styles.filterChipTextActive,
                    ]}
                  >
                    {status.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>
        </View>

        {/* Batches List */}
        <View style={styles.batchesList}>
          <Text style={styles.sectionTitle}>
            Batches ({filteredBatches.length})
          </Text>

          {isLoading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : filteredBatches.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="package-variant" size={64} color={colors.textMuted} />
              <Text style={styles.emptyStateText}>No batches found</Text>
              <Text style={styles.emptyStateSubtext}>
                Create batches by clicking "Batch Orders"
              </Text>
            </View>
          ) : (
            filteredBatches.map(renderBatchCard)
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  controlPanel: {
    backgroundColor: colors.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  mealWindowSelector: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  mealWindowButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealWindowButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mealWindowText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  mealWindowTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  batchButton: {
    backgroundColor: colors.primary,
  },
  dispatchButton: {
    backgroundColor: '#6366f1',
  },
  actionButtonDisabled: {
    backgroundColor: colors.textMuted,
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight || '#eff6ff',
    padding: spacing.sm,
    borderRadius: spacing.borderRadiusMd,
    gap: spacing.xs,
  },
  infoText: {
    fontSize: 12,
    color: colors.info,
    flex: 1,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  filterChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.background,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  batchesList: {
    padding: spacing.md,
  },
  batchCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  batchInfo: {
    flex: 1,
  },
  batchId: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  batchMealWindow: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  batchDetails: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
