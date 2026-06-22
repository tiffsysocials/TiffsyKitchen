import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';
import { sortOrdersByDeliverySequence } from '../../../utils/batchSequence';

interface Props {
  batch: any;
  orders: any[];
  assignments: any[];
}

interface TimelineEvent {
  time: string | null;
  icon: string;
  color: string;
  title: string;
  subtitle?: string;
}

const BatchTimeline: React.FC<Props> = ({ batch, orders, assignments }) => {
  const events: TimelineEvent[] = [];

  // Batch created
  if (batch.createdAt) {
    events.push({
      time: batch.createdAt,
      icon: 'add-circle',
      color: '#3b82f6',
      title: `Batch created (${batch.orderIds?.length || 0} orders)`,
    });
  }

  // Route optimized
  if (batch.routeOptimization?.optimizedAt) {
    events.push({
      time: batch.routeOptimization.optimizedAt,
      icon: 'route',
      color: '#8b5cf6',
      title: `Route optimized — ${batch.routeOptimization.algorithm}`,
      subtitle: batch.routeOptimization.totalDistanceMeters != null ? `${(batch.routeOptimization.totalDistanceMeters / 1000).toFixed(1)} km total` : undefined,
    });
  }

  // Dispatched
  if (batch.dispatchedAt) {
    events.push({
      time: batch.dispatchedAt,
      icon: 'local-shipping',
      color: '#0d9488',
      title: 'Dispatched',
      subtitle: batch.assignmentStrategy?.mode
        ? `Assignment: ${batch.assignmentStrategy.mode.replace(/_/g, ' ')}`
        : undefined,
    });
  }

  // Driver assigned
  if (batch.driverAssignedAt && batch.driverId) {
    events.push({
      time: batch.driverAssignedAt,
      icon: 'person',
      color: '#FE8733',
      title: `${batch.driverId.name} assigned`,
      subtitle: batch.assignmentStrategy?.assignedScore
        ? `Score: ${batch.assignmentStrategy.assignedScore}`
        : undefined,
    });
  }

  // Picked up
  if (batch.pickedUpAt) {
    events.push({
      time: batch.pickedUpAt,
      icon: 'inventory',
      color: '#16a34a',
      title: `Picked up from ${batch.kitchenId?.name || 'kitchen'}`,
    });
  }

  // Individual deliveries
  if (assignments?.length) {
    assignments.forEach((assignment: any) => {
      const order = orders.find((o: any) => o._id === assignment.orderId);
      const orderNumber = order?.orderNumber || assignment.orderId?.slice(-6);

      if (assignment.deliveredAt) {
        events.push({
          time: assignment.deliveredAt,
          icon: 'check-circle',
          color: '#16a34a',
          title: `Order #${orderNumber} — DELIVERED`,
          subtitle: order?.deliveryAddress?.contactName,
        });
      } else if (assignment.failedAt) {
        events.push({
          time: assignment.failedAt,
          icon: 'cancel',
          color: '#dc2626',
          title: `Order #${orderNumber} — FAILED`,
          subtitle: assignment.failureReason,
        });
      }
    });
  }

  // Completed
  if (batch.completedAt) {
    events.push({
      time: batch.completedAt,
      icon: 'flag',
      color: '#16a34a',
      title: 'Batch completed',
      subtitle: `${batch.totalDelivered} delivered, ${batch.totalFailed} failed`,
    });
  }

  // Sort by time
  events.sort((a, b) => {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return new Date(a.time).getTime() - new Date(b.time).getTime();
  });

  // Add pending orders at the end — in optimized delivery sequence so the
  // timeline preview reflects the order they'll actually be visited.
  if (orders?.length) {
    const deliveredOrFailed = new Set(
      (assignments || [])
        .filter((a: any) => a.deliveredAt || a.failedAt)
        .map((a: any) => a.orderId)
    );
    const pendingSorted = sortOrdersByDeliverySequence(
      orders.filter((o: any) => !deliveredOrFailed.has(o._id)),
      batch,
      assignments,
    );
    pendingSorted.forEach((order: any) => {
      events.push({
        time: null,
        icon: 'radio-button-unchecked',
        color: '#9ca3af',
        title: `Order #${order.orderNumber || order._id?.slice(-6)} — Pending`,
        subtitle: order.deliveryAddress?.contactName,
      });
    });
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return '----';
    try {
      return format(new Date(iso), 'h:mm a');
    } catch {
      return '----';
    }
  };

  return (
    <View className="px-4 py-2">
      <Text className="text-base font-semibold text-gray-800 mb-4">Timeline</Text>
      {events.map((event, index) => (
        <View key={index} className="flex-row mb-1">
          {/* Time */}
          <Text className="text-xs text-gray-400 w-16 text-right mr-3 mt-1">
            {formatTime(event.time)}
          </Text>

          {/* Line + Icon */}
          <View className="items-center" style={{ width: 24 }}>
            <Icon name={event.icon} size={18} color={event.color} />
            {index < events.length - 1 && (
              <View className="w-0.5 flex-1 bg-gray-200 my-1" style={{ minHeight: 20 }} />
            )}
          </View>

          {/* Content */}
          <View className="flex-1 ml-3 pb-4">
            <Text className="text-sm text-gray-800">{event.title}</Text>
            {event.subtitle && (
              <Text className="text-xs text-gray-500 mt-0.5">{event.subtitle}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};

export default BatchTimeline;
