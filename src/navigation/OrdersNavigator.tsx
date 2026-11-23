/**
 * Orders Stack Navigator
 *
 * Handles navigation within Orders module:
 * - Orders List
 * - Order Details
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { OrdersStackParamList } from './types';
import OrdersScreenAdmin from '../modules/orders/screens/OrdersScreenAdmin';
import OrderDetailAdminScreen from '../modules/orders/screens/OrderDetailAdminScreen';

const Stack = createStackNavigator<OrdersStackParamList>();

export default function OrdersNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true, // Show headers
        gestureEnabled: true,
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="OrdersList"
        component={OrdersScreenAdmin}
        options={{ title: 'Orders Management' }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailAdminScreen}
        options={{ title: 'Order Details' }}
      />
    </Stack.Navigator>
  );
}
