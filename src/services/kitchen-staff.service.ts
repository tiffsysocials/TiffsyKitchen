/**
 * Kitchen Staff Service
 * Handles kitchen staff-specific API calls for approval status, dashboard, and resubmission
 */

import { apiService } from './api.enhanced.service';
import type { Kitchen } from '../types/api.types';

export interface MyKitchenStatusResponse {
  success: boolean;
  message: string;
  data: {
    kitchen: Kitchen;
    status: string;
    rejectionReason?: string;
    rejectedAt?: string;
    rejectedBy?: {
      _id: string;
      name: string;
    };
    canResubmit: boolean;
  };
}

export interface KitchenDashboardStatsResponse {
  success: boolean;
  message: string;
  data: {
    kitchen: Kitchen;
    todayStats: {
      ordersCount: number;
      ordersRevenue: number;
      pendingAcceptanceOrders: number;
      pendingOrders: number;
      acceptedOrders: number;
      preparingOrders: number;
      readyOrders: number;
      completedOrders: number;
      cancelledOrders: number;
      lunchOrders: number;
      lunchRevenue: number;
      dinnerOrders: number;
      dinnerRevenue: number;
    };
    batchStats: {
      collectingBatches: number;
      readyBatches: number;
      dispatchedBatches: number;
      inProgressBatches: number;
      completedBatches: number;
    };
    menuStats: {
      totalMenuItems: number;
      activeMenuItems: number;
      unavailableItems: number;
    };
    recentOrders: Array<{
      _id: string;
      orderNumber: string;
      status: string;
      totalAmount: number;
      placedAt: string;
    }>;
  };
}

export interface MenuStatsResponse {
  success: boolean;
  message: string;
  data: {
    totalItems: number;
    activeItems: number;
    availableItems: number;
    inactiveItems: number;
    byCategory: Record<string, number>;
    byMenuType: {
      MEAL_MENU: number;
      ON_DEMAND_MENU: number;
    };
    mealMenuStatus: {
      lunch: {
        exists: boolean;
        item?: {
          name: string;
          price: number;
          isAvailable: boolean;
        };
        isAvailable: boolean;
      };
      dinner: {
        exists: boolean;
        item?: {
          name: string;
          price: number;
          isAvailable: boolean;
        };
        isAvailable: boolean;
      };
    };
  };
}

export interface ResubmitKitchenRequest {
  name?: string;
  cuisineTypes?: string[];
  logo?: string;
  coverImage?: string;
  description?: string;
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    locality?: string;
    city?: string;
    state?: string;
    pincode?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  contactPhone?: string;
  contactEmail?: string;
  ownerName?: string;
  ownerPhone?: string;
  zonesServed?: string[];
  operatingHours?: {
    lunch?: { startTime: string; endTime: string };
    dinner?: { startTime: string; endTime: string };
    onDemand?: { startTime: string; endTime: string; isAlwaysOpen: boolean };
  };
}

export interface KitchenAnalyticsResponse {
  success: boolean;
  message: string;
  data: {
    period: {
      from: string;
      to: string;
      groupBy: 'day' | 'week' | 'month';
    };
    summary: {
      totalOrders: number;
      totalRevenue: number;
      averageOrderValue: number;
      completionRate: number;
      cancelRate: number;
    };
    timeline: Array<{
      period: string;
      orders: number;
      revenue: number;
      completed: number;
      cancelled: number;
    }>;
    topItems: Array<{
      _id: string;
      name: string;
      ordersCount: number;
      revenue: number;
    }>;
  };
}

class KitchenStaffService {
  private readonly AUTH_BASE_PATH = '/api/auth';
  private readonly KITCHEN_BASE_PATH = '/api/kitchens';
  private readonly MENU_BASE_PATH = '/api/menu';

  /**
   * Get my kitchen approval status
   * Checks if kitchen is pending, approved, or rejected
   */
  async getMyKitchenStatus(): Promise<MyKitchenStatusResponse> {
    try {
      const endpoint = `${this.AUTH_BASE_PATH}/my-kitchen-status`;
      console.log('🔍 Fetching my kitchen status from:', endpoint);
      const response = await apiService.get<MyKitchenStatusResponse>(endpoint);
      console.log('🔍 Kitchen status response:', JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch kitchen status:', error);
      throw error;
    }
  }

  /**
   * Resubmit kitchen application after rejection
   * Updates kitchen details and clears rejection fields
   */
  async resubmitKitchen(updates: ResubmitKitchenRequest): Promise<MyKitchenStatusResponse> {
    try {
      const endpoint = `${this.AUTH_BASE_PATH}/resubmit-kitchen`;
      console.log('🔄 Resubmitting kitchen application at:', endpoint);
      console.log('🔄 Updates:', JSON.stringify(updates, null, 2));
      const response = await apiService.patch<MyKitchenStatusResponse>(endpoint, updates);
      console.log('🔄 Resubmit response:', JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error('❌ Failed to resubmit kitchen:', error);
      throw error;
    }
  }

  /**
   * Get kitchen dashboard statistics
   * Includes today's orders, revenue, batch stats, menu stats, and recent orders
   */
  async getDashboardStats(date?: string): Promise<KitchenDashboardStatsResponse> {
    try {
      const queryParams = date ? `?date=${date}` : '';
      const endpoint = `${this.KITCHEN_BASE_PATH}/dashboard${queryParams}`;
      console.log('📊 Fetching kitchen dashboard stats from:', endpoint);
      const response = await apiService.get<KitchenDashboardStatsResponse>(endpoint);
      console.log('📊 Dashboard stats response:', JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get menu statistics for my kitchen
   * Includes total items, active/inactive counts, category breakdown, and meal menu status
   */
  async getMenuStats(): Promise<MenuStatsResponse> {
    try {
      const endpoint = `${this.MENU_BASE_PATH}/my-kitchen/stats`;
      console.log('🍽️ Fetching menu stats from:', endpoint);
      const response = await apiService.get<MenuStatsResponse>(endpoint);
      console.log('🍽️ Menu stats response:', JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch menu stats:', error);
      throw error;
    }
  }

  /**
   * Get kitchen analytics for date range
   * Supports grouping by day, week, or month
   */
  async getKitchenAnalytics(params: {
    dateFrom: string;
    dateTo: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<KitchenAnalyticsResponse> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('dateFrom', params.dateFrom);
      queryParams.append('dateTo', params.dateTo);
      if (params.groupBy) {
        queryParams.append('groupBy', params.groupBy);
      }

      const endpoint = `${this.KITCHEN_BASE_PATH}/analytics?${queryParams}`;
      console.log('📈 Fetching kitchen analytics from:', endpoint);
      const response = await apiService.get<KitchenAnalyticsResponse>(endpoint);
      console.log('📈 Analytics response:', JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch analytics:', error);
      throw error;
    }
  }
}

export const kitchenStaffService = new KitchenStaffService();
