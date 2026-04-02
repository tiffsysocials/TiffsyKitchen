import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ToastAndroid,
  Platform,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAlert } from '../../../hooks/useAlert';
import {
  CutoffTimesSettings,
  DEFAULT_SETTINGS,
  ValidationErrors,
  validateSettings,
  hasValidationErrors,
  OverrideRole,
  EmergencyOverrideType,
  MealType,
  EMERGENCY_OVERRIDE_TYPES,
  parseTimeString,
  formatTimeToDisplay,
} from '../models/types';
import { loadCutoffSettings, saveCutoffSettings } from '../storage/cutoffStorage';
import {
  SettingsCard,
  TimePickerField,
  ToggleRow,
  NumericInput,
  RoleSelector,
  SettingsPreview,
} from '../components';
import { colors, spacing } from '../../../theme';
import { GradientBox } from '../../../components/common/GradientBox';

interface CutoffTimesSettingsScreenProps {
  onMenuPress: () => void;
}

// Toast helper
const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
};

export const CutoffTimesSettingsScreen: React.FC<CutoffTimesSettingsScreenProps> = ({
  onMenuPress,
}) => {
  const { showError, showWarning, showConfirm } = useAlert();

  // Loading and saving states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<CutoffTimesSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<CutoffTimesSettings>(DEFAULT_SETTINGS);

  // Validation
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Validate on settings change
  useEffect(() => {
    const validationErrors = validateSettings(settings);
    setErrors(validationErrors);

    // Check for unsaved changes
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);
    setHasUnsavedChanges(hasChanges);
  }, [settings, savedSettings]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const loaded = await loadCutoffSettings();
      setSettings(loaded);
      setSavedSettings(loaded);
    } catch (error) {
      console.error('Error loading settings:', error);
      showError('Error', 'Failed to load settings. Using defaults.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update settings helper
  const updateSettings = useCallback(<K extends keyof CutoffTimesSettings>(
    key: K,
    value: CutoffTimesSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Update nested settings helper
  const updateNestedSettings = useCallback(<
    K extends keyof CutoffTimesSettings,
    NK extends keyof CutoffTimesSettings[K]
  >(
    key: K,
    nestedKey: NK,
    value: CutoffTimesSettings[K][NK]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [nestedKey]: value,
      },
    }));
  }, []);

  // Handle save
  const handleSave = async () => {
    const validationErrors = validateSettings(settings);
    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      showWarning('Validation Error', 'Please fix the errors before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const success = await saveCutoffSettings(settings);
      if (success) {
        const updatedSettings = { ...settings, lastSavedAt: new Date().toISOString() };
        setSettings(updatedSettings);
        setSavedSettings(updatedSettings);
        showToast('Settings saved successfully');
      } else {
        showError('Error', 'Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    showConfirm(
      'Reset Settings',
      'Discard unsaved changes and restore last saved settings?',
      () => {
        setSettings(savedSettings);
        showToast('Settings restored');
      },
      undefined,
      { confirmText: 'Reset', cancelText: 'Cancel', isDestructive: true }
    );
  };

  // Handle emergency override activation
  const handleEmergencyToggle = (active: boolean) => {
    updateNestedSettings('emergencyOverride', 'active', active);
    if (active) {
      updateNestedSettings('emergencyOverride', 'createdAt', new Date().toISOString());
    } else {
      updateNestedSettings('emergencyOverride', 'meals', []);
      updateNestedSettings('emergencyOverride', 'minutes', null);
      updateNestedSettings('emergencyOverride', 'reason', '');
    }
  };

  // Toggle meal selection for emergency override
  const toggleEmergencyMeal = (meal: MealType) => {
    const current = settings.emergencyOverride.meals;
    const updated = current.includes(meal)
      ? current.filter((m) => m !== meal)
      : [...current, meal];
    updateNestedSettings('emergencyOverride', 'meals', updated);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <GradientBox style={styles.header}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <MaterialIcons name="menu" size={26} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Cut-off Times & Settings</Text>
          <Text style={styles.headerSubtitle}>
            Configure ordering windows and operational rules
          </Text>
        </View>
        {hasUnsavedChanges && (
          <View style={styles.unsavedBadge}>
            <Text style={styles.unsavedText}>Unsaved</Text>
          </View>
        )}
      </GradientBox>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Daily Ordering Windows */}
        <SettingsCard title="Daily Ordering Windows">
          {/* Lunch Section */}
          <View style={styles.mealSection}>
            <View style={styles.mealHeader}>
              <MaterialIcons name="wb-sunny" size={20} color="#FE8733" />
              <Text style={styles.mealTitle}>Lunch Ordering Window</Text>
            </View>
            <Text style={styles.mealHelper}>
              Lunch orders are accepted between Start Time and Cut-off Time.
            </Text>

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <TimePickerField
                  label="Start Time"
                  value={settings.lunch.startTime}
                  onChange={(value) => updateNestedSettings('lunch', 'startTime', value)}
                  error={errors.lunchStartTime}
                />
              </View>
              <View style={styles.timeField}>
                <TimePickerField
                  label="Cut-off Time"
                  value={settings.lunch.cutoffTime}
                  onChange={(value) => updateNestedSettings('lunch', 'cutoffTime', value)}
                  error={errors.lunchCutoffTime}
                />
              </View>
            </View>
          </View>

          <View style={styles.sectionDivider} />

          {/* Dinner Section */}
          <View style={styles.mealSection}>
            <View style={styles.mealHeader}>
              <MaterialIcons name="nights-stay" size={20} color="#6366f1" />
              <Text style={styles.mealTitle}>Dinner Ordering Window</Text>
            </View>
            <Text style={styles.mealHelper}>
              Dinner ordering opens after the lunch cut-off.
            </Text>

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <TimePickerField
                  label="Start Time"
                  value={settings.dinner.startTime}
                  onChange={(value) => updateNestedSettings('dinner', 'startTime', value)}
                  error={errors.dinnerStartTime}
                />
              </View>
              <View style={styles.timeField}>
                <TimePickerField
                  label="Cut-off Time"
                  value={settings.dinner.cutoffTime}
                  onChange={(value) => updateNestedSettings('dinner', 'cutoffTime', value)}
                  error={errors.dinnerCutoffTime}
                />
              </View>
            </View>
          </View>
        </SettingsCard>

        {/* Operational Behavior */}
        <SettingsCard title="Operational Behavior">
          <ToggleRow
            label="Allow order edits until cut-off time"
            value={settings.operationalBehavior.allowOrderEditUntilCutoff}
            onChange={(value) =>
              updateNestedSettings('operationalBehavior', 'allowOrderEditUntilCutoff', value)
            }
            helperText="If enabled, admins/customers can modify orders up to the meal's cut-off time."
          />

          <ToggleRow
            label="Allow subscription skips until cut-off time"
            value={settings.operationalBehavior.allowSkipUntilCutoff}
            onChange={(value) =>
              updateNestedSettings('operationalBehavior', 'allowSkipUntilCutoff', value)
            }
            helperText="If enabled, customers can skip a scheduled meal until the cut-off time without losing a voucher."
          />

          <ToggleRow
            label="Allow manual override after cut-off"
            value={settings.operationalBehavior.allowOverrideAfterCutoff}
            onChange={(value) =>
              updateNestedSettings('operationalBehavior', 'allowOverrideAfterCutoff', value)
            }
            helperText={
              settings.operationalBehavior.allowOverrideAfterCutoff
                ? 'Select which roles can make changes after cut-off.'
                : 'Order edits and skips after cut-off are not allowed.'
            }
          />

          {settings.operationalBehavior.allowOverrideAfterCutoff && (
            <RoleSelector
              selectedRoles={settings.operationalBehavior.overrideRoles}
              onChange={(roles) =>
                updateNestedSettings('operationalBehavior', 'overrideRoles', roles)
              }
              error={errors.overrideRoles}
            />
          )}
        </SettingsCard>

        {/* Capacity & Throttling */}
        <SettingsCard title="Capacity & Throttling">
          <ToggleRow
            label="Enable soft capacity limit"
            value={settings.capacity.enableSoftCapacity}
            onChange={(value) => updateNestedSettings('capacity', 'enableSoftCapacity', value)}
            helperText="If enabled, the app can visually warn when the kitchen is approaching its meal capacity per slot."
          />

          {settings.capacity.enableSoftCapacity && (
            <View style={styles.conditionalField}>
              <NumericInput
                label="Maximum meals per slot"
                value={settings.capacity.maxMealsPerSlot}
                onChange={(value) => updateNestedSettings('capacity', 'maxMealsPerSlot', value)}
                placeholder="e.g., 150"
                helperText="Used for displaying warnings and controlling UX when capacity is reached."
                error={errors.maxMealsPerSlot}
                min={1}
                max={999}
                step={10}
              />
            </View>
          )}
        </SettingsCard>

        {/* Emergency Override */}
        <SettingsCard
          title="Emergency Override"
          headerRight={
            settings.emergencyOverride.active ? (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            ) : null
          }
        >
          {settings.emergencyOverride.active && (
            <View style={styles.emergencyBanner}>
              <MaterialIcons name="warning" size={18} color={colors.error} />
              <Text style={styles.emergencyBannerText}>
                Emergency override is currently active
              </Text>
            </View>
          )}

          <ToggleRow
            label="Activate emergency override"
            value={settings.emergencyOverride.active}
            onChange={handleEmergencyToggle}
            helperText="Use this for rare situations like technical issues or special circumstances."
          />

          {settings.emergencyOverride.active && (
            <View style={styles.emergencyContent}>
              {/* Override Type */}
              <Text style={styles.fieldLabel}>Override Type</Text>
              <View style={styles.radioGroup}>
                {EMERGENCY_OVERRIDE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.radioOption,
                      settings.emergencyOverride.type === type.id && styles.radioOptionSelected,
                    ]}
                    onPress={() =>
                      updateNestedSettings('emergencyOverride', 'type', type.id)
                    }
                  >
                    <MaterialIcons
                      name={
                        settings.emergencyOverride.type === type.id
                          ? 'radio-button-checked'
                          : 'radio-button-unchecked'
                      }
                      size={20}
                      color={
                        settings.emergencyOverride.type === type.id
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                    <View style={styles.radioContent}>
                      <Text
                        style={[
                          styles.radioLabel,
                          settings.emergencyOverride.type === type.id && styles.radioLabelSelected,
                        ]}
                      >
                        {type.label}
                      </Text>
                      <Text style={styles.radioDescription}>{type.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Target Meals */}
              <Text style={styles.fieldLabel}>Target Meals</Text>
              <View style={styles.mealChipsRow}>
                {(['LUNCH', 'DINNER'] as MealType[]).map((meal) => (
                  <TouchableOpacity
                    key={meal}
                    style={[
                      styles.mealChip,
                      settings.emergencyOverride.meals.includes(meal) && styles.mealChipSelected,
                    ]}
                    onPress={() => toggleEmergencyMeal(meal)}
                  >
                    <MaterialIcons
                      name={meal === 'LUNCH' ? 'wb-sunny' : 'nights-stay'}
                      size={16}
                      color={
                        settings.emergencyOverride.meals.includes(meal)
                          ? colors.white
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.mealChipText,
                        settings.emergencyOverride.meals.includes(meal) &&
                        styles.mealChipTextSelected,
                      ]}
                    >
                      {meal.charAt(0) + meal.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.emergencyMeals && (
                <Text style={styles.errorText}>{errors.emergencyMeals}</Text>
              )}

              {/* Minutes Adjustment */}
              {settings.emergencyOverride.type !== 'STOP_ORDERS' && (
                <NumericInput
                  label={
                    settings.emergencyOverride.type === 'EXTEND'
                      ? 'Minutes to extend'
                      : 'Minutes to close early'
                  }
                  value={settings.emergencyOverride.minutes}
                  onChange={(value) =>
                    updateNestedSettings('emergencyOverride', 'minutes', value)
                  }
                  placeholder="e.g., 30"
                  helperText={
                    settings.emergencyOverride.type === 'EXTEND'
                      ? 'Enter the number of extra minutes to extend the cut-off.'
                      : 'Enter minutes to close orders earlier than usual.'
                  }
                  error={errors.emergencyMinutes}
                  min={5}
                  max={120}
                  step={5}
                />
              )}

              {/* Reason */}
              <Text style={styles.fieldLabel}>Reason (visible internally) *</Text>
              <TextInput
                style={[
                  styles.reasonInput,
                  errors.emergencyReason && styles.reasonInputError,
                ]}
                value={settings.emergencyOverride.reason}
                onChangeText={(text) =>
                  updateNestedSettings('emergencyOverride', 'reason', text)
                }
                placeholder="Enter the reason for this override..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              {errors.emergencyReason && (
                <Text style={styles.errorText}>{errors.emergencyReason}</Text>
              )}
            </View>
          )}
        </SettingsCard>

        {/* Preview */}
        <SettingsPreview settings={settings} />

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.resetButton, !hasUnsavedChanges && styles.buttonDisabled]}
            onPress={handleReset}
            disabled={!hasUnsavedChanges}
          >
            <MaterialIcons
              name="refresh"
              size={18}
              color={hasUnsavedChanges ? colors.textSecondary : colors.textMuted}
            />
            <Text
              style={[
                styles.resetButtonText,
                !hasUnsavedChanges && styles.buttonTextDisabled,
              ]}
            >
              Reset to Last Saved
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.saveButton,
              (hasValidationErrors(errors) || isSaving) && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={hasValidationErrors(errors) || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <MaterialIcons name="save" size={18} color={colors.white} />
                <Text style={styles.saveButtonText}>Save Settings</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Last Saved Info */}
        {settings.lastSavedAt && (
          <Text style={styles.lastSavedText}>
            Last saved: {new Date(settings.lastSavedAt).toLocaleString()}
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  menuButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  unsavedBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadiusSm,
  },
  unsavedText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  mealSection: {
    marginBottom: spacing.sm,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  mealTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  mealHelper: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeField: {
    flex: 1,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  conditionalField: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  activeBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: spacing.borderRadiusSm,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadiusMd,
    marginBottom: spacing.md,
  },
  emergencyBannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.error,
    marginLeft: spacing.sm,
  },
  emergencyContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  radioGroup: {
    gap: spacing.xs,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.sm,
    borderRadius: spacing.borderRadiusMd,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  radioOptionSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  radioContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  radioLabelSelected: {
    color: colors.primary,
  },
  radioDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  mealChipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  mealChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mealChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  mealChipTextSelected: {
    color: colors.white,
  },
  reasonInput: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 80,
  },
  reasonInputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginLeft: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextDisabled: {
    color: colors.textMuted,
  },
  lastSavedText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});

export default CutoffTimesSettingsScreen;
