import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Switch,
  ScrollView,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useAlert } from '../../../hooks/useAlert';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { StaffMember, OperationalContact } from '../models/types';
import { colors, spacing } from '../../../theme';

interface StaffTabProps {
  staffMembers: StaffMember[];
  operationalContacts: OperationalContact[];
  onStaffUpdate: (member: StaffMember) => void;
}

// Card wrapper component
const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {children}
  </View>
);

// Staff Member Row
const StaffRow: React.FC<{
  member: StaffMember;
  onPress: () => void;
}> = ({ member, onPress }) => (
  <TouchableOpacity style={styles.staffRow} onPress={onPress}>
    <View style={styles.staffAvatar}>
      <Text style={styles.staffInitial}>{member.name.charAt(0)}</Text>
    </View>
    <View style={styles.staffInfo}>
      <Text style={styles.staffName}>{member.name}</Text>
      <Text style={styles.staffRole}>{member.role}</Text>
    </View>
    <View style={[styles.staffStatus, member.isActive ? styles.statusActive : styles.statusInactive]}>
      <Text style={[styles.staffStatusText, { color: member.isActive ? colors.success : colors.textMuted }]}>
        {member.isActive ? 'Active' : 'Inactive'}
      </Text>
    </View>
    <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
  </TouchableOpacity>
);

// Staff Detail Modal
const StaffDetailModal: React.FC<{
  member: StaffMember | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: (member: StaffMember) => void;
}> = ({ member, visible, onClose, onUpdate }) => {
  if (!member) return null;

  const handleToggleActive = () => {
    onUpdate({ ...member, isActive: !member.isActive });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Staff Details</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.detailAvatar}>
              <Text style={styles.detailInitial}>{member.name.charAt(0)}</Text>
            </View>
            <Text style={styles.detailName}>{member.name}</Text>
            <Text style={styles.detailRole}>{member.role}</Text>

            <View style={styles.detailRow}>
              <MaterialIcons name="phone" size={18} color={colors.textMuted} />
              <Text style={styles.detailText}>{member.phone}</Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="email" size={18} color={colors.textMuted} />
              <Text style={styles.detailText}>{member.email}</Text>
            </View>

            {member.notes && (
              <View style={styles.detailRow}>
                <MaterialIcons name="notes" size={18} color={colors.textMuted} />
                <Text style={styles.detailText}>{member.notes}</Text>
              </View>
            )}

            <View style={styles.activeToggle}>
              <Text style={styles.activeToggleLabel}>Active Status</Text>
              <Switch
                value={member.isActive}
                onValueChange={handleToggleActive}
                trackColor={{ false: colors.divider, true: colors.successLight }}
                thumbColor={member.isActive ? colors.success : colors.card}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Contact Row
const ContactRow: React.FC<{ contact: OperationalContact; showInfo: (title: string, message: string) => void }> = ({ contact, showInfo }) => {
  const handleCopy = () => {
    Clipboard.setString(contact.value);
    showInfo('Copied', `${contact.label} copied to clipboard`);
  };

  const getIcon = () => {
    switch (contact.type) {
      case 'phone':
        return 'phone';
      case 'email':
        return 'email';
      case 'whatsapp':
        return 'chat';
      default:
        return 'info';
    }
  };

  return (
    <TouchableOpacity style={styles.contactRow} onPress={handleCopy}>
      <View style={styles.contactIcon}>
        <MaterialIcons name={getIcon()} size={18} color={colors.primary} />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactLabel}>{contact.label}</Text>
        <Text style={styles.contactValue}>{contact.value}</Text>
      </View>
      <MaterialIcons name="content-copy" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

export const StaffTab: React.FC<StaffTabProps> = ({
  staffMembers,
  operationalContacts,
  onStaffUpdate,
}) => {
  const { showInfo } = useAlert();
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);

  const activeStaff = staffMembers.filter((m) => m.isActive);
  const inactiveStaff = staffMembers.filter((m) => !m.isActive);

  const handleStaffUpdate = (updatedMember: StaffMember) => {
    onStaffUpdate(updatedMember);
    setSelectedMember(updatedMember);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Staff List */}
      <Card title="Kitchen Staff">
        {activeStaff.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Active ({activeStaff.length})</Text>
            {activeStaff.map((member) => (
              <StaffRow
                key={member.id}
                member={member}
                onPress={() => setSelectedMember(member)}
              />
            ))}
          </>
        )}

        {inactiveStaff.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
              Inactive ({inactiveStaff.length})
            </Text>
            {inactiveStaff.map((member) => (
              <StaffRow
                key={member.id}
                member={member}
                onPress={() => setSelectedMember(member)}
              />
            ))}
          </>
        )}
      </Card>

      {/* Operational Contacts */}
      <Card title="Operational Contacts">
        {operationalContacts.map((contact) => (
          <ContactRow key={contact.id} contact={contact} showInfo={showInfo} />
        ))}
      </Card>

      {/* Staff Detail Modal */}
      <StaffDetailModal
        member={selectedMember}
        visible={selectedMember !== null}
        onClose={() => setSelectedMember(null)}
        onUpdate={handleStaffUpdate}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  staffInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  staffRole: {
    fontSize: 12,
    color: colors.textMuted,
  },
  staffStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: spacing.sm,
  },
  statusActive: {
    backgroundColor: colors.successLight,
  },
  statusInactive: {
    backgroundColor: colors.background,
  },
  staffStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: spacing.borderRadiusXl,
    borderTopRightRadius: spacing.borderRadiusXl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalBody: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  detailAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailInitial: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.primary,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  detailRole: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.md,
    flex: 1,
  },
  activeToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  activeToggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});

export default StaffTab;
