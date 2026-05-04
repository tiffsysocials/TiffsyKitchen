import { apiService } from './api.enhanced.service';
import {
  ApiResponse,
  NearbyPincode,
  NearbyPincodesResponse,
  PincodeListResponse,
  PincodeRecord,
  PincodeSource,
  WarmedCitiesResponse,
  WarmCityResponse,
} from '../types/api.types';

/**
 * Pincode Service
 *
 * Looks up, lists, mutates, and pre-warms pincodes used by the admin
 * kitchen-creation flow.
 */

export interface GetNearbyPincodesParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

export interface ListPincodesParams {
  city?: string;
  state?: string;
  source?: PincodeSource;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreatePincodeRequest {
  pincode: string;
  officeName?: string;
  city: string;
  district?: string;
  state: string;
  latitude: number;
  longitude: number;
}

export interface UpdatePincodeRequest {
  officeName?: string;
  city?: string;
  district?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
}

export type WarmCityRequest =
  | { city: string; state: string; force?: boolean }
  | { latitude: number; longitude: number; force?: boolean };

class PincodeService {
  /**
   * Fetch pincodes within `radiusKm` of (latitude, longitude), sorted by distance.
   * Backend auto-enriches if the local DB is sparse for the area.
   */
  async getNearbyPincodes(params: GetNearbyPincodesParams): Promise<NearbyPincode[]> {
    const query = new URLSearchParams({
      latitude: params.latitude.toString(),
      longitude: params.longitude.toString(),
      radiusKm: (params.radiusKm ?? 10).toString(),
    });

    try {
      const response = await apiService.get<ApiResponse<NearbyPincodesResponse>>(
        `/api/pincodes/nearby?${query.toString()}`
      );
      return response.data.pincodes;
    } catch (error) {
      console.error('Error fetching nearby pincodes:', error);
      throw error;
    }
  }

  /**
   * List/filter/paginate the master pincode collection.
   */
  async getPincodes(params?: ListPincodesParams): Promise<PincodeListResponse> {
    const query = new URLSearchParams();
    if (params?.city) query.append('city', params.city);
    if (params?.state) query.append('state', params.state);
    if (params?.source) query.append('source', params.source);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const qs = query.toString();
    const endpoint = `/api/pincodes${qs ? `?${qs}` : ''}`;

    try {
      const response = await apiService.get<ApiResponse<PincodeListResponse>>(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching pincodes:', error);
      throw error;
    }
  }

  async getPincode(pincode: string): Promise<PincodeRecord> {
    try {
      const response = await apiService.get<ApiResponse<{ pincode: PincodeRecord }>>(
        `/api/pincodes/${pincode}`
      );
      return response.data.pincode;
    } catch (error) {
      console.error('Error fetching pincode:', error);
      throw error;
    }
  }

  async createPincode(data: CreatePincodeRequest): Promise<PincodeRecord> {
    try {
      const response = await apiService.post<ApiResponse<{ pincode: PincodeRecord }>>(
        '/api/pincodes',
        data
      );
      return response.data.pincode;
    } catch (error) {
      console.error('Error creating pincode:', error);
      throw error;
    }
  }

  async updatePincode(pincode: string, data: UpdatePincodeRequest): Promise<PincodeRecord> {
    try {
      const response = await apiService.put<ApiResponse<{ pincode: PincodeRecord }>>(
        `/api/pincodes/${pincode}`,
        data
      );
      return response.data.pincode;
    } catch (error) {
      console.error('Error updating pincode:', error);
      throw error;
    }
  }

  async deletePincode(pincode: string): Promise<void> {
    try {
      await apiService.delete(`/api/pincodes/${pincode}`);
    } catch (error) {
      console.error('Error deleting pincode:', error);
      throw error;
    }
  }

  /**
   * Pre-warm a city (fetch all its pincodes from India Post + Google).
   * Use { city, state } or { latitude, longitude }. `force: true` bypasses
   * the warmed-city TTL cache to refresh.
   */
  async warmCity(data: WarmCityRequest): Promise<WarmCityResponse> {
    try {
      const response = await apiService.post<ApiResponse<WarmCityResponse>>(
        '/api/pincodes/warm',
        data
      );
      return response.data;
    } catch (error) {
      console.error('Error warming city:', error);
      throw error;
    }
  }

  async listWarmedCities(): Promise<WarmedCitiesResponse> {
    try {
      const response = await apiService.get<ApiResponse<WarmedCitiesResponse>>(
        '/api/pincodes/warmed-cities'
      );
      return response.data;
    } catch (error) {
      console.error('Error listing warmed cities:', error);
      throw error;
    }
  }

  /**
   * Mark a warmed city as stale so the next nearby/warm call refetches it.
   */
  async unwarmCity(cityKey: string): Promise<void> {
    try {
      await apiService.delete(`/api/pincodes/warmed-cities/${encodeURIComponent(cityKey)}`);
    } catch (error) {
      console.error('Error unwarming city:', error);
      throw error;
    }
  }
}

const pincodeService = new PincodeService();
export default pincodeService;
