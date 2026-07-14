import { CouponStatus, DiscountType, TargetUserType } from '../../../types/api.types';

// ============================================================================
// Filter State
// ============================================================================

export interface CouponFiltersState {
  status: CouponStatus | 'ALL';
  discountType: DiscountType | 'ALL';
  search: string;
}

export const DEFAULT_COUPON_FILTERS: CouponFiltersState = {
  status: 'ALL',
  discountType: 'ALL',
  search: '',
};

// ============================================================================
// Form State
// ============================================================================

export interface CouponFormState {
  code: string;
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: string; // string for TextInput, empty = null
  freeAddonCount: string;
  freeAddonMaxValue: string;
  extraVoucherCount: string;
  extraVoucherExpiryDays: string;
  minOrderValue: string;
  minItems: string;
  applicableFor: ('ORDER' | 'PLAN_PURCHASE')[];
  applicablePlanIds: string[];
  applicableMenuTypes: string[];
  applicableKitchenIds: string[];
  applicableZoneIds: string[];
  excludedKitchenIds: string[];
  totalUsageLimit: string; // empty = unlimited
  perUserLimit: string;
  targetUserType: TargetUserType;
  specificUserIds: string;
  isFirstOrderOnly: boolean;
  validFrom: Date | null;
  validTill: Date | null;
  status: 'ACTIVE' | 'INACTIVE';
  isVisible: boolean;
  displayOrder: string;
  bannerImage: string;
  termsAndConditions: string;
}

export const DEFAULT_FORM_STATE: CouponFormState = {
  code: '',
  name: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: 0,
  maxDiscountAmount: '',
  freeAddonCount: '',
  freeAddonMaxValue: '',
  extraVoucherCount: '',
  extraVoucherExpiryDays: '30',
  minOrderValue: '0',
  minItems: '0',
  applicableFor: ['ORDER'],
  applicablePlanIds: [],
  applicableMenuTypes: [],
  applicableKitchenIds: [],
  applicableZoneIds: [],
  excludedKitchenIds: [],
  totalUsageLimit: '',
  perUserLimit: '1',
  targetUserType: 'ALL',
  specificUserIds: '',
  isFirstOrderOnly: false,
  validFrom: null,
  validTill: null,
  status: 'INACTIVE',
  isVisible: true,
  displayOrder: '0',
  bannerImage: '',
  termsAndConditions: '',
};

export interface CouponFormErrors {
  [key: string]: string | undefined;
}

// ============================================================================
// Constants
// ============================================================================

export const DISCOUNT_TYPE_OPTIONS: { value: DiscountType; label: string; description: string }[] = [
  { value: 'PERCENTAGE', label: 'Percentage', description: 'Percentage off the order value' },
  { value: 'FLAT', label: 'Flat Amount', description: 'Fixed rupee discount' },
  { value: 'FREE_DELIVERY', label: 'Free Delivery', description: 'Waive delivery fee (Meal Menu only)' },
  { value: 'FREE_ADDON_COUNT', label: 'Free Addons (Count)', description: 'N free addon units (Meal Menu only)' },
  { value: 'FREE_ADDON_VALUE', label: 'Free Addons (Value)', description: 'Free addons up to max value (Meal Menu only)' },
  { value: 'FREE_EXTRA_VOUCHER', label: 'Extra Vouchers', description: 'Issue bonus vouchers (Meal Menu only)' },
];

export const TARGET_USER_OPTIONS: { value: TargetUserType; label: string }[] = [
  { value: 'ALL', label: 'All Users' },
  { value: 'NEW_USERS', label: 'New Users Only' },
  { value: 'EXISTING_USERS', label: 'Existing Users Only' },
  { value: 'SPECIFIC_USERS', label: 'Specific Users' },
];

export const MENU_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'ON_DEMAND_MENU', label: 'On Demand' },
  { value: 'MEAL_MENU', label: 'Meal Menu' },
];

export const STATUS_OPTIONS: { value: CouponStatus | 'ALL'; label: string; color: string }[] = [
  { value: 'ALL', label: 'All', color: '#6b7280' },
  { value: 'ACTIVE', label: 'Active', color: '#22c55e' },
  { value: 'INACTIVE', label: 'Inactive', color: '#6b7280' },
  { value: 'EXPIRED', label: 'Expired', color: '#ef4444' },
  { value: 'EXHAUSTED', label: 'Exhausted', color: '#eab308' },
];

// Discount types that only work with MEAL_MENU
export const MEAL_MENU_ONLY_TYPES: DiscountType[] = [
  'FREE_DELIVERY',
  'FREE_ADDON_COUNT',
  'FREE_ADDON_VALUE',
  'FREE_EXTRA_VOUCHER',
];

// What the coupon redeems against
export const APPLICABLE_FOR_OPTIONS: { value: 'ORDER' | 'PLAN_PURCHASE'; label: string; description: string }[] = [
  { value: 'ORDER', label: 'Food Orders', description: 'Cart / scheduled meal orders' },
  { value: 'PLAN_PURCHASE', label: 'Plan Purchase', description: 'Voucher-pack (meal plan) purchases' },
];

// Discount types valid on plan purchases (no delivery/addons at purchase time)
export const PLAN_PURCHASE_TYPES: DiscountType[] = [
  'PERCENTAGE',
  'FLAT',
  'FREE_EXTRA_VOUCHER',
];

export const getDiscountTypeLabel = (type: DiscountType): string => {
  return DISCOUNT_TYPE_OPTIONS.find(o => o.value === type)?.label || type;
};

export const getStatusColor = (status: CouponStatus): string => {
  const option = STATUS_OPTIONS.find(o => o.value === status);
  return option?.color || '#6b7280';
};

export const formatDiscountValue = (coupon: { discountType: DiscountType; discountValue: number; maxDiscountAmount?: number; freeAddonCount?: number; freeAddonMaxValue?: number; extraVoucherCount?: number; extraVoucherExpiryDays?: number }): string => {
  switch (coupon.discountType) {
    case 'PERCENTAGE':
      return coupon.maxDiscountAmount
        ? `${coupon.discountValue}% off (max Rs.${coupon.maxDiscountAmount})`
        : `${coupon.discountValue}% off`;
    case 'FLAT':
      return `Rs.${coupon.discountValue} off`;
    case 'FREE_DELIVERY':
      return 'Free Delivery';
    case 'FREE_ADDON_COUNT':
      return `${coupon.freeAddonCount || 0} Free Addon(s)`;
    case 'FREE_ADDON_VALUE':
      return `Free Addons up to Rs.${coupon.freeAddonMaxValue || 0}`;
    case 'FREE_EXTRA_VOUCHER':
      return `${coupon.extraVoucherCount || 0} Bonus Voucher(s)`;
    default:
      return '';
  }
};
