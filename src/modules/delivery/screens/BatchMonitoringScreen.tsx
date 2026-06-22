import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Calendar } from 'react-native-calendars';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { GradientBox } from '../../../components/common/GradientBox';
import { deliveryService } from '../../../services/delivery.service';
import BatchCard from '../components/BatchCard';
import BatchFilters from '../components/BatchFilters';
import MergeBatchesModal from '../components/MergeBatchesModal';
import AssignBatchesToDriverModal from '../components/AssignBatchesToDriverModal';

interface Props {
  onMenuPress: () => void;
  onBatchSelect: (batchId: string) => void;
}

const getTodayDateString = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

const BatchMonitoringScreen: React.FC<Props> = ({ onMenuPress, onBatchSelect }) => {
  const [filters, setFilters] = useState({ status: '', mealWindow: '' });
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(getTodayDateString());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Merge selection mode
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<any[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const kitchenIdOf = (b: any) => b?.kitchenId?._id || b?.kitchenId;

  // A batch is mergeable if it is pre-dispatch + unassigned. Once one is picked,
  // others must share the same kitchen + meal window.
  const isEligible = (item: any) => {
    const mergeableStatus =
      ['COLLECTING', 'READY_FOR_DISPATCH'].includes(item.status) && !item.driverId;
    if (!mergeableStatus) return false;
    if (selected.length === 0) return true;
    const first = selected[0];
    return kitchenIdOf(item) === kitchenIdOf(first) && item.mealWindow === first.mealWindow;
  };

  const toggleSelect = (item: any) => {
    setSelected((prev) =>
      prev.some((b) => b._id === item._id)
        ? prev.filter((b) => b._id !== item._id)
        : [...prev, item],
    );
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected([]);
    setShowMergeModal(false);
    setShowAssignModal(false);
  };

  const queryParams: any = { page, limit: 20 };
  if (filters.status) queryParams.status = filters.status;
  if (filters.mealWindow) queryParams.mealWindow = filters.mealWindow;
  if (selectedDate) {
    queryParams.dateFrom = new Date(`${selectedDate}T00:00:00`).toISOString();
    queryParams.dateTo = new Date(`${selectedDate}T23:59:59.999`).toISOString();
  }

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['adminBatches', filters.status, filters.mealWindow, selectedDate, page],
    queryFn: () => deliveryService.getBatches(queryParams),
  });

  const formatDateLabel = (d: string | null) => {
    if (!d) return 'All dates';
    const today = getTodayDateString();
    if (d === today) return 'Today';
    const dt = new Date(`${d}T00:00:00`);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const batches = data?.data?.batches || [];
  const pagination = data?.data?.pagination;

  const handleRefresh = () => {
    setPage(1);
    refetch();
  };

  const handleLoadMore = () => {
    if (pagination && page < pagination.pages) {
      setPage((p) => p + 1);
    }
  };

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
      {/* Header */}
      <GradientBox style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity onPress={onMenuPress}>
          <Icon name="menu" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '600', flex: 1 }}>Batch Monitoring</Text>
        <TouchableOpacity
          onPress={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          style={dateChipStyles.chip}
        >
          <Icon name={selectMode ? 'close' : 'merge-type'} size={16} color="#fff" />
          <Text style={dateChipStyles.chipText}>{selectMode ? 'Done' : 'Merge'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={dateChipStyles.chip}>
          <Icon name="calendar-today" size={16} color="#fff" />
          <Text style={dateChipStyles.chipText}>{formatDateLabel(selectedDate)}</Text>
        </TouchableOpacity>
      </GradientBox>

      {pagination && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff' }}>
          <Text style={{ color: '#6b7280', fontSize: 12 }}>{pagination.total} batches on {formatDateLabel(selectedDate)}</Text>
        </View>
      )}

      {/* Filters */}
      <BatchFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Date picker modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={dateChipStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View style={dateChipStyles.modalContent}>
            <View style={dateChipStyles.modalHeader}>
              <Text style={dateChipStyles.modalTitle}>Select Date</Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedDate(null);
                    setPage(1);
                    setShowDatePicker(false);
                  }}
                  style={dateChipStyles.allButton}
                >
                  <Text style={dateChipStyles.allButtonText}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedDate(getTodayDateString());
                    setPage(1);
                    setShowDatePicker(false);
                  }}
                  style={dateChipStyles.todayButton}
                >
                  <Text style={dateChipStyles.todayButtonText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Icon name="close" size={24} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>
            <Calendar
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setPage(1);
                setShowDatePicker(false);
              }}
              markedDates={selectedDate ? {
                [selectedDate]: { selected: true, selectedColor: '#FE8733' },
              } : {}}
              theme={{
                todayTextColor: '#FE8733',
                selectedDayBackgroundColor: '#FE8733',
                arrowColor: '#FE8733',
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Batch List */}
      {isLoading && page === 1 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FE8733" />
        </View>
      ) : (
        <FlatList
          data={batches}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: selectMode ? 88 : 16 }}
          renderItem={({ item }) => {
            const isSelected = selected.some((b) => b._id === item._id);
            return (
              <BatchCard
                batch={item}
                onPress={onBatchSelect}
                selectable={selectMode}
                selected={isSelected}
                selectableEligible={isSelected || isEligible(item)}
                onToggleSelect={() => toggleSelect(item)}
              />
            );
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              colors={['#FE8733']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Icon name="inbox" size={48} color="#d1d5db" />
              <Text className="text-gray-400 text-base mt-4">No batches found</Text>
              <Text className="text-gray-400 text-sm">Try adjusting your filters</Text>
            </View>
          }
          ListFooterComponent={
            isLoading && page > 1 ? (
              <View className="py-4 items-center">
                <ActivityIndicator color="#FE8733" />
              </View>
            ) : null
          }
        />
      )}

      {/* Selection action bar */}
      {selectMode && (
        <View style={mergeBarStyles.bar}>
          <Text style={mergeBarStyles.count}>
            {selected.length} selected
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowAssignModal(true)}
              disabled={selected.length < 1}
              style={[mergeBarStyles.buttonOutline, selected.length < 1 && mergeBarStyles.buttonOutlineDisabled]}
            >
              <Icon name="person" size={18} color={selected.length < 1 ? '#9ca3af' : '#FE8733'} />
              <Text style={[mergeBarStyles.buttonOutlineText, selected.length < 1 && { color: '#9ca3af' }]}>
                Assign
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowMergeModal(true)}
              disabled={selected.length < 2}
              style={[mergeBarStyles.button, selected.length < 2 && mergeBarStyles.buttonDisabled]}
            >
              <Icon name="merge-type" size={18} color="#fff" />
              <Text style={mergeBarStyles.buttonText}>Merge {selected.length >= 2 ? selected.length : ''}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <MergeBatchesModal
        visible={showMergeModal}
        batches={selected.map((b) => ({
          _id: b._id,
          batchNumber: b.batchNumber,
          orderCount: b.orderIds?.length || 0,
        }))}
        onClose={() => setShowMergeModal(false)}
        onSuccess={(mergedBatchId) => {
          exitSelectMode();
          handleRefresh();
          if (mergedBatchId) onBatchSelect(mergedBatchId);
        }}
      />

      <AssignBatchesToDriverModal
        visible={showAssignModal}
        batches={selected.map((b) => ({
          _id: b._id,
          batchNumber: b.batchNumber,
          orderCount: b.orderIds?.length || 0,
        }))}
        onClose={() => setShowAssignModal(false)}
        onSuccess={() => {
          exitSelectMode();
          handleRefresh();
        }}
      />
    </SafeAreaScreen>
  );
};

const dateChipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  chipText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  todayButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FE8733',
    borderRadius: 6,
  },
  todayButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  allButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  allButtonText: { color: '#374151', fontWeight: '600', fontSize: 12 },
});

const mergeBarStyles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  count: { fontSize: 14, fontWeight: '600', color: '#374151' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FE8733',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonDisabled: { backgroundColor: '#d1d5db' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  buttonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#FE8733',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  buttonOutlineDisabled: { borderColor: '#d1d5db' },
  buttonOutlineText: { color: '#FE8733', fontWeight: '700', fontSize: 14 },
});

export default BatchMonitoringScreen;
