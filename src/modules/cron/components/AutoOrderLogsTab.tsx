/**
 * Auto-Order Logs Tab
 *
 * Shows auto-order execution logs with filters and pagination
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { getAutoOrderLogs } from '../../../services/cron.service';
import { AutoOrderLogStatus, AutoOrderLog } from '../../../types/cron.types';

const PRIMARY_COLOR = '#FE8733';

type StatusFilter = 'ALL' | AutoOrderLogStatus;
type MealFilter = 'ALL' | 'LUNCH' | 'DINNER';

const STATUS_COLORS: Record<AutoOrderLogStatus, { bg: string; color: string }> = {
  SUCCESS: { bg: '#dcfce7', color: '#16a34a' },
  SKIPPED: { bg: '#fef3c7', color: '#d97706' },
  FAILED: { bg: '#fee2e2', color: '#dc2626' },
};

const formatCategory = (category: string): string => {
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const AutoOrderLogsTab: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [mealFilter, setMealFilter] = useState<MealFilter>('ALL');
  const [page, setPage] = useState(1);

  const filters = {
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    ...(mealFilter !== 'ALL' ? { mealWindow: mealFilter as 'LUNCH' | 'DINNER' } : {}),
    page,
    limit: 30,
  };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['autoOrderLogs', statusFilter, mealFilter, page],
    queryFn: () => getAutoOrderLogs(filters),
  });

  const handleFilterChange = (newStatus: StatusFilter) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const handleMealFilterChange = (newMeal: MealFilter) => {
    setMealFilter(newMeal);
    setPage(1);
  };

  const renderStatsBar = () => {
    if (!data?.stats) return null;
    const { success, skipped, failed } = data.stats;
    return (
      <View style={styles.statsBar}>
        <View style={[styles.statItem, { backgroundColor: '#dcfce7' }]}>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>{success}</Text>
          <Text style={[styles.statLabel, { color: '#16a34a' }]}>Success</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: '#fef3c7' }]}>
          <Text style={[styles.statValue, { color: '#d97706' }]}>{skipped}</Text>
          <Text style={[styles.statLabel, { color: '#d97706' }]}>Skipped</Text>
        </View>
        <View style={[styles.statItem, { backgroundColor: '#fee2e2' }]}>
          <Text style={[styles.statValue, { color: '#dc2626' }]}>{failed}</Text>
          <Text style={[styles.statLabel, { color: '#dc2626' }]}>Failed</Text>
        </View>
      </View>
    );
  };

  const renderLogItem = ({ item }: { item: AutoOrderLog }) => {
    const statusColor = STATUS_COLORS[item.status];
    return (
      <View style={styles.logCard}>
        <View style={styles.logHeader}>
          <View style={styles.logUserInfo}>
            <Icon name="person" size={16} color="#6b7280" />
            <Text style={styles.logUserName}>{item.userId?.name || 'Unknown'}</Text>
            <Text style={styles.logUserPhone}>{item.userId?.phone || ''}</Text>
          </View>
          <View style={[styles.logStatusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.logStatusText, { color: statusColor.color }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.logDetails}>
          <View style={styles.logDetailRow}>
            <View style={[styles.mealBadge, {
              backgroundColor: item.mealWindow === 'LUNCH' ? '#dbeafe' : '#fce7f3',
            }]}>
              <Text style={[styles.mealBadgeText, {
                color: item.mealWindow === 'LUNCH' ? '#2563eb' : '#db2777',
              }]}>
                {item.mealWindow}
              </Text>
            </View>

            {item.orderId && (
              <Text style={styles.orderNumber}>
                {item.orderId.orderNumber}
              </Text>
            )}
          </View>

          {item.status === 'FAILED' && item.failureCategory && (
            <View style={styles.failureInfo}>
              <Icon name="error-outline" size={14} color="#dc2626" />
              <Text style={styles.failureCategory}>
                {formatCategory(item.failureCategory)}
              </Text>
            </View>
          )}

          {item.failureReason && (
            <Text style={styles.failureReason}>{item.failureReason}</Text>
          )}

          <Text style={styles.logTimestamp}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>
      </View>
    );
  };

  const renderPagination = () => {
    if (!data?.pagination) return null;
    const { page: currentPage, pages: totalPages } = data.pagination;
    if (totalPages <= 1) return null;

    return (
      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.pageButton, currentPage <= 1 && styles.pageButtonDisabled]}
          disabled={currentPage <= 1}
          onPress={() => setPage(currentPage - 1)}
        >
          <Icon name="chevron-left" size={20} color={currentPage <= 1 ? '#d1d5db' : '#374151'} />
        </TouchableOpacity>
        <Text style={styles.pageInfo}>
          Page {currentPage} of {totalPages}
        </Text>
        <TouchableOpacity
          style={[styles.pageButton, currentPage >= totalPages && styles.pageButtonDisabled]}
          disabled={currentPage >= totalPages}
          onPress={() => setPage(currentPage + 1)}
        >
          <Icon name="chevron-right" size={20} color={currentPage >= totalPages ? '#d1d5db' : '#374151'} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      {renderStatsBar()}

      {/* Filters */}
      <View style={styles.filtersSection}>
        <View style={styles.filterRow}>
          {(['ALL', 'SUCCESS', 'SKIPPED', 'FAILED'] as StatusFilter[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
              onPress={() => handleFilterChange(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === status && styles.filterChipTextActive,
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.filterRow}>
          {(['ALL', 'LUNCH', 'DINNER'] as MealFilter[]).map((meal) => (
            <TouchableOpacity
              key={meal}
              style={[styles.filterChip, mealFilter === meal && styles.filterChipActive]}
              onPress={() => handleMealFilterChange(meal)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  mealFilter === meal && styles.filterChipTextActive,
                ]}
              >
                {meal}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Logs List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading logs...</Text>
        </View>
      ) : !data?.logs || data.logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="list-alt" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Logs Found</Text>
          <Text style={styles.emptyText}>
            No auto-order logs match the selected filters
          </Text>
        </View>
      ) : (
        <FlatList
          data={data.logs}
          keyExtractor={(item) => item._id}
          renderItem={renderLogItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={PRIMARY_COLOR}
            />
          }
          ListFooterComponent={renderPagination}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  filtersSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  listContent: {
    padding: 12,
  },
  logCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  logUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  logUserPhone: {
    fontSize: 12,
    color: '#9ca3af',
  },
  logStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  logStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logDetails: {
    gap: 6,
  },
  logDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mealBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderNumber: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  failureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  failureCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  failureReason: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  logTimestamp: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  pageButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageInfo: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
});
