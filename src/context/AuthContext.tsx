import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '../types/user';
import { authService } from '../services/auth.service';
import { apiService } from '../services/api.enhanced.service';
import { clearAllCache } from '../hooks/useApi';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithCredentials: (username: string, password: string, role: UserRole) => Promise<void>;
  login: (phone: string) => Promise<void>;
  verifyOTP: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const userData = await authService.getProfile();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithCredentials = async (username: string, password: string, role: UserRole) => {
    const response = await authService.login(username, password, role);
    await AsyncStorage.setItem('authToken', response.token);
    setUser(response.user);
  };

  const login = async (phone: string) => {
    await authService.sendOTP(phone);
  };

  const verifyOTP = async (phone: string, otp: string) => {
    const response = await authService.verifyOTP(phone, otp);
    const { token, user: userData } = response.data || response;
    if (token) {
      await AsyncStorage.setItem('authToken', token);
    }
    if (userData) {
      setUser(userData);
    }
  };

  const logout = async () => {
    try {
      console.log('========== AUTH CONTEXT: LOGOUT ==========');

      // 1. Clear all admin data from AsyncStorage
      console.log('Clearing admin data...');
      await authService.clearAdminData();

      // 2. Clear API service cache (clears JWT token)
      console.log('Clearing API service cache...');
      await apiService.logout();

      // 3. Clear React Query cache
      console.log('Clearing React Query cache...');
      clearAllCache();

      // 4. Reset user state
      console.log('Resetting user state...');
      setUser(null);

      console.log('Logout complete!');
      console.log('==========================================');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, clear local state
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        loginWithCredentials,
        login,
        verifyOTP,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
