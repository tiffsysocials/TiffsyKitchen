import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaScreen } from '../../components/common/SafeAreaScreen';
import { Header } from '../../components/common/Header';
import { useAlert } from '../../hooks/useAlert';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { ZonePickerModal } from '../../modules/kitchens/components/ZonePickerModal';
import kitchenService, {
  RegisterKitchenWithOtpRequest,
  RegisterKitchenWithOtpResponse,
} from '../../services/kitchen.service';

interface KitchenRegistrationScreenProps {
  registrationToken: string;
  phoneNumber: string;
  onRegistrationComplete: (data: RegisterKitchenWithOtpResponse) => void;
  onCancel: () => void;
}

interface FormState {
  name: string;
  cuisineTypes: string;
  addressLine1: string;
  addressLine2: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  zonesServed: string[];
  lunchStartTime: string;
  lunchEndTime: string;
  dinnerStartTime: string;
  dinnerEndTime: string;
  contactPhone: string;
  contactEmail: string;
  ownerName: string;
  staffName: string;
  staffEmail: string;
  logo: string;
  coverImage: string;
}

const initialState: FormState = {
  name: '',
  cuisineTypes: '',
  addressLine1: '',
  addressLine2: '',
  locality: '',
  city: '',
  state: 'Maharashtra',
  pincode: '',
  zonesServed: [],
  lunchStartTime: '11:00',
  lunchEndTime: '15:00',
  dinnerStartTime: '19:00',
  dinnerEndTime: '23:00',
  contactPhone: '',
  contactEmail: '',
  ownerName: '',
  staffName: '',
  staffEmail: '',
  logo: '',
  coverImage: '',
};

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PINCODE_REGEX = /^\d{6}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/i;

