import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import kitchenService from '../../../services/kitchen.service';
import { deliveryService } from '../../../services/delivery.service';
import { ordersService } from '../../../services/orders.service';
import { Kitchen, MealWindow, Order } from '../../../types/api.types';
import { BatchHistoryScreen } from './BatchHistoryScreen';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { GradientBox } from '../../../components/common/GradientBox';
import { useAlert } from '../../../hooks/useAlert';

interface BatchManagementLandingScreenProps {
  navigation?: any;
  onMenuPress?: () => void;
}

export const BatchManagementLandingScreen: React.FC<BatchManagementLandingScreenProps> = ({
  navigation,
  onMenuPress,
}) => {
  const { showError, showSuccess, showConfirm } = useAlert();
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [filteredKitchens, setFilteredKitchens] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKitchen, setSelectedKitchen] = useState<Kitchen | null>(null);
  const [selectedMealWindow, setSelectedMealWindow] = useState<MealWindow>('LUNCH');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [deliveryStats, setDeliveryStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showBatchHistory, setShowBatchHistory] = useState(false);
  const getTodayDateString = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  };
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadKitchens();
  }, []);

  // Refetch batches/stats when the date changes (only if a kitchen is selected)
  useEffect(() => {
    if (selectedKitchen) {
      loadBatchData(selectedKitchen._id);
      loadDeliveryStats(selectedKitchen._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Remove the meal window useEffect since we're loading all batches once
  // and filtering on the frontend

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredKitchens(kitchens);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredKitchens(
        kitchens.filter(
          (kitchen) =>
            kitchen.name.toLowerCase().includes(query) ||
            kitchen.code.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, kitchens]);

  const loadKitchens = async () => {
    setLoading(true);
    try {
      const response = await kitchenService.getKitchens({
        status: 'ACTIVE',
        limit: 100,
      });

      console.log('Kitchen Response - success:', response?.success);
      console.log('Kitchen Response - has message:', !!response?.message);
      console.log('Kitchen Response - has message.kitchens:', !!response?.message?.kitchens);
      console.log('Kitchen Response - message.kitchens length:', response?.message?.kitchens?.length);

      // Backend quirk: response structure is { success, message: { kitchens, pagination }, data, error }
      // Try multiple possible locations for kitchens data
      const kitchensData =
        response?.message?.kitchens || // Latest backend structure
        response?.kitchens ||          // Direct kitchens field
        response?.data?.kitchens ||    // Data wrapper
        [];

      console.log('Extracted kitchens count:', kitchensData.length);
      setKitchens(kitchensData);
      setFilteredKitchens(kitchensData);
    } catch (error) {
      console.error('Error loading kitchens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKitchenSelect = async (kitchen: Kitchen) => {
    if (navigation) {
      navigation.navigate('BatchManagement', {
        kitchenId: kitchen._id,
        kitchenName: kitchen.name,
      });
    } else {
      // Use internal state to show batch operations screen
      setSelectedKitchen(kitchen);
      // Load all data for this kitchen
      await Promise.all([
        loadKitchenOrders(kitchen._id),
        loadBatchData(kitchen._id), // Load all batches, filter on frontend
        loadDeliveryStats(kitchen._id),
      ]);
    }
  };

  const loadKitchenOrders = async (kitchenId: string) => {
    setLoadingOrders(true);
    try {
      const result = await ordersService.getOrders({
        kitchenId,
        limit: 100, // Get more orders to show
      });
      setOrders(result.orders);
    } catch (error) {
      console.error('Error loading kitchen orders:', error);
      showError('Error', 'Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadBatchData = async (kitchenId?: string, mealWindow?: MealWindow) => {
    setLoadingBatches(true);
    try {
      // Use the admin-picked date (defaults to today)
      const dayStart = new Date(`${selectedDate}T00:00:00`);
      const dayEnd = new Date(`${selectedDate}T23:59:59.999`);

      const params: any = {
        dateFrom: dayStart.toISOString(),
        dateTo: dayEnd.toISOString(),
        limit: 100,
      };

      if (kitchenId) params.kitchenId = kitchenId;
      // Don't filter by meal window in API - we'll filter on frontend to show all batches
      // This allows us to switch between LUNCH/DINNER without refetching

      console.log('===============================================');
      console.log('📊 [FRONTEND] LOADING BATCH DATA');
      console.log('===============================================');
      console.log('Request params:', JSON.stringify(params, null, 2));
      console.log('');

      const result = await deliveryService.getBatches(params);

      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('Batches count:', result.data?.batches?.length || 0);
      console.log('Batches array:', JSON.stringify(result.data?.batches || [], null, 2));
      console.log('');
      console.log('Breakdown by meal window:');
      const lunchBatches = (result.data?.batches || []).filter((b: any) => b.mealWindow === 'LUNCH');
      const dinnerBatches = (result.data?.batches || []).filter((b: any) => b.mealWindow === 'DINNER');
      console.log('  - LUNCH batches:', lunchBatches.length);
      console.log('  - DINNER batches:', dinnerBatches.length);
      console.log('');
      console.log('Breakdown by status (All batches):');
      const statusCounts: { [key: string]: number } = {};
      (result.data?.batches || []).forEach((b: any) => {
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
      });
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  - ${status}: ${count}`);
      });
      console.log('===============================================');
      console.log('');

      setBatches(result.data?.batches || []);
    } catch (error) {
      console.error('===============================================');
      console.error('❌ [FRONTEND] ERROR LOADING BATCH DATA');
      console.error('===============================================');
      console.error('Error:', error);
      console.error('===============================================');
    } finally {
      setLoadingBatches(false);
    }
  };

  const loadDeliveryStats = async (kitchenId?: string) => {
    setLoadingStats(true);
    try {
      // Use the admin-picked date (defaults to today)
      const dayStart = new Date(`${selectedDate}T00:00:00`);
      const dayEnd = new Date(`${selectedDate}T23:59:59.999`);

      const params: any = {
        dateFrom: dayStart.toISOString(),
        dateTo: dayEnd.toISOString(),
      };

      const result = await deliveryService.getDeliveryStats(params);
      setDeliveryStats(result.data || null);
    } catch (error) {
      console.error('Error loading delivery stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleBackToKitchenList = () => {
    setSelectedKitchen(null);
  };

  const getMealWindowEndTime = (mealWindow: MealWindow): { hours: number; minutes: number } | null => {
    if (!selectedKitchen?.operatingHours) return null;

    const endTime = mealWindow === 'LUNCH'
      ? selectedKitchen.operatingHours.lunch?.endTime
      : selectedKitchen.operatingHours.dinner?.endTime;

    if (!endTime) return null;

    const [hours, minutes] = endTime.split(':').map(Number);
    return { hours, minutes };
  };

  const canDispatchMealWindow = (mealWindow: MealWindow): boolean => {
    const endTime = getMealWindowEndTime(mealWindow);
    if (!endTime) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const endTimeInMinutes = endTime.hours * 60 + endTime.minutes;

    return currentTimeInMinutes >= endTimeInMinutes;
  };

  const getTimeUntilDispatch = (mealWindow: MealWindow): string => {
    const endTime = getMealWindowEndTime(mealWindow);
    if (!endTime) return 'N/A';

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const endTimeInMinutes = endTime.hours * 60 + endTime.minutes;

    if (currentTimeInMinutes >= endTimeInMinutes) {
      return 'Now';
    }

    const minutesLeft = endTimeInMinutes - currentTimeInMinutes;
    const hoursLeft = Math.floor(minutesLeft / 60);
    const minsLeft = minutesLeft % 60;

    if (hoursLeft > 0) {
      return `${hoursLeft}h ${minsLeft}m`;
    }
    return `${minsLeft}m`;
  };

  const getMealWindowEndTimeFormatted = (mealWindow: MealWindow): string => {
    const endTime = getMealWindowEndTime(mealWindow);
    if (!endTime) return 'N/A';

    const hours = endTime.hours;
    const minutes = endTime.minutes;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;

    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PLACED':
        return '#fee2e2'; // light red
      case 'ACCEPTED':
        return '#dbeafe'; // light blue
      case 'PREPARING':
        return '#fef3c7'; // light yellow
      case 'READY':
        return '#dcfce7'; // light green
      case 'PICKED_UP':
      case 'OUT_FOR_DELIVERY':
        return '#e0e7ff'; // light purple
      case 'DELIVERED':
        return '#d1fae5'; // light green
      case 'CANCELLED':
      case 'REJECTED':
        return '#fecaca'; // light red
      default:
        return '#f3f4f6'; // light gray
    }
  };

  const handleAutoBatch = async () => {
    if (!selectedKitchen) return;

    showConfirm(
      'Batch Orders',
      `Create batches for ${selectedMealWindow} from ${selectedKitchen.name}?`,
      async () => {
        setIsProcessing(true);
        try {
          const result = await deliveryService.autoBatchOrders({
            mealWindow: selectedMealWindow,
            kitchenId: selectedKitchen._id,
          });

          console.log('====== AUTO BATCH RESPONSE ======');
          console.log('Full Result:', JSON.stringify(result, null, 2));
          console.log('result.success:', result.success);
          console.log('result.data:', result.data);
          console.log('=================================');

          // Backend now consistently returns data in 'data' field
          const batchesCreated = result.data?.batchesCreated ?? 0;
          const batchesUpdated = result.data?.batchesUpdated ?? 0;
          const ordersProcessed = result.data?.ordersProcessed ?? 0;

          const message = batchesUpdated > 0
            ? `${batchesCreated} new batches created, ${batchesUpdated} batches updated with ${ordersProcessed} orders`
            : `${batchesCreated} batches created with ${ordersProcessed} orders`;

          showSuccess('Success', message);

          // Reload data to reflect changes
          if (selectedKitchen) {
            await Promise.all([
              loadKitchenOrders(selectedKitchen._id),
              loadBatchData(selectedKitchen._id), // Load all batches
              loadDeliveryStats(selectedKitchen._id),
            ]);
          }
        } catch (error: any) {
          console.error('====== AUTO BATCH ERROR ======');
          console.error('Error:', error);
          console.error('Error Response:', error.response);
          console.error('==============================');

          // Use consistent error message from response
          const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to create batches';
          showError('Error', errorMessage);
        } finally {
          setIsProcessing(false);
        }
      },
      undefined,
      { confirmText: 'Batch' }
    );
  };

  const handleDispatchBatches = async (forceDispatch: boolean = false) => {
    if (!forceDispatch && !canDispatchMealWindow(selectedMealWindow)) {
      const endTime = getMealWindowEndTimeFormatted(selectedMealWindow);
      showConfirm(
        'Cannot Dispatch Yet',
        `Batches can only be dispatched after ${endTime} (${selectedMealWindow.toLowerCase()} window end time).\nTime remaining: ${getTimeUntilDispatch(selectedMealWindow)}\n\nWould you like to force dispatch anyway?`,
        () => handleDispatchBatches(true),
        undefined,
        { confirmText: 'Force Dispatch', isDestructive: true }
      );
      return;
    }

    showConfirm(
      forceDispatch ? 'Force Dispatch Batches' : 'Dispatch Batches',
      `${forceDispatch ? 'Force dispatch' : 'Dispatch'} ${selectedMealWindow} batches to drivers?${forceDispatch ? '\n\nWarning: This will bypass the meal window time check.' : ''}`,
      async () => {
            setIsProcessing(true);

            // 🔍 FRONTEND LOGS - Before Dispatch API Call
            console.log('===============================================');
            console.log('🚀 [FRONTEND] DISPATCH BATCHES - START');
            console.log('===============================================');
            console.log('📋 Current State:');
            console.log('  - selectedMealWindow:', selectedMealWindow);
            console.log('  - forceDispatch:', forceDispatch);
            console.log('  - selectedKitchen:', selectedKitchen?._id, selectedKitchen?.name);
            console.log('');
            console.log('📦 Batches Array (Total):', batches.length);
            console.log('Full batches array:', JSON.stringify(batches, null, 2));
            console.log('');
            console.log('🔍 Filtered Batches by Meal Window:');
            const filteredByMealWindow = batches.filter(b => b.mealWindow === selectedMealWindow);
            console.log(`  - ${selectedMealWindow} batches:`, filteredByMealWindow.length);
            console.log('  - Batch IDs:', filteredByMealWindow.map(b => b.batchNumber || b._id));
            console.log('  - Full filtered batches:', JSON.stringify(filteredByMealWindow, null, 2));
            console.log('');
            console.log('🎯 Batches with COLLECTING Status:');
            const collectingBatches = filteredByMealWindow.filter(b => b.status === 'COLLECTING');
            console.log(`  - Count:`, collectingBatches.length);
            console.log('  - Batch IDs:', collectingBatches.map(b => b.batchNumber || b._id));
            console.log('  - Full collecting batches:', JSON.stringify(collectingBatches, null, 2));
            console.log('');
            console.log('🎯 Batches with READY_FOR_DISPATCH Status:');
            const readyBatches = filteredByMealWindow.filter(b => b.status === 'READY_FOR_DISPATCH');
            console.log(`  - Count:`, readyBatches.length);
            console.log('  - Batch IDs:', readyBatches.map(b => b.batchNumber || b._id));
            console.log('  - Full ready batches:', JSON.stringify(readyBatches, null, 2));
            console.log('');
            console.log('📤 API Request Payload:');
            const requestPayload = {
              mealWindow: selectedMealWindow,
              kitchenId: selectedKitchen?._id,
              forceDispatch,
            };
            console.log(JSON.stringify(requestPayload, null, 2));
            console.log('===============================================');
            console.log('');

            try {
              const result = await deliveryService.dispatchBatches({
                mealWindow: selectedMealWindow,
                kitchenId: selectedKitchen!._id,
                forceDispatch,
              });

              console.log('===============================================');
              console.log('✅ [FRONTEND] DISPATCH RESPONSE - SUCCESS');
              console.log('===============================================');
              console.log('Full Result:', JSON.stringify(result, null, 2));
              console.log('result.success:', result.success);
              console.log('result.message:', result.message);
              console.log('result.data:', result.data);
              console.log('result.data.batchesDispatched:', result.data?.batchesDispatched);
              console.log('result.data.batches:', result.data?.batches);
              console.log('===============================================');

              // Backend now consistently returns data in 'data' field
              const batchesDispatched = result.data?.batchesDispatched ?? 0;

              console.log('');
              console.log('🔄 Reloading data after dispatch...');
              console.log('');

              // Reload data to reflect changes
              if (selectedKitchen) {
                await Promise.all([
                  loadKitchenOrders(selectedKitchen._id),
                  loadBatchData(selectedKitchen._id),
                  loadDeliveryStats(selectedKitchen._id),
                ]);
                console.log('✅ Data reloaded successfully');
              }

              showSuccess(
                'Success',
                `${batchesDispatched} batches dispatched to drivers`
              );
            } catch (error: any) {
              console.error('===============================================');
              console.error('❌ [FRONTEND] DISPATCH ERROR');
              console.error('===============================================');
              console.error('Error Object:', error);
              console.error('Error Message:', error.message);
              console.error('Error Status:', error.status);
              console.error('Error Response:', error.response);
              console.error('Error Response Data:', error.response?.data);
              console.error('Error Response Status:', error.response?.status);
              console.error('Full Error JSON:', JSON.stringify(error, null, 2));
              console.error('===============================================');

              // Use consistent error message from response
              const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to dispatch batches';

              // Check if this is a timing error that can be force-dispatched
              if (error.status === 400 && errorMessage.includes('Meal window ends in') && errorMessage.includes('forceDispatch')) {
                showConfirm(
                  'Cannot Dispatch Yet',
                  errorMessage,
                  () => handleDispatchBatches(true),
                  undefined,
                  { confirmText: 'Force Dispatch', isDestructive: true }
                );
              } else {
                showError('Error', errorMessage);
              }
            } finally {
              setIsProcessing(false);
            }
          },
      undefined,
      { confirmText: 'Dispatch', isDestructive: forceDispatch }
    );
  };

  // Show batch history screen
  if (showBatchHistory && selectedKitchen) {
    return (
      <BatchHistoryScreen
        kitchenId={selectedKitchen._id}
        kitchenName={selectedKitchen.name}
        onBack={() => setShowBatchHistory(false)}
      />
    );
  }

  // Show batch operations screen when a kitchen is selected
  if (selectedKitchen) {
    const formatDateLabel = (d: string) => {
      const today = getTodayDateString();
      if (d === today) return 'Today';
      const dt = new Date(`${d}T00:00:00`);
      return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    return (
      <SafeAreaScreen style={{ flex: 1 }} backgroundColor={colors.primary}>
        <GradientBox style={styles.header}>
          <TouchableOpacity onPress={handleBackToKitchenList}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.headerTitle}>{selectedKitchen.name}</Text>
            <Text style={styles.headerSubtitle}>Batch Operations</Text>
          </View>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={dateChipStyles.chip}>
            <Icon name="calendar" size={16} color="#fff" />
            <Text style={dateChipStyles.chipText}>{formatDateLabel(selectedDate)}</Text>
          </TouchableOpacity>
        </GradientBox>

        {/* Date picker modal */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            style={dateChipStyles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={dateChipStyles.modalContent}>
              <View style={dateChipStyles.modalHeader}>
                <Text style={dateChipStyles.modalTitle}>Select Date</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedDate(getTodayDateString());
                      setShowDatePicker(false);
                    }}
                    style={dateChipStyles.todayButton}
                  >
                    <Text style={dateChipStyles.todayButtonText}>Today</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Icon name="close" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
              <Calendar
                onDayPress={(day) => {
                  setSelectedDate(day.dateString);
                  setShowDatePicker(false);
                }}
                markedDates={{
                  [selectedDate]: { selected: true, selectedColor: colors.primary },
                }}
                theme={{
                  todayTextColor: colors.primary,
                  selectedDayBackgroundColor: colors.primary,
                  arrowColor: colors.primary,
                }}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        <ScrollView style={[styles.content, { backgroundColor: colors.background }]}>
          {/* Meal Window Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Meal Window</Text>
            <View style={styles.mealWindowContainer}>
              <TouchableOpacity
                style={[
                  styles.mealWindowButton,
                  selectedMealWindow === 'LUNCH' && styles.mealWindowButtonActive,
                ]}
                onPress={() => setSelectedMealWindow('LUNCH')}
              >
                <Icon
                  name="white-balance-sunny"
                  size={24}
                  color={selectedMealWindow === 'LUNCH' ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.mealWindowText,
                    selectedMealWindow === 'LUNCH' && styles.mealWindowTextActive,
                  ]}
                >
                  Lunch
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mealWindowButton,
                  selectedMealWindow === 'DINNER' && styles.mealWindowButtonActive,
                ]}
                onPress={() => setSelectedMealWindow('DINNER')}
              >
                <Icon
                  name="moon-waning-crescent"
                  size={24}
                  color={selectedMealWindow === 'DINNER' ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.mealWindowText,
                    selectedMealWindow === 'DINNER' && styles.mealWindowTextActive,
                  ]}
                >
                  Dinner
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Batch Operations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Batch Operations</Text>

            <TouchableOpacity
              style={[styles.operationButton, isProcessing && styles.operationButtonDisabled]}
              onPress={handleAutoBatch}
              disabled={isProcessing}
            >
              <Icon name="cog" size={20} color={colors.primary} />
              <Text style={styles.operationButtonText}>Batch Orders</Text>
              <Icon name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.operationButton,
                (isProcessing || !canDispatchMealWindow(selectedMealWindow)) &&
                styles.operationButtonDisabled,
              ]}
              onPress={() => handleDispatchBatches(false)}
              disabled={isProcessing || !canDispatchMealWindow(selectedMealWindow)}
            >
              <Icon name="truck-fast" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.operationButtonText}>Dispatch to Drivers</Text>
                {!canDispatchMealWindow(selectedMealWindow) && (
                  <Text style={styles.operationButtonSubtext}>
                    Available in {getTimeUntilDispatch(selectedMealWindow)}
                  </Text>
                )}
              </View>
              <Icon name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoCard}>
            <Icon name="information" size={20} color={colors.info || '#3b82f6'} />
            <Text style={styles.infoText}>
              Dispatch is only available after meal window end time:{'\n'}
              • Lunch: After {getMealWindowEndTimeFormatted('LUNCH')}{'\n'}
              • Dinner: After {getMealWindowEndTimeFormatted('DINNER')}
            </Text>
          </View>

          {/* Comprehensive Statistics Dashboard */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedMealWindow} Statistics
            </Text>

            {(loadingOrders || loadingBatches || loadingStats) ? (
              <View style={styles.ordersLoadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.ordersLoadingText}>Loading statistics...</Text>
              </View>
            ) : (
              <View style={styles.statsContainer}>
                {/* Row 1: Available for Operations */}
                <View style={styles.statsRow}>
                  {/* Orders Available for Batching */}
                  <View style={[styles.statCard, styles.statCardSmall]}>
                    <View style={[styles.statIconContainer, { backgroundColor: '#fff5f0' }]}>
                      <Icon name="package-variant-closed" size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.statValue}>
                      {orders.filter(o =>
                        o.mealWindow === selectedMealWindow &&
                        ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status) &&
                        !o.batchId
                      ).length}
                    </Text>
                    <Text style={styles.statLabel}>Available{'\n'}for Batching</Text>
                  </View>

                  {/* Batches Ready for Dispatch */}
                  <View style={[styles.statCard, styles.statCardSmall]}>
                    <View style={[styles.statIconContainer, { backgroundColor: '#f0f9ff' }]}>
                      <Icon name="truck-fast" size={24} color="#3b82f6" />
                    </View>
                    <Text style={styles.statValue}>
                      {batches.filter(b =>
                        b.mealWindow === selectedMealWindow &&
                        b.status === 'COLLECTING'
                      ).length}
                    </Text>
                    <Text style={styles.statLabel}>Ready to{'\n'}Dispatch</Text>
                    {!canDispatchMealWindow(selectedMealWindow) && (
                      <Text style={styles.statSubtext}>
                        in {getTimeUntilDispatch(selectedMealWindow)}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Row 2: All Batches History */}
                <View style={styles.statsFullCard}>
                  <View style={styles.statsFullCardHeader}>
                    <Icon name="history" size={20} color={colors.textPrimary} />
                    <Text style={styles.statsFullCardTitle}>
                      {selectedMealWindow} Batches (Today)
                    </Text>
                  </View>
                  <View style={styles.statsGrid}>
                    <View style={styles.statsGridItem}>
                      <View style={[styles.statusDot, { backgroundColor: '#fef3c7' }]} />
                      <Text style={styles.statsGridLabel}>Collecting</Text>
                      <Text style={styles.statsGridValue}>
                        {batches.filter(b =>
                          b.status === 'COLLECTING' &&
                          b.mealWindow === selectedMealWindow
                        ).length}
                      </Text>
                    </View>
                    <View style={styles.statsGridItem}>
                      <View style={[styles.statusDot, { backgroundColor: '#dcfce7' }]} />
                      <Text style={styles.statsGridLabel}>Ready</Text>
                      <Text style={styles.statsGridValue}>
                        {batches.filter(b =>
                          b.status === 'READY_FOR_DISPATCH' &&
                          b.mealWindow === selectedMealWindow
                        ).length}
                      </Text>
                    </View>
                    <View style={styles.statsGridItem}>
                      <View style={[styles.statusDot, { backgroundColor: '#dbeafe' }]} />
                      <Text style={styles.statsGridLabel}>Dispatched</Text>
                      <Text style={styles.statsGridValue}>
                        {batches.filter(b =>
                          b.status === 'DISPATCHED' &&
                          b.mealWindow === selectedMealWindow
                        ).length}
                      </Text>
                    </View>
                    <View style={styles.statsGridItem}>
                      <View style={[styles.statusDot, { backgroundColor: '#e0e7ff' }]} />
                      <Text style={styles.statsGridLabel}>In Progress</Text>
                      <Text style={styles.statsGridValue}>
                        {batches.filter(b =>
                          b.status === 'IN_PROGRESS' &&
                          b.mealWindow === selectedMealWindow
                        ).length}
                      </Text>
                    </View>
                    <View style={styles.statsGridItem}>
                      <View style={[styles.statusDot, { backgroundColor: '#d1fae5' }]} />
                      <Text style={styles.statsGridLabel}>Completed</Text>
                      <Text style={styles.statsGridValue}>
                        {batches.filter(b =>
                          b.status === 'COMPLETED' &&
                          b.mealWindow === selectedMealWindow
                        ).length}
                      </Text>
                    </View>
                    <View style={styles.statsGridItem}>
                      <View style={[styles.statusDot, { backgroundColor: '#fed7aa' }]} />
                      <Text style={styles.statsGridLabel}>Partial</Text>
                      <Text style={styles.statsGridValue}>
                        {batches.filter(b =>
                          b.status === 'PARTIAL_COMPLETE' &&
                          b.mealWindow === selectedMealWindow
                        ).length}
                      </Text>
                    </View>
                    <View style={styles.statsGridItem}>
                      <View style={[styles.statusDot, { backgroundColor: '#fecaca' }]} />
                      <Text style={styles.statsGridLabel}>Cancelled</Text>
                      <Text style={styles.statsGridValue}>
                        {batches.filter(b =>
                          b.status === 'CANCELLED' &&
                          b.mealWindow === selectedMealWindow
                        ).length}
                      </Text>
                    </View>
                    <View style={styles.statsGridItem}>
                      <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
                      <Text style={styles.statsGridLabel}>Total</Text>
                      <Text style={[styles.statsGridValue, { fontWeight: '700' }]}>
                        {batches.filter(b => b.mealWindow === selectedMealWindow).length}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Row 3: Delivery Performance */}
                {deliveryStats && (
                  <View style={styles.statsFullCard}>
                    <View style={styles.statsFullCardHeader}>
                      <Icon name="chart-line" size={20} color={colors.textPrimary} />
                      <Text style={styles.statsFullCardTitle}>Delivery Performance (Today)</Text>
                    </View>
                    <View style={styles.performanceGrid}>
                      <View style={styles.performanceItem}>
                        <Icon name="package-variant" size={28} color="#6366f1" />
                        <Text style={styles.performanceValue}>
                          {deliveryStats.totalOrders || 0}
                        </Text>
                        <Text style={styles.performanceLabel}>Total Orders</Text>
                      </View>
                      <View style={styles.performanceItem}>
                        <Icon name="check-circle" size={28} color="#10b981" />
                        <Text style={styles.performanceValue}>
                          {deliveryStats.successfulDeliveries || 0}
                        </Text>
                        <Text style={styles.performanceLabel}>Delivered</Text>
                      </View>
                      <View style={styles.performanceItem}>
                        <Icon name="close-circle" size={28} color="#ef4444" />
                        <Text style={styles.performanceValue}>
                          {deliveryStats.failedDeliveries || 0}
                        </Text>
                        <Text style={styles.performanceLabel}>Failed</Text>
                      </View>
                      <View style={styles.performanceItem}>
                        <Icon name="percent" size={28} color={colors.primary} />
                        <Text style={styles.performanceValue}>
                          {Math.round(deliveryStats.successRate || 0)}%
                        </Text>
                        <Text style={styles.performanceLabel}>Success Rate</Text>
                      </View>
                    </View>
                    <View style={styles.performanceMetric}>
                      <Icon name="truck-delivery" size={18} color={colors.textSecondary} />
                      <Text style={styles.performanceMetricText}>
                        Avg {(deliveryStats.avgDeliveriesPerBatch || 0).toFixed(1)} orders per batch
                      </Text>
                    </View>
                  </View>
                )}

                {/* Row 4: Quick Actions */}
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => setShowBatchHistory(true)}
                >
                  <Icon name="view-list" size={20} color={colors.primary} />
                  <Text style={styles.viewAllButtonText}>View Detailed Batch History</Text>
                  <Icon name="chevron-right" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {isProcessing && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaScreen>
    );
  }

  if (loading) {
    return (
      <SafeAreaScreen style={{ flex: 1 }} topBackgroundColor={colors.primary} bottomBackgroundColor={colors.background}>
        <GradientBox style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (navigation) {
              navigation.goBack();
            } else if (onMenuPress) {
              onMenuPress();
            }
          }}>
            <Icon name={onMenuPress ? "menu" : "arrow-left"} size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { marginLeft: spacing.md, flex: 1, textAlign: 'left' }]}>Batch Management</Text>
        </GradientBox>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading kitchens...</Text>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen style={{ flex: 1 }} topBackgroundColor={colors.primary} bottomBackgroundColor={colors.background}>
      <GradientBox style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (navigation) {
            navigation.goBack();
          } else if (onMenuPress) {
            onMenuPress();
          }
        }}>
          <Icon name={onMenuPress ? "menu" : "arrow-left"} size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { marginLeft: spacing.md, flex: 1, textAlign: 'left' }]}>Batch Management</Text>
      </GradientBox>

      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <View style={styles.introSection}>
          <Icon name="truck-delivery" size={48} color={colors.primary} />
          <Text style={styles.introTitle}>Select a Kitchen</Text>
          <Text style={styles.introText}>
            Choose a kitchen to manage delivery batches, create new batches, and dispatch
            orders to drivers.
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by kitchen name or code..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>
          Active Kitchens ({filteredKitchens.length})
        </Text>

        <ScrollView style={styles.kitchensList}>
          {filteredKitchens.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="store-off" size={64} color={colors.textMuted} />
              <Text style={styles.emptyStateText}>No kitchens found</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery ? 'Try a different search term' : 'No active kitchens available'}
              </Text>
            </View>
          ) : (
            filteredKitchens.map((kitchen) => (
              <TouchableOpacity
                key={kitchen._id}
                style={styles.kitchenCard}
                onPress={() => handleKitchenSelect(kitchen)}
              >
                <View style={styles.kitchenIcon}>
                  <Icon name="silverware-fork-knife" size={24} color={colors.primary} />
                </View>
                <View style={styles.kitchenInfo}>
                  <Text style={styles.kitchenName}>{kitchen.name}</Text>
                  <Text style={styles.kitchenCode}>{kitchen.code}</Text>
                  <View style={styles.kitchenMeta}>
                    <View style={styles.kitchenBadge}>
                      <Text style={styles.kitchenBadgeText}>{kitchen.type}</Text>
                    </View>
                    {kitchen.isAcceptingOrders && (
                      <View style={[styles.kitchenBadge, styles.acceptingBadge]}>
                        <Icon name="check-circle" size={12} color={colors.success} />
                        <Text style={[styles.kitchenBadgeText, { color: colors.success }]}>
                          Accepting Orders
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Icon name="chevron-right" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

      </View>
    </SafeAreaScreen >
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
  content: {
    flex: 1,
    padding: spacing.md,
  },
  introSection: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    marginBottom: spacing.lg,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  introText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    padding: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  kitchensList: {
    flex: 1,
  },
  kitchenCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: spacing.borderRadiusLg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  kitchenIcon: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadiusMd,
    backgroundColor: colors.primaryLight || '#fff5f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  kitchenInfo: {
    flex: 1,
  },
  kitchenName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  kitchenCode: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  kitchenMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  kitchenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.background,
    gap: 4,
  },
  acceptingBadge: {
    backgroundColor: colors.successLight || '#dcfce7',
  },
  kitchenBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
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
  section: {
    marginBottom: spacing.lg,
  },
  mealWindowContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  mealWindowButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    borderWidth: 2,
    borderColor: colors.border,
  },
  mealWindowButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight || '#fff5f0',
  },
  mealWindowText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  mealWindowTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  operationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  operationButtonDisabled: {
    opacity: 0.5,
  },
  operationButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  operationButtonSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.infoLight || '#dbeafe',
    padding: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    marginTop: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  ordersLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  ordersLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryContainer: {
    gap: spacing.md,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: spacing.borderRadiusMd,
    backgroundColor: colors.primaryLight || '#fff5f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  summarySubtext: {
    fontSize: 11,
    color: colors.textMuted,
  },
  statsContainer: {
    gap: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statCardSmall: {
    flex: 1,
    padding: spacing.md,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: spacing.borderRadiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
  statSubtext: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  statsFullCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statsFullCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsFullCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statsGridItem: {
    width: '23%',
    alignItems: 'center',
    padding: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  statsGridLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  statsGridValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  performanceItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  performanceLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  performanceMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  performanceMetricText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  viewAllButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
});

const dateChipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  chipText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  todayButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FE8733',
    borderRadius: 6,
  },
  todayButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
});
