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
} from 'react-native';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GradientBox } from '../../../components/common/GradientBox';
import { colors } from '../../../theme/colors';
import { menuManagementService } from '../../../services/menu-management.service';
import { MenuItem, MenuType, MealWindow, MenuItemStatus } from '../../../types/api.types';
import { MenuItemCard } from '../components/MenuItemCard';
import { useAlert } from '../../../hooks/useAlert';

interface MenuListScreenNewProps {
  kitchenId: string;
  onNavigateToDetail: (itemId: string) => void;
  onNavigateToCreate: () => void;
  onNavigateToAddons: () => void;
  onBack?: () => void;
  userRole: 'ADMIN' | 'KITCHEN_STAFF';
}

export const MenuListScreenNew: React.FC<MenuListScreenNewProps> = ({
  kitchenId,
  onNavigateToDetail,
  onNavigateToCreate,
  onNavigateToAddons,
  onBack,
  userRole,
}) => {
  const { showError } = useAlert();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMenuType, setSelectedMenuType] = useState<MenuType | 'ALL'>('ALL');
  const [selectedMealWindow, setSelectedMealWindow] = useState<MealWindow | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<MenuItemStatus | 'ALL'>('ALL');

  // Fetch menu items
  const fetchMenuItems = useCallback(async () => {
    try {
      const response = await menuManagementService.getMenuItems({ kitchenId, limit: 100 });
      setMenuItems(response.menuItems);
      setFilteredItems(response.menuItems);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      showError('Error', 'Failed to load menu items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [kitchenId, showError]);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  // Apply filters
  useEffect(() => {
    let filtered = [...menuItems];

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedMenuType !== 'ALL') {
      filtered = filtered.filter(item => item.menuType === selectedMenuType);
    }

    if (selectedMealWindow !== 'ALL') {
      filtered = filtered.filter(item => item.mealWindow === selectedMealWindow);
    }

    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }

    setFilteredItems(filtered);
  }, [searchQuery, selectedMenuType, selectedMealWindow, selectedStatus, menuItems]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMenuItems();
  };

  const handleToggleAvailability = async (itemId: string, currentAvailability: boolean) => {
    try {
      await menuManagementService.toggleAvailability(itemId, !currentAvailability);

      // Update local state
      setMenuItems(prevItems =>
        prevItems.map(item =>
          item._id === itemId ? { ...item, isAvailable: !currentAvailability } : item
        )
      );
    } catch (error) {
      console.error('Error toggling availability:', error);
      showError('Error', 'Failed to update availability');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Menu Items</Text>
      <View style={styles.headerButtons}>
        <TouchableOpacity style={styles.addonButton} onPress={onNavigateToAddons}>
          <Text style={styles.addonButtonText}>Add-ons Library</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.createButton} onPress={onNavigateToCreate}>
          <Text style={styles.createButtonText}>+ New Item</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search menu items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedMenuType === 'ALL' && styles.filterChipActive,
          ]}
          onPress={() => setSelectedMenuType('ALL')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedMenuType === 'ALL' && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedMenuType === 'MEAL_MENU' && styles.filterChipActive,
          ]}
          onPress={() => setSelectedMenuType('MEAL_MENU')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedMenuType === 'MEAL_MENU' && styles.filterChipTextActive,
            ]}
          >
            Meal Menu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedMenuType === 'ON_DEMAND_MENU' && styles.filterChipActive,
          ]}
          onPress={() => setSelectedMenuType('ON_DEMAND_MENU')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedMenuType === 'ON_DEMAND_MENU' && styles.filterChipTextActive,
            ]}
          >
            On-Demand
          </Text>
        </TouchableOpacity>
      </View>

      {selectedMenuType === 'MEAL_MENU' && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedMealWindow === 'ALL' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedMealWindow('ALL')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedMealWindow === 'ALL' && styles.filterChipTextActive,
              ]}
            >
              All Windows
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedMealWindow === 'LUNCH' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedMealWindow('LUNCH')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedMealWindow === 'LUNCH' && styles.filterChipTextActive,
              ]}
            >
              Lunch
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedMealWindow === 'DINNER' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedMealWindow('DINNER')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedMealWindow === 'DINNER' && styles.filterChipTextActive,
              ]}
            >
              Dinner
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: MenuItem }) => (
    <MenuItemCard
      item={item}
      onPress={() => onNavigateToDetail(item._id)}
      onToggleAvailability={(isAvailable) => handleToggleAvailability(item._id, item.isAvailable)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No menu items found</Text>
      <TouchableOpacity style={styles.createButton} onPress={onNavigateToCreate}>
        <Text style={styles.createButtonText}>Create First Item</Text>
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
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
        <Text style={styles.topHeaderTitle}>Menu Management</Text>
        <View style={styles.headerPlaceholder} />
      </GradientBox>

      <FlatList
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderFilters()}
          </>
        }
        data={filteredItems}
        renderItem={renderItem}
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
    backgroundColor: colors.background,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addonButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addonButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#FE8733',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#FE8733',
    borderColor: '#FE8733',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
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
