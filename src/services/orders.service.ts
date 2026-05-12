/**
 * Orders Service
 *
 * Handles all API operations related to orders management
 */

import { apiService } from './api.service';
import {
  Order,
  OrderListResponse,
  OrderStatistics,
  OrderStatus,
  PaginationParams,
} from '../types/api.types';

export interface GetOrdersParams extends PaginationParams {
  status?: OrderStatus;
  orderSource?: 'DIRECT' | 'SCHEDULED' | 'AUTO_ORDER';
  kitchenId?: string;
  zoneId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  menuType?: 'MEAL_MENU' | 'ON_DEMAND_MENU';
}

export interface UpdateOrderStatusParams {
  status: OrderStatus;
  notes?: string;
}

class OrdersService {
  /**
   * Get paginated list of orders with optional filters
   */
  async getOrders(params?: GetOrdersParams): Promise<OrderListResponse> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const queryString = queryParams.toString();
    const endpoint = `/api/orders/admin/all${queryString ? `?${queryString}` : ''}`;

    console.log('🔍 [OrdersService] Fetching orders from:', endpoint);

    const response = await apiService.get<{
      success: boolean;
      message: string;
      data: OrderListResponse;
      error: null;
    }>(endpoint);

    console.log('📦 [OrdersService] Orders received:', response.data?.orders?.length || 0);

    // Log first few orders to check population status
    if (response.data?.orders?.length > 0) {
      const firstOrder = response.data.orders[0];
      console.log('🔍 [OrdersService] Sample order kitchenId check:', {
        orderNumber: firstOrder.orderNumber,
        kitchenIdType: typeof firstOrder.kitchenId,
        isPopulated: typeof firstOrder.kitchenId === 'object' && firstOrder.kitchenId !== null,
        kitchenName: typeof firstOrder.kitchenId === 'object' && firstOrder.kitchenId !== null
          ? (firstOrder.kitchenId as any).name
          : 'NOT POPULATED'
      });
    }

