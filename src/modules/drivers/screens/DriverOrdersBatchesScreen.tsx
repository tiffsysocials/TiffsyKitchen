import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { useAlert } from '../../../hooks/useAlert';
import { Header } from '../../../components/common/Header';
import { colors } from '../../../theme/colors';
import { orderBatchService } from '../../../services/order-batch.service';
import { apiService } from '../../../services/api.enhanced.service';
import { authService } from '../../../services/auth.service';

type BatchStatus =
  | 'ALL'
  | 'COLLECTING'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

interface Order {
  _id: string;
  orderNumber: string;
  userId: { name: string; phone: string };
  kitchenId: { name: string };
  zoneId: { name: string };
  driverId?: { name: string; phone: string };
  status: string;
  paymentStatus: string;
  grandTotal: number;
  placedAt: string;
  deliveryAddress: { area: string; street: string };
}

interface Batch {
  _id: string;
  batchNumber: string;
  kitchenId: { name: string };
  zoneId: { name: string; code: string };
  driverId?: { name: string; phone: string };
  mealWindow: 'LUNCH' | 'DINNER';
  status: string;
  orderCount: number;
  totalDelivered: number;
  totalFailed: number;
  createdAt: string;
  orders?: Order[];
}

interface DriverOrdersBatchesScreenProps {
  onMenuPress?: () => void;
}

