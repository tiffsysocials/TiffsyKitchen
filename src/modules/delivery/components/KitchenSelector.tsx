import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import kitchenService from '../../../services/kitchen.service';

interface Props {
  selectedKitchenId: string | null;
  onSelect: (kitchenId: string | null, kitchenName: string | null) => void;
  label?: string;
}

const KitchenSelector: React.FC<Props> = ({ selectedKitchenId, onSelect, label = 'Kitchen' }) => {
  const [showPicker, setShowPicker] = useState(false);

  const { data: kitchenData, isLoading } = useQuery({
    queryKey: ['kitchensList'],
    queryFn: () => kitchenService.getKitchens({ status: 'ACTIVE', limit: 100 }),
  });

  const kitchens = kitchenData?.kitchens || [];
  const selectedKitchen = kitchens.find((k: any) => k._id === selectedKitchenId);

  return (
    <View>
      <Text className="text-sm font-medium text-gray-700 mb-2">{label}</Text>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        className="flex-row items-center justify-between bg-gray-100 p-3 rounded-lg"
      >
        <Text className={selectedKitchen ? 'text-gray-800' : 'text-gray-400'}>
          {selectedKitchen ? selectedKitchen.name : 'All Kitchens'}
        </Text>
        <Icon name="arrow-drop-down" size={24} color="#6b7280" />
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-2xl max-h-[60%]">
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-800">Select Kitchen</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View className="p-8 items-center">
                <ActivityIndicator color="#FE8733" />
              </View>
            ) : (
              <FlatList
                data={[{ _id: null, name: 'All Kitchens' }, ...kitchens]}
                keyExtractor={(item) => item._id || 'all'}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      onSelect(item._id, item._id ? item.name : null);
                      setShowPicker(false);
                    }}
                    className={`flex-row items-center p-4 border-b border-gray-100 ${
                      (item._id === selectedKitchenId) || (!item._id && !selectedKitchenId)
                        ? 'bg-orange-50'
                        : ''
                    }`}
                  >
                    <Icon
                      name={item._id ? 'store' : 'select-all'}
                      size={20}
                      color={(item._id === selectedKitchenId) || (!item._id && !selectedKitchenId) ? '#FE8733' : '#6b7280'}
                    />
                    <Text
                      className={`text-base ml-3 ${
                        (item._id === selectedKitchenId) || (!item._id && !selectedKitchenId)
                          ? 'text-orange-700 font-semibold'
                          : 'text-gray-700'
                      }`}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default KitchenSelector;
