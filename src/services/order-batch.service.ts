import { apiService } from './api.enhanced.service';
import { authService } from './auth.service';

/**
 * Order & Batch Management Service
 * Handles all order and delivery batch operations for admin
 * Uses the enhanced API service for consistent error handling and auth
 */

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  error?: any;
}

interface OrderFilters {
  page?: number;
  limit?: number;
  userId?: string;
  kitchenId?: string;
  zoneId?: string;
  driverId?: string;
  status?: string;
  menuType?: 'MEAL_MENU' | 'ON_DEMAND_MENU';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

interface BatchFilters {
  page?: number;
  limit?: number;
  kitchenId?: string;
  zoneId?: string;
  driverId?: string;
  status?: string;
  mealWindow?: 'LUNCH' | 'DINNER';
  dateFrom?: string;
  dateTo?: string;
}

interface StatsFilters {
  dateFrom?: string;
  dateTo?: string;
  zoneId?: string;
  driverId?: string;
  kitchenId?: string;
}

const buildQueryString = (filters: Record<string, any>): string => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Helper function to handle API errors and check for session expiration
 */
const handleApiError = (error: any, defaultMessage: string) => {
  console.error(`❌ ${defaultMessage}:`, error);

  // Check if session expired
  if (error?.requiresReauth) {
    // Clear admin data on session expiration
    authService.clearAdminData();
    throw new Error('Your session has expired. Please log in again.');
  }

  throw new Error(error.message || defaultMessage);
};

export const orderBatchService = {
  // ==================== ORDER MANAGEMENT ====================

  /**
   * Get all orders with filters (Admin)
   * GET /api/orders/admin/all
   */
  async getAllOrders(filters: OrderFilters = {}): Promise<ApiResponse> {
    try {
      const queryString = buildQueryString(filters);
      const response = await apiService.get<ApiResponse>(`/api/orders/admin/all${queryString}`);
      return response;
    } catch (error: any) {
      handleApiError(error, 'Failed to fetch orders');
      throw error; // TypeScript requirement, never reached
    }
  },

  /**
   * Get single order details
   * GET /api/orders/:id
   */
  async getOrderDetails(orderId: string): Promise<ApiResponse> {
    try {
      const response = await apiService.get<ApiResponse>(`/api/orders/${orderId}`);
      return response;
    } catch (error: any) {
      console.error('❌ getOrderDetails error:', error);
      throw new Error(error.message || 'Failed to fetch order details');
    }
  },

  /**
   * Update order status (Admin override)
   * PATCH /api/orders/admin/:id/status
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    notes?: string
  ): Promise<ApiResponse> {
    try {
      const response = await apiService.patch<ApiResponse>(
        `/api/orders/admin/${orderId}/status`,
        { status, notes }
      );
      return response;
    } catch (error: any) {
      console.error('❌ updateOrderStatus error:', error);
      throw new Error(error.message || 'Failed to update order status');
    }
  },

  /**
   * Cancel order (Admin)
   * PATCH /api/orders/:id/admin-cancel
   */
  async cancelOrder(
    orderId: string,
    reason: string,
    issueRefund: boolean = true,
    restoreVouchers: boolean = true
  ): Promise<ApiResponse> {
    try {
      // Field names must match adminCancelOrderSchema exactly — the backend
      // validates with stripUnknown, so a misnamed flag is dropped silently and
      // falls back to its default instead of erroring.
      const response = await apiService.patch<ApiResponse>(
        `/api/orders/${orderId}/admin-cancel`,
        { reason, issueRefund, restoreVouchers }
      );
      return response;
    } catch (error: any) {
      console.error('❌ cancelOrder error:', error);
      throw new Error(error.message || 'Failed to cancel order');
    }
  },

  // ==================== BATCH MANAGEMENT ====================

  /**
   * Get all batches with filters (Admin)
   * GET /api/delivery/admin/batches
   */
  async getAllBatches(filters: BatchFilters = {}): Promise<ApiResponse> {
    try {
      const queryString = buildQueryString(filters);
      const response = await apiService.get<ApiResponse>(`/api/delivery/admin/batches${queryString}`);
      return response;
    } catch (error: any) {
      handleApiError(error, 'Failed to fetch batches');
      throw error; // TypeScript requirement, never reached
    }
  },

  /**
   * Get single batch details
   * GET /api/delivery/batches/:batchId
   */
  async getBatchDetails(batchId: string): Promise<ApiResponse> {
    try {
      const response = await apiService.get<ApiResponse>(`/api/delivery/batches/${batchId}`);
      return response;
    } catch (error: any) {
      console.error('❌ getBatchDetails error:', error);
      throw new Error(error.message || 'Failed to fetch batch details');
    }
  },

  /**
   * Trigger auto-batching
   * POST /api/delivery/auto-batch
   */
  async triggerAutoBatch(filters: {
    kitchenId?: string;
    zoneId?: string;
    mealWindow?: 'LUNCH' | 'DINNER';
  } = {}): Promise<ApiResponse> {
    try {
      const response = await apiService.post<ApiResponse>('/api/delivery/auto-batch', filters);
      return response;
    } catch (error: any) {
      console.error('❌ triggerAutoBatch error:', error);
      throw new Error(error.message || 'Failed to trigger auto-batch');
    }
  },

  /**
   * Dispatch batches (after cutoff time)
   * POST /api/delivery/dispatch
   */
  async dispatchBatches(filters: {
    mealWindow?: 'LUNCH' | 'DINNER';
    kitchenId?: string;
  } = {}): Promise<ApiResponse> {
    try {
      const response = await apiService.post<ApiResponse>('/api/delivery/dispatch', filters);
      return response;
    } catch (error: any) {
      console.error('❌ dispatchBatches error:', error);
      throw new Error(error.message || 'Failed to dispatch batches');
    }
  },

  /**
   * Reassign batch to different driver
   * PATCH /api/delivery/batches/:batchId/reassign
   */
  async reassignBatch(
    batchId: string,
    newDriverId: string,
    reason: string
  ): Promise<ApiResponse> {
    try {
      console.log('🔧 orderBatchService.reassignBatch called with:', {
        batchId,
        newDriverId,
        newDriverIdType: typeof newDriverId,
        reason,
        url: `/api/delivery/batches/${batchId}/reassign`,
        body: { newDriverId, driverId: newDriverId, reason },
      });

      // Send both newDriverId and driverId to ensure backend compatibility
      const response = await apiService.patch<ApiResponse>(
        `/api/delivery/batches/${batchId}/reassign`,
        {
          newDriverId,
          driverId: newDriverId, // Also send as driverId in case backend expects this field name
          reason
        }
      );

      console.log('🔧 orderBatchService.reassignBatch response:', response);
      return response;
    } catch (error: any) {
      console.error('❌ reassignBatch error:', error);
      throw new Error(error.message || 'Failed to reassign batch');
    }
  },

  /**
   * Cancel batch
   * PATCH /api/delivery/batches/:batchId/cancel
   */
  async cancelBatch(
    batchId: string,
    reason: string
  ): Promise<ApiResponse> {
    try {
      const response = await apiService.patch<ApiResponse>(
        `/api/delivery/batches/${batchId}/cancel`,
        { reason }
      );
      return response;
    } catch (error: any) {
      console.error('❌ cancelBatch error:', error);
      throw new Error(error.message || 'Failed to cancel batch');
    }
  },

  // ==================== STATISTICS & ANALYTICS ====================

  /**
   * Get delivery statistics
   * GET /api/delivery/admin/stats
   */
  async getDeliveryStats(filters: StatsFilters = {}): Promise<ApiResponse> {
    try {
      const queryString = buildQueryString(filters);
      const response = await apiService.get<ApiResponse>(`/api/delivery/admin/stats${queryString}`);
      return response;
    } catch (error: any) {
      console.error('❌ getDeliveryStats error:', error);
      throw new Error(error.message || 'Failed to fetch delivery stats');
    }
  },

  // ==================== CONFIGURATION ====================

  /**
   * Get batch configuration
   * GET /api/delivery/config
   */
  async getBatchConfig(): Promise<ApiResponse> {
    try {
      const response = await apiService.get<ApiResponse>('/api/delivery/config');
      return response;
    } catch (error: any) {
      console.error('❌ getBatchConfig error:', error);
      throw new Error(error.message || 'Failed to fetch batch config');
    }
  },

  /**
   * Update batch configuration
   * PUT /api/delivery/config
   */
  async updateBatchConfig(config: {
    maxBatchSize?: number;
    failedOrderPolicy?: 'RETURN_TO_KITCHEN' | 'NO_RETURN';
    autoDispatchEnabled?: boolean;
    autoDispatchDelay?: number;
    sequencePolicy?: 'DRIVER_CHOICE' | 'SYSTEM_OPTIMIZED' | 'LOCKED';
  }): Promise<ApiResponse> {
    try {
      const response = await apiService.put<ApiResponse>('/api/delivery/config', config);
      return response;
    } catch (error: any) {
      console.error('❌ updateBatchConfig error:', error);
      throw new Error(error.message || 'Failed to update batch config');
    }
  },
};
