import { apiService } from './api.service';
import { Delivery } from '../types/delivery';

class DeliveryService {
  async getDeliveries(status?: string): Promise<Delivery[]> {
    const query = status ? `?status=${status}` : '';
    return apiService.get<Delivery[]>(`/deliveries${query}`);
  }

  async getDeliveryById(deliveryId: string): Promise<Delivery> {
    return apiService.get<Delivery>(`/deliveries/${deliveryId}`);
  }

  async getDriverDeliveries(): Promise<Delivery[]> {
    return apiService.get<Delivery[]>('/deliveries/driver');
  }

  async acceptDelivery(deliveryId: string): Promise<Delivery> {
    return apiService.post<Delivery>(`/deliveries/${deliveryId}/accept`);
  }

  async startDelivery(deliveryId: string): Promise<Delivery> {
    return apiService.post<Delivery>(`/deliveries/${deliveryId}/start`);
  }

  async completeDelivery(
    deliveryId: string,
    data: { notes?: string; proofImageUrl?: string }
  ): Promise<Delivery> {
    return apiService.post<Delivery>(`/deliveries/${deliveryId}/complete`, data);
  }

  async updateLocation(
    deliveryId: string,
    location: { latitude: number; longitude: number }
  ): Promise<void> {
    await apiService.post(`/deliveries/${deliveryId}/location`, location);
  }

  async getDriverEarnings(period?: string): Promise<{
    totalEarnings: number;
    deliveriesCount: number;
    averagePerDelivery: number;
  }> {
    const query = period ? `?period=${period}` : '';
    return apiService.get(`/deliveries/earnings${query}`);
  }

  async autoBatchOrders(data: {
    mealWindow: 'LUNCH' | 'DINNER';
    kitchenId: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      batchesCreated: number;
      batchesUpdated?: number;
      ordersProcessed: number;
      batches?: any[];
    };
    error: null;
  }> {
    return apiService.post('/api/delivery/auto-batch', data);
  }

  async dispatchBatches(data: {
    mealWindow: 'LUNCH' | 'DINNER';
    kitchenId: string;
    forceDispatch?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      batchesDispatched: number;
      batches?: any[];
    };
    error: null;
  }> {
    return apiService.post('/api/delivery/dispatch', data);
  }

  /**
   * Auto-batch orders for kitchen staff's own kitchen
   * Kitchen staff endpoint - no kitchenId required
   */
  async autoBatchMyKitchenOrders(data?: {
    mealWindow?: 'LUNCH' | 'DINNER';
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      batchesCreated: number;
      batchesUpdated?: number;
      ordersProcessed: number;
      batches?: any[];
    };
    error: null;
  }> {
    return apiService.post('/api/delivery/my-kitchen/auto-batch', data || {});
  }

  /**
   * Dispatch batches for kitchen staff's own kitchen
   * Kitchen staff endpoint - no kitchenId required
   */
  async dispatchMyKitchenBatches(data: {
    mealWindow: 'LUNCH' | 'DINNER';
    forceDispatch?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      batchesDispatched: number;
      batches?: any[];
    };
    error: null;
  }> {
    return apiService.post('/api/delivery/my-kitchen/dispatch', data);
  }

