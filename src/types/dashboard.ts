// Dashboard Types

// Order status enum
export type OrderStatus =
  | 'ordered'
  | 'confirmed'
  | 'preparing'
  | 'packed'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'cancelled';

// Meal type enum
export type MealType = 'lunch' | 'dinner' | 'all';

// Order interface
export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  mealType: MealType;
  status: OrderStatus;
  items: string[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

// KPI Metric interface
export interface KpiMetric {
  id: string;
  label: string;
  value: number;
  unit?: string;
  prefix?: string;
  changePercent?: number;
  changeDirection?: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
}

// Subscription Plan interface
export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: 'weekly' | 'monthly';
  mealsPerDay: number;
  activeSubscribers: number;
  totalRevenue: number;
}

// Chart data point interface
export interface ChartPoint {
  date: string;
  label: string;
  value: number;
  secondaryValue?: number;
}

// Chart data interface
export interface ChartData {
  title: string;
  points: ChartPoint[];
  primaryLabel: string;
  secondaryLabel?: string;
  primaryColor: string;
  secondaryColor?: string;
}

// Meal slot snapshot interface
export interface MealSlotSnapshot {
  mealType: 'lunch' | 'dinner';
  totalOrders: number;
  preparing: number;
  packed: number;
  delivered: number;
  pending: number;
}

// Order status funnel item interface
export interface OrderStatusFunnelItem {
  status: string;
  label: string;
  count: number;
  color: string;
  icon: string;
}

// Activity item interface
export interface ActivityItem {
  id: string;
  type: 'order' | 'subscription' | 'delivery' | 'user' | 'system';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  color: string;
}

// Filter state interface
export interface FilterState {
  dateRange: {
    start: Date;
    end: Date;
  };
  mealType: MealType;
}

// Dashboard data interface
export interface DashboardData {
  kpis: KpiMetric[];
  orderStatusFunnel: OrderStatusFunnelItem[];
  mealSlots: MealSlotSnapshot[];
  chartData: ChartData;
  planSummary: Plan[];
  recentActivity: ActivityItem[];
}
