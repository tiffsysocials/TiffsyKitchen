import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { User } from '../../../types/api.types';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { adminUsersService } from '../../../services/admin-users.service';

interface CustomerPickerModalProps {
  visible: boolean;
  selectedCustomerIds: string[];
  onClose: () => void;
  onSave: (customerIds: string[]) => void;
  title?: string;
}

export const CustomerPickerModal: React.FC<CustomerPickerModalProps> = ({
  visible,
  selectedCustomerIds,
  onClose,
  onSave,
  title = 'Select Customers',
}) => {
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedCustomerIds);

  useEffect(() => {
    if (visible) {
      loadCustomers();
      setTempSelectedIds(selectedCustomerIds);
      setSearchText('');
    }
  }, [visible]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      // Use admin endpoint with role=CUSTOMER filter (kitchen endpoint isn't authorized for admin)
      const response = await adminUsersService.getUsers({ role: 'CUSTOMER', limit: 100 });
      setCustomers(response?.users || []);
    } catch (error: any) {
      console.error('Error loading customers:', error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [customers, searchText]);

  const toggleCustomer = (customerId: string) => {
    setTempSelectedIds((prev) => {
      if (prev.includes(customerId)) {
        return prev.filter((id) => id !== customerId);
      }
      return [...prev, customerId];
    });
  };

  const handleSave = () => {
    onSave(tempSelectedIds);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedIds(selectedCustomerIds);
    setSearchText('');
    onClose();
  };

  const renderCustomerItem = ({ item }: { item: User }) => {
    const isSelected = tempSelectedIds.includes(item._id);
    return (
      <TouchableOpacity
        style={[styles.customerItem, isSelected && styles.customerItemSelected]}
        onPress={() => toggleCustomer(item._id)}
      >
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name || 'Unnamed'}</Text>
          <Text style={styles.customerMeta}>
            {item.phone}{item.email ? ` • ${item.email}` : ''}
          </Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Icon name="check" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.titleText}>{title}</Text>
            <TouchableOpacity onPress={handleCancel}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, phone, email..."
              placeholderTextColor={colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText !== '' && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Icon name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.selectedCount}>
            <Icon name="account-multiple" size={16} color={colors.primary} />
            <Text style={styles.selectedCountText}>
              {tempSelectedIds.length} {tempSelectedIds.length === 1 ? 'customer' : 'customers'} selected
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading customers...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredCustomers}
              renderItem={renderCustomerItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="account-off" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>
                    {searchText ? 'No customers match your search' : 'No customers available'}
                  </Text>
                </View>
              }
            />
          )}

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save ({tempSelectedIds.length})</Text>
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
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
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
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    margin: spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  selectedCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  selectedCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  customerItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  customerMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: spacing.borderRadiusSm,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default CustomerPickerModal;