export const KitchenRegistrationScreen: React.FC<KitchenRegistrationScreenProps> = ({
  registrationToken,
  phoneNumber,
  onRegistrationComplete,
  onCancel,
}) => {
  const { showError, showSuccess } = useAlert();
  const [form, setForm] = useState<FormState>({ ...initialState, contactPhone: phoneNumber });
  const [submitting, setSubmitting] = useState(false);
  const [zonePickerVisible, setZonePickerVisible] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Kitchen name is required';
    const cuisines = form.cuisineTypes.split(',').map(c => c.trim()).filter(Boolean);
    if (cuisines.length === 0) return 'Add at least one cuisine type';
    if (!form.addressLine1.trim()) return 'Address line 1 is required';
    if (!form.locality.trim()) return 'Locality is required';
    if (!form.city.trim()) return 'City is required';
    if (!PINCODE_REGEX.test(form.pincode.trim())) return 'Pincode must be 6 digits';
    if (form.zonesServed.length === 0) return 'Select at least one zone';
    if (!TIME_REGEX.test(form.lunchStartTime) || !TIME_REGEX.test(form.lunchEndTime)) {
      return 'Lunch times must be in HH:MM (24h) format';
    }
    if (!TIME_REGEX.test(form.dinnerStartTime) || !TIME_REGEX.test(form.dinnerEndTime)) {
      return 'Dinner times must be in HH:MM (24h) format';
    }
    if (!PHONE_REGEX.test(form.contactPhone.trim())) return 'Contact phone must be a valid 10-digit number';
    if (!EMAIL_REGEX.test(form.contactEmail.trim())) return 'Contact email is required';
    if (!form.ownerName.trim()) return 'Owner name is required';
    if (!form.staffName.trim()) return 'Staff name is required';
    if (form.staffEmail.trim() && !EMAIL_REGEX.test(form.staffEmail.trim())) return 'Staff email is invalid';
    if (!URL_REGEX.test(form.logo.trim())) return 'Kitchen logo URL is required (must start with http:// or https://)';
    if (form.coverImage.trim() && !URL_REGEX.test(form.coverImage.trim())) return 'Cover image URL is invalid';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      showError('Invalid form', err);
      return;
    }

    const cuisines = form.cuisineTypes.split(',').map(c => c.trim()).filter(Boolean);
    const payload: RegisterKitchenWithOtpRequest = {
      name: form.name.trim(),
      cuisineTypes: cuisines,
      address: {
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim() || undefined,
        locality: form.locality.trim(),
        city: form.city.trim(),
        state: form.state.trim() || undefined,
        pincode: form.pincode.trim(),
      },
      zonesServed: form.zonesServed,
      operatingHours: {
        lunch: { startTime: form.lunchStartTime, endTime: form.lunchEndTime },
        dinner: { startTime: form.dinnerStartTime, endTime: form.dinnerEndTime },
      },
      contactPhone: form.contactPhone.trim(),
      contactEmail: form.contactEmail.trim(),
      ownerName: form.ownerName.trim(),
      staffName: form.staffName.trim(),
      staffEmail: form.staffEmail.trim() || undefined,
      logo: form.logo.trim(),
      coverImage: form.coverImage.trim() || undefined,
    };

    setSubmitting(true);
    try {
      const data = await kitchenService.registerKitchenWithOtp(registrationToken, payload);
      showSuccess('Submitted', 'Your kitchen registration is pending admin approval.');
      onRegistrationComplete(data);
    } catch (e: any) {
      showError('Registration failed', e?.message || 'Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaScreen topBackgroundColor={colors.primary}>
      <Header title="Register Kitchen" showBack onBackPress={onCancel} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Welcome! Set up your kitchen to start receiving orders. An admin will review and approve your application.
        </Text>

        <Section title="Kitchen Details">
          <Field label="Kitchen Name *" value={form.name} onChangeText={t => update('name', t)} placeholder="e.g., Tiffsy Central Kitchen" />
          <Field
            label="Cuisine Types *"
            value={form.cuisineTypes}
            onChangeText={t => update('cuisineTypes', t)}
            placeholder="e.g., North Indian, Chinese, Continental"
            helper="Comma-separated"
          />
        </Section>

        <Section title="Address">
          <Field label="Address Line 1 *" value={form.addressLine1} onChangeText={t => update('addressLine1', t)} placeholder="Building / street" />
          <Field label="Address Line 2" value={form.addressLine2} onChangeText={t => update('addressLine2', t)} placeholder="Optional" />
          <Field label="Locality *" value={form.locality} onChangeText={t => update('locality', t)} placeholder="e.g., Bandra West" />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Field label="City *" value={form.city} onChangeText={t => update('city', t)} placeholder="Mumbai" />
            </View>
            <View style={styles.spacer} />
            <View style={styles.flex1}>
              <Field label="State" value={form.state} onChangeText={t => update('state', t)} placeholder="Maharashtra" />
            </View>
          </View>
          <Field
            label="Pincode *"
            value={form.pincode}
            onChangeText={t => update('pincode', t.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit pincode"
            keyboardType="number-pad"
            maxLength={6}
          />
        </Section>

        <Section title="Zones Served *">
          <TouchableOpacity style={styles.zonePicker} onPress={() => setZonePickerVisible(true)}>
            <Icon name="map-marker-radius" size={20} color={colors.primary} />
            <Text style={styles.zonePickerText}>
              {form.zonesServed.length === 0
                ? 'Tap to select zones'
                : `${form.zonesServed.length} zone${form.zonesServed.length > 1 ? 's' : ''} selected`}
            </Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </Section>

        <Section title="Operating Hours">
          <Text style={styles.fieldLabel}>Lunch *</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Field label="" value={form.lunchStartTime} onChangeText={t => update('lunchStartTime', t)} placeholder="11:00" />
            </View>
            <Text style={styles.dash}>—</Text>
            <View style={styles.flex1}>
              <Field label="" value={form.lunchEndTime} onChangeText={t => update('lunchEndTime', t)} placeholder="15:00" />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Dinner *</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Field label="" value={form.dinnerStartTime} onChangeText={t => update('dinnerStartTime', t)} placeholder="19:00" />
            </View>
            <Text style={styles.dash}>—</Text>
            <View style={styles.flex1}>
              <Field label="" value={form.dinnerEndTime} onChangeText={t => update('dinnerEndTime', t)} placeholder="23:00" />
            </View>
          </View>
          <Text style={styles.helperText}>Use 24-hour HH:MM format</Text>
        </Section>

        <Section title="Contact">
          <Field
            label="Contact Phone *"
            value={form.contactPhone}
            onChangeText={t => update('contactPhone', t.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit number"
            keyboardType="phone-pad"
            maxLength={10}
          />
          <Field label="Contact Email *" value={form.contactEmail} onChangeText={t => update('contactEmail', t)} placeholder="kitchen@example.com" keyboardType="email-address" autoCapitalize="none" />
        </Section>

        <Section title="Owner & Staff">
          <Field label="Owner Name *" value={form.ownerName} onChangeText={t => update('ownerName', t)} placeholder="Full name" />
          <Field label="Your Name (Staff) *" value={form.staffName} onChangeText={t => update('staffName', t)} placeholder="Your name as staff contact" />
          <Field label="Your Email" value={form.staffEmail} onChangeText={t => update('staffEmail', t)} placeholder="Optional" keyboardType="email-address" autoCapitalize="none" />
        </Section>

        <Section title="Branding">
          <Field
            label="Kitchen Logo URL *"
            value={form.logo}
            onChangeText={t => update('logo', t)}
            placeholder="https://example.com/logo.png"
            keyboardType="default"
            autoCapitalize="none"
            helper="Paste a public URL to your logo image"
          />
          <Field
            label="Cover Image URL"
            value={form.coverImage}
            onChangeText={t => update('coverImage', t)}
            placeholder="Optional — https://..."
            keyboardType="default"
            autoCapitalize="none"
          />
        </Section>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="send-check" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Submit for Approval</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <ZonePickerModal
        visible={zonePickerVisible}
        selectedZoneIds={form.zonesServed}
        onClose={() => setZonePickerVisible(false)}
        onSave={ids => {
          update('zonesServed', ids);
          setZonePickerVisible(false);
        }}
        publicMode
      />
    </SafeAreaScreen>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  helper?: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
}

const Field: React.FC<FieldProps> = ({ label, value, onChangeText, placeholder, helper, keyboardType, autoCapitalize, maxLength }) => (
  <View style={styles.field}>
    {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      maxLength={maxLength}
    />
    {helper ? <Text style={styles.helperText}>{helper}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  intro: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: spacing.sm,
  },
  field: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.gray900,
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  flex1: { flex: 1 },
  spacer: { width: spacing.sm },
  dash: {
    paddingHorizontal: spacing.sm,
    paddingBottom: 14,
    color: colors.textMuted,
  },
  zonePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  zonePickerText: {
    flex: 1,
    fontSize: 14,
    color: colors.gray900,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default KitchenRegistrationScreen;