  /**
   * Get batches for kitchen staff's own kitchen
   * Kitchen staff endpoint - no kitchenId required
   */
  async getMyKitchenBatches(params?: {
    status?: string;
    mealWindow?: 'LUNCH' | 'DINNER';
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      batches: any[];
      summary?: {
        collecting: number;
        dispatched: number;
        inProgress: number;
        completed: number;
      };
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };
    error: null;
  }> {
    const queryParams = { ...params };
    // Convert single date to dateFrom/dateTo range
    if (queryParams?.date && !queryParams.dateFrom && !queryParams.dateTo) {
      queryParams.dateFrom = queryParams.date;
      queryParams.dateTo = queryParams.date;
      delete queryParams.date;
    }
    const query = new URLSearchParams();
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined) {
          query.append(key, value.toString());
        }
      });
    }
    const queryString = query.toString();
    const endpoint = queryString
      ? `/api/delivery/kitchen-batches?${queryString}`
      : '/api/delivery/kitchen-batches';
    return apiService.get(endpoint);
  }

  async getBatches(params?: {
    kitchenId?: string;
    zoneId?: string;
    status?: string;
    mealWindow?: 'LUNCH' | 'DINNER';
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      batches: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };
    error: null;
  }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          query.append(key, value.toString());
        }
      });
    }
    return apiService.get(`/api/delivery/admin/batches?${query.toString()}`);
  }

  async getDeliveryStats(params?: {
    dateFrom?: string;
    dateTo?: string;
    zoneId?: string;
    driverId?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      totalBatches: number;
      totalOrders: number;
      totalDeliveries: number;
      totalFailed: number;
      successRate: number;
      byStatus?: Array<{
        _id: string;
        count: number;
        orders: number;
      }>;
      byZone?: Array<{
        _id: string;
        zone: string;
        batches: number;
        orders: number;
        deliveries: number;
        successRate: number;
      }>;
      byDriver?: Array<{
        driver: { _id: string; name: string; phone: string };
        batches: number;
        orders: number;
        successRate: number;
        failed: number;
      }>;
    };
    error: null;
  }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          query.append(key, value.toString());
        }
      });
    }
    return apiService.get(`/api/delivery/admin/stats?${query.toString()}`);
  }

  /**
   * Get available batches for driver to accept
   */
  async getAvailableBatches(): Promise<{
    success: boolean;
    message: string;
    data: {
      batches: Array<{
        _id: string;
        batchNumber: string;
        kitchenId: { _id: string; name: string; address: string };
        zoneId: { _id: string; name: string; code: string };
        mealWindow: 'LUNCH' | 'DINNER';
        orderCount: number;
        estimatedEarnings?: number;
        pickupAddress: string;
        windowEndTime: string;
      }>;
    };
  }> {
    return apiService.get('/api/delivery/available-batches');
  }

  /**
   * Driver accepts a batch
   */
  async acceptBatch(batchId: string): Promise<{
    success: boolean;
    message: string;
    data: {
      batch: any;
      orders: any[];
      pickupAddress: string;
    };
  }> {
    return apiService.post(`/api/delivery/batches/${batchId}/accept`);
  }

  /**
   * Driver marks batch as picked up from kitchen
   */
  async pickupBatch(batchId: string): Promise<{
    success: boolean;
    message: string;
    data: {
      batch: any;
    };
  }> {
    return apiService.patch(`/api/delivery/batches/${batchId}/pickup`);
  }

  /**
   * Update order delivery status (driver)
   */
  async updateOrderDeliveryStatus(
    orderId: string,
    data: {
      status: 'DELIVERED' | 'FAILED';
      proofOfDelivery?: {
        type: 'OTP' | 'SIGNATURE' | 'PHOTO';
        value: string;
      };
      failureReason?: string;
      notes?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      order: any;
    };
  }> {
    return apiService.patch(`/api/delivery/orders/${orderId}/status`, data);
  }

  /**
   * Get batch details with orders
   */
  async getBatchDetails(batchId: string): Promise<{
    success: boolean;
    message: string;
    data: {
      batch: any;
      orders: any[];
      assignments?: any[];
    };
  }> {
    return apiService.get(`/api/delivery/batches/${batchId}`);
  }

  /**
   * Get live tracking data for a batch
   */
  async getBatchTracking(batchId: string): Promise<{
    success: boolean;
    data: any;
  }> {
    return apiService.get(`/api/delivery/batches/${batchId}/tracking`);
  }

  /**
   * Send kitchen reminder about pending orders
   */
  async sendKitchenReminder(data: {
    mealWindow?: 'LUNCH' | 'DINNER';
    kitchenId?: string;
  }): Promise<{
    success: boolean;
    data: {
      kitchensNotified: number;
      details: Array<{
        kitchenId: string;
        kitchenName: string;
        orderCount: number;
        staffNotified: number;
      }>;
    };
  }> {
    return apiService.post('/api/delivery/kitchen-reminder', data);
  }

  /**
   * Reassign a batch to a different driver
   */
  async reassignBatchDriver(batchId: string, data: {
    driverId: string;
    reason: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: { batch: any };
  }> {
    return apiService.patch(`/api/delivery/batches/${batchId}/reassign`, data);
  }

  /**
   * Admin dispatch a batch to a specific driver (one-step)
   * Works for COLLECTING or READY_FOR_DISPATCH batches
   */
  async dispatchBatchToDriver(batchId: string, data: {
    driverId: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: { batch: any; orders: any[]; pickupAddress: any };
  }> {
    return apiService.patch(`/api/delivery/batches/${batchId}/dispatch-to-driver`, data);
  }

  /**
   * Cancel a batch
   */
  async cancelBatch(batchId: string, data: {
    reason: string;
  }): Promise<{
    success: boolean;
    message: string;
  }> {
    return apiService.patch(`/api/delivery/batches/${batchId}/cancel`, data);
  }

  /**
   * Complete (finalize) a batch. Backend reconciles counters and sets the final
   * status (COMPLETED / PARTIAL_COMPLETE / CANCELLED) and frees the driver.
   * Requires every order to be terminal first — callers resolve pending orders
   * before invoking this.
   */
  async completeBatch(batchId: string, data?: {
    notes?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data?: { batch: any; summary: { totalOrders: number; delivered: number; failed: number } };
  }> {
    return apiService.patch(`/api/delivery/batches/${batchId}/complete`, data || {});
  }

  /**
   * Merge two or more pre-dispatch batches into one new optimized batch.
   */
  async mergeBatches(batchIds: string[], reason?: string): Promise<{
    success: boolean;
    message: string;
    data?: { mergedBatch: any; sourceBatchIds: string[]; orderCount: number };
  }> {
    return apiService.post('/api/delivery/batches/merge', { batchIds, reason });
  }

  /**
   * Assign multiple batches to one driver in the given order (sequence).
   */
  async assignBatchesToDriver(driverId: string, batchIds: string[], reason?: string): Promise<{
    success: boolean;
    message: string;
    data?: { driverId: string; assignedBatchIds: string[]; count: number };
  }> {
    return apiService.post('/api/delivery/batches/assign-to-driver', { driverId, batchIds, reason });
  }

  /**
   * Reorder a batch's delivery stops. `sequence` is the new order (sequenceNumber 1..N).
   */
  async updateDeliverySequence(
    batchId: string,
    sequence: Array<{ orderId: string; sequenceNumber: number }>,
  ): Promise<{ success: boolean; message: string }> {
    return apiService.patch(`/api/delivery/batches/${batchId}/sequence`, { sequence });
  }

  /**
   * Get available drivers for reassignment
   */
  async getAvailableDrivers(): Promise<any> {
    return apiService.get('/api/admin/users?role=DRIVER&status=ACTIVE');
  }
}

export const deliveryService = new DeliveryService();
