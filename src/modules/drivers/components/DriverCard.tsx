import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../theme/colors';
import type { DriverCardProps } from '../../../types/driver.types';

const getVehicleIcon = (vehicleType?: string) => {
  switch (vehicleType) {
    case 'BIKE':
      return 'motorcycle';
    case 'SCOOTER':
      return 'moped';
    case 'BICYCLE':
      return 'pedal-bike';
    default:
      return 'two-wheeler';
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return colors.warning;
    case 'APPROVED':
      return colors.success;
    case 'REJECTED':
      return colors.error;
    default:
      return colors.gray500;
  }
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

export const DriverCard: React.FC<DriverCardProps> = ({ driver, onPress }) => {
  const statusColor = getStatusColor(driver.approvalStatus);
  const initials = getInitials(driver.name);
  const avatarColor = getAvatarColor(driver.name);

  // Check if it's a valid image (not empty, not placeholder)
  const isPlaceholder = driver.profileImage?.includes('placeholder') || driver.profileImage?.includes('example.com');
  const hasValidImage = !!(driver.profileImage && driver.profileImage.trim() !== '' && !isPlaceholder);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(driver)}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {hasValidImage ? (
            <Image source={{ uri: driver.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
        </View>

        {/* Driver Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{driver.name}</Text>
          <Text style={styles.phone}>{driver.phone}</Text>

          {/* Vehicle Info */}
          {driver.driverDetails?.vehicleName && (
            <View style={styles.vehicleRow}>
              <MaterialIcons
                name={getVehicleIcon(driver.driverDetails.vehicleType)}
                size={16}
                color={colors.gray600}
              />
              <Text style={styles.vehicleText} numberOfLines={1}>
                {driver.driverDetails.vehicleName}
                {driver.driverDetails.vehicleNumber &&
                  ` • ${driver.driverDetails.vehicleNumber}`}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {driver.approvalStatus}
          </Text>
        </View>

        {/* Registration Date */}
        <Text style={styles.dateText}>{formatDate(driver.createdAt)}</Text>

        {/* Chevron */}
        <MaterialIcons name="chevron-right" size={24} color={colors.gray400} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    marginTop: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: colors.gray600,
    marginBottom: 6,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleText: {
    fontSize: 13,
    color: colors.gray600,
    flex: 1,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: colors.gray500,
  },
});
