import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../theme/colors';
import type { Kitchen } from '../../../types/api.types';

interface KitchenDetailModalProps {
  kitchen: Kitchen;
  visible: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

type TabType = 'BASIC' | 'CONTACT' | 'HOURS' | 'SYSTEM';

export const KitchenDetailModal: React.FC<KitchenDetailModalProps> = ({
  kitchen,
  visible,
  onClose,
  onApprove,
  onReject,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('BASIC');

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const handleOpenMap = () => {
    const address = `${kitchen.address.addressLine1}, ${kitchen.address.locality}, ${kitchen.address.city}, ${kitchen.address.pincode}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  const renderTab = (tab: TabType, label: string, icon: string) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => setActiveTab(tab)}
      >
        <MaterialIcons
          name={icon}
          size={20}
          color={isActive ? colors.primary : colors.gray600}
        />
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderBasicInfo = () => (
    <View style={styles.tabContent}>
      {/* Logo and Cover */}
      {kitchen.logo && (
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>Logo</Text>
          <Image source={{ uri: kitchen.logo }} style={styles.logoImage} />
        </View>
      )}

      {kitchen.coverImage && (
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>Cover Image</Text>
          <Image source={{ uri: kitchen.coverImage }} style={styles.coverImage} />
        </View>
      )}

      {/* Description */}
      {kitchen.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.sectionText}>{kitchen.description}</Text>
        </View>
      )}

      {/* Cuisine Types */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cuisine Types</Text>
        <View style={styles.cuisinesContainer}>
          {kitchen.cuisineTypes.map((cuisine, index) => (
            <View key={index} style={styles.cuisineBadge}>
              <Text style={styles.cuisineBadgeText}>{cuisine}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Special Flags */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Flags</Text>
        <View style={styles.flagsContainer}>
          <View style={styles.flagItem}>
            <MaterialIcons
              name={kitchen.authorizedFlag ? 'check-circle' : 'cancel'}
              size={20}
              color={kitchen.authorizedFlag ? colors.success : colors.gray400}
            />
            <Text style={styles.flagText}>Authorized</Text>
          </View>
          <View style={styles.flagItem}>
            <MaterialIcons
              name={kitchen.premiumFlag ? 'check-circle' : 'cancel'}
              size={20}
              color={kitchen.premiumFlag ? colors.success : colors.gray400}
            />
            <Text style={styles.flagText}>Premium</Text>
          </View>
          <View style={styles.flagItem}>
            <MaterialIcons
              name={kitchen.gourmetFlag ? 'check-circle' : 'cancel'}
              size={20}
              color={kitchen.gourmetFlag ? colors.success : colors.gray400}
            />
            <Text style={styles.flagText}>Gourmet</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderContactInfo = () => (
    <View style={styles.tabContent}>
      {/* Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>
        <Text style={styles.sectionText}>
          {kitchen.address.addressLine1}
          {kitchen.address.addressLine2 && `\n${kitchen.address.addressLine2}`}
          {`\n${kitchen.address.locality}, ${kitchen.address.city}`}
          {kitchen.address.state && `, ${kitchen.address.state}`}
          {`\n${kitchen.address.pincode}`}
        </Text>
        <TouchableOpacity style={styles.mapButton} onPress={handleOpenMap}>
          <MaterialIcons name="map" size={18} color={colors.primary} />
          <Text style={styles.mapButtonText}>Open in Maps</Text>
        </TouchableOpacity>
      </View>

      {/* Contact Info */}
      {kitchen.contactPhone && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Phone</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${kitchen.contactPhone}`)}>
            <Text style={styles.linkText}>{kitchen.contactPhone}</Text>
          </TouchableOpacity>
        </View>
      )}

      {kitchen.contactEmail && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Email</Text>
          <TouchableOpacity onPress={() => Linking.openURL(`mailto:${kitchen.contactEmail}`)}>
            <Text style={styles.linkText}>{kitchen.contactEmail}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Owner Info (for PARTNER kitchens) */}
      {kitchen.type === 'PARTNER' && (
        <>
          {kitchen.ownerName && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Owner Name</Text>
              <Text style={styles.sectionText}>{kitchen.ownerName}</Text>
            </View>
          )}
          {kitchen.ownerPhone && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Owner Phone</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${kitchen.ownerPhone}`)}>
                <Text style={styles.linkText}>{kitchen.ownerPhone}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Coverage */}
      {kitchen.areasServed && kitchen.areasServed.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Areas Served</Text>
          <Text style={styles.sectionText}>
            {kitchen.areasServed.length} area
            {kitchen.areasServed.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );

  const renderOperatingHours = () => (
    <View style={styles.tabContent}>
      {/* Lunch */}
      {kitchen.operatingHours.lunch && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lunch</Text>
          <Text style={styles.sectionText}>
            {kitchen.operatingHours.lunch.startTime} - {kitchen.operatingHours.lunch.endTime}
          </Text>
        </View>
      )}

      {/* Dinner */}
      {kitchen.operatingHours.dinner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dinner</Text>
          <Text style={styles.sectionText}>
            {kitchen.operatingHours.dinner.startTime} - {kitchen.operatingHours.dinner.endTime}
          </Text>
        </View>
      )}

      {/* On Demand */}
      {kitchen.operatingHours.onDemand && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>On Demand</Text>
          {kitchen.operatingHours.onDemand.isAlwaysOpen ? (
            <Text style={styles.sectionText}>Always Open</Text>
          ) : (
            <Text style={styles.sectionText}>
              {kitchen.operatingHours.onDemand.startTime} -{' '}
              {kitchen.operatingHours.onDemand.endTime}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  const renderSystemInfo = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kitchen Code</Text>
        <Text style={styles.sectionText}>{kitchen.code}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Created Date</Text>
        <Text style={styles.sectionText}>{formatDate(kitchen.createdAt)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{kitchen.status}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accepting Orders</Text>
        <View style={styles.flagItem}>
          <MaterialIcons
            name={kitchen.isAcceptingOrders ? 'check-circle' : 'cancel'}
            size={20}
            color={kitchen.isAcceptingOrders ? colors.success : colors.error}
          />
          <Text style={styles.sectionText}>
            {kitchen.isAcceptingOrders ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {kitchen.name}
            </Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{kitchen.type}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={colors.gray700} />
          </TouchableOpacity>
        </View>

        {/* Previously rejected banner */}
        {kitchen.rejectionReason && (
          <View style={styles.rejectedBanner}>
            <View style={styles.rejectedBannerHeader}>
              <MaterialIcons name="error-outline" size={18} color={colors.error} />
              <Text style={styles.rejectedBannerTitle}>
                Previously rejected
                {kitchen.rejectedAt ? ` · ${new Date(kitchen.rejectedAt).toLocaleString()}` : ''}
              </Text>
            </View>
            <Text style={styles.rejectedReasonText}>{kitchen.rejectionReason}</Text>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {renderTab('BASIC', 'Basic Info', 'info')}
            {renderTab('CONTACT', 'Contact', 'contact-page')}
            {renderTab('HOURS', 'Hours', 'schedule')}
            {renderTab('SYSTEM', 'System', 'settings')}
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          {activeTab === 'BASIC' && renderBasicInfo()}
          {activeTab === 'CONTACT' && renderContactInfo()}
          {activeTab === 'HOURS' && renderOperatingHours()}
          {activeTab === 'SYSTEM' && renderSystemInfo()}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.rejectButton} onPress={onReject}>
            <MaterialIcons name="cancel" size={20} color={colors.white} />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.approveButton} onPress={onApprove}>
            <MaterialIcons name="check-circle" size={20} color={colors.white} />
            <Text style={styles.approveButtonText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  rejectedBanner: {
    backgroundColor: colors.error + '12',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.error + '30',
  },
  rejectedBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rejectedBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rejectedReasonText: {
    fontSize: 13,
    color: colors.gray700,
    lineHeight: 18,
  },
  headerContent: {
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 8,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  closeButton: {
    padding: 8,
  },
  tabsContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray600,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: colors.gray700,
    lineHeight: 20,
  },
  imageSection: {
    marginBottom: 24,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  coverImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  cuisinesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cuisineBadge: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cuisineBadgeText: {
    fontSize: 12,
    color: colors.gray700,
    fontWeight: '500',
  },
  flagsContainer: {
    gap: 12,
  },
  flagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flagText: {
    fontSize: 14,
    color: colors.gray700,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  mapButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  linkText: {
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warning + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
  },
  footer: {
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