    // Backend now consistently returns data in 'data' field
    return response.data;
  }

  /**
   * Get a single order by ID
   * API Call: GET /api/orders/:id
   */
  async getOrderById(orderId: string): Promise<Order> {
    const response = await apiService.get<any>(`/api/orders/${orderId}`);

    // Backend quirk: actual order data is in response.error.order
    let orderData = null;

    if (response.error?.order) {
      orderData = response.error.order;
    } else if (response.data?.order) {
      orderData = response.data.order;
    } else if (response.data && typeof response.data === 'object' && response.data._id) {
      orderData = response.data;
    } else if (response.order) {
      orderData = response.order;
    } else if (response.error && typeof response.error === 'object' && response.error._id) {
      orderData = response.error;
    } else {
      throw new Error('Invalid order response structure');
    }

    return orderData;
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(): Promise<OrderStatistics> {
    const response = await apiService.get<{
      success: boolean;
      message: string;
      data: any;
      error: null;
    }>('/api/orders/admin/stats');

    // Backend now consistently returns data in 'data' field
    const statsData = response.data;

    // Transform the backend response to match our OrderStatistics interface
    return {
      today: {
        total: statsData.totalOrders || 0,
        placed: statsData.byStatus?.PLACED || 0,
        accepted: statsData.byStatus?.ACCEPTED || 0,
        preparing: statsData.byStatus?.PREPARING || 0,
        ready: statsData.byStatus?.READY || 0,
        pickedUp: statsData.byStatus?.PICKED_UP || 0,
        outForDelivery: statsData.byStatus?.OUT_FOR_DELIVERY || 0,
        delivered: statsData.byStatus?.DELIVERED || 0,
        cancelled: statsData.byStatus?.CANCELLED || 0,
        rejected: statsData.byStatus?.REJECTED || 0,
      },
      byMenuType: {
        MEAL_MENU: statsData.byMenuType?.MEAL_MENU || 0,
        ON_DEMAND_MENU: statsData.byMenuType?.ON_DEMAND_MENU || 0,
      },
      byMealWindow: {
        LUNCH: statsData.byMealWindow?.LUNCH || 0,
        DINNER: statsData.byMealWindow?.DINNER || 0,
      },
      revenue: {
        today: statsData.totalRevenue || 0,
        thisWeek: 0, // Not provided by backend
        thisMonth: 0, // Not provided by backend
      },
      averageOrderValue: {
        MEAL_MENU: statsData.avgOrderValue || 0,
        ON_DEMAND_MENU: 0, // Not provided by backend
      },
    };
  }

  /**
   * Update order status (Kitchen operations)
   *
   * API Call: PATCH /api/orders/:id/status
   *
   * Used for: ACCEPTED → PREPARING → READY
   *
   * @param orderId - Order ID to update
   * @param params - { status: OrderStatus, notes?: string }
   * @returns Updated order
   */
  async updateOrderStatus(
    orderId: string,
    params: UpdateOrderStatusParams
  ): Promise<Order> {
    // 🔍 LOG: Service layer - about to make HTTP request
    console.log('====================================');
    console.log('🌐 SERVICE: updateOrderStatus');
    console.log('====================================');
    console.log('Endpoint:', `/api/orders/${orderId}/status`);
    console.log('Method: PATCH');
    console.log('Order ID:', orderId);
    console.log('Request Body:');
    console.log('  - status:', params.status);
    console.log('  - status (type):', typeof params.status);
    console.log('  - status (length):', params.status.length);
    console.log('  - notes:', params.notes || 'N/A');
    console.log('====================================');
    console.log('📤 HTTP REQUEST BODY (Raw JSON):');
    console.log(JSON.stringify(params, null, 2));
    console.log('====================================');

    const response = await apiService.patch<{
      success: boolean;
      message: string;
      data: { order: Order };
    }>(`/api/orders/${orderId}/status`, params);

    console.log('====================================');
    console.log('✅ SERVICE: updateOrderStatus SUCCESS');
    console.log('====================================');
    console.log('Response Status:', response);
    console.log('Updated Order Status:', response.data.order.status);
    console.log('====================================');

    return response.data.order;
  }

  /**
   * Update order status (ADMIN endpoint - allows ALL statuses)
   *
   * API Call: PATCH /api/orders/admin/:id/status
   *
   * Used for: Admin can change to ANY status (PLACED, ACCEPTED, READY, PICKED_UP, DELIVERED, etc.)
   *
   * @param orderId - Order ID to update
   * @param params - { status: OrderStatus, notes?: string }
   * @returns Updated order
   */
  async updateOrderStatusAdmin(
    orderId: string,
    params: UpdateOrderStatusParams
  ): Promise<Order> {
    console.log('====================================');
    console.log('🌐 SERVICE: updateOrderStatusAdmin (ADMIN ENDPOINT)');
    console.log('====================================');
    console.log('Endpoint:', `/api/orders/admin/${orderId}/status`);
    console.log('Method: PATCH');
    console.log('Order ID:', orderId);
    console.log('Request Body:');
    console.log('  - status:', params.status);
    console.log('  - status (type):', typeof params.status);
    console.log('  - notes:', params.notes || 'N/A');
    console.log('====================================');
    console.log('📤 HTTP REQUEST BODY (Raw JSON):');
    console.log(JSON.stringify(params, null, 2));
    console.log('====================================');

    const response = await apiService.patch<{
      success: boolean;
      message: string;
      data: { order: Order };
    }>(`/api/orders/admin/${orderId}/status`, params);

    console.log('====================================');
    console.log('✅ SERVICE: updateOrderStatusAdmin SUCCESS');
    console.log('====================================');
    console.log('Full Response:', JSON.stringify(response, null, 2));
    console.log('Response.data:', response.data);
    console.log('Response.data.order:', response.data?.order);
    console.log('====================================');

    return response.data?.order || response.data;
  }

  /**
   * Cancel an order (admin endpoint)
   * Backend returns: { order, refundInitiated: boolean, vouchersRestored: number }
   */
  async cancelOrder(
    orderId: string,
    data: {
      reason: string;
      issueRefund: boolean;
      restoreVouchers?: boolean;
    }
  ): Promise<{
    order: Order;
    refundInitiated?: boolean;
    vouchersRestored?: number;
  }> {
    console.log('🚫 cancelOrder request:', orderId, JSON.stringify(data));
    const response = await apiService.patch<{
      success: boolean;
      message: string;
      data: {
        order: Order;
        refundInitiated?: boolean;
        vouchersRestored?: number;
      };
    }>(`/api/orders/${orderId}/admin-cancel`, data);
    console.log('🚫 cancelOrder response:', JSON.stringify(response));
    return response.data;
  }

  /**
   * Assign order to kitchen staff
   */
  async assignOrderToStaff(orderId: string, staffId: string): Promise<Order> {
    const response = await apiService.post<{
      success: boolean;
      message: string;
      data: { order: Order };
    }>(`/api/orders/admin/${orderId}/assign`, {
      staffId,
    });

    return response.data.order;
  }

  /**
   * Get orders that need action (PLACED status)
   */
  async getActionNeededOrders(params?: PaginationParams): Promise<OrderListResponse> {
    return this.getOrders({
      ...params,
      status: 'PLACED',
    });
  }

  /**
   * Get orders by kitchen
   */
  async getOrdersByKitchen(
    kitchenId: string,
    params?: PaginationParams
  ): Promise<OrderListResponse> {
    return this.getOrders({
      ...params,
      kitchenId,
    });
  }

  /**
   * Get orders by zone
   */
  async getOrdersByZone(
    zoneId: string,
    params?: PaginationParams
  ): Promise<OrderListResponse> {
    return this.getOrders({
      ...params,
      zoneId,
    });
  }

  /**
   * Get orders by user/customer
   */
  async getOrdersByUser(
    userId: string,
    params?: PaginationParams
  ): Promise<OrderListResponse> {
    return this.getOrders({
      ...params,
      userId,
    });
  }

  /**
   * Get orders for today
   */
  async getTodayOrders(params?: PaginationParams): Promise<OrderListResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getOrders({
      ...params,
      dateFrom: today.toISOString(),
      dateTo: tomorrow.toISOString(),
    });
  }

  /**
   * Search orders by order ID, user ID, or kitchen ID
   */
  async searchOrders(query: string, params?: PaginationParams): Promise<Order[]> {
    const response = await this.getOrders(params);

    if (!query) return response.orders;

    const lowercaseQuery = query.toLowerCase();
    return response.orders.filter(
      (order) =>
        order._id.toLowerCase().includes(lowercaseQuery) ||
        order.userId.toLowerCase().includes(lowercaseQuery) ||
        order.kitchenId.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Accept order (Kitchen)
   */
  async acceptOrder(
    orderId: string,
    estimatedPrepTime: number
  ): Promise<Order> {
    const response = await apiService.patch<{
      success: boolean;
      message: string;
      data: { order: Order };
    }>(`/api/orders/${orderId}/accept`, {
      estimatedPrepTime,
    });

    return response.data.order;
  }

  /**
   * Reject order (Kitchen)
   */
  async rejectOrder(
    orderId: string,
    reason: string
  ): Promise<Order> {
    const response = await apiService.patch<{
      success: boolean;
      message: string;
      data: { order: Order };
    }>(`/api/orders/${orderId}/reject`, {
      reason,
    });

    return response.data.order;
  }

  /**
   * Update delivery status (Driver)
   */
  async updateDeliveryStatus(
    orderId: string,
    data: {
      status: 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
      notes?: string;
      proofOfDelivery?: {
        type: 'OTP' | 'SIGNATURE' | 'PHOTO';
        value: string;
      };
    }
  ): Promise<Order> {
    // 🔍 LOG: Service layer - about to make HTTP request
    console.log('====================================');
    console.log('🌐 SERVICE: updateDeliveryStatus');
    console.log('====================================');
    console.log('Endpoint:', `/api/orders/${orderId}/delivery-status`);
    console.log('Method: PATCH');
    console.log('Order ID:', orderId);
    console.log('Request Body:');
    console.log('  - status:', data.status);
    console.log('  - status (type):', typeof data.status);
    console.log('  - status (length):', data.status.length);
    console.log('  - notes:', data.notes || 'N/A');
    console.log('  - proofOfDelivery:', data.proofOfDelivery ? 'Present' : 'N/A');
    if (data.proofOfDelivery) {
      console.log('    - type:', data.proofOfDelivery.type);
      console.log('    - value:', data.proofOfDelivery.value);
    }
    console.log('====================================');
    console.log('📤 HTTP REQUEST BODY (Raw JSON):');
    console.log(JSON.stringify(data, null, 2));
    console.log('====================================');

    const response = await apiService.patch<{
      success: boolean;
      message: string;
      data: { order: Order };
    }>(`/api/orders/${orderId}/delivery-status`, data);

    console.log('====================================');
    console.log('✅ SERVICE: updateDeliveryStatus SUCCESS');
    console.log('====================================');
    console.log('Response:', response);
    console.log('Updated Order Status:', response.data.order.status);
    console.log('====================================');

    return response.data.order;
  }

  /**
   * Track order (Customer/Admin)
   */
  async trackOrder(orderId: string): Promise<{
    order: {
      _id: string;
      orderNumber: string;
      status: OrderStatus;
      statusTimeline: any[];
      estimatedDeliveryTime?: string;
      driver?: {
        _id: string;
        name: string;
        phone: string;
      };
      deliveryAddress: any;
    };
  }> {
    const response = await apiService.get<{
      success: boolean;
      data: {
        order: {
          _id: string;
          orderNumber: string;
          status: OrderStatus;
          statusTimeline: any[];
          estimatedDeliveryTime?: string;
          driver?: {
            _id: string;
            name: string;
            phone: string;
          };
          deliveryAddress: any;
        };
      };
    }>(`/api/orders/${orderId}/track`);

    return response.data;
  }

  /**
   * Get orders for kitchen staff
   */
  async getKitchenOrders(params?: {
    status?: OrderStatus;
    orderSource?: 'DIRECT' | 'SCHEDULED' | 'AUTO_ORDER';
    mealWindow?: 'LUNCH' | 'DINNER';
    date?: string;
    page?: number;
    limit?: number;
  }): Promise<OrderListResponse> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const queryString = queryParams.toString();
    const endpoint = `/api/orders/kitchen${queryString ? `?${queryString}` : ''}`;

    const response = await apiService.get<{
      success: boolean;
      data: OrderListResponse;
    }>(endpoint);

    return response.data;
  }
}

export const ordersService = new OrdersService();
