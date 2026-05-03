import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../theme/colors';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { Header } from '../../../components/common/Header';
import { kitchenStaffService } from '../../../services/kitchen-staff.service';
import { useNavigation } from '../../../context/NavigationContext';

interface KitchenRejectionScreenProps {
  onMenuPress: () => void;
}

export const KitchenRejectionScreen: React.FC<KitchenRejectionScreenProps> = ({
  onMenuPress,
}) => {
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitNotes, setResubmitNotes] = useState('');

  // Fetch kitchen status
  const { data, isLoading } = useQuery({
    queryKey: ['myKitchenStatus'],
    queryFn: () => kitchenStaffService.getMyKitchenStatus(),
  });

  // React to status changes (React Query v5 removed onSuccess callback)
  useEffect(() => {
    if (!data?.data) return;
    if (data.data.kitchen?.status === 'ACTIVE') {
      navigate('KitchenDashboard');
    } else if (!data.data.rejectionReason) {
      navigate('KitchenPending');
    }
  }, [data, navigate]);

  // Resubmit mutation
  const resubmitMutation = useMutation({
    mutationFn: (updates: any) => kitchenStaffService.resubmitKitchen(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myKitchenStatus'] });
      Alert.alert(
        'Application Resubmitted',
        'Your kitchen application has been resubmitted for review. We\'ll notify you once the review is complete.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowResubmitModal(false);
              setResubmitNotes('');
              navigate('KitchenPending');
            },
          },
        ]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Resubmission Failed',
        error?.response?.data?.message || error?.message || 'Failed to resubmit application. Please try again.'
      );
    },
  });

  const kitchen = data?.data?.kitchen;
  const rejectionReason = data?.data?.rejectionReason;
  const rejectedDate = data?.data?.rejectedAt
    ? new Date(data.data.rejectedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const handleContactSupport = () => {
    const email = 'support@tiffsy.com';
    const subject = encodeURIComponent('Kitchen Application Rejection Inquiry');
    const body = encodeURIComponent(
      `Kitchen Name: ${kitchen?.name || 'N/A'}\nRejection Reason: ${rejectionReason}\n\nQuery: `
    );
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const handleResubmit = () => {
    setShowResubmitModal(true);
  };

  const handleConfirmResubmit = () => {
    // For now, just resubmit without changes
    // In a full implementation, you'd have a form to update kitchen details
    const updates = {
      description: resubmitNotes || undefined,
    };

    resubmitMutation.mutate(updates);
  };

  if (isLoading && !data) {
    return (
      <SafeAreaScreen
        topBackgroundColor={colors.primary}
        bottomBackgroundColor={colors.background}
      >
        <Header title="Application Status" onMenuPress={onMenuPress} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading status...</Text>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen
      topBackgroundColor={colors.primary}
      bottomBackgroundColor={colors.background}
    >
      <Header title="Application Status" onMenuPress={onMenuPress} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="cancel" size={64} color={colors.error} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Application Rejected</Text>

        {/* Description */}
        <Text style={styles.description}>
          Unfortunately, your kitchen registration was not approved. Please review the reason below
          and update your application accordingly.
        </Text>

        {/* Rejection Reason Card */}
        <View style={styles.reasonCard}>
          <View style={styles.reasonHeader}>
            <MaterialIcons name="info-outline" size={24} color={colors.error} />
            <Text style={styles.reasonTitle}>Rejection Reason</Text>
          </View>

          <View style={styles.reasonContent}>
            <Text style={styles.reasonText}>{rejectionReason || 'No reason provided'}</Text>
          </View>

          {rejectedDate && (
            <View style={styles.reasonFooter}>
              <MaterialIcons name="event" size={16} color={colors.gray500} />
              <Text style={styles.reasonDate}>Rejected on {rejectedDate}</Text>
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="store" size={20} color={colors.gray600} />
            <Text style={styles.infoLabel}>Kitchen Name:</Text>
            <Text style={styles.infoValue}>{kitchen?.name || 'N/A'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialIcons name="cancel" size={20} color={colors.error} />
            <Text style={styles.infoLabel}>Status:</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>REJECTED</Text>
            </View>
          </View>
        </View>

        {/* Instructions Card */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>What should I do?</Text>
          <Text style={styles.instructionsText}>
            1. Review the rejection reason carefully{'\n'}
            2. Update your kitchen details to address the issues{'\n'}
            3. Resubmit your application{'\n'}
            4. Our team will review it again{'\n'}
            5. Contact support if you need help
          </Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleResubmit}
          disabled={resubmitMutation.isLoading}
        >
          {resubmitMutation.isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <MaterialIcons name="refresh" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>Edit & Resubmit Application</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleContactSupport}
        >
          <MaterialIcons name="email" size={20} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>Contact Support</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Resubmit Modal */}
      <Modal
        visible={showResubmitModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResubmitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resubmit Application</Text>
              <TouchableOpacity
                onPress={() => setShowResubmitModal(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>
                Previous Rejection Reason:
              </Text>
              <View style={styles.modalReasonBox}>
                <Text style={styles.modalReasonText}>{rejectionReason}</Text>
              </View>

              <Text style={styles.modalLabel}>
                Additional Notes (Optional):
              </Text>
              <Text style={styles.modalHint}>
                Explain how you've addressed the issues
              </Text>
              <TextInput
                style={styles.modalInput}
                multiline
                numberOfLines={4}
                value={resubmitNotes}
                onChangeText={setResubmitNotes}
                placeholder="e.g., I've uploaded a valid FSSAI license that expires in 2026..."
                placeholderTextColor={colors.gray400}
              />

              <Text style={styles.modalInfo}>
                💡 In a full implementation, you would be able to edit all kitchen details here
                (name, address, documents, etc.).
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowResubmitModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalSubmitButton]}
                onPress={handleConfirmResubmit}
                disabled={resubmitMutation.isLoading}
              >
                {resubmitMutation.isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Resubmit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.gray600,
  },
  iconContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEE2E2', // Red light background
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  reasonCard: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.error,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reasonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.error,
    marginLeft: 8,
  },
  reasonContent: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  reasonText: {
    fontSize: 15,
    color: colors.gray900,
    lineHeight: 22,
  },
  reasonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reasonDate: {
    fontSize: 13,
    color: colors.gray600,
    marginLeft: 6,
    fontStyle: 'italic',
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.gray600,
    marginLeft: 8,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray900,
    flex: 2,
    textAlign: 'right',
  },
  statusBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: 8,
  },
  instructionsCard: {
    width: '100%',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: colors.gray700,
    lineHeight: 24,
  },
  button: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 8,
    marginTop: 16,
  },
  modalHint: {
    fontSize: 12,
    color: colors.gray500,
    marginBottom: 8,
  },
  modalReasonBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  modalReasonText: {
    fontSize: 14,
    color: colors.gray900,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.gray900,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalInfo: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 12,
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: colors.gray300,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray700,
  },
  modalSubmitButton: {
    backgroundColor: colors.primary,
  },
  modalSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
