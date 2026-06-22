import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface OrderStatsCardProps {
  label: string;
  value: string | number;
  color: string;
  highlight?: boolean;
  icon?: string;
  onPress?: () => void;
}

const OrderStatsCard: React.FC<OrderStatsCardProps> = ({
  label,
  value,
  color,
  highlight = false,
  icon,
  onPress,
}) => {
  const content = (
    <>
      {icon && (
        <View style={[styles.iconContainer, {backgroundColor: `${color}15`}]}>
          <Icon name={icon} size={16} color={color} />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, {color}]}>{value}</Text>
      </View>
      {onPress && (
        <Icon name="chevron-right" size={12} color={color} style={styles.chevron} />
      )}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    minWidth: 120,
    minHeight: 90,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 0,
    marginRight: 2,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  label: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 4,
    lineHeight: 12,
  },
  value: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 20,
  },
  chevron: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
});

export default OrderStatsCard;
