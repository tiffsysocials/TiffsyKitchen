import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import pincodeDirectory from 'india-pincode-lookup';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { ZoneFormState, ZoneFormErrors, TIMEZONES } from '../models/types';
import { Zone } from '../../../types/api.types';
import { SearchableSelect } from '../../../components/common/SearchableSelect';
import { INDIAN_STATES, getCitiesForState } from '../../../utils/indiaLocations';

// Type for pincode lookup result
interface PincodeData {
  officeName: string;
  pincode: string;
  taluk?: string;
  districtName: string;
  stateName: string;
}

interface ZoneFormModalProps {
  visible: boolean;
  zone: Zone | null;
  onClose: () => void;
  onSave: (data: ZoneFormState) => Promise<void>;
}

export const ZoneFormModal: React.FC<ZoneFormModalProps> = ({
  visible,
  zone,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<ZoneFormState>({
    pincode: '',
    name: '',
    city: '',
    state: '',
    timezone: 'Asia/Kolkata',
    status: 'INACTIVE',
    orderingEnabled: true,
    displayOrder: 0,
  });
  const [errors, setErrors] = useState<ZoneFormErrors>({});
  const [saving, setSaving] = useState(false);

  // Pincode autocomplete states
  const [pincodeSuggestions, setPincodeSuggestions] = useState<PincodeData[]>([]);
  const [showPincodeSuggestions, setShowPincodeSuggestions] = useState(false);
  const [pincodeValidating, setPincodeValidating] = useState(false);
  const [pincodeValid, setPincodeValid] = useState<boolean | null>(null);

  const isEditMode = zone !== null;

  useEffect(() => {
    if (zone) {
      setFormData({
        pincode: zone.pincode,
        name: zone.name,
        city: zone.city,
        state: zone.state,
        timezone: zone.timezone,
        status: zone.status,
        orderingEnabled: zone.orderingEnabled,
        displayOrder: zone.displayOrder,
      });
    } else {
      resetForm();
    }
    setErrors({});
  }, [zone, visible]);

  const resetForm = () => {
    setFormData({
      pincode: '',
      name: '',
      city: '',
      state: '',
      timezone: 'Asia/Kolkata',
      status: 'INACTIVE',
      orderingEnabled: true,
      displayOrder: 0,
    });
    setErrors({});
  };

  const handleChange = (field: keyof ZoneFormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field as keyof ZoneFormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Pincode validation and autocomplete handler
  const handlePincodeChange = (text: string) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
    handleChange('pincode', numericText);

    // Reset validation states
    setPincodeValid(null);
    setPincodeSuggestions([]);
    setShowPincodeSuggestions(false);

    // Start searching when user types 3+ digits
    if (numericText.length >= 3) {
      setPincodeValidating(true);

      try {
        // Search for pincodes starting with the entered digits
        const results = pincodeDirectory.lookup(numericText);

        if (results && results.length > 0) {
          // Limit to 10 suggestions for better UX
          const suggestions = results.slice(0, 10).map((result: any) => ({
            officeName: result.officeName || '',
            pincode: result.pincode || '',
            districtName: result.districtName || '',
            stateName: result.stateName || '',
            taluk: result.taluk,
          }));

          setPincodeSuggestions(suggestions);
          setShowPincodeSuggestions(true);
        } else {
          setPincodeSuggestions([]);
          setShowPincodeSuggestions(false);
        }
      } catch (error) {
        console.error('Error searching pincodes:', error);
      } finally {
        setPincodeValidating(false);
      }
    }

    // Validate complete 6-digit pincode
    if (numericText.length === 6) {
      setPincodeValidating(true);

      try {
        const result = pincodeDirectory.lookup(numericText);

        if (result && result.length > 0) {
          setPincodeValid(true);
          setShowPincodeSuggestions(false);
          setErrors((prev) => ({ ...prev, pincode: undefined }));
        } else {
          setPincodeValid(false);
          setErrors((prev) => ({
            ...prev,
            pincode: 'Invalid Indian pincode. Please enter a valid 6-digit pincode.'
          }));
        }
      } catch (error) {
        setPincodeValid(false);
        setErrors((prev) => ({
          ...prev,
          pincode: 'Invalid Indian pincode. Please enter a valid 6-digit pincode.'
        }));
      } finally {
        setPincodeValidating(false);
      }
    }
  };

  // Select pincode from suggestions
  const selectPincodeSuggestion = (suggestion: PincodeData) => {
    // Auto-fill form with pincode data
    setFormData((prev) => ({
      ...prev,
      pincode: suggestion.pincode,
      name: suggestion.officeName,
      city: suggestion.districtName,
      state: suggestion.stateName,
    }));

    setPincodeValid(true);
    setShowPincodeSuggestions(false);
    setPincodeSuggestions([]);
    setErrors((prev) => ({ ...prev, pincode: undefined }));
    Keyboard.dismiss();
  };

  const validateForm = (): ZoneFormErrors => {
    const newErrors: ZoneFormErrors = {};

    // Pincode validation (6 digits + must be valid Indian pincode)
    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Pincode must be 6 digits';
    } else {
      // Validate it's a real Indian pincode
      try {
        const result = pincodeDirectory.lookup(formData.pincode);
        if (!result || result.length === 0) {
          newErrors.pincode = 'Invalid Indian pincode. Please enter a valid 6-digit pincode.';
        }
      } catch (error) {
        newErrors.pincode = 'Invalid Indian pincode. Please enter a valid 6-digit pincode.';
      }
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Zone name is required';
    }

    // City validation
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    // State validation
    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    // Display order validation
    if (formData.displayOrder < 0) {
      newErrors.displayOrder = 'Display order must be a positive number';
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error saving zone:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isEditMode ? 'Edit Zone' : 'Create New Zone'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            {/* Pincode with Autocomplete */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Pincode <Text style={styles.required}>*</Text>
              </Text>
              <View style={[
                styles.inputWrapper,
                errors.pincode && styles.inputError,
                pincodeValid && styles.inputSuccess,
              ]}>
                <Icon
                  name="map-marker"
                  size={20}
                  color={
                    pincodeValid ? '#10b981' :
                    errors.pincode ? '#ef4444' :
                    colors.textMuted
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.inputWithIcon,
                    isEditMode && styles.inputDisabled,
                  ]}
                  placeholder="Type Indian pincode (e.g., 400001)"
                  value={formData.pincode}
                  onChangeText={handlePincodeChange}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isEditMode}
                  placeholderTextColor={colors.textMuted}
                />
                {pincodeValidating && (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
                )}
                {pincodeValid && !pincodeValidating && (
                  <Icon name="check-circle" size={20} color="#10b981" style={{ marginLeft: 8 }} />
                )}
              </View>

              {/* Pincode Suggestions Dropdown */}
              {showPincodeSuggestions && pincodeSuggestions.length > 0 && !isEditMode && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsHeader}>
                    Select a pincode ({pincodeSuggestions.length} found)
                  </Text>
                  <ScrollView
                    style={styles.suggestionsList}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled>
                    {pincodeSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={`${suggestion.pincode}-${index}`}
                        style={styles.suggestionItem}
                        onPress={() => selectPincodeSuggestion(suggestion)}
                        activeOpacity={0.7}>
                        <View style={styles.suggestionLeft}>
                          <Text style={styles.suggestionPincode}>{suggestion.pincode}</Text>
                          <Text style={styles.suggestionName} numberOfLines={1}>
                            {suggestion.officeName}
                          </Text>
                          <Text style={styles.suggestionLocation} numberOfLines={1}>
                            {suggestion.districtName}, {suggestion.stateName}
                          </Text>
                        </View>
                        <Icon name="chevron-right" size={18} color="#94a3b8" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {errors.pincode ? (
                <View style={styles.errorContainer}>
                  <Icon name="alert-circle" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{errors.pincode}</Text>
                </View>
              ) : null}
              {isEditMode ? (
                <Text style={styles.helperText}>
                  Pincode cannot be changed after creation
                </Text>
              ) : pincodeValid ? (
                <View style={styles.successContainer}>
                  <Icon name="check-circle" size={14} color="#10b981" />
                  <Text style={styles.successText}>Valid Indian pincode</Text>
                </View>
              ) : formData.pincode.length > 0 && formData.pincode.length < 6 ? (
                <Text style={styles.helperText}>
                  Type at least 3 digits to see suggestions
                </Text>
              ) : null}
            </View>

            {/* Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Zone Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="label"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.inputWithIcon,
                    errors.name && styles.inputError,
                  ]}
                  value={formData.name}
                  onChangeText={(text) => handleChange('name', text)}
                  placeholder="e.g., Fort, Andheri West"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              {errors.name ? (
                <Text style={styles.errorText}>{errors.name}</Text>
              ) : null}
            </View>

            {/* State */}
            <View style={styles.formGroup}>
              <SearchableSelect
                label="State"
                required
                iconName="map"
                placeholder="Select state"
                value={formData.state}
                options={INDIAN_STATES}
                error={errors.state}
                onChange={(v) => {
                  const newCities = getCitiesForState(v);
                  setFormData((prev) => ({
                    ...prev,
                    state: v,
                    city: newCities.includes(prev.city) ? prev.city : prev.city, // keep existing city even if not in new list (auto-filled from pincode)
                  }));
                  if (errors.state) setErrors((p) => ({ ...p, state: undefined }));
                }}
              />
            </View>

            {/* City */}
            <View style={styles.formGroup}>
              <SearchableSelect
                label="City"
                required
                iconName="city"
                placeholder="Select city"
                value={formData.city}
                options={getCitiesForState(formData.state)}
                error={errors.city}
                searchPlaceholder="Search cities…"
                onChange={(v) => handleChange('city', v)}
              />
            </View>

            {/* Timezone */}
            <View style={styles.formGroup}>
              <SearchableSelect
                label="Timezone"
                iconName="clock-time-four"
                placeholder="Select timezone"
                value={formData.timezone}
                options={TIMEZONES}
                allowOther={false}
                onChange={(v) => handleChange('timezone', v)}
              />
            </View>

            {/* Display Order */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Display Order</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="format-list-numbered"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.inputWithIcon,
                    errors.displayOrder && styles.inputError,
                  ]}
                  placeholder="Enter display order (e.g., 1, 2, 3...)"
                  value={formData.displayOrder.toString()}
                  onChangeText={(text) =>
                    handleChange('displayOrder', parseInt(text) || 0)
                  }
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              {errors.displayOrder ? (
                <Text style={styles.errorText}>{errors.displayOrder}</Text>
              ) : null}
            </View>

            {/* Status */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Zone Status</Text>
              <View style={styles.statusToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    formData.status === 'ACTIVE' &&
                      styles.statusButtonActive,
                  ]}
                  onPress={() => handleChange('status', 'ACTIVE')}>
                  <Icon
                    name="check-circle"
                    size={18}
                    color={formData.status === 'ACTIVE' ? '#059669' : '#94a3b8'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.statusButtonText,
                      formData.status === 'ACTIVE' &&
                        styles.statusButtonTextActive,
                    ]}>
                    ACTIVE
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    formData.status === 'INACTIVE' &&
                      styles.statusButtonInactive,
                  ]}
                  onPress={() => handleChange('status', 'INACTIVE')}>
                  <Icon
                    name="close-circle"
                    size={18}
                    color={formData.status === 'INACTIVE' ? '#475569' : '#94a3b8'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.statusButtonText,
                      formData.status === 'INACTIVE' &&
                        styles.statusButtonTextInactive,
                    ]}>
                    INACTIVE
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Ordering Enabled */}
            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Icon
                    name={formData.orderingEnabled ? 'storefront' : 'storefront-outline'}
                    size={22}
                    color={formData.orderingEnabled ? '#10b981' : '#94a3b8'}
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Online Ordering</Text>
                    <Text style={[styles.helperText, { marginTop: 2 }]}>
                      {formData.orderingEnabled
                        ? 'Accepting orders in this zone'
                        : 'Not accepting orders'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={formData.orderingEnabled}
                  onValueChange={(value) =>
                    handleChange('orderingEnabled', value)
                  }
                  trackColor={{
                    false: '#e2e8f0',
                    true: '#86efac',
                  }}
                  thumbColor={
                    formData.orderingEnabled
                      ? '#10b981'
                      : '#cbd5e1'
                  }
                  ios_backgroundColor="#e2e8f0"
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={saving}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                saving && styles.saveButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEditMode ? 'Update Zone' : 'Create Zone'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Modal Overlay - Premium Dark Backdrop
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },

  // Modal Container - Clean White Surface
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },

  // Header - Professional Branding
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },

  // Scroll Content - Optimal Spacing
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },

  // Form Group - Consistent Spacing
  formGroup: {
    marginBottom: 24,
  },

  // Label - Clear Typography with Icons
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  required: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },

  // Input Wrapper - Enhanced Focus States
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 56,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  inputIcon: {
    marginRight: 12,
  },

  // Input Fields - Modern Design
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
    minHeight: 56,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  inputWithIcon: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
    paddingVertical: 16,
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputSuccess: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  inputDisabled: {
    backgroundColor: '#e2e8f0',
    color: '#64748b',
    borderColor: '#cbd5e1',
  },

  // Pincode Suggestions Dropdown - Premium Design
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    maxHeight: 280,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  suggestionsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  suggestionsList: {
    maxHeight: 240,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  suggestionLeft: {
    flex: 1,
    marginRight: 12,
  },
  suggestionPincode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 2,
  },
  suggestionLocation: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
  },

  // Error Container - Enhanced Feedback
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    gap: 8,
  },

  // Picker Button - Touch-Optimized
  pickerButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  pickerPlaceholder: {
    color: '#94a3b8',
    fontWeight: '400',
  },

  // Status Toggle - Premium Segmented Control
  statusToggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 4,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    minHeight: 48,
  },
  statusButtonActive: {
    backgroundColor: '#dcfce7',
    borderWidth: 2,
    borderColor: '#10b981',
    elevation: 2,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statusButtonInactive: {
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  statusButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  statusButtonTextActive: {
    color: '#059669',
  },
  statusButtonTextInactive: {
    color: '#475569',
  },

  // Switch Row - Clean Layout
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },

  // Helper Text - Improved Readability
  helperText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 8,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Error Text - Clear Feedback
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
    lineHeight: 18,
    flex: 1,
  },

  // Success Container - Positive Feedback
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
    gap: 6,
  },
  successText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Footer - Elevated Actions
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
    backgroundColor: '#f8fafc',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  // Cancel Button - Clear Secondary Action
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    minHeight: 56,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: -0.2,
  },

  // Save Button - Primary CTA
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },

  // Selection Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },

  // Selection Modal Content
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },

  // Modal Header
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },

  // Modal List Item - Touch Optimized
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    minHeight: 64,
    backgroundColor: '#ffffff',
  },
  modalItemText: {
    fontSize: 17,
    color: '#1e293b',
    fontWeight: '500',
    letterSpacing: -0.2,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 24,
  },
});
