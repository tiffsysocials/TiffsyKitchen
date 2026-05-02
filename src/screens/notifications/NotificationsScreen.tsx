import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../components/common/SafeAreaScreen';
import { Header } from '../../components/common/Header';
import { NotificationListItem, NotificationDetailModal } from '../../components/notifications';
import { useInAppNotifications } from '../../context/InAppNotificationContext';
import { InAppNotification } from '../../services/notification.service';
import { colors } from '../../theme';
import { useNavigation } from '../../context/NavigationContext';

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    notifications,
    isLoading,
    isLoadingMore,
    hasMore,
    currentPage,
    fetchNotifications,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useInAppNotifications();

  const [selectedNotification, setSelectedNotification] = useState<InAppNotification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchNotifications(1, false);
  }, []);

  const handleNotificationPress = async (notification: InAppNotification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);

    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchNotifications(currentPage + 1, true);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return null;
    }

    return (
      <View className="flex-1 items-center justify-center py-12">
        <Icon name="notifications-none" size={64} color={colors.gray300} />
        <Text className="text-gray-500 text-base mt-4">No notifications yet</Text>
        <Text className="text-gray-400 text-sm mt-2 text-center px-8">
          You'll receive notifications about orders, menus, and updates here
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View className="py-4">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const hasUnreadNotifications = notifications.some((n) => !n.isRead);

  return (
    <SafeAreaScreen topBackgroundColor={colors.primary}>
      <Header
        title="Notifications"
        showBack
        onBackPress={() => navigation.goBack()}
        rightComponent={
          hasUnreadNotifications ? (
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              className="flex-row items-center"
              accessibilityLabel="Mark all as read"
            >
              <Icon name="done-all" size={20} color={colors.primary} />
              <Text className="ml-1 text-sm font-medium" style={{ color: colors.primary }}>
                Mark all read
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <NotificationListItem
            notification={item}
            onPress={() => handleNotificationPress(item)}
            onDelete={() => handleDelete(item._id)}
          />
        )}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshNotifications}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={notifications.length === 0 ? { flex: 1 } : undefined}
      />

      {/* Notification Detail Modal */}
      {selectedNotification && showDetailModal && (
        <NotificationDetailModal
          notification={selectedNotification}
          visible={showDetailModal}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </SafeAreaScreen>
  );
};
