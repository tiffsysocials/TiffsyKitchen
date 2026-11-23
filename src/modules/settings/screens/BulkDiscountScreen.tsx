import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import adminDashboardService, { SystemConfig } from '../../../services/admin-dashboard.service';
import { Card } from '../../../components/common/Card';
import { useAlert } from '../../../hooks/useAlert';
import { GradientBox } from '../../../components/common/GradientBox';

type BulkTier = NonNullable<SystemConfig['bulkDiscount']>['tiers'][number];
type TierType = BulkTier['type'];
type BulkOrderSettings = NonNullable<SystemConfig['bulkOrder']>;

const BULK_ORDER_DEFAULTS: BulkOrderSettings = {
  enabled: true,
  minLeadHours: 12,
  minThalisPerOrder: 8,
  maxThalisPerOrder: 100,
  maxDaysAhead: 30,
  packagingOptions: [
    { code: 'STANDARD', label: 'Standard packaging', enabled: true },
    { code: 'INDIVIDUAL', label: 'Individual meal boxes', enabled: true },
  ],
};

// Numeric fields on the Bulk Order card, in display order.
const BULK_ORDER_FIELDS: Array<{
  key: keyof Omit<BulkOrderSettings, 'enabled' | 'packagingOptions'>;
  label: string;
  hint: string;
}> = [
  {
    key: 'minThalisPerOrder',
    label: 'Minimum thalis',
    hint: 'Smallest bulk order accepted. Usually matches your entry tier below.',
  },
  {
    key: 'maxThalisPerOrder',
    label: 'Maximum thalis',
    hint: 'Largest self-serve order. Bigger groups are told to contact support.',
  },
  {
    key: 'minLeadHours',
    label: 'Notice required (hours)',
    hint: "Measured to that meal's order cutoff — 12h on an 11:00 lunch means ordering by 23:00 the night before. 0 = same-day allowed.",
  },
  {
    key: 'maxDaysAhead',
    label: 'Book up to (days ahead)',
    hint: 'How far into the future the date picker offers.',
  },
];

interface BulkDiscountScreenProps {
  onMenuPress?: () => void;
}

// Label + value hint per tier type; drives the picker and the value field.
const TYPE_META: Record<TierType, { label: string; valueLabel: string; hint: string }> = {
  PERCENTAGE: { label: '% Off', valueLabel: 'Percent (%)', hint: 'e.g., 10 = 10% off the meal subtotal. Optional ₹ cap below.' },
  FLAT: { label: 'Flat ₹ Off', valueLabel: 'Amount (₹)', hint: 'Fixed ₹ off the order.' },
  FREE_DELIVERY: { label: 'Free Delivery', valueLabel: '—', hint: 'Delivery fee waived. No value needed.' },
  UNIT_PRICE: { label: 'Per-Thali Price', valueLabel: 'Price per thali (₹)', hint: 'Every thali repriced to this ₹ (e.g., 109 → 99).' },
  FREE_MEALS: { label: 'Free Meals', valueLabel: 'Free meal count', hint: 'e.g., 1 = buy 8 get 1 free (their value is discounted).' },
  BONUS_VOUCHER: { label: 'Bonus Vouchers', valueLabel: 'Voucher count', hint: 'Extra meal vouchers issued after the order. Subscribers only.' },
  FREE_ADDON_VALUE: { label: 'Free Add-ons', valueLabel: 'Add-on value (₹)', hint: 'Add-ons free up to this ₹ (capped by the order’s add-ons).' },
  CASHBACK: { label: 'Wallet Cashback', valueLabel: 'Cashback (₹)', hint: 'Credited to the auto-order wallet after delivery. Subscribers only.' },
};

const TYPE_ORDER: TierType[] = [
  'PERCENTAGE',
  'FLAT',
  'FREE_DELIVERY',
  'UNIT_PRICE',
  'FREE_MEALS',
  'BONUS_VOUCHER',
  'FREE_ADDON_VALUE',
  'CASHBACK',
];

