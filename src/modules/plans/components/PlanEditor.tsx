import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAlert } from '../../../hooks/useAlert';
import {
  Plan,
  PlanFormData,
  ValidationErrors,
  MealType,
  TargetUser,
  PackagingRule,
  mealTypeLabels,
  targetUserLabels,
  packagingRuleLabels,
  packagingRuleHelpers,
  DURATION_OPTIONS,
} from '../models/types';
import {
  planToFormData,
  getEmptyFormData,
  validatePlanForm,
  hasValidationErrors,
  hasFormChanged,
  formatDate,
} from '../utils/planUtils';
import { colors, spacing } from '../../../theme';

interface PlanEditorProps {
  visible: boolean;
  plan?: Plan;
  existingPlans: Plan[];
  onSave: (formData: PlanFormData) => void;
  onClose: () => void;
}

export const PlanEditor: React.FC<PlanEditorProps> = ({
  visible,
  plan,
  existingPlans,
  onSave,
  onClose,
}) => {
  const { showWarning, showConfirm } = useAlert();
  const isEditing = !!plan;
  const [formData, setFormData] = useState<PlanFormData>(getEmptyFormData());
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data when plan changes or modal opens
  useEffect(() => {
    if (visible) {
      if (plan) {
        setFormData(planToFormData(plan));
      } else {
        setFormData(getEmptyFormData());
      }
      setErrors({});
      setHasChanges(false);
    }
  }, [visible, plan]);

  // Track changes
  useEffect(() => {
    setHasChanges(hasFormChanged(formData, plan));
  }, [formData, plan]);

  // Update form field
  const updateField = useCallback(<K extends keyof PlanFormData>(
    field: K,
    value: PlanFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof ValidationErrors];
        return newErrors;
      });
    }
  }, [errors]);

  // Toggle duration option
  const toggleDuration = useCallback((duration: number) => {
    setFormData(prev => {
      const newDurations = prev.allowedDurations.includes(duration)
        ? prev.allowedDurations.filter(d => d !== duration)
        : [...prev.allowedDurations, duration].sort((a, b) => a - b);
      return { ...prev, allowedDurations: newDurations };
    });
    if (errors.allowedDurations) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.allowedDurations;
        return newErrors;
      });
    }
  }, [errors]);

  // Handle save
  const handleSave = useCallback(() => {
    const validationErrors = validatePlanForm(formData, existingPlans, plan?.id);

    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      showWarning(
        'Validation Error',
        'Please fix the highlighted fields before saving.'
      );
      return;
    }

    onSave(formData);
  }, [formData, existingPlans, plan, onSave, showWarning]);

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasChanges) {
      showConfirm(
        'Discard changes?',
        'You have unsaved changes to this plan.',
        onClose,
        undefined,
        { confirmText: 'Discard', cancelText: 'Keep editing', isDestructive: true }
      );
    } else {
      onClose();
    }
  }, [hasChanges, onClose, showConfirm]);

  // Render section header
  const renderSectionHeader = (title: string, icon: string) => (
    <View style={styles.sectionHeader}>
      <MaterialIcons name={icon} size={18} color={colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  // Render text input
  const renderInput = (
    label: string,
    field: keyof PlanFormData,
    placeholder: string,
    options?: {
      multiline?: boolean;
      keyboardType?: 'default' | 'numeric';
      helper?: string;
      autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    }
  ) => {
    const error = errors[field as keyof ValidationErrors];
    return (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[
            styles.input,
            options?.multiline && styles.inputMultiline,
            error && styles.inputError,
          ]}
          value={formData[field] as string}
          onChangeText={(text) => updateField(field, text as PlanFormData[typeof field])}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline={options?.multiline}
          numberOfLines={options?.multiline ? 4 : 1}
          textAlignVertical={options?.multiline ? 'top' : 'center'}
          keyboardType={options?.keyboardType || 'default'}
          autoCapitalize={options?.autoCapitalize || 'sentences'}
        />
        {options?.helper && !error && (
          <Text style={styles.helperText}>{options.helper}</Text>
        )}
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={14} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    );
  };

  // Render segmented control for selection
  const renderSegmentedControl = <T extends string>(
    label: string,
    field: keyof PlanFormData,
    options: { value: T; label: string }[],
    columns: number = 2
  ) => {
    const error = errors[field as keyof ValidationErrors];
    const selectedValue = formData[field] as T;

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.segmentedContainer, { flexWrap: columns > 2 ? 'wrap' : 'nowrap' }]}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.segment,
                columns > 2 && styles.segmentWrap,
                selectedValue === option.value && styles.segmentSelected,
              ]}
              onPress={() => updateField(field, option.value as PlanFormData[typeof field])}
            >
              <Text
                style={[
                  styles.segmentText,
                  selectedValue === option.value && styles.segmentTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={14} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    );
  };

  // Render voucher-count numeric input (replaces the old chip multi-select)
  const renderVoucherCountInput = () => {
    const minVouchers = parseInt(formData.durationMinDays, 10) || 0;
    const maxVouchers = parseInt(formData.durationMaxDays, 10) || 999;
    const error = errors.allowedDurations;
    const currentValue = formData.allowedDurations[0]?.toString() || '';

    const handleChange = (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, '');
      const num = parseInt(cleaned, 10);
      setFormData((prev) => ({
        ...prev,
        allowedDurations: Number.isFinite(num) && num > 0 ? [num] : [],
      }));
      if (errors.allowedDurations) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.allowedDurations;
          return next;
        });
      }
    };

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>No of vouchers</Text>
        <TextInput
          style={[styles.input, error ? styles.inputError : undefined]}
          value={currentValue}
          onChangeText={handleChange}
          keyboardType="numeric"
          placeholder={`e.g., ${minVouchers || 15}`}
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.helperText}>
          Number of vouchers this plan grants (must be between {minVouchers} and {maxVouchers}).
        </Text>
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={14} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    );
  };

  // Render packaging rule selector with helper
  const renderPackagingSelector = () => {
    const selectedRule = formData.packagingRule;
    const error = errors.packagingRule;

    const packagingOptions: { value: PackagingRule; label: string }[] = [
      { value: 'DEFAULT', label: packagingRuleLabels.DEFAULT },
      { value: 'STEEL_FOR_PLANS_OVER_14_VOUCHERS', label: packagingRuleLabels.STEEL_FOR_PLANS_OVER_14_VOUCHERS },
      { value: 'DISPOSABLE_ONLY', label: packagingRuleLabels.DISPOSABLE_ONLY },
    ];

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Packaging Rule</Text>
        {packagingOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.radioOption,
              selectedRule === option.value && styles.radioOptionSelected,
            ]}
            onPress={() => updateField('packagingRule', option.value)}
          >
            <View style={styles.radio}>
              {selectedRule === option.value && <View style={styles.radioInner} />}
            </View>
            <Text
              style={[
                styles.radioText,
                selectedRule === option.value && styles.radioTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.packagingHelper}>
          <MaterialIcons name="info-outline" size={14} color={colors.info} />
          <Text style={styles.packagingHelperText}>
            {packagingRuleHelpers[selectedRule]}
          </Text>
        </View>
        {error && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={14} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {isEditing ? 'Edit Plan' : 'New Plan'}
            </Text>
            {isEditing && (
              <Text style={styles.headerSubtitle}>Editing existing plan</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, !hasChanges && styles.saveButtonDisabled]}
            disabled={!hasChanges}
          >
            <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextDisabled]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Details Section */}
          {renderSectionHeader('Basic Details', 'description')}
          <View style={styles.section}>
            {renderInput('Plan Name', 'name', 'e.g., Basic Saver')}
            {renderInput('Internal Code', 'internalCode', 'e.g., BASIC_SAVER', {
              helper: 'Used internally; must be unique, uppercase, and without spaces.',
              autoCapitalize: 'characters',
            })}
            {renderInput('Short Tagline', 'shortTagline', 'A catchy one-liner for customers', {
              helper: 'Optional marketing phrase shown to customers.',
            })}
            {renderInput('Description', 'description', 'Detailed description of the plan...', {
              multiline: true,
            })}
          </View>

          {/* Pricing & Vouchers Section */}
          {renderSectionHeader('Pricing & Vouchers', 'payments')}
          <View style={styles.section}>
            {renderInput('Base Price per Meal', 'basePricePerMeal', 'e.g., 79', {
              keyboardType: 'numeric',
              helper: 'Price per meal shown to customers (in ₹).',
            })}

            <View style={styles.durationRow}>
              <View style={styles.durationField}>
                {renderInput('Min vouchers', 'durationMinDays', '7', {
                  keyboardType: 'numeric',
                })}
              </View>
              <View style={styles.durationField}>
                {renderInput('Max vouchers', 'durationMaxDays', '60', {
                  keyboardType: 'numeric',
                })}
              </View>
            </View>

            {renderVoucherCountInput()}
          </View>

          {/* Meal & Audience Section */}
          {renderSectionHeader('Meal & Audience', 'restaurant')}
          <View style={styles.section}>
            {renderSegmentedControl<MealType>(
              'Meal Type',
              'mealType',
              [
                { value: 'VEG', label: 'Veg only' },
                { value: 'VEG_PLUS_ADDONS', label: 'Veg + Add-ons' },
                { value: 'ROTATING_MENU', label: 'Rotating menu' },
              ],
              3
            )}

            {renderSegmentedControl<TargetUser>(
              'Target Audience',
              'targetUser',
              [
                { value: 'STUDENTS', label: 'Students' },
                { value: 'WORKING', label: 'Working' },
                { value: 'FITNESS', label: 'Fitness' },
                { value: 'OTHER', label: 'Other' },
              ],
              4
            )}

            {formData.targetUser === 'OTHER' && (
              renderInput('Custom Audience', 'customTargetUser', 'e.g., Senior citizens')
            )}

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Supports Add-ons</Text>
                <Text style={styles.switchHelper}>
                  Allow customers to add paid extras to their meals
                </Text>
              </View>
              <Switch
                value={formData.supportsAddOns}
                onValueChange={(value) => updateField('supportsAddOns', value)}
                trackColor={{ false: colors.divider, true: colors.primaryLight }}
                thumbColor={formData.supportsAddOns ? colors.primary : colors.card}
              />
            </View>
          </View>

          {/* Packaging Section */}
          {renderSectionHeader('Packaging Rule', 'inventory-2')}
          <View style={styles.section}>
            {renderPackagingSelector()}
          </View>

          {/* Status Section */}
          {renderSectionHeader('Status', 'toggle-on')}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Active</Text>
                <Text style={styles.switchHelper}>
                  {formData.isActive
                    ? 'This plan is visible to customers'
                    : 'This plan is hidden from customers'}
                </Text>
              </View>
              <Switch
                value={formData.isActive}
                onValueChange={(value) => updateField('isActive', value)}
                trackColor={{ false: colors.divider, true: colors.successLight }}
                thumbColor={formData.isActive ? colors.success : colors.card}
              />
            </View>

            {isEditing && plan && (
              <View style={styles.metaInfo}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Created:</Text>
                  <Text style={styles.metaValue}>{formatDate(plan.createdAt)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Last Updated:</Text>
                  <Text style={styles.metaValue}>{formatDate(plan.updatedAt)}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
    borderBottomColor: colors.divider,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadiusMd,
  },
  saveButtonDisabled: {
    backgroundColor: colors.divider,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  saveButtonTextDisabled: {
    color: colors.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    borderRadius: spacing.borderRadiusLg,
    padding: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: spacing.sm,
  },
  inputError: {
    borderColor: colors.error,
  },
  helperText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginLeft: 4,
  },
  durationRow: {
    flexDirection: 'row',
    marginHorizontal: -spacing.xs,
  },
  durationField: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: colors.white,
  },
  chipTextDisabled: {
    color: colors.textMuted,
  },
  chipCheck: {
    marginLeft: 4,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: spacing.borderRadiusSm,
  },
  segmentWrap: {
    flex: 0,
    paddingHorizontal: spacing.sm,
    marginBottom: 3,
    marginRight: 3,
  },
  segmentSelected: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  segmentTextSelected: {
    color: colors.white,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: spacing.borderRadiusMd,
    backgroundColor: colors.background,
  },
  radioOptionSelected: {
    backgroundColor: colors.primaryLight,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  radioTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  packagingHelper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.infoLight,
    padding: spacing.sm,
    borderRadius: spacing.borderRadiusSm,
    marginTop: spacing.sm,
  },
  packagingHelperText: {
    fontSize: 12,
    color: colors.info,
    marginLeft: spacing.xs,
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  switchHelper: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  metaInfo: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textMuted,
    width: 100,
  },
  metaValue: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bottomSpacing: {
    height: spacing.xxxl,
  },
});

export default PlanEditor;
