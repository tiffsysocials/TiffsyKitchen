import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { GradientBox } from '../../../components/common/GradientBox';
import KitchenSelectionView from '../components/KitchenSelectionView';
import DeliveryActionsPanel from '../components/DeliveryActionsPanel';
import BatchStatsDashboard from '../components/BatchStatsDashboard';
import MealWindowSelector from '../components/MealWindowSelector';
import { BatchHistoryScreen } from '../../kitchens/screens/BatchHistoryScreen';

interface Props {
  onMenuPress: () => void;
}

const DeliveryManagementScreen: React.FC<Props> = ({ onMenuPress }) => {
  const queryClient = useQueryClient();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Kitchen state
  const [kitchenId, setKitchenId] = useState<string | null>(null);
  const [kitchenName, setKitchenName] = useState<string | null>(null);
  const [selectedKitchen, setSelectedKitchen] = useState<any>(null);

  // UI state
  const [selectedMealWindow, setSelectedMealWindow] = useState<'LUNCH' | 'DINNER'>('LUNCH');
  const [showBatchHistory, setShowBatchHistory] = useState(false);
  const [statsKey, setStatsKey] = useState(0);

  const isAdmin = userRole === 'ADMIN';

  // Load user role and kitchen info on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const role = await AsyncStorage.getItem('userRole');
        setUserRole(role);

        // Kitchen staff: auto-load their kitchen
        if (role === 'KITCHEN_STAFF') {
          const userData = await AsyncStorage.getItem('userData');
          if (userData) {
            const parsed = JSON.parse(userData);
            if (parsed.kitchenId) {
              setKitchenId(parsed.kitchenId);
              setKitchenName(parsed.kitchenName || 'My Kitchen');
            }
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUserData();
  }, []);

  const handleKitchenSelect = (kitchen: any) => {
    setKitchenId(kitchen._id);
    setKitchenName(kitchen.name);
    setSelectedKitchen(kitchen);
  };

  const handleBackToKitchenList = () => {
    setKitchenId(null);
    setKitchenName(null);
    setSelectedKitchen(null);
  };

  const handleActionsComplete = () => {
    // Invalidate stats queries to refresh dashboard
    queryClient.invalidateQueries({ queryKey: ['deliveryMgmt_batches'] });
    queryClient.invalidateQueries({ queryKey: ['deliveryMgmt_orders'] });
    queryClient.invalidateQueries({ queryKey: ['deliveryMgmt_stats'] });
    setStatsKey((prev) => prev + 1);
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FE8733" />
        </View>
      </SafeAreaScreen>
    );
  }

  // Batch history sub-screen
  if (showBatchHistory && kitchenId) {
    return (
      <BatchHistoryScreen
        kitchenId={kitchenId}
        kitchenName={kitchenName || undefined}
        isAdmin={isAdmin}
        onBack={() => setShowBatchHistory(false)}
      />
    );
  }

  // Admin: show kitchen selection if no kitchen selected
  if (isAdmin && !kitchenId) {
    return (
      <KitchenSelectionView
        onMenuPress={onMenuPress}
        onKitchenSelect={handleKitchenSelect}
      />
    );
  }

  // No kitchen available (shouldn't happen for kitchen staff)
  if (!kitchenId) {
    return (
      <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
        <View className="flex-1 justify-center items-center p-8">
          <Icon name="error-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-400 text-base mt-4 text-center">
            No kitchen assigned. Please contact admin.
          </Text>
        </View>
      </SafeAreaScreen>
    );
  }

  // Main operations view
  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
      {/* Header */}
      <GradientBox style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        {isAdmin ? (
          <TouchableOpacity onPress={handleBackToKitchenList} className="mr-4">
            <Icon name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onMenuPress} className="mr-4">
            <Icon name="menu" size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold" numberOfLines={1}>
            {kitchenName || 'Delivery Management'}
          </Text>
          <Text className="text-white/80 text-xs">Delivery Operations</Text>
        </View>
      </GradientBox>

      <ScrollView className="flex-1">
        {/* Meal Window Selector */}
        <View className="p-4 pb-2">
          <MealWindowSelector
            selected={selectedMealWindow}
            onSelect={(mw) => {
              if (mw) setSelectedMealWindow(mw);
            }}
            allowNull={false}
          />
        </View>

        {/* Actions Panel */}
        <DeliveryActionsPanel
          kitchenId={kitchenId}
          mealWindow={selectedMealWindow}
          isAdmin={isAdmin}
          operatingHours={selectedKitchen?.operatingHours}
          onActionsComplete={handleActionsComplete}
        />

        {/* Stats Dashboard */}
        <BatchStatsDashboard
          key={statsKey}
          kitchenId={kitchenId}
          mealWindow={selectedMealWindow}
          isAdmin={isAdmin}
          onViewHistory={() => setShowBatchHistory(true)}
        />
      </ScrollView>
    </SafeAreaScreen>
  );
};

export default DeliveryManagementScreen;
