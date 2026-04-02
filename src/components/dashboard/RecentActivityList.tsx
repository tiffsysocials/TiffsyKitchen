import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { ActivityItem } from '../../types/dashboard';
import { SectionHeader } from './SectionHeader';
import { formatTimeAgo } from '../../data/dashboardMockData';

interface RecentActivityListProps {
  activities: ActivityItem[];
  onActivityPress?: (activityId: string) => void;
  onViewAllPress?: () => void;
  maxItems?: number;
}

export const RecentActivityList: React.FC<RecentActivityListProps> = ({
  activities,
  onActivityPress,
  onViewAllPress,
  maxItems = 5,
}) => {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Recent Activity"
        subtitle="Latest updates"
        actionLabel="View All"
        onActionPress={onViewAllPress}
      />

      {displayActivities.map((activity, index) => (
        <TouchableOpacity
          key={activity.id}
          style={[
            styles.activityRow,
            index === displayActivities.length - 1 && styles.lastRow,
          ]}
          onPress={() => onActivityPress?.(activity.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: activity.color + '20' }]}>
            <MaterialIcons name={activity.icon} size={18} color={activity.color} />
          </View>

          <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <Text style={styles.activityDescription} numberOfLines={1}>
              {activity.description}
            </Text>
          </View>

          <Text style={styles.timestamp}>{formatTimeAgo(activity.timestamp)}</Text>
        </TouchableOpacity>
      ))}

      {activities.length > maxItems && (
        <TouchableOpacity style={styles.showMoreButton} onPress={onViewAllPress}>
          <Text style={styles.showMoreText}>
            +{activities.length - maxItems} more activities
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  timestamp: {
    fontSize: 11,
    color: '#9ca3af',
  },
  showMoreButton: {
    paddingTop: 12,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 13,
    color: '#FE8733',
    fontWeight: '600',
  },
});

RecentActivityList.displayName = 'RecentActivityList';
