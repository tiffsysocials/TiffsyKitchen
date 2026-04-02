import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { adminUsersService } from '../../../services/admin-users.service';
import { User } from '../../../types/api.types';
import { useAlert } from '../../../hooks/useAlert';

interface SuspendUserModalProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

const colors = {
  primary: '#FE8733',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  white: '#ffffff',
  black: '#1f2937',
  border: '#e5e7eb',
  danger: '#ef4444',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
};

export const SuspendUserModal: React.FC<SuspendUserModalProps> = ({
  visible,
  user,
  onClose,
  onSuccess,
}) => {
  const { showSuccess, showError, showWarning } = useAlert();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      showWarning('Validation Error', 'Please enter a reason for suspension');
      return;
    }

    if (!user) return;

    try {
      setLoading(true);
      await adminUsersService.suspendUser(user._id, { reason: reason.trim() });
      showSuccess('Success', 'User suspended successfully');
      handleClose();
      onSuccess();
    } catch (error: any) {
      showError('Error', error.message || 'Failed to suspend user');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="block" size={32} color={colors.danger} />
            </View>
            <Text style={styles.title}>Suspend User</Text>
            <Text style={styles.subtitle}>
              Are you sure you want to suspend <Text style={styles.username}>{user.name}</Text>?
            </Text>
          </View>

          {/* Reason Input */}
          <View style={styles.body}>
            <Text style={styles.label}>Reason for Suspension *</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Enter reason for suspension..."
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={colors.gray}
            />
            <Text style={styles.hint}>
              This reason will be visible to the user and other admins
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.suspendButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <MaterialIcons name="block" size={18} color={colors.white} />
                  <Text style={styles.suspendButtonText}>Suspend User</Text>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
  },
  username: {
    fontWeight: '700',
    color: colors.black,
  },
  body: {
    padding: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  textArea: {
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 14,
    color: colors.black,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
  },
  hint: {
    fontSize: 12,
    color: colors.gray,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  cancelButton: {
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
  },
  suspendButton: {
    backgroundColor: colors.danger,
  },
  suspendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});
