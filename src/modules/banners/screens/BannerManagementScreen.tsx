/**
 * BannerManagementScreen
 *
 * Admin screen for managing home screen banners.
 * Supports: list, create, edit, toggle status, delete.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  ToastAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { useAlert } from '../../../hooks/useAlert';
import { bannerService, Banner, CreateBannerRequest, UpdateBannerRequest } from '../../../services/banner.service';
import { BannerFormModal } from '../components/BannerFormModal';
import { GradientBox } from '../../../components/common/GradientBox';

interface BannerManagementScreenProps {
  onMenuPress?: () => void;
}

export const BannerManagementScreen: React.FC<BannerManagementScreenProps> = ({ onMenuPress }) => {
  const { showSuccess, showError, showConfirm } = useAlert();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toggling status per banner (bannerId → loading)
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  // Deleting per banner
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Form modal
  const [formVisible, setFormVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await bannerService.getBanners();
      // Sort by display_order asc
      const list = data?.banners ?? [];
      const sorted = [...list].sort((a, b) => a.display_order - b.display_order);
      setBanners(sorted);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load banners';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBanners(true);
  };

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = () => {
    setEditingBanner(null);
    setFormVisible(true);
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormVisible(true);
  };

  // ── Save (create or edit) ─────────────────────────────────────────────────
  const handleSave = async (
    request: CreateBannerRequest | UpdateBannerRequest,
    isEdit: boolean,
  ) => {
    if (isEdit && editingBanner) {
      await bannerService.updateBanner(editingBanner._id, request as UpdateBannerRequest);
      showToast('Banner updated', 'success');
    } else {
      await bannerService.createBanner(request as CreateBannerRequest);
      showToast('Banner uploaded', 'success');
    }
    setFormVisible(false);
    setEditingBanner(null);
    loadBanners(true);
  };

  // ── Toggle status ─────────────────────────────────────────────────────────
  const handleToggleStatus = useCallback(async (banner: Banner) => {
    const newStatus = banner.status === 'active' ? 'inactive' : 'active';

    // Optimistic update
    setBanners(prev =>
      prev.map(b => (b._id === banner._id ? { ...b, status: newStatus } : b)),
    );
    setTogglingIds(prev => new Set(prev).add(banner._id));

    try {
      await bannerService.toggleStatus(banner._id, newStatus);
      showToast(newStatus === 'active' ? 'Banner activated' : 'Banner deactivated', 'success');
    } catch (err: any) {
      // Revert on failure
      setBanners(prev =>
        prev.map(b => (b._id === banner._id ? { ...b, status: banner.status } : b)),
      );
      const msg = err?.response?.data?.message || err?.message || 'Failed to update status';
      showToast(msg, 'error');
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(banner._id);
        return next;
      });
    }
  }, []);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback((banner: Banner) => {
    showConfirm(
      'Delete Banner',
      'Are you sure you want to delete this banner? This action cannot be undone.',
      async () => {
        setDeletingIds(prev => new Set(prev).add(banner._id));
        try {
          await bannerService.deleteBanner(banner._id);
          setBanners(prev => prev.filter(b => b._id !== banner._id));
          showToast('Banner deleted', 'success');
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || 'Failed to delete banner';
          showToast(msg, 'error');
        } finally {
          setDeletingIds(prev => {
            const next = new Set(prev);
            next.delete(banner._id);
            return next;
          });
        }
      },
      undefined,
      { confirmText: 'Delete', cancelText: 'Cancel', isDestructive: true },
    );
  }, []);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (message: string, type: 'success' | 'error') => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      type === 'success' ? showSuccess('', message) : showError('', message);
    }
  };

  // ── Render a single banner row ────────────────────────────────────────────
  const renderBanner = ({ item, index }: { item: Banner; index: number }) => {
    const isToggling = togglingIds.has(item._id);
    const isDeleting = deletingIds.has(item._id);
    const isActive = item.status === 'active';

    return (
      <View style={styles.row}>
        {/* # */}
        <Text style={[styles.cell, styles.cellIndex]}>{index + 1}</Text>

        {/* Thumbnail */}
        <View style={styles.cellThumb}>
          <Image
            source={{ uri: item.image_url }}
            style={styles.thumb}
            resizeMode="cover"
          />
          {item.title ? (
            <Text style={styles.thumbLabel} numberOfLines={1}>{item.title}</Text>
          ) : null}
        </View>

        {/* Status badge */}
        <View style={styles.cellStatus}>
          <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Display order */}
        <Text style={[styles.cell, styles.cellOrder]}>{item.display_order}</Text>

        {/* Actions */}
        <View style={styles.cellActions}>
          {/* Edit */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => handleEdit(item)}
            disabled={isToggling || isDeleting}
          >
            <Icon name="edit" size={16} color="#fff" />
          </TouchableOpacity>

          {/* Toggle status */}
          <TouchableOpacity
            style={[styles.actionBtn, isActive ? styles.activateBtn : styles.deactivateBtn]}
            onPress={() => handleToggleStatus(item)}
            disabled={isToggling || isDeleting}
          >
            {isToggling ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name={isActive ? 'toggle-off' : 'toggle-on'} size={16} color="#fff" />
            )}
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDelete(item)}
            disabled={isToggling || isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="delete" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.cellIndex]}>#</Text>
      <Text style={[styles.headerCell, styles.cellThumb]}>Image</Text>
      <Text style={[styles.headerCell, styles.cellStatus]}>Status</Text>
      <Text style={[styles.headerCell, styles.cellOrder]}>Order</Text>
      <Text style={[styles.headerCell, styles.cellActions]}>Actions</Text>
    </View>
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaScreen style={{ flex: 1 }} topBackgroundColor={colors.primary} bottomBackgroundColor={colors.background}>
        <GradientBox style={styles.appHeader}>
          {onMenuPress && (
            <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
              <Icon name="menu" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.appHeaderTitle}>Banner Management</Text>
        </GradientBox>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading banners…</Text>
        </View>
      </SafeAreaScreen>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error && banners.length === 0) {
    return (
      <SafeAreaScreen style={{ flex: 1 }} topBackgroundColor={colors.background} bottomBackgroundColor={colors.background} darkIcon>
        <View style={[styles.appHeader, { backgroundColor: colors.background }]}>
          {onMenuPress && (
            <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
              <Icon name="menu" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <Text style={[styles.appHeaderTitle, { color: colors.textPrimary }]}>Banner Management</Text>
        </View>
        <View style={styles.centered}>
          <Icon name="error-outline" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Failed to load banners</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadBanners()}>
            <Icon name="refresh" size={18} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaScreen>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaScreen style={{ flex: 1 }} topBackgroundColor={colors.primary} bottomBackgroundColor={colors.background}>
      {/* App Header */}
      <GradientBox style={styles.appHeader}>
        {onMenuPress && (
          <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        <Text style={styles.appHeaderTitle}>Banner Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleCreate}>
          <Icon name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Upload</Text>
        </TouchableOpacity>
      </GradientBox>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {banners.length} {banners.length === 1 ? 'banner' : 'banners'} total
          {' · '}
          {banners.filter(b => b.status === 'active').length} active
        </Text>
      </View>

      {banners.length === 0 ? (
        /* Empty state */
        <View style={styles.centered}>
          <Icon name="image-not-supported" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No banners yet</Text>
          <Text style={styles.emptyMsg}>Upload your first banner to show it on the home screen.</Text>
          <TouchableOpacity style={styles.emptyUploadBtn} onPress={handleCreate}>
            <Icon name="cloud-upload" size={20} color="#fff" />
            <Text style={styles.emptyUploadText}>Upload Banner</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={banners}
          keyExtractor={(item) => item._id}
          renderItem={renderBanner}
          ListHeaderComponent={renderHeader}
          stickyHeaderIndices={[0]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.tableContainer}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />
      )}

      {/* FAB */}
      {banners.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleCreate}>
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Form Modal */}
      <BannerFormModal
        visible={formVisible}
        banner={editingBanner}
        onClose={() => {
          setFormVisible(false);
          setEditingBanner(null);
        }}
        onSave={handleSave}
      />
    </SafeAreaScreen>
  );
};

const THUMB_W = 80;
const THUMB_H = 48;

const styles = StyleSheet.create({
  // App header (orange bar)
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  menuBtn: {
    marginRight: spacing.md,
  },
  appHeaderTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadiusMd,
    gap: 4,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Stats
  statsRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statsText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Loading / error / empty
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  errorMsg: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptyMsg: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  emptyUploadText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Table
  list: {
    flex: 1,
  },
  tableContainer: {
    paddingBottom: 80,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },

  // Column widths  (#24 + thumb100 + status72 + order44 + actions96 = 336 + 16pad = 352 fits 360px)
  cellIndex: {
    width: 24,
    textAlign: 'center',
  },
  cellThumb: {
    width: THUMB_W + 12,
    justifyContent: 'center',
  },
  cellStatus: {
    width: 72,
    alignItems: 'center',
  },
  cellOrder: {
    width: 44,
    textAlign: 'center',
  },
  cellActions: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  // Cell content
  cell: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  thumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  thumbLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
  },

  // Status badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeActive: {
    backgroundColor: '#dcfce7',
  },
  badgeInactive: {
    backgroundColor: '#f3f4f6',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextActive: {
    color: '#16a34a',
  },
  badgeTextInactive: {
    color: '#6b7280',
  },

  // Action buttons
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#3b82f6',
  },
  activateBtn: {
    backgroundColor: '#16a34a',
  },
  deactivateBtn: {
    backgroundColor: '#9ca3af',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
  },

  // FAB
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
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
