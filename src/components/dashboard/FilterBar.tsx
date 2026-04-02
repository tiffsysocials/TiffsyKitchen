import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { MealType } from '../../types/dashboard';

interface FilterBarProps {
  selectedDate: Date;
  onDatePress: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedDate,
  onDatePress,
}) => {
  const formatDate = (date: Date): string => {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) {
      return 'Today';
    }

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };



  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.dateButton} onPress={onDatePress}>
        <MaterialIcons name="calendar-today" size={18} color="#FE8733" />
        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        <MaterialIcons name="keyboard-arrow-down" size={20} color="#6b7280" />
      </TouchableOpacity>


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingLeft: 9,
    paddingRight: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginHorizontal: 8,
  },

});

FilterBar.displayName = 'FilterBar';
