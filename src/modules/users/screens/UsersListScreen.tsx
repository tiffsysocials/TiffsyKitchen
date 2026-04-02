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
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { usersService } from '../../../services/users.service';
import { Customer } from '../../../types/api.types';
import { useAlert } from '../../../hooks/useAlert';
import { GradientBox } from '../../../components/common/GradientBox';

const colors = {
  primary: '#FE8733',
  secondary: '#4ECDC4',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
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

interface UsersListScreenProps {
  onMenuPress: () => void;
  onUserPress: (user: Customer) => void;
}

export const UsersListScreen: React.FC<UsersListScreenProps> = ({
  onMenuPress,
  onUserPress,
}) => {
  const { showError } = useAlert();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState<
    'all' | 'with' | 'without'
  >('all');

  const fetchCustomers = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let response;
      if (subscriptionFilter === 'with') {
        response = await usersService.getCustomersWithSubscriptions();
        setCustomers(response);
      } else if (subscriptionFilter === 'without') {
        response = await usersService.getCustomersWithoutSubscriptions();
        setCustomers(response);
      } else {
        const data = await usersService.getCustomers();
        setCustomers(data.customers);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load customers');
      showError('Error', err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [subscriptionFilter]);

  const onRefresh = () => {
    fetchCustomers(true);
  };

  // Client-side search filtering
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) {
      return customers;
    }

    const query = searchQuery.toLowerCase();
    return customers.filter(
      customer =>
        customer.name.toLowerCase().includes(query) ||
        customer.phone.includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer._id.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const renderCustomerCard = ({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.customerCard}
      onPress={() => onUserPress(item)}
      activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <MaterialIcons name="person" size={32} color={colors.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.customerName}>{item.name}</Text>
          <Text style={styles.customerPhone}>{item.phone}</Text>
          {item.email && (
            <Text style={styles.customerEmail}>{item.email}</Text>
          )}
        </View>
        <View style={styles.badgesContainer}>
          {item.hasActiveSubscription && (
            <View style={styles.subscriptionBadge}>
              <MaterialIcons name="verified" size={20} color={colors.success} />
            </View>
          )}
          {item.availableVouchers > 0 && (
            <View style={styles.voucherBadge}>
              <MaterialIcons name="confirmation-number" size={16} color={colors.white} />
              <Text style={styles.voucherBadgeText}>{item.availableVouchers}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <MaterialIcons name="shopping-bag" size={18} color={colors.gray} />
          <Text style={styles.statLabel}>Orders</Text>
          <Text style={styles.statValue}>{item.totalOrders}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <MaterialIcons name="account-balance-wallet" size={18} color={colors.gray} />
          <Text style={styles.statLabel}>Spent</Text>
          <Text style={styles.statValue}>₹{item.totalSpent.toFixed(0)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <MaterialIcons name="confirmation-number" size={18} color={colors.gray} />
          <Text style={styles.statLabel}>Vouchers</Text>
          <Text style={styles.statValue}>{item.availableVouchers}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <MaterialIcons name="access-time" size={14} color={colors.gray} />
          <Text style={styles.joinedText}>
            Joined {new Date(item.createdAt).toLocaleDateString('en-IN')}
          </Text>
        </View>
        {item.lastOrderAt && (
          <View style={styles.footerRight}>
            <MaterialIcons name="shopping-cart" size={14} color={colors.gray} />
            <Text style={styles.lastOrderText}>
              Last order {new Date(item.lastOrderAt).toLocaleDateString('en-IN')}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="people-outline" size={64} color={colors.gray} />
      <Text style={styles.emptyTitle}>No customers found</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'Try adjusting your search'
          : 'Customers will appear here once they register'}
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <MaterialIcons name="error-outline" size={64} color={colors.danger} />
      <Text style={styles.errorTitle}>Failed to load customers</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchCustomers()}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <GradientBox style={styles.header}>
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <MaterialIcons name="menu" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customers</Text>
          <View style={styles.placeholder} />
        </GradientBox>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <GradientBox style={styles.header}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <MaterialIcons name="menu" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customers</Text>
        <View style={styles.placeholder} />
      </GradientBox>

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

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Subscription:</Text>
        <View style={styles.filterChips}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              subscriptionFilter === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setSubscriptionFilter('all')}>
            <Text
              style={[
                styles.filterChipText,
                subscriptionFilter === 'all' && styles.filterChipTextActive,
              ]}>
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              subscriptionFilter === 'with' && styles.filterChipActive,
            ]}
            onPress={() => setSubscriptionFilter('with')}>
            <MaterialIcons name="verified" size={16} color={subscriptionFilter === 'with' ? colors.white : colors.success} />
            <Text
              style={[
                styles.filterChipText,
                subscriptionFilter === 'with' && styles.filterChipTextActive,
              ]}>
              With Plan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              subscriptionFilter === 'without' && styles.filterChipActive,
            ]}
            onPress={() => setSubscriptionFilter('without')}>
            <Text
              style={[
                styles.filterChipText,
                subscriptionFilter === 'without' && styles.filterChipTextActive,
              ]}>
              Without Plan
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
          {searchQuery && ' found'}
        </Text>
      </View>

      {/* Customer List */}
      {error && !loading ? (
        renderErrorState()
      ) : (
        <FlatList
          data={filteredCustomers}
          renderItem={renderCustomerCard}
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
        />
      )}
    </View>
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  placeholder: {
    width: 40,
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
    gap: spacing.sm,
    flex: 1,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.black,
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
  customerCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.black,
    marginBottom: spacing.xs,
  },
  customerPhone: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: spacing.xs / 2,
  },
  customerEmail: {
    fontSize: 12,
    color: colors.gray,
  },
  badgesContainer: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  subscriptionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voucherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    minWidth: 32,
    justifyContent: 'center',
  },
  voucherBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.gray,
    marginTop: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.black,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  joinedText: {
    fontSize: 12,
    color: colors.gray,
  },
  lastOrderText: {
    fontSize: 12,
    color: colors.gray,
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
