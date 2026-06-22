export interface Delivery {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  driverId?: string;
  driverName?: string;
  status: DeliveryStatus;
  pickupAddress: {
    street: string;
    city: string;
    state: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  deliveryInstructions?: string;
  estimatedPickupTime?: string;
  actualPickupTime?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  distance?: number; // in km
  deliveryFee: number;
  driverEarnings: number;
  proofOfDelivery?: {
    imageUrl: string;
    signature?: string;
    notes?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'accepted'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export interface DeliveryStats {
  totalDeliveries: number;
  pendingDeliveries: number;
  inProgressDeliveries: number;
  completedDeliveries: number;
  averageDeliveryTime: number; // in minutes
  onTimeDeliveryRate: number; // percentage
}

export interface DriverEarnings {
  period: string;
  totalEarnings: number;
  deliveriesCount: number;
  averagePerDelivery: number;
  tips: number;
  bonuses: number;
}

// ─── Batch & Delivery Management Types ───

export type BatchStatus =
  | 'COLLECTING'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PARTIAL_COMPLETE'
  | 'CANCELLED';

export type AssignmentMode = 'SELF_ACCEPT' | 'AUTO_ASSIGNMENT' | 'SMART_BROADCAST' | 'MANUAL';

export interface Batch {
  _id: string;
  batchNumber: string;
  status: BatchStatus;
  kitchenId: { _id: string; name: string };
  zoneId: { _id: string; name: string };
  mealWindow: 'LUNCH' | 'DINNER';
  batchDate: string;
  orderIds: string[];
  driverId: { _id: string; name: string; phone: string } | null;
  driverAssignedAt: string | null;
  routeOptimization: {
    algorithm: string;
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    improvementPercent: number;
    optimizedAt: string;
    fifoDistanceMeters: number;
  } | null;
  optimizedSequence: Array<{
    orderId: string;
    sequenceNumber: number;
    estimatedArrival: string;
    estimatedDurationFromPrevSeconds: number;
    distanceFromPrevMeters: number;
    coordinates: { latitude: number; longitude: number };
  }>;
  assignmentStrategy: {
    mode: AssignmentMode;
    assignedScore: number;
    broadcastedTo: Array<{
      driverId: string;
      broadcastedAt: string;
      respondedAt: string | null;
      response: 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
      score: number;
    }>;
    manualAssignedBy: string | null;
    manualAssignmentReason: string | null;
  };
  windowEndTime: string;
  dispatchedAt: string | null;
  pickedUpAt: string | null;
  completedAt: string | null;
  totalDelivered: number;
  totalFailed: number;
  createdAt: string;
}

export interface BatchTracking {
  batchId: string;
  batchNumber: string;
  batchStatus: string;
  kitchenId: string;
  driver: {
    driverId: string;
    name: string;
    latitude: number;
    longitude: number;
    updatedAt: string;
    driverStatus: string;
  } | null;
  routeOptimization: {
    algorithm: string;
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    improvementPercent: number;
    optimizedAt: string;
  } | null;
  totalOrders: number;
  deliveredCount: number;
  failedCount: number;
  /** Total real road distance the driver has driven so far (meters). */
  distanceTraveledMeters?: number;
  /** Ideal planned-route distance (kitchen → all stops) via Google (meters). */
  idealDistanceMeters?: number | null;
  idealDistanceSource?: 'google' | 'osrm' | 'haversine' | null;
  /** driven − ideal; positive means the driver drove more than planned. */
  distanceDeviationMeters?: number | null;
  distanceDeviationPercent?: number | null;
  deliveries: Array<{
    orderId: string;
    orderNumber: string;
    orderStatus: string;
    deliveryStatus: string | null;
    coordinates: { latitude: number; longitude: number } | null;
    distanceFromDriverMeters: number | null;
    /** 'google'/'osrm' = real road distance; 'haversine' = straight-line estimate. */
    distanceSource?: 'google' | 'osrm' | 'haversine' | null;
    etaSeconds: number | null;
    etaStatus: 'EARLY' | 'ON_TIME' | 'LATE' | 'CRITICAL' | null;
    sequence: {
      sequenceNumber: number;
      totalInBatch: number;
      source: 'OPTIMIZED' | 'MANUAL';
    } | null;
  }>;
}

export interface RoutePlanningConfig {
  enabled: boolean;
  useOsrm: boolean;
  osrmServerUrl: string;
  clusteringEpsilonMeters: number;
  maxOrdersPerBatch: number;
  optimizationAlgorithm: 'auto' | 'brute_force' | 'two_opt' | 'nearest_neighbor';
  etaRecalcIntervalSeconds: number;
  haversineRoadFactor: number;
  osrmTimeoutMs: number;
  cacheExpiryMinutes: number;
}

export interface DriverAssignmentConfig {
  enabled: boolean;
  mode: AssignmentMode;
  broadcastDriverCount: number;
  broadcastTimeoutSeconds: number;
  scoringWeights: {
    proximity: number;
    completionRate: number;
    activeLoad: number;
    recency: number;
  };
  maxDriverSearchRadiusMeters: number;
  autoReassignOnTimeout: boolean;
  manualAssignmentEnabled: boolean;
}
