import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DashboardScreen } from './DashboardScreen';
import { UsersScreen } from './UsersScreen';
import { UserDetailsScreen } from './UserDetailsScreen';
import { OrdersListScreenEnhanced, OrderDetailScreenEnhanced } from '../../modules/orders';
import { Order as APIOrder, MenuItem, Customer } from '../../types/api.types';
import { PlansScreen } from '../../modules/plans';
import { KitchenManagementScreen } from '../../modules/kitchen';
import { MenuManagementScreen, MenuListScreen, AddEditMenuScreen } from '../../modules/menu';
import { UsersListScreen, UserDetailScreen } from '../../modules/users';
import { CutoffTimesSettingsScreen } from '../../modules/cutoff';
import { SafeAreaScreen } from '../../components/common/SafeAreaScreen';
import { GradientBox } from '../../components/common/GradientBox';

// Constants
const PRIMARY_COLOR = '#FE8733';

// Storage keys
const STORAGE_KEYS = {
  ADMIN_SESSION: '@admin_session_indicator',
  REMEMBER_ME: '@admin_remember_me',
};

// Validation rules
const VALIDATION = {
  USERNAME_MIN_LENGTH: 3,
  PASSWORD_MIN_LENGTH: 6,
};

// Field error types
interface FieldErrors {
  username?: string;
  password?: string;
}

interface AdminLoginScreenProps {
  firebaseToken: string;
  onLoginSuccess?: (token: string) => void;
}

