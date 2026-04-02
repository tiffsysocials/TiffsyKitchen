import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Modal,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Order, OrdersFilter, OrdersSummaryStats, DateRangeOption, OrderSortOption, OrderStatus, PaymentStatus, PackagingType, SubscriptionPlan } from '../models/types';
import { mockOrders, availableCities, availableKitchens } from '../models/mockOrders';
import { OrderCard, FilterChip, SummaryStatCard } from '../components';
import { filterOrders, sortOrders, calculateSummaryStats, formatCurrency } from '../utils/orderUtils';
import { loadAllOrdersPreferences, saveAllOrdersPreferences, defaultFilters } from '../storage/ordersPreferencesStorage';
import { colors, spacing } from '../../../theme';
import { GradientBox } from '../../../components/common/GradientBox';

interface OrdersListScreenProps {
  onMenuPress: () => void;
  onOrderPress: (order: Order) => void;
}

const dateRangeOptions: { value: DateRangeOption; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
];

const sortOptions: { value: OrderSortOption; label: string }[] = [
  { value: 'newest_first', label: 'Newest First' },
  { value: 'oldest_first', label: 'Oldest First' },
  { value: 'amount_high', label: 'Amount: High → Low' },
  { value: 'amount_low', label: 'Amount: Low → High' },
  { value: 'by_status', label: 'By Status' },
];

const orderStatusOptions: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PREPARING', label: 'Preparing' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const mealTypeOptions = [
  { value: 'all' as const, label: 'All Meals' },
  { value: 'lunch' as const, label: 'Lunch' },
  { value: 'dinner' as const, label: 'Dinner' },
];

const paymentStatusOptions: { value: PaymentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const packagingOptions: { value: PackagingType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'DISPOSABLE', label: 'Disposable' },
  { value: 'STEEL_DABBA', label: 'Steel Dabba' },
];