const BulkDiscountScreen: React.FC<BulkDiscountScreenProps> = ({ onMenuPress }) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useAlert();

  const { data: config, isLoading } = useQuery({
    queryKey: ['systemConfig'],
    queryFn: () => adminDashboardService.getSystemConfig(),
  });

  const [enabled, setEnabled] = useState(false);
  const [tiers, setTiers] = useState<BulkTier[]>([]);
  const [bulkOrder, setBulkOrder] = useState<BulkOrderSettings>(BULK_ORDER_DEFAULTS);
  // Which tier row has its type picker expanded.
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState<Record<string, string>>({});
  const { data: customMenuRequests = [] } = useQuery({
    queryKey: ['bulkCustomMenuRequests'],
    queryFn: () => adminDashboardService.getBulkCustomMenuRequests(),
  });

  useEffect(() => {
    if (config?.bulkDiscount) {
      setEnabled(config.bulkDiscount.enabled === true);
      setTiers(config.bulkDiscount.tiers || []);
    }
    if (config?.bulkOrder) {
      setBulkOrder({ ...BULK_ORDER_DEFAULTS, ...config.bulkOrder });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SystemConfig>) => adminDashboardService.updateSystemConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemConfig'] });
      showSuccess('Success', 'Bulk discount tiers updated');
    },
    onError: (err: any) => {
      showError('Error', err?.message || 'Failed to update bulk discounts');
    },
  });
  const reviewMutation = useMutation({
    mutationFn: ({ id, status, adminRemark }: { id: string; status: 'APPROVED' | 'REJECTED'; adminRemark: string }) =>
      adminDashboardService.reviewBulkCustomMenuRequest(id, { status, adminRemark }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulkCustomMenuRequests'] });
      showSuccess('Updated', 'Custom-menu request reviewed');
    },
    onError: (err: any) => showError('Review failed', err?.message || 'Please try again'),
  });

  const handleSave = () => {
    if (bulkOrder.minThalisPerOrder < 1) {
      showError('Invalid bulk order', 'Minimum thalis must be at least 1');
      return;
    }
    if (bulkOrder.minThalisPerOrder > bulkOrder.maxThalisPerOrder) {
      showError('Invalid bulk order', 'Minimum thalis cannot exceed maximum thalis');
      return;
    }
    if (bulkOrder.maxDaysAhead < 1) {
      showError('Invalid bulk order', 'Booking window must be at least 1 day');
      return;
    }

    // Validate before sending: sane thresholds, values where required.
    for (const t of tiers) {
      if (!t.minMeals || t.minMeals < 2) {
        showError('Invalid tier', 'Each tier needs a meal threshold of at least 2');
        return;
      }
      if (t.type !== 'FREE_DELIVERY' && (!t.value || t.value <= 0)) {
        showError('Invalid tier', `"${TYPE_META[t.type].label}" tier at ${t.minMeals}+ meals needs a value`);
        return;
      }
    }
    const sorted = [...tiers].sort((a, b) => a.minMeals - b.minMeals);
    const seen = new Set<number>();
    for (const t of sorted) {
      if (seen.has(t.minMeals)) {
        showError('Invalid tiers', `Two tiers share the same threshold (${t.minMeals}+)`);
        return;
      }
      seen.add(t.minMeals);
    }
    updateMutation.mutate({
      bulkOrder,
      bulkDiscount: {
        enabled,
        tiers: sorted.map((t) => ({
          minMeals: t.minMeals,
          type: t.type,
          value: t.type === 'FREE_DELIVERY' ? 0 : t.value,
          maxDiscountAmount: t.type === 'PERCENTAGE' ? t.maxDiscountAmount || null : null,
        })),
      },
    } as Partial<SystemConfig>);
  };

  const updateBulkOrder = (patch: Partial<BulkOrderSettings>) => {
    setBulkOrder((prev) => ({ ...prev, ...patch }));
  };

  const updateTier = (index: number, patch: Partial<BulkTier>) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const removeTier = (index: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
    setPickerFor(null);
  };

  const addTier = () => {
    const maxThreshold = tiers.reduce((m, t) => Math.max(m, t.minMeals), 0);
    setTiers((prev) => [
      ...prev,
      { minMeals: maxThreshold > 0 ? maxThreshold + 5 : 8, type: 'PERCENTAGE', value: 5, maxDiscountAmount: null },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
        <View className="flex-1 justify-center items-center bg-gray-50">
          <ActivityIndicator size="large" color="#FE8733" />
          <Text className="text-gray-500 mt-2">Loading config...</Text>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
      {/* Header */}
      <GradientBox style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onMenuPress} className="mr-4">
          <Icon name="menu" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-semibold">Bulk Orders</Text>
      </GradientBox>

      <ScrollView className="flex-1">
        <View className="p-4">
          {customMenuRequests.filter(request => request.status === 'PENDING').map(request => (
            <Card key={request._id} className="p-4 mb-4">
              <Text className="text-base font-semibold text-gray-800">
                {request.userId?.name || request.userId?.phone} · {request.quantity} thalis
              </Text>
              <Text className="text-xs text-gray-500 mt-1">
                {request.kitchenId?.name} · {request.mealWindow} · {new Date(request.serviceDate).toLocaleDateString('en-IN')}
              </Text>
              <Text className="text-sm text-gray-700 mt-3">{request.requestText}</Text>
              <TextInput
                className="border border-gray-200 rounded-lg px-3 py-2 text-gray-800 mt-3"
                placeholder="Required approval/rejection remark"
                value={reviewRemarks[request._id] || ''}
                onChangeText={(value) => setReviewRemarks(prev => ({ ...prev, [request._id]: value }))}
              />
              <View className="flex-row mt-3">
                {(['APPROVED', 'REJECTED'] as const).map(status => (
                  <TouchableOpacity
                    key={status}
                    className={`flex-1 py-3 rounded-lg ${status === 'APPROVED' ? 'bg-green-500 mr-2' : 'bg-red-500'}`}
                    onPress={() => {
                      const adminRemark = (reviewRemarks[request._id] || '').trim();
                      if (adminRemark.length < 3) return showError('Remark required', 'Enter a review remark first');
                      reviewMutation.mutate({ id: request._id, status, adminRemark });
                    }}
                  >
                    <Text className="text-white text-center font-semibold">
                      {status === 'APPROVED' ? 'Approve' : 'Reject'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          ))}
          {/* Bulk ordering: the customer-facing Bulk Order flow (one date, one
              meal window, many thalis). The tiers below price it, but they also
              price any large order — these limits govern only this flow. */}
          <Card className="p-4 mb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <Icon name="local-shipping" size={24} color="#FE8733" />
                <View className="ml-2 flex-1">
                  <Text className="text-lg font-semibold text-gray-800">Bulk Ordering</Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    Lets customers order many thalis for one date and meal window,
                    delivered together. Turning this off hides the Bulk Order page.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => updateBulkOrder({ enabled: !bulkOrder.enabled })}
                className={`w-12 h-6 rounded-full ${bulkOrder.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${bulkOrder.enabled ? 'self-end' : 'self-start'}`} />
              </TouchableOpacity>
            </View>

            {bulkOrder.enabled && (
              <View className="mt-4">
                {BULK_ORDER_FIELDS.map((field) => (
                  <View key={field.key} className="mb-3">
                    <Text className="text-xs text-gray-500 mb-1">{field.label}</Text>
                    <TextInput
                      className="border border-gray-200 rounded-lg px-3 py-2 text-gray-800"
                      keyboardType="number-pad"
                      value={String(bulkOrder[field.key] ?? '')}
                      onChangeText={(v) =>
                        updateBulkOrder({ [field.key]: parseInt(v, 10) || 0 } as Partial<BulkOrderSettings>)
                      }
                      placeholderTextColor="#9CA3AF"
                    />
                    <Text className="text-xs text-gray-400 mt-1">{field.hint}</Text>
                  </View>
                ))}
                <Text className="text-sm font-semibold text-gray-700 mt-2 mb-2">Packaging options</Text>
                {bulkOrder.packagingOptions.map((option, index) => (
                  <View key={option.code} className="flex-row items-center mb-3">
                    <TextInput
                      className="border border-gray-200 rounded-lg px-3 py-2 text-gray-800 flex-1 mr-3"
                      value={option.label}
                      onChangeText={(label) => updateBulkOrder({
                        packagingOptions: bulkOrder.packagingOptions.map((item, i) =>
                          i === index ? { ...item, label } : item
                        ),
                      })}
                    />
                    <TouchableOpacity
                      onPress={() => updateBulkOrder({
                        packagingOptions: bulkOrder.packagingOptions.map((item, i) =>
                          i === index ? { ...item, enabled: !item.enabled } : item
                        ),
                      })}
                      className={`w-12 h-6 rounded-full ${option.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${option.enabled ? 'self-end' : 'self-start'}`} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {/* Master toggle */}
          <Card className="p-4 mb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <Icon name="stacked-bar-chart" size={24} color="#FE8733" />
                <View className="ml-2 flex-1">
                  <Text className="text-lg font-semibold text-gray-800">Bulk Order Discounts</Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    Orders with enough meals automatically get the highest matching tier below.
                    Never stacks with coupons — customers get whichever is worth more.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setEnabled(!enabled)}
                className={`w-12 h-6 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <View className={`w-5 h-5 rounded-full bg-white m-0.5 ${enabled ? 'self-end' : 'self-start'}`} />
              </TouchableOpacity>
            </View>
          </Card>

          {/* Tier rows */}
          {tiers.map((tier, index) => {
            const meta = TYPE_META[tier.type];
            return (
              <Card key={index} className="p-4 mb-3">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-base font-semibold text-gray-800">
                    Tier {index + 1}
                  </Text>
                  <TouchableOpacity onPress={() => removeTier(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="delete-outline" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                {/* Threshold */}
                <Text className="text-xs text-gray-500 mb-1">Minimum meals in the order</Text>
                <TextInput
                  className="border border-gray-200 rounded-lg px-3 py-2 text-gray-800 mb-3"
                  keyboardType="number-pad"
                  value={tier.minMeals ? String(tier.minMeals) : ''}
                  onChangeText={(v) => updateTier(index, { minMeals: parseInt(v, 10) || 0 })}
                  placeholder="e.g., 8"
                  placeholderTextColor="#9CA3AF"
                />

                {/* Type picker */}
                <Text className="text-xs text-gray-500 mb-1">Discount type</Text>
                <TouchableOpacity
                  onPress={() => setPickerFor(pickerFor === index ? null : index)}
                  className="border border-gray-200 rounded-lg px-3 py-2 mb-1 flex-row items-center justify-between"
                >
                  <Text className="text-gray-800">{meta.label}</Text>
                  <Icon name={pickerFor === index ? 'expand-less' : 'expand-more'} size={20} color="#6B7280" />
                </TouchableOpacity>
                {pickerFor === index && (
                  <View className="border border-gray-100 rounded-lg mb-2">
                    {TYPE_ORDER.map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => {
                          updateTier(index, { type: t, ...(t === 'FREE_DELIVERY' ? { value: 0 } : {}) });
                          setPickerFor(null);
                        }}
                        className={`px-3 py-2 flex-row items-center justify-between ${tier.type === t ? 'bg-orange-50' : ''}`}
                      >
                        <Text className={tier.type === t ? 'text-orange-600 font-semibold' : 'text-gray-700'}>
                          {TYPE_META[t].label}
                        </Text>
                        {tier.type === t && <Icon name="check" size={18} color="#FE8733" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <Text className="text-[11px] text-gray-400 mb-3">{meta.hint}</Text>

                {/* Value */}
                {tier.type !== 'FREE_DELIVERY' && (
                  <>
                    <Text className="text-xs text-gray-500 mb-1">{meta.valueLabel}</Text>
                    <TextInput
                      className="border border-gray-200 rounded-lg px-3 py-2 text-gray-800 mb-3"
                      keyboardType="decimal-pad"
                      value={tier.value ? String(tier.value) : ''}
                      onChangeText={(v) => updateTier(index, { value: parseFloat(v) || 0 })}
                      placeholder="0"
                      placeholderTextColor="#9CA3AF"
                    />
                  </>
                )}

                {/* Cap (percentage only) */}
                {tier.type === 'PERCENTAGE' && (
                  <>
                    <Text className="text-xs text-gray-500 mb-1">Max discount cap (₹, optional)</Text>
                    <TextInput
                      className="border border-gray-200 rounded-lg px-3 py-2 text-gray-800"
                      keyboardType="decimal-pad"
                      value={tier.maxDiscountAmount ? String(tier.maxDiscountAmount) : ''}
                      onChangeText={(v) =>
                        updateTier(index, { maxDiscountAmount: v.trim() === '' ? null : parseFloat(v) || 0 })
                      }
                      placeholder="No cap"
                      placeholderTextColor="#9CA3AF"
                    />
                  </>
                )}
              </Card>
            );
          })}

          {tiers.length === 0 && (
            <Card className="p-6 mb-3 items-center">
              <Icon name="stacked-bar-chart" size={36} color="#D1D5DB" />
              <Text className="text-gray-500 text-sm mt-2 text-center">
                No tiers yet. Add one — e.g., 8+ meals → 5% off.
              </Text>
            </Card>
          )}

          {/* Add tier */}
          <TouchableOpacity
            onPress={addTier}
            className="border border-dashed border-orange-300 rounded-xl py-3 items-center mb-4 flex-row justify-center"
          >
            <Icon name="add" size={20} color="#FE8733" />
            <Text className="text-orange-500 font-semibold ml-1">Add Tier</Text>
          </TouchableOpacity>

          {/* Save */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={updateMutation.isPending}
            className="bg-orange-500 rounded-xl py-4 items-center mb-8"
            style={{ opacity: updateMutation.isPending ? 0.7 : 1 }}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-base">Save Bulk Settings</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaScreen>
  );
};

export { BulkDiscountScreen };
export default BulkDiscountScreen;
