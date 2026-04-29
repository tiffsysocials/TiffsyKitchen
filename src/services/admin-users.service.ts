/**
 * Admin Users Management Service
 *
 * Handles all API operations for admin user management
 * Based on API endpoint: /api/admin/users
 */

import { apiService } from './api.service';
import {
  User,
  UserListResponse,
  UserDetailsResponse,
  UserRole,
  UserStatus,
  PaginationParams,
} from '../types/api.types';

export interface GetUsersParams extends PaginationParams {
  role?: UserRole;
  status?: UserStatus;
  kitchenId?: string;
  search?: string;
}

export interface CreateUserRequest {
  phone: string;
  role: UserRole;
  name: string;
  email?: string;
  kitchenId?: string; // Required for KITCHEN_STAFF
  username?: string; // Required for ADMIN
  password?: string; // Required for ADMIN
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  kitchenId?: string;
}

export interface SuspendUserRequest {
  reason: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

class AdminUsersService {
  /**
   * Get list of users with optional filters
   * GET /api/admin/users
   */
  async getUsers(params?: GetUsersParams): Promise<UserListResponse> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const queryString = queryParams.toString();
    const endpoint = `/api/admin/users${queryString ? `?${queryString}` : ''}`;

    const response = await apiService.get<any>(endpoint);

    return response.data;
  }

  /**
   * Get single user details by ID
   * GET /api/admin/users/:id
   */
  async getUserById(userId: string): Promise<UserDetailsResponse> {
    const response = await apiService.get<any>(`/api/admin/users/${userId}`);

    return response.data;
  }

  /**
   * Create new user (Staff/Driver/Admin)
   * POST /api/admin/users
   */
  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await apiService.post<any>('/api/admin/users', data);

    return response.data?.user || response.data;
  }

  /**
   * Update user details
   * PUT /api/admin/users/:id
   */
  async updateUser(userId: string, data: UpdateUserRequest): Promise<User> {
    const response = await apiService.put<any>(`/api/admin/users/${userId}`, data);

    return response.data?.user || response.data;
  }

  /**
   * Activate user
   * PATCH /api/admin/users/:id/activate
   */
  async activateUser(userId: string): Promise<User> {
    const response = await apiService.patch<any>(`/api/admin/users/${userId}/activate`, {});

    return response.data?.user || response.data;
  }

  /**
   * Deactivate user
   * PATCH /api/admin/users/:id/deactivate
   */
  async deactivateUser(userId: string): Promise<User> {
    const response = await apiService.patch<any>(`/api/admin/users/${userId}/deactivate`, {});

    return response.data?.user || response.data;
  }

  /**
   * Suspend user with reason
   * PATCH /api/admin/users/:id/suspend
   */
  async suspendUser(userId: string, data: SuspendUserRequest): Promise<User> {
    const response = await apiService.patch<any>(`/api/admin/users/${userId}/suspend`, data);

    return response.data?.user || response.data;
  }

  /**
   * Delete user (soft delete)
   * DELETE /api/admin/users/:id
   */
  async deleteUser(userId: string): Promise<void> {
    await apiService.delete<{
      success: boolean;
      message: string;
    }>(`/api/admin/users/${userId}`);
  }

  /**
   * Reset password for admin users
   * POST /api/admin/users/:id/reset-password
   */
  async resetPassword(userId: string, data: ResetPasswordRequest): Promise<void> {
    await apiService.post<{
      success: boolean;
      message: string;
    }>(`/api/admin/users/${userId}/reset-password`, data);
  }

  /**
   * Get dashboard statistics
   * GET /api/admin/dashboard
   */
  async getDashboardStats(): Promise<any> {
    const response = await apiService.get<{
      success: boolean;
      data: any;
    }>('/api/admin/dashboard');

    return response.data;
  }

  /**
   * Helper methods for filtering by role
   */
  async getCustomers(params?: Omit<GetUsersParams, 'role'>): Promise<UserListResponse> {
    return this.getUsers({ ...params, role: 'CUSTOMER' });
  }

  async getKitchenStaff(params?: Omit<GetUsersParams, 'role'>): Promise<UserListResponse> {
    return this.getUsers({ ...params, role: 'KITCHEN_STAFF' });
  }

  async getDrivers(params?: Omit<GetUsersParams, 'role'>): Promise<UserListResponse> {
    return this.getUsers({ ...params, role: 'DRIVER' });
  }

  async getAdmins(params?: Omit<GetUsersParams, 'role'>): Promise<UserListResponse> {
    return this.getUsers({ ...params, role: 'ADMIN' });
  }

  /**
   * Helper methods for filtering by status
   */
  async getActiveUsers(params?: Omit<GetUsersParams, 'status'>): Promise<UserListResponse> {
    return this.getUsers({ ...params, status: 'ACTIVE' });
  }

  async getInactiveUsers(params?: Omit<GetUsersParams, 'status'>): Promise<UserListResponse> {
    return this.getUsers({ ...params, status: 'INACTIVE' });
  }

  async getSuspendedUsers(params?: Omit<GetUsersParams, 'status'>): Promise<UserListResponse> {
    return this.getUsers({ ...params, status: 'SUSPENDED' });
  }

  /**
   * Search users by name or phone
   */
  async searchUsers(query: string, role?: UserRole): Promise<User[]> {
    const response = await this.getUsers({ search: query, role });
    return response.users;
  }
}

export const adminUsersService = new AdminUsersService();
