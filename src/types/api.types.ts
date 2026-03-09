/**
 * API Type Definitions
 *
 * These types match the API documentation exactly.
 * Organized by module for maintainability.
 */

// ============================================================================
// Common Types
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export type UserRole = 'CUSTOMER' | 'KITCHEN_STAFF' | 'DRIVER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';

export type KitchenType = 'TIFFSY' | 'PARTNER';
export type KitchenStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED' | 'DELETED';

export type ZoneStatus = 'ACTIVE' | 'INACTIVE';

export type CouponStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'EXHAUSTED';
export type DiscountType = 'PERCENTAGE' | 'FLAT' | 'FREE_DELIVERY' | 'FREE_ADDON_COUNT' | 'FREE_ADDON_VALUE' | 'FREE_EXTRA_VOUCHER';
export type TargetUserType = 'ALL' | 'NEW_USERS' | 'EXISTING_USERS' | 'SPECIFIC_USERS';

export type VoucherStatus = 'AVAILABLE' | 'REDEEMED' | 'EXPIRED' | 'RESTORED' | 'CANCELLED';

export type RefundStatus = 'INITIATED' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type RefundReason =
  | 'ORDER_REJECTED'
  | 'ORDER_CANCELLED_BY_KITCHEN'
  | 'ORDER_CANCELLED_BY_CUSTOMER'
  | 'DELIVERY_FAILED'
  | 'QUALITY_ISSUE'
  | 'WRONG_ORDER'
  | 'ADMIN_INITIATED'
  | 'OTHER';

export type OrderSource = 'DIRECT' | 'SCHEDULED' | 'AUTO_ORDER';

export type OrderStatus =
  | 'PENDING_KITCHEN_ACCEPTANCE'
  | 'PLACED'
  | 'SCHEDULED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PREPARING'
  | 'READY'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export type MenuType = 'MEAL_MENU' | 'ON_DEMAND_MENU';

export type BatchStatus =
  | 'COLLECTING'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PARTIAL_COMPLETE'
  | 'CANCELLED';

export type MealWindow = 'LUNCH' | 'DINNER';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE';
export type EntityType = 'USER' | 'KITCHEN' | 'ORDER' | 'ZONE' | 'COUPON' | 'VOUCHER' | 'REFUND' | 'BATCH' | 'MENU_ITEM' | 'PLAN' | 'SUBSCRIPTION';

export type ReportType = 'ORDERS' | 'REVENUE' | 'VOUCHERS' | 'REFUNDS';
export type SegmentBy = 'CITY' | 'ZONE' | 'KITCHEN';

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type PlanStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

// ============================================================================
// Authentication Types
// ============================================================================

export interface AdminUser {
  _id: string;
  phone: string;
  role: UserRole;
  name: string;
  email: string;
  username?: string;
  status?: UserStatus;
  kitchenId?: string | Kitchen;
  createdAt?: string;
  suspensionReason?: string;
  suspendedAt?: string;
}

export interface LoginResponse {
  user: AdminUser;
  token: string;
  expiresIn: number;
}

