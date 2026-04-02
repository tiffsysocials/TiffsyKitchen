import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { MealSlotSnapshot } from '../../types/dashboard';

interface MealSlotCardProps {
  slot: MealSlotSnapshot;
}

export const MealSlotCard: React.FC<MealSlotCardProps> = ({ slot }) => {
  const getMealIcon = (type: 'lunch' | 'dinner'): string => {
    return type === 'lunch' ? 'wb-sunny' : 'nights-stay';
  };

  const getMealColor = (type: 'lunch' | 'dinner'): string => {
    return type === 'lunch' ? '#FE8733' : '#6366f1';
  };

  const statItems = [
    { label: 'Preparing', value: slot.preparing, color: '#FE8733' },
    { label: 'Packed', value: slot.packed, color: '#eab308' },
    { label: 'Delivered', value: slot.delivered, color: '#22c55e' },
    { label: 'Pending', value: slot.pending, color: '#6b7280' },
  ];

  const mealColor = getMealColor(slot.mealType);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: mealColor + '20' }]}>
          <MaterialIcons name={getMealIcon(slot.mealType)} size={20} color={mealColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {slot.mealType === 'lunch' ? 'Lunch' : 'Dinner'}
          </Text>
          <Text style={styles.totalOrders}>{slot.totalOrders} orders</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        {statItems.map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: stat.color }]} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressSegment,
              {
                backgroundColor: '#22c55e',
                width: `${(slot.delivered / slot.totalOrders) * 100}%`,
              },
            ]}
          />
          <View
            style={[
              styles.progressSegment,
              {
                backgroundColor: '#eab308',
                width: `${(slot.packed / slot.totalOrders) * 100}%`,
              },
            ]}
          />
          <View
            style={[
              styles.progressSegment,
              {
                backgroundColor: '#FE8733',
                width: `${(slot.preparing / slot.totalOrders) * 100}%`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  totalOrders: {
    fontSize: 12,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 6,
    paddingHorizontal: 3,
  },
  statDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 4,
  },
  statLabel: {
    fontSize: 9,
    color: '#6b7280',
    flex: 1,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressSegment: {
    height: '100%',
  },
});

MealSlotCard.displayName = 'MealSlotCard';
