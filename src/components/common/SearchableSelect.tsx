import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export interface SearchableSelectOption {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  /** Plain string options or {label, value} objects. */
  options: readonly string[] | readonly SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  iconName?: string;
  /** When true, shows an "Other..." entry that opens a free-text input. Defaults to true. */
  allowOther?: boolean;
  searchPlaceholder?: string;
}

const normalizeOptions = (
  options: readonly string[] | readonly SearchableSelectOption[],
): SearchableSelectOption[] => {
  if (options.length === 0) return [];
  if (typeof options[0] === 'string') {
    return (options as readonly string[]).map((s) => ({ label: s, value: s }));
  }
  return options as SearchableSelectOption[];
};

/**
 * Modal-based searchable picker with an optional "Other..." free-text fallback.
 * Used for state/city selection across kitchen, zone, and pincode forms.
 */
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  required,
  error,
  helperText,
  disabled,
  iconName,
  allowOther = true,
  searchPlaceholder = 'Search…',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [otherMode, setOtherMode] = useState(false);
  const [otherValue, setOtherValue] = useState('');

  const normalized = useMemo(() => normalizeOptions(options), [options]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter((o) => o.label.toLowerCase().includes(q));
  }, [normalized, search]);

  const selectedLabel = useMemo(() => {
    const match = normalized.find((o) => o.value === value);
    if (match) return match.label;
    // value isn't in the list — show it verbatim (came from "Other...")
    return value || '';
  }, [normalized, value]);

  const closeAndReset = () => {
    setOpen(false);
    setSearch('');
    setOtherMode(false);
    setOtherValue('');
  };

  const handleSelect = (v: string) => {
    onChange(v);
    closeAndReset();
  };

  const handleConfirmOther = () => {
    const trimmed = otherValue.trim();
    if (!trimmed) return;
    onChange(trimmed);
    closeAndReset();
  };

  return (
    <View>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TouchableOpacity
        style={[styles.field, error && styles.fieldError, disabled && styles.fieldDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
      >
        {iconName ? (
          <Icon name={iconName} size={20} color={colors.textMuted} style={styles.fieldIcon} />
        ) : null}
        <Text
          style={[styles.fieldValue, !selectedLabel && styles.fieldPlaceholder]}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </Text>
        <Icon name="chevron-down" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={closeAndReset}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{otherMode ? `Enter ${label}` : label}</Text>
              <TouchableOpacity onPress={closeAndReset}>
                <Icon name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {otherMode ? (
              <View style={styles.otherWrap}>
                <TextInput
                  style={styles.otherInput}
                  value={otherValue}
                  onChangeText={setOtherValue}
                  placeholder={`Type ${label.toLowerCase()}…`}
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <View style={styles.otherActions}>
                  <TouchableOpacity
                    style={[styles.otherButton, styles.otherButtonSecondary]}
                    onPress={() => setOtherMode(false)}
                  >
                    <Text style={styles.otherButtonSecondaryText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.otherButton,
                      styles.otherButtonPrimary,
                      !otherValue.trim() && styles.otherButtonDisabled,
                    ]}
                    onPress={handleConfirmOther}
                    disabled={!otherValue.trim()}
                  >
                    <Text style={styles.otherButtonPrimaryText}>Use this</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.searchWrap}>
                  <Icon name="magnify" size={18} color={colors.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder={searchPlaceholder}
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                  />
                  {search ? (
                    <TouchableOpacity onPress={() => setSearch('')}>
                      <Icon name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <FlatList
                  data={filtered}
                  keyExtractor={(item) => item.value}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    <View style={styles.empty}>
                      <Text style={styles.emptyText}>No matches</Text>
                    </View>
                  }
                  renderItem={({ item }) => {
                    const isSelected = item.value === value;
                    return (
                      <TouchableOpacity
                        style={[styles.row, isSelected && styles.rowSelected]}
                        onPress={() => handleSelect(item.value)}
                      >
                        <Text style={[styles.rowText, isSelected && styles.rowTextSelected]}>
                          {item.label}
                        </Text>
                        {isSelected ? (
                          <Icon name="check" size={18} color={colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  }}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />

                {allowOther ? (
                  <TouchableOpacity
                    style={styles.otherChip}
                    onPress={() => {
                      setOtherValue(
                        // Pre-fill with current value if it's not in the list
                        normalized.find((o) => o.value === value) ? '' : value || '',
                      );
                      setOtherMode(true);
                    }}
                  >
                    <Icon name="pencil" size={16} color={colors.primary} />
                    <Text style={styles.otherChipText}>Other… (type manually)</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SearchableSelect;

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  required: { color: colors.error, fontWeight: '700' },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  fieldError: { borderColor: colors.error },
  fieldDisabled: { backgroundColor: colors.gray100 },
  fieldIcon: { marginRight: spacing.sm },
  fieldValue: { flex: 1, fontSize: 14, color: colors.textPrimary, paddingVertical: 12 },
  fieldPlaceholder: { color: colors.textMuted },

  errorText: { fontSize: 12, color: colors.error, marginTop: 4 },
  helperText: { fontSize: 12, color: colors.textMuted, marginTop: 4 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.gray100,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadiusMd,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 10,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  rowSelected: { backgroundColor: colors.primaryLight },
  rowText: { fontSize: 15, color: colors.textPrimary },
  rowTextSelected: { color: colors.primary, fontWeight: '600' },
  separator: { height: 1, backgroundColor: colors.divider, marginHorizontal: spacing.lg },

  empty: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted },

  otherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: spacing.borderRadiusMd,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  otherChipText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  otherWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  otherInput: {
    backgroundColor: colors.gray100,
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  otherActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  otherButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: spacing.borderRadiusMd,
    alignItems: 'center',
  },
  otherButtonPrimary: { backgroundColor: colors.primary },
  otherButtonDisabled: { opacity: 0.5 },
  otherButtonPrimaryText: { color: '#fff', fontWeight: '700' },
  otherButtonSecondary: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  otherButtonSecondaryText: { color: colors.textPrimary, fontWeight: '600' },
});
