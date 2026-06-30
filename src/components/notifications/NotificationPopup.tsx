import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { InAppNotification } from '../../services/notification.service';
import { colors } from '../../theme';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPopupProps {
  notification: InAppNotification | null;
  visible: boolean;
  onDismiss: () => void;
  onView: () => void;
}

export const NotificationPopup: React.FC<NotificationPopupProps> = ({
  notification,
  visible,
  onDismiss,
  onView,
}) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!notification) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MENU_UPDATE':
        return { name: 'restaurant-menu', color: colors.info };
      case 'ORDER_STATUS_CHANGE':
        return { name: 'inventory', color: colors.success };
      case 'VOUCHER_EXPIRY_REMINDER':
        return { name: 'card-giftcard', color: colors.warning };
      case 'NEW_ORDER':
      case 'NEW_MANUAL_ORDER':
      case 'NEW_AUTO_ORDER':
        return { name: 'add-shopping-cart', color: colors.warning };
      case 'BATCH_REMINDER':
        return { name: 'schedule', color: colors.error };
      case 'BATCH_READY':
        return { name: 'local-shipping', color: colors.success };
      case 'ADMIN_PUSH':
        return { name: 'campaign', color: colors.primary };
      default:
        return { name: 'notifications', color: colors.gray600 };
    }
  };

  const icon = getNotificationIcon(notification.type);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onDismiss}>
      <Pressable
        className="flex-1 bg-black/50 justify-start px-4"
        style={{ paddingTop: insets.top + 8 }}
        onPress={onDismiss}
        accessibilityLabel="Close notification"
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="flex-row items-start p-4">
              {/* Icon */}
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${icon.color}20` }}
              >
                <Icon name={icon.name} size={24} color={icon.color} />
              </View>

              {/* Content */}
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  {notification.title}
                </Text>
                <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
                  {notification.body}
                </Text>
                <Text className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </Text>
              </View>

              {/* Close button */}
              <TouchableOpacity
                onPress={onDismiss}
                className="ml-2"
                accessibilityLabel="Dismiss notification"
              >
                <Icon name="close" size={20} color={colors.gray400} />
              </TouchableOpacity>
            </View>

            {/* Action buttons */}
            <View className="flex-row border-t border-gray-200">
              <TouchableOpacity
                onPress={onDismiss}
                className="flex-1 py-3 items-center border-r border-gray-200"
                accessibilityLabel="Dismiss"
              >
                <Text className="text-sm font-medium text-gray-600">Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onView}
                className="flex-1 py-3 items-center"
                accessibilityLabel="View notification"
              >
                <Text className="text-sm font-medium" style={{ color: colors.primary }}>
                  View
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};
