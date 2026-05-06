import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ReferralConfig } from '../../../types/api.types';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

type MealType = 'LUNCH' | 'DINNER' | 'ANY';
const MEAL_TYPES: MealType[] = ['LUNCH', 'DINNER', 'ANY'];

interface MilestoneRow {
  referralCount: string;
  bonusVouchers: string;
  badgeName: string;
}

interface FormState {
  enabled: boolean;
  conversionEvent: string;
  conversionWindowDays: string;
  maxReferralsPerUser: string;
  referrerVoucherCount: string;
  referrerMealType: MealType;
  referrerValidityDays: string;
  refereeVoucherCount: string;
  refereeMealType: MealType;
  refereeValidityDays: string;
  shareMessage: string;
  sameAddressLimit: string;
  minPlanValueForConversion: string;
  milestones: MilestoneRow[];
}

interface FieldErrors {
  [key: string]: string | undefined;
}

interface Props {
  visible: boolean;
  config: ReferralConfig | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: ReferralConfig) => Promise<void>;
}

type SectionKey =
  | 'status'
  | 'referrer'
  | 'referee'
  | 'limits'
  | 'share'
  | 'antiAbuse'
  | 'milestones';

const buildFormState = (cfg: ReferralConfig | null): FormState => ({
  enabled: cfg?.enabled ?? false,
  conversionEvent: cfg?.conversionEvent || 'FIRST_SUBSCRIPTION',
  conversionWindowDays: String(cfg?.conversionWindowDays ?? 30),
  maxReferralsPerUser: String(cfg?.maxReferralsPerUser ?? 50),
  referrerVoucherCount: String(cfg?.referrerReward?.voucherCount ?? 3),
  referrerMealType: ((cfg?.referrerReward?.voucherMealType as MealType) || 'ANY'),
  referrerValidityDays: String(cfg?.referrerReward?.voucherValidityDays ?? 90),
  refereeVoucherCount: String(cfg?.refereeReward?.voucherCount ?? 2),
  refereeMealType: ((cfg?.refereeReward?.voucherMealType as MealType) || 'ANY'),
  refereeValidityDays: String(cfg?.refereeReward?.voucherValidityDays ?? 90),
  shareMessage:
    cfg?.shareMessage ||
    'I love my daily meals from Tiffsy! Use my code {CODE} to get {REFEREE_REWARD} free meals on your first subscription. Download: {LINK}',
  sameAddressLimit: String(cfg?.antiAbuse?.sameAddressLimit ?? 3),
  minPlanValueForConversion: String(cfg?.antiAbuse?.minPlanValueForConversion ?? 0),
  milestones: (cfg?.milestones || []).map((m) => ({
    referralCount: String(m.referralCount),
    bonusVouchers: String(m.bonusVouchers),
    badgeName: m.badgeName,
  })),
});

