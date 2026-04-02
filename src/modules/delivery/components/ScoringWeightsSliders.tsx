import React from 'react';
import { View, Text } from 'react-native';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ScoringWeights {
  proximity: number;
  completionRate: number;
  activeLoad: number;
  recency: number;
}

interface Props {
  weights: ScoringWeights;
  onChange: (weights: ScoringWeights) => void;
}

const WEIGHT_FIELDS: Array<{ key: keyof ScoringWeights; label: string; icon: string }> = [
  { key: 'proximity', label: 'Proximity', icon: 'near-me' },
  { key: 'completionRate', label: 'Completion Rate', icon: 'check-circle' },
  { key: 'activeLoad', label: 'Active Load', icon: 'inventory' },
  { key: 'recency', label: 'Recency', icon: 'schedule' },
];

const ScoringWeightsSliders: React.FC<Props> = ({ weights, onChange }) => {
  const total = weights.proximity + weights.completionRate + weights.activeLoad + weights.recency;
  const isValid = total === 100;

  const handleChange = (key: keyof ScoringWeights, value: number) => {
    onChange({ ...weights, [key]: Math.round(value) });
  };

  return (
    <View>
      {WEIGHT_FIELDS.map((field) => (
        <View key={field.key} className="mb-4">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center">
              <Icon name={field.icon} size={18} color="#6b7280" />
              <Text className="text-sm font-medium text-gray-700 ml-2">{field.label}</Text>
            </View>
            <Text className="text-sm font-bold text-gray-800">{weights[field.key]}</Text>
          </View>
          <Slider
            value={weights[field.key]}
            onValueChange={(v) => handleChange(field.key, v)}
            minimumValue={0}
            maximumValue={100}
            step={5}
            minimumTrackTintColor="#FE8733"
            maximumTrackTintColor="#d1d5db"
            thumbTintColor="#FE8733"
          />
        </View>
      ))}

      {/* Total indicator */}
      <View className={`flex-row items-center justify-center p-3 rounded-lg ${isValid ? 'bg-green-50' : 'bg-red-50'}`}>
        <Icon
          name={isValid ? 'check-circle' : 'error'}
          size={20}
          color={isValid ? '#16a34a' : '#dc2626'}
        />
        <Text className={`text-base font-semibold ml-2 ${isValid ? 'text-green-700' : 'text-red-700'}`}>
          Total: {total} {isValid ? '' : '(must be 100)'}
        </Text>
      </View>
    </View>
  );
};

export default ScoringWeightsSliders;
