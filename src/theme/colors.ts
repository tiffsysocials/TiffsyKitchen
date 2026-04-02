export const colors = {
  // Primary
  primary: '#FE8733',
  primaryLight: '#fff7ed',
  primaryDark: '#ea580c',

  // Header gradient
  headerGradientStart: '#FD9E2F',
  headerGradientEnd: '#FF6636',

  // Secondary
  secondary: '#6366f1',
  secondaryLight: '#eef2ff',
  secondaryDark: '#4f46e5',

  // Status colors
  success: '#22c55e',
  successLight: '#dcfce7',
  warning: '#eab308',
  warningLight: '#fef9c3',
  error: '#ef4444',
  errorLight: '#fee2e2',
  info: '#3b82f6',
  infoLight: '#dbeafe',

  // Neutrals
  white: '#ffffff',
  black: '#000000',
  background: '#f3f4f6',
  card: '#ffffff',
  border: '#e5e7eb',
  divider: '#f3f4f6',

  // Gray scale
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  // Text
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  textLight: '#ffffff',

  // User status colors
  statusActive: '#22c55e',
  statusBlocked: '#ef4444',
  statusPending: '#eab308',
  statusUnverified: '#6b7280',

  // User role colors
  roleCustomer: '#3b82f6',
  roleDriver: '#8b5cf6',
  roleKitchenStaff: '#FE8733',
  roleKitchenAdmin: '#ef4444',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

export type ColorKey = keyof typeof colors;
