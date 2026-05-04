/**
 * MenuManagementMain.tsx
 *
 * Main entry point for Menu Management from the app navigation
 * Handles kitchen selection and routes to the appropriate menu management screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GradientBox } from '../../../components/common/GradientBox';
import { colors } from '../../../theme/colors';
import { Kitchen } from '../../../types/api.types';
import { MenuManagementExample } from '../MenuManagementExample';
import kitchenService from '../../../services/kitchen.service';
import { useAlert } from '../../../hooks/useAlert';

interface MenuManagementMainProps {
  onMenuPress: () => void;
}

/**
 * Main Menu Management Screen
 * Step 1: Select a kitchen
 * Step 2: Manage that kitchen's menu
 */
export const MenuManagementMain: React.FC<MenuManagementMainProps> = ({
  onMenuPress,
}) => {
  const { showError } = useAlert();
  const [selectedKitchen, setSelectedKitchen] = useState<Kitchen | null>(null);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'ADMIN' | 'KITCHEN_STAFF'>('ADMIN');

  useEffect(() => {
    loadKitchens();
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const role = await AsyncStorage.getItem('adminRole');
      if (role === 'ADMIN' || role === 'KITCHEN_STAFF') {
        setUserRole(role);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const loadKitchens = async () => {
    try {
      const response = await kitchenService.getActiveKitchens({ limit: 100 });
      setKitchens(response.kitchens);
    } catch (error) {
      console.error('Error loading kitchens:', error);
      showError('Error', 'Failed to load kitchens. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKitchenSelect = (kitchen: Kitchen) => {
    setSelectedKitchen(kitchen);
  };

  const handleBackToKitchenList = () => {
    setSelectedKitchen(null);
  };

  // If kitchen is selected, show menu management for that kitchen
  if (selectedKitchen) {
    return (
      <MenuManagementExample
        kitchenId={selectedKitchen._id}
        userRole={userRole}
        onExit={handleBackToKitchenList}
      />
    );
  }

  // Show kitchen selection
  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
      {/* Header */}
      <GradientBox style={[styles.header, { paddingTop: 8 }]}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <Icon name="menu" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu Management</Text>
      </GradientBox>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Select Kitchen</Text>
          <Text style={styles.subtitle}>Choose a kitchen to manage its menu</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : (
          <FlatList
            data={kitchens}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.kitchenCard}
                onPress={() => handleKitchenSelect(item)}
                activeOpacity={0.7}
              >
                <View style={styles.kitchenIcon}>
                  <Icon name="restaurant" size={32} color="#6366f1" />
                </View>
                <View style={styles.kitchenInfo}>
                  <View style={styles.kitchenHeader}>
                    <Text style={styles.kitchenName}>{item.name}</Text>
                    <View style={[
                      styles.typeBadge,
                      item.type === 'TIFFSY' && styles.tiffsyBadge
                    ]}>
                      <Text style={[
                        styles.typeBadgeText,
                        item.type === 'TIFFSY' && styles.tiffsyBadgeText
                      ]}>
                        {item.type}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.kitchenCode}>{item.code}</Text>
                  <View style={styles.kitchenMeta}>
                    <View style={styles.metaItem}>
                      <Icon name="location-on" size={14} color="#6b7280" />
                      <Text style={styles.metaText}>{item.address.locality}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Icon name="star" size={14} color="#f59e0b" />
                      <Text style={styles.metaText}>{item.averageRating} ({item.totalRatings})</Text>
                    </View>
                  </View>
                  {item.cuisineTypes.length > 0 && (
                    <View style={styles.cuisineContainer}>
                      {item.cuisineTypes.slice(0, 3).map((cuisine, index) => (
                        <View key={index} style={styles.cuisineBadge}>
                          <Text style={styles.cuisineText}>{cuisine}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Icon name="chevron-right" size={24} color="#9ca3af" />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="restaurant-menu" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>No kitchens available</Text>
              </View>
            }
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  titleContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  kitchenCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  kitchenIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  kitchenInfo: {
    flex: 1,
  },
  kitchenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  kitchenName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tiffsyBadge: {
    backgroundColor: '#fef3c7',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369a1',
  },
  tiffsyBadgeText: {
    color: '#f59e0b',
  },
  kitchenCode: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  kitchenMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  cuisineContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  cuisineBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cuisineText: {
    fontSize: 11,
    color: '#374151',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
});

export default MenuManagementMain;
