import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BatchTracking } from '../../../types/delivery';

interface Props {
  tracking: BatchTracking;
  /** Phase 10 — full batch document so we can read planned per-stop ETA
   *  and per-leg distance/duration from optimizedSequence/deliverySequence. */
  batch?: any;
  /** Phase 10 — populated orders (with deliveryAddress, items, charges) so
   *  we can show full per-stop details on the tracking tab too. */
  orders?: any[];
}

const ETA_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  EARLY: { bg: '#dcfce7', text: '#16a34a' },
  ON_TIME: { bg: '#dbeafe', text: '#1d4ed8' },
  LATE: { bg: '#fef9c3', text: '#a16207' },
  CRITICAL: { bg: '#fee2e2', text: '#dc2626' },
};

const DELIVERY_STATUS_CONFIG: Record<string, { icon: string; color: string }> = {
  ASSIGNED: { icon: 'radio-button-unchecked', color: '#9ca3af' },
  EN_ROUTE: { icon: 'directions-car', color: '#eab308' },
  ARRIVED: { icon: 'place', color: '#eab308' },
  DELIVERED: { icon: 'check-circle', color: '#16a34a' },
  FAILED: { icon: 'cancel', color: '#dc2626' },
};

const BatchTrackingList: React.FC<Props> = ({ tracking, batch, orders }) => {
  const { driver, deliveries } = tracking;

  // Lookup tables for the planned per-stop ETA/leg metrics and the full
  // order document by orderId, used in the per-stop details block below.
  const planByOrder = new Map<string, any>();
  const seqSource = batch?.optimizedSequence?.length > 0
    ? batch.optimizedSequence
    : batch?.deliverySequence || [];
  for (const s of seqSource) {
    if (s?.orderId) planByOrder.set(String(s.orderId), s);
  }
  const orderByOrderId = new Map<string, any>();
  for (const o of orders || []) {
    if (o?._id) orderByOrderId.set(String(o._id), o);
  }
  const fmtClock = (iso?: string | Date | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getTimeSince = (isoDate: string) => {
    const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const isStale = driver && (Date.now() - new Date(driver.updatedAt).getTime()) > 5 * 60 * 1000; // 5 minutes

  const sortedDeliveries = [...deliveries]
    .filter((delivery, index, self) => 
      index === self.findIndex(d => d.orderId === delivery.orderId)
    )
    .sort((a, b) => {
      const seqA = a.sequence?.sequenceNumber ?? 999;
      const seqB = b.sequence?.sequenceNumber ?? 999;
      return seqA - seqB;
    });

  return (
    <View className="px-4 py-2">
      {/* Driver Status */}
      <View className="bg-blue-50 p-3 rounded-lg mb-4">
        <View className="flex-row items-center">
          <Icon name="directions-car" size={20} color="#1d4ed8" />
          {driver ? (
            <View className="flex-1 ml-2">
              <Text className="text-sm font-semibold text-blue-800">{driver.name}</Text>
              <Text className="text-xs text-blue-600">
                Last seen: {getTimeSince(driver.updatedAt)} · {driver.driverStatus}
                {isStale && <Text className="text-red-500"> (stale)</Text>}
              </Text>
              {driver.latitude != null && driver.longitude != null && (
                <Text className="text-[10px] text-blue-500 mt-0.5">
                  @ {driver.latitude.toFixed(5)}, {driver.longitude.toFixed(5)}
                </Text>
              )}
            </View>
          ) : (
            <Text className="text-sm text-blue-600 ml-2">No driver location data</Text>
          )}
        </View>
        {(tracking.distanceTraveledMeters || tracking.idealDistanceMeters) ? (
          <View className="mt-1 ml-7">
            <Text className="text-xs text-blue-600">
              {tracking.idealDistanceMeters != null && (
                <Text>Ideal route: {(tracking.idealDistanceMeters / 1000).toFixed(1)} km</Text>
              )}
              {tracking.distanceTraveledMeters != null && tracking.distanceTraveledMeters > 0 && (
                <Text>
                  {tracking.idealDistanceMeters != null ? '  ·  ' : ''}
                  Driven: {(tracking.distanceTraveledMeters / 1000).toFixed(1)} km
                </Text>
              )}
            </Text>
            {tracking.distanceDeviationMeters != null && tracking.distanceDeviationMeters > 200 && (
              <Text
                className="text-xs font-semibold mt-0.5"
                style={{ color: (tracking.distanceDeviationPercent ?? 0) >= 25 ? '#dc2626' : '#a16207' }}
              >
                +{(tracking.distanceDeviationMeters / 1000).toFixed(1)} km over ideal
                {tracking.distanceDeviationPercent != null ? ` (+${tracking.distanceDeviationPercent}%)` : ''}
              </Text>
            )}
          </View>
        ) : null}
      </View>

      {/* Progress Summary */}
      <View className="flex-row mb-4">
        <View className="flex-1 items-center">
          <Text className="text-2xl font-bold text-gray-800">{tracking.deliveredCount}</Text>
          <Text className="text-xs text-gray-500">Delivered</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-2xl font-bold text-red-600">{tracking.failedCount}</Text>
          <Text className="text-xs text-gray-500">Failed</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-2xl font-bold text-gray-800">
            {tracking.totalOrders - tracking.deliveredCount - tracking.failedCount}
          </Text>
          <Text className="text-xs text-gray-500">Remaining</Text>
        </View>
      </View>

      {/* Route Info */}
      {tracking.routeOptimization && (
        <View className="bg-gray-50 p-3 rounded-lg mb-4">
          <Text className="text-xs text-gray-500">
            Route: {tracking.routeOptimization.algorithm}{tracking.routeOptimization.totalDistanceMeters != null ? ` · ${(tracking.routeOptimization.totalDistanceMeters / 1000).toFixed(1)} km` : ''}{tracking.routeOptimization.totalDurationSeconds != null ? ` · ~${Math.round(tracking.routeOptimization.totalDurationSeconds / 60)} min` : ''}{tracking.routeOptimization.improvementPercent != null ? ` · ${tracking.routeOptimization.improvementPercent}% optimized` : ''}
          </Text>
        </View>
      )}

      {/* Delivery Stops */}
      <Text className="text-base font-semibold text-gray-800 mb-3">Delivery Stops</Text>
      {sortedDeliveries.map((delivery, index) => {
        const statusConfig = DELIVERY_STATUS_CONFIG[delivery.deliveryStatus || 'ASSIGNED'] || DELIVERY_STATUS_CONFIG.ASSIGNED;
        const etaColors = delivery.etaStatus ? ETA_STATUS_COLORS[delivery.etaStatus] : null;
        const isLast = index === sortedDeliveries.length - 1;
        const plan = planByOrder.get(String(delivery.orderId));
        const order = orderByOrderId.get(String(delivery.orderId));
        const arrivalClock = fmtClock(plan?.estimatedArrival);
        const legKm = plan?.distanceFromPrevMeters != null
          ? (plan.distanceFromPrevMeters / 1000).toFixed(1)
          : null;
        const legMin = plan?.estimatedDurationFromPrevSeconds != null
          ? Math.round(plan.estimatedDurationFromPrevSeconds / 60)
          : null;
        const addr = order?.deliveryAddress;
        const addrLine = addr
          ? [addr.addressLine1, addr.locality, addr.pincode].filter(Boolean).join(', ')
          : null;
        const itemsSummary = order?.items?.length
          ? order.items
              .map((it: any) => `${it.quantity}× ${it.name}`)
              .join(', ')
          : null;

        return (
          <View key={delivery.orderId} className="flex-row">
            {/* Sequence line */}
            <View className="items-center" style={{ width: 32 }}>
              <View
                className="w-6 h-6 rounded-full items-center justify-center"
                style={{ backgroundColor: statusConfig.color + '20' }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: statusConfig.color }}>
                  {delivery.sequence?.sequenceNumber || index + 1}
                </Text>
              </View>
              {!isLast && <View className="w-0.5 flex-1 bg-gray-200 my-1" />}
            </View>

            {/* Content */}
            <View className="flex-1 ml-3 pb-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <Icon name={statusConfig.icon} size={16} color={statusConfig.color} />
                  <Text className="text-sm font-medium text-gray-800 ml-1">
                    #{delivery.orderNumber}
                  </Text>
                  {arrivalClock && (
                    <Text className="text-xs text-gray-500 ml-2">
                      arrives ~{arrivalClock}
                    </Text>
                  )}
                </View>
                {etaColors && delivery.etaStatus && (
                  <View style={{ backgroundColor: etaColors.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                    <Text style={{ color: etaColors.text, fontSize: 10, fontWeight: '600' }}>
                      {delivery.etaStatus}
                    </Text>
                  </View>
                )}
              </View>

              {/* Live driver-tracking line */}
              <View className="flex-row items-center mt-1">
                {delivery.etaSeconds != null && (
                  <Text className="text-xs text-gray-500 mr-3">
                    Live ETA: ~{Math.round(delivery.etaSeconds / 60)} min
                  </Text>
                )}
                {delivery.distanceFromDriverMeters != null && (
                  <Text className="text-xs text-gray-500">
                    {delivery.distanceSource && delivery.distanceSource !== 'haversine' ? '' : '~'}
                    {(delivery.distanceFromDriverMeters / 1000).toFixed(1)} km from driver
                  </Text>
                )}
              </View>

              {/* Planned leg metrics (from kitchen/previous stop) */}
              {(legKm != null || legMin != null) && (
                <Text className="text-xs text-gray-400 mt-0.5">
                  Leg: {legKm ?? '–'} km · ~{legMin ?? '–'} min from {index === 0 ? 'kitchen' : 'prev stop'}
                </Text>
              )}

              {/* Customer + address + items */}
              {(addr?.contactName || addr?.contactPhone) && (
                <Text className="text-xs text-gray-600 mt-1" numberOfLines={1}>
                  {addr.contactName}{addr.contactName && addr.contactPhone ? ' · ' : ''}{addr.contactPhone}
                </Text>
              )}
              {addrLine && (
                <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={2}>
                  {addrLine}
                </Text>
              )}
              {itemsSummary && (
                <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                  {itemsSummary}
                </Text>
              )}
              {order?.grandTotal != null && (
                <Text className="text-xs text-gray-500 mt-0.5">
                  ₹{Math.round(order.grandTotal)} · {order.paymentStatus || 'PENDING'}
                </Text>
              )}

              <Text className="text-xs text-gray-400 mt-0.5">
                {delivery.deliveryStatus || 'Pending'} · {delivery.orderStatus}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default BatchTrackingList;
