import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { Platform, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api.enhanced.service';
import DeviceInfo from 'react-native-device-info';
import { createNotificationChannels, displayNotification, requestNotificationPermission } from './notificationChannels.service';

const FCM_TOKEN_KEY = 'fcm_token';
const DEVICE_ID_KEY = 'device_id';

export interface FCMTokenRegistration {
  fcmToken: string;
  deviceType: 'ANDROID' | 'IOS';
  deviceId: string;
  appVersion?: string;
  appType?: 'consumer' | 'driver' | 'kitchen';
}

export interface NotificationData {
  type?: string;
  orderId?: string;
  orderNumber?: string;
  kitchenId?: string;
  mealWindow?: string;
  screen?: string;
  [key: string]: any;
}

export interface InAppNotification {
  title: string;
  body: string;
  data?: NotificationData;
}

class FCMService {
  private unsubscribeTokenRefresh: (() => void) | null = null;
  private unsubscribeForeground: (() => void) | null = null;
  private onNotificationCallback: ((notification: InAppNotification) => void) | null = null;

  /**
   * Get FCM token
   */
  async getToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      console.log('FCM: Token retrieved:', token.substring(0, 20) + '...');
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      return token;
    } catch (error) {
      console.error('FCM: Error getting token:', error);
      return null;
    }
  }

  /**
   * Generate or retrieve device ID
   */
  async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('FCM: Error getting device ID:', error);
      return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }
  }

  /**
   * Register FCM token with backend
   */
  async registerToken(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) {
        console.log('FCM: No token available for registration');
        return false;
      }

      const deviceId = await this.getDeviceId();
      const deviceType = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';

      let appVersion: string | undefined;
      try {
        appVersion = DeviceInfo.getVersion();
      } catch {
        appVersion = undefined;
      }

      const payload: FCMTokenRegistration = {
        fcmToken: token,
        deviceType,
        deviceId,
        appVersion,
        appType: 'kitchen',
      };

      console.log('==========================================');
      console.log('📝 FCM: REGISTERING TOKEN WITH BACKEND');
      console.log('==========================================');
      console.log('Device Type:', deviceType);
      console.log('Device ID:', deviceId);
      console.log('Token (first 30 chars):', token.substring(0, 30) + '...');

      const response = await apiService.post('/api/auth/fcm-token', payload);

      if (response.success) {
        console.log('✅ FCM: TOKEN REGISTERED SUCCESSFULLY');
        return true;
      } else {
        console.error('❌ FCM: TOKEN REGISTRATION FAILED:', response.message);
        return false;
      }
    } catch (error: any) {
      console.error('FCM: Error registering token:', error?.message);
      return false;
    }
  }

  /**
   * Remove FCM token from backend
   */
  async removeToken(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      if (!token) {
        console.log('FCM: No token to remove');
        return true;
      }

      console.log('FCM: Removing token from backend...');
      const response = await apiService.delete(`/api/auth/fcm-token?fcmToken=${encodeURIComponent(token)}`);

      await AsyncStorage.removeItem(FCM_TOKEN_KEY);
      return response.success || true;
    } catch (error: any) {
      console.error('FCM: Error removing token:', error?.message);
      await AsyncStorage.removeItem(FCM_TOKEN_KEY);
      return true;
    }
  }

  /**
   * Setup foreground notification listener
   */
  setupForegroundListener(callback: (notification: InAppNotification) => void): void {
    this.onNotificationCallback = callback;

    this.unsubscribeForeground = messaging().onMessage(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.log('==========================================');
        console.log('🔔 FOREGROUND NOTIFICATION RECEIVED');
        console.log('==========================================');
        console.log('Title:', remoteMessage.notification?.title);
        console.log('Body:', remoteMessage.notification?.body);
        console.log('Type:', remoteMessage.data?.type);

        const title = remoteMessage.notification?.title || 'Notification';
        const body = remoteMessage.notification?.body || '';
        const notificationType = remoteMessage.data?.type as string | undefined;

        // Display notification using notifee
        try {
          await displayNotification(title, body, remoteMessage.data || {}, notificationType);
        } catch (error) {
          console.error('FCM: Error displaying notification:', error);
        }

        // Trigger vibration
        try {
          Vibration.vibrate([0, 300, 250, 300]);
        } catch (error) {
          console.error('FCM: Error triggering vibration:', error);
        }

        // Pass to in-app callback
        if (remoteMessage.notification && this.onNotificationCallback) {
          this.onNotificationCallback({
            title,
            body,
            data: remoteMessage.data as NotificationData,
          });
        }
      }
    );
  }

  /**
   * Setup background notification handler
   */
  setupBackgroundHandler(): void {
    messaging().setBackgroundMessageHandler(
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.log('==========================================');
        console.log('🔔 BACKGROUND NOTIFICATION RECEIVED');
        console.log('==========================================');
        console.log('Title:', remoteMessage.notification?.title);
        console.log('Body:', remoteMessage.notification?.body);
        console.log('Type:', remoteMessage.data?.type);

        try {
          const title = remoteMessage.notification?.title || 'Notification';
          const body = remoteMessage.notification?.body || '';
          const notificationType = remoteMessage.data?.type as string | undefined;

          // Display notification using notifee
          await displayNotification(title, body, remoteMessage.data || {}, notificationType);

          console.log('✅ Background notification displayed');

          // Trigger vibration
          try {
            Vibration.vibrate([0, 300, 250, 300]);
          } catch (vibrationError) {
            console.error('FCM: Error triggering vibration:', vibrationError);
          }
        } catch (error) {
          console.error('❌ Error displaying background notification:', error);
        }
      }
    );
  }

  /**
   * Setup token refresh listener
   */
  setupTokenRefreshListener(): void {
    this.unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
      console.log('FCM: Token refreshed');
      await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
      await this.registerToken();
    });
  }

  /**
   * Initialize FCM service
   */
  async initialize(): Promise<void> {
    try {
      console.log('==========================================');
      console.log('🚀 FCM: INITIALIZING SERVICE...');
      console.log('==========================================');

      // Step 1: Request notification permission (native Android)
      console.log('Step 1: Requesting notification permission...');
      const hasPermission = await requestNotificationPermission();

      if (!hasPermission) {
        console.warn('⚠️ Notification permission NOT granted');
        console.warn('User needs to enable notifications in settings');
      }

      // Step 2: Setup notification channels (notifee)
      console.log('Step 2: Setting up notification channels...');
      await createNotificationChannels();

      // Step 3: Setup background handler
      console.log('Step 3: Setting up background handler...');
      this.setupBackgroundHandler();

      // Step 4: Setup token refresh listener
      console.log('Step 4: Setting up token refresh listener...');
      this.setupTokenRefreshListener();

      // Step 5: Register token with backend
      console.log('Step 5: Registering FCM token...');
      await this.registerToken();

      console.log('==========================================');
      console.log('✅ FCM: SERVICE INITIALIZED');
      console.log('Permission:', hasPermission ? 'GRANTED' : 'DENIED');
      console.log('==========================================');
    } catch (error) {
      console.error('❌ FCM: ERROR INITIALIZING:', error);
    }
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (this.unsubscribeTokenRefresh) {
      this.unsubscribeTokenRefresh();
      this.unsubscribeTokenRefresh = null;
    }
    if (this.unsubscribeForeground) {
      this.unsubscribeForeground();
      this.unsubscribeForeground = null;
    }
    this.onNotificationCallback = null;
  }

  /**
   * Get initial notification (app opened from notification)
   */
  async getInitialNotification(): Promise<FirebaseMessagingTypes.RemoteMessage | null> {
    try {
      return await messaging().getInitialNotification();
    } catch (error) {
      console.error('FCM: Error getting initial notification:', error);
      return null;
    }
  }

  /**
   * Setup notification open listener
   */
  setupNotificationOpenListener(
    callback: (notification: FirebaseMessagingTypes.RemoteMessage) => void
  ): () => void {
    return messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('FCM: Notification opened app');
      callback(remoteMessage);
    });
  }
}

export const fcmService = new FCMService();
