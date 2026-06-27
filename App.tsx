import "./global.css";

import React, { useEffect, useState } from 'react';
import { StatusBar, useColorScheme, View, Text, TouchableOpacity, BackHandler, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ForceUpdateModal from './src/components/ForceUpdateModal';
import { checkForUpdate, UpdateCheckResult } from './src/services/appUpdate.service';
import { checkForOtaUpdate } from './src/services/otaUpdate.service';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PhoneAuthScreen } from './src/screens/admin/PhoneAuthScreen';
import { DashboardScreen } from './src/screens/admin/DashboardScreen';
import { RoleBasedDashboard } from './src/screens/RoleBasedDashboard';
import { RoleBasedOrdersScreen } from './src/screens/RoleBasedOrdersScreen';
import { RoleBasedBatchesScreen } from './src/screens/RoleBasedBatchesScreen';
import OrdersManagementContainer from './src/modules/orders/screens/OrdersManagementContainer';
import { MenuManagementMain } from './src/modules/menu/screens/MenuManagementMain';
import { ZonesManagementScreen } from './src/modules/zones';
import { KitchensManagementScreen } from './src/modules/kitchens/screens';
import { SubscriptionsScreen, SubscribersScreen } from './src/modules/subscriptions';
import { BatchManagementLandingScreen } from './src/modules/kitchens/screens';
import { UsersManagementScreen } from './src/modules/users/screens/UsersManagementScreen';
import { UserDetailAdminScreen } from './src/modules/users/screens/UserDetailAdminScreen';
import { CreateUserModal } from './src/modules/users/components/CreateUserModal';
import { DriversManagementScreen, DriverProfileManagementScreen, DriverOrdersBatchesScreen } from './src/modules/drivers/screens';
import { KitchenApprovalsScreen } from './src/modules/kitchens/screens/KitchenApprovalsScreen';
import { KitchenPendingScreen } from './src/modules/kitchens/screens/KitchenPendingScreen';
import { KitchenRejectionScreen } from './src/modules/kitchens/screens/KitchenRejectionScreen';
import { KitchenDashboardScreen } from './src/modules/kitchens/screens/KitchenDashboardScreen';
import { KitchenProfileScreen } from './src/modules/kitchens/screens/KitchenProfileScreen';
import { NotificationsScreen } from './src/screens/notifications/NotificationsScreen';
import { SendMenuAnnouncementScreen } from './src/screens/kitchen/SendMenuAnnouncementScreen';
import { SendBatchReminderScreen } from './src/screens/admin/SendBatchReminderScreen';
import { SendPushNotificationScreen } from './src/screens/admin/SendPushNotificationScreen';
import { Sidebar } from './src/components/common/Sidebar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NavigationProvider, useNavigation } from './src/context/NavigationContext';
import { InAppNotificationProvider } from './src/context/InAppNotificationContext';
import { AlertProvider } from './src/context/AlertContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from './src/services/auth.service';
import { apiService } from './src/services/api.enhanced.service';
import { fcmService } from './src/services/fcm.service';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { User } from './src/types/api.types';
import { UserRole } from './src/types/user';
import { mapBackendRoleToAppRole } from './src/utils/rbac';
import { PermissionGuard } from './src/components/common/PermissionGuard';
import { NotificationPopup } from './src/components/notifications';
import { useInAppNotifications } from './src/context/InAppNotificationContext';
import {
  DeliverySettingsHubScreen,
  RoutePlanningConfigScreen,
  DriverAssignmentConfigScreen,
  DeliveryActionsScreen,
  BatchMonitoringScreen,
  BatchDetailScreen,
  DeliveryStatsScreen,
  DeliveryManagementScreen,
  OrderAcceptanceConfigScreen,
} from './src/modules/delivery';
import { CronManagementScreen } from './src/modules/cron';
import { OrderChargesScreen } from './src/modules';
import { CouponsManagementScreen } from './src/modules/coupons';
import ReviewsScreen from './src/modules/reviews/screens/ReviewsScreen';
import DeliveryConfigScreen from './src/modules/settings/screens/DeliveryConfigScreen';
import { ReferralManagementScreen } from './src/modules/referrals';
import AutoOrderAddonsScreen from './src/modules/orders/screens/AutoOrderAddonsScreen';
import { BannerManagementScreen } from './src/modules/banners';
import { ServiceZonesScreen } from './src/modules/kitchens/screens/ServiceZonesScreen';
import { KitchenDeliveryZonesScreen } from './src/modules/kitchens/screens/KitchenDeliveryZonesScreen';
import { AuditLogsScreen } from './src/modules';
import { KitchenRegistrationScreen } from './src/screens/admin/KitchenRegistrationScreen';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
    },
  },
});

