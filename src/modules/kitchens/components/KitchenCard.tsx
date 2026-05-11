import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Switch,
} from 'react-native';
import { useAlert } from '../../../hooks/useAlert';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Kitchen, Zone } from '../../../types/api.types';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

interface KitchenCardProps {
  kitchen: Kitchen;
  onPress: (kitchen: Kitchen) => void;
  onToggleAcceptingOrders: (kitchen: Kitchen, value: boolean) => void;
  onEdit?: (kitchen: Kitchen) => void;
  onDelete?: (kitchen: Kitchen) => void;
  onActivate?: (kitchen: Kitchen) => void;
}

export const KitchenCard: React.FC<KitchenCardProps> = ({
  kitchen,
  onPress,
  onToggleAcceptingOrders,
  onEdit,
  onDelete,
  onActivate,
}) => {
  const { showConfirm } = useAlert();
  const [imageError, setImageError] = useState(false);
  const getStatusColor = () => {
    switch (kitchen.status) {
      case 'ACTIVE':
        return colors.success;
      case 'INACTIVE':
        return colors.textMuted;
      case 'PENDING_APPROVAL':
        return colors.warning;
      case 'SUSPENDED':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const getTypeColor = () => {
    return kitchen.type === 'TIFFSY' ? colors.info : colors.secondary;
  };

  const getCoverageCount = () => {
    if (Array.isArray(kitchen.areasServed) && kitchen.areasServed.length > 0) {
      return kitchen.areasServed.length;
    }
    if (Array.isArray(kitchen.zonesServed)) {
      return kitchen.zonesServed.length;
    }
    return 0;
  };

  const handleDelete = () => {
    showConfirm(
      'Delete Kitchen',
      `Are you sure you want to delete "${kitchen.name}"? This action cannot be undone.`,
      () => onDelete?.(kitchen),
      undefined,
      { confirmText: 'Delete', cancelText: 'Cancel', isDestructive: true }
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(kitchen)}
      activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          {kitchen.logo && kitchen.logo.trim() !== '' && !imageError ? (
            <Image
              source={{ uri: kitchen.logo }}
              style={styles.logo}
              onError={() => {
                console.log('Failed to load kitchen logo:', kitchen.logo);
                setImageError(true);
              }}
            />
          ) : (
            <View style={[styles.logo, styles.placeholderLogo]}>
              <Icon name="silverware-fork-knife" size={24} color={colors.primary} />
            </View>
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name} numberOfLines={1}>
            {kitchen.name}
          </Text>
          <Text style={styles.code} numberOfLines={1}>
            {kitchen.code}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {onEdit && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onEdit(kitchen);
              }}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="pencil" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="delete" size={20} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: getTypeColor() }]}>
          <Text style={styles.badgeText}>{kitchen.type}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.badgeText}>{kitchen.status}</Text>
        </View>
        {kitchen.authorizedFlag && (
          <View style={[styles.badge, styles.authorizedBadge]}>
            <Icon name="check-decagram" size={12} color="#fff" />
            <Text style={[styles.badgeText, { marginLeft: 4 }]}>Authorized</Text>
          </View>
        )}
        {kitchen.premiumFlag && (
          <View style={[styles.badge, styles.premiumBadge]}>
            <Icon name="star" size={12} color="#fff" />
            <Text style={[styles.badgeText, { marginLeft: 4 }]}>Premium</Text>
          </View>
        )}
        {kitchen.gourmetFlag && (
          <View style={[styles.badge, styles.gourmetBadge]}>
            <Icon name="chef-hat" size={12} color="#fff" />
            <Text style={[styles.badgeText, { marginLeft: 4 }]}>Gourmet</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Icon name="map-marker" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText} numberOfLines={1}>
            {kitchen.address.locality}, {kitchen.address.city}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="silverware-variant" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText} numberOfLines={1}>
            {kitchen.cuisineTypes.join(', ')}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Icon name="map-marker-multiple" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            Serves {getCoverageCount()} {getCoverageCount() === 1 ? 'area' : 'areas'}
          </Text>
        </View>

        {kitchen.averageRating > 0 && (
          <View style={styles.infoRow}>
            <Icon name="star" size={16} color={colors.warning} />
            <Text style={styles.infoText}>
              {kitchen.averageRating.toFixed(1)} ({kitchen.totalRatings} ratings)
            </Text>
          </View>
        )}
      </View>

      {/* Activation Button for Pending Approval */}
      {kitchen.status === 'PENDING_APPROVAL' && onActivate && (
        <TouchableOpacity
          style={styles.activateButton}
          onPress={() => onActivate(kitchen)}
          activeOpacity={0.7}>
          <Icon name="check-circle" size={20} color="#fff" />
          <Text style={styles.activateButtonText}>Activate Kitchen</Text>
        </TouchableOpacity>
      )}

      <View style={styles.footer}>
        <View style={styles.acceptingOrdersContainer}>
          <Icon
            name={kitchen.isAcceptingOrders ? 'check-circle' : 'close-circle'}
            size={20}
            color={kitchen.isAcceptingOrders ? colors.success : colors.error}
          />
          <Text style={styles.acceptingOrdersText}>
            {kitchen.isAcceptingOrders ? 'Accepting Orders' : 'Not Accepting Orders'}
          </Text>
        </View>
        <Switch
          value={kitchen.isAcceptingOrders}
          onValueChange={(value) => onToggleAcceptingOrders(kitchen, value)}
          trackColor={{ false: colors.border, true: colors.successLight }}
          thumbColor={kitchen.isAcceptingOrders ? colors.success : colors.textMuted}
          disabled={kitchen.status === 'PENDING_APPROVAL'}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusMd,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoContainer: {
    marginRight: spacing.md,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadiusSm,
  },
  placeholderLogo: {
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  code: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: spacing.borderRadiusSm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  authorizedBadge: {
    backgroundColor: '#22c55e',
  },
  premiumBadge: {
    backgroundColor: '#f59e0b',
  },
  gourmetBadge: {
    backgroundColor: '#8b5cf6',
  },
  info: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  acceptingOrdersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  acceptingOrdersText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadiusMd,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  activateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
