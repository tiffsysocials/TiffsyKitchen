import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, {
  Marker,
  Circle,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';

import {
  Area,
  DeliveryZone,
  Kitchen,
  MealWindowPricing,
  NearbyArea,
} from '../../../types/api.types';
import { colors } from '../../../theme/colors';
import deliveryZoneService from '../../../services/deliveryZone.service';
import areaService from '../../../services/area.service';
import { AreaPickerModal } from './AreaPickerModal';

// ─── Constants & helpers ─────────────────────────────────────────────────────
const FEE_FIELDS: { key: keyof MealWindowPricing; label: string; helper?: string }[] = [
  { key: 'deliveryFee', label: 'Delivery Fee (₹)' },
  { key: 'platformFee', label: 'Platform Fee (₹)' },
  { key: 'handlingFee', label: 'Handling Fee (₹)' },
  { key: 'serviceFee', label: 'Service Fee (₹)' },
  { key: 'packagingFee', label: 'Packaging Fee (₹)' },
  { key: 'minOrderAmount', label: 'Min Order Amount (₹)', helper: '0 = no minimum' },
  {
    key: 'freeDeliveryAbove',
    label: 'Free Delivery Above (₹)',
    helper: 'Leave blank for no free-delivery threshold',
  },
];

const emptyPricing = (): MealWindowPricing => ({
  deliveryFee: 0,
  platformFee: 0,
  handlingFee: 0,
  serviceFee: 0,
  packagingFee: 0,
  minOrderAmount: 0,
  freeDeliveryAbove: null,
});

const stepTitles = ['Basics', 'Areas', 'Pricing', 'Preview'] as const;

interface DeliveryZoneFormModalProps {
  visible: boolean;
  /** Pass kitchen so we can pre-fill center coordinates */
  kitchen: Kitchen;
  /** If provided, edit mode; otherwise create mode. */
  zone?: DeliveryZone;
  /** Optional default priority for new zones (parent passes maxPriority+1) */
  defaultPriority?: number;
  onClose: () => void;
  onSaved: (zone: DeliveryZone) => void;
}

/**
 * Multi-step create/edit modal for a single DeliveryZone.
 *
 * Steps: Basics → Areas → Pricing → Preview → Confirm Save
 *
 * The map+list area picker is synced both ways: tap a marker or
 * checkbox to toggle. Manual area add (via AreaPickerModal) bypasses
 * the radius constraint.
 */
export const DeliveryZoneFormModal: React.FC<DeliveryZoneFormModalProps> = ({
  visible,
  kitchen,
  zone,
  defaultPriority,
  onClose,
  onSaved,
}) => {
  const insets = useSafeAreaInsets();
  const isEdit = !!zone;
  const mapRef = useRef<MapView>(null);

  // ─── Form state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('1');
  const [radiusKmInput, setRadiusKmInput] = useState('5');
  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<string>>(new Set());

  // areaCatalog = union of (auto-fetched within radius) + (manually added by name).
  // Stored as full Area-like objects so we can render markers + labels uniformly.
  const [areaCatalog, setAreaCatalog] = useState<Area[]>([]);
  const [lunchPricing, setLunchPricing] = useState<MealWindowPricing>(emptyPricing());
  const [dinnerPricing, setDinnerPricing] = useState<MealWindowPricing>(emptyPricing());
  const [activePricingTab, setActivePricingTab] = useState<'lunch' | 'dinner'>('lunch');

  // ─── UX state ──────────────────────────────────────────────────────────────
  const [previewingAreas, setPreviewingAreas] = useState(false);
  const [areaPickerVisible, setAreaPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Kitchen coordinates (centerCoordinates default for new zones)
  const kitchenCoords = useMemo(() => {
    const lat = kitchen.address?.coordinates?.latitude;
    const lng = kitchen.address?.coordinates?.longitude;
    if (lat == null || lng == null) return null;
    return { latitude: lat, longitude: lng };
  }, [kitchen]);

  // ─── Initial state population for edit mode ────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    if (isEdit && zone) {
      setName(zone.name);
      setPriority(String(zone.priority));
      setRadiusKmInput(String(zone.radiusKm));
      const ids = (Array.isArray(zone.areaIds) ? zone.areaIds : [])
        .map((a) => (typeof a === 'string' ? a : a._id));
      setSelectedAreaIds(new Set(ids));
      // Populated areas if fetched, else empty list (will fetch on Areas step)
      const populated = (Array.isArray(zone.areaIds) ? zone.areaIds : []).filter(
        (a): a is Area => typeof a === 'object',
      );
      setAreaCatalog(populated);
      setLunchPricing(zone.pricing?.lunch || emptyPricing());
      setDinnerPricing(zone.pricing?.dinner || emptyPricing());
    } else {
      // Create mode defaults
      setName('');
      setPriority(String(defaultPriority || 1));
      setRadiusKmInput('5');
      setSelectedAreaIds(new Set());
      setAreaCatalog([]);
      setLunchPricing(emptyPricing());
      setDinnerPricing(emptyPricing());
    }
    setStep(0);
    setActivePricingTab('lunch');
    setErrors({});
    setGlobalError(null);
  }, [visible, isEdit, zone, defaultPriority]);

  // ─── Auto-fetch areas inside radius when entering Areas step ───────────────
  const fetchAreasForRadius = useCallback(
    async (rKm: number, preSelectAll: boolean) => {
      if (!kitchenCoords) return;
      setPreviewingAreas(true);
      try {
        const result = await deliveryZoneService.previewAreas({
          latitude: kitchenCoords.latitude,
          longitude: kitchenCoords.longitude,
          radiusKm: rKm,
        });
        // Map preview shape into Area-like shape (need full ids + names + coords).
        // Re-fetch full Area docs to get coordinates.
        const ids = result.areas.map((a) => a.id || a._id).filter(Boolean) as string[];
        if (ids.length === 0) {
          // Keep any manually-added areas, but no new auto-fetched ones
          setAreaCatalog((prev) => prev.filter((a) => selectedAreaIds.has(a._id)));
          return;
        }
        const fullAreas = await areaService.getAreasByIds(ids);
        setAreaCatalog((prev) => {
          // Merge: keep manually-added (those selected and not in fullAreas), add fetched
          const fetchedIds = new Set(fullAreas.map((a) => a._id));
          const manuallyKept = prev.filter(
            (a) => selectedAreaIds.has(a._id) && !fetchedIds.has(a._id),
          );
          return [...fullAreas, ...manuallyKept];
        });
        if (preSelectAll) {
          // Pre-check newly fetched areas (admin can uncheck)
          setSelectedAreaIds((prev) => {
            const next = new Set(prev);
            fullAreas.forEach((a) => next.add(a._id));
            return next;
          });
        }
      } catch (err) {
        console.warn('Failed to fetch areas for radius:', err);
      } finally {
        setPreviewingAreas(false);
      }
    },
    [kitchenCoords, selectedAreaIds],
  );

  // When entering Areas step (or radius changes while on Areas step), fetch
  useEffect(() => {
    if (!visible || step !== 1) return;
    const rKm = Number(radiusKmInput);
    if (!Number.isFinite(rKm) || rKm <= 0) return;
    // In edit mode on first entry, don't bulk-preselect — preserve current selection
    const preSelectAll = !isEdit && selectedAreaIds.size === 0;
    fetchAreasForRadius(rKm, preSelectAll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, step, radiusKmInput]);

  // ─── Validation per step ───────────────────────────────────────────────────
  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s >= 0) {
      if (!name.trim()) e.name = 'Zone name is required';
      const p = Number(priority);
      if (!Number.isInteger(p) || p < 0) e.priority = 'Priority must be a non-negative integer';
      const r = Number(radiusKmInput);
      if (!Number.isFinite(r) || r < 0.5 || r > 50) e.radiusKm = 'Radius must be 0.5–50 km';
      if (!kitchenCoords) e.kitchen = 'Kitchen has no coordinates — set kitchen location first';
    }
    if (s >= 1 && selectedAreaIds.size === 0) {
      e.areas = 'Select at least one area';
    }
    if (s >= 2) {
      const checkBlock = (block: MealWindowPricing, label: string) => {
        for (const f of FEE_FIELDS) {
          const v = block[f.key];
          if (f.key === 'freeDeliveryAbove') {
            if (v != null && (!Number.isFinite(v) || v < 0)) {
              e[`${label}.${f.key}`] = `${label} ${f.label}: invalid`;
            }
          } else {
            if (!Number.isFinite(v) || v < 0) {
              e[`${label}.${f.key}`] = `${label} ${f.label}: must be ≥ 0`;
            }
          }
        }
        if (
          block.freeDeliveryAbove != null &&
          block.freeDeliveryAbove <= block.minOrderAmount
        ) {
          e[`${label}.freeDeliveryAbove`] =
            `${label}: Free Delivery Above must be greater than Min Order Amount`;
        }
      };
      checkBlock(lunchPricing, 'Lunch');
      checkBlock(dinnerPricing, 'Dinner');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step < stepTitles.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const toggleArea = (areaId: string) => {
    setSelectedAreaIds((prev) => {
      const next = new Set(prev);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return next;
    });
  };

  const handleAreaPickerSave = (areaIds: string[], areas: NearbyArea[]) => {
    setAreaPickerVisible(false);
    // We need full Area docs (with coords) to render markers — fetch them
    (async () => {
      try {
        const fullAreas = await areaService.getAreasByIds(areaIds);
        setAreaCatalog((prev) => {
          const existing = new Set(prev.map((a) => a._id));
          const additions = fullAreas.filter((a) => !existing.has(a._id));
          return [...prev, ...additions];
        });
        setSelectedAreaIds((prev) => {
          const next = new Set(prev);
          areaIds.forEach((id) => next.add(id));
          return next;
        });
      } catch (err) {
        console.warn('Failed to fetch picked areas:', err);
      }
    })();
  };

  const handleRemoveSelectedArea = (areaId: string) => {
    setSelectedAreaIds((prev) => {
      const next = new Set(prev);
      next.delete(areaId);
      return next;
    });
  };

  const copyPricing = (from: 'lunch' | 'dinner') => {
    if (from === 'lunch') setDinnerPricing({ ...lunchPricing });
    else setLunchPricing({ ...dinnerPricing });
  };

  const handlePricingChange = (
    tab: 'lunch' | 'dinner',
    key: keyof MealWindowPricing,
    raw: string,
  ) => {
    const trimmed = raw.trim();
    let parsed: number | null;
    if (key === 'freeDeliveryAbove' && trimmed === '') {
      parsed = null;
    } else {
      parsed = trimmed === '' ? 0 : Number(trimmed);
      if (!Number.isFinite(parsed)) return;
    }
    const setter = tab === 'lunch' ? setLunchPricing : setDinnerPricing;
    setter((prev) => ({ ...prev, [key]: parsed }));
  };

  const handleSave = async () => {
    if (!validateStep(2)) {
      setStep(2);
      return;
    }
    if (!kitchenCoords) {
      setGlobalError('Kitchen has no coordinates — cannot save zone.');
      return;
    }
    setSaving(true);
    setGlobalError(null);
    try {
      const payload = {
        name: name.trim(),
        priority: Number(priority),
        centerCoordinates: kitchenCoords,
        radiusKm: Number(radiusKmInput),
        areaIds: Array.from(selectedAreaIds),
        pricing: {
          lunch: lunchPricing,
          dinner: dinnerPricing,
        },
      };
      let saved: DeliveryZone;
      if (isEdit && zone) {
        saved = await deliveryZoneService.updateDeliveryZone(zone._id, payload);
      } else {
        saved = await deliveryZoneService.createDeliveryZone({
          ...payload,
          kitchenId: kitchen._id,
        });
      }
      onSaved(saved);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to save delivery zone';
      setGlobalError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── Map region computation ────────────────────────────────────────────────
  const mapRegion: Region | null = useMemo(() => {
    if (!kitchenCoords) return null;
    const rKm = Number(radiusKmInput);
    const radiusDeg = (Number.isFinite(rKm) ? rKm : 5) / 111; // ~1 deg ≈ 111 km
    return {
      latitude: kitchenCoords.latitude,
      longitude: kitchenCoords.longitude,
      latitudeDelta: radiusDeg * 2.5,
      longitudeDelta: radiusDeg * 2.5,
    };
  }, [kitchenCoords, radiusKmInput]);

  const fitMap = useCallback(() => {
    if (!kitchenCoords || !mapRef.current) return;
    const coords = [kitchenCoords];
    areaCatalog.forEach((a) => {
      if (a.coordinates?.latitude != null && a.coordinates?.longitude != null) {
        coords.push({
          latitude: a.coordinates.latitude,
          longitude: a.coordinates.longitude,
        });
      }
    });
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 50, bottom: 50, left: 50, right: 50 },
      animated: true,
    });
  }, [kitchenCoords, areaCatalog]);

  // ─── Render helpers ────────────────────────────────────────────────────────
  const renderStepper = () => (
    <View style={s.stepper}>
      {stepTitles.map((title, idx) => {
        const active = step === idx;
        const done = step > idx;
        return (
          <View key={title} style={s.stepperItem}>
            <View
              style={[
                s.stepperDot,
                active && s.stepperDotActive,
                done && s.stepperDotDone,
              ]}>
              {done ? (
                <Icon name="check" size={12} color="#fff" />
              ) : (
                <Text style={[s.stepperNum, active && s.stepperNumActive]}>{idx + 1}</Text>
              )}
            </View>
            <Text style={[s.stepperLabel, active && s.stepperLabelActive]}>{title}</Text>
            {idx < stepTitles.length - 1 && <View style={s.stepperLine} />}
          </View>
        );
      })}
    </View>
  );

  const renderBasicsStep = () => (
    <View>
      <Text style={s.sectionTitle}>Basics</Text>
      <Text style={s.sectionHint}>
        Name this zone and set its priority + initial search radius.
      </Text>

      <Text style={s.label}>Zone Name *</Text>
      <TextInput
        style={[s.input, errors.name && s.inputError]}
        value={name}
        onChangeText={setName}
        placeholder='e.g. "Inner Belt", "Vijay Nagar Side"'
        placeholderTextColor="#9CA3AF"
        maxLength={100}
      />
      {errors.name && <Text style={s.errText}>{errors.name}</Text>}

      <Text style={s.label}>Priority *</Text>
      <Text style={s.fieldHint}>
        Higher wins when two zones overlap on the same area. Ties break on creation date.
      </Text>
      <TextInput
        style={[s.input, errors.priority && s.inputError]}
        value={priority}
        onChangeText={setPriority}
        placeholder="1"
        placeholderTextColor="#9CA3AF"
        keyboardType="number-pad"
      />
      {errors.priority && <Text style={s.errText}>{errors.priority}</Text>}

      <Text style={s.label}>Radius (km) *</Text>
      <Text style={s.fieldHint}>
        Used only as a search hint to pre-fill the area list. You can manually add areas
        outside this radius later.
      </Text>
      <TextInput
        style={[s.input, errors.radiusKm && s.inputError]}
        value={radiusKmInput}
        onChangeText={setRadiusKmInput}
        placeholder="5"
        placeholderTextColor="#9CA3AF"
        keyboardType="decimal-pad"
      />
      {errors.radiusKm && <Text style={s.errText}>{errors.radiusKm}</Text>}

      {!kitchenCoords && (
        <View style={s.warnBox}>
          <Icon name="alert" size={16} color="#92400E" />
          <Text style={s.warnText}>
            This kitchen has no location set. Add a location on the kitchen profile before
            creating a zone.
          </Text>
        </View>
      )}
    </View>
  );

  const renderAreasStep = () => (
    <View>
      <Text style={s.sectionTitle}>Areas</Text>
      <Text style={s.sectionHint}>
        Tap an area marker on the map or use the checkbox list to include / exclude it.
      </Text>

      {mapRegion && (
        <View style={s.mapWrap}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFillObject}
            initialRegion={mapRegion}
            pitchEnabled={false}
            rotateEnabled={false}>
            {kitchenCoords && (
              <>
                <Marker coordinate={kitchenCoords} pinColor={colors.primary} title="Kitchen" />
                <Circle
                  center={kitchenCoords}
                  radius={Number(radiusKmInput) * 1000}
                  strokeColor="rgba(245,107,76,0.7)"
                  strokeWidth={1.5}
                  fillColor="rgba(245,107,76,0.05)"
                />
              </>
            )}
            {areaCatalog.map((a) => {
              if (a.coordinates?.latitude == null) return null;
              const selected = selectedAreaIds.has(a._id);
              return (
                <Marker
                  key={a._id}
                  coordinate={{
                    latitude: a.coordinates.latitude,
                    longitude: a.coordinates.longitude,
                  }}
                  pinColor={selected ? '#F56B4C' : '#9CA3AF'}
                  title={a.name}
                  description={selected ? 'Selected — tap to remove' : 'Tap to include'}
                  onPress={() => toggleArea(a._id)}
                />
              );
            })}
          </MapView>
          <TouchableOpacity style={s.fitBtn} onPress={fitMap}>
            <Icon name="fit-to-page-outline" size={20} color="#374151" />
          </TouchableOpacity>
        </View>
      )}

      <View style={s.areasHeader}>
        <Text style={s.label}>
          {areaCatalog.length} area{areaCatalog.length !== 1 ? 's' : ''} listed •{' '}
          {selectedAreaIds.size} selected
        </Text>
        <TouchableOpacity
          style={s.pickBtn}
          onPress={() => setAreaPickerVisible(true)}
          activeOpacity={0.7}>
          <Icon name="plus-circle" size={16} color={colors.primary} />
          <Text style={s.pickBtnText}>Add by name</Text>
        </TouchableOpacity>
      </View>

      {previewingAreas && (
        <View style={s.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={s.loadingText}>Fetching nearby areas…</Text>
        </View>
      )}

      {errors.areas && <Text style={s.errText}>{errors.areas}</Text>}

      <View style={s.areaList}>
        {areaCatalog.length === 0 && !previewingAreas && (
          <Text style={s.emptyText}>
            No areas in this radius yet. Either expand the radius, or add areas manually
            by name.
          </Text>
        )}
        {areaCatalog.map((a) => {
          const selected = selectedAreaIds.has(a._id);
          return (
            <TouchableOpacity
              key={a._id}
              style={s.areaRow}
              onPress={() => toggleArea(a._id)}
              activeOpacity={0.7}>
              <Icon
                name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={22}
                color={selected ? colors.primary : '#9CA3AF'}
              />
              <View style={s.areaInfo}>
                <Text style={s.areaName}>{a.name}</Text>
                <Text style={s.areaSub} numberOfLines={1}>
                  {[a.city, a.state].filter(Boolean).join(' · ') || '—'}
                  {a.pincodes?.length ? `  ·  ${a.pincodes.length} pincode${a.pincodes.length !== 1 ? 's' : ''}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderPricingStep = () => {
    const block = activePricingTab === 'lunch' ? lunchPricing : dinnerPricing;
    return (
      <View>
        <Text style={s.sectionTitle}>Pricing</Text>
        <Text style={s.sectionHint}>
          Set fees independently for lunch and dinner.
        </Text>

        <View style={s.tabRow}>
          {(['lunch', 'dinner'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activePricingTab === tab && s.tabActive]}
              onPress={() => setActivePricingTab(tab)}
              activeOpacity={0.7}>
              <Icon
                name={tab === 'lunch' ? 'weather-sunny' : 'weather-night'}
                size={16}
                color={activePricingTab === tab ? '#fff' : '#6B7280'}
              />
              <Text style={[s.tabText, activePricingTab === tab && s.tabTextActive]}>
                {tab === 'lunch' ? 'Lunch' : 'Dinner'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={s.copyBtn}
          onPress={() => copyPricing(activePricingTab === 'lunch' ? 'dinner' : 'lunch')}
          activeOpacity={0.7}>
          <Icon name="content-copy" size={14} color={colors.primary} />
          <Text style={s.copyBtnText}>
            Copy from {activePricingTab === 'lunch' ? 'Dinner' : 'Lunch'}
          </Text>
        </TouchableOpacity>

        {FEE_FIELDS.map((f) => {
          const key = `${activePricingTab === 'lunch' ? 'Lunch' : 'Dinner'}.${f.key}`;
          const hasErr = !!errors[key];
          const raw = block[f.key];
          const display = raw == null ? '' : String(raw);
          return (
            <View key={f.key}>
              <Text style={s.label}>{f.label}</Text>
              {f.helper && <Text style={s.fieldHint}>{f.helper}</Text>}
              <TextInput
                style={[s.input, hasErr && s.inputError]}
                value={display}
                onChangeText={(t) => handlePricingChange(activePricingTab, f.key, t)}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
              {hasErr && <Text style={s.errText}>{errors[key]}</Text>}
            </View>
          );
        })}
      </View>
    );
  };

  const renderPreviewStep = () => {
    const selectedAreas = areaCatalog.filter((a) => selectedAreaIds.has(a._id));
    const renderPriceLine = (label: string, lunch: number | null, dinner: number | null) => (
      <View style={s.previewLine}>
        <Text style={s.previewKey}>{label}</Text>
        <Text style={s.previewVal}>
          L: {lunch == null ? '—' : `₹${lunch}`}  ·  D: {dinner == null ? '—' : `₹${dinner}`}
        </Text>
      </View>
    );
    return (
      <View>
        <Text style={s.sectionTitle}>Preview</Text>
        <Text style={s.sectionHint}>Review and confirm. Hit Save to write.</Text>

        {mapRegion && (
          <View style={s.mapWrap}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFillObject}
              initialRegion={mapRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}>
              {kitchenCoords && (
                <>
                  <Marker coordinate={kitchenCoords} pinColor={colors.primary} title="Kitchen" />
                  <Circle
                    center={kitchenCoords}
                    radius={Number(radiusKmInput) * 1000}
                    strokeColor="rgba(245,107,76,0.5)"
                    strokeWidth={1}
                    fillColor="rgba(245,107,76,0.05)"
                  />
                </>
              )}
              {selectedAreas.map((a) =>
                a.coordinates?.latitude != null ? (
                  <Marker
                    key={a._id}
                    coordinate={{
                      latitude: a.coordinates.latitude,
                      longitude: a.coordinates.longitude,
                    }}
                    pinColor="#F56B4C"
                    title={a.name}
                  />
                ) : null,
              )}
            </MapView>
          </View>
        )}

        <View style={s.previewCard}>
          <Text style={s.previewName}>{name || '(unnamed)'}</Text>
          <Text style={s.previewMeta}>
            Priority {priority}  ·  Radius {radiusKmInput} km  ·  {selectedAreaIds.size} areas
          </Text>

          {selectedAreas.length > 0 && (
            <View style={s.chipRow}>
              {selectedAreas.slice(0, 8).map((a) => (
                <View key={a._id} style={s.chip}>
                  <Text style={s.chipText} numberOfLines={1}>
                    {a.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveSelectedArea(a._id)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Icon name="close-circle" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
              {selectedAreas.length > 8 && (
                <Text style={s.chipMore}>+{selectedAreas.length - 8} more</Text>
              )}
            </View>
          )}

          <View style={s.divider} />

          <Text style={s.previewSection}>Pricing per meal window</Text>
          {renderPriceLine('Delivery Fee', lunchPricing.deliveryFee, dinnerPricing.deliveryFee)}
          {renderPriceLine('Platform Fee', lunchPricing.platformFee, dinnerPricing.platformFee)}
          {renderPriceLine('Handling Fee', lunchPricing.handlingFee, dinnerPricing.handlingFee)}
          {renderPriceLine('Service Fee', lunchPricing.serviceFee, dinnerPricing.serviceFee)}
          {renderPriceLine('Packaging Fee', lunchPricing.packagingFee, dinnerPricing.packagingFee)}
          {renderPriceLine('Min Order', lunchPricing.minOrderAmount, dinnerPricing.minOrderAmount)}
          {renderPriceLine(
            'Free Delivery Above',
            lunchPricing.freeDeliveryAbove,
            dinnerPricing.freeDeliveryAbove,
          )}
        </View>

        {globalError && (
          <View style={s.errBox}>
            <Icon name="alert-circle" size={16} color="#B91C1C" />
            <Text style={s.errBoxText}>{globalError}</Text>
          </View>
        )}
      </View>
    );
  };

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            s.container,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}>
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>
                {isEdit ? `Edit "${zone?.name}"` : 'New Delivery Zone'}
              </Text>
              <Text style={s.subtitle} numberOfLines={1}>
                {kitchen.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          {renderStepper()}

          <ScrollView
            style={s.body}
            contentContainerStyle={s.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {step === 0 && renderBasicsStep()}
            {step === 1 && renderAreasStep()}
            {step === 2 && renderPricingStep()}
            {step === 3 && renderPreviewStep()}
          </ScrollView>

          <View style={s.footer}>
            {step > 0 ? (
              <TouchableOpacity
                style={s.backBtn}
                onPress={handleBack}
                disabled={saving}
                activeOpacity={0.7}>
                <Icon name="arrow-left" size={16} color="#374151" />
                <Text style={s.backBtnText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={s.backBtn}
                onPress={onClose}
                disabled={saving}
                activeOpacity={0.7}>
                <Text style={s.backBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}

            {step < stepTitles.length - 1 ? (
              <TouchableOpacity
                style={s.nextBtn}
                onPress={handleNext}
                activeOpacity={0.8}>
                <Text style={s.nextBtnText}>Next</Text>
                <Icon name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.saveBtn, saving && s.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="content-save" size={16} color="#fff" />
                    <Text style={s.nextBtnText}>{isEdit ? 'Save Changes' : 'Create Zone'}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {areaPickerVisible && (
        <AreaPickerModal
          visible={areaPickerVisible}
          selectedAreaIds={Array.from(selectedAreaIds)}
          latitude={kitchenCoords?.latitude}
          longitude={kitchenCoords?.longitude}
          cityHint={kitchen.address?.city}
          stateHint={kitchen.address?.state}
          onClose={() => setAreaPickerVisible(false)}
          onSave={handleAreaPickerSave}
        />
      )}
    </Modal>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 17, fontWeight: '600', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepperItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepperDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDotActive: { backgroundColor: colors.primary },
  stepperDotDone: { backgroundColor: '#10B981' },
  stepperNum: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  stepperNumActive: { color: '#fff' },
  stepperLabel: { fontSize: 11, color: '#6B7280', marginLeft: 6 },
  stepperLabelActive: { color: colors.primary, fontWeight: '600' },
  stepperLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },

  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  sectionHint: { fontSize: 13, color: '#6B7280', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 14, marginBottom: 6 },
  fieldHint: { fontSize: 11, color: '#9CA3AF', marginTop: -2, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  inputError: { borderColor: '#EF4444' },
  errText: { fontSize: 12, color: '#EF4444', marginTop: 4 },

  // Map
  mapWrap: {
    height: 240,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 6,
    marginBottom: 14,
  },
  fitBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },

  // Areas
  areasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3EE',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FDCDB8',
  },
  pickBtnText: { fontSize: 12, color: colors.primary, fontWeight: '600', marginLeft: 4 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  loadingText: { fontSize: 12, color: '#6B7280', marginLeft: 8 },
  areaList: { marginTop: 4 },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  areaInfo: { flex: 1, marginLeft: 10 },
  areaName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  areaSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },

  // Pricing
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginLeft: 6 },
  tabTextActive: { color: '#fff' },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FEF3EE',
    borderRadius: 6,
    marginBottom: 4,
  },
  copyBtnText: { fontSize: 11, color: colors.primary, fontWeight: '600', marginLeft: 4 },

  // Preview
  previewCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  previewMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3EE',
    borderRadius: 14,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FDCDB8',
    marginRight: 6,
    marginBottom: 6,
  },
  chipText: { fontSize: 11, color: colors.primary, fontWeight: '500', marginRight: 4, maxWidth: 110 },
  chipMore: { fontSize: 11, color: '#6B7280', alignSelf: 'center', marginLeft: 4 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  previewSection: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  previewLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  previewKey: { fontSize: 12, color: '#6B7280' },
  previewVal: { fontSize: 12, color: '#111827', fontWeight: '500' },

  // Warning / error boxes
  warnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warnText: { fontSize: 12, color: '#92400E', marginLeft: 8, flex: 1 },
  errBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errBoxText: { fontSize: 12, color: '#B91C1C', marginLeft: 8, flex: 1 },

  // Footer
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#374151', marginLeft: 6 },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  nextBtnText: { fontSize: 14, fontWeight: '600', color: '#fff', marginRight: 6 },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
  },
  saveBtnDisabled: { opacity: 0.6 },
});
