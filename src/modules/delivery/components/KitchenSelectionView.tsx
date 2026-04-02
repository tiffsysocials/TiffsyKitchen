import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { GradientBox } from '../../../components/common/GradientBox';
import kitchenService from '../../../services/kitchen.service';

interface Props {
  onMenuPress: () => void;
  onKitchenSelect: (kitchen: any) => void;
}

const KitchenSelectionView: React.FC<Props> = ({ onMenuPress, onKitchenSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: kitchenData, isLoading } = useQuery({
    queryKey: ['kitchensList'],
    queryFn: () => kitchenService.getKitchens({ status: 'ACTIVE', limit: 100 }),
  });

  const kitchens = kitchenData?.message?.kitchens || kitchenData?.kitchens || kitchenData?.data?.kitchens || [];

  const filteredKitchens = searchQuery.trim()
    ? kitchens.filter(
        (k: any) =>
          k.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          k.code?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : kitchens;

  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
      {/* Header */}
      <GradientBox style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onMenuPress} className="mr-4">
          <Icon name="menu" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-semibold">Delivery Management</Text>
      </GradientBox>

      <View className="flex-1 p-4">
        {/* Intro */}
        <View className="bg-white rounded-xl p-6 items-center mb-4 shadow-sm">
          <Icon name="local-shipping" size={48} color="#FE8733" />
          <Text className="text-xl font-semibold text-gray-800 mt-3">Select a Kitchen</Text>
          <Text className="text-sm text-gray-500 text-center mt-2 leading-5">
            Choose a kitchen to manage delivery batches, dispatch orders, and view statistics.
          </Text>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-white rounded-lg px-3 py-2 mb-4 border border-gray-200">
          <Icon name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 text-sm text-gray-800 ml-2 p-0"
            placeholder="Search by kitchen name or code..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        <Text className="text-base font-semibold text-gray-800 mb-3">
          Active Kitchens ({filteredKitchens.length})
        </Text>

        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#FE8733" />
            <Text className="text-sm text-gray-500 mt-3">Loading kitchens...</Text>
          </View>
        ) : filteredKitchens.length === 0 ? (
          <View className="flex-1 justify-center items-center py-16">
            <Icon name="store" size={64} color="#9ca3af" />
            <Text className="text-base font-semibold text-gray-500 mt-4">No kitchens found</Text>
            <Text className="text-sm text-gray-400 mt-1">
              {searchQuery ? 'Try a different search term' : 'No active kitchens available'}
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1">
            {filteredKitchens.map((kitchen: any) => (
              <TouchableOpacity
                key={kitchen._id}
                className="flex-row items-center bg-white p-4 rounded-xl mb-3 shadow-sm"
                onPress={() => onKitchenSelect(kitchen)}
              >
                <View className="w-12 h-12 rounded-lg bg-orange-50 justify-center items-center mr-3">
                  <Icon name="restaurant" size={24} color="#FE8733" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-800 mb-1">{kitchen.name}</Text>
                  <Text className="text-xs text-gray-500 mb-1">{kitchen.code}</Text>
                  <View className="flex-row items-center">
                    <View className="bg-gray-100 px-2 py-0.5 rounded mr-2">
                      <Text className="text-[10px] font-semibold text-gray-500">{kitchen.type}</Text>
                    </View>
                    {kitchen.isAcceptingOrders && (
                      <View className="flex-row items-center bg-green-50 px-2 py-0.5 rounded">
                        <Icon name="check-circle" size={12} color="#16a34a" />
                        <Text className="text-[10px] font-semibold text-green-600 ml-1">Accepting</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Icon name="chevron-right" size={24} color="#9ca3af" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaScreen>
  );
};

export default KitchenSelectionView;
