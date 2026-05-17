import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ToastAndroid,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { useAlert } from '../../../hooks/useAlert';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Area, Kitchen, KitchenType, NearbyArea, Zone } from '../../../types/api.types';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { AreaPickerModal } from './AreaPickerModal';
import { AreaMapPreview } from './AreaMapPreview';
import areaService from '../../../services/area.service';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { TimePickerField } from '../../../components/common/TimePickerField';
import { INDIAN_STATES, getCitiesForState } from '../../../utils/indiaLocations';

export interface KitchenFormState {
  name: string;
  type: KitchenType;
  description: string;
  cuisineTypes: string;
  addressLine1: string;
  addressLine2: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  serviceableAreas: string[];
  lunchStartTime: string;
  lunchEndTime: string;
  dinnerStartTime: string;
  dinnerEndTime: string;
  onDemandStartTime: string;
  onDemandEndTime: string;
  isAlwaysOpen: boolean;
  contactPhone: string;
  contactEmail: string;
  ownerName: string;
  ownerPhone: string;
  latitude: string;
  longitude: string;
  autoAcceptRadiusKm: string;
  maxDeliveryRadiusKm: string;
}

interface KitchenFormModalProps {
  visible: boolean;
  kitchen: Kitchen | null;
  onClose: () => void;
  onSave: (formData: KitchenFormState) => Promise<void>;
}

const CUISINE_SUGGESTIONS = [
  'North Indian',
  'South Indian',
  'Chinese',
  'Continental',
  'Mughlai',
  'Italian',
  'Mexican',
  'Thai',
];

