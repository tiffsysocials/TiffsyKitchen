import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../theme/colors';
import type { Driver } from '../../../types/driver.types';
import { ApproveDriverModal } from '../components/ApproveDriverModal';
import { RejectDriverModal } from '../components/RejectDriverModal';
import { DriverDocumentViewer } from '../components/DriverDocumentViewer';

interface DriverDetailScreenProps {
  driver: Driver;
  onBack: () => void;
  onActionComplete: () => void;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const isExpiringSoon = (dateString?: string, daysThreshold = 30): boolean => {
  if (!dateString) return false;
  const expiryDate = new Date(dateString);
  const today = new Date();
  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysUntilExpiry > 0 && daysUntilExpiry <= daysThreshold;
};

const isExpired = (dateString?: string): boolean => {
  if (!dateString) return false;
  const expiryDate = new Date(dateString);
  const today = new Date();
  return expiryDate < today;
};

const getInitials = (name: string): string => {
  const names = name.trim().split(' ');
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string): string => {
  const colors = [
    '#FE8733', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
    '#ef4444', '#06b6d4', '#ec4899', '#14b8a6', '#f97316'
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export const DriverDetailScreen: React.FC<DriverDetailScreenProps> = ({
  driver,
  onBack,
  onActionComplete,
}) => {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string>('');

  const openImageViewer = (imageUrl: string, title: string) => {
    setViewerImage(imageUrl);
    setViewerTitle(title);
  };

  const closeImageViewer = () => {
    setViewerImage(null);
    setViewerTitle('');
  };

  const renderExpiryWarning = (dateString?: string) => {
    if (!dateString) return null;

    if (isExpired(dateString)) {
      return (
        <View style={styles.expiryBadge}>
          <MaterialIcons name="error" size={14} color={colors.error} />
          <Text style={[styles.expiryText, { color: colors.error }]}>Expired</Text>
        </View>
      );
    }

    if (isExpiringSoon(dateString)) {
      const daysUntil = Math.ceil(
        (new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return (
        <View style={[styles.expiryBadge, { backgroundColor: colors.warning + '20' }]}>
          <MaterialIcons name="warning" size={14} color={colors.warning} />
          <Text style={[styles.expiryText, { color: colors.warning }]}>
            Expires in {daysUntil} days
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.expiryBadge, { backgroundColor: colors.success + '20' }]}>
        <MaterialIcons name="check-circle" size={14} color={colors.success} />
        <Text style={[styles.expiryText, { color: colors.success }]}>Valid</Text>
      </View>
    );
  };

  const isPending = driver.approvalStatus === 'PENDING';
  const initials = getInitials(driver.name);
  const avatarColor = getAvatarColor(driver.name);

  // Check if it's a valid image (not empty, not placeholder)
  const isPlaceholder = driver.profileImage?.includes('placeholder') || driver.profileImage?.includes('example.com');
  const hasValidImage = !!(driver.profileImage && driver.profileImage.trim() !== '' && !isPlaceholder);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.card}>
            <View style={styles.profileImageContainer}>
              {hasValidImage ? (
                <Image
                  source={{ uri: driver.profileImage }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImage, styles.profileImagePlaceholder, { backgroundColor: avatarColor }]}>
                  <Text style={styles.profileImageText}>{initials}</Text>
                </View>
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{driver.name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{driver.phone}</Text>
            </View>

            {driver.email && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{driver.email}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Registered</Text>
              <Text style={styles.infoValue}>{formatDate(driver.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* License Details */}
        {driver.driverDetails?.licenseNumber && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>License Details</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>License Number</Text>
                <Text style={styles.infoValue}>
                  {driver.driverDetails.licenseNumber}
                </Text>
              </View>

              {driver.driverDetails.licenseExpiryDate && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Expiry Date</Text>
                  <View style={styles.infoValueRow}>
                    <Text style={styles.infoValue}>
                      {formatDate(driver.driverDetails.licenseExpiryDate)}
                    </Text>
                    {renderExpiryWarning(driver.driverDetails.licenseExpiryDate)}
                  </View>
                </View>
              )}

              {driver.driverDetails.licenseImageUrl && (
                <View style={styles.documentContainer}>
                  <Text style={styles.documentLabel}>License Image</Text>
                  <TouchableOpacity
                    onPress={() =>
                      openImageViewer(
                        driver.driverDetails!.licenseImageUrl!,
                        'License Image'
                      )
                    }
                  >
                    <Image
                      source={{ uri: driver.driverDetails.licenseImageUrl }}
                      style={styles.documentThumbnail}
                    />
                    <Text style={styles.viewFullSize}>Tap to view full size</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Vehicle Information */}
        {driver.driverDetails?.vehicleName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Vehicle Name</Text>
                <Text style={styles.infoValue}>{driver.driverDetails.vehicleName}</Text>
              </View>

              {driver.driverDetails.vehicleNumber && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Vehicle Number</Text>
                  <Text style={styles.infoValue}>
                    {driver.driverDetails.vehicleNumber}
                  </Text>
                </View>
              )}

              {driver.driverDetails.vehicleType && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Vehicle Type</Text>
                  <Text style={styles.infoValue}>
                    {driver.driverDetails.vehicleType}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Vehicle Documents */}
        {driver.driverDetails?.vehicleDocuments &&
          driver.driverDetails.vehicleDocuments.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Documents</Text>
              {driver.driverDetails.vehicleDocuments.map((doc, index) => (
                <View key={index} style={styles.card}>
                  <View style={styles.documentHeader}>
                    <Text style={styles.documentType}>{doc.type}</Text>
                    {renderExpiryWarning(doc.expiryDate)}
                  </View>

                  {doc.expiryDate && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Expiry Date</Text>
                      <Text style={styles.infoValue}>{formatDate(doc.expiryDate)}</Text>
                    </View>
                  )}

                  <View style={styles.documentContainer}>
                    <TouchableOpacity
                      onPress={() => openImageViewer(doc.imageUrl, doc.type)}
                    >
                      <Image
                        source={{ uri: doc.imageUrl }}
                        style={styles.documentThumbnail}
                      />
                      <Text style={styles.viewFullSize}>Tap to view full size</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

        {/* Rejection Details (if rejected) */}
        {driver.approvalStatus === 'REJECTED' &&
          driver.approvalDetails?.rejectionReason && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rejection Details</Text>
              <View style={[styles.card, styles.rejectionCard]}>
                <View style={styles.rejectionHeader}>
                  <MaterialIcons name="cancel" size={24} color={colors.error} />
                  <Text style={styles.rejectionTitle}>Rejected</Text>
                </View>
                <Text style={styles.rejectionReason}>
                  {driver.approvalDetails.rejectionReason}
                </Text>
                <Text style={styles.rejectionDate}>
                  {formatDate(driver.approvalDetails.rejectedAt)}
                </Text>
              </View>
            </View>
          )}

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons (only for pending drivers) */}
      {isPending && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => setShowRejectModal(true)}
          >
            <MaterialIcons name="cancel" size={20} color={colors.white} />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.approveButton}
            onPress={() => setShowApproveModal(true)}
          >
            <MaterialIcons name="check-circle" size={20} color={colors.white} />
            <Text style={styles.approveButtonText}>Approve Driver</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modals */}
      <ApproveDriverModal
        visible={showApproveModal}
        driver={driver}
        onClose={() => setShowApproveModal(false)}
        onSuccess={onActionComplete}
      />

      <RejectDriverModal
        visible={showRejectModal}
        driver={driver}
        onClose={() => setShowRejectModal(false)}
        onSuccess={onActionComplete}
      />

      <DriverDocumentViewer
        visible={!!viewerImage}
        imageUrl={viewerImage || ''}
        documentType={viewerTitle}
        onClose={closeImageViewer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray900,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.gray600,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.gray900,
    fontWeight: '600',
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.error + '20',
    gap: 4,
  },
  expiryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  documentContainer: {
    marginTop: 12,
  },
  documentLabel: {
    fontSize: 14,
    color: colors.gray700,
    fontWeight: '500',
    marginBottom: 8,
  },
  documentThumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: colors.gray100,
  },
  viewFullSize: {
    fontSize: 12,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  documentType: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
  },
  rejectionCard: {
    borderColor: colors.error + '40',
    backgroundColor: colors.error + '05',
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  rejectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  rejectionReason: {
    fontSize: 14,
    color: colors.gray700,
    lineHeight: 20,
    marginBottom: 8,
  },
  rejectionDate: {
    fontSize: 12,
    color: colors.gray500,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: colors.error,
    gap: 8,
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: colors.success,
    gap: 8,
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
