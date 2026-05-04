import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ToastAndroid,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { Zone } from '../../../types/api.types';
import zoneService from '../../../services/zone.service';
import { ZoneCard, ZoneFiltersComponent, ZoneFormModal } from '../components';
import { ZoneFilters, ZoneFormState } from '../models/types';
import { useAlert } from '../../../hooks/useAlert';
import { GradientBox } from '../../../components/common/GradientBox';

interface ZonesManagementScreenProps {
  onMenuPress?: () => void;
}

export const ZonesManagementScreen: React.FC<ZonesManagementScreenProps> = ({
  onMenuPress,
}) => {
  const { showSuccess, showError } = useAlert();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [filters, setFilters] = useState<ZoneFilters>({
    city: undefined,
    status: 'ALL',
    orderingEnabled: undefined,
    search: '',
  });

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);

  // Initial load
  useEffect(() => {
    loadZones(true);
  }, [filters]);

  const loadZones = async (reset: boolean = false) => {
    if (reset) {
      setPage(1);
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    setError(null);

    try {
      const params = {
        ...filters,
        status: filters.status === 'ALL' ? undefined : filters.status,
        page: reset ? 1 : page,
        limit: 20,
      };

      const response = await zoneService.getZones(params);

      if (reset) {
        setZones(response.zones);
      } else {
        setZones((prev) => [...prev, ...response.zones]);
      }

      setTotalCount(response.pagination.total);
      setHasMore(response.pagination.page < response.pagination.pages);
      setPage(response.pagination.page + 1);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to load zones';
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
    loadZones(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadZones(false);
    }
  };

  const handleFiltersChange = (newFilters: ZoneFilters) => {
    setFilters(newFilters);
  };

  const handleCreateZone = () => {
    setEditingZone(null);
    setFormModalVisible(true);
  };

  const handleEditZone = (zone: Zone) => {
    setEditingZone(zone);
    setFormModalVisible(true);
  };

  const handleSaveZone = async (formData: ZoneFormState) => {
    try {
      if (editingZone) {
        // Update text/numeric fields via PUT (backend rejects status/orderingEnabled here)
        const { pincode, status, orderingEnabled, ...updateData } = formData;
        await zoneService.updateZone(editingZone._id, updateData);

        // Status and orderingEnabled have dedicated endpoints — call them only
        // when they actually changed so we don't waste a request per save.
        if (status !== editingZone.status) {
          if (status === 'ACTIVE') {
            await zoneService.activateZone(editingZone._id);
          } else {
            await zoneService.deactivateZone(editingZone._id);
          }
        }
        if (orderingEnabled !== editingZone.orderingEnabled) {
          await zoneService.toggleOrdering(editingZone._id, orderingEnabled);
        }

        showToast('Zone updated successfully', 'success');
      } else {
        // Create new zone (backend createZone accepts status & orderingEnabled directly)
        await zoneService.createZone(formData);
        showToast('Zone created successfully', 'success');
      }

      setFormModalVisible(false);
      setEditingZone(null);
      loadZones(true);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to save zone';
      showToast(errorMessage, 'error');
      throw err; // Re-throw to let form handle it
    }
  };

  const handleDeleteZone = async (zone: Zone) => {
    try {
      await zoneService.deleteZone(zone._id);
      showToast('Zone deleted successfully', 'success');
      loadZones(true);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to delete zone';
      showToast(errorMessage, 'error');
    }
  };

  const handleToggleStatus = async (zone: Zone) => {
    try {
      if (zone.status === 'ACTIVE') {
        await zoneService.deactivateZone(zone._id);
        showToast('Zone deactivated', 'success');
      } else {
        await zoneService.activateZone(zone._id);
        showToast('Zone activated', 'success');
      }
      loadZones(true);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to update zone status';
      showToast(errorMessage, 'error');
    }
  };

  const handleToggleOrdering = async (zone: Zone, enabled: boolean) => {
    try {
      await zoneService.toggleOrdering(zone._id, enabled);
      showToast(
        `Ordering ${enabled ? 'enabled' : 'disabled'} for ${zone.name}`,
        'success'
      );

      // Update zone in list without reloading
      setZones((prev) =>
        prev.map((z) =>
          z._id === zone._id ? { ...z, orderingEnabled: enabled } : z
        )
      );
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to toggle ordering';
      showToast(errorMessage, 'error');
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

  const renderZoneCard = ({ item }: { item: Zone }) => (
    <ZoneCard
      zone={item}
      onEdit={handleEditZone}
      onDelete={handleDeleteZone}
      onToggleStatus={handleToggleStatus}
      onToggleOrdering={handleToggleOrdering}
    />
  );

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.countText}>
        {totalCount} {totalCount === 1 ? 'zone' : 'zones'} found
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
        <Icon name="map-marker-off" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No zones found</Text>
        <Text style={styles.emptyMessage}>
          {filters.search || filters.city || filters.status !== 'ALL'
            ? 'Try adjusting your filters'
            : 'Create your first delivery zone to get started'}
        </Text>
        {!filters.search && !filters.city && filters.status === 'ALL' && (
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleCreateZone}>
            <Text style={styles.emptyButtonText}>Create Zone</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading && zones.length === 0) {
    return (
      <SafeAreaScreen style={{ flex: 1 }} topBackgroundColor={colors.primary} bottomBackgroundColor={colors.background}>
        {/* Header */}
        {onMenuPress && (
          <GradientBox style={styles.header}>
            <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
              <MaterialIcon name="menu" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Zone Management</Text>
          </GradientBox>
        )}
        <ZoneFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRefresh={handleRefresh}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading zones...</Text>
        </View>
      </SafeAreaScreen>
    );
  }

  if (error && zones.length === 0) {
    return (
      <SafeAreaScreen style={{ flex: 1 }} topBackgroundColor={colors.background} bottomBackgroundColor={colors.background} darkIcon>
        {/* Header */}
        {onMenuPress && (
          <View style={[styles.header, { backgroundColor: colors.background, paddingTop: 12 }]}>
            <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
              <MaterialIcon name="menu" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Zone Management</Text>
          </View>
        )}
        <ZoneFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRefresh={handleRefresh}
        />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Failed to load zones</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadZones(true)}>
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
          <Text style={styles.headerTitle}>Zone Management</Text>
        </GradientBox>
      )}
      <ZoneFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onRefresh={handleRefresh}
      />

      <FlatList
        data={zones}
        renderItem={renderZoneCard}
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
        contentContainerStyle={zones.length === 0 && styles.emptyList}
      />

      {/* FAB - Add Zone Button */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateZone}>
        <Icon name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Zone Form Modal */}
      <ZoneFormModal
        visible={formModalVisible}
        zone={editingZone}
        onClose={() => {
          setFormModalVisible(false);
          setEditingZone(null);
        }}
        onSave={handleSaveZone}
      />
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
