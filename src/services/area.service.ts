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

export interface ReverseGeocodeResult {
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  placeId: string;
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

  /**
   * Server-side proxy to Google Geocoding. The backend holds the API key.
   * Used by the kitchen-form "Detect Location" flow to auto-fill the address.
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    const query = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    });
    try {
      const response = await apiService.get<ApiResponse<ReverseGeocodeResult>>(
        `/api/areas/reverse-geocode?${query.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error reverse-geocoding:', error);
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
}

const areaService = new AreaService();
export default areaService;
