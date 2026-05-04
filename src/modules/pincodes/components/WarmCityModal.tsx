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
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { WarmCityFormState } from '../models/types';
import pincodeService, { WarmCityRequest } from '../../../services/pincode.service';
import { WarmCityResponse } from '../../../types/api.types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onWarmed: (result: WarmCityResponse) => void;
}

const initial: WarmCityFormState = {
  mode: 'CITY',
  city: '',
  state: '',
  latitude: '',
  longitude: '',
  force: false,
};

export const WarmCityModal: React.FC<Props> = ({ visible, onClose, onWarmed }) => {
  const [form, setForm] = useState<WarmCityFormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<WarmCityResponse | null>(null);

  useEffect(() => {
    if (visible) {
      setForm(initial);
      setError(null);
      setResult(null);
    }
  }, [visible]);

  const set = <K extends keyof WarmCityFormState>(k: K, v: WarmCityFormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validate = (): string | null => {
    if (form.mode === 'CITY') {
      if (!form.city.trim()) return 'City is required';
      if (!form.state.trim()) return 'State is required';
    } else {
      const lat = parseFloat(form.latitude);
      const lng = parseFloat(form.longitude);
      if (Number.isNaN(lat) || lat < -90 || lat > 90) return 'Invalid latitude';
      if (Number.isNaN(lng) || lng < -180 || lng > 180) return 'Invalid longitude';
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitting(true);
    setResult(null);

    try {
      const payload: WarmCityRequest =
        form.mode === 'CITY'
          ? { city: form.city.trim(), state: form.state.trim(), force: form.force }
          : {
              latitude: parseFloat(form.latitude),
              longitude: parseFloat(form.longitude),
              force: form.force,
            };
      const res = await pincodeService.warmCity(payload);
      setResult(res);
      onWarmed(res);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Warm city failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Pre-warm a City</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.helper}>
              Fetches every pincode in the chosen city from India Post + Google Maps and caches it
              locally so subsequent admin actions are instant.
            </Text>

            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeChip, form.mode === 'CITY' && styles.modeChipActive]}
                onPress={() => set('mode', 'CITY')}
                disabled={submitting}>
                <Icon
                  name="city"
                  size={16}
                  color={form.mode === 'CITY' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[styles.modeChipText, form.mode === 'CITY' && styles.modeChipTextActive]}>
                  By City Name
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeChip, form.mode === 'COORDS' && styles.modeChipActive]}
                onPress={() => set('mode', 'COORDS')}
                disabled={submitting}>
                <Icon
                  name="crosshairs-gps"
                  size={16}
                  color={form.mode === 'COORDS' ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.modeChipText,
                    form.mode === 'COORDS' && styles.modeChipTextActive,
                  ]}>
                  By Coordinates
                </Text>
              </TouchableOpacity>
            </View>

            {form.mode === 'CITY' ? (
              <>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={form.city}
                  onChangeText={(t) => set('city', t)}
                  placeholder="e.g. Indore"
                  editable={!submitting}
                />
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={form.state}
                  onChangeText={(t) => set('state', t)}
                  placeholder="e.g. Madhya Pradesh"
                  editable={!submitting}
                />
              </>
            ) : (
              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.label}>Latitude</Text>
                  <TextInput
                    style={styles.input}
                    value={form.latitude}
                    onChangeText={(t) => set('latitude', t)}
                    keyboardType="decimal-pad"
                    editable={!submitting}
                  />
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>Longitude</Text>
                  <TextInput
                    style={styles.input}
                    value={form.longitude}
                    onChangeText={(t) => set('longitude', t)}
                    keyboardType="decimal-pad"
                    editable={!submitting}
                  />
                </View>
              </View>
            )}

            <View style={styles.forceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Force refresh</Text>
                <Text style={styles.hint}>
                  Bypass the 90-day warmed-city cache and refetch from India Post + Google.
                </Text>
              </View>
              <Switch
                value={form.force}
                onValueChange={(v) => set('force', v)}
                disabled={submitting}
                trackColor={{ false: '#e2e8f0', true: '#86efac' }}
                thumbColor={form.force ? '#10b981' : '#cbd5e1'}
              />
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            {result && (
              <View style={styles.resultBox}>
                <Icon name="check-circle" size={20} color={colors.success} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.resultTitle}>
                    {result.alreadyWarmed
                      ? `${result.city} already warmed`
                      : `${result.city} warmed`}
                  </Text>
                  <Text style={styles.resultMeta}>
                    {result.addedCount} new · {result.totalForCity} total in DB
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onClose}
              disabled={submitting}>
              <Text style={styles.cancelText}>{result ? 'Done' : 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.saveBtn]}
              onPress={handleSubmit}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Warm City</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: spacing.borderRadiusLg,
    borderTopRightRadius: spacing.borderRadiusLg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  body: { padding: spacing.lg },
  helper: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.md },
  modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: spacing.borderRadiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  modeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  modeChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  modeChipTextActive: { color: colors.primary },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: 4 },
  input: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  forceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: 2, lineHeight: 14 },
  error: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#fee2e2',
    borderRadius: spacing.borderRadiusMd,
    color: '#991b1b',
    fontSize: 12,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#dcfce7',
    borderRadius: spacing.borderRadiusMd,
  },
  resultTitle: { fontSize: 13, fontWeight: '700', color: '#14532d' },
  resultMeta: { fontSize: 11, color: '#166534', marginTop: 2 },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  btn: { flex: 1, paddingVertical: spacing.md, borderRadius: spacing.borderRadiusMd, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.textPrimary, fontWeight: '600' },
  saveBtn: { backgroundColor: colors.primary },
  saveText: { color: '#fff', fontWeight: '700' },
});
