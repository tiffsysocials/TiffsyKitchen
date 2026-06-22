/**
 * Subscribers Screen
 *
 * Lists customers who have purchased vouchers (an active subscription plan)
 * along with their plan details. Only ACTIVE subscriptions are shown — once a
 * subscription expires or is cancelled, the customer drops off this list.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { GradientBox } from '../../../components/common/GradientBox';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAlert } from '../../../hooks/useAlert';
import { SubscriptionCard } from '../components/SubscriptionCard';
import { SubscriptionDetailModal } from '../components/SubscriptionDetailModal';
import { CancelSubscriptionModal } from '../components/CancelSubscriptionModal';
import {
  Subscription,
  SubscriptionDetail,
  CancelSubscriptionRequest,
} from '../../../types/subscription.types';
import {
  getAllSubscriptions,
  getSubscriptionById,
  cancelSubscription,
} from '../../../services/subscriptions.service';

const PRIMARY_COLOR = '#FE8733';

interface SubscribersScreenProps {
  onMenuPress?: () => void;
}

export const SubscribersScreen: React.FC<SubscribersScreenProps> = ({ onMenuPress }) => {
  const { showSuccess, showError } = useAlert();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Detail modal state
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionDetail | null>(null);
  const [subscriptionDetailLoading, setSubscriptionDetailLoading] = useState(false);
  const [showSubscriptionDetail, setShowSubscriptionDetail] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Fetch active subscriptions only
  const fetchSubscriptions = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await getAllSubscriptions({ status: 'ACTIVE' });
      setSubscriptions(response.subscriptions);
    } catch (error: any) {
      showError('Error', error.message || 'Failed to load subscribers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Handle subscription card press
  const handleSubscriptionPress = async (subscription: Subscription) => {
    setShowSubscriptionDetail(true);
    setSubscriptionDetailLoading(true);

    try {
      const detail = await getSubscriptionById(subscription._id);
      // The detail endpoint does not populate userId/planId; keep the populated
      // customer + plan from the list item so the modal shows name/phone/plan.
      setSelectedSubscription({
        ...detail,
        userId: subscription.userId,
        planId: subscription.planId,
      });
    } catch (error: any) {
      showError('Error', error.message || 'Failed to load subscription details');
      setShowSubscriptionDetail(false);
    } finally {
      setSubscriptionDetailLoading(false);
    }
  };

  // Handle cancel subscription
  const handleCancelSubscription = async (cancelData: CancelSubscriptionRequest) => {
    if (!selectedSubscription) return;

    try {
      await cancelSubscription(selectedSubscription._id, cancelData);
      showSuccess('Success', 'Subscription cancelled successfully');
      setShowCancelModal(false);
      setShowSubscriptionDetail(false);
      // Cancelled subscription is no longer ACTIVE, so it leaves the list
      fetchSubscriptions();
    } catch (error: any) {
      throw error;
    }
  };

  return (
    <SafeAreaScreen
      topBackgroundColor={PRIMARY_COLOR}
      bottomBackgroundColor="#f9fafb"
      backgroundColor="#f9fafb"
    >
      {/* Header */}
      <GradientBox style={[styles.header, { paddingTop: 8 }]}>
        {onMenuPress && (
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <Icon name="menu" size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Subscribers</Text>
      </GradientBox>

      {/* Content */}
      <View style={styles.content}>
        {!loading && subscriptions.length > 0 && (
          <Text style={styles.countText}>
            {subscriptions.length} active {subscriptions.length === 1 ? 'subscriber' : 'subscribers'}
          </Text>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            <Text style={styles.loadingText}>Loading subscribers...</Text>
          </View>
        ) : subscriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="card-membership" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Active Subscribers</Text>
            <Text style={styles.emptyText}>
              No customers with an active subscription yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={subscriptions}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <SubscriptionCard subscription={item} onPress={() => handleSubscriptionPress(item)} />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchSubscriptions(true)}
                tintColor={PRIMARY_COLOR}
              />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>

      {/* Subscription Detail Modal */}
      <SubscriptionDetailModal
        visible={showSubscriptionDetail}
        onClose={() => {
          setShowSubscriptionDetail(false);
          setSelectedSubscription(null);
        }}
        subscription={selectedSubscription}
        loading={subscriptionDetailLoading}
        onCancel={
          selectedSubscription?.status === 'ACTIVE'
            ? () => setShowCancelModal(true)
            : undefined
        }
      />

      {/* Cancel Subscription Modal */}
      {selectedSubscription && (
        <CancelSubscriptionModal
          visible={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onSubmit={handleCancelSubscription}
          subscriptionName={selectedSubscription.planId.name}
          customerName={selectedSubscription.userId.name}
        />
      )}
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  menuButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
});
