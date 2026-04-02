import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAlert } from '../../../hooks/useAlert';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { deliveryService } from '../../../services/delivery.service';
import { MealWindow } from '../../../types/api.types';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import BatchDetailScreen from '../../../modules/delivery/screens/BatchDetailScreen';
import { GradientBox } from '../../../components/common/GradientBox';

interface BatchHistoryScreenProps {
  navigation?: any;
  route?: any;
  kitchenId?: string;
  kitchenName?: string;
  isAdmin?: boolean;
  onBack?: () => void;
}

interface Batch {
  _id: string;
  batchNumber: string;
  status: string;
  mealWindow: MealWindow;
  orderIds: string[];
  totalDelivered: number;
  totalFailed: number;
  kitchenId: {
    _id: string;
    name: string;
  };
  zoneId?: {
    _id: string;
    name: string;
  };
  driverId?: {
    _id: string;
    name: string;
    phone: string;
  };
  createdAt: string;
  dispatchedAt?: string;
  completedAt?: string;
}

export const BatchHistoryScreen: React.FC<BatchHistoryScreenProps> = ({
  navigation,
  route,
  kitchenId: propKitchenId,
  kitchenName: propKitchenName,
  isAdmin = true,
  onBack,
}) => {
  const { showError } = useAlert();
  const kitchenId = route?.params?.kitchenId || propKitchenId;
  const kitchenName = route?.params?.kitchenName || propKitchenName;

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedMealWindow, setSelectedMealWindow] = useState<'ALL' | MealWindow>('ALL');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const STATUS_FILTERS = [
    { label: 'All', value: 'ALL' },
    { label: 'Collecting', value: 'COLLECTING' },
    { label: 'Ready', value: 'READY_FOR_DISPATCH' },
    { label: 'Dispatched', value: 'DISPATCHED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Partial', value: 'PARTIAL_COMPLETE' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  const MEAL_WINDOW_FILTERS = [
    { label: 'All', value: 'ALL' },
    { label: 'Lunch', value: 'LUNCH' },
    { label: 'Dinner', value: 'DINNER' },
  ];

  useEffect(() => {
    loadBatches(true);
  }, [selectedStatus, selectedMealWindow]);

  const loadBatches = async (reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setPage(1);
      setBatches([]);
    } else {
      setLoadingMore(true);
    }

    try {
      const params: any = {
        page: reset ? 1 : page,
        limit: 20,
      };

      if (kitchenId) params.kitchenId = kitchenId;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedMealWindow !== 'ALL') params.mealWindow = selectedMealWindow;

      let result;
      if (isAdmin) {
        result = await deliveryService.getBatches(params);
      } else {
        const kitchenParams: any = { page: params.page, limit: params.limit };
        if (params.status) kitchenParams.status = params.status;
        if (params.mealWindow) kitchenParams.mealWindow = params.mealWindow;
        result = await deliveryService.getMyKitchenBatches(kitchenParams);
      }
      const newBatches = result.data?.batches || [];

      if (reset) {
        setBatches(newBatches);
      } else {
        setBatches([...batches, ...newBatches]);
      }

      setHasMore(
        result.data?.pagination?.page < result.data?.pagination?.pages
      );
      setPage(result.data?.pagination?.page || 1);
    } catch (error: any) {
      console.error('Error loading batches:', error);
      showError('Error', 'Failed to load batch history');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBatches(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setPage(page + 1);
      loadBatches(false);
    }
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
  };

  const handleMealWindowFilter = (mealWindow: 'ALL' | MealWindow) => {
    setSelectedMealWindow(mealWindow);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'COLLECTING':
        return '#fef3c7';
      case 'READY_FOR_DISPATCH':
        return '#dcfce7';
      case 'DISPATCHED':
        return '#dbeafe';
      case 'IN_PROGRESS':
        return '#e0e7ff';
      case 'COMPLETED':
        return '#d1fae5';
      case 'PARTIAL_COMPLETE':
        return '#fed7aa';
      case 'CANCELLED':
        return '#fecaca';
      default:
        return '#f3f4f6';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'COLLECTING':
        return 'package-variant';
      case 'READY_FOR_DISPATCH':
        return 'check-circle';
      case 'DISPATCHED':
        return 'truck-fast';
      case 'IN_PROGRESS':
        return 'truck-delivery';
      case 'COMPLETED':
        return 'check-all';
      case 'PARTIAL_COMPLETE':
        return 'alert-circle';
      case 'CANCELLED':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'COLLECTING':
        return 'Collecting';
      case 'READY_FOR_DISPATCH':
        return 'Ready';
      case 'DISPATCHED':
        return 'Dispatched';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      case 'PARTIAL_COMPLETE':
        return 'Partial';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const handleBatchPress = (batch: Batch) => {
    setSelectedBatchId(batch._id);
  };

  const renderBatchItem = ({ item }: { item: Batch }) => {
    return (
      <TouchableOpacity
        style={styles.batchCard}
        onPress={() => handleBatchPress(item)}
      >
        <View style={styles.batchHeader}>
          <View style={styles.batchNumberContainer}>
            <Icon name="barcode" size={16} color={colors.textSecondary} />
            <Text style={styles.batchNumber}>{item.batchNumber}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Icon
              name={getStatusIcon(item.status)}
              size={12}
              color={colors.textPrimary}
            />
            <Text style={styles.statusBadgeText}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.batchDetails}>
          <View style={styles.batchDetailRow}>
            <Icon name="silverware-fork-knife" size={16} color={colors.textMuted} />
            <Text style={styles.batchDetailText}>
              {item.kitchenId?.name || 'Unknown Kitchen'}
            </Text>
          </View>

          {item.zoneId && (
            <View style={styles.batchDetailRow}>
              <Icon name="map-marker" size={16} color={colors.textMuted} />
              <Text style={styles.batchDetailText}>{item.zoneId.name}</Text>
            </View>
          )}

          {item.driverId && (
            <View style={styles.batchDetailRow}>
              <Icon name="account" size={16} color={colors.textMuted} />
              <Text style={styles.batchDetailText}>{item.driverId.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.batchStats}>
          <View style={styles.batchStatItem}>
            <Icon name="package-variant" size={18} color="#6366f1" />
            <Text style={styles.batchStatValue}>{item.orderIds?.length || 0}</Text>
            <Text style={styles.batchStatLabel}>Orders</Text>
          </View>

          {(item.totalDelivered > 0 || item.totalFailed > 0) && (
            <>
              <View style={styles.batchStatItem}>
                <Icon name="check-circle" size={18} color="#10b981" />
                <Text style={styles.batchStatValue}>{item.totalDelivered || 0}</Text>
                <Text style={styles.batchStatLabel}>Delivered</Text>
              </View>

              <View style={styles.batchStatItem}>
                <Icon name="close-circle" size={18} color="#ef4444" />
                <Text style={styles.batchStatValue}>{item.totalFailed || 0}</Text>
                <Text style={styles.batchStatLabel}>Failed</Text>
              </View>
            </>
          )}

          <View style={styles.batchStatItem}>
            <Icon
              name={item.mealWindow === 'LUNCH' ? 'white-balance-sunny' : 'moon-waning-crescent'}
              size={18}
              color={colors.primary}
            />
            <Text style={styles.batchStatLabel}>{item.mealWindow}</Text>
          </View>
        </View>

        <View style={styles.batchFooter}>
          <Text style={styles.batchTimestamp}>{formatDate(item.createdAt)}</Text>
          <Icon name="chevron-right" size={20} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyState}>
        <Icon name="package-variant-closed-remove" size={64} color={colors.textMuted} />
        <Text style={styles.emptyStateText}>No batches found</Text>
        <Text style={styles.emptyStateSubtext}>
          {selectedStatus === 'ALL' && selectedMealWindow === 'ALL'
            ? 'No batch history available'
            : 'Try adjusting your filters'}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  // Show batch detail screen when a batch is selected
  if (selectedBatchId) {
    return (
      <BatchDetailScreen
        batchId={selectedBatchId}
        onBack={() => {
          setSelectedBatchId(null);
          handleRefresh();
        }}
      />
    );
  }

  return (
    <SafeAreaScreen style={{ flex: 1 }} backgroundColor={colors.primary}>
      {/* Header */}
      <GradientBox style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation) {
              navigation.goBack();
            } else if (onBack) {
              onBack();
            }
          }}
        >
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={styles.headerTitle}>Batch History</Text>
          {kitchenName && (
            <Text style={styles.headerSubtitle}>{kitchenName}</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleRefresh}>
          <Icon name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </GradientBox>
      <View style={{ flex: 1, backgroundColor: colors.background }}>

        {/* Filters */}
        <View style={styles.filtersSection}>
          {/* Meal Window Filter */}
          <View style={styles.filterRow}>
            {MEAL_WINDOW_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterChip,
                  selectedMealWindow === filter.value && styles.filterChipActive,
                ]}
                onPress={() => handleMealWindowFilter(filter.value as 'ALL' | MealWindow)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedMealWindow === filter.value && styles.filterChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Status Filter */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={STATUS_FILTERS}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  styles.statusFilterChip,
                  selectedStatus === item.value && styles.filterChipActive,
                ]}
                onPress={() => handleStatusFilter(item.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedStatus === item.value && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.statusFilterList}
          />
        </View>

        {/* Batch List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading batch history...</Text>
          </View>
        ) : (
          <FlatList
            data={batches}
            renderItem={renderBatchItem}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            contentContainerStyle={[
              styles.listContainer,
              batches.length === 0 && styles.emptyListContainer,
            ]}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  filtersSection: {
    backgroundColor: '#fff',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusFilterChip: {
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  statusFilterList: {
    paddingHorizontal: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  batchCard: {
    backgroundColor: '#fff',
    borderRadius: spacing.borderRadiusMd,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  batchNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  batchNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  batchDetails: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  batchDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  batchDetailText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  batchStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  batchStatItem: {
    alignItems: 'center',
    gap: 2,
  },
  batchStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  batchStatLabel: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  batchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchTimestamp: {
    fontSize: 11,
    color: colors.textMuted,
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
  loadingFooter: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});

export default BatchHistoryScreen;
