/**
 * Role-Based Access Control (RBAC) Utility
 *
 * This module defines permissions and access control for different user roles
 * in the Tiffsy Kitchen Admin App.
 */

import { UserRole } from '../types/user';
import { ScreenName } from '../context/NavigationContext';

// Menu group definitions
export type MenuGroup = 'Kitchen' | 'Delivery' | 'Drivers' | 'System';

export interface MenuGroupConfig {
  label: string;
  icon: string;
}

export const MENU_GROUP_CONFIG: Record<MenuGroup, MenuGroupConfig> = {
  Kitchen: { label: 'Kitchen', icon: 'restaurant' },
  Delivery: { label: 'Delivery', icon: 'local-shipping' },
  Drivers: { label: 'Drivers', icon: 'directions-car' },
  System: { label: 'System', icon: 'settings' },
};

// Define menu items structure
export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  screen: ScreenName;
  roles: UserRole[]; // Which roles can access this screen
  group?: MenuGroup; // Optional group — ungrouped items show at top level
}

// All menu items with their role permissions
export const ALL_MENU_ITEMS: MenuItem[] = [
  // --- Top-level (no group) ---
  {
    id: '1',
    label: 'Dashboard',
    icon: 'dashboard',
    screen: 'Dashboard',
    roles: ['ADMIN', 'KITCHEN_STAFF'],
  },
  {
    id: '2',
    label: 'Orders',
    icon: 'inventory-2',
    screen: 'Orders',
    roles: ['ADMIN', 'KITCHEN_STAFF'],
  },

  // --- Kitchen group ---
  {
    id: '4',
    label: 'Menu',
    icon: 'restaurant-menu',
    screen: 'MenuManagement',
    roles: ['ADMIN', 'KITCHEN_STAFF'],
    group: 'Kitchen',
  },
  {
    id: '5',
    label: 'Kitchen Profile',
    icon: 'store',
    screen: 'KitchenProfile',
    roles: ['KITCHEN_STAFF'],
    group: 'Kitchen',
  },
  {
    id: '9',
    label: 'Kitchen Management',
    icon: 'store',
    screen: 'Kitchens',
    roles: ['ADMIN'],
    group: 'Kitchen',
  },
  {
    id: '10',
    label: 'Kitchen Approvals',
    icon: 'approval',
    screen: 'KitchenApprovals',
    roles: ['ADMIN'],
    group: 'Kitchen',
  },

  // --- Delivery group ---
  {
    id: '3',
    label: 'Delivery Management',
    icon: 'local-shipping',
    screen: 'DeliveryManagement',
    roles: ['ADMIN', 'KITCHEN_STAFF'],
    group: 'Delivery',
  },
  {
    id: '14',
    label: 'Delivery Settings',
    icon: 'settings',
    screen: 'DeliverySettingsHub',
    roles: ['ADMIN'],
    group: 'Delivery',
  },
  {
    id: '16',
    label: 'Batch Monitoring',
    icon: 'monitor',
    screen: 'BatchMonitoring',
    roles: ['ADMIN'],
    group: 'Delivery',
  },
  {
    id: '17',
    label: 'Delivery Stats',
    icon: 'bar-chart',
    screen: 'DeliveryStats',
    roles: ['ADMIN'],
    group: 'Delivery',
  },

  // --- Drivers group ---
  {
    id: '11',
    label: 'Driver Approvals',
    icon: 'directions-car',
    screen: 'DriverApprovals',
    roles: ['ADMIN'],
    group: 'Drivers',
  },
  {
    id: '12',
    label: 'Driver Management',
    icon: 'account-box',
    screen: 'DriverProfileManagement',
    roles: ['ADMIN'],
    group: 'Drivers',
  },
  {
    id: '13',
    label: 'Driver Orders',
    icon: 'local-shipping',
    screen: 'DriverOrdersBatches',
    roles: ['ADMIN'],
    group: 'Drivers',
  },

  // --- System group ---
  {
    id: '6',
    label: 'Zones',
    icon: 'location-on',
    screen: 'Zones',
    roles: ['ADMIN'],
    group: 'System',
  },
  {
    id: '7',
    label: 'Users',
    icon: 'people',
    screen: 'Users',
    roles: ['ADMIN'],
    group: 'System',
  },
  {
    id: '8',
    label: 'Plans',
    icon: 'credit-card',
    screen: 'Subscriptions',
    roles: ['ADMIN'],
    group: 'System',
  },
  {
    id: '21',
    label: 'Auto-Order Add-ons',
    icon: 'add-shopping-cart',
    screen: 'AutoOrderAddons',
    roles: ['ADMIN'],
    group: 'System',
  },
  {
    id: '18',
    label: 'Cron Jobs',
    icon: 'schedule',
    screen: 'CronManagement',
    roles: ['ADMIN'],
    group: 'System',
  },
  {
    id: '19',
    label: 'Push Notifications',
    icon: 'notifications',
    screen: 'SendPushNotification',
    roles: ['ADMIN'],
    group: 'System',
  },
  {
    id: '20',
    label: 'Order Charges',
    icon: 'attach-money',
    screen: 'OrderCharges',
    roles: ['ADMIN'],
    group: 'System',
  },
  {
    id: '22',
    label: 'Coupons',
    icon: 'local-offer',
    screen: 'Coupons',
    roles: ['ADMIN'],
    group: 'System',
  },
  {
    id: '23',
    label: 'Referrals',
    icon: 'card-giftcard',
    screen: 'Referrals',
    roles: ['ADMIN'],
    group: 'System',
  },
  {
    id: '24',
    label: 'Banners',
    icon: 'view-carousel',
    screen: 'Banners',
    roles: ['ADMIN'],
    group: 'System',
  },
];

