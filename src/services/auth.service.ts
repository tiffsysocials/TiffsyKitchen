import { apiService } from './api.enhanced.service';
import { User, UserRole } from '../types/user';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LoginResponse {
  token: string;
  user: User;
}

// Set to true to use mock login (for testing without backend)
const USE_MOCK_LOGIN = false;

// Mock user data for testing
const mockUsers: Record<string, LoginResponse> = {
  'KITCHEN_STAFF': {
    token: 'mock-token-kitchen-staff-123',
    user: {
      id: '1',
      phone: '9876543210',
      email: 'kitchen@tiffsy.com',
      firstName: 'Kitchen',
      lastName: 'Staff',
      fullName: 'Kitchen Staff',
      role: 'KITCHEN_STAFF',
      status: 'ACTIVE',
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  'DRIVER': {
    token: 'mock-token-driver-456',
    user: {
      id: '2',
      phone: '9876543211',
      email: 'driver@tiffsy.com',
      firstName: 'Delivery',
      lastName: 'Driver',
      fullName: 'Delivery Driver',
      role: 'DRIVER',
      status: 'ACTIVE',
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
};

class AuthService {
  async login(username: string, password: string, role: UserRole): Promise<LoginResponse> {
    // Use mock login for testing
    if (USE_MOCK_LOGIN) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          // Accept any username/password for testing, just check role
          if (role === 'KITCHEN_STAFF' || role === 'DRIVER') {
            const mockResponse = mockUsers[role];
            // Update name based on username
            mockResponse.user.firstName = username;
            mockResponse.user.fullName = username;
            resolve(mockResponse);
          } else {
            reject(new Error('Invalid role'));
          }
        }, 500); // Simulate network delay
      });
    }

    return apiService.post<LoginResponse>('/api/auth/admin/login', { username, password, role });
  }

  async sendOTP(phone: string): Promise<void> {
    await apiService.post('/api/auth/send-otp', { phone });
  }

  async verifyOTP(phone: string, otp: string): Promise<any> {
    return apiService.post<any>('/api/auth/verify-otp', { phone, otp });
  }

  async getProfile(): Promise<User> {
    if (USE_MOCK_LOGIN) {
      // Return mock profile
      return mockUsers['KITCHEN_STAFF'].user;
    }

    try {
      // Call backend profile endpoint
      // Backend returns: { status, message, data: { user: {...} } }
      // Backend has two endpoints: /api/auth/profile and /api/auth/me
      let response;
      try {
        console.log('Trying /api/auth/profile...');
        response = await apiService.get<any>('/api/auth/profile');
      } catch (profileError) {
        console.log('⚠️  /api/auth/profile failed, trying /api/auth/me...');
        response = await apiService.get<any>('/api/auth/me');
      }

      console.log('========== GET PROFILE RESPONSE ==========');
      console.log('Response:', JSON.stringify(response, null, 2));
      console.log('==========================================');

      // Backend response structure: { data: { user: {...} } }
      if (response && response.data && response.data.user) {
        const user = response.data.user;

        // Map backend user fields to frontend User type
        return {
          id: user._id,
          phone: user.phone,
          email: user.email || '',
          firstName: user.name?.split(' ')[0] || 'User',
          lastName: user.name?.split(' ').slice(1).join(' ') || '',
          fullName: user.name || 'User',
          role: user.role, // ADMIN, KITCHEN_STAFF, DRIVER, CUSTOMER
          status: user.status,
          isActive: user.isActive,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
      }

      // Fallback: If response has data property directly
      if (response && response.data) {
        return response.data;
      }

      // Fallback: If response has user property
      if (response && response.user) {
        return response.user;
      }

      // Last fallback: Assume response is the user object directly
      return response;
    } catch (error) {
      console.error('========== GET PROFILE ERROR ==========');
      console.error('Error fetching profile:', error);
      console.error('=======================================');
      throw error;
    }
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return apiService.patch<User>('/api/auth/profile', data);
  }

  async logout(): Promise<void> {
    if (USE_MOCK_LOGIN) {
      return Promise.resolve();
    }
    await apiService.post('/api/auth/logout');
  }

  // Admin-specific methods for managing stored admin data
  async getStoredAdminData(): Promise<any | null> {
    try {
      const adminUserJson = await AsyncStorage.getItem('adminUser');
      return adminUserJson ? JSON.parse(adminUserJson) : null;
    } catch (error) {
      console.error('Error getting stored admin data:', error);
      return null;
    }
  }

  async getAdminToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting admin token:', error);
      return null;
    }
  }

  async getUserRole(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('userRole');
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  async getAdminRole(): Promise<string | null> {
    // Deprecated: Use getUserRole() instead
    // Kept for backward compatibility
    return this.getUserRole();
  }

  async isAdmin(): Promise<boolean> {
    try {
      const role = await AsyncStorage.getItem('userRole');
      return role === 'ADMIN';
    } catch (error) {
      console.error('Error checking admin role:', error);
      return false;
    }
  }

  async clearAdminData(): Promise<void> {
    try {
      const keysToRemove = [
        'authToken',
        'adminUser',
        'adminUserId',
        'adminUsername',
        'adminEmail',
        'adminName',
        'adminRole', // Legacy key
        'userRole', // New key
        'userData', // User profile data
        'adminPhone',
        'userPhoneNumber',
        'tokenExpiresIn',
        '@admin_session_indicator',
        '@admin_remember_me',
      ];
      await AsyncStorage.multiRemove(keysToRemove);
      console.log('User data cleared successfully');
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  }
}

export const authService = new AuthService();
