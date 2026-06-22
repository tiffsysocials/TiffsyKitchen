/**
 * Plan Form Modal Component
 *
 * Modal for creating and editing subscription plans
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SubscriptionPlan, CreatePlanRequest, PlanStatus } from '../../../types/subscription.types';
import { useAlert } from '../../../hooks/useAlert';

interface PlanFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePlanRequest) => Promise<void>;
  plan?: SubscriptionPlan; // For edit mode
}

const PRIMARY_COLOR = '#FE8733';

export const PlanFormModal: React.FC<PlanFormModalProps> = ({ visible, onClose, onSubmit, plan }) => {
  const { showWarning, showError } = useAlert();
  const isEditMode = !!plan;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  // Vouchers per day is no longer editable in the form; every plan issues one
  // voucher per day. Retained for the request payload and summary math.
  const [vouchersPerDay, setVouchersPerDay] = useState(1);
  const [voucherValidityDays, setVoucherValidityDays] = useState(90);
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  // GST on the voucher-pack purchase. Stored here as a PERCENT (e.g. '5');
  // converted to/from the backend's fraction (0.05) at the boundary.
  const [taxRatePercent, setTaxRatePercent] = useState('');
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [hsnCode, setHsnCode] = useState('');
  const [badge, setBadge] = useState('');
  const [features, setFeatures] = useState<string[]>(['']);
  const [displayOrder, setDisplayOrder] = useState('1');
  const [status, setStatus] = useState<PlanStatus>('INACTIVE');
  const [includesAddons, setIncludesAddons] = useState(false);
  const [addonValue, setAddonValue] = useState('');

  const [loading, setLoading] = useState(false);

  // Initialize form with plan data in edit mode
  useEffect(() => {
    if (plan) {
      setName(plan.name);
      setDescription(plan.description || '');
      setDurationDays(plan.durationDays.toString());
      setVouchersPerDay(plan.vouchersPerDay);
      setVoucherValidityDays(plan.voucherValidityDays);
      setPrice(plan.price.toString());
      setOriginalPrice(plan.originalPrice?.toString() || '');
      // Backend stores a fraction; show it as a percent.
      setTaxRatePercent(plan.taxRate ? (plan.taxRate * 100).toString() : '');
      setTaxInclusive(plan.taxInclusive ?? true);
      setHsnCode(plan.hsnCode || '');
      setBadge(plan.badge || '');
      setFeatures(plan.features.length > 0 ? plan.features : ['']);
      setDisplayOrder(plan.displayOrder.toString());
      setStatus(plan.status);
      setIncludesAddons(plan.coverageRules.includesAddons);
      setAddonValue(plan.coverageRules.addonValuePerVoucher?.toString() || '');
    }
  }, [plan]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setDurationDays('7');
    setVouchersPerDay(1);
    setVoucherValidityDays(90);
    setPrice('');
    setOriginalPrice('');
    setTaxRatePercent('');
    setTaxInclusive(true);
    setHsnCode('');
    setBadge('');
    setFeatures(['']);
    setDisplayOrder('1');
    setStatus('INACTIVE');
    setIncludesAddons(false);
    setAddonValue('');
  };

  const handleAddFeature = () => {
    setFeatures([...features, '']);
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      showWarning('Validation Error', 'Plan name is required');
      return false;
    }

    const durationNum = parseInt(durationDays);
    if (!durationDays || isNaN(durationNum) || durationNum < 1) {
      showWarning('Validation Error', 'Valid duration (days) is required');
      return false;
    }

    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      showWarning('Validation Error', 'Valid price is required');
      return false;
    }

    if (originalPrice) {
      const originalPriceNum = parseFloat(originalPrice);
      if (isNaN(originalPriceNum) || originalPriceNum <= priceNum) {
        showWarning('Validation Error', 'Original price must be greater than price');
        return false;
      }
    }

    if (taxRatePercent.trim()) {
      const taxNum = parseFloat(taxRatePercent);
      if (isNaN(taxNum) || taxNum < 0 || taxNum > 100) {
        showWarning('Validation Error', 'GST rate must be between 0 and 100');
        return false;
      }
    }

    const displayOrderNum = parseInt(displayOrder);
    if (!displayOrder || isNaN(displayOrderNum) || displayOrderNum < 1) {
      showWarning('Validation Error', 'Valid display order is required');
      return false;
    }

    const filteredFeatures = features.filter((f) => f.trim() !== '');
    if (filteredFeatures.length === 0) {
      showWarning('Validation Error', 'At least one feature is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const planData: CreatePlanRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        durationDays: parseInt(durationDays),
        vouchersPerDay,
        voucherValidityDays,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        // Convert percent → fraction for the backend (5 → 0.05).
        taxRate: taxRatePercent.trim() ? parseFloat(taxRatePercent) / 100 : 0,
        taxInclusive,
        hsnCode: hsnCode.trim() || undefined,
        coverageRules: {
          includesAddons,
          addonValuePerVoucher: includesAddons && addonValue ? parseFloat(addonValue) : null,
          mealTypes: ['BOTH'],
        },
        applicableZoneIds: [],
        displayOrder: parseInt(displayOrder),
        badge: badge.trim() || undefined,
        features: features.filter((f) => f.trim() !== ''),
        status,
      };

      await onSubmit(planData);
      resetForm();
      onClose();
    } catch (error: any) {
      showError('Error', error.message || 'Failed to save plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Plan' : 'Create New Plan'}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Form */}
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Plan Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Weekly Starter"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Brief description of the plan"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Duration */}
          <View style={styles.field}>
            <Text style={styles.label}>Duration (Days) * {isEditMode && '(Cannot be changed)'}</Text>
            <TextInput
              style={[styles.input, isEditMode && styles.inputDisabled]}
              value={durationDays}
              onChangeText={(text) => !isEditMode && setDurationDays(text.replace(/[^0-9]/g, ''))}
              placeholder="e.g., 30"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
              editable={!isEditMode}
            />
          </View>

          {/* Voucher Validity */}
          <View style={styles.field}>
            <Text style={styles.label}>Voucher Validity (Days) *</Text>
            <TextInput
              style={styles.input}
              value={voucherValidityDays.toString()}
              onChangeText={(text) => setVoucherValidityDays(parseInt(text) || 90)}
              placeholder="90"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Price */}
          <View style={styles.field}>
            <Text style={styles.label}>Price (₹) *</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="699"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Original Price */}
          <View style={styles.field}>
            <Text style={styles.label}>Original Price (₹)</Text>
            <TextInput
              style={styles.input}
              value={originalPrice}
              onChangeText={setOriginalPrice}
              placeholder="999 (for showing discount)"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Tax (GST) */}
          <View style={styles.field}>
            <Text style={styles.label}>GST Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={taxRatePercent}
              onChangeText={(text) => setTaxRatePercent(text.replace(/[^0-9.]/g, ''))}
              placeholder="e.g., 5 (leave empty for no GST)"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>GST Treatment</Text>
            <View style={styles.optionsRow}>
              {([
                { key: true, label: 'Inclusive' },
                { key: false, label: 'Exclusive' },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.optionButton, taxInclusive === opt.key && styles.optionButtonActive]}
                  onPress={() => setTaxInclusive(opt.key)}
                >
                  <Text style={[styles.optionText, taxInclusive === opt.key && styles.optionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helperText}>
              {taxInclusive
                ? 'Price already includes GST — customer pays the same price.'
                : 'GST is added on top of the price — customer pays price + GST.'}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>HSN Code</Text>
            <TextInput
              style={styles.input}
              value={hsnCode}
              onChangeText={setHsnCode}
              placeholder="e.g., 2106 (optional)"
              autoCapitalize="characters"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Badge */}
          <View style={styles.field}>
            <Text style={styles.label}>Badge Text</Text>
            <TextInput
              style={styles.input}
              value={badge}
              onChangeText={setBadge}
              placeholder="e.g., BEST VALUE, POPULAR"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Display Order */}
          <View style={styles.field}>
            <Text style={styles.label}>Display Order *</Text>
            <TextInput
              style={styles.input}
              value={displayOrder}
              onChangeText={setDisplayOrder}
              placeholder="1"
              keyboardType="numeric"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Includes Addons */}
          <View style={styles.field}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIncludesAddons(!includesAddons)}
            >
              <Icon
                name={includesAddons ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={includesAddons ? PRIMARY_COLOR : '#9ca3af'}
              />
              <Text style={styles.checkboxLabel}>Includes Addons</Text>
            </TouchableOpacity>
            {includesAddons && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={addonValue}
                onChangeText={setAddonValue}
                placeholder="Addon value per voucher (e.g., 30)"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
            )}
          </View>

          {/* Features */}
          <View style={styles.field}>
            <Text style={styles.label}>Features *</Text>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={feature}
                  onChangeText={(text) => handleFeatureChange(index, text)}
                  placeholder="e.g., 14 meal vouchers"
                  placeholderTextColor="#9ca3af"
                />
                {features.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveFeature(index)}>
                    <Icon name="remove-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={handleAddFeature}>
              <Icon name="add-circle" size={20} color={PRIMARY_COLOR} />
              <Text style={styles.addButtonText}>Add Feature</Text>
            </TouchableOpacity>
          </View>

          {/* Status */}
          <View style={styles.field}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.optionsRow}>
              {(['ACTIVE', 'INACTIVE'] as PlanStatus[]).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionButton, status === option && styles.optionButtonActive]}
                  onPress={() => setStatus(option)}
                >
                  <Text style={[styles.optionText, status === option && styles.optionTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Summary */}
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <Text style={styles.summaryText}>
              Total Vouchers: {(parseInt(durationDays) || 0) * vouchersPerDay}
            </Text>
            <Text style={styles.summaryText}>Valid for: {voucherValidityDays} days</Text>
            {taxRatePercent.trim() && price && parseFloat(taxRatePercent) > 0 && (
              <Text style={styles.summaryText}>
                {taxInclusive
                  ? `GST ${taxRatePercent}% incl. — pay ₹${parseFloat(price).toFixed(2)}`
                  : `GST ${taxRatePercent}% extra — pay ₹${(
                      parseFloat(price) *
                      (1 + parseFloat(taxRatePercent) / 100)
                    ).toFixed(2)}`}
              </Text>
            )}
            {originalPrice && price && (
              <Text style={styles.summaryText}>
                Discount:{' '}
                {Math.round(((parseFloat(originalPrice) - parseFloat(price)) / parseFloat(originalPrice)) * 100)}%
              </Text>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>{isEditMode ? 'Update Plan' : 'Create Plan'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
  },
  field: {
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  optionButtonActive: {
    backgroundColor: '#fff7ed',
    borderColor: PRIMARY_COLOR,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  optionTextActive: {
    color: PRIMARY_COLOR,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  summaryBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginVertical: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
