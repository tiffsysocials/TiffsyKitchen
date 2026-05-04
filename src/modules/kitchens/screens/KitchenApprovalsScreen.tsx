import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../theme/colors';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { Header } from '../../../components/common/Header';
import type { Kitchen } from '../../../types/api.types';
import { kitchenApprovalService } from '../../../services/kitchen-approval.service';
import { PendingKitchenCard } from '../components/PendingKitchenCard';
import { KitchenDetailModal } from '../components/KitchenDetailModal';
import { ApproveKitchenDialog } from '../components/ApproveKitchenDialog';
import { RejectKitchenDialog } from '../components/RejectKitchenDialog';
import { useAlert } from '../../../hooks/useAlert';

interface KitchenApprovalsScreenProps {
  onMenuPress: () => void;
}

export const KitchenApprovalsScreen: React.FC<KitchenApprovalsScreenProps> = ({
  onMenuPress,
}) => {
  const { showError } = useAlert();
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [selectedKitchen, setSelectedKitchen] = useState<Kitchen | null>(null);
  const [kitchenForApproval, setKitchenForApproval] = useState<Kitchen | null>(null);
  const [kitchenForRejection, setKitchenForRejection] = useState<Kitchen | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    pending: 0,
    active: 0,
    suspended: 0,
    total: 0,
  });

  const fetchPendingKitchens = useCallback(async (page: number = 1, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await kitchenApprovalService.getPendingKitchens({ page, limit: 20 });
      console.log('📋 Pending kitchens fetched:', response);

      setKitchens(response.data?.kitchens || []);
      setCurrentPage(response.data?.pagination?.page || 1);
      setTotalPages(response.data?.pagination?.pages || 1);
    } catch (error: any) {
      console.error('❌ Error fetching pending kitchens:', error);
      showError('Error', error.message || 'Failed to fetch pending kitchens');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showError]);

  const fetchStats = useCallback(async () => {
    try {
      const statistics = await kitchenApprovalService.getKitchenStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('❌ Failed to fetch kitchen statistics:', error);
    }
  }, []);

  useEffect(() => {
    fetchPendingKitchens(1);
    fetchStats();
  }, []);

  const handleRefresh = () => {
    fetchPendingKitchens(1, true);
    fetchStats();
  };

  const handleKitchenPress = (kitchen: Kitchen) => {
    setSelectedKitchen(kitchen);
  };

  const handleCloseDetailModal = () => {
    setSelectedKitchen(null);
  };

  const handleQuickApprove = (kitchen: Kitchen) => {
    setKitchenForApproval(kitchen);
  };

  const handleApproveFromDetail = () => {
    if (selectedKitchen) {
      setKitchenForApproval(selectedKitchen);
      setSelectedKitchen(null);
    }
  };

  const handleRejectFromDetail = () => {
    if (selectedKitchen) {
      setKitchenForRejection(selectedKitchen);
      setSelectedKitchen(null);
    }
  };

  const handleApprovalComplete = () => {
    setKitchenForApproval(null);
    setKitchenForRejection(null);
    fetchPendingKitchens(currentPage);
    fetchStats();
  };

  const handleLoadMore = () => {
    if (currentPage < totalPages && !isLoading) {
      fetchPendingKitchens(currentPage + 1);
    }
  };

  const renderStatsCard = (
    icon: string,
    label: string,
    value: number,
    color: string
  ) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={16} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="check-circle" size={64} color={colors.gray400} />
        <Text style={styles.emptyTitle}>No Pending Approvals</Text>
        <Text style={styles.emptySubtitle}>
          All kitchen registrations have been reviewed!
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || currentPage === 1) return null;

    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  return (
    <SafeAreaScreen
      topBackgroundColor="#FE8733"
      bottomBackgroundColor="#f9fafb"
      backgroundColor="#f9fafb"
    >
      <Header title="Kitchen Approvals" onMenuPress={onMenuPress} />

      <View style={styles.container}>
        {/* Statistics Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          {renderStatsCard('pending', 'Pending', stats.pending, colors.warning)}
          {renderStatsCard('check-circle', 'Active', stats.active, colors.success)}
          {renderStatsCard('block', 'Suspended', stats.suspended, colors.error)}
          {renderStatsCard('restaurant', 'Total', stats.total, colors.primary)}
        </ScrollView>

        {/* Subtitle */}
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>
            {stats.pending} kitchen{stats.pending !== 1 ? 's' : ''} pending approval
          </Text>
        </View>

        {/* Kitchen List */}
        {isLoading && currentPage === 1 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading pending kitchens...</Text>
          </View>
        ) : (
          <FlatList
            data={kitchens}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <PendingKitchenCard
                kitchen={item}
                onPress={() => handleKitchenPress(item)}
                onQuickApprove={() => handleQuickApprove(item)}
              />
            )}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
          />
        )}
      </View>

      {/* Detail Modal */}
      {selectedKitchen && (
        <KitchenDetailModal
          kitchen={selectedKitchen}
          visible={!!selectedKitchen}
          onClose={handleCloseDetailModal}
          onApprove={handleApproveFromDetail}
          onReject={handleRejectFromDetail}
        />
      )}

      {/* Approve Dialog */}
      {kitchenForApproval && (
        <ApproveKitchenDialog
          kitchen={kitchenForApproval}
          visible={!!kitchenForApproval}
          onClose={() => setKitchenForApproval(null)}
          onSuccess={handleApprovalComplete}
        />
      )}

      {/* Reject Dialog */}
      {kitchenForRejection && (
        <RejectKitchenDialog
          kitchen={kitchenForRejection}
          visible={!!kitchenForRejection}
          onClose={() => setKitchenForRejection(null)}
          onSuccess={handleApprovalComplete}
        />
      )}
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  statsContainer: {
    backgroundColor: colors.gray50,
    maxHeight: 110,
    marginTop: 0,
  },
  statsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    paddingRight: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    minWidth: 105,
    minHeight: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 0,
    marginRight: 2,
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.gray700,
    letterSpacing: -0.5,
    lineHeight: 20,
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 4,
    lineHeight: 12,
  },
  subtitleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: colors.gray50,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: colors.gray600,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray600,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray700,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
