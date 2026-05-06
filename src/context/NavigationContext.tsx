import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { UserRole } from '../types/user';
import { getDefaultScreenForRole } from '../utils/rbac';

type KitchenApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | null | undefined;

const resolveDefaultScreen = (role: UserRole | null, kitchenApprovalStatus?: KitchenApprovalStatus): ScreenName => {
  if (role === 'KITCHEN_STAFF') {
    if (kitchenApprovalStatus === 'PENDING') return 'KitchenPending';
    if (kitchenApprovalStatus === 'REJECTED') return 'KitchenRejected';
  }
  return getDefaultScreenForRole(role);
};

export type ScreenName =
  | 'Dashboard'
  | 'Orders'
  | 'Kitchens'
  | 'KitchenApprovals'
  | 'KitchenPending'
  | 'KitchenRejected'
  | 'KitchenDashboard'
  | 'KitchenProfile'
  | 'Zones'
  | 'MenuManagement'
  | 'Subscriptions'
  | 'Users'
  | 'DriverApprovals'
  | 'DriverProfileManagement'
  | 'DriverOrdersBatches'
  | 'Reports'
  | 'AuditLogs'
  | 'SystemConfig'
  | 'DeliveryConfig'
  | 'BatchManagement'
  | 'Notifications'
  | 'SendMenuAnnouncement'
  | 'SendBatchReminder'
  | 'SendPushNotification'
  | 'DeliverySettingsHub'
  | 'RoutePlanningConfig'
  | 'DriverAssignmentConfig'
  | 'GeofencingConfig'
  | 'DeliveryActions'
  | 'DeliveryManagement'
  | 'BatchMonitoring'
  | 'BatchDetail'
  | 'DeliveryStats'
  | 'CronManagement'
  | 'OrderCharges'
  | 'AutoOrderAddons'
  | 'Coupons'
  | 'Referrals'
  | 'Banners';

interface NavigationContextType {
  currentScreen: ScreenName;
  navigate: (screen: ScreenName) => void;
  goBack: () => void;
  screenHistory: ScreenName[];
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode; userRole?: UserRole | null; kitchenApprovalStatus?: KitchenApprovalStatus }> = ({ children, userRole, kitchenApprovalStatus }) => {
  // Initialize with role-based default screen (kitchen approval status overrides for KITCHEN_STAFF)
  const initialScreen = resolveDefaultScreen(userRole || null, kitchenApprovalStatus);
  const [currentScreen, setCurrentScreen] = useState<ScreenName>(initialScreen);
  const [screenHistory, setScreenHistory] = useState<ScreenName[]>([initialScreen]);

  const navigate = (screen: ScreenName) => {
    // Avoid pushing the same screen multiple times consecutively
    setScreenHistory(prev => {
      if (prev[prev.length - 1] === screen) return prev;
      return [...prev, screen];
    });
    setCurrentScreen(screen);
  };

  const goBack = () => {
    if (screenHistory.length > 1) {
      const newHistory = [...screenHistory];
      newHistory.pop();
      const previousScreen = newHistory[newHistory.length - 1];
      setScreenHistory(newHistory);
      setCurrentScreen(previousScreen);
      return true;
    }
    return false;
  };

  // Update default screen when user role or kitchen approval status changes (e.g., after login)
  useEffect(() => {
    const defaultScreen = resolveDefaultScreen(userRole || null, kitchenApprovalStatus);
    setCurrentScreen(defaultScreen);
    setScreenHistory([defaultScreen]);
  }, [userRole, kitchenApprovalStatus]);

  useEffect(() => {
    const backAction = () => {
      return goBack();
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [screenHistory]);

  return (
    <NavigationContext.Provider
      value={{
        currentScreen,
        navigate,
        goBack,
        screenHistory,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
