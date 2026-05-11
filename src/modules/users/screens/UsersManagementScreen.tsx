import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { adminUsersService } from '../../../services/admin-users.service';
import { vouchersService } from '../../../services/vouchers.service';
import { User, UserRole, UserStatus } from '../../../types/api.types';
import { UserCard } from '../components/UserCard';
import { useAlert } from '../../../hooks/useAlert';
import { GradientBox } from '../../../components/common/GradientBox';

const colors = {
  primary: '#FE8733',
  success: '#10b981',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  white: '#ffffff',
  black: '#1f2937',
  border: '#e5e7eb',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

interface UsersManagementScreenProps {
  onMenuPress: () => void;
  onUserPress: (user: User) => void;
  onCreateUserPress: () => void;
}

type RoleTab = 'ALL' | UserRole;

export const UsersManagementScreen: React.FC<UsersManagementScreenProps> = ({
  onMenuPress,
  onUserPress,
  onCreateUserPress,
}) => {
  const { showError } = useAlert();
  const PAGE_SIZE = 20;
  const [users, setUsers] = useState<(User & { availableVouchers?: number; hasActiveSubscription?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleTab, setActiveRoleTab] = useState<RoleTab>('ALL');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCounts, setTotalCounts] = useState({
    all: 0,
    customers: 0,
    staff: 0,
    drivers: 0,
    admins: 0,
  });
  const [customersData, setCustomersData] = useState<Map<string, { availableVouchers: number; hasActiveSubscription: boolean }>>(new Map());

  const fetchUsers = async (opts: { showRefresh?: boolean; pageOverride?: number; append?: boolean } = {}) => {
    const { showRefresh = false, pageOverride, append = false } = opts;
    const currentPage = pageOverride ?? 1;
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const params: any = { page: currentPage, limit: PAGE_SIZE };
      if (activeRoleTab !== 'ALL') {
        params.role = activeRoleTab;
      }
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      console.log('========== FETCHING USERS ==========');
      console.log('Params:', JSON.stringify(params, null, 2));
      console.log('====================================');

      // Fetch users from admin endpoint
      const response = await adminUsersService.getUsers(params);

      console.log('========== USERS RESPONSE ==========');
      console.log('Response:', JSON.stringify(response, null, 2));
      console.log('Users array:', response?.users);
      console.log('Users length:', response?.users?.length);
      console.log('Counts:', response?.counts);
      console.log('====================================');

      // Fetch voucher balances for customers (only if we have customers)
      const customerUsers = response?.users?.filter(u => u.role === 'CUSTOMER') || [];
      let customerMap = new Map<string, { availableVouchers: number; hasActiveSubscription: boolean }>();

      if (customerUsers.length > 0) {
        try {
          console.log('========== FETCHING VOUCHER BALANCES ==========');
          console.log('Customer IDs:', customerUsers.map(u => u._id));
          console.log('===============================================');

          const customerIds = customerUsers.map(u => u._id);
          const voucherBalances = await vouchersService.getVoucherBalancesForUsers(customerIds);

          voucherBalances.forEach((balance, userId) => {
            customerMap.set(userId, {
              availableVouchers: balance.available,
              hasActiveSubscription: balance.available > 0, // Assuming active subscription if they have vouchers
            });
          });

          setCustomersData(customerMap);
          console.log('========== VOUCHER BALANCES FETCHED ==========');
          console.log('Voucher data map size:', customerMap.size);
          Array.from(customerMap.entries()).forEach(([userId, data]) => {
            const user = customerUsers.find(u => u._id === userId);
            console.log(`  ${user?.name}: ${data.availableVouchers} vouchers`);
          });
          console.log('==============================================');
        } catch (voucherErr) {
          console.log('Failed to fetch voucher balances:', voucherErr);
          // Continue without voucher data
        }
      }

      // Merge user data with customer data
      const usersWithVouchers = response?.users?.map(user => {
        if (user.role === 'CUSTOMER') {
          if (customerMap.has(user._id)) {
            const customerInfo = customerMap.get(user._id)!;
            console.log(`✅ Merging customer ${user.name} with vouchers:`, customerInfo.availableVouchers);
            return {
              ...user,
              availableVouchers: customerInfo.availableVouchers,
              hasActiveSubscription: customerInfo.hasActiveSubscription,
            };
          } else {
            console.log(`⚠️  Customer ${user.name} not found in customer map`);
          }
        }
        return user;
      }) || [];

      console.log('========== USERS WITH VOUCHERS ==========');
      console.log('Total users:', usersWithVouchers.length);
      console.log('Customers with vouchers:', usersWithVouchers.filter(u => u.role === 'CUSTOMER' && u.availableVouchers).length);
      usersWithVouchers.filter(u => u.role === 'CUSTOMER' && u.availableVouchers).forEach(u => {
        console.log(`  - ${u.name}: ${u.availableVouchers} vouchers`);
      });
      console.log('=========================================');

      setUsers(prev => append ? [...prev, ...usersWithVouchers] : usersWithVouchers);
      setPage(currentPage);

      // Determine if there are more pages
      const pagination = response?.pagination;
      if (pagination) {
        setHasMore(pagination.page < pagination.pages);
      } else {
        // Fallback: if we got fewer than PAGE_SIZE users, assume no more
        setHasMore((response?.users?.length ?? 0) === PAGE_SIZE);
      }

      if (response?.counts) {
        setTotalCounts({
          all: response.counts.total || 0,
          customers: response.counts.byRole?.CUSTOMER || 0,
          staff: response.counts.byRole?.KITCHEN_STAFF || 0,
          drivers: response.counts.byRole?.DRIVER || 0,
          admins: response.counts.byRole?.ADMIN || 0,
        });
      }
    } catch (err: any) {
      console.log('========== FETCH USERS ERROR ==========');
      console.log('Error:', err);
      console.log('Error message:', err.message);
      console.log('========================================');
      setError(err.message || 'Failed to load users');
      if (!append) setUsers([]);
      showError('Error', err.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      fetchUsers({ pageOverride: page + 1, append: true });
    }
  };

  useEffect(() => {
    // Reset to page 1 when filters change
    fetchUsers({ pageOverride: 1, append: false });
  }, [activeRoleTab, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() || searchQuery === '') {
        fetchUsers({ pageOverride: 1, append: false });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = () => {
    fetchUsers({ showRefresh: true, pageOverride: 1, append: false });
  };

  const roleTabs: { key: RoleTab; label: string; icon: string }[] = [
    { key: 'ALL', label: 'All', icon: 'people' },
    { key: 'CUSTOMER', label: 'Customers', icon: 'person' },
    { key: 'KITCHEN_STAFF', label: 'Staff', icon: 'restaurant' },
    { key: 'DRIVER', label: 'Drivers', icon: 'local-shipping' },
    { key: 'ADMIN', label: 'Admins', icon: 'admin-panel-settings' },
  ];

  const getCountForTab = (tab: RoleTab): number => {
    switch (tab) {
      case 'ALL':
        return totalCounts.all;
      case 'CUSTOMER':
        return totalCounts.customers;
      case 'KITCHEN_STAFF':
        return totalCounts.staff;
      case 'DRIVER':
        return totalCounts.drivers;
      case 'ADMIN':
        return totalCounts.admins;
      default:
        return 0;
    }
  };

  const renderRoleTab = ({ item }: { item: typeof roleTabs[0] }) => {
    const isActive = activeRoleTab === item.key;
    const count = getCountForTab(item.key);

    return (
      <TouchableOpacity
        style={[styles.roleTab, isActive && styles.roleTabActive]}
        onPress={() => setActiveRoleTab(item.key)}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name={item.icon}
          size={20}
          color={isActive ? colors.primary : colors.gray}
        />
        <Text style={[styles.roleTabText, isActive && styles.roleTabTextActive]}>
          {item.label}
        </Text>
        <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
          <Text style={[styles.countText, isActive && styles.countTextActive]}>
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="people-outline" size={64} color={colors.gray} />
      <Text style={styles.emptyTitle}>No users found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'Try adjusting your search or filters'
          : 'Users will appear here'}
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <MaterialIcons name="error-outline" size={64} color="#ef4444" />
      <Text style={styles.errorTitle}>Failed to load users</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchUsers()}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor={colors.lightGray} backgroundColor={colors.lightGray}>
        <GradientBox style={[styles.header, {paddingTop: 8}]}>
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <MaterialIcons name="menu" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Users</Text>
          <View style={styles.placeholder} />
        </GradientBox>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaScreen>
    );
  }

  const canAddUser = activeRoleTab !== 'ALL' && activeRoleTab !== 'CUSTOMER';

  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor={colors.lightGray} backgroundColor={colors.lightGray}>
      {/* Header */}
      <GradientBox style={[styles.header, {paddingTop: 8}]}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <MaterialIcons name="menu" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Users</Text>
        {canAddUser && (
          <TouchableOpacity onPress={onCreateUserPress} style={styles.addButton}>
            <MaterialIcons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        )}
        {!canAddUser && <View style={styles.placeholder} />}
      </GradientBox>

      {/* Role Tabs */}
      <View style={styles.roleTabsContainer}>
        <FlatList
          horizontal
          data={roleTabs}
          renderItem={renderRoleTab}
          keyExtractor={item => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.roleTabsContent}
        />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons
          name="search"
          size={20}
          color={colors.gray}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.gray}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Status:</Text>
        <View style={styles.filterChips}>
          {(['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED'] as const).map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                statusFilter === status && styles.filterChipActive,
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === status && styles.filterChipTextActive,
                ]}
              >
                {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* User Count */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          Showing {users?.length || 0} of {totalCounts.all || users?.length || 0} user{(totalCounts.all || users?.length || 0) !== 1 ? 's' : ''}
          {searchQuery && ' (filtered)'}
          {hasMore && !loadingMore && ' · scroll for more'}
        </Text>
      </View>

      {/* User List */}
      {error && !loading ? (
        renderErrorState()
      ) : (
        <FlatList
          data={users || []}
          renderItem={({ item }) => <UserCard user={item} onPress={onUserPress} />}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: spacing.lg }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : hasMore ? (
              <TouchableOpacity
                style={{
                  paddingVertical: spacing.md,
                  marginHorizontal: spacing.md,
                  marginTop: spacing.sm,
                  borderRadius: 8,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                }}
                onPress={handleLoadMore}
              >
                <Text style={{ color: colors.white, fontWeight: '700', fontSize: 14 }}>
                  Load more users
                </Text>
              </TouchableOpacity>
            ) : (users?.length || 0) > 0 ? (
              <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
                <Text style={{ color: colors.gray, fontSize: 12 }}>End of list</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    marginLeft: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  roleTabsContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  roleTabsContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  roleTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    gap: spacing.xs,
  },
  roleTabActive: {
    backgroundColor: `${colors.primary}15`,
  },
  roleTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray,
  },
  roleTabTextActive: {
    color: colors.primary,
  },
  countBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.white,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: colors.primary,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray,
  },
  countTextActive: {
    color: colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    color: colors.black,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.black,
    marginRight: spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.lightGray,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  summaryContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  summaryText: {
    fontSize: 14,
    color: colors.gray,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.gray,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.gray,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
    marginTop: spacing.md,
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.gray,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
