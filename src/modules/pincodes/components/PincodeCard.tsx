import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PincodeRecord } from '../../../types/api.types';
import { colors } from '../../../theme/colors';
import { useAlert } from '../../../hooks/useAlert';

interface Props {
  pincode: PincodeRecord;
  onEdit: (p: PincodeRecord) => void;
  onDelete: (p: PincodeRecord) => void;
}

const SOURCE_COLORS: Record<string, { bg: string; fg: string }> = {
  SEED: { bg: '#dbeafe', fg: '#1d4ed8' },
  INDIA_POST: { bg: '#fef3c7', fg: '#92400e' },
  GOOGLE: { bg: '#dcfce7', fg: '#166534' },
  MANUAL: { bg: '#fce7f3', fg: '#9d174d' },
};

export const PincodeCard: React.FC<Props> = ({ pincode, onEdit, onDelete }) => {
  const { showConfirm } = useAlert();
  const sourceColor = SOURCE_COLORS[pincode.source] || SOURCE_COLORS.MANUAL;

  const confirmDelete = () => {
    showConfirm(
      'Delete Pincode',
      `Remove ${pincode.pincode} (${pincode.city || 'Unknown'})? Kitchens already linked to a zone for this pincode are unaffected.`,
      () => onDelete(pincode),
      undefined,
      { confirmText: 'Delete', cancelText: 'Cancel', isDestructive: true },
    );
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onEdit(pincode)} activeOpacity={0.95}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.pincodeBadge}>
            <Icon name="map-marker" size={16} color="#fff" />
            <Text style={styles.pincodeText}>{pincode.pincode}</Text>
          </View>
          <Text style={styles.location} numberOfLines={1}>
            {[pincode.city, pincode.district, pincode.state].filter(Boolean).join(' · ') || 'Unknown'}
          </Text>
          {pincode.officeName ? <Text style={styles.office}>{pincode.officeName}</Text> : null}
          {pincode.latitude != null && pincode.longitude != null && (
            <Text style={styles.coords}>
              {pincode.latitude.toFixed(4)}, {pincode.longitude.toFixed(4)}
            </Text>
          )}
        </View>
        <View style={styles.right}>
          <View style={[styles.sourceBadge, { backgroundColor: sourceColor.bg }]}>
            <Text style={[styles.sourceText, { color: sourceColor.fg }]}>{pincode.source}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(pincode)} activeOpacity={0.85}>
          <Icon name="pencil" size={14} color="#fff" />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete} activeOpacity={0.85}>
          <Icon name="delete" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  left: { flex: 1, marginRight: 8 },
  right: { alignItems: 'flex-end' },
  pincodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  pincodeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  location: { fontSize: 13, color: '#0f172a', fontWeight: '600' },
  office: { fontSize: 11, color: '#64748b', marginTop: 2 },
  coords: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontFamily: 'monospace' },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sourceText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  actions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
