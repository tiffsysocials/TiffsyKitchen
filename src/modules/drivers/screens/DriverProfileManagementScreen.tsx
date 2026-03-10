import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../theme/colors';
import { useAlert } from '../../../hooks/useAlert';
import { spacing } from '../../../theme/spacing';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { Header } from '../../../components/common/Header';
import type { Driver } from '../../../types/driver.types';
import { adminDriversService } from '../../../services/admin-drivers.service';
import { DriverProfileDetailScreen } from './DriverProfileDetailScreen';

interface DriverProfileManagementScreenProps {
  onMenuPress: () => void;
}

type FilterTab = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
type StatusFilter = '' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DELETED';
type ApprovalFilter = '' | 'PENDING' | 'APPROVED' | 'REJECTED';

export const DriverProfileManagementScreen: React.FC<DriverProfileManagementScreenProps> = ({
  onMenuPress,
}) => {
  const { showError } = useAlert();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    all: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    pending: 0,
  });

  const fetchDrivers = useCallback(async (page: number = 1, isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      let response;

      // Use dedicated endpoint for pending drivers
      if (activeTab === 'PENDING') {
        response = await adminDriversService.getPendingDrivers({
          page,
          limit: 20,
        });
      } else {
        let statusFilter: StatusFilter = '';
        let approvalFilter: ApprovalFilter = '';

        switch (activeTab) {
          case 'ACTIVE':
            statusFilter = 'ACTIVE';
            approvalFilter = 'APPROVED';
            break;
          case 'INACTIVE':
            statusFilter = 'INACTIVE';
            break;
          case 'SUSPENDED':
            statusFilter = 'SUSPENDED';
            break;
          case 'ALL':
          default:
            // No specific filters for ALL
            break;
        }

        response = await adminDriversService.getAllDrivers({
          status: statusFilter,
          approvalStatus: approvalFilter,
          search: searchQuery || undefined,
          page,
          limit: 20,
        });
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
  }, [activeTab, searchQuery, showError]);

  const fetchStats = useCallback(async () => {
    try {
      const [allResponse, activeResponse, inactiveResponse, suspendedResponse, pendingResponse] = await Promise.all([
        adminDriversService.getAllDrivers({ limit: 100 }),
        adminDriversService.getAllDrivers({ status: 'ACTIVE', approvalStatus: 'APPROVED', limit: 100 }),
        adminDriversService.getAllDrivers({ status: 'INACTIVE', limit: 100 }),
        adminDriversService.getAllDrivers({ status: 'SUSPENDED', limit: 100 }),
        adminDriversService.getPendingDrivers({ limit: 100 }),
      ]);

      setStats({
        all: allResponse.data.drivers.length,
        active: activeResponse.data.drivers.length,
        inactive: inactiveResponse.data.drivers.length,
        suspended: suspendedResponse.data.drivers.length,
        pending: pendingResponse.data.drivers.length,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchDrivers(1);
    fetchStats();
  }, [activeTab]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        fetchDrivers(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleRefresh = () => {
    fetchDrivers(1, true);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return colors.success;
      case 'INACTIVE':
        return colors.textMuted;
      case 'SUSPENDED':
        return colors.error;
      case 'DELETED':
        return colors.textPrimary;
      default:
        return colors.textMuted;
    }
  };

  const getApprovalColor = (approvalStatus: string) => {
    switch (approvalStatus) {
      case 'APPROVED':
        return colors.success;
      case 'PENDING':
        return colors.warning;
      case 'REJECTED':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const getInitials = (name: string): string => {
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string): string => {
    const avatarColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B739', '#52B788', '#E63946', '#457B9D'
    ];
    const charCode = name.charCodeAt(0);
    return avatarColors[charCode % avatarColors.length];
  };

  const renderTabButton = (tab: FilterTab, label: string, count: number) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        key={tab}
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

  const renderDriverCard = ({ item: driver }: { item: Driver }) => {
    const statusColor = getStatusColor(driver.status);
    const approvalColor = getApprovalColor(driver.approvalStatus);

    return (
      <TouchableOpacity
        style={styles.driverCard}
        onPress={() => setSelectedDriver(driver)}
      >
        <View style={styles.driverCardHeader}>
          <View style={styles.driverInfo}>
            <View style={[styles.profileImagePlaceholder, { backgroundColor: getAvatarColor(driver.name) }]}>
              <Text style={styles.initialsText}>{getInitials(driver.name)}</Text>
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <Text style={styles.driverPhone}>{driver.phone}</Text>
              <View style={styles.badgesRow}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusText}>{driver.status}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: approvalColor }]}>
                  <Text style={styles.statusText}>{driver.approvalStatus}</Text>
                </View>
              </View>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
        </View>

        {driver.driverDetails && (
          <View style={styles.vehicleInfo}>
            <MaterialIcons name="two-wheeler" size={16} color={colors.textSecondary} />
            <Text style={styles.vehicleText}>
              {driver.driverDetails.vehicleType} - {driver.driverDetails.vehicleNumber}
            </Text>
          </View>
        )}

        {driver.lastLoginAt && (
          <View style={styles.lastLogin}>
            <MaterialIcons name="access-time" size={14} color={colors.textSecondary} />
            <Text style={styles.lastLoginText}>
              Last login: {new Date(driver.lastLoginAt).toLocaleDateString()}
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
        <MaterialIcons name="people-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No Drivers Found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery
            ? 'No drivers match your search criteria'
            : activeTab === 'PENDING'
            ? 'There are no pending driver registrations'
            : `No ${activeTab.toLowerCase()} drivers found`}
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

  // Show detail screen if a driver is selected
  if (selectedDriver) {
    return (
      <DriverProfileDetailScreen
        driver={selectedDriver}
        onBack={() => setSelectedDriver(null)}
        onActionComplete={() => {
          setSelectedDriver(null);
          fetchDrivers(currentPage);
          fetchStats();
        }}
      />
    );
  }

  return (
    <SafeAreaScreen
      topBackgroundColor="#F56B4C"
      bottomBackgroundColor="#f9fafb"
      backgroundColor="#f9fafb"
    >
      <Header title="Driver Profile Management" onMenuPress={onMenuPress} />

      <View style={styles.container}>
        {/* Search Bar and Filters Container */}
        <View style={styles.filtersWrapper}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textMuted}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {renderTabButton('ALL', 'All', stats.all)}
            {renderTabButton('ACTIVE', 'Active', stats.active)}
            {renderTabButton('INACTIVE', 'Inactive', stats.inactive)}
            {renderTabButton('SUSPENDED', 'Suspended', stats.suspended)}
            {renderTabButton('PENDING', 'Pending', stats.pending)}
          </View>
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
            renderItem={renderDriverCard}
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
  filtersWrapper: {
    backgroundColor: colors.white,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: spacing.borderRadiusMd,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: 8,
    flexWrap: 'wrap',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.divider,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.white,
  },
  badge: {
    backgroundColor: colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: colors.white,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badgeTextActive: {
    color: colors.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  driverCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  driverCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  profileImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initialsText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  driverPhone: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  vehicleText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  lastLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastLoginText: {
    fontSize: 12,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
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
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  paginationInfo: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