/**
 * Get menu items accessible by a specific role
 */
export const getMenuItemsForRole = (role: UserRole | null): MenuItem[] => {
  if (!role) return [];

  return ALL_MENU_ITEMS.filter(item => item.roles.includes(role));
};

/**
 * Check if a user role has permission to access a screen
 */
export const canAccessScreen = (role: UserRole | null, screen: ScreenName): boolean => {
  if (!role) return false;

  const menuItem = ALL_MENU_ITEMS.find(item => item.screen === screen);
  return menuItem ? menuItem.roles.includes(role) : false;
};

/**
 * Get the default screen for a role
 */
export const getDefaultScreenForRole = (role: UserRole | null): ScreenName => {
  if (!role) return 'Dashboard';

  // Kitchen staff should default to Orders screen
  if (role === 'KITCHEN_STAFF') {
    return 'Orders';
  }

  // For other roles, use the first accessible screen
  const menuItems = getMenuItemsForRole(role);
  return menuItems.length > 0 ? menuItems[0].screen : 'Dashboard';
};

/**
 * Check if role is admin
 */
export const isAdmin = (role: UserRole | null): boolean => {
  return role === 'ADMIN';
};

/**
 * Check if role is kitchen staff
 */
export const isKitchenStaff = (role: UserRole | null): boolean => {
  return role === 'KITCHEN_STAFF';
};

/**
 * Get appropriate API endpoint based on role
 */
export const getDashboardEndpoint = (role: UserRole | null): string => {
  if (role === 'ADMIN') {
    return '/api/admin/dashboard';
  } else if (role === 'KITCHEN_STAFF') {
    return '/api/kitchens/dashboard';
  }
  return '/api/admin/dashboard'; // Fallback (will fail if not authorized)
};

/**
 * Get appropriate orders endpoint based on role
 */
export const getOrdersEndpoint = (role: UserRole | null): string => {
  if (role === 'ADMIN') {
    return '/api/orders/admin/all';
  } else if (role === 'KITCHEN_STAFF') {
    return '/api/orders/kitchen';
  }
  return '/api/orders/kitchen'; // Fallback
};

/**
 * Get appropriate batches endpoint based on role
 */
export const getBatchesEndpoint = (role: UserRole | null): string => {
  if (role === 'ADMIN') {
    return '/api/delivery/admin/batches';
  } else if (role === 'KITCHEN_STAFF') {
    return '/api/delivery/kitchen-batches';
  }
  return '/api/delivery/kitchen-batches'; // Fallback
};

/**
 * Map backend role strings to app UserRole type
 */
export const mapBackendRoleToAppRole = (backendRole: string): UserRole | null => {
  const roleMap: Record<string, UserRole> = {
    'ADMIN': 'ADMIN',
    'admin': 'ADMIN',
    'KITCHEN_STAFF': 'KITCHEN_STAFF',
    'kitchen_staff': 'KITCHEN_STAFF',
    'DRIVER': 'DRIVER',
    'driver': 'DRIVER',
    'CUSTOMER': 'CUSTOMER',
    'customer': 'CUSTOMER',
  };

  return roleMap[backendRole] || null;
};
