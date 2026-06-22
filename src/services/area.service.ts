import { apiService } from './api.enhanced.service';
import {
  ApiResponse,
  Area,
  AreaAutocompleteResponse,
  AreaAutocompleteSuggestion,
  NearbyAreasMeta,
  NearbyAreasResponse,
  ResolveAreaResponse,
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

    // Backend caps the ?ids= query string at 2000 chars.
    // Each ObjectId is 24 chars + 1 comma = 25 chars per ID, so we cap each
    // batch at 70 IDs (~1750 chars + slack for the path itself).
    const BATCH_SIZE = 70;
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      batches.push(ids.slice(i, i + BATCH_SIZE));
    }

    try {
      const responses = await Promise.all(
        batches.map((batch) => {
          const query = new URLSearchParams({ ids: batch.join(',') });
          return apiService.get<ApiResponse<{ areas: Area[] }>>(
            `/api/areas?${query.toString()}`,
          );
        }),
      );
      // Concatenate + dedupe (in case backend returns overlaps across batches)
      const all = responses.flatMap((r) => r.data.areas);
      const seen = new Set<string>();
      const unique: Area[] = [];
      for (const a of all) {
        if (!seen.has(a._id)) {
          seen.add(a._id);
          unique.push(a);
        }
      }
      return unique;
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

  /**
   * Server-side autocomplete: local DB matches + Google Places suggestions.
   * Used by the area picker so any locality (Navalakha, etc.) is discoverable.
   */
  async autocompleteAreas(
    query: string,
    latitude?: number,
    longitude?: number,
    radiusKm?: number,
  ): Promise<AreaAutocompleteSuggestion[]> {
    const q = (query || '').trim();
    if (q.length < 2) return [];
    const params = new URLSearchParams({ q });
    if (latitude != null && longitude != null) {
      params.append('latitude', latitude.toString());
      params.append('longitude', longitude.toString());
    }
    if (radiusKm != null) params.append('radiusKm', radiusKm.toString());

    try {
      const response = await apiService.get<ApiResponse<AreaAutocompleteResponse>>(
        `/api/areas/autocomplete?${params.toString()}`,
      );
      return response.data.suggestions;
    } catch (error) {
      console.error('Error in area autocomplete:', error);
      throw error;
    }
  }

  /**
   * Hydrate a Google Place pick into a saved Area row. Idempotent.
   */
  async resolveArea(placeId: string, name?: string): Promise<ResolveAreaResponse['area']> {
    try {
      const response = await apiService.post<ApiResponse<ResolveAreaResponse>>(
        '/api/areas/resolve',
        { placeId, ...(name ? { name } : {}) },
      );
      return response.data.area;
    } catch (error) {
      console.error('Error resolving area:', error);
      throw error;
    }
  }
}

const areaService = new AreaService();
export default areaService;
