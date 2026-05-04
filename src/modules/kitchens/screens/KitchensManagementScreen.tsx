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
import { useAlert } from '../../../hooks/useAlert';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { Kitchen, Zone, Address, OperatingHours } from '../../../types/api.types';
import kitchenService from '../../../services/kitchen.service';
import {
  KitchenCard,
  KitchenFiltersComponent,
  KitchenFormModal,
  KitchenFilters,
  KitchenFormState,
} from '../components';
import { GradientBox } from '../../../components/common/GradientBox';

interface KitchensManagementScreenProps {
  onMenuPress?: () => void;
  navigation?: any;
}

export const KitchensManagementScreen: React.FC<KitchensManagementScreenProps> = ({
  onMenuPress,
  navigation,
}) => {
  const { showConfirm, showError, showSuccess } = useAlert();
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [filters, setFilters] = useState<KitchenFilters>({
    type: 'ALL',
    status: 'ALL',
    search: '',
  });

  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingKitchen, setEditingKitchen] = useState<Kitchen | null>(null);

  // Initial load
  useEffect(() => {
    loadKitchens(true);
  }, [filters]);

  const loadKitchens = async (reset: boolean = false) => {
    if (reset) {
      setPage(1);
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    setError(null);

    try {
      const params = {
        type: filters.type === 'ALL' ? undefined : filters.type,
        status: filters.status === 'ALL' ? undefined : filters.status,
        search: filters.search || undefined,
        page: reset ? 1 : page,
        limit: 20,
      };

      const response = await kitchenService.getKitchens(params);

      // Filter out deleted kitchens when 'ALL' status is selected
      const filteredKitchens = filters.status === 'ALL'
        ? response.kitchens.filter(kitchen => kitchen.status !== 'DELETED')
        : response.kitchens;

      if (reset) {
        setKitchens(filteredKitchens);
      } else {
        setKitchens((prev) => [...prev, ...filteredKitchens]);
      }

      setTotalCount(response.pagination.total);
      setHasMore(response.pagination.page < response.pagination.pages);
      setPage(response.pagination.page + 1);
    } catch (err: any) {
      const errorMessage =
        err?.message || 'Failed to load kitchens';
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
    loadKitchens(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadKitchens(false);
    }
  };

  const handleFiltersChange = (newFilters: KitchenFilters) => {
    setFilters(newFilters);
  };

  const handleCreateKitchen = () => {
    setEditingKitchen(null);
    setFormModalVisible(true);
  };

  const handleEditKitchen = (kitchen: Kitchen) => {
    setEditingKitchen(kitchen);
    setFormModalVisible(true);
  };

  const handleKitchenPress = (kitchen: Kitchen) => {
    // Navigate to detail screen if navigation is available
    if (navigation) {
      navigation.navigate('KitchenDetail', { kitchenId: kitchen._id });
    } else {
      // Fallback to edit modal
      handleEditKitchen(kitchen);
    }
  };

  const handleSaveKitchen = async (formData: KitchenFormState) => {
    try {
      const cuisineTypesArray = formData.cuisineTypes
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c);

      const address: Address = {
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2 || undefined,
        locality: formData.locality,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      };

      // Add coordinates if provided
      if (formData.latitude?.trim() && formData.longitude?.trim()) {
        (address as any).coordinates = {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        };
      }

      const operatingHours: OperatingHours = {
        lunch: {
          startTime: formData.lunchStartTime,
          endTime: formData.lunchEndTime,
        },
        dinner: {
          startTime: formData.dinnerStartTime,
          endTime: formData.dinnerEndTime,
        },
        onDemand: {
          startTime: formData.onDemandStartTime,
          endTime: formData.onDemandEndTime,
          isAlwaysOpen: formData.isAlwaysOpen,
        },
      };

      if (editingKitchen) {
        // Update existing kitchen
        const updatePayload: any = {
          name: formData.name,
          description: formData.description,
          cuisineTypes: cuisineTypesArray,
          address,
          operatingHours,
          contactPhone: formData.contactPhone,
          contactEmail: formData.contactEmail,
        };

        // Add owner details for PARTNER kitchens
        if (editingKitchen.type === 'PARTNER') {
          if (formData.ownerName?.trim()) {
            updatePayload.ownerName = formData.ownerName.trim();
          }
          if (formData.ownerPhone?.trim()) {
            updatePayload.ownerPhone = formData.ownerPhone.trim();
          }
        }

        await kitchenService.updateKitchen(editingKitchen._id, updatePayload);

        // Update serviceable pincodes if changed
        const currentPincodes = Array.isArray(editingKitchen.zonesServed)
          ? editingKitchen.zonesServed
              .map((z) => (typeof z === 'string' ? null : z.pincode))
              .filter((p): p is string => !!p)
          : [];
        const pincodesChanged =
          JSON.stringify([...currentPincodes].sort()) !==
          JSON.stringify([...formData.serviceablePincodes].sort());

        if (pincodesChanged) {
          await kitchenService.updateServiceablePincodes(editingKitchen._id, {
            serviceablePincodes: formData.serviceablePincodes,
          });
        }

        // Update delivery radii if values provided
        const autoRadius = parseFloat(formData.autoAcceptRadiusKm);
        const maxRadius = parseFloat(formData.maxDeliveryRadiusKm);
        if (!isNaN(autoRadius) || !isNaN(maxRadius)) {
          await kitchenService.updateDeliveryRadii(editingKitchen._id, {
            ...((!isNaN(autoRadius)) && { autoAcceptRadiusKm: autoRadius }),
            ...((!isNaN(maxRadius)) && { maxDeliveryRadiusKm: maxRadius }),
          });
        }
      } else {
        // Create new kitchen
        const createPayload: any = {
          name: formData.name,
          type: formData.type,
          cuisineTypes: cuisineTypesArray,
          address,
          serviceablePincodes: formData.serviceablePincodes,
          operatingHours,
          // Add default flags for new kitchens
          authorizedFlag: false,
          premiumFlag: false,
          gourmetFlag: false,
        };

        // Add optional fields only if they have values
        if (formData.description?.trim()) {
          createPayload.description = formData.description.trim();
        }
        if (formData.contactPhone?.trim()) {
          createPayload.contactPhone = formData.contactPhone.trim();
        }
        if (formData.contactEmail?.trim()) {
          createPayload.contactEmail = formData.contactEmail.trim();
        }

        // Add owner details for PARTNER kitchens
        if (formData.type === 'PARTNER') {
          if (formData.ownerName?.trim()) {
            createPayload.ownerName = formData.ownerName.trim();
          }
          if (formData.ownerPhone?.trim()) {
            createPayload.ownerPhone = formData.ownerPhone.trim();
          }
        }

        console.log('Creating kitchen with payload:', JSON.stringify(createPayload, null, 2));
        const newKitchen = await kitchenService.createKitchen(createPayload);

        // Update delivery radii for the new kitchen if values differ from defaults
        const autoRadius = parseFloat(formData.autoAcceptRadiusKm);
        const maxRadius = parseFloat(formData.maxDeliveryRadiusKm);
        if (newKitchen?._id && (!isNaN(autoRadius) || !isNaN(maxRadius))) {
          try {
            await kitchenService.updateDeliveryRadii(newKitchen._id, {
              ...((!isNaN(autoRadius)) && { autoAcceptRadiusKm: autoRadius }),
              ...((!isNaN(maxRadius)) && { maxDeliveryRadiusKm: maxRadius }),
            });
          } catch (radiiErr) {
            console.warn('Failed to set delivery radii for new kitchen:', radiiErr);
          }
        }
      }

      // Close modal and reset state FIRST, before showing toast or reloading
      setFormModalVisible(false);
      setEditingKitchen(null);

      // Then show success message
      showToast(
        `Kitchen ${editingKitchen ? 'updated' : 'created'} successfully`,
        'success'
      );

      // Finally, reload the list
      loadKitchens(true);
    } catch (err: any) {
      console.error('Error saving kitchen:', err);

      // Try to extract a meaningful error message
      let errorMessage = 'Failed to save kitchen';

      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }

      console.log('Extracted error message:', errorMessage);

      // Re-throw to let form handle it (form will show its own error toast)
      throw err;
    }
  };

  const handleDeleteKitchen = async (kitchen: Kitchen) => {
    showConfirm(
      'Delete Kitchen',
      `Are you sure you want to delete "${kitchen.name}"? This action cannot be undone.`,
      async () => {
        try {
          await kitchenService.deleteKitchen(kitchen._id);
          showToast('Kitchen deleted successfully', 'success');
          loadKitchens(true);
        } catch (err: any) {
          const errorMessage = err?.message || 'Failed to delete kitchen';
          showToast(errorMessage, 'error');
        }
      },
      undefined,
      { confirmText: 'Delete', isDestructive: true }
    );
  };

  const handleToggleAcceptingOrders = async (kitchen: Kitchen, isAccepting: boolean) => {
    try {
      await kitchenService.toggleAcceptingOrders(kitchen._id, isAccepting);
      showToast(
        `Kitchen is now ${isAccepting ? 'accepting' : 'not accepting'} orders`,
        'success'
      );

      // Update kitchen in list without reloading
      setKitchens((prev) =>
        prev.map((k) =>
          k._id === kitchen._id ? { ...k, isAcceptingOrders: isAccepting } : k
        )
      );
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to toggle order acceptance';
      showToast(errorMessage, 'error');
    }
  };

  const handleActivateKitchen = async (kitchen: Kitchen) => {
    showConfirm(
      'Activate Kitchen',
      `Are you sure you want to activate "${kitchen.name}"? This will allow the kitchen to start accepting orders.`,
      async () => {
        try {
          await kitchenService.activateKitchen(kitchen._id);
          showToast('Kitchen activated successfully', 'success');
          loadKitchens(true);
        } catch (err: any) {
          const errorMessage = err?.message || 'Failed to activate kitchen';
          showToast(errorMessage, 'error');
        }
      },
      undefined,
      { confirmText: 'Activate' }
    );
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else if (type === 'success') {
      showSuccess('Success', message);
    } else {
      showError('Error', message);
    }
  };

  const renderKitchenCard = ({ item }: { item: Kitchen }) => (
    <KitchenCard
      kitchen={item}
      onPress={handleKitchenPress}
      onToggleAcceptingOrders={handleToggleAcceptingOrders}
      onEdit={handleEditKitchen}
      onDelete={handleDeleteKitchen}
      onActivate={handleActivateKitchen}
    />
  );

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.countText}>
        {totalCount} {totalCount === 1 ? 'kitchen' : 'kitchens'} found
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
        <Icon name="silverware-fork-knife" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No kitchens found</Text>
        <Text style={styles.emptyMessage}>
          {filters.search || filters.type !== 'ALL' || filters.status !== 'ALL'
            ? 'Try adjusting your filters'
            : 'Create your first kitchen to get started'}
        </Text>
        {!filters.search && filters.type === 'ALL' && filters.status === 'ALL' && (
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleCreateKitchen}>
            <Text style={styles.emptyButtonText}>Create Kitchen</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading && kitchens.length === 0) {
    return (
      <SafeAreaScreen topBackgroundColor={colors.primary} bottomBackgroundColor={colors.background} backgroundColor={colors.background}>
        {onMenuPress && (
          <GradientBox style={styles.header}>
            <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
              <MaterialIcon name="menu" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Kitchen Management</Text>
          </GradientBox>
        )}
        <KitchenFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRefresh={handleRefresh}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading kitchens...</Text>
        </View>
      </SafeAreaScreen>
    );
  }

  if (error && kitchens.length === 0) {
    return (
      <SafeAreaScreen topBackgroundColor={colors.primary} bottomBackgroundColor={colors.background} backgroundColor={colors.background}>
        {onMenuPress && (
          <GradientBox style={styles.header}>
            <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
              <MaterialIcon name="menu" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Kitchen Management</Text>
          </GradientBox>
        )}
        <KitchenFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRefresh={handleRefresh}
        />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Failed to load kitchens</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadKitchens(true)}>
            <Icon name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen topBackgroundColor={colors.primary} bottomBackgroundColor={colors.background} backgroundColor={colors.background}>
      {onMenuPress && (
        <GradientBox style={[styles.header, { paddingTop: 8 }]}>
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <MaterialIcon name="menu" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kitchen Management</Text>
        </GradientBox>
      )}
      <KitchenFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onRefresh={handleRefresh}
      />

      <FlatList
        data={kitchens}
        renderItem={renderKitchenCard}
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
        contentContainerStyle={kitchens.length === 0 && styles.emptyList}
      />

      {/* FAB - Add Kitchen Button */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateKitchen}>
        <Icon name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Kitchen Form Modal */}
      <KitchenFormModal
        visible={formModalVisible}
        kitchen={editingKitchen}
        onClose={() => {
          setFormModalVisible(false);
          setEditingKitchen(null);
        }}
        onSave={handleSaveKitchen}
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
