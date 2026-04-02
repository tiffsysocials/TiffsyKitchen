import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  ToastAndroid,
} from 'react-native';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { Coupon, CouponDetailsResponse, CreateCouponRequest, UpdateCouponRequest } from '../../../types/api.types';
import { couponService } from '../../../services/coupon.service';
import { CouponCard } from '../components/CouponCard';
import { CouponFiltersComponent } from '../components/CouponFilters';
import { CouponFormModal } from '../components/CouponFormModal';
import { CouponDetailModal } from '../components/CouponDetailModal';
import { CouponFiltersState, DEFAULT_COUPON_FILTERS } from '../models/types';
import { useAlert } from '../../../hooks/useAlert';
import { GradientBox } from '../../../components/common/GradientBox';

interface CouponsManagementScreenProps {
  onMenuPress?: () => void;
}

export const CouponsManagementScreen: React.FC<CouponsManagementScreenProps> = ({
  onMenuPress,
}) => {
  const { showSuccess, showError } = useAlert();

  // List state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [filters, setFilters] = useState<CouponFiltersState>(DEFAULT_COUPON_FILTERS);

  // Form modal
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailData, setDetailData] = useState<CouponDetailsResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Load coupons on filter change
  useEffect(() => {
    loadCoupons(true);
  }, [filters]);

  const loadCoupons = async (reset: boolean = false) => {
    if (reset) {
      setPage(1);
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const params = {
        status: filters.status === 'ALL' ? undefined : filters.status,
        discountType: filters.discountType === 'ALL' ? undefined : filters.discountType,
        search: filters.search || undefined,
        page: reset ? 1 : page,
        limit: 20,
      };

      const response = await couponService.getCoupons(params);

      if (reset) {
        setCoupons(response.coupons);
      } else {
        setCoupons((prev) => [...prev, ...response.coupons]);
      }

      setTotalCount(response.pagination.total);
      setHasMore(response.pagination.page < response.pagination.pages);
      setPage(response.pagination.page + 1);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to load coupons';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCoupons(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadCoupons(false);
    }
  };

  const handleFiltersChange = (newFilters: CouponFiltersState) => {
    setFilters(newFilters);
  };

  // CRUD Handlers
  const handleCreateCoupon = () => {
    setEditingCoupon(null);
    setFormModalVisible(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormModalVisible(true);
  };

  const handleSaveCoupon = async (data: CreateCouponRequest | UpdateCouponRequest, isEdit: boolean) => {
    try {
      if (isEdit && editingCoupon) {
        await couponService.updateCoupon(editingCoupon._id, data);
        showToast('Coupon updated successfully', 'success');
      } else {
        await couponService.createCoupon(data as CreateCouponRequest);
        showToast('Coupon created successfully', 'success');
      }
      setFormModalVisible(false);
      setEditingCoupon(null);
      loadCoupons(true);
    } catch (err: any) {
      // Re-throw so CouponFormModal displays the error inline
      throw err;
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      if (coupon.status === 'ACTIVE') {
        await couponService.deactivateCoupon(coupon._id);
        showToast('Coupon deactivated', 'success');
      } else {
        await couponService.activateCoupon(coupon._id);
        showToast('Coupon activated', 'success');
      }
      loadCoupons(true);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to update coupon status';
      showToast(errorMessage, 'error');
    }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    try {
      await couponService.deleteCoupon(coupon._id);
      showToast('Coupon deleted successfully', 'success');
      loadCoupons(true);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete coupon';
      showToast(errorMessage, 'error');
    }
  };

  // Detail modal
  const handleCouponPress = async (coupon: Coupon) => {
    setDetailModalVisible(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const data = await couponService.getCouponById(coupon._id);
      setDetailData(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load coupon details', 'error');
      setDetailModalVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      if (type === 'success') {
        showSuccess('Success', message);
      } else {
        showError('Error', message);
      }
    }
  };

  // Render helpers
  const renderCouponCard = ({ item }: { item: Coupon }) => (
    <CouponCard
      coupon={item}
      onPress={handleCouponPress}
      onEdit={handleEditCoupon}
      onToggleStatus={handleToggleStatus}
      onDelete={handleDeleteCoupon}
    />
  );

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.countText}>
        {totalCount} {totalCount === 1 ? 'coupon' : 'coupons'} found
      </Text>
    </View>
  );

  const renderListFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Icon name="ticket-percent-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No coupons found</Text>
        <Text style={styles.emptyMessage}>
          {filters.search || filters.status !== 'ALL' || filters.discountType !== 'ALL'
            ? 'Try adjusting your filters'
            : 'Create your first coupon to get started'}
        </Text>
        {!filters.search && filters.status === 'ALL' && filters.discountType === 'ALL' && (
          <TouchableOpacity style={styles.emptyButton} onPress={handleCreateCoupon}>
            <Text style={styles.emptyButtonText}>Create Coupon</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Loading state
  if (loading && coupons.length === 0) {
    return (
      <SafeAreaScreen style={{ flex: 1 }} topBackgroundColor={colors.primary} bottomBackgroundColor={colors.background}>
        {onMenuPress && (
          <GradientBox style={styles.header}>
            <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
              <MaterialIcon name="menu" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Coupon Management</Text>
          </GradientBox>
        )}
        <CouponFiltersComponent filters={filters} onFiltersChange={handleFiltersChange} onRefresh={handleRefresh} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading coupons...</Text>
        </View>
      </SafeAreaScreen>
    );
  }

  // Error state
  if (error && coupons.length === 0) {
    return (
      <SafeAreaScreen style={{ flex: 1 }} topBackgroundColor={colors.background} bottomBackgroundColor={colors.background} darkIcon>
        {onMenuPress && (
          <GradientBox style={[styles.header, { backgroundColor: colors.background, paddingTop: 12 }]}>
            <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
              <MaterialIcon name="menu" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Coupon Management</Text>
          </GradientBox>
        )}
        <CouponFiltersComponent filters={filters} onFiltersChange={handleFiltersChange} onRefresh={handleRefresh} />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Failed to load coupons</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadCoupons(true)}>
            <Icon name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen style={{ flex: 1 }} topBackgroundColor={colors.primary} bottomBackgroundColor={colors.background}>
      {/* Header */}
      {onMenuPress && (
        <GradientBox style={styles.header}>
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <MaterialIcon name="menu" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Coupon Management</Text>
        </GradientBox>
      )}

      {/* Filters */}
      <CouponFiltersComponent filters={filters} onFiltersChange={handleFiltersChange} onRefresh={handleRefresh} />

      {/* Coupon List */}
      <FlatList
        data={coupons}
        renderItem={renderCouponCard}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={coupons.length === 0 && styles.emptyList}
      />

      {/* FAB - Create Coupon */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateCoupon}>
        <Icon name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Form Modal (Create/Edit) */}
      <CouponFormModal
        visible={formModalVisible}
        coupon={editingCoupon}
        onClose={() => {
          setFormModalVisible(false);
          setEditingCoupon(null);
        }}
        onSave={handleSaveCoupon}
      />

      {/* Detail Modal */}
      <CouponDetailModal
        visible={detailModalVisible}
        data={detailData}
        loading={detailLoading}
        onClose={() => {
          setDetailModalVisible(false);
          setDetailData(null);
        }}
        onEdit={(coupon) => {
          setDetailModalVisible(false);
          handleEditCoupon(coupon);
        }}
        onToggleStatus={(coupon) => {
          handleToggleStatus(coupon);
        }}
        onDelete={(coupon) => {
          handleDeleteCoupon(coupon);
        }}
      />
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    marginRight: spacing.lg,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  listHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  countText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  footerLoader: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    marginTop: spacing.lg,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
