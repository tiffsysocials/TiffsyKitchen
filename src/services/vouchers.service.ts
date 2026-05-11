/**
 * Vouchers Service
 *
 * Handles voucher balance and management API calls
 */

import { apiService } from './api.service';

export interface VoucherBalance {
  total: number;
  available: number;
  redeemed: number;
  expired: number;
  restored: number;
  cancelled: number;
}

export interface ExpiringNext {
  count: number;
  date: string;
  daysRemaining: number;
}

export interface NextCutoff {
  mealWindow: 'LUNCH' | 'DINNER';
  cutoffTime: string;
  isPastCutoff: boolean;
  message: string;
}

export interface VoucherBalanceResponse {
  balance: VoucherBalance;
  expiringNext: ExpiringNext | null;
  canRedeemToday: boolean;
  nextCutoff: NextCutoff;
}

class VouchersService {
  /**
   * Get voucher balance for a user
   * GET /api/vouchers/balance
   * For admin: pass userId as query parameter
   */
  async getVoucherBalance(userId?: string): Promise<VoucherBalanceResponse> {
    const endpoint = userId ? `/api/vouchers/balance?userId=${userId}` : '/api/vouchers/balance';

    console.log(`🎫 Fetching voucher balance from: ${endpoint}`);

    const response = await apiService.get<any>(endpoint);

    console.log('🎫 Raw voucher response:', JSON.stringify(response, null, 2));

    // API returns: { status, message, data: { balance, expiringNext, ... } }
    // apiService.get returns the response directly (not wrapped)
    if (response.data) {
      console.log('✅ Voucher balance data found in response.data');
      return response.data;
    }

    // Fallback if the entire response is the data
    if (response.balance) {
      console.log('✅ Voucher balance found at root level');
      return response;
    }

    console.error('❌ Invalid voucher balance response structure:', response);
    throw new Error('Invalid voucher balance response');
  }

  /**
   * Get voucher balances for multiple users (admin only)
   * This will call the balance endpoint for each user
   */
  async getVoucherBalancesForUsers(userIds: string[]): Promise<Map<string, VoucherBalance>> {
    const balanceMap = new Map<string, VoucherBalance>();

    console.log(`🎫 Fetching voucher balances for ${userIds.length} users...`);

    // Fetch balances in parallel
    const promises = userIds.map(async (userId) => {
      try {
        console.log(`🎫 Fetching balance for user: ${userId}`);
        const response = await this.getVoucherBalance(userId);
        console.log(`✅ Balance fetched for ${userId}:`, response.balance);
        balanceMap.set(userId, response.balance);
      } catch (err: any) {
        console.error(`❌ Failed to fetch voucher balance for user ${userId}:`, err?.message || err);
        console.error('Full error:', err);
        // Set default balance on error
        balanceMap.set(userId, {
          total: 0,
          available: 0,
          redeemed: 0,
          expired: 0,
          restored: 0,
          cancelled: 0,
        });
      }
    });

    await Promise.all(promises);
    console.log(`🎫 Finished fetching balances. Map size: ${balanceMap.size}`);
    return balanceMap;
  }

  /**
   * Admin: Get vouchers for a specific user (with full per-voucher detail)
   * GET /api/vouchers/admin/all?userId=...
   */
  async adminGetVouchersForUser(
    userId: string,
    opts?: { status?: 'AVAILABLE' | 'REDEEMED' | 'EXPIRED' | 'RESTORED' | 'CANCELLED'; limit?: number }
  ): Promise<{
    vouchers: Array<{
      _id: string;
      voucherCode: string;
      issuedDate: string;
      expiryDate: string;
      status: string;
      source?: string;
      redeemedAt?: string;
    }>;
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    const qs = new URLSearchParams();
    qs.append('userId', userId);
    if (opts?.status) qs.append('status', opts.status);
    qs.append('limit', String(opts?.limit ?? 50));
    const response = await apiService.get<any>(`/api/vouchers/admin/all?${qs.toString()}`);
    return response.data || response;
  }

  /**
   * Admin: Issue vouchers to a customer
   * POST /api/vouchers/admin/issue
   */
  async adminIssueVouchers(params: {
    userId: string;
    count: number;
    expiryDays?: number;
    reason?: string;
  }): Promise<{ count: number; voucherIds: string[]; expiryDate: string }> {
    const response = await apiService.post<any>('/api/vouchers/admin/issue', params);
    // Backend response shape: { success, message, data: { count, voucherIds, expiryDate } }
    return response.data || response;
  }

  /**
   * Admin: Cancel vouchers
   * POST /api/vouchers/admin/cancel
   */
  async adminCancelVouchers(params: { voucherIds: string[]; reason: string }): Promise<{ modified: number }> {
    const response = await apiService.post<any>('/api/vouchers/admin/cancel', params);
    return response.data || response;
  }
}

export const vouchersService = new VouchersService();
