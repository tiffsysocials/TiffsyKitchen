/**
 * Referral Management Screen
 *
 * Combined dashboard + list view for managing the referral program.
 * Shows analytics, config toggle, and browsable referral list.
 *
 * Uses manual state management (same pattern as CouponsManagementScreen)
 * instead of useApi hook for reliability.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { referralService } from '../../../services/referral.service';
import {
  Referral,
  ReferralAnalytics,
  ReferralConfig,
  ReferralStatus,
} from '../../../types/api.types';
import { GradientBox } from '../../../components/common/GradientBox';

interface Props {
  onMenuPress: () => void;
}

type FilterTab = 'ALL' | ReferralStatus;

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'CONVERTED', label: 'Converted' },
  { id: 'EXPIRED', label: 'Expired' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export const ReferralManagementScreen: React.FC<Props> = ({ onMenuPress }) => {
  // Data state
  const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null);
  const [config, setConfig] = useState<ReferralConfig | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filter
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  // Error
  const [error, setError] = useState<string | null>(null);

  // Fetch all data
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [analyticsRes, configRes, referralsRes] = await Promise.all([
        referralService.getAnalytics().catch((err) => {
          console.log('Analytics fetch error:', err);
          return null;
        }),
        referralService.getConfig().catch((err) => {
          console.log('Config fetch error:', err);
          return null;
        }),
        referralService.getReferrals({
          page: 1,
          limit: 20,
          status: activeFilter !== 'ALL' ? (activeFilter as ReferralStatus) : undefined,
        }).catch((err) => {
          console.log('Referrals fetch error:', err);
          return null;
        }),
      ]);

      if (analyticsRes) setAnalytics(analyticsRes);
      if (configRes) setConfig(configRes);
      if (referralsRes) {
        setReferrals(referralsRes.referrals || []);
        setPage(1);
        const pagination = referralsRes.pagination;
        setHasMore(pagination ? pagination.page < pagination.pages : false);
      }
    } catch (err: any) {
      console.error('ReferralManagementScreen fetch error:', err);
      setError(err.message || 'Failed to load referral data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle filter change
  const handleFilterChange = useCallback((filter: FilterTab) => {
    setActiveFilter(filter);
    setReferrals([]);
    setPage(1);
    setHasMore(true);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await referralService.getReferrals({
        page: nextPage,
        limit: 20,
        status: activeFilter !== 'ALL' ? (activeFilter as ReferralStatus) : undefined,
      });
      if (result) {
        setReferrals((prev) => [...prev, ...(result.referrals || [])]);
        setPage(nextPage);
        setHasMore(result.pagination ? result.pagination.page < result.pagination.pages : false);
      }
    } catch (err) {
      console.error('Error loading more referrals:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, page, activeFilter]);

  const handleRefresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  const handleToggleEnabled = useCallback(async (newValue: boolean) => {
    setConfigLoading(true);
    try {
      const updated = await referralService.updateConfig({ enabled: newValue });
      if (updated) setConfig(updated);
      Alert.alert('Success', `Referral program ${newValue ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update config');
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const getStatusColor = (status: ReferralStatus) => {
    switch (status) {
      case 'CONVERTED': return colors.success;
      case 'PENDING': return colors.warning;
      case 'EXPIRED': return colors.gray400;
      case 'CANCELLED': return colors.error;
      default: return colors.gray400;
    }
  };

  const getStatusBg = (status: ReferralStatus) => {
    switch (status) {
      case 'CONVERTED': return colors.successLight;
      case 'PENDING': return colors.warningLight;
      case 'EXPIRED': return colors.gray100;
      case 'CANCELLED': return colors.errorLight;
      default: return colors.gray100;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const renderStatsCards = () => {
    if (!analytics) return null;

    const cards = [
      { label: 'Total', value: analytics.totalReferrals || 0, icon: 'people', color: colors.info },
      { label: 'Converted', value: analytics.totalConverted || 0, icon: 'check-circle', color: colors.success },
      { label: 'Pending', value: analytics.totalPending || 0, icon: 'hourglass-empty', color: colors.warning },
      { label: 'Conv. Rate', value: `${(analytics.conversionRate || 0).toFixed(1)}%`, icon: 'trending-up', color: colors.primary },
    ];

    return (
      <View style={styles.statsRow}>
        {cards.map((card, i) => (
          <View key={i} style={[styles.statCard, { borderLeftColor: card.color }]}>
            <Icon name={card.icon} size={20} color={card.color} />
            <Text style={styles.statValue}>{card.value}</Text>
            <Text style={styles.statLabel}>{card.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderConfigToggle = () => (
    <View style={styles.configCard}>
      <View style={styles.configRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.configTitle}>Referral Program</Text>
          <Text style={styles.configSubtitle}>
            {config?.enabled ? 'Active - new referrals are being processed' : 'Disabled - no new conversions will fire'}
          </Text>
        </View>
        {configLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Switch
            value={config?.enabled || false}
            onValueChange={handleToggleEnabled}
            trackColor={{ false: colors.gray300, true: colors.success }}
            thumbColor={colors.white}
          />
        )}
      </View>
      {config && (
        <View style={styles.configDetails}>
          <View style={styles.configDetailItem}>
            <Text style={styles.configDetailLabel}>Referrer Reward</Text>
            <Text style={styles.configDetailValue}>{config.referrerReward?.voucherCount || 0} meals</Text>
          </View>
          <View style={styles.configDetailItem}>
            <Text style={styles.configDetailLabel}>Referee Reward</Text>
            <Text style={styles.configDetailValue}>{config.refereeReward?.voucherCount || 0} meals</Text>
          </View>
          <View style={styles.configDetailItem}>
            <Text style={styles.configDetailLabel}>Window</Text>
            <Text style={styles.configDetailValue}>{config.conversionWindowDays || 0} days</Text>
          </View>
          <View style={styles.configDetailItem}>
            <Text style={styles.configDetailLabel}>Max/User</Text>
            <Text style={styles.configDetailValue}>{config.maxReferralsPerUser || 0}</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderTopReferrers = () => {
    if (!analytics?.topReferrers?.length) return null;

    return (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Top Referrers</Text>
        {analytics.topReferrers.slice(0, 5).map((referrer, i) => (
          <View key={referrer.userId || String(i)} style={styles.topReferrerRow}>
            <View style={[styles.rankBadge, i === 0 && { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.rankText, i === 0 && { color: '#D97706' }]}>#{i + 1}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.referrerName}>{referrer.name || 'Unknown'}</Text>
              <Text style={styles.referrerPhone}>{referrer.phone || ''}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.referrerCount}>{referrer.convertedCount || 0}/{referrer.referralCount || 0}</Text>
              <Text style={styles.referrerSubtext}>converted</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles.filterRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => handleFilterChange(tab.id)}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderReferralItem = ({ item }: { item: Referral }) => (
    <View style={styles.referralCard}>
      <View style={styles.referralHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.referralReferrer}>
            {item.referrerUserId?.name || 'Unknown'} {'->'} {item.refereeUserId?.name || 'Unknown'}
          </Text>
          <Text style={styles.referralPhone}>
            {item.referrerUserId?.phone || ''} {'->'} {item.refereeUserId?.phone || ''}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.status) }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <View style={styles.referralMeta}>
        <View style={styles.referralDetail}>
          <Icon name="code" size={14} color={colors.textMuted} />
          <Text style={styles.referralDetailText}>{item.referralCode}</Text>
        </View>
        <View style={styles.referralDetail}>
          <Icon name="schedule" size={14} color={colors.textMuted} />
          <Text style={styles.referralDetailText}>{formatDate(item.createdAt)}</Text>
        </View>
        {item.status === 'CONVERTED' && item.referrerReward && (
          <View style={styles.referralDetail}>
            <Icon name="card-giftcard" size={14} color={colors.success} />
            <Text style={[styles.referralDetailText, { color: colors.success }]}>
              +{item.referrerReward.voucherCount} referrer{item.refereeReward ? `, +${item.refereeReward.voucherCount} referee` : ''}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderHeader = () => (
    <View>
      {renderStatsCards()}
      {renderConfigToggle()}
      {renderTopReferrers()}
      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>All Referrals</Text>
      </View>
      {renderFilterTabs()}
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Icon name="people" size={48} color={colors.gray300} />
        <Text style={styles.emptyText}>
          {error ? error : 'No referrals found'}
        </Text>
        {error && (
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaScreen topBackgroundColor={colors.primary} bottomBackgroundColor={colors.background} backgroundColor={colors.background}>
      {/* Header */}
      <GradientBox style={styles.header}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <Icon name="menu" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Referral Program</Text>
      </GradientBox>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading referral data...</Text>
        </View>
      ) : (
        <FlatList
          data={referrals}
          renderItem={renderReferralItem}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </SafeAreaScreen>
  );
};

export default ReferralManagementScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  menuButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  listContent: {
    paddingBottom: 40,
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    padding: spacing.md,
    marginHorizontal: 4,
    alignItems: 'center',
    borderLeftWidth: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Config
  configCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  configSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  configDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  configDetailItem: {
    width: '48%',
    backgroundColor: colors.gray50,
    borderRadius: spacing.borderRadiusMd,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    marginRight: '2%',
  },
  configDetailLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  configDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },

  // Top referrers
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  topReferrerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  referrerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  referrerPhone: {
    fontSize: 12,
    color: colors.textMuted,
  },
  referrerCount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  referrerSubtext: {
    fontSize: 10,
    color: colors.textMuted,
  },

  // Filter tabs
  listHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  filterRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadiusFull,
    backgroundColor: colors.card,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.white,
  },

  // Referral card
  referralCard: {
    backgroundColor: colors.card,
    borderRadius: spacing.borderRadiusLg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  referralReferrer: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  referralPhone: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  referralMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  referralDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    marginBottom: 4,
  },
  referralDetailText: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 4,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl * 2,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadiusMd,
  },
  retryText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});
