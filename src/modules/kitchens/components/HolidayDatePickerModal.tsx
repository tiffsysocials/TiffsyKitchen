/**
 * Calendar modal for picking a one-off kitchen holiday date.
 *
 * Replaces a raw "type the date as YYYY-MM-DD" text input with an actual
 * calendar so an admin/kitchen-staff user can tap the specific date they
 * want closed instead of typing it. Already-added dates are marked on the
 * calendar so it's obvious at a glance what's already closed.
 */
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../../theme/colors';

interface HolidayDatePickerModalProps {
  visible: boolean;
  /** Dates already in the closedDates list, as "YYYY-MM-DD", so they show marked. */
  existingDates: string[];
  onClose: () => void;
  /** Called with "YYYY-MM-DD" when the admin taps a day that isn't already closed. */
  onSelectDate: (dateString: string) => void;
}

export const HolidayDatePickerModal: React.FC<HolidayDatePickerModalProps> = ({
  visible,
  existingDates,
  onClose,
  onSelectDate,
}) => {
  const markedDates = existingDates.reduce<Record<string, any>>((acc, d) => {
    acc[d] = { selected: true, selectedColor: colors.primary, marked: true };
    return acc;
  }, {});

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select holiday date</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Tap a date to close the kitchen on that specific day
          </Text>
          <Calendar
            onDayPress={(day: DateData) => onSelectDate(day.dateString)}
            markedDates={markedDates}
            theme={{
              todayTextColor: colors.primary,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.white,
              dotColor: colors.primary,
              arrowColor: colors.primary,
              monthTextColor: colors.textPrimary,
              textMonthFontWeight: '600',
              textDayFontSize: 14,
              textMonthFontSize: 16,
            }}
          />
          {existingDates.length > 0 && (
            <Text style={styles.hint}>
              Marked dates are already closed — tap one again to remove it.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});