export const KitchenFormModal: React.FC<KitchenFormModalProps> = ({
  visible,
  kitchen,
  onClose,
  onSave,
}) => {
  const { showError, showSuccess } = useAlert();
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [areaPickerVisible, setAreaPickerVisible] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<Array<NearbyArea | Area>>([]);
  const [areaMapAreas, setAreaMapAreas] = useState<Area[]>([]);
  const [formData, setFormData] = useState<KitchenFormState>({
    name: '',
    type: 'PARTNER',
    description: '',
    cuisineTypes: '',
    addressLine1: '',
    addressLine2: '',
    locality: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    serviceableAreas: [],
    lunchStartTime: '11:00',
    lunchEndTime: '15:00',
    dinnerStartTime: '19:00',
    dinnerEndTime: '23:00',
    onDemandStartTime: '10:00',
    onDemandEndTime: '22:00',
    isAlwaysOpen: false,
    contactPhone: '',
    contactEmail: '',
    ownerName: '',
    ownerPhone: '',
    latitude: '',
    longitude: '',
    autoAcceptRadiusKm: '5',
    maxDeliveryRadiusKm: '10',
  });

  useEffect(() => {
    if (visible && kitchen) {
      // Pre-fill from populated areasServed; fall back to legacy zonesServed pincodes
      // (reverse-map handled in a separate effect below).
      const populatedAreas = Array.isArray(kitchen.areasServed)
        ? (kitchen.areasServed as Area[]).filter(
            (a): a is Area => typeof a === 'object' && a !== null && !!a._id,
          )
        : [];
      const areaIds = populatedAreas.map((a) => a._id);
      setSelectedAreas(populatedAreas);
      const withCoords = populatedAreas.filter((a) => !!a.coordinates);
      if (withCoords.length === populatedAreas.length) {
        setAreaMapAreas(withCoords);
      } else if (areaIds.length > 0) {
        areaService.getAreasByIds(areaIds).then((full) => {
          setAreaMapAreas(full.filter((a) => !!a.coordinates));
        }).catch(() => {});
      }

      setFormData({
        name: kitchen.name,
        type: kitchen.type,
        description: kitchen.description || '',
        cuisineTypes: kitchen.cuisineTypes.join(', '),
        addressLine1: kitchen.address.addressLine1,
        addressLine2: kitchen.address.addressLine2 || '',
        locality: kitchen.address.locality,
        city: kitchen.address.city,
        state: kitchen.address.state || 'Maharashtra',
        pincode: kitchen.address.pincode,
        serviceableAreas: areaIds,
        lunchStartTime: kitchen.operatingHours.lunch?.startTime || '11:00',
        lunchEndTime: kitchen.operatingHours.lunch?.endTime || '15:00',
        dinnerStartTime: kitchen.operatingHours.dinner?.startTime || '19:00',
        dinnerEndTime: kitchen.operatingHours.dinner?.endTime || '23:00',
        onDemandStartTime: kitchen.operatingHours.onDemand?.startTime || '10:00',
        onDemandEndTime: kitchen.operatingHours.onDemand?.endTime || '22:00',
        isAlwaysOpen: kitchen.operatingHours.onDemand?.isAlwaysOpen || false,
        contactPhone: kitchen.contactPhone || '',
        contactEmail: kitchen.contactEmail || '',
        ownerName: kitchen.ownerName || '',
        ownerPhone: kitchen.ownerPhone || '',
        latitude: kitchen.address?.coordinates?.latitude?.toString() || '',
        longitude: kitchen.address?.coordinates?.longitude?.toString() || '',
        autoAcceptRadiusKm: kitchen.deliveryConfig?.autoAcceptRadiusKm?.toString() || '5',
        maxDeliveryRadiusKm: kitchen.deliveryConfig?.maxDeliveryRadiusKm?.toString() || '10',
      });
    } else if (visible && !kitchen) {
      // Reset for creating new kitchen
      setSelectedAreas([]);
      setAreaMapAreas([]);
      setFormData({
        name: '',
        type: 'PARTNER',
        description: '',
        cuisineTypes: '',
        addressLine1: '',
        addressLine2: '',
        locality: '',
        city: '',
        state: 'Maharashtra',
        pincode: '',
        serviceableAreas: [],
        lunchStartTime: '11:00',
        lunchEndTime: '15:00',
        dinnerStartTime: '19:00',
        dinnerEndTime: '23:00',
        onDemandStartTime: '10:00',
        onDemandEndTime: '22:00',
        isAlwaysOpen: false,
        contactPhone: '',
        contactEmail: '',
        ownerName: '',
        ownerPhone: '',
        latitude: '',
        longitude: '',
        autoAcceptRadiusKm: '5',
        maxDeliveryRadiusKm: '10',
      });
    }
  }, [visible, kitchen]);

  // Legacy reverse-map: kitchens created before the areas pivot only have
  // zonesServed (pincode-based). On open, map those pincodes to areas so the
  // admin can see and confirm the migrated coverage.
  useEffect(() => {
    if (!visible || !kitchen) return;
    const hasAreas = Array.isArray(kitchen.areasServed) && kitchen.areasServed.length > 0;
    if (hasAreas) return;
    const legacyPincodes = Array.isArray(kitchen.zonesServed)
      ? (kitchen.zonesServed as Zone[])
          .filter((z): z is Zone => typeof z === 'object' && z !== null && !!z.pincode)
          .map((z) => z.pincode)
      : [];
    if (legacyPincodes.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const areas = await areaService.mapPincodesToAreas(legacyPincodes);
        if (cancelled || areas.length === 0) return;
        setSelectedAreas(areas);
        setFormData((prev) => ({
          ...prev,
          serviceableAreas: areas.map((a) => a._id),
        }));
        showSuccess(
          'Coverage migrated',
          `Mapped ${legacyPincodes.length} legacy pincode${legacyPincodes.length === 1 ? '' : 's'} to ${areas.length} area${areas.length === 1 ? '' : 's'}. Review and save.`,
        );
      } catch (err) {
        console.error('Pincode→area reverse-map failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, kitchen, showSuccess]);

  const updateField = (field: keyof KitchenFormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Reverse-geocode lat/lng to a postal address using OpenStreetMap Nominatim
   * (free, no API key required). Best-effort: silently no-ops on failure.
   */
  /**
   * Reverse-geocode lat/lng to a postal address via the backend's Google
   * Geocoding proxy (`GET /api/areas/reverse-geocode`). Backend holds the
   * GOOGLE_MAPS_API_KEY so it never ships in the app bundle.
   */
  const reverseGeocodeAndFillAddress = async (latitude: number, longitude: number) => {
    const tag = '[DetectLocation/Google]';
    console.log(`${tag} REQUEST →`, { latitude, longitude });

    try {
      const startedAt = Date.now();
      const result = await areaService.reverseGeocode(latitude, longitude);
      const elapsedMs = Date.now() - startedAt;
      console.log(`${tag} response (${elapsedMs} ms) →`, result);

      const {
        addressLine1,
        addressLine2,
        locality,
        city,
        state,
        pincode,
        formattedAddress,
      } = result;

      const parsed = {
        addressLine1,
        addressLine2,
        locality,
        city,
        state,
        pincode,
        pincodeAccepted: !!(pincode && /^\d{6}$/.test(pincode)),
        formattedAddress,
      };
      console.log(`${tag} parsed → form fill plan:`, parsed);

      setFormData((prev) => ({
        ...prev,
        addressLine1: addressLine1 || prev.addressLine1,
        addressLine2: addressLine2 || prev.addressLine2,
        locality: locality || prev.locality,
        city: city || prev.city,
        state: state || prev.state,
        pincode: pincode && /^\d{6}$/.test(pincode) ? pincode : prev.pincode,
      }));

      console.log(`${tag} filled form successfully`);
      return true;
    } catch (error: any) {
      console.warn(`${tag} request failed:`, error?.message || error);
      return false;
    }
  };

  const detectLocation = async () => {
    try {
      setDetectingLocation(true);

      // Request permission on Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to detect kitchen coordinates.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          showError('Permission Denied', 'Location permission is required to detect coordinates.');
          setDetectingLocation(false);
          return;
        }
      }

      console.log('[DetectLocation] requesting GPS fix…');
      Geolocation.getCurrentPosition(
        async (position) => {
          console.log('[DetectLocation] GPS position →', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          });
          const { latitude, longitude } = position.coords;
          updateField('latitude', latitude.toFixed(6));
          updateField('longitude', longitude.toFixed(6));

          const filled = await reverseGeocodeAndFillAddress(latitude, longitude);
          console.log('[DetectLocation] reverse-geocode filled?', filled);

          setDetectingLocation(false);
          if (Platform.OS === 'android') {
            ToastAndroid.show(
              filled ? 'Location & address detected' : 'Location detected (address lookup failed)',
              ToastAndroid.SHORT,
            );
          }
        },
        (error) => {
          console.error('[DetectLocation] Geolocation error:', {
            code: error.code,
            message: error.message,
          });
          setDetectingLocation(false);
          showError('Location Error', 'Could not detect location. Please enter coordinates manually.');
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        },
      );
    } catch (error) {
      console.error('detectLocation error:', error);
      setDetectingLocation(false);
      showError('Error', 'Failed to detect location.');
    }
  };

  const validateForm = (): boolean => {
    // 1. Kitchen Name Validation
    if (!formData.name || !formData.name.trim()) {
      showToast('Kitchen name is required', 'error');
      return false;
    }
    if (formData.name.trim().length < 3) {
      showToast('Kitchen name must be at least 3 characters', 'error');
      return false;
    }
    if (formData.name.trim().length > 100) {
      showToast('Kitchen name must not exceed 100 characters', 'error');
      return false;
    }

    // 2. Kitchen Type Validation
    if (!formData.type || (formData.type !== 'TIFFSY' && formData.type !== 'PARTNER')) {
      showToast('Please select a valid kitchen type', 'error');
      return false;
    }

    // 3. Cuisine Types Validation
    if (!formData.cuisineTypes || !formData.cuisineTypes.trim()) {
      showToast('Please enter at least one cuisine type', 'error');
      return false;
    }
    const cuisines = formData.cuisineTypes.split(',').map(c => c.trim()).filter(c => c);
    if (cuisines.length === 0) {
      showToast('Please enter at least one valid cuisine type', 'error');
      return false;
    }

    // 4. Address Validation
    if (!formData.addressLine1 || !formData.addressLine1.trim()) {
      showToast('Address line 1 is required', 'error');
      return false;
    }
    if (formData.addressLine1.trim().length < 5) {
      showToast('Address line 1 must be at least 5 characters', 'error');
      return false;
    }
    if (!formData.locality || !formData.locality.trim()) {
      showToast('Locality is required', 'error');
      return false;
    }
    if (!formData.city || !formData.city.trim()) {
      showToast('City is required', 'error');
      return false;
    }
    if (!formData.state || !formData.state.trim()) {
      showToast('State is required', 'error');
      return false;
    }

    // 5. Pincode Validation
    if (!formData.pincode || !formData.pincode.trim()) {
      showToast('Pincode is required', 'error');
      return false;
    }
    const pincodePattern = /^\d{6}$/;
    if (!pincodePattern.test(formData.pincode.trim())) {
      showToast('Pincode must be exactly 6 digits', 'error');
      return false;
    }

    // 6. Serviceable Areas Validation
    if (!formData.serviceableAreas || formData.serviceableAreas.length === 0) {
      showToast('Please select at least one serviceable area', 'error');
      return false;
    }

    // 7. Operating Hours Validation
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!formData.lunchStartTime || !timePattern.test(formData.lunchStartTime)) {
      showToast('Invalid lunch start time format (use HH:MM)', 'error');
      return false;
    }
    if (!formData.lunchEndTime || !timePattern.test(formData.lunchEndTime)) {
      showToast('Invalid lunch end time format (use HH:MM)', 'error');
      return false;
    }
    if (formData.lunchStartTime >= formData.lunchEndTime) {
      showToast('Lunch start time must be before end time', 'error');
      return false;
    }

    if (!formData.dinnerStartTime || !timePattern.test(formData.dinnerStartTime)) {
      showToast('Invalid dinner start time format (use HH:MM)', 'error');
      return false;
    }
    if (!formData.dinnerEndTime || !timePattern.test(formData.dinnerEndTime)) {
      showToast('Invalid dinner end time format (use HH:MM)', 'error');
      return false;
    }
    if (formData.dinnerStartTime >= formData.dinnerEndTime) {
      showToast('Dinner start time must be before end time', 'error');
      return false;
    }

    // 7b. On-Demand Hours Validation (if not always open)
    if (!formData.isAlwaysOpen) {
      if (!formData.onDemandStartTime || !timePattern.test(formData.onDemandStartTime)) {
        showToast('Invalid on-demand start time format (use HH:MM)', 'error');
        return false;
      }
      if (!formData.onDemandEndTime || !timePattern.test(formData.onDemandEndTime)) {
        showToast('Invalid on-demand end time format (use HH:MM)', 'error');
        return false;
      }
      if (formData.onDemandStartTime >= formData.onDemandEndTime) {
        showToast('On-demand start time must be before end time', 'error');
        return false;
      }
    }

    // 8. Contact Phone Validation (Optional but must be valid if provided)
    if (formData.contactPhone && formData.contactPhone.trim()) {
      const cleanPhone = formData.contactPhone.replace(/\D/g, '');
      const phonePattern = /^[0-9]{10,15}$/;

      if (!phonePattern.test(cleanPhone)) {
        showToast('Contact phone must be 10-15 digits', 'error');
        return false;
      }

      // Additional check: ensure it's not all same digits
      if (/^(.)\1+$/.test(cleanPhone)) {
        showToast('Contact phone cannot be all same digits', 'error');
        return false;
      }
    }

    // 9. Contact Email Validation (Optional but must be valid if provided)
    if (formData.contactEmail && formData.contactEmail.trim()) {
      const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const email = formData.contactEmail.trim().toLowerCase();

      if (!emailPattern.test(email)) {
        showToast('Please enter a valid email address', 'error');
        return false;
      }

      if (email.length > 100) {
        showToast('Email address is too long', 'error');
        return false;
      }
    }

    // 10. Owner Details Validation (Required for PARTNER kitchens)
    if (formData.type === 'PARTNER') {
      // Owner Name
      if (!formData.ownerName || !formData.ownerName.trim()) {
        showToast('Owner name is required for partner kitchens', 'error');
        return false;
      }
      if (formData.ownerName.trim().length < 2) {
        showToast('Owner name must be at least 2 characters', 'error');
        return false;
      }
      if (formData.ownerName.trim().length > 100) {
        showToast('Owner name must not exceed 100 characters', 'error');
        return false;
      }

      // Owner Phone
      if (!formData.ownerPhone || !formData.ownerPhone.trim()) {
        showToast('Owner phone is required for partner kitchens', 'error');
        return false;
      }

      const cleanOwnerPhone = formData.ownerPhone.replace(/\D/g, '');
      const phonePattern = /^[0-9]{10,15}$/;

      if (!phonePattern.test(cleanOwnerPhone)) {
        showToast('Owner phone must be 10-15 digits', 'error');
        return false;
      }

      // Additional check: ensure it's not all same digits
      if (/^(.)\1+$/.test(cleanOwnerPhone)) {
        showToast('Owner phone cannot be all same digits', 'error');
        return false;
      }

      // Ensure owner phone is different from contact phone if both provided
      if (formData.contactPhone && formData.contactPhone.trim()) {
        const cleanContactPhone = formData.contactPhone.replace(/\D/g, '');
        if (cleanContactPhone === cleanOwnerPhone) {
          showToast('Owner phone should be different from contact phone', 'error');
          return false;
        }
      }
    }

    // 11. Description Validation (Optional but has max length)
    if (formData.description && formData.description.trim().length > 500) {
      showToast('Description must not exceed 500 characters', 'error');
      return false;
    }

    // 12. Coordinates Validation (Optional but both must be provided together)
    if (formData.latitude.trim() || formData.longitude.trim()) {
      if (!formData.latitude.trim() || !formData.longitude.trim()) {
        showToast('Both latitude and longitude must be provided', 'error');
        return false;
      }
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        showToast('Latitude must be between -90 and 90', 'error');
        return false;
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        showToast('Longitude must be between -180 and 180', 'error');
        return false;
      }
    }

    // 13. Delivery Radii Validation
    const autoRadius = parseFloat(formData.autoAcceptRadiusKm);
    const maxRadius = parseFloat(formData.maxDeliveryRadiusKm);
    if (!isNaN(autoRadius) && !isNaN(maxRadius) && autoRadius > maxRadius) {
      showToast('Auto-accept radius must be less than or equal to max delivery radius', 'error');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    // Prevent double submission
    if (loading) return;

    setLoading(true);
    try {
      await onSave(formData);
      // Success handling is done by parent component
      // Modal will be closed by parent's onClose call
    } catch (error: any) {
      // Error handling is done by parent component
      // Just show a generic message here to inform user
      const message = error?.response?.data?.message || error?.message || 'Failed to save kitchen';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      showError(type === 'success' ? 'Success' : 'Error', message);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>
              {kitchen ? 'Edit Kitchen' : 'Create Kitchen'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>

              <Text style={styles.label}>
                Kitchen Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Tiffsy Central Kitchen"
                value={formData.name}
                onChangeText={(text) => updateField('name', text)}
                editable={!loading}
              />

              <Text style={styles.label}>
                Type <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    formData.type === 'TIFFSY' && styles.typeOptionActive,
                  ]}
                  onPress={() => updateField('type', 'TIFFSY')}
                  disabled={loading || !!kitchen}>
                  <Text
                    style={[
                      styles.typeOptionText,
                      formData.type === 'TIFFSY' && styles.typeOptionTextActive,
                    ]}>
                    Tiffsy
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    formData.type === 'PARTNER' && styles.typeOptionActive,
                  ]}
                  onPress={() => updateField('type', 'PARTNER')}
                  disabled={loading || !!kitchen}>
                  <Text
                    style={[
                      styles.typeOptionText,
                      formData.type === 'PARTNER' && styles.typeOptionTextActive,
                    ]}>
                    Partner
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Brief description about the kitchen"
                value={formData.description}
                onChangeText={(text) => {
                  if (text.length <= 500) {
                    updateField('description', text);
                  }
                }}
                multiline
                numberOfLines={3}
                maxLength={500}
                editable={!loading}
              />
              <Text style={styles.hint}>
                {formData.description.length}/500 characters
              </Text>

              <Text style={styles.label}>
                Cuisine Types <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., North Indian, South Indian, Chinese"
                value={formData.cuisineTypes}
                onChangeText={(text) => updateField('cuisineTypes', text)}
                editable={!loading}
              />
              <Text style={styles.hint}>Separate multiple cuisines with commas</Text>
            </View>

            {/* Address */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Address</Text>

              <Text style={styles.label}>
                Address Line 1 <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Building, Street"
                value={formData.addressLine1}
                onChangeText={(text) => updateField('addressLine1', text)}
                editable={!loading}
              />

              <Text style={styles.label}>Address Line 2</Text>
              <TextInput
                style={styles.input}
                placeholder="Landmark (optional)"
                value={formData.addressLine2}
                onChangeText={(text) => updateField('addressLine2', text)}
                editable={!loading}
              />

              <Text style={styles.label}>
                Locality <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Andheri East"
                value={formData.locality}
                onChangeText={(text) => updateField('locality', text)}
                editable={!loading}
              />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <SearchableSelect
                    label="State"
                    required
                    iconName="map"
                    placeholder="Select state"
                    value={formData.state}
                    options={INDIAN_STATES}
                    onChange={(v) => {
                      // If the picked state's city list doesn't include the
                      // currently selected city, reset city so the user picks
                      // a valid one for the new state.
                      const newCities = getCitiesForState(v);
                      setFormData((prev) => ({
                        ...prev,
                        state: v,
                        city: newCities.includes(prev.city) ? prev.city : '',
                      }));
                    }}
                    disabled={loading}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <SearchableSelect
                    label="City"
                    required
                    iconName="city"
                    placeholder="Select city"
                    value={formData.city}
                    options={getCitiesForState(formData.state)}
                    onChange={(v) => updateField('city', v)}
                    disabled={loading}
                    searchPlaceholder="Search cities…"
                  />
                </View>
              </View>

              <Text style={styles.label}>
                Pincode <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="6-digit pincode"
                value={formData.pincode}
                onChangeText={(text) => updateField('pincode', text)}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />

              <View style={styles.coordinatesHeader}>
                <Text style={styles.label}>Coordinates</Text>
                <TouchableOpacity
                  style={styles.detectButton}
                  onPress={detectLocation}
                  disabled={loading || detectingLocation}>
                  {detectingLocation ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Icon name="crosshairs-gps" size={16} color={colors.primary} />
                      <Text style={styles.detectButtonText}>Detect Location</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <TextInput
                    style={styles.input}
                    placeholder="Latitude"
                    value={formData.latitude}
                    onChangeText={(text) => updateField('latitude', text)}
                    keyboardType="decimal-pad"
                    editable={!loading}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <TextInput
                    style={styles.input}
                    placeholder="Longitude"
                    value={formData.longitude}
                    onChangeText={(text) => updateField('longitude', text)}
                    keyboardType="decimal-pad"
                    editable={!loading}
                  />
                </View>
              </View>
              <Text style={styles.hint}>Used for geofencing-based delivery matching. Tap "Detect Location" while at the kitchen — it will also auto-fill the address fields above.</Text>
            </View>

            {/* Serviceable Areas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Serviceable Areas <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.zonePicker}
                onPress={() => setAreaPickerVisible(true)}
                disabled={loading || !formData.latitude || !formData.longitude}>
                <Icon name="map-marker-multiple" size={20} color={colors.primary} />
                <Text style={styles.zonePickerText}>
                  {!formData.latitude || !formData.longitude
                    ? 'Set kitchen location first'
                    : formData.serviceableAreas.length === 0
                    ? 'Select areas'
                    : `${formData.serviceableAreas.length} area${formData.serviceableAreas.length === 1 ? '' : 's'} selected`}
                </Text>
                <Icon name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
              {selectedAreas.length > 0 && (
                <Text style={styles.hint}>
                  {selectedAreas.map((a) => a.name).join(', ')}
                </Text>
              )}
              <AreaMapPreview
                kitchenCoords={
                  formData.latitude && formData.longitude
                    ? {
                        latitude: parseFloat(formData.latitude),
                        longitude: parseFloat(formData.longitude),
                      }
                    : undefined
                }
                areas={areaMapAreas}
              />
            </View>

            {/* Delivery Radii */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Radii</Text>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Auto-Accept (km)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="5"
                    value={formData.autoAcceptRadiusKm}
                    onChangeText={(text) => updateField('autoAcceptRadiusKm', text)}
                    keyboardType="decimal-pad"
                    editable={!loading}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Max Delivery (km)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    value={formData.maxDeliveryRadiusKm}
                    onChangeText={(text) => updateField('maxDeliveryRadiusKm', text)}
                    keyboardType="decimal-pad"
                    editable={!loading}
                  />
                </View>
              </View>
              <Text style={styles.hint}>
                Orders within auto-accept radius are auto-accepted. Orders between auto-accept and max radius require kitchen approval.
              </Text>
            </View>

            {/* Operating Hours */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Operating Hours</Text>

              <Text style={[styles.label, styles.mealLabel]}>Lunch</Text>
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <TimePickerField
                    label="Start"
                    value={formData.lunchStartTime}
                    onChange={(v) => updateField('lunchStartTime', v)}
                    disabled={loading}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <TimePickerField
                    label="End"
                    value={formData.lunchEndTime}
                    onChange={(v) => updateField('lunchEndTime', v)}
                    disabled={loading}
                  />
                </View>
              </View>

              <Text style={[styles.label, styles.mealLabel]}>Dinner</Text>
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <TimePickerField
                    label="Start"
                    value={formData.dinnerStartTime}
                    onChange={(v) => updateField('dinnerStartTime', v)}
                    disabled={loading}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <TimePickerField
                    label="End"
                    value={formData.dinnerEndTime}
                    onChange={(v) => updateField('dinnerEndTime', v)}
                    disabled={loading}
                  />
                </View>
              </View>
            </View>

            {/* On-Demand Operating Hours */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>On-Demand Operating Hours</Text>

              {!formData.isAlwaysOpen && (
                <View style={styles.row}>
                  <View style={styles.halfWidth}>
                    <TimePickerField
                      label="Start Time"
                      value={formData.onDemandStartTime}
                      onChange={(v) => updateField('onDemandStartTime', v)}
                      disabled={loading}
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <TimePickerField
                      label="End Time"
                      value={formData.onDemandEndTime}
                      onChange={(v) => updateField('onDemandEndTime', v)}
                      disabled={loading}
                    />
                  </View>
                </View>
              )}

              {/* Always Open Toggle */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => updateField('isAlwaysOpen', !formData.isAlwaysOpen)}
                disabled={loading}>
                <Icon
                  name={formData.isAlwaysOpen ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.checkboxLabel}>Always Open (24/7)</Text>
              </TouchableOpacity>
            </View>

            {/* Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>

              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="10-15 digit phone number (e.g., 9876543210)"
                value={formData.contactPhone}
                onChangeText={(text) => updateField('contactPhone', text.replace(/\D/g, ''))}
                keyboardType="phone-pad"
                maxLength={15}
                editable={!loading}
              />
              <Text style={styles.hint}>Enter 10-15 digits without spaces or special characters</Text>

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="contact@kitchen.com"
                value={formData.contactEmail}
                onChangeText={(text) => updateField('contactEmail', text.toLowerCase().trim())}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            {/* Owner Details (for PARTNER only) */}
            {formData.type === 'PARTNER' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Owner Details <Text style={styles.required}>*</Text>
                </Text>

                <Text style={styles.label}>
                  Owner Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Owner full name"
                  value={formData.ownerName}
                  onChangeText={(text) => updateField('ownerName', text)}
                  editable={!loading}
                />

                <Text style={styles.label}>
                  Owner Phone <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-15 digit phone number (e.g., 9876543210)"
                  value={formData.ownerPhone}
                  onChangeText={(text) => updateField('ownerPhone', text.replace(/\D/g, ''))}
                  keyboardType="phone-pad"
                  maxLength={15}
                  editable={!loading}
                />
                <Text style={styles.hint}>Enter 10-15 digits without spaces or special characters</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {kitchen ? 'Update' : 'Create'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AreaPickerModal
        visible={areaPickerVisible}
        selectedAreaIds={formData.serviceableAreas}
        latitude={formData.latitude ? parseFloat(formData.latitude) : undefined}
        longitude={formData.longitude ? parseFloat(formData.longitude) : undefined}
        cityHint={formData.city || undefined}
        stateHint={formData.state || undefined}
        onClose={() => setAreaPickerVisible(false)}
        onSave={(areaIds, areas) => {
          updateField('serviceableAreas', areaIds);
          setSelectedAreas(areas);
          if (areaIds.length > 0) {
            areaService.getAreasByIds(areaIds).then((fullAreas) => {
              setAreaMapAreas(fullAreas.filter((a) => !!a.coordinates));
            }).catch(() => {});
          } else {
            setAreaMapAreas([]);
          }
        }}
      />
    </>
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
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusMd,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  mealLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  typeOption: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeOptionTextActive: {
    color: colors.primary,
  },
  coordinatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: spacing.borderRadiusMd,
    backgroundColor: colors.primaryLight,
  },
  detectButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  zonePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zonePickerText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
