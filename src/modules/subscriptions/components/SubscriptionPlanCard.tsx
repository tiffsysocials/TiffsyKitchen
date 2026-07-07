/**
 * Subscription Plan Card Component
 *
 * Displays plan details with pricing, duration, and features
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SubscriptionPlan, PlanStatus } from '../../../types/subscription.types';

interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan;
  onPress: () => void;
}

const PRIMARY_COLOR = '#FE8733';

export const SubscriptionPlanCard: React.FC<SubscriptionPlanCardProps> = ({ plan, onPress }) => {
  // Calculate discount percentage
  const discountPercentage = plan.originalPrice
    ? Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100)
    : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Header with Badge */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.durationBadge}>{plan.durationDays} Days</Text>
        </View>
        {plan.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{plan.badge}</Text>
          </View>
        )}
      </View>

      {/* Description */}
      {plan.description && <Text style={styles.description}>{plan.description}</Text>}

      {/* Pricing */}
      <View style={styles.pricingRow}>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₹{plan.price}</Text>
          {plan.originalPrice && (
            <Text style={styles.originalPrice}>₹{plan.originalPrice}</Text>
          )}
          {discountPercentage > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPercentage}% OFF</Text>
            </View>
          )}
        </View>
      </View>

      {/* Vouchers Info */}
      <View style={styles.vouchersRow}>
        <Icon name="confirmation-number" size={16} color="#6b7280" />
        <Text style={styles.vouchersText}>
          {plan.totalVouchers} vouchers • {plan.vouchersPerDay} per day
        </Text>
      </View>

      {/* GST Info */}
      {!!plan.taxRate && plan.taxRate > 0 && (
        <View style={styles.vouchersRow}>
          <Icon name="receipt" size={16} color="#6b7280" />
          <Text style={styles.vouchersText}>
            GST {Math.round(plan.taxRate * 100 * 100) / 100}% •{' '}
            {plan.taxInclusive ? 'Inclusive' : 'Exclusive'}
            {plan.hsnCode ? ` • HSN ${plan.hsnCode}` : ''}
          </Text>
        </View>
      )}

      {/* Delivery Discount Info */}
      {!!plan.deliveryDiscountPercent && plan.deliveryDiscountPercent > 0 && (
        <View style={styles.vouchersRow}>
          <Icon name="local-shipping" size={16} color="#6b7280" />
          <Text style={styles.vouchersText}>
            {plan.deliveryDiscountPercent === 100
              ? 'Free delivery'
              : `${plan.deliveryDiscountPercent}% off delivery`}{' '}
            on voucher orders
          </Text>
        </View>
      )}

      {/* Features */}
      {plan.features && plan.features.length > 0 && (
        <View style={styles.featuresContainer}>
          {plan.features.slice(0, 3).map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Icon name="check-circle" size={14} color="#10b981" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer with Status */}
      <View style={styles.footer}>
        <StatusBadge status={plan.status} />
        <Text style={styles.displayOrder}>Order: {plan.displayOrder}</Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Status Badge Component
 */
const StatusBadge: React.FC<{ status: PlanStatus }> = ({ status }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'ACTIVE':
        return { backgroundColor: '#dcfce7', color: '#15803d' };
      case 'INACTIVE':
        return { backgroundColor: '#f3f4f6', color: '#6b7280' };
      case 'ARCHIVED':
        return { backgroundColor: '#fee2e2', color: '#dc2626' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#6b7280' };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
      <Text style={[styles.statusText, { color: statusStyle.color }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  durationBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badge: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  pricingRow: {
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  originalPrice: {
    fontSize: 18,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  vouchersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  vouchersText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  featuresContainer: {
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  featureText: {
    fontSize: 13,
    color: '#4b5563',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  displayOrder: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
});
