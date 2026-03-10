import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { OrderStatusFunnelItem } from '../../types/dashboard';
import { SectionHeader } from './SectionHeader';

interface OrderStatusFunnelProps {
  items: OrderStatusFunnelItem[];
  onItemPress?: (status: string) => void;
  filterLabel?: string;
}

export const OrderStatusFunnel: React.FC<OrderStatusFunnelProps> = ({
  items,
  onItemPress,
  filterLabel,
}) => {
  const totalOrders = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Order Status"
        subtitle={`${totalOrders} total orders${filterLabel ? ` (${filterLabel})` : ''}`}
      />
      <View style={styles.funnelContainer}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.status}
            style={styles.funnelItem}
            onPress={() => onItemPress?.(item.status)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
              <MaterialIcons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={styles.count}>{item.count}</Text>
            <Text style={styles.label} numberOfLines={2}>
              {item.label}
            </Text>
            {index < items.length - 1 && (
              <View style={styles.connector}>
                <MaterialIcons name="arrow-forward" size={14} color="#d1d5db" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  funnelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  funnelItem: {
    alignItems: 'center',
    width: '16%',
    position: 'relative',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  count: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  connector: {
    position: 'absolute',
    right: -10,
    top: 12,
  },
});

OrderStatusFunnel.displayName = 'OrderStatusFunnel';
