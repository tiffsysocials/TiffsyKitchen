import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PincodeRecord } from '../../../types/api.types';
import { PincodeFormState, PincodeFormErrors } from '../models/types';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

interface Props {
  visible: boolean;
  pincode: PincodeRecord | null;
  onClose: () => void;
  onSave: (data: PincodeFormState) => Promise<void>;
}

const empty: PincodeFormState = {
  pincode: '',
  officeName: '',
  city: '',
  district: '',
  state: '',
  latitude: '',
  longitude: '',
};

export const PincodeFormModal: React.FC<Props> = ({ visible, pincode, onClose, onSave }) => {
  const isEdit = pincode !== null;
  const [form, setForm] = useState<PincodeFormState>(empty);
  const [errors, setErrors] = useState<PincodeFormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (pincode) {
      setForm({
        pincode: pincode.pincode,
        officeName: pincode.officeName || '',
        city: pincode.city || '',
        district: pincode.district || '',
        state: pincode.state || '',
        latitude: pincode.latitude != null ? String(pincode.latitude) : '',
        longitude: pincode.longitude != null ? String(pincode.longitude) : '',
      });
    } else {
      setForm(empty);
    }
    setErrors({});
  }, [visible, pincode]);

  const set = <K extends keyof PincodeFormState>(k: K, v: PincodeFormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validate = (): boolean => {
    const e: PincodeFormErrors = {};
    if (!isEdit && !/^\d{6}$/.test(form.pincode.trim())) e.pincode = 'Pincode must be 6 digits';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.state.trim()) e.state = 'State is required';
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) e.latitude = 'Latitude must be between -90 and 90';
    if (Number.isNaN(lng) || lng < -180 || lng > 180) e.longitude = 'Longitude must be between -180 and 180';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (saving) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={saving}>
            <Icon name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{isEdit ? 'Edit Pincode' : 'Add Pincode'}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.label}>
            Pincode <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, isEdit && styles.disabled]}
            value={form.pincode}
            onChangeText={(t) => set('pincode', t.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit pincode"
            keyboardType="number-pad"
            maxLength={6}
            editable={!isEdit && !saving}
          />
          {errors.pincode && <Text style={styles.err}>{errors.pincode}</Text>}

          <Text style={styles.label}>Post Office Name</Text>
          <TextInput
            style={styles.input}
            value={form.officeName}
            onChangeText={(t) => set('officeName', t)}
            placeholder="(optional)"
            editable={!saving}
          />

          <Text style={styles.label}>
            City <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={form.city}
            onChangeText={(t) => set('city', t)}
            editable={!saving}
          />
          {errors.city && <Text style={styles.err}>{errors.city}</Text>}

          <Text style={styles.label}>District</Text>
          <TextInput
            style={styles.input}
            value={form.district}
            onChangeText={(t) => set('district', t)}
            placeholder="(optional)"
            editable={!saving}
          />

          <Text style={styles.label}>
            State <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={form.state}
            onChangeText={(t) => set('state', t)}
            editable={!saving}
          />
          {errors.state && <Text style={styles.err}>{errors.state}</Text>}

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>
                Latitude <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={form.latitude}
                onChangeText={(t) => set('latitude', t)}
                keyboardType="decimal-pad"
                editable={!saving}
              />
              {errors.latitude && <Text style={styles.err}>{errors.latitude}</Text>}
            </View>
            <View style={styles.half}>
              <Text style={styles.label}>
                Longitude <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={form.longitude}
                onChangeText={(t) => set('longitude', t)}
                keyboardType="decimal-pad"
                editable={!saving}
              />
              {errors.longitude && <Text style={styles.err}>{errors.longitude}</Text>}
            </View>
          </View>

          <Text style={styles.hint}>
            Saving an entry marks its source as MANUAL. Use the "Warm City" button to bulk-import
            pincodes from India Post + Google instead.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSubmit} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>{isEdit ? 'Update' : 'Create'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  body: { padding: spacing.lg },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.md, marginBottom: 4 },
  required: { color: colors.error },
  input: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  disabled: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  err: { fontSize: 11, color: colors.error, marginTop: 4 },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: spacing.md, lineHeight: 16 },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
    backgroundColor: colors.card,
  },
  btn: { flex: 1, paddingVertical: spacing.md, borderRadius: spacing.borderRadiusMd, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.textPrimary, fontWeight: '600' },
  saveBtn: { backgroundColor: colors.primary },
  saveText: { color: '#fff', fontWeight: '700' },
});
