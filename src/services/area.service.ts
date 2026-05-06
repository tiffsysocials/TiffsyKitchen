import { apiService } from './api.enhanced.service';
import {
  ApiResponse,
  Area,
  NearbyAreasMeta,
  NearbyAreasResponse,
} from '../types/api.types';

export interface GetNearbyAreasParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  cityHint?: string;
  stateHint?: string;
}

export interface NearbyAreasResult {
  areas: NearbyAreasResponse['areas'];
  meta?: NearbyAreasMeta;
}

class AreaService {
  async getNearbyAreas(params: GetNearbyAreasParams): Promise<NearbyAreasResult> {
    const query = new URLSearchParams({
      latitude: params.latitude.toString(),
      longitude: params.longitude.toString(),
      radiusKm: (params.radiusKm ?? 10).toString(),
    });
    if (params.cityHint) query.append('cityHint', params.cityHint);
    if (params.stateHint) query.append('stateHint', params.stateHint);

    try {
      const response = await apiService.get<ApiResponse<NearbyAreasResponse>>(
        `/api/areas/nearby?${query.toString()}`
      );
      return { areas: response.data.areas, meta: response.data.meta };
    } catch (error) {
      console.error('Error fetching nearby areas:', error);
      throw error;
    }
  }

  async getAreasByIds(ids: string[]): Promise<Area[]> {
    if (ids.length === 0) return [];
    const query = new URLSearchParams({ ids: ids.join(',') });
    try {
      const response = await apiService.get<ApiResponse<{ areas: Area[] }>>(
        `/api/areas?${query.toString()}`
      );
      return response.data.areas;
    } catch (error) {
      console.error('Error fetching areas by ids:', error);
      throw error;
    }
  }

  async mapPincodesToAreas(pincodes: string[]): Promise<Area[]> {
    if (pincodes.length === 0) return [];
    try {
      const response = await apiService.post<ApiResponse<{ areas: Area[] }>>(
        '/api/areas/from-pincodes',
        { pincodes }
      );
      return response.data.areas;
    } catch (error) {
      console.error('Error mapping pincodes to areas:', error);
      throw error;
    }
  }

  async listAreas(params: {
    status?: AreaStatus;
    city?: string;
    state?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<AreaListResponse> {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.city) query.append('city', params.city);
    if (params.state) query.append('state', params.state);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    const qs = query.toString();
    try {
      const response = await apiService.get<ApiResponse<AreaListResponse>>(
        `/api/areas${qs ? `?${qs}` : ''}`
      );
      return response.data;
    } catch (error) {
      console.error('Error listing areas:', error);
      throw error;
    }
  }

  async approveArea(id: string): Promise<Area> {
    try {
      const response = await apiService.patch<ApiResponse<{ area: Area }>>(
        `/api/areas/${id}/approve`
      );
      return response.data.area;
    } catch (error) {
      console.error('Error approving area:', error);
      throw error;
    }
  }

  async rejectArea(id: string, reason?: string): Promise<Area> {
    try {
      const response = await apiService.patch<ApiResponse<{ area: Area }>>(
        `/api/areas/${id}/reject`,
        reason ? { reason } : {}
      );
      return response.data.area;
    } catch (error) {
      console.error('Error rejecting area:', error);
      throw error;
    }
  }
}

export type AreaStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_REVIEW';

export interface AreaListResponse {
  areas: Area[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

const areaService = new AreaService();
export default areaService;