export const OrdersListScreen: React.FC<OrdersListScreenProps> = ({
  onMenuPress,
  onOrderPress,
}) => {
  const [filter, setFilter] = useState<OrdersFilter>(defaultFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      setIsLoading(true);
      const savedPreferences = await loadAllOrdersPreferences();
      setFilter(savedPreferences);
      setIsLoading(false);
    };
    loadPreferences();
  }, []);

  // Save preferences when filter changes
  useEffect(() => {
    if (!isLoading) {
      saveAllOrdersPreferences(filter);
    }
  }, [filter, isLoading]);

  // Filtered and sorted orders
  const processedOrders = useMemo(() => {
    const filtered = filterOrders(mockOrders, filter);
    return sortOrders(filtered, filter.sortBy);
  }, [filter]);

  // Summary stats
  const summaryStats = useMemo(() => {
    return calculateSummaryStats(processedOrders);
  }, [processedOrders]);

  // Update filter
  const updateFilter = useCallback((updates: Partial<OrdersFilter>) => {
    setFilter(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilter({ ...defaultFilters, dateRange: filter.dateRange, city: filter.city });
  }, [filter.dateRange, filter.city]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise<void>(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filter.searchQuery !== '' ||
      filter.mealType !== 'all' ||
      filter.orderStatus !== 'all' ||
      filter.paymentStatus !== 'all' ||
      filter.packagingType !== 'all' ||
      filter.subscriptionPlan !== 'all' ||
      filter.kitchen !== 'all'
    );
  }, [filter]);

  // Render header
  const renderHeader = () => (
    <View style={styles.headerContainer}>
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
          title="Lunch"
          value={summaryStats.lunchOrders}
          icon="wb-sunny"
          iconColor="#FE8733"
          iconBgColor="#fff7ed"
          style={styles.statCard}
          compact
        />
        <SummaryStatCard
          title="Dinner"
          value={summaryStats.dinnerOrders}
          icon="nights-stay"
          iconColor="#6366f1"
          iconBgColor="#eef2ff"
          style={styles.statCard}
          compact
        />
        <SummaryStatCard
          title="Delivered"
          value={summaryStats.deliveredOrders}
          icon="check-circle"
          iconColor={colors.success}
          iconBgColor={colors.successLight}
          style={styles.statCard}
          compact
        />
        <SummaryStatCard
          title="Revenue"
          value={formatCurrency(summaryStats.totalRevenue)}
          icon="payments"
          iconColor="#8b5cf6"
          iconBgColor="#ede9fe"
          style={styles.statCard}
          compact
        />
      </ScrollView>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterChipsContainer}
        contentContainerStyle={styles.filterChipsContent}
      >
        {/* Meal Type */}
        {mealTypeOptions.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            selected={filter.mealType === option.value}
            onPress={() => updateFilter({ mealType: option.value })}
          />
        ))}

        {/* Status */}
        {orderStatusOptions.slice(0, 5).map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            selected={filter.orderStatus === option.value}
            onPress={() => updateFilter({ orderStatus: option.value })}
          />
        ))}

        {/* More Filters Button */}
        <FilterChip
          label="More Filters"
          icon="tune"
          onPress={() => setShowFiltersModal(true)}
        />
      </ScrollView>
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="search-off" size={64} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>No orders found</Text>
      <Text style={styles.emptyText}>
        {filter.searchQuery
          ? 'Try adjusting your search query'
          : 'No orders match the current filters'}
      </Text>
      {hasActiveFilters && (
        <TouchableOpacity style={styles.clearFiltersButton} onPress={resetFilters}>
          <Text style={styles.clearFiltersText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Render loading skeleton
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
          <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
        </View>
      ))}
    </View>
  );

  // Render filters modal
  const renderFiltersModal = () => (
    <Modal
      visible={showFiltersModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFiltersModal(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          onPress={() => setShowFiltersModal(false)}
        />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>More Filters</Text>
            <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Payment Status */}
            <Text style={styles.filterSectionTitle}>Payment Status</Text>
            <View style={styles.filterChipsWrap}>
              {paymentStatusOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  selected={filter.paymentStatus === option.value}
                  onPress={() => updateFilter({ paymentStatus: option.value })}
                />
              ))}
            </View>

            {/* Packaging */}
            <Text style={styles.filterSectionTitle}>Packaging</Text>
            <View style={styles.filterChipsWrap}>
              {packagingOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  selected={filter.packagingType === option.value}
                  onPress={() => updateFilter({ packagingType: option.value })}
                />
              ))}
            </View>

            {/* Kitchen */}
            <Text style={styles.filterSectionTitle}>Kitchen</Text>
            <View style={styles.filterChipsWrap}>
              <FilterChip
                label="All Kitchens"
                selected={filter.kitchen === 'all'}
                onPress={() => updateFilter({ kitchen: 'all' })}
              />
              {availableKitchens.map((kitchen) => (
                <FilterChip
                  key={kitchen.id}
                  label={kitchen.name}
                  selected={filter.kitchen === kitchen.id}
                  onPress={() => updateFilter({ kitchen: kitchen.id })}
                />
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                resetFilters();
                setShowFiltersModal(false);
              }}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFiltersModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render sort modal
  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          onPress={() => setShowSortModal(false)}
        />
        <View style={styles.sortModalContent}>
          <Text style={styles.sortModalTitle}>Sort By</Text>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortOption,
                filter.sortBy === option.value && styles.sortOptionSelected,
              ]}
              onPress={() => {
                updateFilter({ sortBy: option.value });
                setShowSortModal(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  filter.sortBy === option.value && styles.sortOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
              {filter.sortBy === option.value && (
                <MaterialIcons name="check" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  // Render city modal
  const renderCityModal = () => (
    <Modal
      visible={showCityModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowCityModal(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          onPress={() => setShowCityModal(false)}
        />
        <View style={styles.sortModalContent}>
          <Text style={styles.sortModalTitle}>Select City</Text>
          <TouchableOpacity
            style={[
              styles.sortOption,
              filter.city === 'all' && styles.sortOptionSelected,
            ]}
            onPress={() => {
              updateFilter({ city: 'all' });
              setShowCityModal(false);
            }}
          >
            <Text
              style={[
                styles.sortOptionText,
                filter.city === 'all' && styles.sortOptionTextSelected,
              ]}
            >
              All Cities
            </Text>
            {filter.city === 'all' && (
              <MaterialIcons name="check" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
          {availableCities.map((city) => (
            <TouchableOpacity
              key={city}
              style={[
                styles.sortOption,
                filter.city === city && styles.sortOptionSelected,
              ]}
              onPress={() => {
                updateFilter({ city });
                setShowCityModal(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  filter.city === city && styles.sortOptionTextSelected,
                ]}
              >
                {city}
              </Text>
              {filter.city === city && (
                <MaterialIcons name="check" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <GradientBox style={styles.header}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <MaterialIcons name="menu" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Orders</Text>
        <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
          <MaterialIcons name="sort" size={24} color={colors.white} />
        </TouchableOpacity>
      </GradientBox>

      {/* Context Bar: City & Date */}
      <View style={styles.contextBar}>
        <TouchableOpacity style={styles.citySelector} onPress={() => setShowCityModal(true)}>
          <MaterialIcons name="location-on" size={16} color={colors.primary} />
          <Text style={styles.citySelectorText}>
            {filter.city === 'all' ? 'All Cities' : filter.city}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <View style={styles.dateRangeSelector}>
          {dateRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.dateRangeOption,
                filter.dateRange === option.value && styles.dateRangeOptionSelected,
              ]}
              onPress={() => updateFilter({ dateRange: option.value })}
            >
              <Text
                style={[
                  styles.dateRangeText,
                  filter.dateRange === option.value && styles.dateRangeTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by order ID, name, or phone..."
            placeholderTextColor={colors.textMuted}
            value={filter.searchQuery}
            onChangeText={(text) => updateFilter({ searchQuery: text })}
          />
          {filter.searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => updateFilter({ searchQuery: '' })}>
              <MaterialIcons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Orders List */}
      <FlatList
        data={processedOrders}
        renderItem={({ item }) => <OrderCard order={item} onPress={onOrderPress} />}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />

      {/* Results Count */}
      {processedOrders.length > 0 && (
        <View style={styles.resultsFooter}>
          <Text style={styles.resultsText}>
            Showing {processedOrders.length} order{processedOrders.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Modals */}
      {renderFiltersModal()}
      {renderSortModal()}
      {renderCityModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
    marginLeft: spacing.md,
  },
  sortButton: {
    padding: spacing.xs,
  },
  contextBar: {
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  citySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadiusMd,
  },
  citySelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginHorizontal: spacing.xs,
  },
  dateRangeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    padding: 2,
  },
  dateRangeOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadiusSm,
  },
  dateRangeOptionSelected: {
    backgroundColor: colors.primary,
  },
  dateRangeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  dateRangeTextSelected: {
    color: colors.white,
  },
  searchContainer: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: spacing.md,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    padding: 0,
  },
  headerContainer: {
    backgroundColor: colors.card,
    paddingBottom: spacing.sm,
  },
  statsContainer: {
    paddingVertical: spacing.sm,
  },
  statsContent: {
    paddingHorizontal: spacing.lg,
  },
  statCard: {
    marginRight: spacing.sm,
    minWidth: 110,
  },
  filterChipsContainer: {
    paddingVertical: spacing.sm,
  },
  filterChipsContent: {
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.borderRadiusMd,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  skeletonContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  skeletonCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: colors.background,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  skeletonLineShort: {
    width: '60%',
  },
  skeletonLineMedium: {
    width: '80%',
  },
  resultsFooter: {
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  resultsText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: spacing.borderRadiusXl,
    borderTopRightRadius: spacing.borderRadiusXl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  filterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  resetButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadiusMd,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  sortModalContent: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusXl,
    margin: spacing.lg,
    padding: spacing.md,
  },
  sortModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: spacing.sm,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
  },
  sortOptionSelected: {
    backgroundColor: colors.primaryLight,
  },
  sortOptionText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  sortOptionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
});

OrdersListScreen.displayName = 'OrdersListScreen';

export default OrdersListScreen;
