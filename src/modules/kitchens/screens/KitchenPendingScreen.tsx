import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../theme/colors';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { Header } from '../../../components/common/Header';
import { kitchenStaffService } from '../../../services/kitchen-staff.service';
import { useNavigation } from '../../../context/NavigationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface KitchenPendingScreenProps {
  onMenuPress: () => void;
}

export const KitchenPendingScreen: React.FC<KitchenPendingScreenProps> = ({
  onMenuPress,
}) => {
  const { navigate } = useNavigation();

  // Fetch kitchen status with automatic polling every 30 seconds
  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ['myKitchenStatus'],
    queryFn: () => kitchenStaffService.getMyKitchenStatus(),
    refetchInterval: 30000, // Poll every 30 seconds
  });

  useEffect(() => {
    if (error) {
      console.error('Failed to fetch kitchen status:', error);
    }
  }, [error]);

  // React to status changes (React Query v5 removed onSuccess callback)
  useEffect(() => {
    if (!data?.data) return;
    const status = data.data.kitchen?.status;
    const rejectionReason = data.data.rejectionReason;

    if (status === 'ACTIVE') {
      AsyncStorage.setItem('kitchenApprovalStatus', 'APPROVED').catch(() => {});
      Alert.alert(
        'Approved!',
        'Your kitchen application has been approved. Welcome aboard!',
        [{ text: 'Continue', onPress: () => navigate('KitchenDashboard') }],
      );
    } else if (rejectionReason) {
      AsyncStorage.setItem('kitchenApprovalStatus', 'REJECTED').catch(() => {});
      navigate('KitchenRejected');
    }
  }, [data, navigate]);

  const kitchen = data?.data?.kitchen;
  const submittedDate = kitchen?.createdAt
    ? new Date(kitchen.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const handleContactSupport = () => {
    const email = 'support@tiffsy.com';
    const subject = encodeURIComponent('Kitchen Application Support');
    const body = encodeURIComponent(
      `Kitchen Name: ${kitchen?.name || 'N/A'}\nApplication Status: Pending Approval\n\nQuery: `
    );
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const handleRefreshStatus = () => {
    refetch();
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
            <MaterialIcons name="hourglass-empty" size={64} color={colors.warning} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Application Under Review</Text>

        {/* Description */}
        <Text style={styles.description}>
          Your kitchen registration is being reviewed by our admin team. We'll notify you once the
          review is complete.
        </Text>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialIcons name="store" size={20} color={colors.gray600} />
            <Text style={styles.infoLabel}>Kitchen Name:</Text>
            <Text style={styles.infoValue}>{kitchen?.name || 'N/A'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialIcons name="calendar-today" size={20} color={colors.gray600} />
            <Text style={styles.infoLabel}>Submitted:</Text>
            <Text style={styles.infoValue}>{submittedDate}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <MaterialIcons name="pending" size={20} color={colors.warning} />
            <Text style={styles.infoLabel}>Status:</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>PENDING APPROVAL</Text>
            </View>
          </View>
        </View>

        {/* Review Timeline */}
        <View style={styles.timelineCard}>
          <MaterialIcons name="info-outline" size={24} color={colors.info} />
          <Text style={styles.timelineTitle}>What happens next?</Text>
          <Text style={styles.timelineText}>
            1. Our team reviews your application{'\n'}
            2. We verify your documents and details{'\n'}
            3. You receive approval or feedback{'\n'}
            4. Once approved, you can start accepting orders
          </Text>
          <Text style={styles.timelineNote}>
            ⏱️ Review usually takes 24-48 hours
          </Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleRefreshStatus}
          disabled={isFetching}
        >
          {isFetching ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <MaterialIcons name="refresh" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>Refresh Status</Text>
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

        {/* Auto-refresh indicator */}
        <Text style={styles.autoRefreshText}>
          🔄 Status updates automatically every 30 seconds
        </Text>
      </ScrollView>
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
    backgroundColor: '#FFF7ED', // Orange/yellow light background
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
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: 8,
  },
  timelineCard: {
    width: '100%',
    backgroundColor: '#EFF6FF', // Light blue background
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray900,
    marginTop: 8,
    marginBottom: 12,
  },
  timelineText: {
    fontSize: 14,
    color: colors.gray700,
    lineHeight: 24,
    marginBottom: 12,
  },
  timelineNote: {
    fontSize: 14,
    color: colors.info,
    fontWeight: '500',
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
  autoRefreshText: {
    fontSize: 12,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
});
