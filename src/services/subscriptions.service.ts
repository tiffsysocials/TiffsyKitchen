/**
 * Subscription Plans API Service
 *
 * Handles all API calls related to subscription plans and customer subscriptions
 */

import { apiService } from './api.enhanced.service';
import {
  SubscriptionPlan,
  PlanListResponse,
  CreatePlanRequest,
  UpdatePlanRequest,
  PlanFilters,
  Subscription,
  SubscriptionListResponse,
  SubscriptionDetail,
  SubscriptionFilters,
  CancelSubscriptionRequest,
} from '../types/subscription.types';

// ============================================================================
// Plan Management
// ============================================================================

/**
 * Get all subscription plans with filters
 */
export const getPlans = async (filters?: PlanFilters): Promise<PlanListResponse> => {
  const queryParams = new URLSearchParams();

  if (filters?.status) {
    queryParams.append('status', filters.status);
  }
  if (filters?.page) {
    queryParams.append('page', filters.page.toString());
  }
  if (filters?.limit) {
    queryParams.append('limit', filters.limit.toString());
  }

  const queryString = queryParams.toString();
  const endpoint = `/api/subscriptions/plans${queryString ? `?${queryString}` : ''}`;

  const response = await apiService.get<{ plans: SubscriptionPlan[]; pagination: any }>(endpoint);
  return response.data;
};

/**
 * Get single plan by ID
 */
export const getPlanById = async (planId: string): Promise<SubscriptionPlan> => {
  const response = await apiService.get<{ plan: SubscriptionPlan }>(`/api/subscriptions/plans/${planId}`);
  return response.data.plan;
};

/**
 * Create new subscription plan
 */
export const createPlan = async (planData: CreatePlanRequest): Promise<SubscriptionPlan> => {
  const response = await apiService.post<{ plan: SubscriptionPlan }>('/api/subscriptions/plans', planData);
  return response.data.plan;
};

/**
 * Update existing plan.
 *
 * `warning` is set by the backend when the plan has active subscribers and
 * some submitted fields (e.g. price) were locked and silently skipped —
 * callers should surface it or the admin thinks every field saved.
 */
export const updatePlan = async (
  planId: string,
  planData: UpdatePlanRequest
): Promise<{ plan: SubscriptionPlan; warning?: string }> => {
  const response = await apiService.put<{ plan: SubscriptionPlan; warning?: string }>(
    `/api/subscriptions/plans/${planId}`,
    planData
  );
  return response.data;
};

/**
 * Activate plan
 */
export const activatePlan = async (planId: string): Promise<SubscriptionPlan> => {
  const response = await apiService.patch<{ plan: SubscriptionPlan }>(`/api/subscriptions/plans/${planId}/activate`);
  return response.data.plan;
};

/**
 * Deactivate plan
 */
export const deactivatePlan = async (planId: string): Promise<SubscriptionPlan> => {
  const response = await apiService.patch<{ plan: SubscriptionPlan }>(`/api/subscriptions/plans/${planId}/deactivate`);
  return response.data.plan;
};

/**
 * Archive plan (permanent)
 */
export const archivePlan = async (planId: string): Promise<SubscriptionPlan> => {
  const response = await apiService.patch<{ plan: SubscriptionPlan }>(`/api/subscriptions/plans/${planId}/archive`);
  return response.data.plan;
};

/**
 * Get active plans (public-facing)
 */
export const getActivePlans = async (zoneId?: string): Promise<SubscriptionPlan[]> => {
  const endpoint = zoneId ? `/api/subscriptions/plans/active?zoneId=${zoneId}` : '/api/subscriptions/plans/active';
  const response = await apiService.get<{ plans: SubscriptionPlan[] }>(endpoint);
  return response.data.plans;
};

// ============================================================================
// Subscription Management (Admin)
// ============================================================================

/**
 * Normalize a raw backend subscription to the frontend Subscription shape.
 *
 * The backend stores these under different names than the app expects:
 *   purchaseDate       -> purchasedAt
 *   voucherExpiryDate  -> expiresAt  (when the customer's vouchers actually
 *                                     expire. Falls back to endDate only for
 *                                     older payloads. We deliberately do NOT use
 *                                     endDate as the primary — endDate is just
 *                                     the plan-duration period (e.g. "60 days"),
 *                                     which is shorter than voucher validity and
 *                                     misled admins into thinking a customer's
 *                                     vouchers expire far earlier than they do.)
 *   totalVouchersIssued -> vouchersIssued
 * Without this mapping dates render as "Invalid Date" and voucher totals are blank.
 */
const normalizeSubscription = (raw: any): Subscription => {
  if (!raw || typeof raw !== 'object') {
    return raw;
  }
  const vouchersIssued = raw.vouchersIssued ?? raw.totalVouchersIssued ?? 0;
  const vouchersUsed = raw.vouchersUsed ?? 0;
  return {
    ...raw,
    purchasedAt: raw.purchasedAt ?? raw.purchaseDate ?? raw.startDate ?? raw.createdAt,
    expiresAt: raw.expiresAt ?? raw.voucherExpiryDate ?? raw.endDate,
    vouchersIssued,
    vouchersUsed,
    vouchersRemaining: raw.vouchersRemaining ?? Math.max(vouchersIssued - vouchersUsed, 0),
  };
};

/**
 * Get all customer subscriptions (admin)
 */
export const getAllSubscriptions = async (filters?: SubscriptionFilters): Promise<SubscriptionListResponse> => {
  const queryParams = new URLSearchParams();

  if (filters?.userId) {
    queryParams.append('userId', filters.userId);
  }
  if (filters?.planId) {
    queryParams.append('planId', filters.planId);
  }
  if (filters?.status) {
    queryParams.append('status', filters.status);
  }
  if (filters?.dateFrom) {
    queryParams.append('dateFrom', filters.dateFrom);
  }
  if (filters?.dateTo) {
    queryParams.append('dateTo', filters.dateTo);
  }
  if (filters?.page) {
    queryParams.append('page', filters.page.toString());
  }
  if (filters?.limit) {
    queryParams.append('limit', filters.limit.toString());
  }

  const queryString = queryParams.toString();
  const endpoint = `/api/subscriptions/admin/all${queryString ? `?${queryString}` : ''}`;

  const response = await apiService.get<{ subscriptions: any[]; pagination: any }>(endpoint);
  return {
    ...response.data,
    subscriptions: (response.data.subscriptions || []).map(normalizeSubscription),
  };
};

/**
 * Get subscription by ID
 */
export const getSubscriptionById = async (subscriptionId: string): Promise<SubscriptionDetail> => {
  const response = await apiService.get<{ subscription: any }>(`/api/subscriptions/${subscriptionId}`);
  return normalizeSubscription(response.data.subscription) as SubscriptionDetail;
};

/**
 * Cancel subscription with refund options (admin)
 */
export const cancelSubscription = async (
  subscriptionId: string,
  cancelData: CancelSubscriptionRequest
): Promise<{ subscription: Subscription; refund?: any }> => {
  const response = await apiService.post<{ subscription: Subscription; refund?: any }>(
    `/api/subscriptions/${subscriptionId}/admin-cancel`,
    cancelData
  );
  return response.data;
};

// ============================================================================
// Export default service object
// ============================================================================

export const subscriptionsService = {
  // Plans
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  activatePlan,
  deactivatePlan,
  archivePlan,
  getActivePlans,

  // Subscriptions
  getAllSubscriptions,
  getSubscriptionById,
  cancelSubscription,
};
