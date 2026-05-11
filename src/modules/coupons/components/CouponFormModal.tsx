import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Coupon, CreateCouponRequest, UpdateCouponRequest } from '../../../types/api.types';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { DatePickerModal } from '../../../components/dashboard/DatePickerModal';
import { ZonePickerModal } from '../../kitchens/components/ZonePickerModal';
import { KitchenPickerModal } from './KitchenPickerModal';
import { CustomerPickerModal } from './CustomerPickerModal';
import {
  CouponFormState,
  CouponFormErrors,
  DEFAULT_FORM_STATE,
  DISCOUNT_TYPE_OPTIONS,
  TARGET_USER_OPTIONS,
  MENU_TYPE_OPTIONS,
  MEAL_MENU_ONLY_TYPES,
} from '../models/types';

interface CouponFormModalProps {
  visible: boolean;
  coupon: Coupon | null; // null = create, non-null = edit
  onClose: () => void;
  onSave: (data: CreateCouponRequest | UpdateCouponRequest, isEdit: boolean) => Promise<void>;
}

export const CouponFormModal: React.FC<CouponFormModalProps> = ({
  visible,
  coupon,
  onClose,
  onSave,
}) => {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState<CouponFormState>(DEFAULT_FORM_STATE);
  const [errors, setErrors] = useState<CouponFormErrors>({});
  const [saving, setSaving] = useState(false);

  // Section collapse state
  const [sections, setSections] = useState({
    basic: true,
    discount: true,
    applicability: false,
    targeting: false,
    validity: false,
  });

  // Picker modal states
  const [discountTypeModalVisible, setDiscountTypeModalVisible] = useState(false);
  const [targetUserModalVisible, setTargetUserModalVisible] = useState(false);
  const [validFromPickerVisible, setValidFromPickerVisible] = useState(false);
  const [validTillPickerVisible, setValidTillPickerVisible] = useState(false);
  const [zonePickerVisible, setZonePickerVisible] = useState(false);
  const [kitchenPickerVisible, setKitchenPickerVisible] = useState(false);
  const [excludedKitchenPickerVisible, setExcludedKitchenPickerVisible] = useState(false);
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);

  const isEditMode = coupon !== null;

  useEffect(() => {
    if (visible) {
      if (coupon) {
        setFormData({
          code: coupon.code,
          name: coupon.name,
          description: coupon.description || '',
          discountType: coupon.discountType,
          discountValue: coupon.discountValue || 0,
          maxDiscountAmount: coupon.maxDiscountAmount?.toString() || '',
          freeAddonCount: coupon.freeAddonCount?.toString() || '',
          freeAddonMaxValue: coupon.freeAddonMaxValue?.toString() || '',
          extraVoucherCount: coupon.extraVoucherCount?.toString() || '',
          extraVoucherExpiryDays: coupon.extraVoucherExpiryDays?.toString() || '30',
          minOrderValue: coupon.minOrderValue?.toString() || '0',
          minItems: coupon.minItems?.toString() || '0',
          applicableMenuTypes: coupon.applicableMenuTypes || [],
          applicableKitchenIds: coupon.applicableKitchenIds || [],
          applicableZoneIds: coupon.applicableZoneIds || [],
          excludedKitchenIds: coupon.excludedKitchenIds || [],
          totalUsageLimit: coupon.totalUsageLimit?.toString() || '',
          perUserLimit: coupon.perUserLimit?.toString() || '1',
          targetUserType: coupon.targetUserType,
          specificUserIds: coupon.specificUserIds?.join(', ') || '',
          isFirstOrderOnly: coupon.isFirstOrderOnly,
          validFrom: coupon.validFrom ? new Date(coupon.validFrom) : null,
          validTill: coupon.validTill ? new Date(coupon.validTill) : null,
          status: coupon.status === 'ACTIVE' || coupon.status === 'EXPIRED' ? 'ACTIVE' : 'INACTIVE',
          isVisible: coupon.isVisible,
          displayOrder: coupon.displayOrder?.toString() || '0',
          bannerImage: coupon.bannerImage || '',
          termsAndConditions: coupon.termsAndConditions || '',
        });
      } else {
        setFormData(DEFAULT_FORM_STATE);
      }
      setErrors({});
      setSections({ basic: true, discount: true, applicability: false, targeting: false, validity: false });
    }
  }, [visible, coupon]);

  // Auto-lock menu types for MEAL_MENU-only discount types
  useEffect(() => {
    if (MEAL_MENU_ONLY_TYPES.includes(formData.discountType)) {
      setFormData(prev => ({ ...prev, applicableMenuTypes: ['MEAL_MENU'] }));
    }
  }, [formData.discountType]);

  const handleChange = (field: keyof CouponFormState, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: CouponFormErrors = {};

    if (!formData.code.trim()) newErrors.code = 'Code is required';
    else if (formData.code.length < 3 || formData.code.length > 20) newErrors.code = 'Code must be 3-20 characters';
    else if (!/^[A-Z0-9]+$/.test(formData.code)) newErrors.code = 'Code must be alphanumeric uppercase';

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    else if (formData.name.length < 2 || formData.name.length > 100) newErrors.name = 'Name must be 2-100 characters';

    if (formData.discountType === 'PERCENTAGE') {
      if (formData.discountValue <= 0 || formData.discountValue > 100) newErrors.discountValue = 'Must be between 1-100';
    } else if (formData.discountType === 'FLAT') {
      if (formData.discountValue <= 0) newErrors.discountValue = 'Must be greater than 0';
    } else if (formData.discountType === 'FREE_ADDON_COUNT') {
      if (!formData.freeAddonCount || parseInt(formData.freeAddonCount) < 1) newErrors.freeAddonCount = 'Must be at least 1';
    } else if (formData.discountType === 'FREE_ADDON_VALUE') {
      if (!formData.freeAddonMaxValue || parseFloat(formData.freeAddonMaxValue) <= 0) newErrors.freeAddonMaxValue = 'Must be greater than 0';
    } else if (formData.discountType === 'FREE_EXTRA_VOUCHER') {
      const count = parseInt(formData.extraVoucherCount);
      if (!formData.extraVoucherCount || count < 1 || count > 50) newErrors.extraVoucherCount = 'Must be between 1-50';
    }

    if (!formData.validFrom) newErrors.validFrom = 'Start date is required';
    if (!formData.validTill) newErrors.validTill = 'End date is required';
    if (formData.validFrom && formData.validTill) {
      const fromMs = new Date(formData.validFrom).setHours(0, 0, 0, 0);
      const tillMs = new Date(formData.validTill).setHours(0, 0, 0, 0);
      if (fromMs > tillMs) {
        newErrors.validTill = 'End date must be on or after start date';
      }
    }

    if (formData.targetUserType === 'SPECIFIC_USERS' && !formData.specificUserIds.trim()) {
      newErrors.specificUserIds = 'At least one user ID is required';
    }

    if (!formData.applicableMenuTypes || formData.applicableMenuTypes.length === 0) {
      newErrors.applicableMenuTypes = 'Select at least one menu type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const toStartOfDayIso = (date: Date): string => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized.toISOString();
  };

  const toEndOfDayIso = (date: Date): string => {
    const normalized = new Date(date);
    normalized.setHours(23, 59, 59, 999);
    return normalized.toISOString();
  };

  const buildRequestData = (): CreateCouponRequest | UpdateCouponRequest => {
    const data: any = {
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      discountType: formData.discountType,
      minOrderValue: parseInt(formData.minOrderValue) || 0,
      minItems: parseInt(formData.minItems) || 0,
      applicableMenuTypes: formData.applicableMenuTypes,
      applicableKitchenIds: formData.applicableKitchenIds,
      applicableZoneIds: formData.applicableZoneIds,
      excludedKitchenIds: formData.excludedKitchenIds,
      totalUsageLimit: formData.totalUsageLimit ? parseInt(formData.totalUsageLimit) : null,
      perUserLimit: parseInt(formData.perUserLimit) || 1,
      targetUserType: formData.targetUserType,
      isFirstOrderOnly: formData.isFirstOrderOnly,
      validFrom: formData.validFrom ? toStartOfDayIso(formData.validFrom) : undefined,
      validTill: formData.validTill ? toEndOfDayIso(formData.validTill) : undefined,
      status: formData.status,
      isVisible: formData.isVisible,
      displayOrder: parseInt(formData.displayOrder) || 0,
      bannerImage: formData.bannerImage.trim() || undefined,
      termsAndConditions: formData.termsAndConditions.trim() || undefined,
    };

    // Add type-specific fields
    if (formData.discountType === 'PERCENTAGE' || formData.discountType === 'FLAT') {
      data.discountValue = formData.discountValue;
    }
    if (formData.discountType === 'PERCENTAGE' && formData.maxDiscountAmount) {
      data.maxDiscountAmount = parseFloat(formData.maxDiscountAmount);
    }
    if (formData.discountType === 'FREE_ADDON_COUNT') {
      data.freeAddonCount = parseInt(formData.freeAddonCount);
    }
    if (formData.discountType === 'FREE_ADDON_VALUE') {
      data.freeAddonMaxValue = parseFloat(formData.freeAddonMaxValue);
    }
    if (formData.discountType === 'FREE_EXTRA_VOUCHER') {
      data.extraVoucherCount = parseInt(formData.extraVoucherCount);
      data.extraVoucherExpiryDays = parseInt(formData.extraVoucherExpiryDays) || 30;
    }

    if (formData.targetUserType === 'SPECIFIC_USERS') {
      data.specificUserIds = formData.specificUserIds.split(',').map((id: string) => id.trim()).filter(Boolean);
    }

    return data;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const data = buildRequestData();
      console.log('🎟️ Coupon save payload:', JSON.stringify(data, null, 2));
      await onSave(data, isEditMode);
    } catch (error: any) {
      // apiService.enhanced throws the response body directly: { success, message, errors? }
      console.log('🎟️ Coupon save error:', JSON.stringify(error, null, 2));
      const backendMessage =
        error?.message ||
        error?.response?.data?.message ||
        (Array.isArray(error?.errors) && error.errors[0]?.message) ||
        'Failed to save coupon';
      setErrors(prev => ({ ...prev, submit: backendMessage }));
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderSectionHeader = (title: string, section: keyof typeof sections, icon: string) => (
    <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(section)} activeOpacity={0.7}>
      <View style={styles.sectionHeaderLeft}>
        <Icon name={icon} size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Icon name={sections[section] ? 'chevron-up' : 'chevron-down'} size={24} color={colors.textMuted} />
    </TouchableOpacity>
  );

  const renderError = (field: string) => {
    if (!errors[field]) return null;
    return <Text style={styles.errorText}>{errors[field]}</Text>;
  };

  const renderPickerButton = (label: string, value: string, onPress: () => void) => (
    <TouchableOpacity style={styles.pickerButton} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.pickerButtonText, !value && styles.pickerButtonPlaceholder]}>
        {value || `Select ${label}...`}
      </Text>
      <Icon name="chevron-down" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  const isMealMenuOnly = MEAL_MENU_ONLY_TYPES.includes(formData.discountType);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isEditMode ? 'Edit Coupon' : 'Create Coupon'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {errors.submit && (
            <View style={styles.submitError}>
              <Icon name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.submitErrorText}>{errors.submit}</Text>
            </View>
          )}

          <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* ========== SECTION 1: Basic Info ========== */}
            {renderSectionHeader('Basic Info', 'basic', 'information')}
            {sections.basic && (
              <View style={styles.sectionContent}>
                <Text style={styles.label}>Coupon Code *</Text>
                <TextInput
                  style={[styles.input, errors.code && styles.inputError]}
                  value={formData.code}
                  onChangeText={(text) => handleChange('code', text.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="e.g. SUMMER20"
                  placeholderTextColor={colors.textMuted}
                  maxLength={20}
                  autoCapitalize="characters"
                />
                {renderError('code')}

                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  value={formData.name}
                  onChangeText={(text) => handleChange('name', text)}
                  placeholder="Coupon display name"
                  placeholderTextColor={colors.textMuted}
                  maxLength={100}
                />
                {renderError('name')}

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => handleChange('description', text)}
                  placeholder="Optional description"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                />
              </View>
            )}

            {/* ========== SECTION 2: Discount Config ========== */}
            {renderSectionHeader('Discount Configuration', 'discount', 'sale')}
            {sections.discount && (
              <View style={styles.sectionContent}>
                <Text style={styles.label}>Discount Type *</Text>
                {renderPickerButton(
                  'Discount Type',
                  DISCOUNT_TYPE_OPTIONS.find(o => o.value === formData.discountType)?.label || '',
                  () => setDiscountTypeModalVisible(true)
                )}

                {/* Conditional fields based on discount type */}
                {(formData.discountType === 'PERCENTAGE' || formData.discountType === 'FLAT') && (
                  <>
                    <Text style={styles.label}>
                      Discount Value * {formData.discountType === 'PERCENTAGE' ? '(%)' : '(Rs.)'}
                    </Text>
                    <TextInput
                      style={[styles.input, errors.discountValue && styles.inputError]}
                      value={formData.discountValue ? formData.discountValue.toString() : ''}
                      onChangeText={(text) => handleChange('discountValue', parseFloat(text) || 0)}
                      placeholder={formData.discountType === 'PERCENTAGE' ? '0-100' : 'Amount'}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                    {renderError('discountValue')}
                  </>
                )}

                {formData.discountType === 'PERCENTAGE' && (
                  <>
                    <Text style={styles.label}>Max Discount Amount (Rs.)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.maxDiscountAmount}
                      onChangeText={(text) => handleChange('maxDiscountAmount', text)}
                      placeholder="Optional cap (e.g. 200)"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                  </>
                )}

                {formData.discountType === 'FREE_DELIVERY' && (
                  <View style={styles.infoBox}>
                    <Icon name="information" size={16} color={colors.info} />
                    <Text style={styles.infoText}>This coupon will waive the delivery fee. Only applicable to Meal Menu orders.</Text>
                  </View>
                )}

                {formData.discountType === 'FREE_ADDON_COUNT' && (
                  <>
                    <Text style={styles.label}>Free Addon Count *</Text>
                    <TextInput
                      style={[styles.input, errors.freeAddonCount && styles.inputError]}
                      value={formData.freeAddonCount}
                      onChangeText={(text) => handleChange('freeAddonCount', text)}
                      placeholder="Number of free addon units"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                    {renderError('freeAddonCount')}
                  </>
                )}

                {formData.discountType === 'FREE_ADDON_VALUE' && (
                  <>
                    <Text style={styles.label}>Max Addon Value (Rs.) *</Text>
                    <TextInput
                      style={[styles.input, errors.freeAddonMaxValue && styles.inputError]}
                      value={formData.freeAddonMaxValue}
                      onChangeText={(text) => handleChange('freeAddonMaxValue', text)}
                      placeholder="Max value of free addons"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                    {renderError('freeAddonMaxValue')}
                  </>
                )}

                {formData.discountType === 'FREE_EXTRA_VOUCHER' && (
                  <>
                    <Text style={styles.label}>Extra Voucher Count (1-50) *</Text>
                    <TextInput
                      style={[styles.input, errors.extraVoucherCount && styles.inputError]}
                      value={formData.extraVoucherCount}
                      onChangeText={(text) => handleChange('extraVoucherCount', text)}
                      placeholder="Number of bonus vouchers"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                    {renderError('extraVoucherCount')}

                    <Text style={styles.label}>Voucher Expiry (days)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.extraVoucherExpiryDays}
                      onChangeText={(text) => handleChange('extraVoucherExpiryDays', text)}
                      placeholder="Default: 30 days"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                  </>
                )}
              </View>
            )}

            {/* ========== SECTION 3: Applicability ========== */}
            {renderSectionHeader('Applicability', 'applicability', 'filter-variant')}
            {sections.applicability && (
              <View style={styles.sectionContent}>
                <Text style={styles.label}>Menu Types</Text>
                <View style={styles.chipGroup}>
                  {MENU_TYPE_OPTIONS.map((option) => {
                    const isSelected = formData.applicableMenuTypes.includes(option.value);
                    const isLocked = isMealMenuOnly && option.value === 'MEAL_MENU';
                    const isDisabledOption = isMealMenuOnly && option.value !== 'MEAL_MENU';
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.chip, isSelected && styles.chipActive, isDisabledOption && styles.chipDisabled]}
                        onPress={() => {
                          if (isLocked || isDisabledOption) return;
                          const newTypes = isSelected
                            ? formData.applicableMenuTypes.filter(t => t !== option.value)
                            : [...formData.applicableMenuTypes, option.value];
                          handleChange('applicableMenuTypes', newTypes);
                        }}
                        activeOpacity={isLocked || isDisabledOption ? 1 : 0.7}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {option.label}
                        </Text>
                        {isLocked && <Icon name="lock" size={12} color={colors.textMuted} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {isMealMenuOnly && (
                  <Text style={styles.hintText}>This discount type only applies to Meal Menu</Text>
                )}

                <Text style={styles.label}>Applicable Zones</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setZonePickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerButtonText}>
                    {formData.applicableZoneIds.length > 0
                      ? `${formData.applicableZoneIds.length} zone(s) selected`
                      : 'All zones (none selected)'}
                  </Text>
                  <Icon name="chevron-right" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                <Text style={styles.label}>Applicable Kitchens</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setKitchenPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerButtonText}>
                    {formData.applicableKitchenIds.length > 0
                      ? `${formData.applicableKitchenIds.length} kitchen(s) selected`
                      : 'All kitchens (none selected)'}
                  </Text>
                  <Icon name="chevron-right" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                <Text style={styles.label}>Excluded Kitchens</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setExcludedKitchenPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerButtonText}>
                    {formData.excludedKitchenIds.length > 0
                      ? `${formData.excludedKitchenIds.length} kitchen(s) excluded`
                      : 'None excluded'}
                  </Text>
                  <Icon name="chevron-right" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                <Text style={styles.label}>Min Order Value (Rs.)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.minOrderValue}
                  onChangeText={(text) => handleChange('minOrderValue', text)}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Min Items</Text>
                <TextInput
                  style={styles.input}
                  value={formData.minItems}
                  onChangeText={(text) => handleChange('minItems', text)}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* ========== SECTION 4: Targeting & Limits ========== */}
            {renderSectionHeader('Targeting & Limits', 'targeting', 'account-group')}
            {sections.targeting && (
              <View style={styles.sectionContent}>
                <Text style={styles.label}>Target Users</Text>
                {renderPickerButton(
                  'Target Users',
                  TARGET_USER_OPTIONS.find(o => o.value === formData.targetUserType)?.label || '',
                  () => setTargetUserModalVisible(true)
                )}

                {formData.targetUserType === 'SPECIFIC_USERS' && (
                  <>
                    <Text style={styles.label}>Assigned Customers *</Text>
                    {(() => {
                      const ids = formData.specificUserIds
                        .split(',')
                        .map((s: string) => s.trim())
                        .filter(Boolean);
                      const count = ids.length;
                      return (
                        <TouchableOpacity
                          style={[styles.pickerButton, errors.specificUserIds && styles.inputError]}
                          onPress={() => setCustomerPickerVisible(true)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.pickerButtonText,
                            count === 0 && styles.pickerButtonPlaceholder,
                          ]}>
                            {count === 0
                              ? 'Select customers...'
                              : `${count} customer${count === 1 ? '' : 's'} selected`}
                          </Text>
                          <Icon name="chevron-down" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                      );
                    })()}
                    {renderError('specificUserIds')}
                  </>
                )}

                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.label}>First Order Only</Text>
                    <Text style={styles.hintText}>Only usable on user's first order</Text>
                  </View>
                  <Switch
                    value={formData.isFirstOrderOnly}
                    onValueChange={(v) => handleChange('isFirstOrderOnly', v)}
                    trackColor={{ false: '#e2e8f0', true: '#86efac' }}
                    thumbColor={formData.isFirstOrderOnly ? '#10b981' : '#cbd5e1'}
                  />
                </View>

                <Text style={styles.label}>Total Usage Limit</Text>
                <TextInput
                  style={styles.input}
                  value={formData.totalUsageLimit}
                  onChangeText={(text) => handleChange('totalUsageLimit', text)}
                  placeholder="Leave empty for unlimited"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Per User Limit</Text>
                <TextInput
                  style={styles.input}
                  value={formData.perUserLimit}
                  onChangeText={(text) => handleChange('perUserLimit', text)}
                  placeholder="1"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* ========== SECTION 5: Validity & Display ========== */}
            {renderSectionHeader('Validity & Display', 'validity', 'calendar-clock')}
            {sections.validity && (
              <View style={styles.sectionContent}>
                <Text style={styles.label}>Valid From *</Text>
                <TouchableOpacity
                  style={[styles.pickerButton, errors.validFrom && styles.inputError]}
                  onPress={() => setValidFromPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerButtonText, !formData.validFrom && styles.pickerButtonPlaceholder]}>
                    {formData.validFrom ? format(formData.validFrom, 'dd MMM yyyy') : 'Select start date...'}
                  </Text>
                  <Icon name="calendar" size={20} color={colors.textMuted} />
                </TouchableOpacity>
                {renderError('validFrom')}

                <Text style={styles.label}>Valid Till *</Text>
                <TouchableOpacity
                  style={[styles.pickerButton, errors.validTill && styles.inputError]}
                  onPress={() => setValidTillPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerButtonText, !formData.validTill && styles.pickerButtonPlaceholder]}>
                    {formData.validTill ? format(formData.validTill, 'dd MMM yyyy') : 'Select end date...'}
                  </Text>
                  <Icon name="calendar" size={20} color={colors.textMuted} />
                </TouchableOpacity>
                {renderError('validTill')}

                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.label}>Status</Text>
                    <Text style={styles.hintText}>{formData.status === 'ACTIVE' ? 'Coupon is active' : 'Coupon is inactive'}</Text>
                  </View>
                  <Switch
                    value={formData.status === 'ACTIVE'}
                    onValueChange={(v) => handleChange('status', v ? 'ACTIVE' : 'INACTIVE')}
                    trackColor={{ false: '#e2e8f0', true: '#86efac' }}
                    thumbColor={formData.status === 'ACTIVE' ? '#10b981' : '#cbd5e1'}
                  />
                </View>

                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.label}>Visible to Customers</Text>
                    <Text style={styles.hintText}>Show in customer coupon list</Text>
                  </View>
                  <Switch
                    value={formData.isVisible}
                    onValueChange={(v) => handleChange('isVisible', v)}
                    trackColor={{ false: '#e2e8f0', true: '#86efac' }}
                    thumbColor={formData.isVisible ? '#10b981' : '#cbd5e1'}
                  />
                </View>

                <Text style={styles.label}>Display Order</Text>
                <TextInput
                  style={styles.input}
                  value={formData.displayOrder}
                  onChangeText={(text) => handleChange('displayOrder', text)}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Terms & Conditions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.termsAndConditions}
                  onChangeText={(text) => handleChange('termsAndConditions', text)}
                  placeholder="Optional terms and conditions"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  maxLength={2000}
                />
              </View>
            )}

            {/* Bottom spacing */}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.footerButton, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ========== PICKER MODALS ========== */}

      {/* Discount Type Picker */}
      <Modal visible={discountTypeModalVisible} transparent animationType="slide" onRequestClose={() => setDiscountTypeModalVisible(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setDiscountTypeModalVisible(false)}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Select Discount Type</Text>
            <FlatList
              data={DISCOUNT_TYPE_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, formData.discountType === item.value && styles.pickerItemSelected]}
                  onPress={() => {
                    handleChange('discountType', item.value);
                    setDiscountTypeModalVisible(false);
                  }}
                >
                  <View>
                    <Text style={[styles.pickerItemLabel, formData.discountType === item.value && styles.pickerItemLabelSelected]}>
                      {item.label}
                    </Text>
                    <Text style={styles.pickerItemDesc}>{item.description}</Text>
                  </View>
                  {formData.discountType === item.value && (
                    <Icon name="check-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Target User Picker */}
      <Modal visible={targetUserModalVisible} transparent animationType="slide" onRequestClose={() => setTargetUserModalVisible(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setTargetUserModalVisible(false)}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.pickerModalTitle}>Select Target Users</Text>
            <FlatList
              data={TARGET_USER_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, formData.targetUserType === item.value && styles.pickerItemSelected]}
                  onPress={() => {
                    handleChange('targetUserType', item.value);
                    setTargetUserModalVisible(false);
                  }}
                >
                  <Text style={[styles.pickerItemLabel, formData.targetUserType === item.value && styles.pickerItemLabelSelected]}>
                    {item.label}
                  </Text>
                  {formData.targetUserType === item.value && (
                    <Icon name="check-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Pickers */}
      <DatePickerModal
        visible={validFromPickerVisible}
        selectedDate={formData.validFrom || new Date()}
        onClose={() => setValidFromPickerVisible(false)}
        onDateSelect={(date) => handleChange('validFrom', date)}
      />
      <DatePickerModal
        visible={validTillPickerVisible}
        selectedDate={formData.validTill || new Date()}
        onClose={() => setValidTillPickerVisible(false)}
        onDateSelect={(date) => handleChange('validTill', date)}
      />

      {/* Zone Picker */}
      <ZonePickerModal
        visible={zonePickerVisible}
        selectedZoneIds={formData.applicableZoneIds}
        onClose={() => setZonePickerVisible(false)}
        onSave={(ids) => handleChange('applicableZoneIds', ids)}
      />

      {/* Kitchen Pickers */}
      <KitchenPickerModal
        visible={kitchenPickerVisible}
        selectedKitchenIds={formData.applicableKitchenIds}
        onClose={() => setKitchenPickerVisible(false)}
        onSave={(ids) => handleChange('applicableKitchenIds', ids)}
        title="Select Applicable Kitchens"
      />
      <KitchenPickerModal
        visible={excludedKitchenPickerVisible}
        selectedKitchenIds={formData.excludedKitchenIds}
        onClose={() => setExcludedKitchenPickerVisible(false)}
        onSave={(ids) => handleChange('excludedKitchenIds', ids)}
        title="Select Excluded Kitchens"
      />

      {/* Customer Picker (for SPECIFIC_USERS target) */}
      <CustomerPickerModal
        visible={customerPickerVisible}
        selectedCustomerIds={formData.specificUserIds
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)}
        onClose={() => setCustomerPickerVisible(false)}
        onSave={(ids) => handleChange('specificUserIds', ids.join(','))}
        title="Assign coupon to specific customers"
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.card,
    borderTopLeftRadius: spacing.borderRadiusLg,
    borderTopRightRadius: spacing.borderRadiusLg,
    maxHeight: '95%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  submitError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: spacing.borderRadiusMd,
  },
  submitErrorText: {
    fontSize: 13,
    color: colors.error,
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    color: colors.textMuted,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  pickerButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  pickerButtonPlaceholder: {
    color: colors.textMuted,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
  },
  hintText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#eff6ff',
    padding: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#1d4ed8',
    flex: 1,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 8,
  },
  switchLabel: {
    flex: 1,
    marginRight: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 14,
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Picker modal styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingTop: spacing.lg,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  pickerItemLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  pickerItemLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  pickerItemDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
