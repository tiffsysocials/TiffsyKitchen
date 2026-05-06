import { apiService, BASE_URL } from './api.enhanced.service';
import {
  Kitchen,
  KitchenListResponse,
  KitchenDetailsResponse,
  KitchenStatus,
  KitchenType,
  ApiResponse,
  Address,
  OperatingHours,
} from '../types/api.types';

/**
 * Kitchen Service
 * Handles all kitchen management API calls
 */

export interface GetKitchensParams {
  type?: KitchenType;
  status?: KitchenStatus;
  zoneId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateKitchenRequest {
  name: string;
  type: KitchenType;
  authorizedFlag?: boolean;
  premiumFlag?: boolean;
  gourmetFlag?: boolean;
  logo?: string;
  coverImage?: string;
  description?: string;
  cuisineTypes: string[];
  address: Address;
  serviceableAreas: string[];
  operatingHours: OperatingHours;
  contactPhone?: string;
  contactEmail?: string;
  ownerName?: string;
  ownerPhone?: string;
}

export interface UpdateKitchenRequest {
  name?: string;
  description?: string;
  cuisineTypes?: string[];
  address?: Address;
  operatingHours?: OperatingHours;
  contactPhone?: string;
  contactEmail?: string;
  ownerName?: string;
  ownerPhone?: string;
  logo?: string;
  coverImage?: string;
}

export interface UpdateFlagsRequest {
  authorizedFlag?: boolean;
  premiumFlag?: boolean;
  gourmetFlag?: boolean;
}

export interface UpdateServiceableAreasRequest {
  serviceableAreas: string[];
}

export interface SuspendKitchenRequest {
  reason: string;
}

export interface ToggleOrdersRequest {
  isAcceptingOrders: boolean;
}

export interface RegisterKitchenWithOtpRequest {
  name: string;
  cuisineTypes: string[];
  address: Address;
  serviceableAreas: string[];
  operatingHours: OperatingHours;
  contactPhone: string;
  contactEmail?: string;
  ownerName: string;
  staffName: string;
  staffEmail?: string;
  logo?: string;
  coverImage?: string;
}

export interface RegisterKitchenWithOtpResponse {
  kitchen: Kitchen;
  user: {
    _id: string;
    phone: string;
    name: string;
    email?: string;
    role: 'KITCHEN_STAFF';
    kitchenId: string;
    status: string;
  };
  approvalStatus: 'PENDING';
  message: string;
  token: string;
  expiresIn: number;
}

class KitchenService {
  /**
   * Get all kitchens with optional filters
   */
  async getKitchens(params?: GetKitchensParams): Promise<KitchenListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.type) queryParams.append('type', params.type);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.zoneId) queryParams.append('zoneId', params.zoneId);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const queryString = queryParams.toString();
      const endpoint = `/api/kitchens${queryString ? `?${queryString}` : ''}`;

      const response = await apiService.get<ApiResponse<KitchenListResponse>>(endpoint);
      return response.data;
    } catch (error) {
      console.error('Error fetching kitchens:', error);
      throw error;
    }
  }

  /**
   * Get kitchen by ID
   */
  async getKitchenById(kitchenId: string): Promise<KitchenDetailsResponse> {
    try {
      const response = await apiService.get<ApiResponse<KitchenDetailsResponse>>(
        `/api/kitchens/${kitchenId}?populate=zonesServed,areasServed`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching kitchen:', error);
      throw error;
    }
  }

  /**
   * Create a new kitchen
   */
  async createKitchen(data: CreateKitchenRequest): Promise<Kitchen> {
    try {
      const response = await apiService.post<ApiResponse<{ kitchen: Kitchen }>>(
        '/api/kitchens',
        data
      );
      return response.data.kitchen;
    } catch (error) {
      console.error('Error creating kitchen:', error);
      throw error;
    }
  }

  /**
   * Update kitchen details (Admin only)
   */
  async updateKitchen(kitchenId: string, data: UpdateKitchenRequest): Promise<Kitchen> {
    try {
      const response = await apiService.put<ApiResponse<{ kitchen: Kitchen }>>(
        `/api/kitchens/${kitchenId}`,
        data
      );
      return response.data.kitchen;
    } catch (error) {
      console.error('Error updating kitchen:', error);
      throw error;
    }
  }

  /**
   * Update own kitchen details (Kitchen Staff)
   * Kitchen staff can update their own kitchen's details
   */
  async updateMyKitchen(data: UpdateKitchenRequest & { address?: Address }): Promise<Kitchen> {
    try {
      const response = await apiService.put<ApiResponse<{ kitchen: Kitchen }>>(
        '/api/kitchens/my-kitchen',
        data
      );
      return response.data.kitchen;
    } catch (error) {
      console.error('Error updating my kitchen:', error);
      throw error;
    }
  }

  /**
   * Update kitchen type (TIFFSY/PARTNER)
   */
  async updateKitchenType(kitchenId: string, type: KitchenType): Promise<Kitchen> {
    try {
      const response = await apiService.patch<ApiResponse<{ kitchen: Kitchen }>>(
        `/api/kitchens/${kitchenId}/type`,
        { type }
      );
      return response.data.kitchen;
    } catch (error) {
      console.error('Error updating kitchen type:', error);
      throw error;
    }
  }

  /**
   * Update kitchen flags (authorized/premium/gourmet)
   */
  async updateFlags(kitchenId: string, data: UpdateFlagsRequest): Promise<Kitchen> {
    try {
      const response = await apiService.patch<ApiResponse<{ kitchen: Kitchen }>>(
        `/api/kitchens/${kitchenId}/flags`,
        data
      );
      return response.data.kitchen;
    } catch (error) {
      console.error('Error updating kitchen flags:', error);
      throw error;
    }
  }

  async updateServiceableAreas(
    kitchenId: string,
    data: UpdateServiceableAreasRequest
  ): Promise<Kitchen> {
    try {
      const response = await apiService.patch<ApiResponse<{ kitchen: Kitchen }>>(
        `/api/kitchens/${kitchenId}/areas`,
        data
      );
      return response.data.kitchen;
    } catch (error) {
      console.error('Error updating kitchen serviceable areas:', error);
      throw error;
    }
  }

  /**
   * Activate kitchen
   */
  async activateKitchen(kitchenId: string): Promise<Kitchen> {
    try {
      const response = await apiService.patch<ApiResponse<{ kitchen: Kitchen }>>(
        `/api/kitchens/${kitchenId}/activate`
      );
      return response.data.kitchen;
    } catch (error) {
      console.error('Error activating kitchen:', error);
      throw error;
    }
  }

  /**
   * Deactivate kitchen
   */
  async deactivateKitchen(kitchenId: string): Promise<Kitchen> {
    try {
      const response = await apiService.patch<ApiResponse<{ kitchen: Kitchen }>>(
        `/api/kitchens/${kitchenId}/deactivate`
      );
      return response.data.kitchen;
    } catch (error) {
      console.error('Error deactivating kitchen:', error);
      throw error;
    }
  }

  /**
   * Suspend kitchen with reason
   */
  async suspendKitchen(kitchenId: string, data: SuspendKitchenRequest): Promise<Kitchen> {
    try {
      const response = await apiService.patch<ApiResponse<{ kitchen: Kitchen }>>(
        `/api/kitchens/${kitchenId}/suspend`,
        data
      );
      return response.data.kitchen;
    } catch (error) {
      console.error('Error suspending kitchen:', error);
      throw error;
    }
  }

  /**
   * Toggle order acceptance
   */
  async toggleAcceptingOrders(kitchenId: string, isAcceptingOrders: boolean): Promise<Kitchen> {
    try {
      const response = await apiService.patch<ApiResponse<{ kitchen: Kitchen }>>(
        `/api/kitchens/${kitchenId}/accepting-orders`,
        { isAcceptingOrders }
      );
      return response.data.kitchen;
    } catch (error) {
      console.error('Error toggling order acceptance:', error);
      throw error;
    }
  }

  /**
   * Delete kitchen (soft delete)
   */
  async deleteKitchen(kitchenId: string): Promise<void> {
    try {
      await apiService.delete(`/api/kitchens/${kitchenId}`);
    } catch (error) {
      console.error('Error deleting kitchen:', error);
      throw error;
    }
  }

  /**
   * Get kitchens for a specific zone (public endpoint)
   */
  async getKitchensForZone(zoneId: string, menuType?: 'MEAL_MENU' | 'ON_DEMAND_MENU'): Promise<Kitchen[]> {
    try {
      const queryParams = menuType ? `?menuType=${menuType}` : '';
      const response = await apiService.get<ApiResponse<{ kitchens: Kitchen[] }>>(
        `/api/kitchens/zone/${zoneId}${queryParams}`
      );
      return response.data.kitchens;
    } catch (error) {
      console.error('Error fetching kitchens for zone:', error);
      throw error;
    }
  }

  /**
   * Helper: Get active kitchens only
   */
  async getActiveKitchens(params?: Omit<GetKitchensParams, 'status'>): Promise<KitchenListResponse> {
    return this.getKitchens({ ...params, status: 'ACTIVE' });
  }

  /**
   * Helper: Get TIFFSY kitchens only
   */
  async getTiffsyKitchens(params?: Omit<GetKitchensParams, 'type'>): Promise<KitchenListResponse> {
    return this.getKitchens({ ...params, type: 'TIFFSY' });
  }

  /**
   * Helper: Get PARTNER kitchens only
   */
  async getPartnerKitchens(params?: Omit<GetKitchensParams, 'type'>): Promise<KitchenListResponse> {
    return this.getKitchens({ ...params, type: 'PARTNER' });
  }

  /**
   * Update delivery radii (admin only)
   */
  async updateDeliveryRadii(kitchenId: string, data: { autoAcceptRadiusKm?: number; maxDeliveryRadiusKm?: number }): Promise<Kitchen> {
    try {
      const response = await apiService.patch<ApiResponse<{ kitchen: Kitchen }>>(
        `/api/kitchens/${kitchenId}/delivery-radii`,
        data
      );
      return response.data.kitchen;
    } catch (error) {
      console.error('Error updating delivery radii:', error);
      throw error;
    }
  }

  /**
   * Public kitchen self-registration via OTP registration token.
   * Used by new users (isNewUser=true from verify-otp) to onboard a PARTNER kitchen.
   * Backend creates Kitchen (status=PENDING_APPROVAL) + KITCHEN_STAFF user atomically.
   */
  async registerKitchenWithOtp(
    registrationToken: string,
    payload: RegisterKitchenWithOtpRequest,
  ): Promise<RegisterKitchenWithOtpResponse> {
    console.log('╔═══════════════════════════════════════════════════════════');
    console.log('║ [KITCHEN REGISTER REQUEST]');
    console.log('║ URL:', `${BASE_URL}/api/auth/otp/register-kitchen`);
    console.log('║ Token:', registrationToken.substring(0, 20) + '...');
    console.log('║ Body:', JSON.stringify(payload, null, 2));
    console.log('╚═══════════════════════════════════════════════════════════');

    const response = await fetch(`${BASE_URL}/api/auth/otp/register-kitchen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${registrationToken}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    console.log('╔═══════════════════════════════════════════════════════════');
    console.log('║ [KITCHEN REGISTER RESPONSE]');
    console.log('║ Status:', response.status);
    console.log('║ Body:', JSON.stringify(json, null, 2));
    console.log('╚═══════════════════════════════════════════════════════════');

    if (!response.ok || json?.success === false) {
      throw new Error(json?.message || json?.error || `Kitchen registration failed (${response.status})`);
    }
    return json.data as RegisterKitchenWithOtpResponse;
  }

  /**
   * Accept a pending kitchen acceptance order
   */
  async acceptPendingOrder(kitchenId: string, orderId: string): Promise<any> {
    try {
      const response = await apiService.post(
        `/api/kitchens/${kitchenId}/orders/${orderId}/accept`
      );
      return response.data;
    } catch (error) {
      console.error('Error accepting pending order:', error);
      throw error;
    }
  }

  /**
   * Reject a pending kitchen acceptance order
   */
  async rejectPendingOrder(kitchenId: string, orderId: string, reason: string): Promise<any> {
    try {
      const response = await apiService.post(
        `/api/kitchens/${kitchenId}/orders/${orderId}/reject`,
        { reason }
      );
      return response.data;
    } catch (error) {
      console.error('Error rejecting pending order:', error);
      throw error;
    }
  }
}

// Export singleton instance
const kitchenService = new KitchenService();
export default kitchenService;
