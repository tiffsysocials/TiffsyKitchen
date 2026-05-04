/**
 * Addon Service
 *
 * Handles all API operations related to add-ons management
 * Based on API documentation for /api/addons endpoints
 */

import { apiService } from './api.service';
import {
  Addon,
  AddonListResponse,
  AddonDetailsResponse,
  AddonLibraryResponse,
  AddonsForMenuItemResponse,
  CreateAddonRequest,
  UpdateAddonRequest,
  DietaryType,
} from '../types/api.types';

export interface GetAddonsParams {
  kitchenId?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  isAvailable?: boolean;
  dietaryType?: DietaryType;
  search?: string;
  page?: number;
  limit?: number;
}

class AddonService {
  /**
   * Get list of add-ons with optional filters
   * GET /api/addons
   */
  async getAddons(params?: GetAddonsParams): Promise<AddonListResponse> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const queryString = queryParams.toString();
    const endpoint = `/api/addons${queryString ? `?${queryString}` : ''}`;

    const response = await apiService.get<{
      success: boolean;
      message: string;
      data: AddonListResponse;
    }>(endpoint);

    return response.data;
  }

  /**
   * Get single add-on by ID
   * GET /api/addons/:id
   */
  async getAddonById(addonId: string): Promise<AddonDetailsResponse> {
    const response = await apiService.get<{
      success: boolean;
      message: string;
      data: AddonDetailsResponse;
    }>(`/api/addons/${addonId}`);

    return response.data;
  }

  /**
   * Build multipart FormData from an addon request payload.
   * Skips undefined fields. Numbers/booleans are serialized to strings as required by multipart.
   */
  private buildAddonFormData(data: CreateAddonRequest | UpdateAddonRequest): FormData {
    const formData = new FormData();

    if (data.imageFile) {
      formData.append('file', {
        uri: data.imageFile.uri,
        name: data.imageFile.name,
        type: data.imageFile.type,
      } as any);
    }

    const appendIfDefined = (key: string, value: unknown) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    };

    appendIfDefined('kitchenId', (data as CreateAddonRequest).kitchenId);
    appendIfDefined('name', data.name);
    appendIfDefined('description', data.description);
    appendIfDefined('price', data.price);
    appendIfDefined('dietaryType', data.dietaryType);
    // Allow clearing/keeping an existing URL when no new file is supplied
    if (!data.imageFile) appendIfDefined('image', data.image);
    appendIfDefined('minQuantity', data.minQuantity);
    appendIfDefined('maxQuantity', data.maxQuantity);
    appendIfDefined('isAvailable', data.isAvailable);
    appendIfDefined('displayOrder', data.displayOrder);

    return formData;
  }

  /**
   * Create new add-on
   * POST /api/addons (multipart/form-data)
   */
  async createAddon(data: CreateAddonRequest): Promise<Addon> {
    const formData = this.buildAddonFormData(data);

    const response = await apiService.postMultipart<{
      success: boolean;
      message: string;
      data: { addon: Addon };
    }>('/api/addons', formData);

    return response.data.addon;
  }

  /**
   * Update add-on
   * PUT /api/addons/:id (multipart/form-data)
   */
  async updateAddon(addonId: string, data: UpdateAddonRequest): Promise<Addon> {
    const formData = this.buildAddonFormData(data);

    const response = await apiService.putMultipart<{
      success: boolean;
      message: string;
      data: { addon: Addon };
    }>(`/api/addons/${addonId}`, formData);

    return response.data.addon;
  }

  /**
   * Delete add-on (soft delete and removes from all menu items)
   * DELETE /api/addons/:id
   */
  async deleteAddon(addonId: string): Promise<boolean> {
    const response = await apiService.delete<{
      success: boolean;
      message: string;
    }>(`/api/addons/${addonId}`);

    return response.success;
  }

  /**
   * Toggle add-on availability
   * PATCH /api/addons/:id/availability
   */
  async toggleAvailability(addonId: string, isAvailable: boolean): Promise<{ isAvailable: boolean }> {
    const response = await apiService.patch<{
      success: boolean;
      message: string;
      data: { isAvailable: boolean };
    }>(`/api/addons/${addonId}/availability`, { isAvailable });

    return response.data;
  }

  /**
   * Get complete add-on library for a kitchen with usage stats
   * GET /api/addons/library/:kitchenId
   */
  async getAddonLibrary(kitchenId: string): Promise<AddonLibraryResponse> {
    const response = await apiService.get<{
      success: boolean;
      message: string;
      data: AddonLibraryResponse;
    }>(`/api/addons/library/${kitchenId}`);

    return response.data;
  }

  /**
   * Get add-ons available for a menu item (shows attached vs available)
   * GET /api/addons/for-menu-item/:menuItemId
   */
  async getAddonsForMenuItem(menuItemId: string): Promise<AddonsForMenuItemResponse> {
    const response = await apiService.get<{
      success: boolean;
      message: string;
      data: AddonsForMenuItemResponse;
    }>(`/api/addons/for-menu-item/${menuItemId}`);

    return response.data;
  }

  /**
   * Get add-ons filtered by kitchen
   */
  async getAddonsByKitchen(kitchenId: string): Promise<Addon[]> {
    const response = await this.getAddons({ kitchenId });
    return response.addons;
  }

  /**
   * Get only available add-ons
   */
  async getAvailableAddons(kitchenId: string): Promise<Addon[]> {
    const response = await this.getAddons({ kitchenId, isAvailable: true });
    return response.addons;
  }

  /**
   * Search add-ons
   */
  async searchAddons(kitchenId: string, query: string): Promise<Addon[]> {
    const response = await this.getAddons({ kitchenId, search: query });
    return response.addons;
  }

  /**
   * Get add-ons by dietary type
   */
  async getAddonsByDietaryType(kitchenId: string, dietaryType: DietaryType): Promise<Addon[]> {
    const response = await this.getAddons({ kitchenId, dietaryType });
    return response.addons;
  }
}

export const addonService = new AddonService();