const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ firebaseToken, onLoginSuccess }) => {
  const passwordInputRef = useRef<TextInput>(null);

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Removed internal isLoggedIn state - using onLoginSuccess callback instead
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeMenu, setActiveMenu] = useState('Dashboard');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<APIOrder | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [showAddEditMenu, setShowAddEditMenu] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | undefined>();

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const storedRememberMe = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);

      // Restore remember me preference
      if (storedRememberMe !== null) {
        setRememberMe(storedRememberMe === 'true');
      }

      // Note: Session validation is handled by App.tsx via authToken check
      // No need to navigate from here - App.tsx manages navigation flow
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsCheckingSession(false);
    }
  };

  const handleMenuPress = () => {
    setSidebarVisible(true);
  };

  const handleMenuItemPress = (menuItem: string) => {
    setActiveMenu(menuItem);
    setSidebarVisible(false);
    // Clear selected user when switching away from Users menu
    if (menuItem !== 'Users') {
      setSelectedUserId(null);
    }
    // Clear selected order when switching away from Orders menu
    if (menuItem !== 'Orders') {
      setSelectedOrder(null);
    }
  };

  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard' },
    { name: 'Users', icon: 'people' },
    { name: 'Orders', icon: 'receipt-long' },
    { name: 'Plans and Pricing', icon: 'attach-money' },
    { name: 'Kitchen Management', icon: 'restaurant' },
    { name: 'Menu Management', icon: 'menu-book' },
    { name: 'Cut Off Timing', icon: 'schedule' },
  ];

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    let isValid = true;

    // Validate username
    if (!username.trim()) {
      errors.username = 'Username is required';
      isValid = false;
    } else if (username.trim().length < VALIDATION.USERNAME_MIN_LENGTH) {
      errors.username = `Username must be at least ${VALIDATION.USERNAME_MIN_LENGTH} characters`;
      isValid = false;
    }

    // Validate password
    if (!password) {
      errors.password = 'Password is required';
      isValid = false;
    } else if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      errors.password = `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`;
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSignIn = async () => {
    // Clear previous errors
    setFieldErrors({});
    setGlobalError(undefined);

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare headers with Firebase token
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseToken}`,
      };

      const endpoint = 'https://tiffsy-backend.onrender.com/api/auth/admin/login';
      const requestBody = {
        username: username.trim(),
        password: password,
      };

      console.log('========== ADMIN LOGIN REQUEST ==========');
      console.log('Endpoint:', endpoint);
      console.log('Request Body:', {
        username: requestBody.username,
        password: '***HIDDEN***',
      });
      console.log('=========================================');

      // Make API call to backend
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      console.log('========== ADMIN LOGIN RESPONSE ==========');
      console.log('Raw Response:', JSON.stringify(data, null, 2));
      console.log('==========================================');

      // Backend quirk: response structure is { success, message: { user, token, expiresIn }, data, error }
      const responseData = data.message || data.data;

      // Check if response is successful (no error and has responseData)
      if (response.ok && !data.error && responseData) {
        // Verify user role is ADMIN
        const userRole = responseData?.user?.role;

        if (userRole !== 'ADMIN') {
          setGlobalError('Access Denied. Admin privileges required.');
          return;
        }

        // Clear any existing errors
        setGlobalError(undefined);
        setFieldErrors({});

        // Call onLoginSuccess callback with full response data
        if (onLoginSuccess) {
          onLoginSuccess(JSON.stringify({
            token: responseData.token,
            user: responseData.user,
            expiresIn: responseData.expiresIn,
            rememberMe: rememberMe,
          }));
        }
      } else {
        setGlobalError(data.message || data.error || 'Unable to sign in with the provided credentials.');
      }
    } catch (error: any) {
      console.error('Login error:', error);

      if (error.message === 'Network request failed') {
        setGlobalError('Network error. Please check your connection and try again.');
      } else {
        setGlobalError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    // Placeholder action for forgot password
    // Could navigate to a ForgotPassword screen or show an alert
    console.log('Forgot password pressed');
  };

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    // Clear username error when user types
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: undefined }));
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    // Clear password error when user types
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const toggleRememberMe = () => {
    setRememberMe((prev) => !prev);
  };

  const isFormValid =
    username.trim().length >= VALIDATION.USERNAME_MIN_LENGTH &&
    password.length >= VALIDATION.PASSWORD_MIN_LENGTH;

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  // ============================================================
  // NOTE: Dashboard code removed - App.tsx now handles navigation
  // After successful login, onLoginSuccess callback is called
  // which navigates to DashboardScreen in App.tsx
  // ============================================================

  return (
    <SafeAreaScreen style={styles.container} backgroundColor="#FE8733">
      <View style={styles.contentContainer}>
        {/* Login Card */}
        <View style={styles.card}>
          {/* Logo / Brand */}
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Icon name="restaurant" size={40} color="#FE8733" />
            </View>
            <Text style={styles.brandText}>Tiffin Platform</Text>
          </View>

          {/* Title & Subtitle */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Admin Console Login</Text>
            <Text style={styles.subtitle}>For internal use only</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Username Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Username</Text>
              <View
                style={[
                  styles.inputWrapper,
                  fieldErrors.username ? styles.inputError : null,
                ]}
              >
                <Icon
                  name="person-outline"
                  size={20}
                  color="#9ca3af"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your username"
                  placeholderTextColor="#9ca3af"
                  value={username}
                  onChangeText={handleUsernameChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  editable={!isSubmitting}
                  accessibilityLabel="Username input"
                />
              </View>
              {fieldErrors.username && (
                <Text style={styles.errorText}>{fieldErrors.username}</Text>
              )}
            </View>

            {/* Password Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  fieldErrors.password ? styles.inputError : null,
                ]}
              >
                <Icon
                  name="lock-outline"
                  size={20}
                  color="#9ca3af"
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                  editable={!isSubmitting}
                  accessibilityLabel="Password input"
                />
                <TouchableOpacity
                  style={styles.showHideButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityRole="button"
                >
                  <Icon
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>
              {fieldErrors.password && (
                <Text style={styles.errorText}>{fieldErrors.password}</Text>
              )}
            </View>

            {/* Remember Me */}
            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={toggleRememberMe}
              activeOpacity={0.7}
              accessibilityLabel="Remember this device for 7 days"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
            >
              <View
                style={[
                  styles.checkbox,
                  rememberMe ? styles.checkboxChecked : null,
                ]}
              >
                {rememberMe && (
                  <Icon name="check" size={14} color="#ffffff" />
                )}
              </View>
              <Text style={styles.rememberMeText}>
                Remember this device for 7 days
              </Text>
            </TouchableOpacity>

            {/* Global Error */}
            {globalError && (
              <View style={styles.globalErrorContainer}>
                <Icon name="error-outline" size={18} color="#dc2626" />
                <Text style={styles.globalErrorText}>{globalError}</Text>
              </View>
            )}

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                styles.signInButton,
                (!isFormValid || isSubmitting) && styles.signInButtonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={!isFormValid || isSubmitting}
              activeOpacity={0.8}
              accessibilityLabel="Sign In"
              accessibilityRole="button"
              accessibilityState={{ disabled: !isFormValid || isSubmitting }}
            >
              {isSubmitting ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={[styles.signInButtonText, { marginLeft: 8 }]}>Signing In...</Text>
                </View>
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={handleForgotPassword}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © Tiffin Platform · Admin Access Only
          </Text>
        </View>
      </View>
    </SafeAreaScreen>
  );
};

// Add displayName for debugging
AdminLoginScreen.displayName = 'AdminLoginScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FE8733',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#FE8733',
    justifyContent: 'center',
    alignItems: 'center',
  },

  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  // Card styles
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },

  // Logo styles
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },

  logoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  brandText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },

  // Title styles
  titleContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },

  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },

  // Form styles
  formContainer: {
    // Using marginBottom on children instead of gap for compatibility
  },

  fieldContainer: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
  },

  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },

  showHideButton: {
    padding: 8,
    marginLeft: 4,
  },

  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 6,
    marginLeft: 4,
  },

  // Remember me styles
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 44,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  checkboxChecked: {
    backgroundColor: '#FE8733',
    borderColor: '#FE8733',
  },

  rememberMeText: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },

  // Global error styles
  globalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },

  globalErrorText: {
    fontSize: 13,
    color: '#dc2626',
    marginLeft: 8,
    flex: 1,
  },

  // Button styles
  signInButton: {
    backgroundColor: '#FE8733',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 50,
    shadowColor: '#FE8733',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  signInButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  signInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Forgot password styles
  forgotPasswordContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },

  forgotPasswordText: {
    fontSize: 14,
    color: '#FE8733',
    fontWeight: '500',
  },

  // Footer styles
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingBottom: 16,
  },

  footerText: {
    fontSize: 12,
    color: '#ffffff',
  },

  // Dashboard styles
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  menuButton: {
    padding: 8,
    marginRight: 12,
  },

  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },

  headerRight: {
    width: 44,
  },

  dashboardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },

  dashboardSubtext: {
    fontSize: 16,
    color: '#6b7280',
  },

  // Sidebar styles
  sidebarOverlay: {
    flex: 1,
    flexDirection: 'row',
  },

  sidebarBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  sidebar: {
    width: 280,
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },

  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff7ed',
  },

  sidebarLogoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  sidebarTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },

  sidebarCloseButton: {
    padding: 8,
  },

  sidebarMenu: {
    flex: 1,
    paddingTop: 16,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },

  menuItemActive: {
    backgroundColor: '#fff7ed',
  },

  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4b5563',
    marginLeft: 16,
  },

  menuItemTextActive: {
    color: '#FE8733',
    fontWeight: '600',
  },

  sidebarFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
  },

  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ef4444',
    marginLeft: 12,
  },
});

export { AdminLoginScreen };
export default AdminLoginScreen;