// Bridges App.tsx auth state into AuthContext: when isAuthenticated/userRole change,
// re-read 'userData' from AsyncStorage so Sidebar (and others) get the fresh user.
const AuthSyncBridge: React.FC<{ isAuthenticated: boolean; userRole: UserRole | null }> = ({ isAuthenticated, userRole }) => {
  const { refreshUser, clearUser } = useAuth();
  useEffect(() => {
    if (isAuthenticated) {
      refreshUser();
    } else {
      clearUser();
    }
  }, [isAuthenticated, userRole]);
  return null;
};

// Handle notification tap navigation
const handleNotificationTapNavigation = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  navigate: (screen: string) => void
) => {
  try {
    const notificationType = remoteMessage.data?.type as string | undefined;
    const screen = remoteMessage.data?.screen;

    console.log('==========================================');
    console.log('🎯 HANDLING NOTIFICATION TAP');
    console.log('==========================================');
    console.log('Type:', notificationType);
    console.log('Order ID:', remoteMessage.data?.orderId);
    console.log('Requested Screen:', screen);

    // Navigate to appropriate screen based on notification type
    if (screen) {
      // Use screen from notification if provided
      navigate(screen as string);
    } else if (notificationType?.includes('ORDER')) {
      // Navigate to Orders screen for order-related notifications
      navigate('Orders');
    } else if (notificationType?.includes('BATCH') || notificationType?.includes('DELIVERY')) {
      // Navigate to Delivery Management screen
      navigate('DeliveryManagement');
    } else {
      // Default to Dashboard
      navigate('Dashboard');
    }

    console.log('✅ Navigation triggered');
  } catch (error) {
    console.error('Error handling notification tap:', error);
  }
};

// Placeholder component for unimplemented screens
const PlaceholderScreen: React.FC<{
  title: string;
  onMenuPress: () => void;
}> = ({ title, onMenuPress }) => (
  <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
    {/* Header */}
    <View style={{ backgroundColor: '#FE8733', padding: 16, flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity onPress={onMenuPress} style={{ marginRight: 16 }}>
        <Icon name="menu" size={24} color="#ffffff" />
      </TouchableOpacity>
      <Text style={{ fontSize: 20, fontWeight: '600', color: '#ffffff' }}>
        {title}
      </Text>
    </View>

    {/* Content */}
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 16, color: '#6b7280' }}>
        Coming soon...
      </Text>
    </View>
  </View>
);

// Authenticated Content Wrapper with Notifications
const AuthenticatedContent: React.FC<{
  onMenuPress: () => void;
  onLogout: () => void;
  sidebarVisible: boolean;
  onCloseSidebar: () => void;
}> = ({ onMenuPress, onLogout, sidebarVisible, onCloseSidebar }) => {
  return (
    <InAppNotificationProvider>
      <MainContent onMenuPress={onMenuPress} onLogout={onLogout} />
      <Sidebar visible={sidebarVisible} onClose={onCloseSidebar} onLogout={onLogout} />
      <NotificationPopupWrapper />
    </InAppNotificationProvider>
  );
};

