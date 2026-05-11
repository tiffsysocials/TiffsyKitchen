import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/env';

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
}

class ApiService {
  private async getAuthToken(): Promise<string | null> {
    return AsyncStorage.getItem('authToken');
  }

  private async request<T>(endpoint: string, config: RequestConfig): Promise<T> {
    const token = await this.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Log request
    console.log('📤 REQUEST:', config.method, `${BASE_URL}${endpoint}`);
    if (config.body) {
      console.log('📦 Body:', JSON.stringify(config.body, null, 2));
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: config.method,
      headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
    });

    console.log(response)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      console.log('❌ Response:', response.status, JSON.stringify(errorData, null, 2));

      // Create a detailed error object that preserves backend response structure
      const error: any = new Error(errorData.data || errorData.message || 'Request failed');
      error.status = response.status;
      error.response = {
        status: response.status,
        data: errorData,
      };
      throw error;
    }

    const responseData = await response.json();

    // Log response
    console.log('✅ RESPONSE:', config.method, `${BASE_URL}${endpoint}`, JSON.stringify(responseData, null, 2));

    return responseData;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body: data });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body: data });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body: data });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Upload multipart/form-data (for file uploads).
   * Do NOT set Content-Type — fetch will set it with the correct boundary.
   */
  async postMultipart<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = await this.getAuthToken();

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📤 REQUEST: POST (multipart)', `${BASE_URL}${endpoint}`);

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      console.log('❌ Response:', response.status, JSON.stringify(errorData, null, 2));
      const error: any = new Error(errorData.data || errorData.message || 'Request failed');
      error.status = response.status;
      error.response = { status: response.status, data: errorData };
      throw error;
    }

    const responseData = await response.json();
    console.log('✅ RESPONSE: POST (multipart)', `${BASE_URL}${endpoint}`, JSON.stringify(responseData, null, 2));
    return responseData;
  }

  async putMultipart<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = await this.getAuthToken();

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('📤 REQUEST: PUT (multipart)', `${BASE_URL}${endpoint}`);

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      console.log('❌ Response:', response.status, JSON.stringify(errorData, null, 2));
      const error: any = new Error(errorData.data || errorData.message || 'Request failed');
      error.status = response.status;
      error.response = { status: response.status, data: errorData };
      throw error;
    }

    const responseData = await response.json();
    console.log('✅ RESPONSE: PUT (multipart)', `${BASE_URL}${endpoint}`, JSON.stringify(responseData, null, 2));
    return responseData;
  }
}

export const apiService = new ApiService();
