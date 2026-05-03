import { apiService, BASE_URL } from './api.enhanced.service';
import {
  Zone,
  ZoneListResponse,
  ZoneStatus,
  ApiResponse,
} from '../types/api.types';

/**
 * Zone Service
 * Handles all zone management API calls
 */

export interface GetZonesParams {
  city?: string;
  status?: ZoneStatus;
  orderingEnabled?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateZoneRequest {
  pincode: string;
  name: string;
  city: string;
  state: string;
  timezone?: string;
  status?: ZoneStatus;
  orderingEnabled?: boolean;
  displayOrder?: number;
}

export interface UpdateZoneRequest {
  name?: string;
  city?: string;
  state?: string;
  timezone?: string;
  displayOrder?: number;
}

export interface ToggleOrderingRequest {
  orderingEnabled: boolean;
}

class ZoneService {
  /**
   * Get all zones with optional filters
   */
  async getZones(params?: GetZonesParams): Promise<ZoneListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.city) queryParams.append('city', params.city);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.orderingEnabled !== undefined) {
        queryParams.append('orderingEnabled', params.orderingEnabled.toString());
      }
      if (params?.search) queryParams.append('search', params.search);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const queryString = queryParams.toString();
      const endpoint = `/api/zones${queryString ? `?${queryString}` : ''}`;

      const response = await apiService.get<ApiResponse<ZoneListResponse>>(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching zones:', error);
      throw error;
    }
  }

  /**
   * Get active zones via the public endpoint (no auth required).
   * Used during kitchen self-registration before the user has an auth token.
   * Backend returns minimal fields: _id, pincode, name, city.
   */
  async getActiveZonesPublic(city?: string): Promise<Pick<Zone, '_id' | 'pincode' | 'name' | 'city'>[]> {
    const qs = city ? `?city=${encodeURIComponent(city)}` : '';
    const response = await fetch(`${BASE_URL}/api/zones/active${qs}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await response.json();
    if (!response.ok || json?.success === false) {
      throw new Error(json?.message || 'Failed to fetch active zones');
    }
    return json.data?.zones || [];
  }

  /**
   * Get zone by ID
   */
  async getZoneById(zoneId: string): Promise<Zone> {
    try {
      const response = await apiService.get<ApiResponse<{ zone: Zone }>(
        `/api/zones/${zoneId}`
      );
      return response.data.zone;
    } catch (error) {
      console.error('Error fetching zone:', error);
      throw error;
    }
  }

  /**
   * Create a new zone
   */
  async createZone(data: CreateZoneRequest): Promise<Zone> {
    try {
      const response = await apiService.post<ApiResponse<{ zone: Zone }>>(
        '/api/zones',
        data
      );
      return response.data.zone;
    } catch (error) {
      console.error('Error creating zone:', error);
      throw error;
    }
  }

  /**
   * Update zone details (except pincode)
   */
  async updateZone(zoneId: string, data: UpdateZoneRequest): Promise<Zone> {
    try {
      const response = await apiService.put<ApiResponse<{ zone: Zone }>>(
        `/api/zones/${zoneId}`,
        data
      );
      return response.data.zone;
    } catch (error) {
      console.error('Error updating zone:', error);
      throw error;
    }
  }

  /**
   * Activate zone
   */
  async activateZone(zoneId: string): Promise<Zone> {
    try {
      const response = await apiService.patch<ApiResponse<{ zone: Zone }>>(
        `/api/zones/${zoneId}/activate`
      );
      return response.data.zone;
    } catch (error) {
      console.error('Error activating zone:', error);
      throw error;
    }
  }

  /**
   * Deactivate zone
   */
  async deactivateZone(zoneId: string): Promise<Zone> {
    try {
      const response = await apiService.patch<ApiResponse<{ zone: Zone }>>(
        `/api/zones/${zoneId}/deactivate`
      );
      return response.data.zone;
    } catch (error) {
      console.error('Error deactivating zone:', error);
      throw error;
    }
  }

  /**
   * Toggle ordering for zone
   */
  async toggleOrdering(
    zoneId: string,
    orderingEnabled: boolean
  ): Promise<Zone> {
    try {
      const response = await apiService.patch<ApiResponse<{ zone: Zone }>>(
        `/api/zones/${zoneId}/ordering`,
        { orderingEnabled }
      );
      return response.data.zone;
    } catch (error) {
      console.error('Error toggling ordering:', error);
      throw error;
    }
  }

  /**
   * Delete zone
   */
  async deleteZone(zoneId: string): Promise<void> {
    try {
      await apiService.delete(`/api/zones/${zoneId}`);
    } catch (error) {
      console.error('Error deleting zone:', error);
      throw error;
    }
  }

  /**
   * Get distinct cities for filter dropdown
   */
  async getCities(status: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ACTIVE'): Promise<string[]> {
    try {
      const response = await apiService.get<ApiResponse<{ cities: any[] }>>(
        `/api/zones/cities?status=${status}`
      );

      // Handle both string[] and object[] responses
      const citiesData = response.data.cities;
      if (!citiesData || citiesData.length === 0) {
        return [];
      }

      // If first element is a string, return as-is
      if (typeof citiesData[0] === 'string') {
        return citiesData as string[];
      }

      // If first element is an object, extract city names
      return citiesData.map((item: any) => item.city || item.name || 'Unknown');
    } catch (error) {
      console.error('Error fetching cities:', error);
      throw error;
    }
  }

  /**
   * Lookup zone by pincode (public endpoint)
   */
  async lookupByPincode(pincode: string): Promise<Zone | null> {
    try {
      const response = await apiService.get<ApiResponse<{ zone: Zone }>>(
        `/api/zones/lookup/${pincode}`
      );
      return response.data.zone;
    } catch (error) {
      console.error('Error looking up pincode:', error);
      return null;
    }
  }

  /**
   * Helper: Check if pincode exists
   */
  async pincodeExists(pincode: string): Promise<boolean> {
    const zone = await this.lookupByPincode(pincode);
    return zone !== null;
  }

  /**
   * Helper: Get active zones only
   */
  async getActiveZones(params?: Omit<GetZonesParams, 'status'>): Promise<ZoneListResponse> {
    return this.getZones({ ...params, status: 'ACTIVE' });
  }

  /**
   * Helper: Get zones by city
   */
  async getZonesByCity(city: string, params?: Omit<GetZonesParams, 'city'>): Promise<ZoneListResponse> {
    return this.getZones({ ...params, city });
  }
}

// Export singleton instance
const zoneService = new ZoneService();
export default zoneService;
