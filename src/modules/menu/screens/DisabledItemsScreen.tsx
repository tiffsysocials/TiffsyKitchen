import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GradientBox } from '../../../components/common/GradientBox';
import { useAlert } from '../../../hooks/useAlert';
import { menuManagementService } from '../../../services/menu-management.service';
import { MenuItem } from '../../../types/api.types';
import { MenuItemCard } from '../components/MenuItemCard';

interface DisabledItemsScreenProps {
  kitchenId?: string; // Optional - if provided, shows only that kitchen's disabled items
  onBack: () => void;
  onNavigateToDetail: (itemId: string) => void;
}

/**
 * DisabledItemsScreen
 * Admin-only view for managing items that have been disabled due to policy violations
 */
export const DisabledItemsScreen: React.FC<DisabledItemsScreenProps> = ({
  kitchenId,
  onBack,
  onNavigateToDetail,
}) => {
  const { showSuccess, showError, showConfirm } = useAlert();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [disabledItems, setDisabledItems] = useState<MenuItem[]>([]);

  const fetchDisabledItems = useCallback(async () => {
    try {
      const items = await menuManagementService.getDisabledMenuItems(kitchenId);
      setDisabledItems(items);
    } catch (error) {
      console.error('Error fetching disabled items:', error);
      showError('Error', 'Failed to load disabled items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [kitchenId]);

  useEffect(() => {
    fetchDisabledItems();
  }, [fetchDisabledItems]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDisabledItems();
  };

  const handleEnableItem = (item: MenuItem) => {
    showConfirm(
      'Enable Menu Item',
      `Are you sure you want to re-enable "${item.name}"? It will become visible to customers again.`,
      async () => {
        try {
          await menuManagementService.enableMenuItem(item._id);
          showSuccess('Success', 'Menu item enabled successfully', fetchDisabledItems);
        } catch (error) {
          console.error('Error enabling item:', error);
          showError('Error', 'Failed to enable menu item');
        }
      },
      undefined,
      { confirmText: 'Enable', cancelText: 'Cancel' }
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Disabled Menu Items</Text>
      <Text style={styles.subtitle}>
        Items disabled by admins for policy violations
      </Text>
      <View style={styles.countCard}>
        <Text style={styles.countValue}>{disabledItems.length}</Text>
        <Text style={styles.countLabel}>Disabled Item{disabledItems.length !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  );

  const renderDisabledCard = ({ item }: { item: MenuItem }) => (
    <View style={styles.cardContainer}>
      <MenuItemCard
        item={item}
        onPress={() => onNavigateToDetail(item._id)}
      />

      {/* Enhanced Disabled Info */}
      <View style={styles.disabledInfo}>
        <View style={styles.disabledHeader}>
          <Text style={styles.disabledTitle}>Reason for Disabling:</Text>
          <View style={styles.disabledBadge}>
            <Text style={styles.disabledBadgeText}>ADMIN DISABLED</Text>
          </View>
        </View>
        <Text style={styles.disabledReason}>{item.disabledReason}</Text>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => onNavigateToDetail(item._id)}
          >
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.enableButton}
            onPress={() => handleEnableItem(item)}
          >
            <Text style={styles.enableButtonText}>✓ Enable Item</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>✓</Text>
      </View>
      <Text style={styles.emptyTitle}>No Disabled Items</Text>
      <Text style={styles.emptyText}>
        All menu items are currently active. Items disabled for policy violations will appear here.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
      {/* Top Header with Back Button */}
      <GradientBox style={[styles.topHeader, { paddingTop: 8 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Disabled Items</Text>
        <View style={styles.headerPlaceholder} />
      </GradientBox>

      <FlatList
        ListHeaderComponent={renderHeader()}
        data={disabledItems}
        renderItem={renderDisabledCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmpty}
      />
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  countCard: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  countValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#dc2626',
  },
  countLabel: {
    fontSize: 14,
    color: '#991b1b',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  cardContainer: {
    marginBottom: 16,
  },
  disabledInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginTop: -8,
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  disabledTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  disabledBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  disabledBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  disabledReason: {
    fontSize: 14,
    color: '#dc2626',
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  enableButton: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  enableButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 40,
    color: '#16a34a',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
