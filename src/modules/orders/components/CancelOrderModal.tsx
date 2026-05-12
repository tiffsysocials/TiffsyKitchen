import React, {useState} from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

interface CancelOrderModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: {
    reason: string;
    issueRefund: boolean;
    restoreVouchers: boolean;
  }) => void;
  loading?: boolean;
  hasVouchers?: boolean;
}

const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  visible,
  onClose,
  onConfirm,
  loading = false,
  hasVouchers = false,
}) => {
  const [reason, setReason] = useState('');
  const [issueRefund, setIssueRefund] = useState(true);
  const [restoreVouchers, setRestoreVouchers] = useState(true);

  const handleConfirm = () => {
    if (!reason.trim()) {
      return;
    }

    onConfirm({
      reason: reason.trim(),
      issueRefund,
      restoreVouchers: hasVouchers ? restoreVouchers : false,
    });
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      setIssueRefund(true);
      setRestoreVouchers(true);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={styles.modalContainer}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            <Text style={styles.title}>Cancel Order</Text>
            <Text style={styles.subtitle}>
              Please provide a reason for cancelling this order
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Cancellation Reason <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter reason..."
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>

            <View style={styles.option}>
              <View style={styles.optionLeft}>
                <Text style={styles.optionTitle}>Issue Refund</Text>
                <Text style={styles.optionDescription}>
                  Refund the amount paid by customer
                </Text>
              </View>
              <Switch
                value={issueRefund}
                onValueChange={setIssueRefund}
                disabled={loading}
                trackColor={{false: '#C7C7CC', true: '#34C759'}}
                thumbColor="#FFFFFF"
              />
            </View>

            {hasVouchers && (
              <View style={styles.option}>
                <View style={styles.optionLeft}>
                  <Text style={styles.optionTitle}>Restore Vouchers</Text>
                  <Text style={styles.optionDescription}>
                    Restore vouchers used in this order
                  </Text>
                </View>
                <Switch
                  value={restoreVouchers}
                  onValueChange={setRestoreVouchers}
                  disabled={loading}
                  trackColor={{false: '#C7C7CC', true: '#34C759'}}
                  thumbColor="#FFFFFF"
                />
              </View>
            )}

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Warning: This action cannot be undone. The order will be
                permanently cancelled.
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={loading}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  (!reason.trim() || loading) && styles.buttonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!reason.trim() || loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    Confirm Cancellation
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#000000',
    minHeight: 100,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  optionLeft: {
    flex: 1,
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  warningBox: {
    backgroundColor: '#FFF4ED',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFCC00',
  },
  warningText: {
    fontSize: 13,
    color: '#C77700',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3C3C43',
  },
  confirmButton: {
    backgroundColor: '#FF3B30',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default CancelOrderModal;
