import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GradientBox } from '../../../components/common/GradientBox';
import { useAlert } from '../../../hooks/useAlert';
import { addonService } from '../../../services/addon.service';
import { Addon } from '../../../types/api.types';
import { DietaryBadge } from '../components/DietaryBadge';

interface AddonLibraryScreenProps {
  kitchenId: string;
  onNavigateToDetail: (addonId?: string) => void;
  onBack: () => void;
}

interface AddonWithUsage extends Addon {
  menuItemCount?: number;
}

export const AddonLibraryScreen: React.FC<AddonLibraryScreenProps> = ({
  kitchenId,
  onNavigateToDetail,
  onBack,
}) => {
  const { showSuccess, showError, showInfo, showConfirm } = useAlert();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addons, setAddons] = useState<AddonWithUsage[]>([]);
  const [filteredAddons, setFilteredAddons] = useState<AddonWithUsage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ totalCount: 0, activeCount: 0 });

  const fetchAddons = useCallback(async () => {
    try {
      const response = await addonService.getAddonLibrary(kitchenId);
      setAddons(response.addons);
      setFilteredAddons(response.addons);
      setStats({
        totalCount: response.totalCount,
        activeCount: response.activeCount,
      });
    } catch (error) {
      console.error('Error fetching addons:', error);
      showError('Error', 'Failed to load add-ons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [kitchenId]);

  useEffect(() => {
    fetchAddons();
  }, [fetchAddons]);

  // Apply search filter
  useEffect(() => {
    if (searchQuery) {
      const filtered = addons.filter(addon =>
        addon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        addon.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAddons(filtered);
    } else {
      setFilteredAddons(addons);
    }
  }, [searchQuery, addons]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAddons();
  };

  const handleToggleAvailability = async (addonId: string, currentAvailability: boolean) => {
    try {
      await addonService.toggleAvailability(addonId, !currentAvailability);

      // Update local state
      setAddons(prevAddons =>
        prevAddons.map(addon =>
          addon._id === addonId ? { ...addon, isAvailable: !currentAvailability } : addon
        )
      );
    } catch (error) {
      console.error('Error toggling availability:', error);
      showError('Error', 'Failed to update availability');
    }
  };

  const handleDelete = (addon: AddonWithUsage) => {
    const usageCount = addon.menuItemCount || 0;

    if (usageCount > 0) {
      showInfo(
        'Cannot Delete',
        `This add-on is used in ${usageCount} menu item${usageCount > 1 ? 's' : ''}. Remove it from all menu items first.`
      );
      return;
    }

    showConfirm(
      'Delete Add-on',
      `Are you sure you want to delete "${addon.name}"?`,
      async () => {
        try {
          await addonService.deleteAddon(addon._id);
          showSuccess('Success', 'Add-on deleted', fetchAddons);
        } catch (error) {
          showError('Error', 'Failed to delete add-on');
        }
      },
      undefined,
      { confirmText: 'Delete', cancelText: 'Cancel', isDestructive: true }
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.activeValue]}>{stats.activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => onNavigateToDetail(undefined)}
      >
        <Text style={styles.createButtonText}>+ Create New Add-on</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search add-ons..."
        placeholderTextColor="#6b7280"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
    </View>
  );

  const renderAddonCard = ({ item }: { item: AddonWithUsage }) => (
    <TouchableOpacity
      style={styles.addonCard}
      onPress={() => onNavigateToDetail(item._id)}
      activeOpacity={0.7}
    >
      <View style={styles.addonContent}>
        <View style={styles.addonTopRow}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.addonThumbnail} resizeMode="cover" />
          ) : (
            <View style={[styles.addonThumbnail, styles.addonThumbnailPlaceholder]}>
              <Icon name="restaurant" size={24} color="#9ca3af" />
            </View>
          )}
          <View style={styles.addonTopText}>
            <View style={styles.addonHeader}>
              <Text style={styles.addonName}>{item.name}</Text>
              <DietaryBadge dietaryType={item.dietaryType} size="small" />
            </View>

            {item.description && (
              <Text style={styles.addonDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.addonFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.addonPrice}>₹{item.price}</Text>
            {item.menuItemCount !== undefined && item.menuItemCount > 0 && (
              <Text style={styles.usageText}>
                Used in {item.menuItemCount} item{item.menuItemCount > 1 ? 's' : ''}
              </Text>
            )}
          </View>

          <View style={styles.actions}>
            <View style={styles.availabilityToggle}>
              <Text style={styles.availabilityLabel}>Available</Text>
              <Switch
                value={item.isAvailable}
                onValueChange={() => handleToggleAvailability(item._id, item.isAvailable)}
                trackColor={{ false: '#d1d5db', true: '#86efac' }}
                thumbColor={item.isAvailable ? '#16a34a' : '#f3f4f6'}
              />
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {item.status === 'INACTIVE' && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveText}>Inactive</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No add-ons found</Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => onNavigateToDetail(undefined)}
      >
        <Text style={styles.createButtonText}>Create First Add-on</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FE8733" />
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
        <Text style={styles.topHeaderTitle}>Add-ons Library</Text>
        <View style={styles.headerPlaceholder} />
      </GradientBox>

      <FlatList
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderSearchBar()}
          </>
        }
        data={filteredAddons}
        renderItem={renderAddonCard}
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
  backButtonText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
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
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  activeValue: {
    color: '#16a34a',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  createButton: {
    backgroundColor: '#FE8733',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  searchContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  listContent: {
    padding: 16,
  },
  addonCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addonContent: {
    padding: 12,
  },
  addonTopRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  addonTopText: {
    flex: 1,
    marginLeft: 12,
  },
  addonThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  addonThumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addonName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  addonDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  addonFooter: {
    gap: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addonPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  usageText: {
    fontSize: 12,
    color: '#FE8733',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  inactiveBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  inactiveText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
});
