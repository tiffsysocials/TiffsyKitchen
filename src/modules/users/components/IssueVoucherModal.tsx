import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { vouchersService } from '../../../services/vouchers.service';
import { useAlert } from '../../../hooks/useAlert';

interface IssueVoucherModalProps {
  visible: boolean;
  userId: string;
  userName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const IssueVoucherModal: React.FC<IssueVoucherModalProps> = ({
  visible,
  userId,
  userName,
  onClose,
  onSuccess,
}) => {
  const { showSuccess, showError } = useAlert();
  const [count, setCount] = useState('1');
  const [expiryDays, setExpiryDays] = useState('30');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCount('1');
    setExpiryDays('30');
    setReason('');
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    const countNum = parseInt(count, 10);
    const expiryDaysNum = parseInt(expiryDays, 10);

    if (!Number.isFinite(countNum) || countNum < 1 || countNum > 50) {
      setError('Count must be between 1 and 50');
      return;
    }
    if (!Number.isFinite(expiryDaysNum) || expiryDaysNum < 1 || expiryDaysNum > 365) {
      setError('Expiry days must be between 1 and 365');
      return;
    }

    setSubmitting(true);
    try {
      const result = await vouchersService.adminIssueVouchers({
        userId,
        count: countNum,
        expiryDays: expiryDaysNum,
        reason: reason.trim() || undefined,
      });
      showSuccess('Vouchers issued', `${result.count} voucher(s) granted${userName ? ` to ${userName}` : ''}.`);
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to issue vouchers';
      setError(msg);
      showError('Issue failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <MaterialIcons name="confirmation-number" size={22} color="#FE8733" />
              <Text style={styles.title}>Issue Vouchers</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {userName && (
            <Text style={styles.subtitle}>To customer: <Text style={styles.subtitleStrong}>{userName}</Text></Text>
          )}

          <Text style={styles.label}>Number of vouchers *</Text>
          <TextInput
            style={styles.input}
            value={count}
            onChangeText={(t) => setCount(t.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            placeholder="e.g. 5"
            placeholderTextColor="#9ca3af"
            editable={!submitting}
          />

          <Text style={styles.label}>Expiry (days from today) *</Text>
          <TextInput
            style={styles.input}
            value={expiryDays}
            onChangeText={(t) => setExpiryDays(t.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            placeholder="30"
            placeholderTextColor="#9ca3af"
            editable={!submitting}
          />

          <Text style={styles.label}>Reason (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. compensation, promo, etc."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={2}
            editable={!submitting}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancel]}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submit, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitText}>Issue Vouchers</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 420,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  subtitleStrong: { color: '#111827', fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  error: { color: '#dc2626', fontSize: 13, marginTop: 8 },
  footer: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancel: { backgroundColor: '#f3f4f6' },
  cancelText: { color: '#374151', fontWeight: '600' },
  submit: { backgroundColor: '#FE8733' },
  submitText: { color: '#fff', fontWeight: '700' },
});

export default IssueVoucherModal;
