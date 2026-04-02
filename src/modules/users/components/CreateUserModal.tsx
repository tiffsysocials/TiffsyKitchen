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
import { adminUsersService, CreateUserRequest } from '../../../services/admin-users.service';
import { kitchenService } from '../../../services/kitchen.service';
import { UserRole, Kitchen } from '../../../types/api.types';
import { useAlert } from '../../../hooks/useAlert';

interface CreateUserModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialRole?: UserRole;
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

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  visible,
  onClose,
  onSuccess,
  initialRole,
}) => {
  const { showSuccess, showError, showWarning } = useAlert();
  const [role, setRole] = useState<UserRole>(initialRole || 'KITCHEN_STAFF');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedKitchenId, setSelectedKitchenId] = useState<string>('');
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingKitchens, setLoadingKitchens] = useState(false);
  const [showKitchenPicker, setShowKitchenPicker] = useState(false);

  useEffect(() => {
    if (visible && role === 'KITCHEN_STAFF') {
      fetchKitchens();
    }
  }, [visible, role]);

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
    setPhone('');
    setName('');
    setEmail('');
    setUsername('');
    setPassword('');
    setSelectedKitchenId('');
    setRole(initialRole || 'KITCHEN_STAFF');
  };

  const validateForm = (): string | null => {
    if (!phone.trim() || phone.length !== 10) {
      return 'Please enter a valid 10-digit phone number';
    }
    if (!name.trim()) {
      return 'Please enter a name';
    }
    if (role === 'KITCHEN_STAFF' && !selectedKitchenId) {
      return 'Please select a kitchen';
    }
    if (role === 'ADMIN') {
      if (!username.trim()) {
        return 'Please enter a username';
      }
      if (!password.trim() || password.length < 8) {
        return 'Password must be at least 8 characters';
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      showWarning('Validation Error', error);
      return;
    }

    try {
      setLoading(true);

      const data: CreateUserRequest = {
        phone,
        role,
        name: name.trim(),
        email: email.trim() || undefined,
      };

      if (role === 'KITCHEN_STAFF') {
        data.kitchenId = selectedKitchenId;
      }

      if (role === 'ADMIN') {
        data.username = username.trim();
        data.password = password;
      }

      await adminUsersService.createUser(data);
      showSuccess('Success', 'User created successfully');
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      showError('Error', error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const roleOptions: { value: UserRole; label: string; icon: string }[] = [
    { value: 'KITCHEN_STAFF', label: 'Kitchen Staff', icon: 'restaurant' },
    { value: 'DRIVER', label: 'Driver', icon: 'local-shipping' },
    { value: 'ADMIN', label: 'Admin', icon: 'admin-panel-settings' },
  ];

  const getSelectedKitchenName = () => {
    const kitchen = kitchens.find(k => k._id === selectedKitchenId);
    return kitchen ? kitchen.name : 'Select Kitchen';
  };

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
            <Text style={styles.headerTitle}>Create New User</Text>
            <TouchableOpacity onPress={handleClose}>
              <MaterialIcons name="close" size={24} color={colors.black} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Role Selection */}
            {!initialRole && (
              <View style={styles.section}>
                <Text style={styles.label}>Role *</Text>
                <View style={styles.roleGrid}>
                  {roleOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.roleOption,
                        role === option.value && styles.roleOptionActive,
                      ]}
                      onPress={() => setRole(option.value)}
                    >
                      <MaterialIcons
                        name={option.icon}
                        size={24}
                        color={role === option.value ? colors.primary : colors.gray}
                      />
                      <Text
                        style={[
                          styles.roleOptionText,
                          role === option.value && styles.roleOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Phone Number */}
            <View style={styles.section}>
              <Text style={styles.label}>Phone Number *</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="phone" size={20} color={colors.gray} />
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholderTextColor={colors.gray}
                />
              </View>
            </View>

            {/* Name */}
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

            {/* Email */}
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
            {role === 'KITCHEN_STAFF' && (
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

            {/* Username (for ADMIN) */}
            {role === 'ADMIN' && (
              <View style={styles.section}>
                <Text style={styles.label}>Username *</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="account-circle" size={20} color={colors.gray} />
                  <TextInput
                    style={styles.input}
                    placeholder="username"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    placeholderTextColor={colors.gray}
                  />
                </View>
              </View>
            )}

            {/* Password (for ADMIN) */}
            {role === 'ADMIN' && (
              <View style={styles.section}>
                <Text style={styles.label}>Password *</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock" size={20} color={colors.gray} />
                  <TextInput
                    style={styles.input}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholderTextColor={colors.gray}
                  />
                </View>
                <Text style={styles.hint}>
                  Password must be at least 8 characters
                </Text>
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
                <Text style={styles.submitButtonText}>Create User</Text>
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
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
    color: colors.black,
  },
  hint: {
    fontSize: 12,
    color: colors.gray,
    marginTop: spacing.xs,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.lightGray,
  },
  roleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  roleOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  roleOptionTextActive: {
    color: colors.primary,
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
