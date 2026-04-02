import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { useAlert } from '../../../hooks/useAlert';
import { Plan, PlanFormData, PlanStatusFilter } from '../models/types';
import { generatePlanId } from '../models/defaultPlans';
import { PlanCard, PlanEditor } from '../components';
import {
  loadPlans,
  addPlan,
  updatePlan,
  deletePlan,
  togglePlanActive,
  duplicatePlan,
} from '../storage/plansStorage';
import {
  getFilteredAndSortedPlans,
  formDataToPlan,
  getPlanStats,
} from '../utils/planUtils';
import { colors, spacing } from '../../../theme';
import { GradientBox } from '../../../components/common/GradientBox';

interface PlansScreenProps {
  onMenuPress: () => void;
}

const statusFilterOptions: { value: PlanStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const PlansScreen: React.FC<PlansScreenProps> = ({ onMenuPress }) => {
  const { showError, showConfirm } = useAlert();

  // Data state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PlanStatusFilter>('all');
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | undefined>(undefined);

  // Load plans on mount
  useEffect(() => {
    loadPlansData();
  }, []);

  // Load plans from storage
  const loadPlansData = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedPlans = await loadPlans();
      setPlans(loadedPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      showError('Error', 'Failed to load plans. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPlansData();
    setRefreshing(false);
  }, [loadPlansData]);

  // Filtered and sorted plans
  const filteredPlans = useMemo(() => {
    return getFilteredAndSortedPlans(plans, searchQuery, statusFilter);
  }, [plans, searchQuery, statusFilter]);

  // Plan statistics
  const stats = useMemo(() => getPlanStats(plans), [plans]);

  // Open editor for new plan
  const handleAddPlan = useCallback(() => {
    setEditingPlan(undefined);
    setIsEditorVisible(true);
  }, []);

  // Open editor for existing plan
  const handleEditPlan = useCallback((plan: Plan) => {
    setEditingPlan(plan);
    setIsEditorVisible(true);
  }, []);

  // Close editor
  const handleCloseEditor = useCallback(() => {
    setIsEditorVisible(false);
    setEditingPlan(undefined);
  }, []);

  // Save plan (new or update)
  const handleSavePlan = useCallback(async (formData: PlanFormData) => {
    try {
      const planData = formDataToPlan(formData, editingPlan);

      if (editingPlan) {
        // Update existing plan
        const updatedPlan: Plan = {
          ...planData,
          id: editingPlan.id,
        };
        const updatedPlans = await updatePlan(plans, updatedPlan);
        setPlans(updatedPlans);
      } else {
        // Create new plan
        const newPlan: Plan = {
          ...planData,
          id: generatePlanId(),
        };
        const updatedPlans = await addPlan(plans, newPlan);
        setPlans(updatedPlans);
      }

      handleCloseEditor();
    } catch (error) {
      console.error('Error saving plan:', error);
      showError('Error', 'Failed to save plan. Please try again.');
    }
  }, [plans, editingPlan, handleCloseEditor, showError]);

  // Toggle plan active status
  const handleToggleActive = useCallback(async (planId: string) => {
    try {
      const updatedPlans = await togglePlanActive(plans, planId);
      setPlans(updatedPlans);
    } catch (error) {
      console.error('Error toggling plan status:', error);
      showError('Error', 'Failed to update plan status.');
    }
  }, [plans, showError]);

  // Duplicate plan
  const handleDuplicate = useCallback(async (planId: string) => {
    try {
      const newId = generatePlanId();
      const updatedPlans = await duplicatePlan(plans, planId, newId);
      setPlans(updatedPlans);

      // Find the duplicated plan and open editor
      const duplicatedPlan = updatedPlans.find(p => p.id === newId);
      if (duplicatedPlan) {
        setEditingPlan(duplicatedPlan);
        setIsEditorVisible(true);
      }
    } catch (error) {
      console.error('Error duplicating plan:', error);
      showError('Error', 'Failed to duplicate plan.');
    }
  }, [plans, showError]);

  // Delete plan
  const handleDelete = useCallback((plan: Plan) => {
    showConfirm(
      'Delete plan?',
      `This will remove "${plan.name}" from the list. Existing subscribers are not modeled here; proceed only if you are sure.`,
      async () => {
        try {
          const updatedPlans = await deletePlan(plans, plan.id);
          setPlans(updatedPlans);
        } catch (error) {
          console.error('Error deleting plan:', error);
          showError('Error', 'Failed to delete plan.');
        }
      },
      undefined,
      { confirmText: 'Delete', cancelText: 'Cancel', isDestructive: true }
    );
  }, [plans, showConfirm, showError]);

  // Render header
  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.statValueActive]}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.statValueInactive]}>{stats.inactive}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {statusFilterOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterPill,
              statusFilter === option.value && styles.filterPillSelected,
            ]}
            onPress={() => setStatusFilter(option.value)}
          >
            <Text
              style={[
                styles.filterPillText,
                statusFilter === option.value && styles.filterPillTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render empty state
  const renderEmpty = () => {
    if (isLoading) return null;

    const hasSearch = searchQuery.trim() !== '';
    const hasFilter = statusFilter !== 'all';

    if (plans.length === 0) {
      // No plans at all
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="layers" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No plans yet</Text>
          <Text style={styles.emptyText}>
            Create your first plan to get started.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleAddPlan}>
            <MaterialIcons name="add" size={20} color={colors.white} />
            <Text style={styles.emptyButtonText}>Create first plan</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // No matching plans
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="search-off" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No plans found</Text>
        <Text style={styles.emptyText}>
          {hasSearch
            ? 'Try adjusting your search query'
            : hasFilter
              ? `No ${statusFilter} plans available`
              : 'No plans match the current filters'}
        </Text>
        {(hasSearch || hasFilter) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          >
            <Text style={styles.clearButtonText}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render plan card
  const renderPlanCard = ({ item }: { item: Plan }) => (
    <PlanCard
      plan={item}
      onPress={() => handleEditPlan(item)}
      onToggleActive={() => handleToggleActive(item.id)}
      onDuplicate={() => handleDuplicate(item.id)}
      onDelete={() => handleDelete(item)}
    />
  );

  if (isLoading && plans.length === 0) {
    return (
      <SafeAreaScreen style={{ flex: 1 }} topBackgroundColor={colors.primary} bottomBackgroundColor={colors.background}>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen style={{ flex: 1 }} topBackgroundColor={colors.primary} bottomBackgroundColor={colors.background}>
      {/* Header */}
      <GradientBox style={styles.header}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <MaterialIcons name="menu" size={26} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Plans & Pricing</Text>
          <Text style={styles.headerSubtitle}>Manage subscription meal plans</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPlan}>
          <MaterialIcons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      </GradientBox>
      <View style={{ flex: 1, backgroundColor: colors.background }}>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search plans by name or code"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Plans List */}
        <FlatList
          data={filteredPlans}
          renderItem={renderPlanCard}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />

        {/* Floating Add Button */}
        <TouchableOpacity style={styles.fab} onPress={handleAddPlan}>
          <MaterialIcons name="add" size={28} color={colors.white} />
        </TouchableOpacity>

        {/* Plan Editor Modal */}
        <PlanEditor
          visible={isEditorVisible}
          plan={editingPlan}
          existingPlans={plans}
          onSave={handleSavePlan}
          onClose={handleCloseEditor}
        />
      </View>
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuButton: {
    padding: spacing.xs,
  },
  headerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.8,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    paddingHorizontal: spacing.md,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: spacing.sm,
    padding: 0,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  listHeader: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statValueActive: {
    color: colors.success,
  },
  statValueInactive: {
    color: colors.textMuted,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.divider,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.card,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  filterPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterPillTextSelected: {
    color: colors.white,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    marginTop: spacing.lg,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginLeft: spacing.sm,
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
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default PlansScreen;
