/**
 * Banner Service
 *
 * Handles all API operations for home screen banner management.
 * POST/PUT use multipart/form-data (file upload).
 */

import { apiService } from './api.service';

export interface Banner {
  _id: string;
  image_url: string;
  title?: string;
  redirect_link?: string;
  status: 'active' | 'inactive';
  display_order: number;
  createdAt: string;
  updatedAt: string;
}

export interface BannerListResponse {
  count: number;
  banners: Banner[];
}

export interface CreateBannerRequest {
  file: {
    uri: string;
    name: string;
    type: string;
  };
  title?: string;
  redirect_link?: string;
  status?: 'active' | 'inactive';
  display_order?: number;
}

export interface UpdateBannerRequest {
  file?: {
    uri: string;
    name: string;
    type: string;
  };
  title?: string;
  redirect_link?: string;
  status?: 'active' | 'inactive';
  display_order?: number;
}

class BannerService {
  /**
   * GET /api/banners/admin — all banners (active + inactive)
   */
  async getBanners(): Promise<BannerListResponse> {
    const response = await apiService.get<{
      success: boolean;
      message: string;
      data: BannerListResponse;
    }>('/api/banners/admin');
    return response.data;
  }

  /**
   * POST /api/banners/admin — upload new banner (multipart/form-data)
   */
  async createBanner(request: CreateBannerRequest): Promise<Banner> {
    const formData = new FormData();

    formData.append('file', {
      uri: request.file.uri,
      name: request.file.name,
      type: request.file.type,
    } as any);

    if (request.title !== undefined) formData.append('title', request.title);
    if (request.redirect_link !== undefined) formData.append('redirect_link', request.redirect_link);
    if (request.status !== undefined) formData.append('status', request.status);
    if (request.display_order !== undefined) formData.append('display_order', String(request.display_order));

    const response = await apiService.postMultipart<{
      success: boolean;
      message: string;
      data: { banner: Banner };
    }>('/api/banners/admin', formData);

    return response.data.banner;
  }

  /**
   * PUT /api/banners/admin/:id — update banner image/details (multipart/form-data)
   */
  async updateBanner(bannerId: string, request: UpdateBannerRequest): Promise<Banner> {
    const formData = new FormData();

    if (request.file) {
      formData.append('file', {
        uri: request.file.uri,
        name: request.file.name,
        type: request.file.type,
      } as any);
    }

    if (request.title !== undefined) formData.append('title', request.title);
    if (request.redirect_link !== undefined) formData.append('redirect_link', request.redirect_link);
    if (request.status !== undefined) formData.append('status', request.status);
    if (request.display_order !== undefined) formData.append('display_order', String(request.display_order));

    const response = await apiService.putMultipart<{
      success: boolean;
      message: string;
      data: { banner: Banner };
    }>(`/api/banners/admin/${bannerId}`, formData);

    return response.data.banner;
  }

  /**
   * PATCH /api/banners/admin/:id/status — toggle active/inactive
   */
  async toggleStatus(bannerId: string, status: 'active' | 'inactive'): Promise<Banner> {
    const response = await apiService.patch<{
      success: boolean;
      message: string;
      data: { banner: Banner };
    }>(`/api/banners/admin/${bannerId}/status`, { status });

    return response.data.banner;
  }

  /**
   * DELETE /api/banners/admin/:id
   */
  async deleteBanner(bannerId: string): Promise<void> {
    await apiService.delete(`/api/banners/admin/${bannerId}`);
  }
}

export const bannerService = new BannerService();
