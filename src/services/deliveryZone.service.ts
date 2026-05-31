import { apiService } from './api.enhanced.service';
import {
  ApiResponse,
  DeliveryZone,
  CreateDeliveryZoneRequest,
  UpdateDeliveryZoneRequest,
  PreviewAreasRequest,
  PreviewAreasResponse,
} from '../types/api.types';

/**
 * Delivery Zone Service
 *
 * Per-kitchen delivery zones with per-meal-window pricing (lunch/dinner).
 * Admin-only API. Replaces the legacy areasServed flow once Phase 6 cutover
 * lands in the consumer app.
 */

interface DeliveryZoneListResponse {
  deliveryZones: DeliveryZone[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

const deliveryZoneService = {
  /**
   * GET /api/delivery-zones?kitchenId=&status=&page=&limit=
   * Lists delivery zones. Pass kitchenId to scope to a single kitchen.
   */
  async getDeliveryZones(params?: {
    kitchenId?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    page?: number;
    limit?: number;
  }): Promise<DeliveryZoneListResponse> {
    const qs = new URLSearchParams();
    if (params?.kitchenId) qs.append('kitchenId', params.kitchenId);
    if (params?.status) qs.append('status', params.status);
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));

    const url = `/api/delivery-zones${qs.toString() ? `?${qs.toString()}` : ''}`;
    const response = await apiService.get<ApiResponse<DeliveryZoneListResponse>>(url);
    return response.data;
  },

  /**
   * Convenience helper: get all ACTIVE zones for a single kitchen.
   */
  async getZonesForKitchen(kitchenId: string): Promise<DeliveryZone[]> {
    const { deliveryZones } = await this.getDeliveryZones({
      kitchenId,
      limit: 100,
    });
    return deliveryZones;
  },

  /**
   * GET /api/delivery-zones/:id
   */
  async getDeliveryZoneById(id: string): Promise<DeliveryZone> {
    const response = await apiService.get<ApiResponse<{ deliveryZone: DeliveryZone }>>(
      `/api/delivery-zones/${id}`,
    );
    return response.data.deliveryZone;
  },

  /**
   * POST /api/delivery-zones
   */
  async createDeliveryZone(data: CreateDeliveryZoneRequest): Promise<DeliveryZone> {
    const response = await apiService.post<ApiResponse<{ deliveryZone: DeliveryZone }>>(
      '/api/delivery-zones',
      data,
    );
    return response.data.deliveryZone;
  },

  /**
   * PUT /api/delivery-zones/:id
   */
  async updateDeliveryZone(
    id: string,
    data: UpdateDeliveryZoneRequest,
  ): Promise<DeliveryZone> {
    const response = await apiService.put<ApiResponse<{ deliveryZone: DeliveryZone }>>(
      `/api/delivery-zones/${id}`,
      data,
    );
    return response.data.deliveryZone;
  },

  /**
   * DELETE /api/delivery-zones/:id
   * Hard-delete. For temporary disable, use updateDeliveryZone with status='INACTIVE'.
   */
  async deleteDeliveryZone(id: string): Promise<void> {
    await apiService.delete(`/api/delivery-zones/${id}`);
  },

  /**
   * POST /api/delivery-zones/preview-areas
   * Given (lat, lng, radiusKm), returns Areas within the radius.
   * Used by the zone-creation form to pre-populate the area checklist.
   */
  async previewAreas(data: PreviewAreasRequest): Promise<PreviewAreasResponse> {
    const response = await apiService.post<ApiResponse<PreviewAreasResponse>>(
      '/api/delivery-zones/preview-areas',
      data,
    );
    return response.data;
  },
};

export default deliveryZoneService;