export const ReferralConfigEditModal: React.FC<Props> = ({
  visible,
  config,
  saving = false,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<FormState>(buildFormState(null));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sections, setSections] = useState<Record<SectionKey, boolean>>({
    status: true,
    referrer: true,
    referee: false,
    limits: false,
    share: false,
    antiAbuse: false,
    milestones: false,
  });

  useEffect(() => {
    if (visible) {
      setForm(buildFormState(config));
      setErrors({});
      setSubmitError(null);
      setSections({
        status: true,
        referrer: true,
        referee: false,
        limits: false,
        share: false,
        antiAbuse: false,
        milestones: false,
      });
    }
  }, [visible, config]);

  const setField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field as string] ? { ...prev, [field as string]: undefined } : prev));
  }, []);

  const toggleSection = (key: SectionKey) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateMilestone = (idx: number, field: keyof MilestoneRow, value: string) => {
    setForm((prev) => {
      const next = [...prev.milestones];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, milestones: next };
    });
    const errKey = `milestone_${idx}_${field}`;
    setErrors((prev) => (prev[errKey] ? { ...prev, [errKey]: undefined } : prev));
  };

  const addMilestone = () => {
    setForm((prev) => ({
      ...prev,
      milestones: [...prev.milestones, { referralCount: '', bonusVouchers: '', badgeName: '' }],
    }));
  };

  const removeMilestone = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== idx),
    }));
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};

    const intInRange = (raw: string, min: number, max: number): number | null => {
      if (!/^-?\d+$/.test(raw.trim())) return null;
      const n = parseInt(raw, 10);
      if (Number.isNaN(n) || n < min || n > max) return null;
      return n;
    };

    if (intInRange(form.conversionWindowDays, 1, 365) === null) {
      next.conversionWindowDays = 'Must be a whole number between 1 and 365';
    }
    if (intInRange(form.maxReferralsPerUser, 1, 1000) === null) {
      next.maxReferralsPerUser = 'Must be a whole number between 1 and 1000';
    }

    if (intInRange(form.referrerVoucherCount, 0, 50) === null) {
      next.referrerVoucherCount = 'Must be 0–50';
    }
    if (intInRange(form.referrerValidityDays, 1, 365) === null) {
      next.referrerValidityDays = 'Must be 1–365';
    }
    if (intInRange(form.refereeVoucherCount, 0, 50) === null) {
      next.refereeVoucherCount = 'Must be 0–50';
    }
    if (intInRange(form.refereeValidityDays, 1, 365) === null) {
      next.refereeValidityDays = 'Must be 1–365';
    }

    if (form.shareMessage.length > 500) {
      next.shareMessage = 'Share message must be 500 characters or fewer';
    }

    const sameAddr = intInRange(form.sameAddressLimit, 0, 100);
    if (sameAddr === null) {
      next.sameAddressLimit = 'Must be 0 or higher';
    }
    if (intInRange(form.minPlanValueForConversion, 0, 1000000) === null) {
      next.minPlanValueForConversion = 'Must be 0 or higher';
    }

    form.milestones.forEach((m, i) => {
      if (intInRange(m.referralCount, 1, 100000) === null) {
        next[`milestone_${i}_referralCount`] = 'Must be ≥ 1';
      }
      if (intInRange(m.bonusVouchers, 1, 1000) === null) {
        next[`milestone_${i}_bonusVouchers`] = 'Must be ≥ 1';
      }
      const name = m.badgeName.trim();
      if (!name) {
        next[`milestone_${i}_badgeName`] = 'Required';
      } else if (name.length > 50) {
        next[`milestone_${i}_badgeName`] = 'Max 50 characters';
      }
    });

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = (): ReferralConfig => {
    const sortedMilestones = [...form.milestones]
      .map((m) => ({
        referralCount: parseInt(m.referralCount, 10),
        bonusVouchers: parseInt(m.bonusVouchers, 10),
        badgeName: m.badgeName.trim(),
      }))
      .sort((a, b) => a.referralCount - b.referralCount);

    return {
      enabled: form.enabled,
      conversionEvent: form.conversionEvent,
      conversionWindowDays: parseInt(form.conversionWindowDays, 10),
      maxReferralsPerUser: parseInt(form.maxReferralsPerUser, 10),
      referrerReward: {
        voucherCount: parseInt(form.referrerVoucherCount, 10),
        voucherMealType: form.referrerMealType,
        voucherValidityDays: parseInt(form.referrerValidityDays, 10),
      },
      refereeReward: {
        voucherCount: parseInt(form.refereeVoucherCount, 10),
        voucherMealType: form.refereeMealType,
        voucherValidityDays: parseInt(form.refereeValidityDays, 10),
      },
      shareMessage: form.shareMessage,
      antiAbuse: {
        sameAddressLimit: parseInt(form.sameAddressLimit, 10),
        minPlanValueForConversion: parseInt(form.minPlanValueForConversion, 10),
      },
      milestones: sortedMilestones,
    };
  };

  const handleSave = async () => {
    setSubmitError(null);
    if (!validate()) return;
    try {
      await onSave(buildPayload());
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to save configuration');
    }
  };

  const renderSectionHeader = (key: SectionKey, title: string, icon: string, summary?: string) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => toggleSection(key)}
      activeOpacity={0.7}
    >
      <View style={styles.sectionHeaderLeft}>
        <Icon name={icon} size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {summary ? <Text style={styles.sectionSummary}>{summary}</Text> : null}
        </View>
      </View>
      <Icon
        name={sections[key] ? 'expand-less' : 'expand-more'}
        size={24}
        color={colors.textMuted}
      />
    </TouchableOpacity>
  );

  const renderError = (key: string) =>
    errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null;

  const renderMealTypePicker = (
    selected: MealType,
    onChange: (v: MealType) => void,
  ) => (
    <View style={styles.segmentedRow}>
      {MEAL_TYPES.map((mt) => {
        const active = selected === mt;
        return (
          <TouchableOpacity
            key={mt}
            style={[styles.segmentedButton, active && styles.segmentedButtonActive]}
            onPress={() => onChange(mt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentedButtonText, active && styles.segmentedButtonTextActive]}>
              {mt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Edit Referral Program</Text>
              <Text style={styles.headerSubtitle}>
                Customize rewards, limits, share message and milestones
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {submitError ? (
            <View style={styles.submitError}>
              <Icon name="error" size={16} color={colors.error} />
              <Text style={styles.submitErrorText}>{submitError}</Text>
            </View>
          ) : null}

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* ============ Program status ============ */}
            {renderSectionHeader('status', 'Program Status', 'power-settings-new')}
            {sections.status && (
              <View style={styles.sectionContent}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Enabled</Text>
                    <Text style={styles.hintText}>
                      When off, no new referrals or conversions are processed.
                    </Text>
                  </View>
                  <Switch
                    value={form.enabled}
                    onValueChange={(v) => setField('enabled', v)}
                    trackColor={{ false: colors.gray300, true: colors.success }}
                    thumbColor={colors.white}
                  />
                </View>

                <Text style={styles.label}>Conversion Event</Text>
                <View style={styles.readonlyBox}>
                  <Text style={styles.readonlyText}>{form.conversionEvent}</Text>
                  <Icon name="lock" size={14} color={colors.textMuted} />
                </View>
                <Text style={styles.hintText}>
                  Backend currently only supports FIRST_SUBSCRIPTION.
                </Text>
              </View>
            )}

            {/* ============ Referrer reward ============ */}
            {renderSectionHeader(
              'referrer',
              'Referrer Reward',
              'card-giftcard',
              `${form.referrerVoucherCount || 0} ${form.referrerMealType} voucher(s), ${form.referrerValidityDays || 0}d validity`,
            )}
            {sections.referrer && (
              <View style={styles.sectionContent}>
                <Text style={styles.label}>Voucher Count</Text>
                <TextInput
                  style={[styles.input, errors.referrerVoucherCount && styles.inputError]}
                  value={form.referrerVoucherCount}
                  onChangeText={(t) => setField('referrerVoucherCount', t.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
                {renderError('referrerVoucherCount')}

                <Text style={styles.label}>Meal Type</Text>
                {renderMealTypePicker(form.referrerMealType, (v) => setField('referrerMealType', v))}

                <Text style={styles.label}>Validity (days)</Text>
                <TextInput
                  style={[styles.input, errors.referrerValidityDays && styles.inputError]}
                  value={form.referrerValidityDays}
                  onChangeText={(t) => setField('referrerValidityDays', t.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder="90"
                  placeholderTextColor={colors.textMuted}
                />
                {renderError('referrerValidityDays')}
              </View>
            )}

            {/* ============ Referee reward ============ */}
            {renderSectionHeader(
              'referee',
              'Referee Reward',
              'card-giftcard',
              `${form.refereeVoucherCount || 0} ${form.refereeMealType} voucher(s), ${form.refereeValidityDays || 0}d validity`,
            )}
            {sections.referee && (
              <View style={styles.sectionContent}>
                <Text style={styles.label}>Voucher Count</Text>
                <TextInput
                  style={[styles.input, errors.refereeVoucherCount && styles.inputError]}
                  value={form.refereeVoucherCount}
                  onChangeText={(t) => setField('refereeVoucherCount', t.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
                {renderError('refereeVoucherCount')}

                <Text style={styles.label}>Meal Type</Text>
                {renderMealTypePicker(form.refereeMealType, (v) => setField('refereeMealType', v))}

                <Text style={styles.label}>Validity (days)</Text>
                <TextInput
                  style={[styles.input, errors.refereeValidityDays && styles.inputError]}
                  value={form.refereeValidityDays}
                  onChangeText={(t) => setField('refereeValidityDays', t.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder="90"
                  placeholderTextColor={colors.textMuted}
                />
                {renderError('refereeValidityDays')}
              </View>
            )}

            {/* ============ Conversion limits ============ */}
            {renderSectionHeader(
              'limits',
              'Conversion & Limits',
              'schedule',
              `${form.conversionWindowDays || 0}d window, max ${form.maxReferralsPerUser || 0}/user`,
            )}
            {sections.limits && (
              <View style={styles.sectionContent}>
                <Text style={styles.label}>Conversion Window (days)</Text>
                <TextInput
                  style={[styles.input, errors.conversionWindowDays && styles.inputError]}
                  value={form.conversionWindowDays}
                  onChangeText={(t) => setField('conversionWindowDays', t.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.hintText}>
                  How long after sign-up the referee has to convert (1–365).
                </Text>
                {renderError('conversionWindowDays')}

                <Text style={styles.label}>Max Referrals Per User</Text>
                <TextInput
                  style={[styles.input, errors.maxReferralsPerUser && styles.inputError]}
                  value={form.maxReferralsPerUser}
                  onChangeText={(t) => setField('maxReferralsPerUser', t.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder="50"
                  placeholderTextColor={colors.textMuted}
                />
                {renderError('maxReferralsPerUser')}
              </View>
            )}

            {/* ============ Share message ============ */}
            {renderSectionHeader(
              'share',
              'Share Message',
              'share',
              `${form.shareMessage.length}/500 chars`,
            )}
            {sections.share && (
              <View style={styles.sectionContent}>
                <Text style={styles.label}>Message Template</Text>
                <TextInput
                  style={[styles.input, styles.textArea, errors.shareMessage && styles.inputError]}
                  value={form.shareMessage}
                  onChangeText={(t) => setField('shareMessage', t)}
                  multiline
                  numberOfLines={5}
                  maxLength={500}
                  placeholder="Use my code {CODE} to get {REFEREE_REWARD} free meals..."
                  placeholderTextColor={colors.textMuted}
                />
                {renderError('shareMessage')}

                <View style={styles.infoBox}>
                  <Icon name="info" size={16} color={colors.info} />
                  <Text style={styles.infoText}>
                    Placeholders: {'{CODE}'} = referral code, {'{REFEREE_REWARD}'} = referee voucher
                    count, {'{LINK}'} = app download link.
                  </Text>
                </View>
              </View>
            )}

            {/* ============ Anti-abuse ============ */}
            {renderSectionHeader(
              'antiAbuse',
              'Anti-Abuse Rules',
              'security',
              `${form.sameAddressLimit || 0}/address, min ₹${form.minPlanValueForConversion || 0}`,
            )}
            {sections.antiAbuse && (
              <View style={styles.sectionContent}>
                <Text style={styles.label}>Same Address Limit</Text>
                <TextInput
                  style={[styles.input, errors.sameAddressLimit && styles.inputError]}
                  value={form.sameAddressLimit}
                  onChangeText={(t) => setField('sameAddressLimit', t.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.hintText}>
                  Max conversions allowed from referees sharing one address. 0 disables the check.
                </Text>
                {renderError('sameAddressLimit')}

                <Text style={styles.label}>Min Plan Value for Conversion (₹)</Text>
                <TextInput
                  style={[styles.input, errors.minPlanValueForConversion && styles.inputError]}
                  value={form.minPlanValueForConversion}
                  onChangeText={(t) =>
                    setField('minPlanValueForConversion', t.replace(/[^0-9]/g, ''))
                  }
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.hintText}>
                  Referee's first subscription must be ≥ this amount to count as a conversion.
                </Text>
                {renderError('minPlanValueForConversion')}
              </View>
            )}

            {/* ============ Milestones ============ */}
            {renderSectionHeader(
              'milestones',
              'Milestone Tiers',
              'emoji-events',
              `${form.milestones.length} tier(s)`,
            )}
            {sections.milestones && (
              <View style={styles.sectionContent}>
                <Text style={styles.hintText}>
                  Bonus vouchers awarded when a referrer reaches N converted referrals.
                </Text>

                {form.milestones.length === 0 && (
                  <View style={styles.emptyMilestones}>
                    <Icon name="emoji-events" size={32} color={colors.gray300} />
                    <Text style={styles.emptyMilestonesText}>No milestones configured</Text>
                  </View>
                )}

                {form.milestones.map((m, idx) => (
                  <View key={idx} style={styles.milestoneRow}>
                    <View style={styles.milestoneRowHeader}>
                      <Text style={styles.milestoneRowTitle}>Tier {idx + 1}</Text>
                      <TouchableOpacity
                        onPress={() => removeMilestone(idx)}
                        style={styles.milestoneRemove}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Icon name="delete" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.milestoneFieldsRow}>
                      <View style={{ flex: 1, marginRight: spacing.sm }}>
                        <Text style={styles.subLabel}>Referrals</Text>
                        <TextInput
                          style={[
                            styles.input,
                            errors[`milestone_${idx}_referralCount`] && styles.inputError,
                          ]}
                          value={m.referralCount}
                          onChangeText={(t) =>
                            updateMilestone(idx, 'referralCount', t.replace(/[^0-9]/g, ''))
                          }
                          keyboardType="numeric"
                          placeholder="5"
                          placeholderTextColor={colors.textMuted}
                        />
                        {renderError(`milestone_${idx}_referralCount`)}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subLabel}>Bonus Vouchers</Text>
                        <TextInput
                          style={[
                            styles.input,
                            errors[`milestone_${idx}_bonusVouchers`] && styles.inputError,
                          ]}
                          value={m.bonusVouchers}
                          onChangeText={(t) =>
                            updateMilestone(idx, 'bonusVouchers', t.replace(/[^0-9]/g, ''))
                          }
                          keyboardType="numeric"
                          placeholder="5"
                          placeholderTextColor={colors.textMuted}
                        />
                        {renderError(`milestone_${idx}_bonusVouchers`)}
                      </View>
                    </View>

                    <Text style={styles.subLabel}>Badge Name</Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors[`milestone_${idx}_badgeName`] && styles.inputError,
                      ]}
                      value={m.badgeName}
                      onChangeText={(t) => updateMilestone(idx, 'badgeName', t)}
                      maxLength={50}
                      placeholder="e.g. Tiffsy Ambassador"
                      placeholderTextColor={colors.textMuted}
                    />
                    {renderError(`milestone_${idx}_badgeName`)}
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addMilestoneButton}
                  onPress={addMilestone}
                  activeOpacity={0.7}
                >
                  <Icon name="add" size={20} color={colors.primary} />
                  <Text style={styles.addMilestoneText}>Add Milestone</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.footerButton, styles.cancelButton]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default ReferralConfigEditModal;

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
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  submitError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: spacing.borderRadiusMd,
  },
  submitErrorText: {
    fontSize: 13,
    color: colors.error,
    flex: 1,
    marginLeft: 6,
  },
  scroll: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.gray50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSummary: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
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
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.error,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  hintText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  readonlyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.gray50,
  },
  readonlyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: spacing.borderRadiusMd,
    padding: 3,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: spacing.borderRadiusMd - 2,
  },
  segmentedButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentedButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentedButtonTextActive: {
    color: colors.white,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.infoLight,
    padding: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    marginTop: 12,
  },
  infoText: {
    fontSize: 12,
    color: colors.info,
    flex: 1,
    lineHeight: 18,
    marginLeft: 6,
  },
  milestoneRow: {
    backgroundColor: colors.gray50,
    borderRadius: spacing.borderRadiusMd,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  milestoneRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  milestoneRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  milestoneRemove: {
    padding: 4,
  },
  milestoneFieldsRow: {
    flexDirection: 'row',
  },
  emptyMilestones: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyMilestonesText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
  },
  addMilestoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: spacing.borderRadiusMd,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addMilestoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 4,
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
    marginHorizontal: 4,
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
    color: colors.white,
  },
});
