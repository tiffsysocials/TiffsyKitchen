import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ToastAndroid,
  Image,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { Kitchen, Zone, KitchenDetailsResponse } from '../../../types/api.types';
import kitchenService from '../../../services/kitchen.service';
import { GradientBox } from '../../../components/common/GradientBox';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';

interface KitchenDetailScreenProps {
  route: {
    params: {
      kitchenId: string;
    };
  };
  navigation: any;
}

export const KitchenDetailScreen: React.FC<KitchenDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { kitchenId } = route.params;
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKitchenDetails();
  }, [kitchenId]);

  const loadKitchenDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await kitchenService.getKitchenById(kitchenId);
      setKitchen(response.kitchen);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load kitchen details';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!kitchen) return;

    Alert.alert(
      'Activate Kitchen',
      `Are you sure you want to activate "${kitchen.name}"? This will allow the kitchen to start accepting orders.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            try {
              await kitchenService.activateKitchen(kitchen._id);
              showToast('Kitchen activated successfully', 'success');
              loadKitchenDetails();
            } catch (err: any) {
              showToast(err?.message || 'Failed to activate kitchen', 'error');
            }
          },
        },
      ]
    );
  };

  const handleToggleStatus = async () => {
    if (!kitchen) return;

    const action = kitchen.status === 'ACTIVE' ? 'Deactivate' : 'Activate';
    Alert.alert(
      `${action} Kitchen`,
      `Are you sure you want to ${action.toLowerCase()} "${kitchen.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          onPress: async () => {
            try {
              if (kitchen.status === 'ACTIVE') {
                await kitchenService.deactivateKitchen(kitchen._id);
                showToast('Kitchen deactivated', 'success');
              } else {
                await kitchenService.activateKitchen(kitchen._id);
                showToast('Kitchen activated', 'success');
              }
              loadKitchenDetails();
            } catch (err: any) {
              showToast(err?.message || 'Failed to update status', 'error');
            }
          },
        },
      ]
    );
  };

  const handleSuspend = () => {
    if (!kitchen) return;

    Alert.prompt(
      'Suspend Kitchen',
      'Please provide a reason for suspension:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason?.trim()) {
              showToast('Reason is required', 'error');
              return;
            }
            try {
              await kitchenService.suspendKitchen(kitchen._id, { reason });
              showToast('Kitchen suspended', 'success');
              loadKitchenDetails();
            } catch (err: any) {
              showToast(err?.message || 'Failed to suspend kitchen', 'error');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleToggleFlags = async (
    flagName: 'authorizedFlag' | 'premiumFlag' | 'gourmetFlag',
    value: boolean
  ) => {
    if (!kitchen) return;

    try {
      await kitchenService.updateFlags(kitchen._id, { [flagName]: value });
      setKitchen({ ...kitchen, [flagName]: value });
      showToast(`${flagName.replace('Flag', '')} flag updated`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update flag', 'error');
    }
  };

  const handleToggleAcceptingOrders = async (value: boolean) => {
    if (!kitchen) return;

    try {
      await kitchenService.toggleAcceptingOrders(kitchen._id, value);
      setKitchen({ ...kitchen, isAcceptingOrders: value });
      showToast(
        `Kitchen is now ${value ? 'accepting' : 'not accepting'} orders`,
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to toggle order acceptance', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(type === 'success' ? 'Success' : 'Error', message);
    }
  };

  const getStatusColor = () => {
    if (!kitchen) return colors.textMuted;
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
    if (!kitchen) return colors.info;
    return kitchen.type === 'TIFFSY' ? colors.info : colors.secondary;
  };

  if (loading) {
    return (
      <SafeAreaScreen topBackgroundColor={colors.primary}>
        <GradientBox style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kitchen Details</Text>
          <View style={{ width: 24 }} />
        </GradientBox>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading kitchen details...</Text>
        </View>
      </SafeAreaScreen>
    );
  }

  if (error || !kitchen) {
    return (
      <SafeAreaScreen topBackgroundColor={colors.primary}>
        <GradientBox style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kitchen Details</Text>
          <View style={{ width: 24 }} />
        </GradientBox>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Failed to load details</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadKitchenDetails}>
            <Icon name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  const zones = Array.isArray(kitchen.zonesServed)
    ? kitchen.zonesServed.filter((z): z is Zone => typeof z !== 'string')
    : [];

  return (
    <SafeAreaScreen topBackgroundColor={colors.primary}>
      <GradientBox style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kitchen Details</Text>
        <View style={{ width: 24 }} />
      </GradientBox>

      <ScrollView style={styles.scrollView}>
        {/* Kitchen Header */}
        <View style={styles.kitchenHeader}>
          {kitchen.logo ? (
            <Image source={{ uri: kitchen.logo }} style={styles.logo} />
          ) : (
            <View style={[styles.logo, styles.placeholderLogo]}>
              <Icon name="silverware-fork-knife" size={40} color={colors.textMuted} />
            </View>
          )}
          <Text style={styles.kitchenName}>{kitchen.name}</Text>
          <Text style={styles.kitchenCode}>{kitchen.code}</Text>

          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: getTypeColor() }]}>
              <Text style={styles.badgeText}>{kitchen.type}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.badgeText}>{kitchen.status}</Text>
            </View>
          </View>

          {kitchen.averageRating > 0 && (
            <View style={styles.rating}>
              <Icon name="star" size={20} color={colors.warning} />
              <Text style={styles.ratingText}>
                {kitchen.averageRating.toFixed(1)} ({kitchen.totalRatings} ratings)
              </Text>
            </View>
          )}
        </View>

        {/* Pending Approval Alert */}
        {kitchen.status === 'PENDING_APPROVAL' && (
          <View style={styles.pendingApprovalBanner}>
            <View style={styles.pendingApprovalContent}>
              <Icon name="clock-alert" size={24} color={colors.warning} />
              <View style={styles.pendingApprovalTextContainer}>
                <Text style={styles.pendingApprovalTitle}>Pending Approval</Text>
                <Text style={styles.pendingApprovalMessage}>
                  This kitchen is awaiting approval. Activate it to allow order acceptance.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.activateButtonLarge}
              onPress={handleActivate}>
              <Icon name="check-circle" size={20} color="#fff" />
              <Text style={styles.activateButtonLargeText}>Activate Kitchen</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quality Flags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quality Flags</Text>
          <View style={styles.flagRow}>
            <View style={styles.flagItem}>
              <Icon name="check-decagram" size={20} color={colors.success} />
              <Text style={styles.flagLabel}>Authorized</Text>
            </View>
            <Switch
              value={kitchen.authorizedFlag}
              onValueChange={(value) => handleToggleFlags('authorizedFlag', value)}
              trackColor={{ false: colors.border, true: colors.successLight }}
              thumbColor={kitchen.authorizedFlag ? colors.success : colors.textMuted}
            />
          </View>
          <View style={styles.flagRow}>
            <View style={styles.flagItem}>
              <Icon name="star" size={20} color={colors.warning} />
              <Text style={styles.flagLabel}>Premium</Text>
            </View>
            <Switch
              value={kitchen.premiumFlag}
              onValueChange={(value) => handleToggleFlags('premiumFlag', value)}
              trackColor={{ false: colors.border, true: colors.warningLight }}
              thumbColor={kitchen.premiumFlag ? colors.warning : colors.textMuted}
            />
          </View>
          <View style={styles.flagRow}>
            <View style={styles.flagItem}>
              <Icon name="chef-hat" size={20} color={colors.secondary} />
              <Text style={styles.flagLabel}>Gourmet</Text>
            </View>
            <Switch
              value={kitchen.gourmetFlag}
              onValueChange={(value) => handleToggleFlags('gourmetFlag', value)}
              trackColor={{ false: colors.border, true: colors.secondaryLight }}
              thumbColor={kitchen.gourmetFlag ? colors.secondary : colors.textMuted}
            />
          </View>
        </View>

        {/* Order Acceptance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Acceptance</Text>
          <View style={styles.flagRow}>
            <View style={styles.flagItem}>
              <Icon
                name={kitchen.isAcceptingOrders ? 'check-circle' : 'close-circle'}
                size={20}
                color={kitchen.isAcceptingOrders ? colors.success : colors.error}
              />
              <Text style={styles.flagLabel}>
                {kitchen.isAcceptingOrders ? 'Accepting Orders' : 'Not Accepting Orders'}
              </Text>
            </View>
            <Switch
              value={kitchen.isAcceptingOrders}
              onValueChange={handleToggleAcceptingOrders}
              trackColor={{ false: colors.border, true: colors.successLight }}
              thumbColor={kitchen.isAcceptingOrders ? colors.success : colors.textMuted}
            />
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          {kitchen.description && (
            <View style={styles.infoRow}>
              <Icon name="information" size={18} color={colors.textSecondary} />
              <Text style={styles.infoText}>{kitchen.description}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Icon name="silverware-variant" size={18} color={colors.textSecondary} />
            <Text style={styles.infoText}>{kitchen.cuisineTypes.join(', ')}</Text>
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.infoRow}>
            <Icon name="map-marker" size={18} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoText}>{kitchen.address.addressLine1}</Text>
              {kitchen.address.addressLine2 && (
                <Text style={styles.infoText}>{kitchen.address.addressLine2}</Text>
              )}
              <Text style={styles.infoText}>
                {kitchen.address.locality}, {kitchen.address.city}
              </Text>
              <Text style={styles.infoText}>
                {kitchen.address.state} - {kitchen.address.pincode}
              </Text>
            </View>
          </View>
        </View>

        {/* Zones Served */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zones Served ({zones.length})</Text>
          {zones.length > 0 ? (
            zones.map((zone) => (
              <View key={zone._id} style={styles.zoneItem}>
                <View style={styles.zoneInfo}>
                  <Text style={styles.zonePincode}>{zone.pincode}</Text>
                  <Text style={styles.zoneName}>{zone.name}, {zone.city}</Text>
                </View>
                {zone.orderingEnabled ? (
                  <Icon name="check-circle" size={16} color={colors.success} />
                ) : (
                  <Icon name="close-circle" size={16} color={colors.error} />
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No zones assigned</Text>
          )}
        </View>

        {/* Operating Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          {kitchen.operatingHours.lunch && (
            <View style={styles.hoursRow}>
              <Icon name="food" size={18} color={colors.textSecondary} />
              <Text style={styles.hoursLabel}>Lunch:</Text>
              <Text style={styles.hoursValue}>
                {kitchen.operatingHours.lunch.startTime} - {kitchen.operatingHours.lunch.endTime}
              </Text>
            </View>
          )}
          {kitchen.operatingHours.dinner && (
            <View style={styles.hoursRow}>
              <Icon name="food-variant" size={18} color={colors.textSecondary} />
              <Text style={styles.hoursLabel}>Dinner:</Text>
              <Text style={styles.hoursValue}>
                {kitchen.operatingHours.dinner.startTime} - {kitchen.operatingHours.dinner.endTime}
              </Text>
            </View>
          )}
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          {kitchen.contactPhone && (
            <View style={styles.infoRow}>
              <Icon name="phone" size={18} color={colors.textSecondary} />
              <Text style={styles.infoText}>{kitchen.contactPhone}</Text>
            </View>
          )}
          {kitchen.contactEmail && (
            <View style={styles.infoRow}>
              <Icon name="email" size={18} color={colors.textSecondary} />
              <Text style={styles.infoText}>{kitchen.contactEmail}</Text>
            </View>
          )}
        </View>

        {/* Owner Details (for PARTNER) */}
        {kitchen.type === 'PARTNER' && (kitchen.ownerName || kitchen.ownerPhone) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Owner Details</Text>
            {kitchen.ownerName && (
              <View style={styles.infoRow}>
                <Icon name="account" size={18} color={colors.textSecondary} />
                <Text style={styles.infoText}>{kitchen.ownerName}</Text>
              </View>
            )}
            {kitchen.ownerPhone && (
              <View style={styles.infoRow}>
                <Icon name="phone" size={18} color={colors.textSecondary} />
                <Text style={styles.infoText}>{kitchen.ownerPhone}</Text>
              </View>
            )}
          </View>
        )}

        {/* Batch Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Batches</Text>
          <TouchableOpacity
            style={[styles.actionButton, styles.batchManagementButton]}
            onPress={() => navigation.navigate('BatchManagement', { kitchenId: kitchen._id, kitchenName: kitchen.name })}
          >
            <Icon name="truck-delivery" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionButtonText}>Manage Delivery Batches</Text>
              <Text style={styles.actionButtonSubtext}>Create and dispatch order batches</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          {kitchen.status !== 'PENDING_APPROVAL' && (
            <TouchableOpacity style={styles.actionButton} onPress={handleToggleStatus}>
              <Icon
                name={kitchen.status === 'ACTIVE' ? 'pause-circle' : 'play-circle'}
                size={20}
                color={kitchen.status === 'ACTIVE' ? colors.warning : colors.success}
              />
              <Text style={styles.actionButtonText}>
                {kitchen.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} Kitchen
              </Text>
            </TouchableOpacity>
          )}
          {kitchen.status !== 'SUSPENDED' && kitchen.status !== 'PENDING_APPROVAL' && (
            <TouchableOpacity style={styles.actionButton} onPress={handleSuspend}>
              <Icon name="block-helper" size={20} color={colors.error} />
              <Text style={styles.actionButtonText}>Suspend Kitchen</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  kitchenHeader: {
    backgroundColor: colors.card,
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: spacing.borderRadiusMd,
    marginBottom: spacing.md,
  },
  placeholderLogo: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kitchenName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  kitchenCode: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: spacing.borderRadiusSm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.card,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  flagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flagLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  zoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  zoneInfo: {
    flex: 1,
  },
  zonePincode: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  zoneName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  hoursLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    width: 60,
  },
  hoursValue: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    marginBottom: spacing.sm,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  batchManagementButton: {
    backgroundColor: colors.primaryLight || '#fff5f0',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pendingApprovalBanner: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  pendingApprovalContent: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  pendingApprovalTextContainer: {
    flex: 1,
  },
  pendingApprovalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 4,
  },
  pendingApprovalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  activateButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadiusMd,
    gap: spacing.sm,
  },
  activateButtonLargeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
