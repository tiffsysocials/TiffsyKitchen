import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'COLLECTING', label: 'Collecting' },
  { value: 'READY_FOR_DISPATCH', label: 'Ready' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PARTIAL_COMPLETE', label: 'Partial' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

interface Filters {
  status: string;
  mealWindow: string;
}

interface Props {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const BatchFilters: React.FC<Props> = ({ filters, onFiltersChange }) => {
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const activeStatusLabel = STATUS_OPTIONS.find((o) => o.value === filters.status)?.label || 'All Status';

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2">
        {/* Status Filter */}
        <TouchableOpacity
          onPress={() => setShowStatusPicker(true)}
          className={`flex-row items-center px-3 py-2 rounded-full mr-2 border ${
            filters.status ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-white'
          }`}
        >
          <Icon name="filter-list" size={16} color={filters.status ? '#FE8733' : '#6b7280'} />
          <Text className={`text-sm ml-1 ${filters.status ? 'text-orange-700' : 'text-gray-600'}`}>
            {activeStatusLabel}
          </Text>
        </TouchableOpacity>

        {/* Meal Window Chips */}
        {['', 'LUNCH', 'DINNER'].map((mw) => (
          <TouchableOpacity
            key={mw || 'all'}
            onPress={() => onFiltersChange({ ...filters, mealWindow: mw })}
            className={`px-3 py-2 rounded-full mr-2 border ${
              filters.mealWindow === mw ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-white'
            }`}
          >
            <Text className={`text-sm ${filters.mealWindow === mw ? 'text-orange-700 font-semibold' : 'text-gray-600'}`}>
              {mw || 'All Meals'}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Clear Filters */}
        {(filters.status || filters.mealWindow) && (
          <TouchableOpacity
            onPress={() => onFiltersChange({ status: '', mealWindow: '' })}
            className="px-3 py-2 rounded-full border border-red-300 bg-red-50"
          >
            <Text className="text-sm text-red-600">Clear</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Status Picker Modal */}
      <Modal visible={showStatusPicker} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-2xl">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-800">Filter by Status</Text>
              <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  onFiltersChange({ ...filters, status: option.value });
                  setShowStatusPicker(false);
                }}
                className={`p-4 border-b border-gray-100 ${
                  filters.status === option.value ? 'bg-orange-50' : ''
                }`}
              >
                <Text
                  className={`text-base ${
                    filters.status === option.value ? 'text-orange-700 font-semibold' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default BatchFilters;
