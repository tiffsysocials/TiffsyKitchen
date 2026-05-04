// Time format utilities live in src/utils/time.ts; re-exported here for
// backward compatibility with existing cutoff-module imports.
export type { TimeValue } from '../../../utils/time';
export {
  parseTimeString,
  formatTimeToString,
  formatTimeToDisplay,
  timeToMinutes,
  compareTimes,
} from '../../../utils/time';

import { parseTimeString, compareTimes } from '../../../utils/time';

// Ordering window for a meal
export interface OrderingWindow {
  startTime: string; // "HH:MM" format (24h)
  cutoffTime: string; // "HH:MM" format (24h)
}

// Override role types
export type OverrideRole = 'SUPER_ADMIN' | 'OPS_MANAGER' | 'SUPPORT_AGENT';

export const OVERRIDE_ROLES: { id: OverrideRole; label: string }[] = [
  { id: 'SUPER_ADMIN', label: 'Super Admin' },
  { id: 'OPS_MANAGER', label: 'Ops Manager' },
  { id: 'SUPPORT_AGENT', label: 'Support Agent' },
];

// Operational behavior settings
export interface OperationalBehavior {
  allowOrderEditUntilCutoff: boolean;
  allowSkipUntilCutoff: boolean;
  allowOverrideAfterCutoff: boolean;
  overrideRoles: OverrideRole[];
}

// Capacity settings
export interface CapacitySettings {
  enableSoftCapacity: boolean;
  maxMealsPerSlot: number | null;
}

// Emergency override types
export type EmergencyOverrideType = 'EXTEND' | 'CLOSE_EARLY' | 'STOP_ORDERS';
export type MealType = 'LUNCH' | 'DINNER';

export const EMERGENCY_OVERRIDE_TYPES: { id: EmergencyOverrideType; label: string; description: string }[] = [
  { id: 'EXTEND', label: 'Extend cut-off time', description: 'Adds extra minutes to the existing cut-off time.' },
  { id: 'CLOSE_EARLY', label: 'Close ordering early', description: 'Moves the cut-off earlier than usual.' },
  { id: 'STOP_ORDERS', label: 'Temporarily stop new orders', description: 'Blocks new orders for the selected meals.' },
];

export interface EmergencyOverride {
  active: boolean;
  type: EmergencyOverrideType;
  meals: MealType[];
  minutes: number | null;
  reason: string;
  createdAt: string | null;
  lastUpdatedAt: string | null;
}

// Complete settings object
export interface CutoffTimesSettings {
  lunch: OrderingWindow;
  dinner: OrderingWindow;
  operationalBehavior: OperationalBehavior;
  capacity: CapacitySettings;
  emergencyOverride: EmergencyOverride;
  lastSavedAt: string | null;
}

// Default settings
export const DEFAULT_SETTINGS: CutoffTimesSettings = {
  lunch: {
    startTime: '07:00',
    cutoffTime: '11:00',
  },
  dinner: {
    startTime: '11:01',
    cutoffTime: '19:00',
  },
  operationalBehavior: {
    allowOrderEditUntilCutoff: true,
    allowSkipUntilCutoff: true,
    allowOverrideAfterCutoff: false,
    overrideRoles: [],
  },
  capacity: {
    enableSoftCapacity: false,
    maxMealsPerSlot: null,
  },
  emergencyOverride: {
    active: false,
    type: 'EXTEND',
    meals: [],
    minutes: null,
    reason: '',
    createdAt: null,
    lastUpdatedAt: null,
  },
  lastSavedAt: null,
};

// Validation errors type
export interface ValidationErrors {
  lunchStartTime?: string;
  lunchCutoffTime?: string;
  dinnerStartTime?: string;
  dinnerCutoffTime?: string;
  overrideRoles?: string;
  maxMealsPerSlot?: string;
  emergencyMinutes?: string;
  emergencyReason?: string;
  emergencyMeals?: string;
}

// Validate the settings and return errors
export const validateSettings = (settings: CutoffTimesSettings): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Parse times
  const lunchStart = parseTimeString(settings.lunch.startTime);
  const lunchCutoff = parseTimeString(settings.lunch.cutoffTime);
  const dinnerStart = parseTimeString(settings.dinner.startTime);
  const dinnerCutoff = parseTimeString(settings.dinner.cutoffTime);

  // Lunch: start must be before cutoff
  if (compareTimes(lunchStart, lunchCutoff) >= 0) {
    errors.lunchCutoffTime = 'Cut-off time must be after start time';
  }

  // Dinner: start must be before cutoff
  if (compareTimes(dinnerStart, dinnerCutoff) >= 0) {
    errors.dinnerCutoffTime = 'Cut-off time must be after start time';
  }

  // Dinner start should be >= lunch cutoff
  if (compareTimes(dinnerStart, lunchCutoff) < 0) {
    errors.dinnerStartTime = 'Dinner should start after lunch cut-off';
  }

  // Override roles validation
  if (settings.operationalBehavior.allowOverrideAfterCutoff &&
      settings.operationalBehavior.overrideRoles.length === 0) {
    errors.overrideRoles = 'Select at least one role allowed to override';
  }

  // Capacity validation
  if (settings.capacity.enableSoftCapacity) {
    if (!settings.capacity.maxMealsPerSlot || settings.capacity.maxMealsPerSlot <= 0) {
      errors.maxMealsPerSlot = 'Enter a valid positive number';
    }
  }

  // Emergency override validation
  if (settings.emergencyOverride.active) {
    if (settings.emergencyOverride.meals.length === 0) {
      errors.emergencyMeals = 'Select at least one meal';
    }

    if (settings.emergencyOverride.type !== 'STOP_ORDERS') {
      if (!settings.emergencyOverride.minutes || settings.emergencyOverride.minutes <= 0) {
        errors.emergencyMinutes = 'Enter a valid number of minutes (5-120)';
      } else if (settings.emergencyOverride.minutes < 5 || settings.emergencyOverride.minutes > 120) {
        errors.emergencyMinutes = 'Minutes must be between 5 and 120';
      }
    }

    if (!settings.emergencyOverride.reason.trim()) {
      errors.emergencyReason = 'Please enter a reason for this override';
    }
  }

  return errors;
};

// Check if there are any validation errors
export const hasValidationErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};