export interface RefreshTokenResponse {
  token: string;
  expiresIn: number;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardOverview {
  totalOrders: number;
  totalRevenue: number;
  activeCustomers: number;
  activeKitchens: number;
}

export interface DashboardToday {
  orders: number;
  revenue: number;
  newCustomers: number;
}

export interface DashboardPendingActions {
  pendingOrders: number;
  pendingRefunds: number;
  pendingKitchenApprovals: number;
  pendingAcceptanceOrders?: number;
}

export interface DashboardActivity {
  _id: string;
  action: AuditAction;
  entityType: EntityType;
  userId: {
    _id: string;
    name: string;
    role: UserRole;
  };
  createdAt: string;
}

export interface DashboardChartDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

export interface DashboardData {
  overview: DashboardOverview;
  today: DashboardToday;
  pendingActions: DashboardPendingActions;
  recentActivity: DashboardActivity[];
  orderStatusCounts: Record<string, number>;
  chartData: DashboardChartDataPoint[];
}

// ============================================================================
// System Configuration Types
// ============================================================================

export interface CutoffTimes {
  lunch: string;
  dinner: string;
}

export interface BatchingConfig {
  maxBatchSize: number;
  failedOrderPolicy: 'NO_RETURN' | 'RETURN_TO_KITCHEN';
  autoDispatchDelay: number;
}

export interface FeesConfig {
  deliveryFee: number;
  serviceFee: number;
  packagingFee: number;
  handlingFee: number;
}

export interface TaxConfig {
  name: string;
  rate: number;
  enabled: boolean;
}

export interface RefundConfig {
  maxRetries: number;
  autoProcessDelay: number;
}

export interface SystemConfiguration {
  cutoffTimes: CutoffTimes;
  batching: BatchingConfig;
  fees: FeesConfig;
  taxes: TaxConfig[];
  refund: RefundConfig;
}

export interface Guidelines {
  menuGuidelines: string;
  kitchenGuidelines: string;
  qualityPolicy: string;
}

// ============================================================================
// User Management Types
// ============================================================================

export interface User {
  _id: string;
  phone: string;
  role: UserRole;
  name: string;
  email?: string;
  username?: string;
  status: UserStatus;
  kitchenId?: string | Kitchen;
  createdAt: string;
  suspensionReason?: string;
  suspendedAt?: string;
}

export interface UserCounts {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<UserRole, number>;
}

export interface UserListResponse {
  users: User[];
  counts: UserCounts;
  pagination: PaginationMeta;
}

export interface UserActivity {
  lastLogin: string;
  ordersHandled: number;
  deliveriesCompleted: number;
}

export interface UserDetailsResponse {
  user: User;
  kitchen?: Kitchen;
  activity?: UserActivity;
  stats?: {
    totalOrders?: number;
    completedOrders?: number;
    cancelledOrders?: number;
    activeSubscriptions?: number;
    availableVouchers?: number;
    totalSpent?: number;
    ordersProcessedToday?: number;
    ordersProcessedThisMonth?: number;
  };
  addresses?: {
    _id: string;
    label: string;
    addressLine1: string;
    locality: string;
    city: string;
    pincode: string;
    isDefault: boolean;
  }[];
}

// ============================================================================
// Kitchen Management Types
// ============================================================================

export interface Address {
  addressLine1: string;
  addressLine2?: string;
  locality: string;
  city: string;
  state?: string;
  pincode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface OperatingHours {
  lunch?: {
    startTime: string;
    endTime: string;
  };
  dinner?: {
    startTime: string;
    endTime: string;
  };
  onDemand?: {
    startTime: string;
    endTime: string;
    isAlwaysOpen: boolean;
  };
}

export interface Kitchen {
  _id: string;
  name: string;
  code: string;
  type: KitchenType;
  status: KitchenStatus;
  authorizedFlag: boolean;
  premiumFlag: boolean;
  gourmetFlag: boolean;
  logo?: string;
  coverImage?: string;
  description?: string;
  cuisineTypes: string[];
  address: Address;
  zonesServed: Zone[] | string[];
  operatingHours: OperatingHours;
  contactPhone?: string;
  contactEmail?: string;
  ownerName?: string;
  ownerPhone?: string;
  isAcceptingOrders: boolean;
  averageRating: number;
  totalRatings: number;
  createdBy?: string | User;
  approvedBy?: string | User;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  suspensionReason?: string;
  suspendedAt?: string;
  deliveryConfig?: {
    autoAcceptRadiusKm?: number;
    maxDeliveryRadiusKm?: number;
  };
}

export interface KitchenStatistics {
  totalOrders: number;
  activeOrders: number;
  averageRating: number;
  totalMenuItems: number;
}

export interface KitchenDetailsResponse {
  kitchen: Kitchen;
  staff: User[];
  statistics: KitchenStatistics;
}

export interface KitchenListResponse {
  kitchens: Kitchen[];
  pagination: PaginationMeta;
}

// ============================================================================
// Zone Management Types
// ============================================================================

export interface Zone {
  _id: string;
  pincode: string;
  name: string;
  city: string;
  state: string;
  timezone: string;
  status: ZoneStatus;
  orderingEnabled: boolean;
  displayOrder: number;
  createdAt?: string;
}

export interface ZoneDetailsResponse {
  zone: Zone;
  kitchens: Kitchen[];
}

export interface ZoneListResponse {
  zones: Zone[];
  pagination: PaginationMeta;
}

// ============================================================================
// Coupon Management Types
// ============================================================================

export interface Coupon {
  _id: string;
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  freeAddonCount?: number;
  freeAddonMaxValue?: number;
  extraVoucherCount?: number;
  extraVoucherExpiryDays?: number;
  minOrderValue?: number;
  minItems?: number;
  applicableMenuTypes?: string[];
  applicableKitchenIds?: string[];
  applicableZoneIds?: string[];
  excludedKitchenIds?: string[];
  totalUsageLimit?: number;
  totalUsageCount?: number;
  perUserLimit?: number;
  targetUserType: TargetUserType;
  specificUserIds?: string[];
  isFirstOrderOnly: boolean;
  validFrom: string;
  validTill: string;
  status: CouponStatus;
  isVisible: boolean;
  displayOrder: number;
  bannerImage?: string;
  termsAndConditions?: string;
  createdAt?: string;
  updatedAt?: string;
  usageStats?: { used: number; remaining: number | string };
}

export interface CouponUsageStats {
  totalUsed: number;
  uniqueUsers: number;
  totalDiscountGiven: number;
  remainingUses: number | string;
}

export interface CouponUsage {
  user: {
    _id: string;
    name: string;
    phone: string;
  };
  order: string;
  date: string;
  discount: number;
}

export interface CouponDetailsResponse {
  coupon: Coupon;
  usageStats: CouponUsageStats;
  recentUsage: CouponUsage[];
}

export interface CouponListResponse {
  coupons: Coupon[];
  pagination: PaginationMeta;
}

export interface GetCouponsParams {
  status?: CouponStatus;
  discountType?: DiscountType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateCouponRequest {
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue?: number;
  maxDiscountAmount?: number;
  freeAddonCount?: number;
  freeAddonMaxValue?: number;
  extraVoucherCount?: number;
  extraVoucherExpiryDays?: number;
  minOrderValue?: number;
  minItems?: number;
  applicableMenuTypes?: string[];
  applicableKitchenIds?: string[];
  applicableZoneIds?: string[];
  excludedKitchenIds?: string[];
  totalUsageLimit?: number;
  perUserLimit?: number;
  targetUserType?: TargetUserType;
  specificUserIds?: string[];
  isFirstOrderOnly?: boolean;
  validFrom: string;
  validTill: string;
  status?: CouponStatus;
  isVisible?: boolean;
  displayOrder?: number;
  bannerImage?: string;
  termsAndConditions?: string;
}

export type UpdateCouponRequest = Partial<Omit<CreateCouponRequest, 'code'>>;

// ============================================================================
// Voucher Management Types
// ============================================================================

export interface Voucher {
  _id: string;
  userId: string;
  subscriptionId: string;
  voucherCode: string;
  status: VoucherStatus;
  expiresAt: string;
  redeemedAt?: string;
  orderId?: string;
  createdAt: string;
}

export interface VoucherListResponse {
  vouchers: Voucher[];
  pagination: PaginationMeta;
}

export interface VoucherStatistics {
  totalVouchers: number;
  availableVouchers: number;
  redeemedVouchers: number;
  expiredVouchers: number;
}

// ============================================================================
// Refund Management Types
// ============================================================================

export interface Refund {
  _id: string;
  orderId: string;
  userId: string;
  amount: number;
  reason: RefundReason;
  reasonDetails?: string;
  status: RefundStatus;
  notes?: string;
  processedAt?: string;
  completedAt?: string;
  failureReason?: string;
  retryCount?: number;
  createdAt: string;
}

export interface RefundListResponse {
  refunds: Refund[];
  pagination: PaginationMeta;
}

export interface RefundStatistics {
  totalRefunds: number;
  pendingRefunds: number;
  completedRefunds: number;
  failedRefunds: number;
  totalAmountRefunded: number;
}

// ============================================================================
// Order Management Types
// ============================================================================

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isMainCourse: boolean;
  addons: {
    addonId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}

export interface DeliveryAddress {
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  locality: string;
  city: string;
  pincode: string;
  contactName?: string;
  contactPhone?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface StatusEntry {
  status: OrderStatus;
  timestamp: string;
  updatedBy?: string;
  notes?: string;
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export interface Order {
  _id: string;
  orderNumber: string;
  userId: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
  };
  kitchenId: {
    _id: string;
    name: string;
    code: string;
    contactPhone?: string;
  };
  zoneId: {
    _id: string;
    pincode: string;
    name: string;
    city: string;
  };
  deliveryAddressId: string;
  deliveryAddress: DeliveryAddress;
  menuType: MenuType;
  mealWindow?: MealWindow;
  items: OrderItem[];
  subtotal: number;
  charges: {
    deliveryFee: number;
    serviceFee: number;
    packagingFee: number;
    handlingFee: number;
    taxAmount: number;
    taxBreakdown: {
      taxType: string;
      rate: number;
      amount: number;
    }[];
  };
  discount?: {
    couponId?: string;
    couponCode?: string;
    discountAmount: number;
    discountType: string;
  };
  grandTotal: number;
  voucherUsage: {
    voucherIds?: string[];
    voucherCount: number;
    mainCoursesCovered: number;
    voucherCoverage?: number;
  };
  amountPaid: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  paymentId?: string;
  acceptedAt?: string; // Timestamp when auto-accepted
  orderSource?: OrderSource; // DIRECT, SCHEDULED, or AUTO_ORDER
  isAutoOrder?: boolean; // Subscription-based auto-order flag (legacy)
  isScheduledMeal?: boolean; // Scheduled meal flag (legacy)
  scheduledFor?: string; // Date/time the order is scheduled for delivery
  autoAccepted?: boolean; // Response field from order creation
  distanceMetadata?: {
    distanceFromKitchenKm?: number;
    acceptanceZone?: 'AUTO_ACCEPT' | 'MANUAL_ACCEPT';
    kitchenAcceptanceDeadline?: string;
    kitchenResponseAt?: string;
    autoRejectedAt?: string;
  };
  status: OrderStatus;
  statusTimeline: StatusEntry[];
  specialInstructions?: string;
  leaveAtDoor?: boolean;
  doNotContact?: boolean;
  batchId?: string; // Added when order is batched for delivery
  driverId?: string; // Added when driver is assigned
  placedAt: string;
  estimatedDeliveryTime?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancelledBy?: 'CUSTOMER' | 'KITCHEN' | 'ADMIN' | 'SYSTEM';
  deliveredAt?: string;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  orders: Order[];
  pagination: PaginationMeta;
}

export interface OrderStatistics {
  today: {
    total: number;
    placed: number;
    accepted: number;
    preparing: number;
    ready: number;
    pickedUp: number;
    outForDelivery: number;
    delivered: number;
    cancelled: number;
    rejected: number;
  };
  byMenuType: {
    MEAL_MENU: number;
    ON_DEMAND_MENU: number;
  };
  byMealWindow: {
    LUNCH: number;
    DINNER: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  averageOrderValue: {
    MEAL_MENU: number;
    ON_DEMAND_MENU: number;
  };
}

// ============================================================================
// Menu Management Types (Updated for new API)
// ============================================================================

export type MealType = 'LUNCH' | 'DINNER';
export type DietaryType = 'VEG' | 'NON_VEG' | 'VEGAN' | 'EGGETARIAN';
export type SpiceLevel = 'MILD' | 'MEDIUM' | 'SPICY' | 'EXTRA_SPICY';
export type MenuItemCategory = 'MAIN_COURSE' | 'APPETIZER' | 'DESSERT' | 'BEVERAGE' | 'SNACK';
export type MenuItemStatus = 'ACTIVE' | 'INACTIVE' | 'DISABLED_BY_ADMIN';

// Add-on Types
export interface Addon {
  _id: string;
  kitchenId: string;
  name: string;
  description?: string;
  price: number;
  dietaryType: DietaryType;
  image?: string;
  minQuantity: number;
  maxQuantity: number;
  isAvailable: boolean;
  displayOrder: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AddonReference {
  _id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

// Menu Item Types
export interface MenuItem {
  _id: string;
  kitchenId: string | Kitchen;
  name: string;
  description?: string;
  category: MenuItemCategory;
  menuType: MenuType;
  mealWindow?: MealWindow;
  price: number;
  discountedPrice?: number;
  portionSize?: string;
  preparationTime?: number;
  dietaryType: DietaryType;
  isJainFriendly: boolean;
  spiceLevel: SpiceLevel;
  images: string[];
  thumbnailImage?: string;
  addonIds: AddonReference[];
  includes: string[];
  isAvailable: boolean;
  displayOrder: number;
  isFeatured: boolean;
  status: MenuItemStatus;
  disabledReason?: string;
  disabledBy?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealMenuGroup {
  lunch?: MenuItem;
  dinner?: MenuItem;
}

export interface MenuItemsListResponse {
  menuItems: MenuItem[];
  mealMenu?: MealMenuGroup;
  onDemandMenu?: MenuItem[];
  pagination: PaginationMeta;
}

export interface MenuItemDetailsResponse {
  menuItem: MenuItem;
  addons: Addon[];
  kitchen: Kitchen;
}

export interface CreateMenuItemRequest {
  kitchenId: string;
  name: string;
  description?: string;
  category: MenuItemCategory;
  menuType: MenuType;
  mealWindow?: MealWindow;
  price: number;
  discountedPrice?: number;
  portionSize?: string;
  preparationTime?: number;
  dietaryType: DietaryType;
  isJainFriendly: boolean;
  spiceLevel: SpiceLevel;
  images: string[];
  thumbnailImage?: string;
  addonIds?: string[];
  includes: string[];
  isAvailable: boolean;
  displayOrder: number;
  isFeatured: boolean;
}

export interface UpdateMenuItemRequest extends Partial<CreateMenuItemRequest> { }

// Kitchen Menu Response
export interface KitchenMenuResponse {
  kitchen: Kitchen;
  mealMenu: MealMenuGroup;
  onDemandMenu: MenuItem[];
  isVoucherEligible: boolean;
  isCouponEligible: boolean;
}

// Meal Window Menu Item
export interface MealMenuItemResponse {
  item: MenuItem;
  isAvailable: boolean;
  canUseVoucher: boolean;
  cutoffTime: string;
  isPastCutoff: boolean;
}

// Add-on Management Types
export interface CreateAddonRequest {
  kitchenId: string;
  name: string;
  description?: string;
  price: number;
  dietaryType: DietaryType;
  image?: string;
  minQuantity?: number;
  maxQuantity?: number;
  isAvailable: boolean;
  displayOrder?: number;
}

export interface UpdateAddonRequest extends Partial<CreateAddonRequest> { }

export interface AddonListResponse {
  addons: Addon[];
  pagination: PaginationMeta;
}

export interface AddonDetailsResponse {
  addon: Addon;
  kitchen: Kitchen;
  usedInMenuItems: number;
}

export interface AddonLibraryResponse {
  addons: (Addon & { menuItemCount: number })[];
  totalCount: number;
  activeCount: number;
}

export interface AddonsForMenuItemResponse {
  attached: (Addon & { isAttached: boolean })[];
  available: (Addon & { isAttached: boolean })[];
}

// Legacy types for backward compatibility
export type FoodType = DietaryType;

// ============================================================================
// Delivery/Batch Management Types
// ============================================================================

export interface Batch {
  _id: string;
  kitchenId: string;
  zoneId: string;
  driverId?: string;
  status: BatchStatus;
  mealWindow: MealWindow;
  orders: string[];
  createdAt: string;
  dispatchedAt?: string;
  completedAt?: string;
}

export interface BatchListResponse {
  batches: Batch[];
  pagination: PaginationMeta;
}

export interface DeliveryStatistics {
  totalBatches: number;
  activeBatches: number;
  completedBatches: number;
  failedDeliveries: number;
  avgDeliveryTime: number;
}

// ============================================================================
// Subscription Management Types
// ============================================================================

export interface Plan {
  _id: string;
  name: string;
  description: string;
  durationDays: number;
  vouchersPerDay: number;
  voucherValidityDays: number;
  price: number;
  originalPrice: number;
  coverageRules: {
    includesAddons: boolean;
    addonValuePerVoucher: number;
    mealTypes: string[];
  };
  applicableZoneIds: string[];
  displayOrder: number;
  badge?: string;
  features: string[];
  status: PlanStatus;
  createdAt?: string;
}

export interface PlanListResponse {
  plans: Plan[];
  pagination: PaginationMeta;
}

export interface Subscription {
  _id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  vouchersGenerated: number;
  vouchersUsed: number;
  purchaseDate: string;
}

export interface SubscriptionListResponse {
  subscriptions: Subscription[];
  pagination: PaginationMeta;
}

// ============================================================================
// Audit Log Types
// ============================================================================

export interface AuditLog {
  _id: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  details: Record<string, any>;
  createdAt: string;
}

export interface AuditLogListResponse {
  logs: AuditLog[];
  pagination: PaginationMeta;
}

// ============================================================================
// Report Types
// ============================================================================

export interface ReportDataPoint {
  _id: string;
  totalOrders?: number;
  totalValue?: number;
  entity?: {
    name: string;
    code?: string;
  };
}

export interface Report {
  type: ReportType;
  segmentBy?: SegmentBy;
  data: ReportDataPoint[];
}

export interface ExportReportResponse {
  format: 'CSV' | 'EXCEL';
  data: string;
}

// ============================================================================
// Customer Types (for Users Management)
// ============================================================================

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  hasActiveSubscription: boolean;
  totalOrders: number;
  totalSpent: number;
  availableVouchers: number;
  createdAt: string;
  lastOrderAt?: string;
}

export interface CustomersListResponse {
  customers: Customer[];
  pagination?: PaginationMeta;
}

export interface CustomerOrdersResponse {
  orders: Order[];
  pagination?: PaginationMeta;
}

export interface CustomerVoucher {
  _id: string;
  voucherCode: string;
  status: VoucherStatus;
  subscriptionId: string;
  expiresAt: string;
  redeemedAt?: string;
  orderId?: string;
  createdAt: string;
}

export interface CustomerVouchersResponse {
  vouchers: CustomerVoucher[];
}

// =============================================
// Referral Types
// =============================================

export type ReferralStatus = 'PENDING' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';

export interface Referral {
  _id: string;
  referrerUserId: {
    _id: string;
    name: string;
    phone: string;
  };
  refereeUserId: {
    _id: string;
    name: string;
    phone: string;
  };
  referralCode: string;
  status: ReferralStatus;
  conversionDate?: string;
  conversionSubscriptionId?: string;
  referrerReward?: {
    voucherCount: number;
    voucherIds: string[];
    issuedAt: string;
  };
  refereeReward?: {
    voucherCount: number;
    voucherIds: string[];
    issuedAt: string;
  };
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralListResponse {
  referrals: Referral[];
  pagination: PaginationMeta;
}

export interface ReferralAnalytics {
  totalReferrals: number;
  totalConverted: number;
  totalPending: number;
  totalExpired: number;
  conversionRate: number;
  totalVouchersIssued: number;
  topReferrers: Array<{
    userId: string;
    name: string;
    phone: string;
    referralCount: number;
    convertedCount: number;
  }>;
}

export interface ReferralConfig {
  enabled: boolean;
  conversionEvent: string;
  conversionWindowDays: number;
  referrerReward: {
    voucherCount: number;
    voucherMealType: string;
    voucherValidityDays: number;
  };
  refereeReward: {
    voucherCount: number;
    voucherMealType: string;
    voucherValidityDays: number;
  };
  maxReferralsPerUser: number;
  milestones: Array<{
    referralCount: number;
    bonusVouchers: number;
    badgeName: string;
  }>;
  shareMessage: string;
  antiAbuse: {
    sameAddressLimit: number;
    minPlanValueForConversion: number;
  };
}

export interface GetReferralsParams {
  page?: number;
  limit?: number;
  status?: ReferralStatus;
  referrerId?: string;
  refereeId?: string;
  sortBy?: string;
}

export interface UserReferralDetails {
  user: {
    _id: string;
    name: string;
    phone: string;
    referralCode: string;
    referredBy?: string;
  };
  stats: {
    totalReferred: number;
    totalConverted: number;
    totalVouchersEarned: number;
  };
  referrals: Referral[];
}
