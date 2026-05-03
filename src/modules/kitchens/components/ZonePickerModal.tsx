import React, { useState, useEffect } from 'react';
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
import { Zone } from '../../../types/api.types';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import zoneService from '../../../services/zone.service';

interface ZonePickerModalProps {
  visible: boolean;
  selectedZoneIds: string[];
  onClose: () => void;
  onSave: (zoneIds: string[]) => void;
  /**
   * Use the public /api/zones/active endpoint (no auth required).
   * Set true when called before the user has logged in (e.g., kitchen self-registration).
   */
  publicMode?: boolean;
}

export const ZonePickerModal: React.FC<ZonePickerModalProps> = ({
  visible,
  selectedZoneIds,
  onClose,
  onSave,
  publicMode = false,
}) => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [filteredZones, setFilteredZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedZoneIds);

  useEffect(() => {
    if (visible) {
      loadZones();
      setTempSelectedIds(selectedZoneIds);
    }
  }, [visible, selectedZoneIds]);

  useEffect(() => {
    if (searchText === '') {
      setFilteredZones(zones);
    } else {
      const filtered = zones.filter(
        (zone) =>
          zone.pincode.includes(searchText) ||
          zone.name.toLowerCase().includes(searchText.toLowerCase()) ||
          zone.city.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredZones(filtered);
    }
  }, [searchText, zones]);

  const loadZones = async () => {
    setLoading(true);
    try {
      if (publicMode) {
        const publicZones = await zoneService.getActiveZonesPublic();
        const mapped = publicZones as unknown as Zone[];
        setZones(mapped);
        setFilteredZones(mapped);
      } else {
        const response = await zoneService.getZones({ status: 'ACTIVE', limit: 100 });
        setZones(response.zones);
        setFilteredZones(response.zones);
      }
    } catch (error) {
      console.error('Error loading zones:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleZone = (zoneId: string) => {
    setTempSelectedIds((prev) => {
      if (prev.includes(zoneId)) {
        return prev.filter((id) => id !== zoneId);
      } else {
        return [...prev, zoneId];
      }
    });
  };

  const handleSave = () => {
    onSave(tempSelectedIds);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedIds(selectedZoneIds);
    setSearchText('');
    onClose();
  };

  const renderZoneItem = ({ item }: { item: Zone }) => {
    const isSelected = tempSelectedIds.includes(item._id);

    return (
      <TouchableOpacity
        style={[styles.zoneItem, isSelected && styles.zoneItemSelected]}
        onPress={() => toggleZone(item._id)}>
        <View style={styles.zoneInfo}>
          <View style={styles.zonePincodeContainer}>
            <Text style={styles.zonePincode}>{item.pincode}</Text>
            {item.orderingEnabled ? (
              <Icon name="check-circle" size={14} color={colors.success} />
            ) : (
              <Icon name="close-circle" size={14} color={colors.error} />
            )}
          </View>
          <Text style={styles.zoneName}>{item.name}</Text>
          <Text style={styles.zoneCity}>{item.city}</Text>
        </View>
        <View
          style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
          ]}>
          {isSelected && <Icon name="check" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Zones</Text>
            <TouchableOpacity onPress={handleCancel}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by pincode, name, or city..."
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
            <Icon name="map-marker-multiple" size={16} color={colors.primary} />
            <Text style={styles.selectedCountText}>
              {tempSelectedIds.length} {tempSelectedIds.length === 1 ? 'zone' : 'zones'} selected
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading zones...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredZones}
              renderItem={renderZoneItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="map-marker-off" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>
                    {searchText ? 'No zones found' : 'No active zones available'}
                  </Text>
                </View>
              }
            />
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                Save ({tempSelectedIds.length})
              </Text>
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
  title: {
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
  zoneItem: {
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
  zoneItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  zoneInfo: {
    flex: 1,
  },
  zonePincodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  zonePincode: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  zoneName: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  zoneCity: {
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
