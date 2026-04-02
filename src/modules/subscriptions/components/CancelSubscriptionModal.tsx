/**
 * Cancel Subscription Modal Component
 *
 * Modal for cancelling a subscription with refund options
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CancelSubscriptionRequest } from '../../../types/subscription.types';
import { useAlert } from '../../../hooks/useAlert';

interface CancelSubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CancelSubscriptionRequest) => Promise<void>;
  subscriptionName: string;
  customerName: string;
}

const PRIMARY_COLOR = '#FE8733';

export const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  visible,
  onClose,
  onSubmit,
  subscriptionName,
  customerName,
}) => {
  const { showWarning, showError } = useAlert();
  const [reason, setReason] = useState('');
  const [issueRefund, setIssueRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setReason('');
    setIssueRefund(false);
    setRefundAmount('');
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      showWarning('Validation Error', 'Cancellation reason is required');
      return;
    }

    if (issueRefund) {
      const amount = parseFloat(refundAmount);
      if (!refundAmount || isNaN(amount) || amount <= 0) {
        showWarning('Validation Error', 'Valid refund amount is required');
        return;
      }
    }

    setLoading(true);

    try {
      const cancelData: CancelSubscriptionRequest = {
        reason: reason.trim(),
        issueRefund,
        refundAmount: issueRefund && refundAmount ? parseFloat(refundAmount) : undefined,
      };

      await onSubmit(cancelData);
      resetForm();
      onClose();
    } catch (error: any) {
      showError('Error', error.message || 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Icon name="cancel" size={28} color="#dc2626" />
            <Text style={styles.headerTitle}>Cancel Subscription</Text>
          </View>

          {/* Warning */}
          <View style={styles.warningBox}>
            <Icon name="warning" size={20} color="#f59e0b" />
            <Text style={styles.warningText}>
              This action will cancel the subscription for {customerName}. This action cannot be undone.
            </Text>
          </View>

          {/* Subscription Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Subscription</Text>
            <Text style={styles.infoValue}>{subscriptionName}</Text>
          </View>

          {/* Reason Input */}
          <View style={styles.field}>
            <Text style={styles.label}>Cancellation Reason *</Text>
            <TextInput
              style={styles.textArea}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g., Customer requested cancellation due to relocation"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Issue Refund Toggle */}
          <View style={styles.field}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Issue Refund</Text>
                <Text style={styles.toggleDescription}>
                  Initiate refund process for remaining vouchers
                </Text>
              </View>
              <Switch
                value={issueRefund}
                onValueChange={setIssueRefund}
                trackColor={{ false: '#d1d5db', true: '#fed7aa' }}
                thumbColor={issueRefund ? PRIMARY_COLOR : '#f3f4f6'}
              />
            </View>
          </View>

          {/* Refund Amount (conditional) */}
          {issueRefund && (
            <View style={styles.field}>
              <Text style={styles.label}>Refund Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                value={refundAmount}
                onChangeText={setRefundAmount}
                placeholder="500"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.hint}>Enter the amount to be refunded to the customer</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                resetForm();
                onClose();
              }}
              disabled={loading}
            >
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
                <>
                  <Icon name="check" size={20} color="#ffffff" />
                  <Text style={styles.submitButtonText}>Confirm Cancellation</Text>
                </>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  field: {
    marginBottom: 16,
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
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#ffffff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
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
