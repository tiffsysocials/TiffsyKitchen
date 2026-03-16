import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { UserRole } from '../types/user';
import { getDefaultScreenForRole } from '../utils/rbac';

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

export const NavigationProvider: React.FC<{ children: ReactNode; userRole?: UserRole | null }> = ({ children, userRole }) => {
  // Initialize with role-based default screen
  const initialScreen = getDefaultScreenForRole(userRole || null);
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

  // Update default screen when user role changes (e.g., after login)
  useEffect(() => {
    const defaultScreen = getDefaultScreenForRole(userRole || null);
    setCurrentScreen(defaultScreen);
    setScreenHistory([defaultScreen]);
  }, [userRole]);

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
