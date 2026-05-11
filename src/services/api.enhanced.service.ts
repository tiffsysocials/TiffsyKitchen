import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { BASE_URL } from '../config/env';

export { BASE_URL };

// API Response wrapper from your backend
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  skipRetry?: boolean; // For login/auth endpoints
}

interface RetryConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  retryableStatuses: number[]; // HTTP status codes to retry
}

/**
 * Enhanced API Service
 *
 * Features:
 * - Auto token refresh on 401
 * - Automatic retry with exponential backoff
 * - Network connectivity check
 * - Request deduplication (prevents duplicate in-flight requests)
 * - Better error messages
 *
 * Performance Considerations:
 * - Token is cached in memory after first read (reduces AsyncStorage calls)
 * - Network state is checked before requests (fail fast if offline)
 * - Retry only on network errors and 5xx server errors (not on 4xx client errors)
 */
class EnhancedApiService {
  private tokenCache: string | null = null;
  private refreshingToken: Promise<string | null> | null = null;
  private pendingRequests: Map<string, Promise<any>> = new Map();

  // Retry configuration
  private retryConfig: RetryConfig = {
    maxRetries: 2,
    retryDelay: 1000, // 1 second
    retryableStatuses: [408, 429, 500, 502, 503, 504], // Request Timeout, Too Many Requests, Server Errors
  };

  /**
   * Get auth token from cache or AsyncStorage
   * Performance: Caches token in memory to avoid repeated AsyncStorage reads
   */
  private async getAuthToken(): Promise<string | null> {
    if (this.tokenCache) {
      return this.tokenCache;
    }

    this.tokenCache = await AsyncStorage.getItem('authToken');
    return this.tokenCache;
  }

  /**
   * Update auth token in cache and AsyncStorage
   */
  private async setAuthToken(token: string | null): Promise<void> {
    this.tokenCache = token;
    if (token) {
      await AsyncStorage.setItem('authToken', token);
    } else {
      await AsyncStorage.removeItem('authToken');
    }
  }

  /**
   * Check network connectivity before making requests
   * Performance: Fail fast if offline, preventing unnecessary timeout waits
   */
  private async checkConnectivity(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected ?? false;
  }

