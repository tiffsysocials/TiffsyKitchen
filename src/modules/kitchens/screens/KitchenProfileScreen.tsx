/**
 * Kitchen Profile Screen
 * Displays kitchen details for Kitchen Staff (read-only)
 * Shows all information filled during kitchen onboarding
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
  TextInput,
  Platform,
  ToastAndroid,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { Header } from '../../../components/common/Header';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { Kitchen, Zone, Area, OperatingHours } from '../../../types/api.types';
import kitchenService from '../../../services/kitchen.service';
import { useAlert } from '../../../hooks/useAlert';

// Form interfaces
interface BasicInfoForm {
  name: string;
  description: string;
  cuisineTypes: string; // Comma-separated
}

interface ContactForm {
  contactPhone: string;
  contactEmail: string;
}

interface OperatingHoursForm {
  lunchStart: string;
  lunchEnd: string;
  dinnerStart: string;
  dinnerEnd: string;
  onDemandStart: string;
  onDemandEnd: string;
  onDemandAlwaysOpen: boolean;
}

interface KitchenProfileScreenProps {
  onMenuPress: () => void;
}

export const KitchenProfileScreen: React.FC<KitchenProfileScreenProps> = ({
  onMenuPress,
}) => {
  const { showError, showSuccess } = useAlert();
  const [kitchenId, setKitchenId] = React.useState<string | null>(null);
  const [userRole, setUserRole] = React.useState<'ADMIN' | 'KITCHEN_STAFF'>('KITCHEN_STAFF');

  // Edit state management
  const [editingSection, setEditingSection] = React.useState<string | null>(null);
  const [savingSection, setSavingSection] = React.useState<string | null>(null);

  // Form state for each section
  const [basicInfoForm, setBasicInfoForm] = React.useState<BasicInfoForm | null>(null);
  const [contactForm, setContactForm] = React.useState<ContactForm | null>(null);
  const [hoursForm, setHoursForm] = React.useState<OperatingHoursForm | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Load kitchen ID and user role from AsyncStorage
  React.useEffect(() => {
    const loadKitchenData = async () => {
      try {
        console.log('🔍 [KitchenProfile] Loading kitchen data from AsyncStorage...');
        const userData = await AsyncStorage.getItem('userData');
        const role = await AsyncStorage.getItem('adminRole');
        console.log('🔍 [KitchenProfile] userData:', userData);
        console.log('🔍 [KitchenProfile] adminRole:', role);

        if (userData) {
          const parsedData = JSON.parse(userData);
          console.log('🔍 [KitchenProfile] Parsed userData:', parsedData);
          console.log('🔍 [KitchenProfile] Kitchen ID:', parsedData.kitchenId);
          setKitchenId(parsedData.kitchenId);
        } else {
          console.warn('⚠️ [KitchenProfile] No userData found in AsyncStorage');
        }

        if (role === 'ADMIN' || role === 'KITCHEN_STAFF') {
          setUserRole(role);
          console.log('🔍 [KitchenProfile] User role:', role);
        }
      } catch (error) {
        console.error('❌ [KitchenProfile] Error loading kitchen data:', error);
      }
    };
    loadKitchenData();
  }, []);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['kitchenProfile', kitchenId],
    queryFn: async () => {
      console.log('🔍 [KitchenProfile] Fetching kitchen details for ID:', kitchenId);
      if (!kitchenId) {
        console.error('❌ [KitchenProfile] No kitchen ID available');
        throw new Error('Kitchen ID not found');
      }

      try {
        const response = await kitchenService.getKitchenById(kitchenId);
        console.log('✅ [KitchenProfile] Kitchen details fetched successfully:', response);
        return response;
      } catch (err) {
        console.error('❌ [KitchenProfile] Error fetching kitchen details:', err);
        throw err;
      }
    },
    enabled: !!kitchenId, // Only run query when kitchenId is available
  });

  const kitchen = data?.kitchen;

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

  const areas = kitchen?.areasServed
    ? Array.isArray(kitchen.areasServed)
      ? kitchen.areasServed.filter((a): a is Area => typeof a !== 'string')
      : []
    : [];
  const legacyZones = kitchen?.zonesServed
    ? Array.isArray(kitchen.zonesServed)
      ? kitchen.zonesServed.filter((z): z is Zone => typeof z !== 'string')
      : []
    : [];

  // Get initials from kitchen name
  const getInitials = (name: string) => {
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  // Validation functions
  const validateBasicInfo = (data: BasicInfoForm): Record<string, string> => {
    const validationErrors: Record<string, string> = {};

    if (!data.name || data.name.trim().length < 3) {
      validationErrors.name = 'Name must be at least 3 characters';
    } else if (data.name.length > 100) {
      validationErrors.name = 'Name must not exceed 100 characters';
    }

    if (data.description && data.description.length > 500) {
      validationErrors.description = 'Description must not exceed 500 characters';
    }

    if (!data.cuisineTypes || data.cuisineTypes.trim().length === 0) {
      validationErrors.cuisineTypes = 'At least one cuisine type is required';
    }

    return validationErrors;
  };

  const validateContact = (data: ContactForm): Record<string, string> => {
    const validationErrors: Record<string, string> = {};

    if (data.contactPhone) {
      const phoneRegex = /^\d{10,15}$/;
      const cleanPhone = data.contactPhone.replace(/\s/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        validationErrors.contactPhone = 'Phone must be 10-15 digits';
      }
    }

    if (data.contactEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.contactEmail)) {
        validationErrors.contactEmail = 'Invalid email format';
      } else if (data.contactEmail.length > 100) {
        validationErrors.contactEmail = 'Email must not exceed 100 characters';
      }
    }

    return validationErrors;
  };

  const validateOperatingHours = (data: OperatingHoursForm): Record<string, string> => {
    const validationErrors: Record<string, string> = {};
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    // Validate lunch times if provided
    if (data.lunchStart || data.lunchEnd) {
      if (!data.lunchStart) {
        validationErrors.lunchStart = 'Lunch start time is required';
      } else if (!timeRegex.test(data.lunchStart)) {
        validationErrors.lunchStart = 'Invalid time format (HH:MM)';
      }

      if (!data.lunchEnd) {
        validationErrors.lunchEnd = 'Lunch end time is required';
      } else if (!timeRegex.test(data.lunchEnd)) {
        validationErrors.lunchEnd = 'Invalid time format (HH:MM)';
      }

      if (data.lunchStart && data.lunchEnd && data.lunchStart >= data.lunchEnd) {
        validationErrors.lunchEnd = 'End time must be after start time';
      }
    }

    // Validate dinner times if provided
    if (data.dinnerStart || data.dinnerEnd) {
      if (!data.dinnerStart) {
        validationErrors.dinnerStart = 'Dinner start time is required';
      } else if (!timeRegex.test(data.dinnerStart)) {
        validationErrors.dinnerStart = 'Invalid time format (HH:MM)';
      }

      if (!data.dinnerEnd) {
        validationErrors.dinnerEnd = 'Dinner end time is required';
      } else if (!timeRegex.test(data.dinnerEnd)) {
        validationErrors.dinnerEnd = 'Invalid time format (HH:MM)';
      }

      if (data.dinnerStart && data.dinnerEnd && data.dinnerStart >= data.dinnerEnd) {
        validationErrors.dinnerEnd = 'End time must be after start time';
      }
    }

    // Validate on-demand times if not always open
    if (!data.onDemandAlwaysOpen && (data.onDemandStart || data.onDemandEnd)) {
      if (!data.onDemandStart) {
        validationErrors.onDemandStart = 'On-demand start time is required';
      } else if (!timeRegex.test(data.onDemandStart)) {
        validationErrors.onDemandStart = 'Invalid time format (HH:MM)';
      }

      if (!data.onDemandEnd) {
        validationErrors.onDemandEnd = 'On-demand end time is required';
      } else if (!timeRegex.test(data.onDemandEnd)) {
        validationErrors.onDemandEnd = 'Invalid time format (HH:MM)';
      }

      if (data.onDemandStart && data.onDemandEnd && data.onDemandStart >= data.onDemandEnd) {
        validationErrors.onDemandEnd = 'End time must be after start time';
      }
    }

    return validationErrors;
  };

  // Edit handlers
  const handleEditSection = (sectionId: string) => {
    if (!kitchen) return;

    // Initialize form data based on section
    switch (sectionId) {
      case 'basicInfo':
        setBasicInfoForm({
          name: kitchen.name,
          description: kitchen.description || '',
          cuisineTypes: kitchen.cuisineTypes.join(', '),
        });
        break;
      case 'contact':
        setContactForm({
          contactPhone: kitchen.contactPhone || '',
          contactEmail: kitchen.contactEmail || '',
        });
        break;
      case 'hours':
        setHoursForm({
          lunchStart: kitchen.operatingHours.lunch?.startTime || '',
          lunchEnd: kitchen.operatingHours.lunch?.endTime || '',
          dinnerStart: kitchen.operatingHours.dinner?.startTime || '',
          dinnerEnd: kitchen.operatingHours.dinner?.endTime || '',
          onDemandStart: kitchen.operatingHours.onDemand?.startTime || '',
          onDemandEnd: kitchen.operatingHours.onDemand?.endTime || '',
          onDemandAlwaysOpen: kitchen.operatingHours.onDemand?.isAlwaysOpen || false,
        });
        break;
    }

    setEditingSection(sectionId);
    setErrors({});
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setBasicInfoForm(null);
    setContactForm(null);
    setHoursForm(null);
    setErrors({});
  };

  const handleSaveSection = async (sectionId: string) => {
    if (!kitchenId) return;

    try {
      setSavingSection(sectionId);

      switch (sectionId) {
        case 'basicInfo':
          if (!basicInfoForm) return;
          const basicErrors = validateBasicInfo(basicInfoForm);
          if (Object.keys(basicErrors).length > 0) {
            setErrors(basicErrors);
            showError('Validation Error', 'Please fix the errors before saving');
            setSavingSection(null);
            return;
          }

          // Use appropriate endpoint based on user role
          if (userRole === 'KITCHEN_STAFF') {
            await kitchenService.updateMyKitchen({
              name: basicInfoForm.name.trim(),
              description: basicInfoForm.description.trim(),
              cuisineTypes: basicInfoForm.cuisineTypes.split(',').map(c => c.trim()).filter(c => c),
            });
          } else {
            await kitchenService.updateKitchen(kitchenId, {
              name: basicInfoForm.name.trim(),
              description: basicInfoForm.description.trim(),
              cuisineTypes: basicInfoForm.cuisineTypes.split(',').map(c => c.trim()).filter(c => c),
            });
          }
          break;

        case 'contact':
          if (!contactForm) return;
          const contactErrors = validateContact(contactForm);
          if (Object.keys(contactErrors).length > 0) {
            setErrors(contactErrors);
            showError('Validation Error', 'Please fix the errors before saving');
            setSavingSection(null);
            return;
          }

          // Use appropriate endpoint based on user role
          if (userRole === 'KITCHEN_STAFF') {
            await kitchenService.updateMyKitchen({
              contactPhone: contactForm.contactPhone.trim(),
              contactEmail: contactForm.contactEmail.trim(),
            });
          } else {
            await kitchenService.updateKitchen(kitchenId, {
              contactPhone: contactForm.contactPhone.trim(),
              contactEmail: contactForm.contactEmail.trim(),
            });
          }
          break;

        case 'hours':
          if (!hoursForm) return;
          const hoursErrors = validateOperatingHours(hoursForm);
          if (Object.keys(hoursErrors).length > 0) {
            setErrors(hoursErrors);
            showError('Validation Error', 'Please fix the errors before saving');
            setSavingSection(null);
            return;
          }

          const operatingHours: OperatingHours = {};
          if (hoursForm.lunchStart && hoursForm.lunchEnd) {
            operatingHours.lunch = {
              startTime: hoursForm.lunchStart,
              endTime: hoursForm.lunchEnd,
            };
          }
          if (hoursForm.dinnerStart && hoursForm.dinnerEnd) {
            operatingHours.dinner = {
              startTime: hoursForm.dinnerStart,
              endTime: hoursForm.dinnerEnd,
            };
          }
          if (hoursForm.onDemandAlwaysOpen || (hoursForm.onDemandStart && hoursForm.onDemandEnd)) {
            operatingHours.onDemand = {
              startTime: hoursForm.onDemandStart,
              endTime: hoursForm.onDemandEnd,
              isAlwaysOpen: hoursForm.onDemandAlwaysOpen,
            };
          }

          // Use appropriate endpoint based on user role
          if (userRole === 'KITCHEN_STAFF') {
            await kitchenService.updateMyKitchen({ operatingHours });
          } else {
            await kitchenService.updateKitchen(kitchenId, { operatingHours });
          }
          break;

        case 'orderAcceptance':
          await kitchenService.toggleAcceptingOrders(
            kitchenId,
            !kitchen?.isAcceptingOrders
          );
          break;
      }

      // Refresh data
      await refetch();

      // Exit edit mode
      handleCancelEdit();

      // Show success message
      if (Platform.OS === 'android') {
        ToastAndroid.show('Updated successfully', ToastAndroid.SHORT);
      } else {
        showSuccess('Success', 'Updated successfully');
      }

    } catch (error) {
      console.error('❌ [KitchenProfile] Error saving section:', error);
      showError('Error', 'Failed to update. Please try again.');
    } finally {
      setSavingSection(null);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaScreen
        topBackgroundColor={colors.primary}
        bottomBackgroundColor={colors.background}
      >
        <Header title="Kitchen Profile" onMenuPress={onMenuPress} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading kitchen profile...</Text>
        </View>
      </SafeAreaScreen>
    );
  }

  if (error || (!isLoading && !kitchen)) {
    console.log('❌ [KitchenProfile] Error state:', { error, kitchen, kitchenId, isLoading });

    return (
      <SafeAreaScreen
        topBackgroundColor={colors.primary}
        bottomBackgroundColor={colors.background}
      >
        <Header title="Kitchen Profile" onMenuPress={onMenuPress} />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Failed to load profile</Text>
          <Text style={styles.errorMessage}>
            {error instanceof Error
              ? error.message
              : !kitchenId
              ? 'Kitchen ID not found in user data'
              : 'An error occurred while fetching kitchen details'}
          </Text>
          {error && (
            <Text style={styles.errorDetails}>
              {JSON.stringify(error, null, 2)}
            </Text>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Icon name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen
      topBackgroundColor={colors.primary}
      bottomBackgroundColor={colors.background}
    >
      <Header title="Kitchen Profile" onMenuPress={onMenuPress} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Kitchen Header */}
        <View style={styles.kitchenHeader}>
          {/* Kitchen Name Letters Avatar */}
          <View style={styles.nameAvatar}>
            <Text style={styles.nameAvatarText}>{getInitials(kitchen.name)}</Text>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.kitchenName}>{kitchen.name}</Text>
            {editingSection !== 'basicInfo' && (
              <TouchableOpacity onPress={() => handleEditSection('basicInfo')} style={styles.nameEditButton}>
                <Icon name="pencil" size={18} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
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

        {/* Quality Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quality Badges</Text>
          <View style={styles.badgeGrid}>
            {kitchen.authorizedFlag && (
              <View style={styles.qualityBadgeItem}>
                <Icon name="check-decagram" size={24} color={colors.success} />
                <Text style={styles.qualityBadgeText}>Authorized</Text>
              </View>
            )}
            {kitchen.premiumFlag && (
              <View style={styles.qualityBadgeItem}>
                <Icon name="star" size={24} color={colors.warning} />
                <Text style={styles.qualityBadgeText}>Premium</Text>
              </View>
            )}
            {kitchen.gourmetFlag && (
              <View style={styles.qualityBadgeItem}>
                <Icon name="chef-hat" size={24} color={colors.secondary} />
                <Text style={styles.qualityBadgeText}>Gourmet</Text>
              </View>
            )}
            {!kitchen.authorizedFlag && !kitchen.premiumFlag && !kitchen.gourmetFlag && (
              <Text style={styles.emptyText}>No quality badges assigned</Text>
            )}
          </View>
        </View>

        {/* Order Acceptance Status */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { marginBottom: spacing.xs }]}>
            <Text style={styles.sectionTitle}>Order Acceptance</Text>
            {savingSection === 'orderAcceptance' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={kitchen.isAcceptingOrders}
                onValueChange={() => handleSaveSection('orderAcceptance')}
                trackColor={{ false: '#d1d5db', true: colors.success }}
                thumbColor={kitchen.isAcceptingOrders ? '#fff' : '#f3f4f6'}
                ios_backgroundColor="#d1d5db"
                disabled={savingSection === 'orderAcceptance'}
              />
            )}
          </View>
          <View style={styles.statusRow}>
            <Icon
              name={kitchen.isAcceptingOrders ? 'check-circle' : 'close-circle'}
              size={24}
              color={kitchen.isAcceptingOrders ? colors.success : colors.error}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: kitchen.isAcceptingOrders ? colors.success : colors.error,
                },
              ]}
            >
              {kitchen.isAcceptingOrders ? 'Accepting Orders' : 'Not Accepting Orders'}
            </Text>
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            {editingSection !== 'basicInfo' && (
              <TouchableOpacity onPress={() => handleEditSection('basicInfo')}>
                <Icon name="pencil" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {editingSection === 'basicInfo' ? (
            <>
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Kitchen Name *</Text>
                  <TextInput
                    style={[styles.input, errors.name && styles.inputError]}
                    value={basicInfoForm?.name}
                    onChangeText={(text) => setBasicInfoForm(prev => prev ? {...prev, name: text} : null)}
                    placeholder="Enter kitchen name"
                  />
                  {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput, errors.description && styles.inputError]}
                    value={basicInfoForm?.description}
                    onChangeText={(text) => setBasicInfoForm(prev => prev ? {...prev, description: text} : null)}
                    placeholder="Enter description"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Cuisine Types (comma-separated) *</Text>
                  <TextInput
                    style={[styles.input, errors.cuisineTypes && styles.inputError]}
                    value={basicInfoForm?.cuisineTypes}
                    onChangeText={(text) => setBasicInfoForm(prev => prev ? {...prev, cuisineTypes: text} : null)}
                    placeholder="e.g. Italian, Chinese, Indian"
                  />
                  {errors.cuisineTypes && <Text style={styles.errorText}>{errors.cuisineTypes}</Text>}
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={handleCancelEdit}
                  style={[styles.button, styles.cancelButton]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSaveSection('basicInfo')}
                  style={[styles.button, styles.saveButton]}
                  disabled={savingSection === 'basicInfo'}
                >
                  {savingSection === 'basicInfo' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {kitchen.description && (
                <View style={styles.infoRow}>
                  <Icon name="information" size={18} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{kitchen.description}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Icon name="silverware-variant" size={18} color={colors.textSecondary} />
                <Text style={styles.infoText}>
                  {kitchen.cuisineTypes.length > 0
                    ? kitchen.cuisineTypes.join(', ')
                    : 'No cuisine types specified'}
                </Text>
              </View>
            </>
          )}
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
              {kitchen.address.coordinates && (
                <Text style={styles.coordinatesText}>
                  📍 {kitchen.address.coordinates.latitude.toFixed(6)},{' '}
                  {kitchen.address.coordinates.longitude.toFixed(6)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Areas Served */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Areas Served ({areas.length > 0 ? areas.length : legacyZones.length})
          </Text>
          {areas.length > 0 ? (
            areas.map((area) => (
              <View key={area._id} style={styles.zoneItem}>
                <View style={styles.zoneInfo}>
                  <Text style={styles.zonePincode}>{area.name}</Text>
                  <Text style={styles.zoneName}>
                    {[area.city, area.state].filter(Boolean).join(', ') || '—'}
                  </Text>
                </View>
                <Icon name="check-circle" size={16} color={colors.success} />
              </View>
            ))
          ) : legacyZones.length > 0 ? (
            legacyZones.map((zone) => (
              <View key={zone._id} style={styles.zoneItem}>
                <View style={styles.zoneInfo}>
                  {zone.pincode && (
                    <Text style={styles.zonePincode}>
                      Pincode: {zone.pincode}
                    </Text>
                  )}
                  <Text style={styles.zoneName}>
                    {zone.name}, {zone.city}
                  </Text>
                </View>
                {zone.orderingEnabled ? (
                  <Icon name="check-circle" size={16} color={colors.success} />
                ) : (
                  <Icon name="close-circle" size={16} color={colors.error} />
                )}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No areas assigned</Text>
          )}
        </View>

        {/* Operating Hours */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Operating Hours</Text>
            {editingSection !== 'hours' && (
              <TouchableOpacity onPress={() => handleEditSection('hours')}>
                <Icon name="pencil" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {editingSection === 'hours' ? (
            <>
              <View style={styles.form}>
                {/* Lunch Hours */}
                <View style={styles.timeSection}>
                  <Text style={styles.timeSectionTitle}>Lunch Hours</Text>
                  <View style={styles.timeRow}>
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.inputLabel}>Start Time</Text>
                      <TextInput
                        style={[styles.input, errors.lunchStart && styles.inputError]}
                        value={hoursForm?.lunchStart}
                        onChangeText={(text) => setHoursForm(prev => prev ? {...prev, lunchStart: text} : null)}
                        placeholder="HH:MM"
                        keyboardType="numeric"
                        maxLength={5}
                      />
                      {errors.lunchStart && <Text style={styles.errorText}>{errors.lunchStart}</Text>}
                    </View>
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.inputLabel}>End Time</Text>
                      <TextInput
                        style={[styles.input, errors.lunchEnd && styles.inputError]}
                        value={hoursForm?.lunchEnd}
                        onChangeText={(text) => setHoursForm(prev => prev ? {...prev, lunchEnd: text} : null)}
                        placeholder="HH:MM"
                        keyboardType="numeric"
                        maxLength={5}
                      />
                      {errors.lunchEnd && <Text style={styles.errorText}>{errors.lunchEnd}</Text>}
                    </View>
                  </View>
                </View>

                {/* Dinner Hours */}
                <View style={styles.timeSection}>
                  <Text style={styles.timeSectionTitle}>Dinner Hours</Text>
                  <View style={styles.timeRow}>
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.inputLabel}>Start Time</Text>
                      <TextInput
                        style={[styles.input, errors.dinnerStart && styles.inputError]}
                        value={hoursForm?.dinnerStart}
                        onChangeText={(text) => setHoursForm(prev => prev ? {...prev, dinnerStart: text} : null)}
                        placeholder="HH:MM"
                        keyboardType="numeric"
                        maxLength={5}
                      />
                      {errors.dinnerStart && <Text style={styles.errorText}>{errors.dinnerStart}</Text>}
                    </View>
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.inputLabel}>End Time</Text>
                      <TextInput
                        style={[styles.input, errors.dinnerEnd && styles.inputError]}
                        value={hoursForm?.dinnerEnd}
                        onChangeText={(text) => setHoursForm(prev => prev ? {...prev, dinnerEnd: text} : null)}
                        placeholder="HH:MM"
                        keyboardType="numeric"
                        maxLength={5}
                      />
                      {errors.dinnerEnd && <Text style={styles.errorText}>{errors.dinnerEnd}</Text>}
                    </View>
                  </View>
                </View>

                {/* On-Demand Hours */}
                <View style={styles.timeSection}>
                  <Text style={styles.timeSectionTitle}>On-Demand Hours</Text>
                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setHoursForm(prev => prev ? {...prev, onDemandAlwaysOpen: !prev.onDemandAlwaysOpen} : null)}
                  >
                    <View style={[styles.checkbox, hoursForm?.onDemandAlwaysOpen && styles.checkboxChecked]}>
                      {hoursForm?.onDemandAlwaysOpen && (
                        <Icon name="check" size={16} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.checkboxLabel}>Always Open</Text>
                  </TouchableOpacity>

                  {!hoursForm?.onDemandAlwaysOpen && (
                    <View style={styles.timeRow}>
                      <View style={styles.timeInputContainer}>
                        <Text style={styles.inputLabel}>Start Time</Text>
                        <TextInput
                          style={[styles.input, errors.onDemandStart && styles.inputError]}
                          value={hoursForm?.onDemandStart}
                          onChangeText={(text) => setHoursForm(prev => prev ? {...prev, onDemandStart: text} : null)}
                          placeholder="HH:MM"
                          keyboardType="numeric"
                          maxLength={5}
                        />
                        {errors.onDemandStart && <Text style={styles.errorText}>{errors.onDemandStart}</Text>}
                      </View>
                      <View style={styles.timeInputContainer}>
                        <Text style={styles.inputLabel}>End Time</Text>
                        <TextInput
                          style={[styles.input, errors.onDemandEnd && styles.inputError]}
                          value={hoursForm?.onDemandEnd}
                          onChangeText={(text) => setHoursForm(prev => prev ? {...prev, onDemandEnd: text} : null)}
                          placeholder="HH:MM"
                          keyboardType="numeric"
                          maxLength={5}
                        />
                        {errors.onDemandEnd && <Text style={styles.errorText}>{errors.onDemandEnd}</Text>}
                      </View>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={handleCancelEdit}
                  style={[styles.button, styles.cancelButton]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSaveSection('hours')}
                  style={[styles.button, styles.saveButton]}
                  disabled={savingSection === 'hours'}
                >
                  {savingSection === 'hours' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {kitchen.operatingHours.lunch && (
                <View style={styles.hoursRow}>
                  <Icon name="food" size={18} color={colors.textSecondary} />
                  <Text style={styles.hoursLabel}>Lunch:</Text>
                  <Text style={styles.hoursValue}>
                    {kitchen.operatingHours.lunch.startTime} -{' '}
                    {kitchen.operatingHours.lunch.endTime}
                  </Text>
                </View>
              )}
              {kitchen.operatingHours.dinner && (
                <View style={styles.hoursRow}>
                  <Icon name="food-variant" size={18} color={colors.textSecondary} />
                  <Text style={styles.hoursLabel}>Dinner:</Text>
                  <Text style={styles.hoursValue}>
                    {kitchen.operatingHours.dinner.startTime} -{' '}
                    {kitchen.operatingHours.dinner.endTime}
                  </Text>
                </View>
              )}
              {kitchen.operatingHours.onDemand && (
                <View style={styles.hoursRow}>
                  <Icon name="clock-fast" size={18} color={colors.textSecondary} />
                  <Text style={styles.hoursLabel}>On-Demand:</Text>
                  {kitchen.operatingHours.onDemand.isAlwaysOpen ? (
                    <Text style={styles.hoursValue}>Always Open</Text>
                  ) : (
                    <Text style={styles.hoursValue}>
                      {kitchen.operatingHours.onDemand.startTime} -{' '}
                      {kitchen.operatingHours.onDemand.endTime}
                    </Text>
                  )}
                </View>
              )}
              {!kitchen.operatingHours.lunch &&
                !kitchen.operatingHours.dinner &&
                !kitchen.operatingHours.onDemand && (
                  <Text style={styles.emptyText}>No operating hours configured</Text>
                )}
            </>
          )}
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            {editingSection !== 'contact' && (
              <TouchableOpacity onPress={() => handleEditSection('contact')}>
                <Icon name="pencil" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {editingSection === 'contact' ? (
            <>
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Contact Phone</Text>
                  <TextInput
                    style={[styles.input, errors.contactPhone && styles.inputError]}
                    value={contactForm?.contactPhone}
                    onChangeText={(text) => setContactForm(prev => prev ? {...prev, contactPhone: text} : null)}
                    placeholder="Enter contact phone"
                    keyboardType="phone-pad"
                  />
                  {errors.contactPhone && <Text style={styles.errorText}>{errors.contactPhone}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Contact Email</Text>
                  <TextInput
                    style={[styles.input, errors.contactEmail && styles.inputError]}
                    value={contactForm?.contactEmail}
                    onChangeText={(text) => setContactForm(prev => prev ? {...prev, contactEmail: text} : null)}
                    placeholder="Enter contact email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {errors.contactEmail && <Text style={styles.errorText}>{errors.contactEmail}</Text>}
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={handleCancelEdit}
                  style={[styles.button, styles.cancelButton]}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSaveSection('contact')}
                  style={[styles.button, styles.saveButton]}
                  disabled={savingSection === 'contact'}
                >
                  {savingSection === 'contact' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {kitchen.contactPhone ? (
                <View style={styles.infoRow}>
                  <Icon name="phone" size={18} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{kitchen.contactPhone}</Text>
                </View>
              ) : null}
              {kitchen.contactEmail ? (
                <View style={styles.infoRow}>
                  <Icon name="email" size={18} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{kitchen.contactEmail}</Text>
                </View>
              ) : null}
              {!kitchen.contactPhone && !kitchen.contactEmail && (
                <Text style={styles.emptyText}>No contact information provided</Text>
              )}
            </>
          )}
        </View>

        {/* Owner Details (for PARTNER kitchens) */}
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

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          {kitchen.createdAt && (
            <View style={styles.infoRow}>
              <Icon name="calendar-plus" size={18} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                Created: {new Date(kitchen.createdAt).toLocaleDateString()}
              </Text>
            </View>
          )}
          {kitchen.approvedAt && (
            <View style={styles.infoRow}>
              <Icon name="check-circle" size={18} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                Approved: {new Date(kitchen.approvedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Padding */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
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
  errorDetails: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'left',
    marginTop: spacing.sm,
    fontFamily: 'monospace',
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusSm,
    maxWidth: '90%',
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
  kitchenHeader: {
    backgroundColor: colors.card,
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nameAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  nameAvatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kitchenName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  nameEditButton: {
    padding: spacing.xs,
    marginBottom: 4,
  },
  kitchenCode: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: spacing.borderRadiusSm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
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
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  qualityBadgeItem: {
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    minWidth: 100,
  },
  qualityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
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
    lineHeight: 20,
  },
  coordinatesText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    fontFamily: 'monospace',
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
    marginTop: 2,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  hoursLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    width: 80,
  },
  hoursValue: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  // Edit mode styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: spacing.sm,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadiusMd,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleButton: {
    padding: spacing.xs,
  },
  // Operating hours edit styles
  timeSection: {
    marginBottom: spacing.md,
  },
  timeSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeInputContainer: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
});
