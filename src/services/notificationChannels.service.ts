import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';

export const NOTIFICATION_CHANNELS = {
  KITCHEN: 'kitchen_channel',
  DELIVERY: 'delivery_channel',
  GENERAL: 'general_channel',
} as const;

/**
 * Request notification permission using native Android PermissionsAndroid
 * This handles Android 13+ (API 33+) permission requests
 * Returns true if permission is granted, false otherwise
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    console.log('==========================================');
    console.log('🔐 REQUESTING NOTIFICATION PERMISSION');
    console.log('==========================================');
    console.log('Platform:', Platform.OS);

    if (Platform.OS === 'android') {
      const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10);

      if (androidVersion >= 33) {
        console.log('Android 13+ detected, requesting POST_NOTIFICATIONS permission...');

        const permissionStatus = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'TiffsyKitchen needs notification permission to send you important updates about orders and deliveries.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          }
        );

        const isGranted = permissionStatus === PermissionsAndroid.RESULTS.GRANTED;

        if (isGranted) {
          console.log('==========================================');
          console.log('✅ NOTIFICATION PERMISSION GRANTED!');
          console.log('==========================================');
        } else {
          console.log('==========================================');
          console.log('❌ NOTIFICATION PERMISSION DENIED');
          console.log('Permission Status:', permissionStatus);
          console.log('==========================================');
        }

        return isGranted;
      } else {
        // Android < 13 doesn't require runtime permission
        console.log('✅ Android < 13 - no runtime permission needed');
        return true;
      }
    } else {
      // iOS - notifee handles this
      const settings = await notifee.requestPermission();
      const isGranted = settings.authorizationStatus >= 1; // AUTHORIZED or PROVISIONAL
      console.log('iOS permission granted:', isGranted);
      return isGranted;
    }
  } catch (error) {
    console.error('==========================================');
    console.error('❌ Error requesting notification permission:', error);
    console.error('==========================================');
    return false;
  }
};

/**
 * Check current notification permission status
 * Returns the current authorization status without requesting permission
 */
export const checkNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10);

      if (androidVersion >= 33) {
        const status = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        console.log('Current notification permission:', status ? 'GRANTED' : 'DENIED');
        return status;
      }
      return true; // Android < 13
    } else {
      const settings = await notifee.getNotificationSettings();
      const isGranted = settings.authorizationStatus >= 1;
      console.log('Current notification permission:', isGranted ? 'GRANTED' : 'DENIED');
      return isGranted;
    }
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
};

/**
 * Create notification channels for Android using notifee
 * Must be called on app startup before any notifications are received
 * Channel IDs must match backend CHANNEL_MAPPING in notification.service.js
 */
export const createNotificationChannels = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    console.log('Notification channels not needed for iOS');
    return;
  }

  try {
    console.log('==========================================');
    console.log('📢 Creating notification channels...');
    console.log('==========================================');

    // Kitchen Channel - For new orders and kitchen updates
    await notifee.createChannel({
      id: NOTIFICATION_CHANNELS.KITCHEN,
      name: 'Kitchen Orders',
      description: 'Notifications for new orders and kitchen updates',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      vibrationPattern: [300, 500],
      badge: true,
      visibility: AndroidVisibility.PUBLIC,
      lights: true,
      lightColor: '#F56B4C',
    });
    console.log('✅ Created channel:', NOTIFICATION_CHANNELS.KITCHEN);

    // Delivery Channel - For batch and delivery notifications
    await notifee.createChannel({
      id: NOTIFICATION_CHANNELS.DELIVERY,
      name: 'Delivery Updates',
      description: 'Notifications for batch assignments and delivery updates',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      vibrationPattern: [300, 500],
      badge: true,
      visibility: AndroidVisibility.PUBLIC,
      lights: true,
      lightColor: '#4CAF50',
    });
    console.log('✅ Created channel:', NOTIFICATION_CHANNELS.DELIVERY);

    // General Channel - For general notifications
    await notifee.createChannel({
      id: NOTIFICATION_CHANNELS.GENERAL,
      name: 'General',
      description: 'General app notifications',
      importance: AndroidImportance.DEFAULT,
      sound: 'default',
      vibration: true,
      badge: true,
      visibility: AndroidVisibility.PUBLIC,
    });
    console.log('✅ Created channel:', NOTIFICATION_CHANNELS.GENERAL);

    // Default channel - Fallback
    await notifee.createChannel({
      id: 'default_channel',
      name: 'Default',
      description: 'Default notification channel',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      badge: true,
      visibility: AndroidVisibility.PUBLIC,
    });
    console.log('✅ Created channel: default_channel');

    console.log('==========================================');
    console.log('✅ All notification channels created!');
    console.log('==========================================');
  } catch (error) {
    console.error('❌ Error creating notification channels:', error);
  }
};

/**
 * Get the appropriate channel ID based on notification type
 */
export const getChannelForNotificationType = (type?: string): string => {
  if (!type) return NOTIFICATION_CHANNELS.GENERAL;

  switch (type.toUpperCase()) {
    case 'NEW_ORDER':
    case 'NEW_AUTO_ORDER':
    case 'NEW_MANUAL_ORDER':
    case 'NEW_AUTO_ACCEPTED_ORDER':
    case 'ORDER_ACCEPTED':
    case 'ORDER_REJECTED':
    case 'ORDER_PREPARING':
    case 'ORDER_READY':
    case 'ORDER_CANCELLED':
    case 'ORDER_STATUS_UPDATE':
      return NOTIFICATION_CHANNELS.KITCHEN;

    case 'BATCH_DISPATCHED':
    case 'BATCH_READY':
    case 'BATCH_ASSIGNED':
    case 'DELIVERY_ASSIGNED':
    case 'DELIVERY_STARTED':
    case 'DELIVERY_COMPLETED':
    case 'DELIVERY_FAILED':
      return NOTIFICATION_CHANNELS.DELIVERY;

    default:
      return NOTIFICATION_CHANNELS.GENERAL;
  }
};

/**
 * Display a notification using notifee
 * Used for foreground notifications
 */
export const displayNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>,
  type?: string
): Promise<void> => {
  try {
    const channelId = getChannelForNotificationType(type);

    await notifee.displayNotification({
      title,
      body,
      data: data || {},
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
        sound: 'default',
        showTimestamp: true,
        smallIcon: 'ic_launcher',
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
      },
    });

    console.log('✅ Notification displayed on channel:', channelId);
  } catch (error) {
    console.error('❌ Error displaying notification:', error);
  }
};
