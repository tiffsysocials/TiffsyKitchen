import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
// import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { User } from '../../types/user';
import { SafeAreaScreen } from '../../components/common/SafeAreaScreen';
import { useUsersStore } from '../../stores/useUsersStore';
import { UserListItem, SearchBar, FilterSheet } from '../../components/users';
import { StatCard } from '../../components/common';
import { colors, spacing } from '../../theme';
import { GradientBox } from '../../components/common/GradientBox';

interface UsersScreenProps {
  onMenuPress: () => void;
  onUserPress: (userId: string) => void;
}

export const UsersScreen: React.FC<UsersScreenProps> = ({
  onMenuPress,
  onUserPress,

}) => {
  // const insets = useSafeAreaInsets();
  const {
    filteredUsers,
    filter,
    isLoading,
    stats,
    updateFilter,
    resetFilters,
    refresh,
  } = useUsersStore();

  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const hasActiveFilters =
    filter.userRoles.length > 0 ||
    filter.statuses.length > 0 ||
    filter.sortBy !== 'name_asc';

  const handleSearchChange = useCallback(
    (text: string) => {
      updateFilter({ searchQuery: text });
    },
    [updateFilter]
  );

  const handleUserPress = useCallback(
    (user: User) => {
      onUserPress(user.id);
    },
    [onUserPress]
  );

  const renderUserItem = useCallback(
    ({ item }: { item: User }) => (
      <UserListItem user={item} onPress={handleUserPress} />
    ),
    [handleUserPress]
  );

  const keyExtractor = useCallback((item: User) => item.id, []);

  const renderHeader = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon="people"
          iconColor={colors.primary}
          iconBackgroundColor={colors.primaryLight}
          style={styles.statCard}
        />
        <StatCard
          title="Active"
          value={stats.activeUsers}
          icon="check-circle"
          iconColor={colors.statusActive}
          iconBackgroundColor={colors.successLight}
          style={styles.statCard}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          title="Customers"
          value={stats.customerCount}
          icon="person"
          iconColor={colors.roleCustomer}
          iconBackgroundColor="#dbeafe"
          style={styles.statCard}
        />
        <StatCard
          title="Drivers"
          value={stats.driverCount}
          icon="delivery-dining"
          iconColor={colors.roleDriver}
          iconBackgroundColor="#ede9fe"
          style={styles.statCard}
        />
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Loading users...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="search-off" size={48} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No users found</Text>
        <Text style={styles.emptyText}>
          {filter.searchQuery
            ? 'Try adjusting your search or filters'
            : 'No users match the current filters'}
        </Text>
        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearButton} onPress={resetFilters}>
            <Text style={styles.clearButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (filteredUsers.length === 0) return null;
    return (
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Showing {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaScreen
      style={{ flex: 1 }}
      topBackgroundColor={colors.primary}
      bottomBackgroundColor={colors.background}
      darkIcon={false}
    >
      {/* Header */}
      <GradientBox style={styles.header}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <MaterialIcons name="menu" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Users</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.addButton}>
            <MaterialIcons name="person-add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </GradientBox>
      <View style={{ flex: 1, backgroundColor: colors.background }}>

        {/* Search Bar */}
        <SearchBar
          value={filter.searchQuery}
          onChangeText={handleSearchChange}
          placeholder="Search by name, email, or phone..."
          onFilterPress={() => setFilterSheetVisible(true)}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Users List */}
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />

        {/* Filter Sheet */}
        <FilterSheet
          visible={filterSheetVisible}
          filter={filter}
          onClose={() => setFilterSheetVisible(false)}
          onApply={updateFilter}
          onReset={resetFilters}
        />
      </View>

    </SafeAreaScreen >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
  },
  menuButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
    marginLeft: spacing.md,
    textAlign: 'left',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    padding: spacing.xs,
  },
  listContent: {
    flexGrow: 1,
  },
  statsContainer: {
    padding: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl * 2,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  clearButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.borderRadiusMd,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  footer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});

UsersScreen.displayName = 'UsersScreen';

export default UsersScreen;
