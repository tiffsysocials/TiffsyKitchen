/**
 * Kitchen Stack Navigator
 *
 * Handles navigation within Kitchen module:
 * - Kitchen Orders List
 * - Order Details
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import KitchenOrdersScreen from '../modules/orders/screens/KitchenOrdersScreen';
import OrderDetailAdminScreen from '../modules/orders/screens/OrderDetailAdminScreen';

export type KitchenStackParamList = {
  KitchenOrdersList: undefined;
  OrderDetail: { orderId: string };
};

const Stack = createStackNavigator<KitchenStackParamList>();

// Wrapper component to provide navigation and menu handler
function KitchenOrdersScreenWrapper(props: any) {
  const navigation = useNavigation();

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.toggleDrawer());
  };

  return (
    <KitchenOrdersScreen
      {...props}
      onMenuPress={handleMenuPress}
      navigation={props.navigation}
    />
  );
}

export default function KitchenNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Kitchen Orders Screen has its own header
      }}
    >
      <Stack.Screen
        name="KitchenOrdersList"
        component={KitchenOrdersScreenWrapper}
        options={{ title: 'Kitchen Orders' }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailAdminScreen}
        options={{
          headerShown: true,
          title: 'Order Details',
          headerStyle: {
            backgroundColor: '#FD9E2F',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
    </Stack.Navigator>
  );
}
