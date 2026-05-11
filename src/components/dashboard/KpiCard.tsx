import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { KpiMetric } from '../../types/dashboard';

interface KpiCardProps {
  metric: KpiMetric;
  onPress?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({ metric, onPress }) => {
  const formatValue = (value: number, prefix?: string, unit?: string): string => {
    const formattedNumber = value.toLocaleString('en-IN');
    return `${prefix || ''}${formattedNumber}${unit || ''}`;
  };

  const getChangeColor = (direction?: 'up' | 'down' | 'neutral'): string => {
    switch (direction) {
      case 'up':
        return '#22c55e';
      case 'down':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getChangeIcon = (direction?: 'up' | 'down' | 'neutral'): string => {
    switch (direction) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'trending-flat';
    }
  };

  const content = (
    <>
      <View style={[styles.iconContainer, { backgroundColor: metric.color + '20' }]}>
        <MaterialIcons name={metric.icon} size={24} color={metric.color} />
      </View>
      <Text style={styles.value}>
        {formatValue(metric.value, metric.prefix, metric.unit)}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {metric.label}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.card}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },

});

KpiCard.displayName = 'KpiCard';
