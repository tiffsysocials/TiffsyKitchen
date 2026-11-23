import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { vouchersService } from '../../../services/vouchers.service';
import { useAlert } from '../../../hooks/useAlert';

interface Props {
  visible: boolean;
  voucherId?: string;
  userName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReduceVoucherModal: React.FC<Props> = ({ visible, voucherId, userName, onClose, onSuccess }) => {
  const { showSuccess, showError } = useAlert();
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setRemark('');
      setError(null);
    }
  }, [visible]);

  const handleClose = () => {
    if (!submitting) onClose();
  };

  const handleSubmit = async () => {
    const reason = remark.trim();
    if (reason.length < 3) {
      setError('Please enter a remark of at least 3 characters');
      return;
    }
    if (!voucherId) {
      setError('No available voucher was found');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await vouchersService.adminCancelVouchers({ voucherIds: [voucherId], reason });
      if (result.modified !== 1) throw new Error('Voucher is no longer available. Please refresh and try again.');
      showSuccess('Voucher reduced', `One voucher was removed${userName ? ` from ${userName}` : ''}.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      const message = err?.message || 'Failed to reduce voucher';
      setError(message);
      showError('Reduce failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <MaterialIcons name="remove-circle-outline" size={22} color="#ef4444" />
              <Text style={styles.title}>Reduce One Voucher</Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={submitting}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            This cancels one available voucher{userName ? ` for ${userName}` : ''} and records the action as performed by an admin.
          </Text>
          <Text style={styles.label}>Admin remark *</Text>
          <TextInput
            style={styles.textArea}
            value={remark}
            onChangeText={setRemark}
            placeholder="Why is this voucher being reduced?"
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={500}
            editable={!submitting}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={handleClose} disabled={submitting}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.reduce, submitting && styles.disabled]} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.reduceText}>Reduce Voucher</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: '100%', maxWidth: 420 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, lineHeight: 19, color: '#6b7280', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  textArea: { minHeight: 82, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#f9fafb', textAlignVertical: 'top' },
  error: { color: '#dc2626', fontSize: 13, marginTop: 8 },
  footer: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancel: { backgroundColor: '#f3f4f6' },
  cancelText: { color: '#374151', fontWeight: '600' },
  reduce: { backgroundColor: '#ef4444' },
  reduceText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
});

export default ReduceVoucherModal;
