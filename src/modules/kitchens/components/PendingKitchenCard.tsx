import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../theme/colors';
import type { Kitchen } from '../../../types/api.types';

interface PendingKitchenCardProps {
  kitchen: Kitchen;
  onPress: () => void;
  onQuickApprove: () => void;
}

export const PendingKitchenCard: React.FC<PendingKitchenCardProps> = ({
  kitchen,
  onPress,
  onQuickApprove,
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getTypeColor = (type: string) => {
    return type === 'TIFFSY' ? colors.primary : '#8b5cf6';
  };

  const getTypeBackgroundColor = (type: string) => {
    return type === 'TIFFSY' ? colors.primary + '15' : '#8b5cf615';
  };

  const wasRejected = !!kitchen.rejectionReason;
  const rejectedDate = kitchen.rejectedAt ? formatDate(kitchen.rejectedAt) : null;

  return (
    <View style={[styles.card, wasRejected && styles.cardRejected]}>
      {wasRejected && (
        <View style={styles.rejectedBanner}>
          <View style={styles.rejectedBannerHeader}>
            <MaterialIcons name="error-outline" size={18} color={colors.error} />
            <Text style={styles.rejectedBannerTitle}>
              Previously rejected{rejectedDate ? ` · ${rejectedDate}` : ''}
            </Text>
          </View>
          <Text style={styles.rejectedReasonText} numberOfLines={3}>
            {kitchen.rejectionReason}
          </Text>
        </View>
      )}

      {/* Header with Logo and Type Badge */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          {kitchen.logo ? (
            <Image source={{ uri: kitchen.logo }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <MaterialIcons name="restaurant" size={32} color={colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.kitchenName} numberOfLines={1}>
            {kitchen.name}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: getTypeBackgroundColor(kitchen.type) }]}>
            <Text style={[styles.typeBadgeText, { color: getTypeColor(kitchen.type) }]}>
              {kitchen.type}
            </Text>
          </View>
        </View>
      </View>

      {/* Kitchen Details */}
      <View style={styles.detailsContainer}>
        {/* Location */}
        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={16} color={colors.gray600} />
          <Text style={styles.detailText}>
            {kitchen.address.locality}, {kitchen.address.city}
          </Text>
        </View>

        {/* Contact */}
        {kitchen.contactPhone && (
          <View style={styles.detailRow}>
            <MaterialIcons name="phone" size={16} color={colors.gray600} />
            <Text style={styles.detailText}>{kitchen.contactPhone}</Text>
          </View>
        )}

        {/* Email */}
        {kitchen.contactEmail && (
          <View style={styles.detailRow}>
            <MaterialIcons name="email" size={16} color={colors.gray600} />
            <Text style={styles.detailText} numberOfLines={1}>
              {kitchen.contactEmail}
            </Text>
          </View>
        )}

        {/* Owner Info (for PARTNER kitchens) */}
        {kitchen.type === 'PARTNER' && kitchen.ownerName && (
          <View style={styles.detailRow}>
            <MaterialIcons name="person" size={16} color={colors.gray600} />
            <Text style={styles.detailText}>
              {kitchen.ownerName}
              {kitchen.ownerPhone && ` • ${kitchen.ownerPhone}`}
            </Text>
          </View>
        )}

        {/* Areas Served */}
        {kitchen.areasServed && kitchen.areasServed.length > 0 && (
          <View style={styles.detailRow}>
            <MaterialIcons name="map" size={16} color={colors.gray600} />
            <Text style={styles.detailText}>
              {kitchen.areasServed.length} area
              {kitchen.areasServed.length !== 1 ? 's' : ''} served
            </Text>
          </View>
        )}

        {/* Cuisines */}
        {kitchen.cuisineTypes && kitchen.cuisineTypes.length > 0 && (
          <View style={styles.cuisinesContainer}>
            {kitchen.cuisineTypes.slice(0, 3).map((cuisine, index) => (
              <View key={index} style={styles.cuisineBadge}>
                <Text style={styles.cuisineBadgeText}>{cuisine}</Text>
              </View>
            ))}
            {kitchen.cuisineTypes.length > 3 && (
              <Text style={styles.moreCuisines}>
                +{kitchen.cuisineTypes.length - 3} more
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Footer with Date and Actions */}
      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <MaterialIcons name="schedule" size={14} color={colors.gray500} />
          <Text style={styles.dateText}>
            Submitted {formatDate(kitchen.createdAt)}
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.reviewButton} onPress={onPress}>
            <Text style={styles.reviewButtonText}>Review Details</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.approveButton} onPress={onQuickApprove}>
            <MaterialIcons name="check-circle" size={18} color={colors.white} />
            <Text style={styles.approveButtonText}>Quick Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRejected: {
    borderColor: colors.error + '60',
    borderWidth: 1.5,
  },
  rejectedBanner: {
    backgroundColor: colors.error + '12',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  rejectedBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rejectedBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rejectedReasonText: {
    fontSize: 13,
    color: colors.gray700,
    lineHeight: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoContainer: {
    marginRight: 12,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  kitchenName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 6,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.gray700,
    marginLeft: 8,
    flex: 1,
  },
  cuisinesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  cuisineBadge: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cuisineBadgeText: {
    fontSize: 12,
    color: colors.gray700,
    fontWeight: '500',
  },
  moreCuisines: {
    fontSize: 12,
    color: colors.gray600,
    fontWeight: '500',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    paddingTop: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    color: colors.gray500,
    marginLeft: 6,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});
