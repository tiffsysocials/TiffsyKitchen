import { apiService } from './api.enhanced.service';
import { ApiResponse, ServiceZone, Area } from '../types/api.types';

/**
 * Service Zone Service
 * Handles all service zone management API calls
 */

interface ServiceZoneListResponse {
  serviceZones: ServiceZone[];
  total: number;
  page: number;
  limit: number;
}

interface PreviewBoundaryResponse {
  boundary: { type: 'Polygon'; coordinates: number[][][] };
}

const serviceZoneService = {
  /**
   * Get all service zones with optional filters
   */
  async getServiceZones(params?: {
    city?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ServiceZoneListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.city) queryParams.append('city', params.city);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const queryString = queryParams.toString();
      const endpoint = `/api/service-zones${queryString ? `?${queryString}` : ''}`;

      const response = await apiService.get<ApiResponse<ServiceZoneListResponse>>(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching service zones:', error);
      throw error;
    }
  },

  /**
   * Get service zone by ID
   */
  async getServiceZoneById(id: string): Promise<ServiceZone> {
    try {
      const response = await apiService.get<ApiResponse<{ serviceZone: ServiceZone }>>(
        `/api/service-zones/${id}`
      );
      return response.data.serviceZone;
    } catch (error) {
      console.error('Error fetching service zone:', error);
      throw error;
    }
  },

  /**
   * Create a new service zone
   */
  async createServiceZone(data: {
    name: string;
    city: string;
    description?: string;
    areaIds: string[];
  }): Promise<ServiceZone> {
    try {
      const response = await apiService.post<ApiResponse<{ serviceZone: ServiceZone }>>(
        '/api/service-zones',
        data
      );
      return response.data.serviceZone;
    } catch (error) {
      console.error('Error creating service zone:', error);
      throw error;
    }
  },

  /**
   * Update service zone
   */
  async updateServiceZone(
    id: string,
    data: Partial<{
      name: string;
      city: string;
      description: string;
      areaIds: string[];
      status: string;
    }>
  ): Promise<ServiceZone> {
    try {
      const response = await apiService.put<ApiResponse<{ serviceZone: ServiceZone }>>(
        `/api/service-zones/${id}`,
        data
      );
      return response.data.serviceZone;
    } catch (error) {
      console.error('Error updating service zone:', error);
      throw error;
    }
  },

  /**
   * Delete service zone
   */
  async deleteServiceZone(id: string): Promise<void> {
    try {
      await apiService.delete(`/api/service-zones/${id}`);
    } catch (error) {
      console.error('Error deleting service zone:', error);
      throw error;
    }
  },

  /**
   * Preview boundary for a set of area IDs (convex hull)
   */
  async previewBoundary(areaIds: string[]): Promise<PreviewBoundaryResponse> {
    try {
      const response = await apiService.post<ApiResponse<PreviewBoundaryResponse>>(
        '/api/service-zones/preview-boundary',
        { areaIds }
      );
      return response.data;
    } catch (error) {
      console.error('Error previewing boundary:', error);
      throw error;
    }
  },

  /**
   * Assign service zones to a kitchen
   */
  async assignToKitchen(kitchenId: string, serviceZoneIds: string[]): Promise<void> {
    try {
      await apiService.patch(
        `/api/kitchens/${kitchenId}/service-zones`,
        { serviceZoneIds }
      );
    } catch (error) {
      console.error('Error assigning service zones to kitchen:', error);
      throw error;
    }
  },
};

export default serviceZoneService;
