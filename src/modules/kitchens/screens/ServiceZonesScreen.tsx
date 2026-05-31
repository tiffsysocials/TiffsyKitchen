import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  ToastAndroid,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { colors } from '../../../theme/colors';
import { useAlert } from '../../../hooks/useAlert';
import { ServiceZone, Area } from '../../../types/api.types';
import serviceZoneService from '../../../services/serviceZone.service';
import { ServiceZoneMapView } from '../components/ServiceZoneMapView';
import { ServiceZoneFormModal } from '../components/ServiceZoneFormModal';

interface ServiceZonesScreenProps {
  onMenuPress?: () => void;
}

// ─── Zone detail modal ─────────────────────────────────────────────────────────
const ZoneDetailModal: React.FC<{
  zone: ServiceZone;
  onClose: () => void;
  onDelete: (zone: ServiceZone) => void;
}> = ({ zone, onClose, onDelete }) => {
  const insets = useSafeAreaInsets();
  const areas = Array.isArray(zone.areaIds)
    ? (zone.areaIds as Area[]).filter((a) => typeof a === 'object')
    : [];

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={[detailStyles.container, { paddingTop: insets.top }]}>
        <View style={detailStyles.header}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="arrow-left" size={22} color="#374151" />
          </TouchableOpacity>
          <View style={detailStyles.headerCenter}>
            <Text style={detailStyles.title} numberOfLines={1}>{zone.name}</Text>
            <Text style={detailStyles.subtitle}>{zone.city}</Text>
          </View>
          <TouchableOpacity
            onPress={() => onDelete(zone)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="delete-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={detailStyles.mapContainer}>
          <ServiceZoneMapView serviceZone={zone} height={300} interactive={true} />
        </View>

        <View style={detailStyles.info}>
          <View style={detailStyles.infoRow}>
            <Icon name="map-marker-multiple" size={16} color={colors.primary} />
            <Text style={detailStyles.infoText}>
              {areas.length} area{areas.length !== 1 ? 's' : ''}
            </Text>
            <View style={[detailStyles.statusBadge, zone.status === 'ACTIVE' ? detailStyles.badgeActive : detailStyles.badgeInactive]}>
              <Text style={[detailStyles.statusText, zone.status === 'ACTIVE' ? detailStyles.statusActive : detailStyles.statusInactive]}>
                {zone.status}
              </Text>
            </View>
          </View>

          {zone.description ? (
            <Text style={detailStyles.description}>{zone.description}</Text>
          ) : null}

          {areas.length > 0 && (
            <View style={detailStyles.areaList}>
              {areas.map((a) => (
                <View key={a._id} style={detailStyles.areaChip}>
                  <Text style={detailStyles.areaChipText} numberOfLines={1}>{a.name}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const detailStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerCenter: { flex: 1, marginHorizontal: 12 },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  mapContainer: { margin: 12 },
  info: { paddingHorizontal: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { fontSize: 14, color: '#374151', marginLeft: 6, flex: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeActive: { backgroundColor: '#D1FAE5' },
  badgeInactive: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusActive: { color: '#065F46' },
  statusInactive: { color: '#6B7280' },
  description: { fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 18 },
  areaList: { flexDirection: 'row', flexWrap: 'wrap' },
  areaChip: {
    backgroundColor: '#FEF3EE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#FDCDB8',
    marginRight: 6,
    marginBottom: 6,
  },
  areaChipText: { fontSize: 12, color: colors.primary, fontWeight: '500', maxWidth: 120 },
});

// ─── Zone card ────────────────────────────────────────────────────────────────
const ZoneCard: React.FC<{
  zone: ServiceZone;
  onPress: () => void;
}> = ({ zone, onPress }) => {
  const areas = Array.isArray(zone.areaIds)
    ? (zone.areaIds as Area[]).filter((a) => typeof a === 'object')
    : [];

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={cardStyles.cardTop}>
        <View style={cardStyles.iconWrap}>
          <Icon name="vector-polygon" size={20} color={colors.primary} />
        </View>
        <View style={cardStyles.cardInfo}>
          <Text style={cardStyles.zoneName} numberOfLines={1}>{zone.name}</Text>
          <Text style={cardStyles.zoneCity}>{zone.city}</Text>
        </View>
        <View style={[cardStyles.badge, zone.status === 'ACTIVE' ? cardStyles.badgeActive : cardStyles.badgeInactive]}>
          <Text style={[cardStyles.badgeText, zone.status === 'ACTIVE' ? cardStyles.badgeTextActive : cardStyles.badgeTextInactive]}>
            {zone.status}
          </Text>
        </View>
      </View>
      <View style={cardStyles.cardBottom}>
        <Icon name="map-marker-multiple" size={13} color="#9CA3AF" />
        <Text style={cardStyles.areaCount}>
          {areas.length > 0 ? `${areas.length} area${areas.length !== 1 ? 's' : ''}` : `${(zone.areaIds as string[]).length} area${(zone.areaIds as string[]).length !== 1 ? 's' : ''}`}
        </Text>
        {zone.boundary && (
          <>
            <Text style={cardStyles.dot}> · </Text>
            <Icon name="vector-polygon" size={13} color="#9CA3AF" />
            <Text style={cardStyles.areaCount}> Polygon</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardInfo: { flex: 1 },
  zoneName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  zoneCity: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeActive: { backgroundColor: '#D1FAE5' },
  badgeInactive: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextActive: { color: '#065F46' },
  badgeTextInactive: { color: '#6B7280' },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
  },
  areaCount: { fontSize: 12, color: '#9CA3AF', marginLeft: 4 },
  dot: { fontSize: 12, color: '#D1D5DB' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const ServiceZonesScreen: React.FC<ServiceZonesScreenProps> = ({ onMenuPress }) => {
  const { showError } = useAlert();
  const [zones, setZones] = useState<ServiceZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [selectedZone, setSelectedZone] = useState<ServiceZone | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadZones = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const result = await serviceZoneService.getServiceZones({ limit: 100 });
      setZones(result.serviceZones);
    } catch (err: any) {
      setError(err?.message || 'Failed to load service zones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadZones();
  }, [loadZones]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadZones(true);
  };

  const handleDelete = (zone: ServiceZone) => {
    Alert.alert(
      'Delete Zone',
      `Delete "${zone.name}"? This cannot be undone. Kitchens assigned to this zone will lose the assignment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(zone._id);
            setSelectedZone(null);
            try {
              await serviceZoneService.deleteServiceZone(zone._id);
              setZones((prev) => prev.filter((z) => z._id !== zone._id));
              if (Platform.OS === 'android') {
                ToastAndroid.show('Zone deleted', ToastAndroid.SHORT);
              }
            } catch (err: any) {
              showError('Cannot Delete', err?.message || 'Failed to delete zone');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Icon name="vector-polygon" size={48} color="#E5E7EB" />
        <Text style={styles.emptyTitle}>No service zones yet</Text>
        <Text style={styles.emptySubtitle}>
          Create named delivery zones by grouping areas together.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaScreen>
      <View style={styles.headerBar}>
        {onMenuPress && (
          <TouchableOpacity onPress={onMenuPress} style={styles.menuBtn}>
            <Icon name="menu" size={24} color="#374151" />
          </TouchableOpacity>
        )}
        <Text style={styles.screenTitle}>Service Zones</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setFormVisible(true)}>
          <Icon name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Icon name="alert-circle-outline" size={36} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadZones()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={zones}
          keyExtractor={(z) => z._id}
          renderItem={({ item }) => (
            <ZoneCard
              zone={item}
              onPress={() => setSelectedZone(item)}
            />
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <ServiceZoneFormModal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onCreated={() => {
          setFormVisible(false);
          loadZones(true);
        }}
      />

      {selectedZone && (
        <ZoneDetailModal
          zone={selectedZone}
          onClose={() => setSelectedZone(null)}
          onDelete={handleDelete}
        />
      )}
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  menuBtn: {
    marginRight: 10,
    padding: 4,
  },
  screenTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 8,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  list: {
    paddingTop: 12,
    paddingBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
