import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { adminUsersService, UpdateUserRequest } from '../../../services/admin-users.service';
import { kitchenService } from '../../../services/kitchen.service';
import { User, Kitchen } from '../../../types/api.types';
import { useAlert } from '../../../hooks/useAlert';

interface EditUserModalProps {
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
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
};

export const EditUserModal: React.FC<EditUserModalProps> = ({
  visible,
  user,
  onClose,
  onSuccess,
}) => {
  const { showSuccess, showError, showWarning } = useAlert();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedKitchenId, setSelectedKitchenId] = useState<string>('');
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingKitchens, setLoadingKitchens] = useState(false);
  const [showKitchenPicker, setShowKitchenPicker] = useState(false);

  useEffect(() => {
    if (visible && user) {
      // Initialize form with user data
      setName(user.name || '');
      setEmail(user.email || '');

      if (user.role === 'KITCHEN_STAFF') {
        const kitchenId = typeof user.kitchenId === 'string'
          ? user.kitchenId
          : user.kitchenId?._id || '';
        setSelectedKitchenId(kitchenId);
        fetchKitchens();
      }
    }
  }, [visible, user]);

  const fetchKitchens = async () => {
    try {
      setLoadingKitchens(true);
      const response = await kitchenService.getKitchens({ status: 'ACTIVE' });
      setKitchens(response.kitchens);
    } catch (error: any) {
      showError('Error', 'Failed to load kitchens');
    } finally {
      setLoadingKitchens(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setSelectedKitchenId('');
  };

  const validateForm = (): string | null => {
    if (!name.trim()) {
      return 'Please enter a name';
    }
    if (user?.role === 'KITCHEN_STAFF' && !selectedKitchenId) {
      return 'Please select a kitchen';
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!user) return;

    const error = validateForm();
    if (error) {
      showWarning('Validation Error', error);
      return;
    }

    try {
      setLoading(true);

      const data: UpdateUserRequest = {
        name: name.trim(),
        email: email.trim() || undefined,
      };

      if (user.role === 'KITCHEN_STAFF') {
        data.kitchenId = selectedKitchenId;
      }

      await adminUsersService.updateUser(user._id, data);
      showSuccess('Success', 'User updated successfully');
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      showError('Error', error.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getSelectedKitchenName = () => {
    const kitchen = kitchens.find(k => k._id === selectedKitchenId);
    return kitchen ? kitchen.name : 'Select Kitchen';
  };

  if (!user) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit User</Text>
            <TouchableOpacity onPress={handleClose}>
              <MaterialIcons name="close" size={24} color={colors.black} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* User Info (Read-only) */}
            <View style={styles.section}>
              <Text style={styles.label}>Phone Number (Cannot be changed)</Text>
              <View style={[styles.inputContainer, styles.disabledInput]}>
                <MaterialIcons name="phone" size={20} color={colors.gray} />
                <Text style={styles.disabledText}>{user.phone}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Role (Cannot be changed)</Text>
              <View style={[styles.inputContainer, styles.disabledInput]}>
                <MaterialIcons
                  name={
                    user.role === 'DRIVER'
                      ? 'local-shipping'
                      : user.role === 'KITCHEN_STAFF'
                      ? 'restaurant'
                      : 'admin-panel-settings'
                  }
                  size={20}
                  color={colors.gray}
                />
                <Text style={styles.disabledText}>
                  {user.role === 'KITCHEN_STAFF'
                    ? 'Kitchen Staff'
                    : user.role === 'DRIVER'
                    ? 'Driver'
                    : 'Admin'}
                </Text>
              </View>
            </View>

            {/* Editable Fields */}
            <View style={styles.section}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color={colors.gray} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor={colors.gray}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="email" size={20} color={colors.gray} />
                <TextInput
                  style={styles.input}
                  placeholder="email@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.gray}
                />
              </View>
            </View>

            {/* Kitchen Selection (for KITCHEN_STAFF) */}
            {user.role === 'KITCHEN_STAFF' && (
              <View style={styles.section}>
                <Text style={styles.label}>Kitchen *</Text>
                {loadingKitchens ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => setShowKitchenPicker(true)}
                  >
                    <MaterialIcons name="restaurant" size={20} color={colors.gray} />
                    <Text
                      style={[
                        styles.selectButtonText,
                        !selectedKitchenId && styles.selectButtonPlaceholder,
                      ]}
                    >
                      {getSelectedKitchenName()}
                    </Text>
                    <MaterialIcons name="arrow-drop-down" size={24} color={colors.gray} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Admin Username Note */}
            {user.role === 'ADMIN' && user.username && (
              <View style={styles.noteBox}>
                <MaterialIcons name="info" size={20} color={colors.primary} />
                <View style={styles.noteContent}>
                  <Text style={styles.noteText}>
                    Username: <Text style={styles.noteUsername}>@{user.username}</Text>
                  </Text>
                  <Text style={styles.noteSubtext}>
                    Username cannot be changed. Use Reset Password to change admin password.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

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
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Update User</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Kitchen Picker Modal */}
      <Modal
        visible={showKitchenPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowKitchenPicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Kitchen</Text>
              <TouchableOpacity onPress={() => setShowKitchenPicker(false)}>
                <MaterialIcons name="close" size={24} color={colors.black} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {kitchens.map(kitchen => (
                <TouchableOpacity
                  key={kitchen._id}
                  style={[
                    styles.pickerItem,
                    selectedKitchenId === kitchen._id && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setSelectedKitchenId(kitchen._id);
                    setShowKitchenPicker(false);
                  }}
                >
                  <MaterialIcons name="restaurant" size={20} color={colors.gray} />
                  <View style={styles.pickerItemText}>
                    <Text style={styles.kitchenName}>{kitchen.name}</Text>
                    <Text style={styles.kitchenCode}>{kitchen.code}</Text>
                  </View>
                  {selectedKitchenId === kitchen._id && (
                    <MaterialIcons name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.black,
  },
  scrollView: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabledInput: {
    backgroundColor: '#f9fafb',
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
    color: colors.black,
  },
  disabledText: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
    color: colors.gray,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectButtonText: {
    flex: 1,
    fontSize: 14,
    color: colors.black,
    marginLeft: spacing.sm,
  },
  selectButtonPlaceholder: {
    color: colors.gray,
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  noteContent: {
    flex: 1,
  },
  noteText: {
    fontSize: 13,
    color: colors.black,
    marginBottom: spacing.xs,
  },
  noteUsername: {
    fontWeight: '700',
    color: colors.primary,
  },
  noteSubtext: {
    fontSize: 12,
    color: colors.gray,
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
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
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
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.black,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemActive: {
    backgroundColor: `${colors.primary}10`,
  },
  pickerItemText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  kitchenName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
  },
  kitchenCode: {
    fontSize: 12,
    color: colors.gray,
    marginTop: spacing.xs / 2,
  },
});
