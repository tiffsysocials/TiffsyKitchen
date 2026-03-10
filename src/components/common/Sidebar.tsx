import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useNavigation, ScreenName } from '../../context/NavigationContext';
import {
  getMenuItemsForRole,
  MenuItem as RBACMenuItem,
  MenuGroup,
  MENU_GROUP_CONFIG,
} from '../../utils/rbac';
import { UserRole } from '../../types/user';
import { kitchenStaffService } from '../../services/kitchen-staff.service';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

const GROUP_ORDER: MenuGroup[] = ['Kitchen', 'Delivery', 'Drivers', 'System'];

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  onLogout?: () => void | Promise<void>;
}

// Single menu item row
const MenuItemRow: React.FC<{
  item: RBACMenuItem;
  isActive: boolean;
  indented?: boolean;
  onPress: (screen: ScreenName) => void;
}> = ({ item, isActive, indented, onPress }) => (
  <TouchableOpacity
    onPress={() => onPress(item.screen)}
    className={`flex-row items-center ${isActive ? 'bg-[#FFF7F5]' : ''}`}
    style={indented
      ? { paddingLeft: 16, paddingRight: 24, paddingVertical: 10 }
      : { paddingHorizontal: 16, paddingVertical: 12 }
    }
  >
    <Icon
      name={item.icon}
      size={indented ? 20 : 24}
      color={isActive ? '#F56B4C' : '#6b7280'}
      style={{ marginRight: 14 }}
    />
    <Text
      className={`${indented ? 'text-sm' : 'text-base'} ${
        isActive ? 'text-[#F56B4C] font-semibold' : 'text-gray-700'
      }`}
    >
      {item.label}
    </Text>
    {isActive && (
      <View className="absolute right-0 w-1 h-8 bg-[#F56B4C] rounded-l-full" />
    )}
  </TouchableOpacity>
);

// Collapsible group section
const CollapsibleGroup: React.FC<{
  group: MenuGroup;
  items: RBACMenuItem[];
  currentScreen: ScreenName;
  expanded: boolean;
  onToggle: () => void;
  onItemPress: (screen: ScreenName) => void;
}> = ({ group, items, currentScreen, expanded, onToggle, onItemPress }) => {
  const config = MENU_GROUP_CONFIG[group];
  const hasActiveChild = items.some((item) => item.screen === currentScreen);
  const rotateAnim = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View>
      {/* Group header */}
      <TouchableOpacity
        onPress={onToggle}
        className={`flex-row items-center px-4 py-3 ${hasActiveChild && !expanded ? 'bg-[#FFF7F5]' : ''}`}
        activeOpacity={0.7}
      >
        <Icon
          name={config.icon}
          size={24}
          color={hasActiveChild ? '#F56B4C' : '#374151'}
          style={{ marginRight: 14 }}
        />
        <Text
          className={`text-base flex-1 ${
            hasActiveChild ? 'text-[#F56B4C] font-semibold' : 'text-gray-800 font-medium'
          }`}
        >
          {config.label}
        </Text>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Icon name="expand-more" size={22} color="#9ca3af" />
        </Animated.View>
      </TouchableOpacity>

      {/* Group items */}
      {expanded && (
        <View style={{ marginLeft: 20, borderLeftWidth: 2, borderLeftColor: '#e5e7eb' }}>
          {items.map((item) => (
            <MenuItemRow
              key={item.id}
              item={item}
              isActive={currentScreen === item.screen}
              indented
              onPress={onItemPress}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  visible,
  onClose,
  onLogout,
}) => {
  const insets = useSafeAreaInsets();
  const { user, logout: authLogout } = useAuth();
  const { currentScreen, navigate } = useNavigation();
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [menuItems, setMenuItems] = useState<RBACMenuItem[]>([]);
  const [kitchenName, setKitchenName] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<MenuGroup>>(new Set());

  // Derive top-level items and grouped items
  const topLevelItems = menuItems.filter((item) => !item.group);
  const groupedItems = GROUP_ORDER.map((group) => ({
    group,
    items: menuItems.filter((item) => item.group === group),
  })).filter((g) => g.items.length > 0);

  // Auto-expand the group that contains the current screen
  useEffect(() => {
    const activeItem = menuItems.find((item) => item.screen === currentScreen);
    if (activeItem?.group) {
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        next.add(activeItem.group!);
        return next;
      });
    }
  }, [currentScreen, menuItems]);

  // Load user role from AsyncStorage and get menu items
  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const role = await AsyncStorage.getItem('userRole');

        if (role) {
          setUserRole(role as UserRole);
          const items = getMenuItemsForRole(role as UserRole);
          setMenuItems(items);

          // Fetch kitchen name for kitchen staff
          if (role === 'KITCHEN_STAFF') {
            try {
              const response = await kitchenStaffService.getMyKitchenStatus();
              if (response?.data?.kitchen?.name) {
                setKitchenName(response.data.kitchen.name);
              }
            } catch (error) {
              console.error('Error fetching kitchen name:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error loading user role:', error);
      }
    };

    loadUserRole();
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleLogout = async () => {
    onClose();
    if (onLogout) {
      await onLogout();
    } else {
      await authLogout();
    }
  };

  const handleMenuPress = useCallback((screen: ScreenName) => {
    navigate(screen);
    onClose();
  }, [navigate, onClose]);

  const toggleGroup = useCallback((group: MenuGroup) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1 flex-row">
        {/* Sidebar */}
        <Animated.View
          style={[
            {
              width: SIDEBAR_WIDTH,
              transform: [{ translateX: slideAnim }],
            },
          ]}
          className="bg-white h-full shadow-2xl"
        >
          {/* User Profile Section */}
          <View className="bg-[#F56B4C] px-4 pb-5" style={{ paddingTop: insets.top + 20 }}>
            <Text className="text-white font-bold text-lg">
              {user?.fullName || 'User'}
            </Text>
            <Text className="text-orange-50 text-sm opacity-90">
              {userRole === 'ADMIN'
                ? 'Administrator'
                : userRole === 'KITCHEN_STAFF'
                ? kitchenName || 'Kitchen Staff'
                : userRole === 'DRIVER'
                ? 'Driver'
                : 'User'}
            </Text>
          </View>

          {/* Menu Items */}
          <ScrollView className="flex-1">
            <View className="py-1">
              {/* Top-level items (Dashboard, Orders) */}
              {topLevelItems.map((item) => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  isActive={currentScreen === item.screen}
                  onPress={handleMenuPress}
                />
              ))}

              {/* Separator */}
              {topLevelItems.length > 0 && groupedItems.length > 0 && (
                <View className="mx-4 my-1 border-b border-gray-200" />
              )}

              {/* Collapsible groups */}
              {groupedItems.map(({ group, items }) => (
                <CollapsibleGroup
                  key={group}
                  group={group}
                  items={items}
                  currentScreen={currentScreen}
                  expanded={expandedGroups.has(group)}
                  onToggle={() => toggleGroup(group)}
                  onItemPress={handleMenuPress}
                />
              ))}
            </View>
          </ScrollView>

          {/* Logout Button */}
          <View className="border-t border-gray-200 px-4 py-3" style={{ paddingBottom: insets.bottom + 14 }}>
            <TouchableOpacity
              onPress={handleLogout}
              className="flex-row items-center py-2"
            >
              <Icon name="logout" size={24} color="#F56B4C" style={{ marginRight: 14 }} />
              <Text className="text-red-500 font-medium text-base">Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Overlay */}
        <Pressable
          onPress={onClose}
          className="flex-1 bg-black/50"
        />
      </View>
    </Modal>
  );
};
