import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Order } from '../../../types/api.types';
import OrderCardAdminImproved from './OrderCardAdminImproved';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { groupOrdersByArea } from '../utils/areaGrouping';

interface ExpandableKitchenOrderCardProps {
  kitchenId: string;
  kitchenName: string;
  kitchenCode: string;
  orders: Order[];
  onOrderPress: (orderId: string) => void;
  onStatusChange: (orderId: string, newStatus: any) => void;
  updatingOrderId: string | null;
  selectionMode?: boolean;
  selectedOrderIds?: Set<string>;
  onOrderSelect?: (orderId: string) => void;
  /** When set, orders are split into delivery-area sections instead of one flat run. */
  groupByArea?: boolean;
}

const ExpandableKitchenOrderCard: React.FC<ExpandableKitchenOrderCardProps> = ({
  kitchenId,
  kitchenName,
  kitchenCode,
  orders,
  onOrderPress,
  onStatusChange,
  updatingOrderId,
  selectionMode = false,
  selectedOrderIds,
  onOrderSelect,
  groupByArea = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rotateAnim] = useState(new Animated.Value(0));

  // Auto-expand when selection mode is enabled so user can pick orders
  React.useEffect(() => {
    if (selectionMode && !isExpanded) {
      setIsExpanded(true);
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [selectionMode]);

  const selectedCountInKitchen = React.useMemo(() => {
    if (!selectedOrderIds || selectedOrderIds.size === 0) return 0;
    return orders.reduce((acc, o) => acc + (selectedOrderIds.has(o._id) ? 1 : 0), 0);
  }, [orders, selectedOrderIds]);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);

    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // Calculate order statistics for this kitchen
  const stats = {
    total: orders.length,
    placed: orders.filter(o => o.status === 'PLACED').length,
    preparing: orders.filter(o => o.status === 'PREPARING' || o.status === 'ACCEPTED').length,
    ready: orders.filter(o => o.status === 'READY').length,
    outForDelivery: orders.filter(o => o.status === 'OUT_FOR_DELIVERY' || o.status === 'PICKED_UP').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
  };

  return (
    <View style={styles.container}>
      {/* Kitchen Header Card */}
      <TouchableOpacity
        style={styles.headerCard}
        onPress={toggleExpanded}
        activeOpacity={0.7}>
        <View style={styles.headerContent}>
          {/* Kitchen Icon */}
          <View style={styles.iconContainer}>
            <Icon name="restaurant" size={24} color="#FE8733" />
          </View>

          {/* Kitchen Info */}
          <View style={styles.kitchenInfo}>
            <Text style={styles.kitchenName}>{kitchenName}</Text>
            <Text style={styles.kitchenCode}>Code: {kitchenCode}</Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statBadge}>
                <Text style={styles.statLabel}>Total: </Text>
                <Text style={styles.statValue}>{stats.total}</Text>
              </View>
              {stats.placed > 0 && (
                <View style={[styles.statBadge, styles.placedBadge]}>
                  <Text style={styles.statLabelWhite}>Placed: </Text>
                  <Text style={styles.statValueWhite}>{stats.placed}</Text>
                </View>
              )}
              {stats.preparing > 0 && (
                <View style={[styles.statBadge, styles.preparingBadge]}>
                  <Text style={styles.statLabelWhite}>Prep: </Text>
                  <Text style={styles.statValueWhite}>{stats.preparing}</Text>
                </View>
              )}
              {selectionMode && selectedCountInKitchen > 0 && (
                <View style={[styles.statBadge, styles.selectedBadge]}>
                  <Text style={styles.statLabelWhite}>Selected: </Text>
                  <Text style={styles.statValueWhite}>{selectedCountInKitchen}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Dropdown Icon */}
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Icon name="keyboard-arrow-down" size={28} color="#6b7280" />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Expanded Orders List */}
      {isExpanded && (
        <View style={styles.ordersContainer}>
          {orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No orders for this kitchen</Text>
            </View>
          ) : (
            (() => {
              const renderOrder = (order: Order) => (
                <OrderCardAdminImproved
                  key={order._id}
                  order={order}
                  onPress={() =>
                    selectionMode && onOrderSelect
                      ? onOrderSelect(order._id)
                      : onOrderPress(order._id)
                  }
                  onStatusChange={onStatusChange}
                  isUpdating={updatingOrderId === order._id}
                  selectionMode={selectionMode}
                  isSelected={selectedOrderIds?.has(order._id) ?? false}
                  onSelect={() => onOrderSelect?.(order._id)}
                />
              );

              if (!groupByArea) return orders.map(renderOrder);

              return groupOrdersByArea(orders).map((section) => {
                // Only show a sub-header per company when this area actually
                // mixes sources (e.g. two corporate offices sharing an area).
                // A single-source area stays a flat list, same as before.
                const showSubHeaders = section.groups.length > 1;
                return (
                  <View key={section.key}>
                    <View style={styles.areaHeader}>
                      <Icon name="place" size={16} color="#ea580c" />
                      <Text style={styles.areaHeaderText} numberOfLines={1}>
                        {section.title}
                      </Text>
                      <View style={styles.areaCountPill}>
                        <Text style={styles.areaCountText}>{section.orders.length}</Text>
                      </View>
                    </View>
                    {section.groups.map((group) => (
                      <View key={group.key}>
                        {showSubHeaders && (
                          <View
                            style={[
                              styles.subGroupHeader,
                              group.isCorporate && styles.corporateSubGroupHeader,
                            ]}>
                            <Icon
                              name={group.isCorporate ? 'business' : 'storefront'}
                              size={13}
                              color={group.isCorporate ? '#1d4ed8' : '#6b7280'}
                            />
                            <Text
                              style={[
                                styles.subGroupHeaderText,
                                group.isCorporate && styles.corporateSubGroupHeaderText,
                              ]}
                              numberOfLines={1}>
                              {group.title}
                            </Text>
                            <View
                              style={[
                                styles.subGroupCountPill,
                                group.isCorporate && styles.corporateSubGroupCountPill,
                              ]}>
                              <Text style={styles.subGroupCountText}>{group.orders.length}</Text>
                            </View>
                          </View>
                        )}
                        {group.orders.map(renderOrder)}
                      </View>
                    ))}
                  </View>
                );
              });
            })()
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FE8733',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  kitchenInfo: {
    flex: 1,
  },
  kitchenName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  kitchenCode: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  placedBadge: {
    backgroundColor: '#FF9500',
  },
  preparingBadge: {
    backgroundColor: '#FFCC00',
  },
  selectedBadge: {
    backgroundColor: '#FE8733',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  statValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  statLabelWhite: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  statValueWhite: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  subGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingLeft: 26,
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
    borderLeftWidth: 2,
    borderLeftColor: '#9ca3af',
  },
  corporateSubGroupHeader: {
    backgroundColor: '#eff6ff',
    borderLeftColor: '#1d4ed8',
  },
  subGroupHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  corporateSubGroupHeaderText: {
    color: '#1d4ed8',
  },
  subGroupCountPill: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9,
    backgroundColor: '#9ca3af',
    alignItems: 'center',
  },
  corporateSubGroupCountPill: {
    backgroundColor: '#1d4ed8',
  },
  subGroupCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
    backgroundColor: '#fff7ed',
    borderLeftWidth: 3,
    borderLeftColor: '#ea580c',
  },
  areaHeaderText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#9a3412',
  },
  areaCountPill: {
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#ea580c',
    alignItems: 'center',
  },
  areaCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  ordersContainer: {
    marginTop: 8,
    paddingLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});

export default ExpandableKitchenOrderCard;
