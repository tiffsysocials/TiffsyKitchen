// Read-only map modal showing a single pin at an order's delivery location.
// Opened from the Delivery Address section of the order details screen.
//
// NOTE: uses useSafeAreaInsets() + a plain View (NOT the native <SafeAreaView>
// from react-native-safe-area-context) — the native SafeAreaView component
// SIGSEGVs when mounted inside a Modal on the New Architecture (Fabric).

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';

interface OrderLocationMapModalProps {
  visible: boolean;
  coordinates: { latitude: number; longitude: number };
  addressLabel?: string;
  onClose: () => void;
}

export const OrderLocationMapModal: React.FC<OrderLocationMapModalProps> = ({
  visible,
  coordinates,
  addressLabel,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  const region: Region = {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const openInGoogleMaps = () => {
    const query = `${coordinates.latitude},${coordinates.longitude}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Location</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Map */}
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={region}>
          <Marker coordinate={coordinates} title="Delivery Address" pinColor={colors.primary} />
        </MapView>

        {/* Bottom card: address + open-in-maps */}
        <View style={[styles.bottomCard, { paddingBottom: spacing.lg + insets.bottom }]}>
          {!!addressLabel && (
            <View style={styles.addressRow}>
              <MaterialIcons name="location-on" size={20} color={colors.primary} />
              <Text style={styles.addressText} numberOfLines={3}>
                {addressLabel}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.mapsButton}
            onPress={openInGoogleMaps}
            activeOpacity={0.85}>
            <MaterialIcons name="directions" size={20} color="#FFFFFF" />
            <Text style={styles.mapsButtonText}>Open in Google Maps</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  map: {
    flex: 1,
  },
  bottomCard: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadiusMd,
    paddingVertical: spacing.md,
  },
  mapsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
