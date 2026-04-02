import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { GradientBox } from '../../../components/common/GradientBox';
import { deliveryService } from '../../../services/delivery.service';
import BatchCard from '../components/BatchCard';
import BatchFilters from '../components/BatchFilters';

interface Props {
  onMenuPress: () => void;
  onBatchSelect: (batchId: string) => void;
}

const BatchMonitoringScreen: React.FC<Props> = ({ onMenuPress, onBatchSelect }) => {
  const [filters, setFilters] = useState({ status: '', mealWindow: '' });
  const [page, setPage] = useState(1);

  const queryParams: any = { page, limit: 20 };
  if (filters.status) queryParams.status = filters.status;
  if (filters.mealWindow) queryParams.mealWindow = filters.mealWindow;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['adminBatches', filters.status, filters.mealWindow, page],
    queryFn: () => deliveryService.getBatches(queryParams),
  });

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
      <GradientBox style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onMenuPress} className="mr-4">
          <Icon name="menu" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-semibold flex-1">Batch Monitoring</Text>
        {pagination && (
          <Text className="text-white text-sm opacity-80">{pagination.total} batches</Text>
        )}
      </GradientBox>

      {/* Filters */}
      <BatchFilters filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Batch List */}
      {isLoading && page === 1 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FE8733" />
        </View>
      ) : (
        <FlatList
          data={batches}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <BatchCard batch={item} onPress={onBatchSelect} />
          )}
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
    </SafeAreaScreen>
  );
};

export default BatchMonitoringScreen;