export const DriverOrdersBatchesScreen: React.FC<DriverOrdersBatchesScreenProps> = ({ onMenuPress }) => {
  const { showSuccess, showError, showWarning, showConfirm } = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Batches state
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchStatus, setBatchStatus] = useState<BatchStatus>('ALL');
  const [batchesPage, setBatchesPage] = useState(1);
  const [batchesTotalPages, setBatchesTotalPages] = useState(1);
  const [expandedBatchIds, setExpandedBatchIds] = useState<Set<string>>(new Set());
  const [loadingBatchIds, setLoadingBatchIds] = useState<Set<string>>(new Set());

  // Reassignment & Cancellation state
  const [selectedBatchForAction, setSelectedBatchForAction] = useState<Batch | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Driver selection state
  const [reassignStep, setReassignStep] = useState<1 | 2>(1); // 1: Select Driver, 2: Confirm
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  useEffect(() => {
    loadData();
  }, [batchStatus]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await loadBatches();
    } catch (error: any) {
      console.error('Failed to load data:', error);

      // Check if session expired
      if (error?.message?.includes('session has expired') || error?.message?.includes('Please log in again')) {
        showConfirm(
          'Session Expired',
          'Your session has expired. Please close the app and log in again.',
          async () => {
            // Clear session data to force redirect to login
            await authService.clearAdminData();
            // Note: User needs to close and reopen app or navigate back to trigger auth check
          },
          undefined,
          { confirmText: 'Log Out', cancelText: 'Cancel' }
        );
      } else {
        showError('Error', 'Failed to load data. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadBatches = async () => {
    try {
      const filters: any = {
        page: batchesPage,
        limit: 20,
      };

      if (batchStatus !== 'ALL') {
        filters.status = batchStatus;
      }

      const response = await orderBatchService.getAllBatches(filters);

      if (response.success && response.data) {
        setBatches(response.data.batches || []);
        setBatchesTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (error: any) {
      console.error('Failed to load batches:', error);
      throw error;
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Clear expanded batches on refresh to prevent "No orders" flash
    setExpandedBatchIds(new Set());
    setLoadingBatchIds(new Set());
    loadData();
  }, [batchStatus]);

  const toggleBatchExpansion = async (batchId: string) => {
    const isExpanded = expandedBatchIds.has(batchId);

    if (isExpanded) {
      // Collapse the batch
      const newExpanded = new Set(expandedBatchIds);
      newExpanded.delete(batchId);
      setExpandedBatchIds(newExpanded);
    } else {
      // Expand the batch and load its orders
      const batch = batches.find(b => b._id === batchId);

      // If orders already loaded, just expand
      if (batch?.orders && batch.orders.length > 0) {
        const newExpanded = new Set(expandedBatchIds);
        newExpanded.add(batchId);
        setExpandedBatchIds(newExpanded);
        return;
      }

      // Load batch details with orders
      setLoadingBatchIds(prev => new Set(prev).add(batchId));

      try {
        const response = await orderBatchService.getBatchDetails(batchId);

        console.log('🔍 Batch details response:', {
          success: response.success,
          ordersCount: response.data?.orders?.length || 0,
          firstOrder: response.data?.orders?.[0],
        });

        if (response.success && response.data) {
          // Update the batch with orders
          setBatches(prevBatches =>
            prevBatches.map(b =>
              b._id === batchId
                ? { ...b, orders: response.data.orders || [] }
                : b
            )
          );

          // Expand the batch
          const newExpanded = new Set(expandedBatchIds);
          newExpanded.add(batchId);
          setExpandedBatchIds(newExpanded);
        }
      } catch (error: any) {
        console.error('❌ Failed to load batch details:', error);
        showError('Error', 'Failed to load batch orders. Please try again.');
      } finally {
        setLoadingBatchIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(batchId);
          return newSet;
        });
      }
    }
  };

  // Handler to open reassignment modal
  const handleReassignBatch = async (batch: Batch) => {
    setSelectedBatchForAction(batch);
    setReassignStep(1);
    setSelectedDriverId(null);
    setAvailableDrivers([]);
    setShowReassignModal(true);

    // Immediately fetch available drivers
    const zoneId = batch.zoneId
      ? (typeof batch.zoneId === 'string' ? batch.zoneId : (batch.zoneId as any)._id)
      : undefined;
    if (zoneId) {
      await fetchAvailableDrivers(zoneId);
    }
  };

  // Fetch available drivers for reassignment
  const fetchAvailableDrivers = async (zoneId: string) => {
    setLoadingDrivers(true);
    try {
      // Using the admin-drivers service to get approved drivers
      // In production, you would filter by zone and check capacity
      const response = await apiService.get<any>('/api/admin/users?role=DRIVER&approvalStatus=APPROVED&status=ACTIVE');

      if (response.success && response.data?.users) {
        const drivers = response.data.users;

        // Get current driver ID to exclude from the list
        const currentDriverId = selectedBatchForAction?.driverId
          ? (typeof selectedBatchForAction.driverId === 'string'
              ? selectedBatchForAction.driverId
              : (selectedBatchForAction.driverId as any)._id)
          : null;

        // Filter drivers who serve this zone and exclude the current driver
        const filteredDrivers = drivers.filter((driver: any) => {
          // Exclude the currently assigned driver
          if (currentDriverId && driver._id === currentDriverId) {
            return false;
          }
          // If driver has zonesServed array, check if it includes this zone
          if (driver.zonesServed && Array.isArray(driver.zonesServed)) {
            return driver.zonesServed.some((zone: any) =>
              typeof zone === 'string' ? zone === zoneId : zone._id === zoneId
            );
          }
          // If no zone filtering is available, show all approved active drivers
          return true;
        });

        setAvailableDrivers(filteredDrivers);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch available drivers:', error);
      showError('Error', 'Failed to load available drivers. Please try again.');
      setAvailableDrivers([]);
    } finally {
      setLoadingDrivers(false);
    }
  };

  // Handler to open cancellation dialog
  const handleCancelBatch = (batch: Batch) => {
    setSelectedBatchForAction(batch);
    setShowCancelDialog(true);
  };

  // Handle step navigation in reassignment flow
  const handleReassignNext = async () => {
    if (reassignStep === 1) {
      // Validate driver selection and move to confirmation
      if (!selectedDriverId) {
        showWarning('Validation Error', 'Please select a driver');
        return;
      }
      setReassignStep(2);
    }
  };

  const handleReassignBack = () => {
    if (reassignStep > 1) {
      setReassignStep((prev) => (prev - 1) as 1 | 2);
    }
  };

  // Submit final reassignment
  const submitReassignment = async () => {
    if (!selectedBatchForAction || !selectedDriverId) {
      showError('Error', 'Missing required information');
      return;
    }

    showConfirm(
      'Confirm Reassignment',
      `Reassign ${selectedBatchForAction.batchNumber} to the selected driver?\n\nThis will:\n- Remove current driver assignment\n- Assign batch to new driver\n- Notify both drivers`,
      async () => {
        setIsProcessing(true);
        try {
          const response = await orderBatchService.reassignBatch(
            selectedBatchForAction._id,
            selectedDriverId,
            'Admin reassignment'
          );

          if (response.success) {
            showSuccess(
              'Success',
              `Batch ${selectedBatchForAction.batchNumber} reassigned successfully`
            );
            setShowReassignModal(false);
            setSelectedBatchForAction(null);
            setSelectedDriverId(null);
            setReassignStep(1);
            loadBatches(); // Refresh data
          }
        } catch (error: any) {
          console.error('❌ Reassignment error:', error);
          showError('Error', error.message || 'Failed to reassign batch');
        } finally {
          setIsProcessing(false);
        }
      },
      undefined,
      { confirmText: 'Confirm', cancelText: 'Cancel' }
    );
  };

  // Submit cancellation
  const submitCancellation = async () => {
    if (!selectedBatchForAction) {
      showError('Error', 'No batch selected');
      return;
    }

    showConfirm(
      'Confirm Cancellation',
      `Cancel batch ${selectedBatchForAction.batchNumber}?\n\nThis will:\n- Cancel all ${selectedBatchForAction.orderCount} orders in this batch\n- Remove driver assignment\n- Notify driver and customers`,
      async () => {
        setIsProcessing(true);
        try {
          const response = await orderBatchService.cancelBatch(
            selectedBatchForAction._id,
            'Admin cancellation'
          );

          if (response.success) {
            showSuccess('Success', `Batch ${selectedBatchForAction.batchNumber} cancelled successfully`);
            setShowCancelDialog(false);
            setSelectedBatchForAction(null);
            loadBatches(); // Refresh data
          }
        } catch (error: any) {
          showError('Error', error.message || 'Failed to cancel batch');
        } finally {
          setIsProcessing(false);
        }
      },
      undefined,
      { confirmText: 'Confirm Cancel', cancelText: 'Go Back', isDestructive: true }
    );
  };

  // Get urgency indicator for unassigned batches
  const getUrgencyIndicator = (batch: Batch) => {
    // Only show urgency for unassigned batches
    if (batch.driverId || batch.status !== 'READY_FOR_DISPATCH') {
      return null;
    }

    const createdAt = new Date(batch.createdAt);
    const now = new Date();
    const minutesWaiting = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));

    if (minutesWaiting < 10) {
      return { color: colors.success, label: 'New', pulse: false };
    } else if (minutesWaiting < 30) {
      return { color: colors.warning, label: `${minutesWaiting}m`, pulse: false };
    } else {
      return { color: colors.error, label: `${minutesWaiting}m URGENT`, pulse: true };
    }
  };

  const renderOrderInBatch = (order: Order) => {
    // Debug: Log the order structure
    console.log('📦 Order data:', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      deliveryAddress: order.deliveryAddress,
      zoneId: order.zoneId,
      grandTotal: order.grandTotal,
      paymentStatus: order.paymentStatus,
      status: order.status,
    });
    console.log('📦 Full order object:', order);

    // Helper to safely get user name
    const getUserName = () => {
      // Try userId first (if populated)
      if (order.userId && typeof order.userId === 'object' && order.userId.name) {
        return order.userId.name;
      }
      // Fall back to contactName from deliveryAddress
      if (order.deliveryAddress && typeof order.deliveryAddress === 'object') {
        const addr = order.deliveryAddress as any;
        if (addr.contactName) return addr.contactName;
      }
      return 'Unknown';
    };

    // Helper to safely get user phone
    const getUserPhone = () => {
      // Try userId first (if populated)
      if (order.userId && typeof order.userId === 'object' && order.userId.phone) {
        return order.userId.phone;
      }
      // Fall back to contactPhone from deliveryAddress
      if (order.deliveryAddress && typeof order.deliveryAddress === 'object') {
        const addr = order.deliveryAddress as any;
        if (addr.contactPhone) return addr.contactPhone;
      }
      return 'N/A';
    };

    // Helper to safely get delivery address
    const getDeliveryAddress = () => {
      if (order.deliveryAddress && typeof order.deliveryAddress === 'object') {
        const addr = order.deliveryAddress as any;
        const parts = [];

        // Use the actual field names from the API
        if (addr.addressLine1) parts.push(addr.addressLine1);
        if (addr.addressLine2) parts.push(addr.addressLine2);
        if (addr.locality) parts.push(addr.locality);
        if (addr.city) parts.push(addr.city);

        // Add zone if available
        if (order.zoneId && typeof order.zoneId === 'object' && order.zoneId.name) {
          parts.push(order.zoneId.name);
        }

        return parts.length > 0 ? parts.join(', ') : 'N/A';
      }
      return 'N/A';
    };

    // Helper to get order total from various possible locations
    const getOrderTotal = () => {
      const orderAny = order as any;

      console.log('💰 Searching for order total with all charges:', {
        hasGrandTotal: !!order.grandTotal,
        grandTotalValue: order.grandTotal,
        hasTotal: !!orderAny.total,
        totalValue: orderAny.total,
        hasFinalAmount: !!orderAny.finalAmount,
        finalAmountValue: orderAny.finalAmount,
        hasTotalWithCharges: !!orderAny.totalWithCharges,
        totalWithChargesValue: orderAny.totalWithCharges,
        hasPricing: !!orderAny.pricing,
        pricingObject: orderAny.pricing,
        hasBillDetails: !!orderAny.billDetails,
        billDetailsObject: orderAny.billDetails,
        hasPayment: !!orderAny.payment,
        paymentObject: orderAny.payment,
        hasBilling: !!orderAny.billing,
        billingObject: orderAny.billing,
        hasItems: !!orderAny.items,
        fullOrder: orderAny,
      });

      // Priority 1: Try direct grand total fields (includes taxes, delivery, etc.)
      if (order.grandTotal) return order.grandTotal;
      if (orderAny.finalAmount) return orderAny.finalAmount;
      if (orderAny.totalWithCharges) return orderAny.totalWithCharges;
      if (orderAny.payableAmount) return orderAny.payableAmount;
      if (orderAny.total) return orderAny.total;
      if (orderAny.totalAmount) return orderAny.totalAmount;
      if (orderAny.amount) return orderAny.amount;

      // Priority 2: Try nested pricing/billing objects
      if (orderAny.pricing?.grandTotal) return orderAny.pricing.grandTotal;
      if (orderAny.pricing?.finalAmount) return orderAny.pricing.finalAmount;
      if (orderAny.pricing?.total) return orderAny.pricing.total;
      if (orderAny.billDetails?.grandTotal) return orderAny.billDetails.grandTotal;
      if (orderAny.billDetails?.finalAmount) return orderAny.billDetails.finalAmount;
      if (orderAny.billDetails?.total) return orderAny.billDetails.total;
      if (orderAny.payment?.amount) return orderAny.payment.amount;
      if (orderAny.bill?.grandTotal) return orderAny.bill.grandTotal;
      if (orderAny.bill?.total) return orderAny.bill.total;

      // Priority 3: Calculate from billing breakdown if available
      if (orderAny.billing) {
        const billing = orderAny.billing;
        const subtotal = billing.subtotal || billing.itemsTotal || billing.itemTotal || billing.baseAmount || 0;
        const taxes = billing.taxes || billing.tax || billing.gst || billing.cgst + billing.sgst || billing.taxAmount || 0;
        const deliveryFee = billing.deliveryFee || billing.deliveryCharge || billing.deliveryCharges || billing.shippingFee || 0;
        const platformFee = billing.platformFee || billing.serviceFee || billing.convenienceFee || 0;
        const packagingFee = billing.packagingFee || billing.packagingCharge || 0;
        const discount = billing.discount || billing.discountAmount || 0;
        const tip = billing.tip || billing.driverTip || 0;

        const calculatedTotal = subtotal + taxes + deliveryFee + platformFee + packagingFee + tip - discount;
        if (calculatedTotal > 0) {
          console.log(`💰 Calculated from billing breakdown: ${calculatedTotal}`, {
            subtotal,
            taxes,
            deliveryFee,
            platformFee,
            packagingFee,
            tip,
            discount,
            total: calculatedTotal
          });
          return calculatedTotal;
        }
      }

      // Priority 4: Last resort - calculate from items (but this won't include taxes/fees)
      if (orderAny.items && Array.isArray(orderAny.items) && orderAny.items.length > 0) {
        console.log('💰 Calculating from items (WARNING: may not include taxes/fees)');
        const itemsTotal = orderAny.items.reduce((sum: number, item: any) => {
          const itemTotal = item.totalPrice || item.total || item.price || item.unitPrice || item.amount || 0;
          return sum + itemTotal;
        }, 0);
        if (itemsTotal > 0) {
          console.log(`💰 Items total calculated: ${itemsTotal} (excluding taxes/fees)`);
          return itemsTotal;
        }
      }

      console.log('💰 No total found, returning 0');
      return 0;
    };

    return (
      <View key={order._id} style={styles.orderInBatch}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <View style={[styles.orderStatusBadge, getStatusColor(order.status)]}>
            <Text style={styles.orderStatusText}>{order.status}</Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.orderInfoRow}>
            <MaterialIcons name="person" size={18} color={colors.textSecondary} />
            <Text style={styles.orderInfoText} numberOfLines={1}>{getUserName()}</Text>
          </View>
          <View style={styles.orderInfoRow}>
            <MaterialIcons name="phone" size={18} color={colors.textSecondary} />
            <Text style={styles.orderInfoText} numberOfLines={1}>{getUserPhone()}</Text>
          </View>
          <View style={styles.orderInfoRow}>
            <MaterialIcons name="location-on" size={18} color={colors.textSecondary} />
            <Text style={styles.orderInfoText} numberOfLines={2}>
              {getDeliveryAddress()}
            </Text>
          </View>
          <View style={styles.orderInfoRow}>
            <MaterialIcons name="payments" size={18} color={colors.success} />
            <Text style={[styles.orderInfoText, { color: colors.success, fontWeight: '700' }]}>
              ₹{getOrderTotal()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderBatchCard = ({ item }: { item: Batch }) => {
    const isLoadingOrders = loadingBatchIds.has(item._id);
    const isExpanded = expandedBatchIds.has(item._id) || isLoadingOrders;
    const urgency = getUrgencyIndicator(item);
    const canReassign = item.driverId && ['DISPATCHED', 'IN_PROGRESS'].includes(item.status);
    const canCancel = !['COMPLETED', 'CANCELLED', 'PARTIAL_COMPLETE'].includes(item.status);

    return (
      <>
        <View style={[styles.card, urgency && { borderLeftWidth: 4, borderLeftColor: urgency.color }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.batchTitleRow}>
              <Text style={styles.cardTitle}>{item.batchNumber}</Text>
              {urgency && (
                <View style={[styles.urgencyBadge, { backgroundColor: urgency.color }]}>
                  <Text style={styles.urgencyText}>{urgency.label}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => toggleBatchExpansion(item._id)}
              style={styles.dropdownIcon}
            >
              <MaterialIcons
                name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={28}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.statusRowContainer}>
            <View style={[styles.statusBadge, getBatchStatusColor(item.status)]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.infoRow}>
              <MaterialIcons name="restaurant" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{item.kitchenId?.name || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                {item.zoneId?.name || 'N/A'} ({item.zoneId?.code || 'N/A'})
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons
                name={item.mealWindow === 'LUNCH' ? 'wb-sunny' : 'nights-stay'}
                size={16}
                color={item.mealWindow === 'LUNCH' ? colors.warning : colors.info}
              />
              <Text style={styles.infoText}>{item.mealWindow}</Text>
            </View>
            {item.driverId && (
              <View style={styles.infoRow}>
                <MaterialIcons name="delivery-dining" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>{item.driverId.name}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <MaterialIcons name="shopping-bag" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                {item.orderCount} orders • {item.totalDelivered} delivered • {item.totalFailed}{' '}
                failed
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          {(canReassign || canCancel) && (
            <View style={styles.actionButtons}>
              {canReassign && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.reassignButton]}
                  onPress={() => handleReassignBatch(item)}
                >
                  <MaterialIcons name="swap-horiz" size={18} color={colors.secondary} />
                  <Text style={styles.reassignButtonText}>Reassign</Text>
                </TouchableOpacity>
              )}
              {canCancel && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => handleCancelBatch(item)}
                >
                  <MaterialIcons name="cancel" size={18} color={colors.error} />
                  <Text style={styles.cancelButtonText}>Cancel Batch</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>

        {/* Expanded Orders Section - Outside the batch card */}
        {isExpanded && (
          <View style={styles.ordersSection}>
            {isLoadingOrders ? (
              <View style={styles.loadingOrders}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingOrdersText}>Loading orders...</Text>
              </View>
            ) : item.orders && item.orders.length > 0 ? (
              <>
                <View style={styles.ordersSectionHeader}>
                  <MaterialIcons name="list-alt" size={20} color={colors.primary} />
                  <Text style={styles.ordersSectionTitle}>
                    Orders in {item.batchNumber} ({item.orders.length})
                  </Text>
                </View>
                {item.orders.map(order => renderOrderInBatch(order))}
              </>
            ) : (
              <View style={styles.noOrders}>
                <Text style={styles.noOrdersText}>No orders in this batch</Text>
              </View>
            )}
          </View>
        )}
      </>
    );
  };

  const renderBatchesTab = () => (
    <View style={styles.tabContent}>
      {/* Status Filter */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(
            [
              'ALL',
              'COLLECTING',
              'READY_FOR_DISPATCH',
              'DISPATCHED',
              'IN_PROGRESS',
              'COMPLETED',
              'CANCELLED',
            ] as BatchStatus[]
          ).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, batchStatus === status && styles.filterChipActive]}
              onPress={() => setBatchStatus(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  batchStatus === status && styles.filterChipTextActive,
                ]}
              >
                {status.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Batches List */}
      <FlatList
        data={batches}
        renderItem={renderBatchCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="local-shipping" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Batches Found</Text>
            <Text style={styles.emptySubtitle}>Batches will appear here</Text>
          </View>
        }
      />

      {/* Pagination */}
      {batchesTotalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              batchesPage === 1 && styles.paginationButtonDisabled,
            ]}
            onPress={() => setBatchesPage(batchesPage - 1)}
            disabled={batchesPage === 1}
          >
            <MaterialIcons name="chevron-left" size={24} color={colors.primary} />
            <Text style={styles.paginationButtonText}>Previous</Text>
          </TouchableOpacity>

          <Text style={styles.paginationText}>
            Page {batchesPage} of {batchesTotalPages}
          </Text>

          <TouchableOpacity
            style={[
              styles.paginationButton,
              batchesPage === batchesTotalPages && styles.paginationButtonDisabled,
            ]}
            onPress={() => setBatchesPage(batchesPage + 1)}
            disabled={batchesPage === batchesTotalPages}
          >
            <Text style={styles.paginationButtonText}>Next</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const getStatusColor = (status: string) => {
    const colors_map: Record<string, any> = {
      PLACED: { backgroundColor: '#e0e7ff' },
      ACCEPTED: { backgroundColor: '#dbeafe' },
      PREPARING: { backgroundColor: '#fef3c7' },
      READY: { backgroundColor: '#d1fae5' },
      PICKED_UP: { backgroundColor: '#cffafe' },
      OUT_FOR_DELIVERY: { backgroundColor: '#e0e7ff' },
      DELIVERED: { backgroundColor: '#dcfce7' },
      CANCELLED: { backgroundColor: '#fee2e2' },
      FAILED: { backgroundColor: '#fee2e2' },
    };
    return colors_map[status] || { backgroundColor: colors.background };
  };

  const getBatchStatusColor = (status: string) => {
    const colors_map: Record<string, any> = {
      COLLECTING: { backgroundColor: '#fef3c7' },
      READY_FOR_DISPATCH: { backgroundColor: '#dbeafe' },
      DISPATCHED: { backgroundColor: '#e0e7ff' },
      IN_PROGRESS: { backgroundColor: '#cffafe' },
      COMPLETED: { backgroundColor: '#dcfce7' },
      PARTIAL_COMPLETE: { backgroundColor: '#fed7aa' },
      CANCELLED: { backgroundColor: '#fee2e2' },
    };
    return colors_map[status] || { backgroundColor: colors.background };
  };

  return (
    <SafeAreaScreen
      topBackgroundColor="#F56B4C"
      bottomBackgroundColor="#f9fafb"
      backgroundColor="#f9fafb"
    >
      <Header
        title="Driver Batches & Orders"
        onMenuPress={onMenuPress}
        rightComponent={
          <TouchableOpacity onPress={handleRefresh}>
            <MaterialIcons name="refresh" size={24} color={colors.white} />
          </TouchableOpacity>
        }
      />

      <View style={styles.container}>
        {/* Content */}
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          renderBatchesTab()
        )}

        {/* Reassignment Modal */}
        <Modal
          visible={showReassignModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowReassignModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Header with Step Indicator */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {reassignStep === 1 ? 'Select Driver' : 'Confirm Reassignment'}
                  </Text>
                  <View style={styles.stepIndicator}>
                    {[1, 2].map((step) => (
                      <View
                        key={step}
                        style={[
                          styles.stepDot,
                          step <= reassignStep && styles.stepDotActive,
                        ]}
                      />
                    ))}
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowReassignModal(false)}>
                  <MaterialIcons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {selectedBatchForAction && (
                  <>
                    {/* Step 1: Select Driver */}
                    {reassignStep === 1 && (
                      <>
                        {/* Batch info summary */}
                        <View style={styles.batchInfoSummary}>
                          <View style={styles.batchInfoRow}>
                            <Text style={styles.batchInfoLabel}>Batch</Text>
                            <Text style={styles.batchInfoValue}>{selectedBatchForAction.batchNumber}</Text>
                          </View>
                          <View style={styles.batchInfoRow}>
                            <Text style={styles.batchInfoLabel}>Current Driver</Text>
                            <Text style={styles.batchInfoValue}>
                              {selectedBatchForAction.driverId?.name || 'Not assigned'}
                            </Text>
                          </View>
                          <View style={styles.batchInfoRow}>
                            <Text style={styles.batchInfoLabel}>Orders</Text>
                            <Text style={styles.batchInfoValue}>{selectedBatchForAction.orderCount}</Text>
                          </View>
                        </View>

                        <Text style={styles.modalSectionSubtitle}>
                          Choose an available driver for this batch
                        </Text>

                        {loadingDrivers ? (
                          <View style={styles.loadingDrivers}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={styles.loadingDriversText}>Loading available drivers...</Text>
                          </View>
                        ) : availableDrivers.length === 0 ? (
                          <View style={styles.emptyDrivers}>
                            <MaterialIcons name="person-off" size={48} color={colors.textMuted} />
                            <Text style={styles.emptyDriversText}>No available drivers found</Text>
                            <Text style={styles.emptyDriversSubtext}>
                              All active drivers may be at capacity or offline
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.driverList}>
                            {availableDrivers.map((driver) => (
                              <TouchableOpacity
                                key={driver._id}
                                style={[
                                  styles.driverCard,
                                  selectedDriverId === driver._id && styles.driverCardSelected,
                                ]}
                                onPress={() => setSelectedDriverId(driver._id)}
                              >
                                <View style={styles.driverCardHeader}>
                                  <View style={styles.driverAvatar}>
                                    <MaterialIcons name="person" size={32} color={colors.white} />
                                  </View>
                                  <View style={styles.driverCardInfo}>
                                    <Text style={styles.driverName}>{driver.name}</Text>
                                    <Text style={styles.driverPhone}>{driver.phone}</Text>
                                  </View>
                                  {selectedDriverId === driver._id && (
                                    <MaterialIcons name="check-circle" size={24} color={colors.success} />
                                  )}
                                </View>
                                <View style={styles.driverCardDetails}>
                                  <View style={styles.driverDetailRow}>
                                    <MaterialIcons name="directions-car" size={16} color={colors.textSecondary} />
                                    <Text style={styles.driverDetailText}>
                                      {driver.vehicleType || 'Vehicle'} - {driver.vehicleNumber || 'N/A'}
                                    </Text>
                                  </View>
                                  <View style={styles.driverDetailRow}>
                                    <MaterialIcons name="verified" size={16} color={colors.success} />
                                    <Text style={styles.driverDetailText}>Active & Approved</Text>
                                  </View>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </>
                    )}

                    {/* Step 2: Confirmation */}
                    {reassignStep === 2 && (
                      <>
                        <Text style={styles.modalSectionSubtitle}>
                          Please review the changes before confirming
                        </Text>

                        <View style={styles.confirmationBox}>
                          <View style={styles.confirmationRow}>
                            <Text style={styles.confirmationLabel}>Batch:</Text>
                            <Text style={styles.confirmationValue}>{selectedBatchForAction.batchNumber}</Text>
                          </View>
                          <View style={styles.confirmationRow}>
                            <Text style={styles.confirmationLabel}>From Driver:</Text>
                            <Text style={styles.confirmationValue}>
                              {selectedBatchForAction.driverId?.name || 'Unassigned'}
                            </Text>
                          </View>
                          <View style={styles.confirmationRow}>
                            <Text style={styles.confirmationLabel}>To Driver:</Text>
                            <Text style={[styles.confirmationValue, { color: colors.success }]}>
                              {availableDrivers.find((d) => d._id === selectedDriverId)?.name || 'Unknown'}
                            </Text>
                          </View>
                          <View style={styles.confirmationRow}>
                            <Text style={styles.confirmationLabel}>Orders:</Text>
                            <Text style={styles.confirmationValue}>
                              {selectedBatchForAction.orderCount} orders
                            </Text>
                          </View>
                        </View>

                        <View style={[styles.warningBox, { backgroundColor: colors.warningLight }]}>
                          <MaterialIcons name="info" size={20} color={colors.warning} />
                          <Text style={[styles.warningText, { color: colors.textPrimary }]}>
                            Both drivers will be notified immediately. Orders will be updated with the new driver
                            information.
                          </Text>
                        </View>
                      </>
                    )}
                  </>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                {reassignStep === 2 && (
                  <TouchableOpacity style={styles.modalButtonSecondary} onPress={handleReassignBack}>
                    <MaterialIcons name="arrow-back" size={18} color={colors.textSecondary} />
                    <Text style={styles.modalButtonSecondaryText}>Back</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={() => setShowReassignModal(false)}
                >
                  <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                {reassignStep === 1 ? (
                  <TouchableOpacity
                    style={[
                      styles.modalButtonPrimary,
                      (!selectedDriverId || loadingDrivers) && styles.modalButtonDisabled,
                    ]}
                    onPress={handleReassignNext}
                    disabled={!selectedDriverId || loadingDrivers}
                  >
                    <Text style={styles.modalButtonPrimaryText}>Next</Text>
                    <MaterialIcons name="arrow-forward" size={18} color={colors.white} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.modalButtonPrimary, isProcessing && styles.modalButtonDisabled]}
                    onPress={submitReassignment}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <MaterialIcons name="check" size={18} color={colors.white} />
                        <Text style={styles.modalButtonPrimaryText}>Confirm</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* Cancellation Dialog */}
        <Modal
          visible={showCancelDialog}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCancelDialog(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <MaterialIcons name="warning" size={28} color={colors.error} />
                <Text style={[styles.modalTitle, { color: colors.error, marginLeft: 8 }]}>
                  Cancel Batch
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCancelDialog(false)}
                  style={{ marginLeft: 'auto' }}
                >
                  <MaterialIcons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {selectedBatchForAction && (
                  <>
                    <View style={styles.batchInfoSummary}>
                      <View style={styles.batchInfoRow}>
                        <Text style={styles.batchInfoLabel}>Batch</Text>
                        <Text style={styles.batchInfoValue}>{selectedBatchForAction.batchNumber}</Text>
                      </View>
                      <View style={styles.batchInfoRow}>
                        <Text style={styles.batchInfoLabel}>Kitchen & Zone</Text>
                        <Text style={styles.batchInfoValue}>
                          {selectedBatchForAction.kitchenId?.name} - {selectedBatchForAction.zoneId?.name}
                        </Text>
                      </View>
                      <View style={styles.batchInfoRow}>
                        <Text style={styles.batchInfoLabel}>Driver</Text>
                        <Text style={styles.batchInfoValue}>
                          {selectedBatchForAction.driverId?.name || 'Not assigned'}
                        </Text>
                      </View>
                      <View style={styles.batchInfoRow}>
                        <Text style={styles.batchInfoLabel}>Orders Affected</Text>
                        <Text style={[styles.batchInfoValue, { color: colors.error }]}>
                          {selectedBatchForAction.orderCount} orders
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.warningBox, { backgroundColor: colors.errorLight }]}>
                      <MaterialIcons name="info" size={20} color={colors.error} />
                      <Text style={styles.warningText}>
                        Canceling this batch will cancel all orders, remove driver assignment,
                        and notify all parties. This action cannot be undone.
                      </Text>
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={() => setShowCancelDialog(false)}
                >
                  <Text style={styles.modalButtonSecondaryText}>Go Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButtonDanger,
                    isProcessing && styles.modalButtonDisabled,
                  ]}
                  onPress={submitCancellation}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.modalButtonPrimaryText}>Cancel Batch</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaScreen>
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  tabContent: {
    flex: 1,
  },
  filterBar: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
    minHeight: 56,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusRowContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardContent: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paginationButtonDisabled: {
    opacity: 0.3,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  paginationText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  batchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownIcon: {
    padding: 4,
  },
  ordersSection: {
    backgroundColor: colors.white,
    marginHorizontal: 4,
    marginTop: -8,
    marginBottom: 12,
    padding: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ordersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ordersSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
    flexWrap: 'wrap',
  },
  loadingOrders: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingOrdersText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  orderInBatch: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  orderDetails: {
    gap: 6,
    marginTop: 4,
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  orderInfoText: {
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  noOrders: {
    padding: 16,
    alignItems: 'center',
  },
  noOrdersText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  // Urgency indicator styles
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  // Action buttons styles
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  reassignButton: {
    backgroundColor: colors.secondaryLight,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  reassignButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  cancelButton: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    backgroundColor: colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modalLabelRequired: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  batchInfoSummary: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  batchInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  batchInfoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    width: 110,
  },
  batchInfoValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  modalValue: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  modalTextArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 100,
    backgroundColor: colors.background,
  },
  characterCount: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'right',
  },
  quickReasonsContainer: {
    marginTop: 8,
  },
  quickReasonsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  quickReasonChip: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  quickReasonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  modalButtonSecondary: {
    flexDirection: 'row',
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  modalButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalButtonPrimary: {
    flexDirection: 'row',
    flex: 1,
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  modalButtonDanger: {
    flex: 1,
    backgroundColor: colors.error,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  // Step indicator styles
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  stepDot: {
    width: 32,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  stepDotActive: {
    backgroundColor: colors.secondary,
  },
  // Driver selection styles
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  modalSectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  loadingDrivers: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingDriversText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyDrivers: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyDriversText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptyDriversSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  driverList: {
    gap: 12,
  },
  driverCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  driverCardSelected: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  driverCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverCardInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  driverPhone: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  driverCardDetails: {
    gap: 8,
  },
  driverDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverDetailText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  // Confirmation styles
  confirmationBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  confirmationRow: {
    gap: 4,
  },
  confirmationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  confirmationValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  confirmationValueMultiline: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    marginTop: 4,
  },
});
