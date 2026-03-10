import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../theme/colors';
import { useAlert } from '../../../hooks/useAlert';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { Header } from '../../../components/common/Header';
import type { Driver } from '../../../types/driver.types';
import { adminDriversService } from '../../../services/admin-drivers.service';
import { DriverCard } from '../components/DriverCard';
import { DriverDetailScreen } from './DriverDetailScreen';

interface DriversManagementScreenProps {
  onMenuPress: () => void;
}

type FilterTab = 'PENDING' | 'APPROVED' | 'REJECTED';

export const DriversManagementScreen: React.FC<DriversManagementScreenProps> = ({
  onMenuPress,
}) => {
  const { showError } = useAlert();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('PENDING');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const fetchDrivers = useCallback(async (page: number = 1, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      let response;
      switch (activeTab) {
        case 'PENDING':
          response = await adminDriversService.getPendingDrivers({ page, limit: 20 });
          break;
        case 'APPROVED':
          response = await adminDriversService.getApprovedDrivers({ page, limit: 20 });
          break;
        case 'REJECTED':
          response = await adminDriversService.getRejectedDrivers({ page, limit: 20 });
          break;
      }

      setDrivers(response.data.drivers);
      setCurrentPage(response.data.pagination.page);
      setTotalPages(response.data.pagination.pages);
    } catch (error: any) {
      showError('Error', error.message || 'Failed to fetch drivers');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  const fetchStats = useCallback(async () => {
    try {
      const statistics = await adminDriversService.getDriverStatistics();
      setStats({
        pending: statistics.pending,
        approved: statistics.approved,
        rejected: statistics.rejected,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchDrivers(1);
    fetchStats();
  }, [activeTab]);

  const handleRefresh = () => {
    fetchDrivers(1, true);
    fetchStats();
  };

  const handleDriverPress = (driver: Driver) => {
    setSelectedDriver(driver);
  };

  const handleBack = () => {
    setSelectedDriver(null);
  };

  const handleActionComplete = () => {
    setSelectedDriver(null);
    fetchDrivers(currentPage);
    fetchStats();
  };

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleLoadMore = () => {
    if (currentPage < totalPages && !isLoading) {
      fetchDrivers(currentPage + 1);
    }
  };

  const renderTabButton = (tab: FilterTab, label: string, count: number) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
        onPress={() => handleTabChange(tab)}
      >
        <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.badge, isActive && styles.badgeActive]}>
            <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons
          name="people-outline"
          size={64}
          color={colors.gray400}
        />
        <Text style={styles.emptyTitle}>No Drivers Found</Text>
        <Text style={styles.emptySubtitle}>
          {activeTab === 'PENDING'
            ? 'There are no pending driver registrations at the moment.'
            : activeTab === 'APPROVED'
            ? 'No approved drivers yet.'
            : 'No rejected drivers.'}
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

  if (selectedDriver) {
    return (
      <DriverDetailScreen
        driver={selectedDriver}
        onBack={handleBack}
        onActionComplete={handleActionComplete}
      />
    );
  }

  return (
    <SafeAreaScreen
      topBackgroundColor="#F56B4C"
      bottomBackgroundColor="#f9fafb"
      backgroundColor="#f9fafb"
    >
      <Header title="Driver Approvals" onMenuPress={onMenuPress} />

      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {renderTabButton('PENDING', 'Pending', stats.pending)}
          {renderTabButton('APPROVED', 'Approved', stats.approved)}
          {renderTabButton('REJECTED', 'Rejected', stats.rejected)}
        </View>

        {/* Driver List */}
        {isLoading && currentPage === 1 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading drivers...</Text>
          </View>
        ) : (
          <FlatList
            data={drivers}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <DriverCard driver={item} onPress={handleDriverPress} />
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
          />
        )}

        {/* Pagination Info */}
        {!isLoading && drivers && drivers.length > 0 && (
          <View style={styles.paginationInfo}>
            <Text style={styles.paginationText}>
              Page {currentPage} of {totalPages}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray600,
  },
  tabButtonTextActive: {
    color: colors.white,
  },
  badge: {
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: colors.white,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray700,
  },
  badgeTextActive: {
    color: colors.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.gray600,
  },
  loadingFooter: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray900,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
  },
  paginationInfo: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 12,
    color: colors.gray600,
    fontWeight: '500',
  },
});
