import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Props {
  selected: 'LUNCH' | 'DINNER' | null;
  onSelect: (mealWindow: 'LUNCH' | 'DINNER' | null) => void;
  allowNull?: boolean;
}

const MealWindowSelector: React.FC<Props> = ({ selected, onSelect, allowNull = true }) => {
  const options: Array<{ value: 'LUNCH' | 'DINNER' | null; label: string; icon: string }> = [
    ...(allowNull ? [{ value: null as null, label: 'Both', icon: 'restaurant' }] : []),
    { value: 'LUNCH' as const, label: 'Lunch', icon: 'wb-sunny' },
    { value: 'DINNER' as const, label: 'Dinner', icon: 'nights-stay' },
  ];

  return (
    <View>
      <Text className="text-sm font-medium text-gray-700 mb-2">Meal Window</Text>
      <View className="flex-row">
        {options.map((option) => (
          <TouchableOpacity
            key={option.label}
            onPress={() => onSelect(option.value)}
            className={`flex-1 flex-row items-center justify-center py-3 mx-1 rounded-lg border ${
              selected === option.value
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <Icon
              name={option.icon}
              size={18}
              color={selected === option.value ? '#FE8733' : '#6b7280'}
            />
            <Text
              className={`text-sm ml-1 ${
                selected === option.value ? 'text-orange-700 font-semibold' : 'text-gray-600'
              }`}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default MealWindowSelector;