// Notification Popup Wrapper Component
const NotificationPopupWrapper: React.FC = () => {
  const { navigate } = useNavigation();
  const { popupNotification, hidePopup, markAsRead } = useInAppNotifications();

  const handleNotificationPopupDismiss = async () => {
    if (popupNotification && !popupNotification.isRead) {
      await markAsRead(popupNotification._id);
    }
    hidePopup();
  };

  const handleNotificationPopupView = async () => {
    if (popupNotification && !popupNotification.isRead) {
      await markAsRead(popupNotification._id);
    }
    hidePopup();
    navigate('Notifications');
  };

  return (
    <NotificationPopup
      notification={popupNotification}
      visible={!!popupNotification}
      onDismiss={handleNotificationPopupDismiss}
      onView={handleNotificationPopupView}
    />
  );
};

// Main Content Router Component
const MainContent: React.FC<{
  onMenuPress: () => void;
  onLogout: () => void;
}> = ({ onMenuPress, onLogout }) => {
  const { currentScreen, goBack, navigate } = useNavigation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const { checkLatestNotification } = useInAppNotifications();

  // Handle notification icon press
  const onNotificationPress = () => {
    navigate('Notifications');
  };

  // Check for latest notification on app open
  useEffect(() => {
    checkLatestNotification();
  }, []);

  // Setup notification tap handlers
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupHandlers = async () => {
      try {
        // Handle notification tap when app was closed
        const initialNotification = await fcmService.getInitialNotification();
        if (initialNotification) {
          console.log('📬 App opened from notification (closed state)');
          console.log('Notification type:', initialNotification.data?.type);
          console.log('Order ID:', initialNotification.data?.orderId);
          handleNotificationTapNavigation(initialNotification, navigate);
        }

        // Handle notification tap when app is in background
        unsubscribe = fcmService.setupNotificationOpenListener((remoteMessage) => {
          console.log('📬 App opened from notification (background state)');
          console.log('Notification type:', remoteMessage.data?.type);
          console.log('Order ID:', remoteMessage.data?.orderId);
          handleNotificationTapNavigation(remoteMessage, navigate);
        });
      } catch (error) {
        console.error('Error setting up notification handlers:', error);
      }
    };

    setupHandlers();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigate]);

  useEffect(() => {
    const backAction = () => {
      if (currentScreen === 'Users' && selectedUserId) {
        setSelectedUserId(null);
        return true;
      }
      if (currentScreen === 'BatchDetail' && selectedBatchId) {
        setSelectedBatchId(null);
        goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [currentScreen, selectedUserId, selectedBatchId]);

  const handleUserPress = (user: User) => {
    setSelectedUserId(user._id);
  };

  const handleBackFromUserDetail = () => {
    setSelectedUserId(null);
  };

  const handleCreateUserPress = () => {
    setShowCreateUserModal(true);
  };

  const handleCreateUserSuccess = () => {
    setShowCreateUserModal(false);
    // Refresh users list by toggling state
  };

  // If viewing user details
  if (currentScreen === 'Users' && selectedUserId) {
    return (
      <UserDetailAdminScreen
        userId={selectedUserId}
        onBack={handleBackFromUserDetail}
      />
    );
  }

  switch (currentScreen) {
    case 'Dashboard':
      return <RoleBasedDashboard onMenuPress={onMenuPress} onNotificationPress={onNotificationPress} onLogout={onLogout} />;

    case 'Orders':
      return <RoleBasedOrdersScreen onMenuPress={onMenuPress} />;

    case 'Users':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} screenName="Users" onMenuPress={onMenuPress}>
          <UsersManagementScreen
            onMenuPress={onMenuPress}
            onUserPress={handleUserPress}
            onCreateUserPress={handleCreateUserPress}
          />
          <CreateUserModal
            visible={showCreateUserModal}
            onClose={() => setShowCreateUserModal(false)}
            onSuccess={handleCreateUserSuccess}
          />
        </PermissionGuard>
      );

    case 'Kitchens':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} screenName="Kitchens" onMenuPress={onMenuPress}>
          <KitchensManagementScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'Zones':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} screenName="Zones" onMenuPress={onMenuPress}>
          <ZonesManagementScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'MenuManagement':
      return <MenuManagementMain onMenuPress={onMenuPress} />;

    case 'Subscriptions':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} screenName="Subscriptions" onMenuPress={onMenuPress}>
          <SubscriptionsScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'Subscribers':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} screenName="Subscribers" onMenuPress={onMenuPress}>
          <SubscribersScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'DriverApprovals':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} screenName="DriverApprovals" onMenuPress={onMenuPress}>
          <DriversManagementScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'DriverProfileManagement':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} onMenuPress={onMenuPress}>
          <DriverProfileManagementScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'DriverOrdersBatches':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} onMenuPress={onMenuPress}>
          <DriverOrdersBatchesScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'KitchenApprovals':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} screenName="KitchenApprovals" onMenuPress={onMenuPress}>
          <KitchenApprovalsScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'KitchenPending':
      return <KitchenPendingScreen onMenuPress={onMenuPress} />;

    case 'KitchenRejected':
      return <KitchenRejectionScreen onMenuPress={onMenuPress} />;

    case 'KitchenDashboard':
      return <KitchenDashboardScreen onMenuPress={onMenuPress} />;

    case 'KitchenProfile':
      return <KitchenProfileScreen onMenuPress={onMenuPress} />;

    case 'DeliveryManagement':
      return <DeliveryManagementScreen onMenuPress={onMenuPress} />;

    case 'BatchManagement':
      return (
        <RoleBasedBatchesScreen
          onMenuPress={onMenuPress}
          onBatchSelect={(batchId) => {
            setSelectedBatchId(batchId);
            navigate('BatchDetail');
          }}
        />
      );

    case 'Notifications':
      return <NotificationsScreen />;

    case 'AuditLogs':
      return <AuditLogsScreen />;

    case 'SendMenuAnnouncement':
      return (
        <PermissionGuard requiredRoles={['KITCHEN_STAFF']} screenName="SendMenuAnnouncement" onMenuPress={onMenuPress}>
          <SendMenuAnnouncementScreen />
        </PermissionGuard>
      );

    case 'SendBatchReminder':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} screenName="SendBatchReminder" onMenuPress={onMenuPress}>
          <SendBatchReminderScreen />
        </PermissionGuard>
      );

    case 'SendPushNotification':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} screenName="SendPushNotification" onMenuPress={onMenuPress}>
          <SendPushNotificationScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'DeliverySettingsHub':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} onMenuPress={onMenuPress}>
          <DeliverySettingsHubScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'RoutePlanningConfig':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} onMenuPress={onMenuPress}>
          <RoutePlanningConfigScreen />
        </PermissionGuard>
      );

    case 'DriverAssignmentConfig':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} onMenuPress={onMenuPress}>
          <DriverAssignmentConfigScreen />
        </PermissionGuard>
      );

    case 'OrderAcceptanceConfig':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} onMenuPress={onMenuPress}>
          <OrderAcceptanceConfigScreen />
        </PermissionGuard>
      );

    case 'DeliveryConfig':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} onMenuPress={onMenuPress}>
          <DeliveryConfigScreen />
        </PermissionGuard>
      );

    case 'DeliveryActions':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} onMenuPress={onMenuPress}>
          <DeliveryActionsScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'BatchMonitoring':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} onMenuPress={onMenuPress}>
          <BatchMonitoringScreen
            onMenuPress={onMenuPress}
            onBatchSelect={(batchId) => {
              setSelectedBatchId(batchId);
              navigate('BatchDetail');
            }}
          />
        </PermissionGuard>
      );

    case 'BatchDetail':
      return (
        <PermissionGuard requiredRoles={['ADMIN', 'KITCHEN_STAFF']} onMenuPress={onMenuPress}>
          <BatchDetailScreen
            batchId={selectedBatchId!}
            onBack={() => {
              setSelectedBatchId(null);
              goBack();
            }}
          />
        </PermissionGuard>
      );

    case 'DeliveryStats':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} onMenuPress={onMenuPress}>
          <DeliveryStatsScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'CronManagement':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} onMenuPress={onMenuPress}>
          <CronManagementScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'OrderCharges':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} onMenuPress={onMenuPress}>
          <OrderChargesScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'Coupons':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} screenName="Coupons" onMenuPress={onMenuPress}>
          <CouponsManagementScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'Reviews':
      return (
        <PermissionGuard requiredRoles={['ADMIN', 'KITCHEN_STAFF']} screenName="Reviews" onMenuPress={onMenuPress}>
          <ReviewsScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'Referrals':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} screenName="Referrals" onMenuPress={onMenuPress}>
          <ReferralManagementScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'AutoOrderAddons':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} screenName="AutoOrderAddons" onMenuPress={onMenuPress}>
          <AutoOrderAddonsScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'Banners':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} screenName="Banners" onMenuPress={onMenuPress}>
          <BannerManagementScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'ServiceZones':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} screenName="ServiceZones" onMenuPress={onMenuPress}>
          <ServiceZonesScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    case 'KitchenDeliveryZones':
      return (
        <PermissionGuard requiredRoles={['ADMIN']} screenName="KitchenDeliveryZones" onMenuPress={onMenuPress}>
          <KitchenDeliveryZonesScreen onMenuPress={onMenuPress} />
        </PermissionGuard>
      );

    default:
      return <RoleBasedDashboard onMenuPress={onMenuPress} onNotificationPress={onNotificationPress} onLogout={onLogout} />;
  }
};

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [registrationToken, setRegistrationToken] = useState<string | null>(null);
  const [registrationPhone, setRegistrationPhone] = useState<string>('');
  const [kitchenApprovalStatus, setKitchenApprovalStatus] = useState<string | null>(null);

  // Force/soft update gate. Fail-open: a backend error leaves the app usable.
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [softDismissed, setSoftDismissed] = useState(false);

  const runUpdateCheck = async () => {
    try {
      const result = await checkForUpdate();
      setUpdateInfo(result);
      if (result.status === 'required') setSoftDismissed(false);
    } catch (err: any) {
      console.log('[App] update check failed (non-blocking):', err?.message);
    }
  };

  useEffect(() => {
    runUpdateCheck();
    // OTA JS-bundle check (silent; applies on next launch). Fail-open.
    checkForOtaUpdate();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') runUpdateCheck();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('========== APP.TSX: CHECKING AUTH ==========');

      const token = await AsyncStorage.getItem('authToken');
      console.log('Auth Token exists:', token ? 'YES' : 'NO');

      const storedRole = await AsyncStorage.getItem('userRole');
      console.log('User Role:', storedRole);

      const storedApprovalStatus = await AsyncStorage.getItem('kitchenApprovalStatus');
      setKitchenApprovalStatus(storedApprovalStatus);

      // Authenticate if token exists and user has a valid role (ADMIN or KITCHEN_STAFF)
      const hasValidRole = storedRole === 'ADMIN' || storedRole === 'KITCHEN_STAFF';
      const isValidUser = !!token && hasValidRole;
      console.log('Is Valid User:', isValidUser);
      console.log('Has Valid Role:', hasValidRole);

      if (token && !hasValidRole) {
        console.log('⚠️  Token exists but role is invalid. Clearing data...');
        await authService.clearAdminData();
        setIsAuthenticated(false);
        setUserRole(null);
      } else {
        setIsAuthenticated(isValidUser);
        setUserRole(storedRole as UserRole | null);

        // Initialize FCM if authenticated
        if (isValidUser) {
          console.log('Initializing FCM service...');
          await fcmService.initialize();
        }
      }

      console.log('============================================');
    } catch (error) {
      console.error('Error checking auth:', error);
      setIsAuthenticated(false);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationComplete = async (data: { token: string; user: any; role: string; isNewUser: boolean; kitchenApprovalStatus?: string; phone: string }) => {
    console.log('========== APP.TSX: OTP VERIFIED ==========');
    console.log('Token Received:', data.token ? 'YES' : 'NO');
    console.log('Is New User:', data.isNewUser);
    console.log('User Role:', data.role);
    console.log('===========================================');

    try {
      // New user → route to kitchen self-registration
      if (data.isNewUser) {
        console.log('New user detected - routing to kitchen registration');
        await authService.clearAdminData();
        setRegistrationPhone(data.phone);
        setRegistrationToken(data.token);
        setIsAuthenticated(false);
        return;
      }

      const backendUser = data.user;
      if (!backendUser || !data.token) {
        console.error('No user data or token in verify response');
        await authService.clearAdminData();
        setIsAuthenticated(false);
        return;
      }

      // Store auth token
      await AsyncStorage.setItem('authToken', data.token);
      await apiService.login(data.token);

      // Map backend user to app user format
      const userProfile = {
        id: backendUser._id,
        phone: backendUser.phone,
        email: backendUser.email || '',
        firstName: backendUser.name?.split(' ')[0] || 'User',
        lastName: backendUser.name?.split(' ').slice(1).join(' ') || '',
        fullName: backendUser.name || 'User',
        role: backendUser.role,
        status: backendUser.status,
        isActive: backendUser.isActive,
        isVerified: backendUser.isVerified,
        kitchenId: backendUser.kitchenId,
        createdAt: backendUser.createdAt,
        updatedAt: backendUser.updatedAt,
      };

      console.log('========== USER PROFILE MAPPED ==========');
      console.log('User ID:', userProfile.id);
      console.log('User Name:', userProfile.fullName);
      console.log('User Role (Backend):', userProfile.role);
      console.log('Kitchen ID:', userProfile.kitchenId || 'N/A');
      console.log('=========================================');

      // Map backend role to app role
      const appRole = mapBackendRoleToAppRole(userProfile.role);
      console.log('Mapped App Role:', appRole);

      if (!appRole) {
        console.error('Invalid role received from backend:', userProfile.role);
        await authService.clearAdminData();
        throw new Error('Invalid user role');
      }

      // Track kitchen approval status for KITCHEN_STAFF (controls default screen routing)
      if (appRole === 'KITCHEN_STAFF' && data.kitchenApprovalStatus) {
        await AsyncStorage.setItem('kitchenApprovalStatus', data.kitchenApprovalStatus);
        setKitchenApprovalStatus(data.kitchenApprovalStatus);
      } else {
        await AsyncStorage.removeItem('kitchenApprovalStatus');
        setKitchenApprovalStatus(null);
      }

      // Store user role and data
      await AsyncStorage.setItem('userRole', appRole);
      setUserRole(appRole);
      await AsyncStorage.setItem('userData', JSON.stringify(userProfile));

      const phoneNumber = await AsyncStorage.getItem('userPhoneNumber');
      if (phoneNumber) {
        await AsyncStorage.setItem('adminPhone', phoneNumber);
      }

      console.log('User authenticated successfully with role:', appRole);

      // Initialize FCM and register token
      console.log('Initializing FCM service...');
      await fcmService.initialize();

      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error during authentication:', error);
      await authService.clearAdminData();
      setIsAuthenticated(false);
      setUserRole(null);
    }
  };

  const handleRegistrationComplete = async (data: { kitchen: any; user: any; token: string; approvalStatus: string }) => {
    try {
      console.log('========== KITCHEN REGISTRATION COMPLETE ==========');
      console.log('Kitchen Code:', data.kitchen?.code);
      console.log('Approval Status:', data.approvalStatus);
      console.log('===================================================');

      await AsyncStorage.setItem('authToken', data.token);
      await apiService.login(data.token);
      await AsyncStorage.setItem('userRole', 'KITCHEN_STAFF');
      await AsyncStorage.setItem('kitchenApprovalStatus', data.approvalStatus);
      await AsyncStorage.setItem('userPhoneNumber', registrationPhone);
      await AsyncStorage.setItem('adminPhone', registrationPhone);

      const userProfile = {
        id: data.user._id,
        phone: data.user.phone,
        email: data.user.email || '',
        firstName: data.user.name?.split(' ')[0] || 'User',
        lastName: data.user.name?.split(' ').slice(1).join(' ') || '',
        fullName: data.user.name || 'User',
        role: data.user.role,
        status: data.user.status,
        kitchenId: data.user.kitchenId,
      };
      await AsyncStorage.setItem('userData', JSON.stringify(userProfile));

      await fcmService.initialize();

      setUserRole('KITCHEN_STAFF');
      setKitchenApprovalStatus(data.approvalStatus);
      setRegistrationToken(null);
      setRegistrationPhone('');
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error finalizing kitchen registration:', error);
      await authService.clearAdminData();
      setRegistrationToken(null);
      setIsAuthenticated(false);
    }
  };

  const handleCancelRegistration = async () => {
    await authService.clearAdminData();
    setRegistrationToken(null);
    setRegistrationPhone('');
    setIsAuthenticated(false);
  };

  const handleLogout = async () => {
    console.log('========== APP.TSX: LOGOUT ==========');
    console.log('Clearing all admin data...');

    // Remove FCM token before logout
    console.log('Removing FCM token...');
    await fcmService.removeToken();
    fcmService.cleanup();

    // Clear all admin data using auth service
    await authService.clearAdminData();

    console.log('Admin data cleared');
    console.log('Resetting authentication state...');
    console.log('=====================================');

    setIsAuthenticated(false);
    setUserRole(null);
    setKitchenApprovalStatus(null);
    setSidebarVisible(false);
  };

  const handleMenuPress = () => {
    setSidebarVisible(true);
  };

  const handleCloseSidebar = () => {
    setSidebarVisible(false);
  };

  if (loading) {
    return null;
  }

  console.log('========== APP.TSX RENDER ==========');
  console.log('isAuthenticated:', isAuthenticated);
  console.log('Current Screen:', isAuthenticated ? 'DASHBOARD' : 'PHONE_AUTH');
  console.log('====================================');

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AlertProvider>
          <AuthProvider>
            <AuthSyncBridge isAuthenticated={isAuthenticated} userRole={userRole} />
            <NavigationProvider userRole={userRole} kitchenApprovalStatus={kitchenApprovalStatus as any}>
              <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
              {isAuthenticated ? (
                <AuthenticatedContent
                  onMenuPress={handleMenuPress}
                  onLogout={handleLogout}
                  sidebarVisible={sidebarVisible}
                  onCloseSidebar={handleCloseSidebar}
                />
              ) : registrationToken ? (
                <KitchenRegistrationScreen
                  registrationToken={registrationToken}
                  phoneNumber={registrationPhone}
                  onRegistrationComplete={handleRegistrationComplete}
                  onCancel={handleCancelRegistration}
                />
              ) : (
                <PhoneAuthScreen onVerificationComplete={handleVerificationComplete} />
              )}
            </NavigationProvider>
          </AuthProvider>
        </AlertProvider>
      </QueryClientProvider>
      {updateInfo &&
        updateInfo.status !== 'none' &&
        !(updateInfo.status === 'available' && softDismissed) && (
          <ForceUpdateModal
            visible
            mode={updateInfo.status === 'required' ? 'required' : 'available'}
            message={updateInfo.message}
            storeUrl={updateInfo.storeUrl}
            onDismiss={() => setSoftDismissed(true)}
          />
        )}
    </SafeAreaProvider>
  );
}

export default App;