  /**
   * Refresh authentication token via backend JWT refresh endpoint
   * Handles concurrent refresh requests (prevents multiple refresh calls)
   */
  private async refreshToken(): Promise<string | null> {
    // If already refreshing, return existing promise
    if (this.refreshingToken) {
      return this.refreshingToken;
    }

    this.refreshingToken = (async () => {
      try {
        console.log('========== TOKEN REFRESH STARTED ==========');

        const currentToken = await this.getAuthToken();
        if (!currentToken) {
          console.log('No token found, cannot refresh');
          return null;
        }

        // Call backend refresh endpoint with current (possibly expired) token
        const response = await fetch(`${BASE_URL}/api/auth/token/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`,
          },
        });

        const data = await response.json();

        if (response.ok && data.data?.token) {
          const freshToken = data.data.token;
          console.log('Fresh JWT token obtained');
          console.log('========================================');
          await this.setAuthToken(freshToken);
          return freshToken;
        }

        console.log('Token refresh failed, clearing token');
        await this.setAuthToken(null);
        return null;
      } catch (error) {
        console.error('========== TOKEN REFRESH FAILED ==========');
        console.error('Error:', error);
        console.error('==========================================');
        await this.setAuthToken(null);
        return null;
      } finally {
        this.refreshingToken = null;
      }
    })();

    return this.refreshingToken;
  }

  /**
   * Make HTTP request with automatic retry and token refresh
   *
   * Scale Considerations:
   * - Request deduplication prevents duplicate API calls when user taps multiple times
   * - Exponential backoff prevents overwhelming the server during issues
   * - Only retries on network/server errors (not client errors like 400, 404)
   */
  private async request<T>(
    endpoint: string,
    config: RequestConfig,
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    // Check network connectivity first
    const isConnected = await this.checkConnectivity();
    if (!isConnected) {
      throw new Error('No internet connection. Please check your network and try again.');
    }

    // Create unique key for request deduplication
    const requestKey = `${config.method}:${endpoint}:${JSON.stringify(config.body || {})}`;

    // If same request is already in flight, return existing promise
    // Performance: Prevents duplicate API calls (e.g., user double-tapping button)
    if (this.pendingRequests.has(requestKey)) {
      console.log(`[API] Request deduplicated: ${config.method} ${endpoint}`);
      return this.pendingRequests.get(requestKey)!;
    }

    const requestPromise = (async () => {
      try {
        const token = await this.getAuthToken();

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...config.headers,
        };

        if (token) {
          headers['Authorization'] = `Bearer ${token.substring(0, 20)}...`; // Truncate for logging
        }

        const requestBody = config.body ? JSON.stringify(config.body) : undefined;

        // ===== REQUEST LOGGING =====
        console.log('╔═══════════════════════════════════════════════════════════');
        console.log('║ [API REQUEST]');
        console.log('╠═══════════════════════════════════════════════════════════');
        console.log('║ Method:', config.method);
        console.log('║ URL:', `${BASE_URL}${endpoint}`);
        console.log('║ Headers:', JSON.stringify(headers, null, 2));
        if (requestBody) {
          console.log('║ Body:', requestBody);
        } else {
          console.log('║ Body: (none)');
        }
        console.log('╚═══════════════════════════════════════════════════════════');

        const response = await fetch(`${BASE_URL}${endpoint}`, {
          method: config.method,
          headers: {
            'Content-Type': 'application/json',
            ...config.headers,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: requestBody,
        });

        // Get response text first
        const responseText = await response.text();

        // ===== RESPONSE LOGGING =====
        console.log('╔═══════════════════════════════════════════════════════════');
        console.log('║ [API RESPONSE]');
        console.log('╠═══════════════════════════════════════════════════════════');
        console.log('║ Status:', response.status, response.statusText);
        console.log('║ URL:', `${BASE_URL}${endpoint}`);
        console.log('║ Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
        console.log('║ Response Body (Raw):', responseText.substring(0, 500)); // First 500 chars

        let responseData: any;
        try {
          responseData = JSON.parse(responseText);
          console.log('║ Response Body (Parsed):', JSON.stringify(responseData, null, 2));
        } catch (parseError) {
          console.log('║ ⚠️  Response is not valid JSON!');
          console.log('║ Parse Error:', parseError);
          console.log('║ Full Response:', responseText);
          console.log('╚═══════════════════════════════════════════════════════════');

          throw {
            success: false,
            message: 'Invalid response from server',
            data: null,
            rawResponse: responseText,
          };
        }
        console.log('╚═══════════════════════════════════════════════════════════');

        // Handle 401 Unauthorized - Try token refresh
        if (response.status === 401 && !config.skipRetry) {
          console.log('[API] 401 Unauthorized - attempting token refresh...');

          const newToken = await this.refreshToken();

          if (newToken) {
            console.log('[API] Token refreshed, retrying request...');

            // Retry request with new token
            const retryResponse = await fetch(`${BASE_URL}${endpoint}`, {
              method: config.method,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${newToken}`,
                ...config.headers,
              },
              body: config.body ? JSON.stringify(config.body) : undefined,
            });

            const retryText = await retryResponse.text();
            const retryData = JSON.parse(retryText);

            console.log('[API] Retry response:', retryData);

            if (!retryResponse.ok) {
              throw retryData;
            }

            return retryData;
          } else {
            // Token refresh failed, user needs to login again
            throw {
              success: false,
              message: 'Session expired. Please login again.',
              requiresReauth: true,
            };
          }
        }

        // Handle other error responses
        if (!response.ok) {
          console.log(`[API] Error response: ${response.status} ${response.statusText}`);

          // Retry on retryable status codes
          if (
            this.retryConfig.retryableStatuses.includes(response.status) &&
            retryCount < this.retryConfig.maxRetries &&
            !config.skipRetry
          ) {
            // Exponential backoff: 1s, 2s, 4s...
            const delay = this.retryConfig.retryDelay * Math.pow(2, retryCount);
            console.log(`[API] Retrying in ${delay}ms (attempt ${retryCount + 1}/${this.retryConfig.maxRetries})...`);

            await new Promise(resolve => setTimeout(resolve, delay));

            // Recursive retry
            return this.request<T>(endpoint, config, retryCount + 1);
          }

          throw responseData;
        }

        return responseData;
      } catch (error: any) {
        // ===== ERROR LOGGING =====
        console.log('╔═══════════════════════════════════════════════════════════');
        console.log('║ [API ERROR]');
        console.log('╠═══════════════════════════════════════════════════════════');
        console.log('║ Endpoint:', endpoint);
        console.log('║ Method:', config.method);
        console.log('║ Error:', error);
        console.log('║ Error Message:', error?.message);
        console.log('║ Error Stack:', error?.stack);
        console.log('╚═══════════════════════════════════════════════════════════');

        // Handle network errors (no response from server)
        if (error.message === 'Network request failed' || error.name === 'TypeError') {
          if (retryCount < this.retryConfig.maxRetries && !config.skipRetry) {
            const delay = this.retryConfig.retryDelay * Math.pow(2, retryCount);
            console.log(`[API] Network error, retrying in ${delay}ms...`);

            await new Promise(resolve => setTimeout(resolve, delay));
            return this.request<T>(endpoint, config, retryCount + 1);
          }

          throw {
            success: false,
            message: 'Network error. Please check your connection and try again.',
          };
        }

        // Re-throw other errors
        throw error;
      } finally {
        // Remove from pending requests
        this.pendingRequests.delete(requestKey);
      }
    })();

    // Store in pending requests
    this.pendingRequests.set(requestKey, requestPromise);

    return requestPromise;
  }

  // Public API methods

  async get<T>(endpoint: string, options?: { params?: Record<string, any> }): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (options?.params) {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }
      const qs = queryParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, skipRetry = false): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body: data, skipRetry });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body: data });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body: data });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Clear token and logout
   */
  async logout(): Promise<void> {
    await this.setAuthToken(null);
    this.pendingRequests.clear();
  }

  /**
   * Set token explicitly (for login flow)
   */
  async login(token: string): Promise<void> {
    await this.setAuthToken(token);
  }
}

export const apiService = new EnhancedApiService();
