/**
 * Failure Summary Tab
 *
 * Shows aggregated auto-order failure data with category breakdowns
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { getAutoOrderLogsSummary } from '../../../services/cron.service';

const PRIMARY_COLOR = '#FE8733';

const CATEGORY_ICONS: Record<string, string> = {
  NO_VOUCHERS: 'credit-card-off',
  NO_ADDRESS: 'location-off',
  NO_ZONE: 'wrong-location',
  NO_KITCHEN: 'store',
  NO_MENU: 'restaurant',
  ORDER_CREATION_FAILED: 'error',
  KITCHEN_NOT_SERVING_ZONE: 'block',
};

const CATEGORY_COLORS: Record<string, string> = {
  NO_VOUCHERS: '#dc2626',
  NO_ADDRESS: '#d97706',
  NO_ZONE: '#9333ea',
  NO_KITCHEN: '#2563eb',
  NO_MENU: '#0891b2',
  ORDER_CREATION_FAILED: '#be123c',
  KITCHEN_NOT_SERVING_ZONE: '#4b5563',
};

const formatCategory = (category: string): string => {
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const FailureSummaryTab: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['failureSummary', dateFrom, dateTo],
    queryFn: () => getAutoOrderLogsSummary(
      dateFrom || undefined,
      dateTo || undefined,
    ),
  });

  const overallStats = data?.overallStats;
  const summary = data?.summary;
  const dateRange = data?.dateRange;

  const successRate = overallStats && overallStats.total > 0
    ? ((overallStats.success / overallStats.total) * 100).toFixed(1)
    : '0';

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading failure summary...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={PRIMARY_COLOR}
        />
      }
    >
      {/* Date Range */}
      <View style={styles.dateRangeCard}>
        <Text style={styles.dateRangeTitle}>Date Range</Text>
        <View style={styles.dateInputRow}>
          <View style={styles.dateInputWrapper}>
            <Text style={styles.dateInputLabel}>From</Text>
            <TextInput
              style={styles.dateInput}
              value={dateFrom}
              onChangeText={setDateFrom}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View style={styles.dateInputWrapper}>
            <Text style={styles.dateInputLabel}>To</Text>
            <TextInput
              style={styles.dateInput}
              value={dateTo}
              onChangeText={setDateTo}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>
        {dateRange && (
          <Text style={styles.dateRangeInfo}>
            Showing: {new Date(dateRange.from).toLocaleDateString()} -{' '}
            {new Date(dateRange.to).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* Overall Stats */}
      {overallStats && (
        <View style={styles.overallCard}>
          <Text style={styles.overallTitle}>Overall Statistics</Text>
          <View style={styles.overallStatsRow}>
            <View style={styles.overallStat}>
              <Text style={styles.overallStatValue}>{overallStats.total}</Text>
              <Text style={styles.overallStatLabel}>Total</Text>
            </View>
            <View style={styles.overallStat}>
              <Text style={[styles.overallStatValue, { color: '#16a34a' }]}>
                {overallStats.success}
              </Text>
              <Text style={styles.overallStatLabel}>Success</Text>
            </View>
            <View style={styles.overallStat}>
              <Text style={[styles.overallStatValue, { color: '#d97706' }]}>
                {overallStats.skipped}
              </Text>
              <Text style={styles.overallStatLabel}>Skipped</Text>
            </View>
            <View style={styles.overallStat}>
              <Text style={[styles.overallStatValue, { color: '#dc2626' }]}>
                {overallStats.failed}
              </Text>
              <Text style={styles.overallStatLabel}>Failed</Text>
            </View>
          </View>

          {/* Success Rate Bar */}
          <View style={styles.successRateSection}>
            <View style={styles.successRateHeader}>
              <Text style={styles.successRateLabel}>Success Rate</Text>
              <Text style={styles.successRateValue}>{successRate}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${successRate}%` as any },
                ]}
              />
            </View>
          </View>
        </View>
      )}

      {/* Failure Categories */}
      <Text style={styles.sectionTitle}>Failure Categories</Text>
      {summary && Object.entries(summary).map(([category, data]) => {
        const color = CATEGORY_COLORS[category] || '#6b7280';
        const icon = CATEGORY_ICONS[category] || 'error-outline';
        const total = data.total || 0;
        if (total === 0) return null;

        const lunchPct = total > 0 ? ((data.LUNCH / total) * 100).toFixed(0) : '0';
        const dinnerPct = total > 0 ? ((data.DINNER / total) * 100).toFixed(0) : '0';

        return (
          <View key={category} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryHeaderLeft}>
                <View style={[styles.categoryIconBg, { backgroundColor: color + '15' }]}>
                  <Icon name={icon} size={18} color={color} />
                </View>
                <Text style={styles.categoryName}>{formatCategory(category)}</Text>
              </View>
              <Text style={[styles.categoryTotal, { color }]}>{total}</Text>
            </View>

            <View style={styles.categoryBreakdown}>
              <View style={styles.breakdownItem}>
                <View style={[styles.breakdownDot, { backgroundColor: '#2563eb' }]} />
                <Text style={styles.breakdownLabel}>Lunch</Text>
                <Text style={styles.breakdownValue}>{data.LUNCH}</Text>
                <Text style={styles.breakdownPct}>({lunchPct}%)</Text>
              </View>
              <View style={styles.breakdownItem}>
                <View style={[styles.breakdownDot, { backgroundColor: '#db2777' }]} />
                <Text style={styles.breakdownLabel}>Dinner</Text>
                <Text style={styles.breakdownValue}>{data.DINNER}</Text>
                <Text style={styles.breakdownPct}>({dinnerPct}%)</Text>
              </View>
            </View>
          </View>
        );
      })}

      {summary && Object.values(summary).every((v) => (v.total || 0) === 0) && (
        <View style={styles.emptyCard}>
          <Icon name="check-circle" size={48} color="#16a34a" />
          <Text style={styles.emptyTitle}>No Failures</Text>
          <Text style={styles.emptyText}>
            No auto-order failures in the selected date range
          </Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
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
  dateRangeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  dateRangeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  dateInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInputWrapper: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  dateInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateRangeInfo: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  overallCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  overallTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  overallStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  overallStat: {
    alignItems: 'center',
  },
  overallStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  overallStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  successRateSection: {
    gap: 6,
  },
  successRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successRateLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  successRateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16a34a',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  categoryCard: {
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
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  categoryTotal: {
    fontSize: 20,
    fontWeight: '700',
  },
  categoryBreakdown: {
    flexDirection: 'row',
    gap: 24,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  breakdownPct: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
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
    textAlign: 'center',
  },
});
