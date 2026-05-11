import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Plan, mealTypeLabels, targetUserLabels } from '../models/types';
import { formatPrice, formatRelativeTime } from '../utils/planUtils';
import { colors, spacing } from '../../../theme';

interface PlanCardProps {
  plan: Plan;
  onPress: () => void;
  onToggleActive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  onPress,
  onToggleActive,
  onDuplicate,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuAction = (action: () => void) => {
    setShowMenu(false);
    action();
  };

  const getMealTypeIcon = (): string => {
    switch (plan.mealType) {
      case 'VEG':
        return 'eco';
      case 'VEG_PLUS_ADDONS':
        return 'add-circle';
      case 'ROTATING_MENU':
        return 'autorenew';
      default:
        return 'restaurant';
    }
  };

  const getTargetIcon = (): string => {
    switch (plan.targetUser) {
      case 'STUDENTS':
        return 'school';
      case 'WORKING':
        return 'work';
      case 'FITNESS':
        return 'fitness-center';
      default:
        return 'group';
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.card, !plan.isActive && styles.cardInactive]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Header Row */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.internalCode}>{plan.internalCode}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusBadge, plan.isActive ? styles.statusActive : styles.statusInactive]}>
              <View style={[styles.statusDot, plan.isActive ? styles.dotActive : styles.dotInactive]} />
              <Text style={[styles.statusText, plan.isActive ? styles.statusTextActive : styles.statusTextInactive]}>
                {plan.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowMenu(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="more-vert" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tagline */}
        {plan.shortTagline ? (
          <Text style={styles.tagline} numberOfLines={1}>
            {plan.shortTagline}
          </Text>
        ) : null}

        {/* Price & Duration Row */}
        <View style={styles.infoRow}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceValue}>{formatPrice(plan.basePricePerMeal)}</Text>
            <Text style={styles.priceLabel}>/meal</Text>
          </View>
          <View style={styles.durationContainer}>
            <MaterialIcons name="date-range" size={14} color={colors.textMuted} />
            <Text style={styles.durationText}>
              {plan.durationMinDays}–{plan.durationMaxDays} vouchers
            </Text>
          </View>
        </View>

        {/* Badges Row */}
        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <MaterialIcons name={getMealTypeIcon()} size={12} color={colors.success} />
            <Text style={styles.badgeText}>{mealTypeLabels[plan.mealType]}</Text>
          </View>
          <View style={styles.badge}>
            <MaterialIcons name={getTargetIcon()} size={12} color={colors.primary} />
            <Text style={styles.badgeText}>
              {plan.targetUser === 'OTHER' && plan.customTargetUser
                ? plan.customTargetUser
                : targetUserLabels[plan.targetUser]}
            </Text>
          </View>
          {plan.supportsAddOns && (
            <View style={[styles.badge, styles.badgeAddons]}>
              <MaterialIcons name="add-box" size={12} color="#8b5cf6" />
              <Text style={[styles.badgeText, styles.badgeTextAddons]}>Add-ons</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.updatedText}>
            Updated {formatRelativeTime(plan.updatedAt)}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Context Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Plan Actions</Text>
              <TouchableOpacity
                onPress={() => setShowMenu(false)}
                style={styles.menuCloseButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction(onToggleActive)}
            >
              <MaterialIcons
                name={plan.isActive ? 'visibility-off' : 'visibility'}
                size={20}
                color={colors.textPrimary}
              />
              <Text style={styles.menuItemText}>
                {plan.isActive ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction(onDuplicate)}
            >
              <MaterialIcons name="content-copy" size={20} color={colors.textPrimary} />
              <Text style={styles.menuItemText}>Duplicate</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction(onDelete)}
            >
              <MaterialIcons name="delete-outline" size={20} color={colors.error} />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardInactive: {
    opacity: 0.75,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  internalCode: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: colors.successLight,
  },
  statusInactive: {
    backgroundColor: colors.background,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  dotActive: {
    backgroundColor: colors.success,
  },
  dotInactive: {
    backgroundColor: colors.textMuted,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.textMuted,
  },
  menuButton: {
    marginLeft: spacing.sm,
    padding: 4,
  },
  tagline: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: spacing.lg,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 2,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: spacing.xs,
    marginBottom: 4,
  },
  badgeAddons: {
    backgroundColor: '#ede9fe',
  },
  badgeText: {
    fontSize: 11,
    color: colors.success,
    marginLeft: 4,
    fontWeight: '500',
  },
  badgeTextAddons: {
    color: '#8b5cf6',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  updatedText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  // Menu styles
  menuOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    padding: spacing.sm,
    minWidth: 200,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: spacing.xs,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  menuCloseButton: {
    padding: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  menuItemText: {
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: spacing.md,
  },
  menuItemTextDanger: {
    color: colors.error,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xs,
  },
});

export default PlanCard;
