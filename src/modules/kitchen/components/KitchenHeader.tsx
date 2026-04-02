import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useAlert } from '../../../hooks/useAlert';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { KitchenStatus, MealSummary, CutoffSettings, statusColors } from '../models/types';
import { colors, spacing } from '../../../theme';
import { GradientBox } from '../../../components/common/GradientBox';

// Time picker constants
const HOURS_12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const PERIODS = ['AM', 'PM'];

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  iconColor: string;
  iconBgColor: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  iconBgColor,
}) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: iconBgColor }]}>
      <MaterialIcons name={icon} size={18} color={iconColor} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

interface KitchenHeaderProps {
  status: KitchenStatus;
  selectedDate: Date;
  pauseNewOrders: boolean;
  mealSummaries: MealSummary[];
  ordersInProgress: number;
  cutoffSettings: CutoffSettings;
  onStatusChange: (status: KitchenStatus) => void;
  onDateChange: (date: Date) => void;
  onTogglePauseOrders: () => void;
  onCutoffChange: (settings: CutoffSettings) => void;
  onDownloadSummary: () => void;
  onMenuPress: () => void;
}

// Helper to parse time string like "11:00 AM" into components
const parseTimeString = (timeStr: string): { hour: string; minute: string; period: string } => {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    return {
      hour: match[1].padStart(2, '0'),
      minute: match[2],
      period: match[3].toUpperCase(),
    };
  }
  return { hour: '12', minute: '00', period: 'PM' };
};

// Helper to format time components into string
const formatTimeString = (hour: string, minute: string, period: string): string => {
  return `${parseInt(hour, 10)}:${minute} ${period}`;
};

export const KitchenHeader: React.FC<KitchenHeaderProps> = ({
  status,
  selectedDate,
  pauseNewOrders,
  mealSummaries,
  ordersInProgress,
  cutoffSettings,
  onStatusChange,
  onDateChange,
  onTogglePauseOrders,
  onCutoffChange,
  onDownloadSummary,
  onMenuPress,
}) => {
  const { showSuccess, showConfirm } = useAlert();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showCutoffModal, setShowCutoffModal] = useState(false);

  // Time picker state
  const [lunchTime, setLunchTime] = useState(() => parseTimeString(cutoffSettings.lunchCutoff));
  const [dinnerTime, setDinnerTime] = useState(() => parseTimeString(cutoffSettings.dinnerCutoff));
  const [activeTimeField, setActiveTimeField] = useState<'lunch' | 'dinner'>('lunch');

  const totalMeals = mealSummaries.reduce((sum, m) => sum + m.totalOrders, 0);
  const lunchOrders = mealSummaries.find(m => m.mealType === 'lunch')?.totalOrders || 0;
  const dinnerOrders = mealSummaries.find(m => m.mealType === 'dinner')?.totalOrders || 0;

  const totalSteelDabba = mealSummaries.reduce((sum, m) => sum + m.steelDabbaCount, 0);
  const totalDisposable = mealSummaries.reduce((sum, m) => sum + m.disposableCount, 0);
  const steelPercentage = totalMeals > 0 ? Math.round((totalSteelDabba / totalMeals) * 100) : 0;

  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    return date.toLocaleDateString('en-IN', options);
  };

  const handleStatusChange = (newStatus: KitchenStatus) => {
    if (newStatus !== status) {
      showConfirm(
        'Change Kitchen Status',
        `Are you sure you want to change status to "${newStatus}"?`,
        () => {
          onStatusChange(newStatus);
          setShowStatusMenu(false);
        },
        undefined,
        { confirmText: 'Confirm', cancelText: 'Cancel' }
      );
    } else {
      setShowStatusMenu(false);
    }
  };

  const statusStyle = statusColors[status];

  return (
    <GradientBox style={styles.container}>
      {/* Title Row */}
      <View style={styles.titleRow}>
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <MaterialIcons name="menu" size={26} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Kitchen – Jaipur</Text>
        </View>
        <TouchableOpacity
          style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}
          onPress={() => setShowStatusMenu(true)}
        >
          <View style={[styles.statusDot, { backgroundColor: statusStyle.text }]} />
          <Text style={[styles.statusText, { color: statusStyle.text }]}>{status}</Text>
          <MaterialIcons name="keyboard-arrow-down" size={16} color={statusStyle.text} />
        </TouchableOpacity>
      </View>

      {/* Date Row */}
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateSelector}>
          <MaterialIcons name="event" size={18} color={colors.white} />
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          <MaterialIcons name="keyboard-arrow-down" size={18} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.todayLabel}>
          {selectedDate.toDateString() === new Date().toDateString() ? 'Today' : ''}
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            style={[styles.actionButton, pauseNewOrders && styles.actionButtonActive]}
            onPress={onTogglePauseOrders}
          >
            <MaterialIcons
              name={pauseNewOrders ? 'play-arrow' : 'pause'}
              size={16}
              color={pauseNewOrders ? colors.error : colors.white}
            />
            <Text style={[styles.actionButtonText, pauseNewOrders && styles.actionButtonTextActive]}>
              {pauseNewOrders ? 'Resume orders' : 'Pause orders'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => setShowCutoffModal(true)}>
            <MaterialIcons name="more-time" size={16} color={colors.white} />
            <Text style={styles.actionButtonText}>Extend cut-off</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.downloadButton} onPress={onDownloadSummary}>
          <MaterialIcons name="download" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Stat Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScrollView}
        contentContainerStyle={styles.statsContainer}
      >
        <StatCard
          title="Total Meals"
          value={totalMeals}
          icon="restaurant"
          iconColor={colors.primary}
          iconBgColor={colors.primaryLight}
        />
        <StatCard
          title="Lunch"
          value={lunchOrders}
          icon="wb-sunny"
          iconColor="#f97316"
          iconBgColor="#fff7ed"
        />
        <StatCard
          title="Dinner"
          value={dinnerOrders}
          icon="nights-stay"
          iconColor="#6366f1"
          iconBgColor="#eef2ff"
        />
        <StatCard
          title="Steel Dabba"
          value={`${steelPercentage}%`}
          subtitle={`${totalSteelDabba} of ${totalMeals}`}
          icon="eco"
          iconColor="#16a34a"
          iconBgColor="#dcfce7"
        />
        <StatCard
          title="In Progress"
          value={ordersInProgress}
          icon="local-shipping"
          iconColor="#8b5cf6"
          iconBgColor="#ede9fe"
        />
      </ScrollView>

      {/* Status Menu Modal */}
      <Modal
        visible={showStatusMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusMenu(false)}
        >
          <View style={styles.statusMenu}>
            <Text style={styles.statusMenuTitle}>Kitchen Status</Text>
            {(['Online', 'Paused', 'Maintenance'] as KitchenStatus[]).map((s) => {
              const style = statusColors[s];
              const isSelected = s === status;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusMenuItem, isSelected && styles.statusMenuItemSelected]}
                  onPress={() => handleStatusChange(s)}
                >
                  <View style={[styles.statusDot, { backgroundColor: style.text }]} />
                  <Text style={[styles.statusMenuItemText, { color: style.text }]}>{s}</Text>
                  {isSelected && (
                    <MaterialIcons name="check" size={18} color={style.text} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Cut-off Time Picker Modal */}
      <Modal
        visible={showCutoffModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCutoffModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cutoffModal}>
            <View style={styles.cutoffModalHeader}>
              <Text style={styles.cutoffModalTitle}>Extend Cut-off Time</Text>
              <TouchableOpacity onPress={() => setShowCutoffModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Meal Type Tabs */}
            <View style={styles.mealTabs}>
              <TouchableOpacity
                style={[styles.mealTab, activeTimeField === 'lunch' && styles.mealTabActive]}
                onPress={() => setActiveTimeField('lunch')}
              >
                <MaterialIcons
                  name="wb-sunny"
                  size={18}
                  color={activeTimeField === 'lunch' ? colors.white : colors.textSecondary}
                />
                <Text style={[styles.mealTabText, activeTimeField === 'lunch' && styles.mealTabTextActive]}>
                  Lunch
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mealTab, activeTimeField === 'dinner' && styles.mealTabActive]}
                onPress={() => setActiveTimeField('dinner')}
              >
                <MaterialIcons
                  name="nights-stay"
                  size={18}
                  color={activeTimeField === 'dinner' ? colors.white : colors.textSecondary}
                />
                <Text style={[styles.mealTabText, activeTimeField === 'dinner' && styles.mealTabTextActive]}>
                  Dinner
                </Text>
              </TouchableOpacity>
            </View>

            {/* Current Cut-off Display */}
            <View style={styles.currentCutoffContainer}>
              <Text style={styles.currentCutoffLabel}>
                Current {activeTimeField === 'lunch' ? 'Lunch' : 'Dinner'} Cut-off:
              </Text>
              <Text style={styles.currentCutoffValue}>
                {activeTimeField === 'lunch' ? cutoffSettings.lunchCutoff : cutoffSettings.dinnerCutoff}
              </Text>
            </View>

            {/* Time Picker */}
            <View style={styles.timePickerContainer}>
              {/* Hour Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {HOURS_12.map((hour) => {
                    const currentTime = activeTimeField === 'lunch' ? lunchTime : dinnerTime;
                    const isSelected = currentTime.hour === hour;
                    return (
                      <TouchableOpacity
                        key={hour}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          if (activeTimeField === 'lunch') {
                            setLunchTime((prev) => ({ ...prev, hour }));
                          } else {
                            setDinnerTime((prev) => ({ ...prev, hour }));
                          }
                        }}
                      >
                        <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                          {hour}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Minute Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Minute</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {MINUTES.map((minute) => {
                    const currentTime = activeTimeField === 'lunch' ? lunchTime : dinnerTime;
                    const isSelected = currentTime.minute === minute;
                    return (
                      <TouchableOpacity
                        key={minute}
                        style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                        onPress={() => {
                          if (activeTimeField === 'lunch') {
                            setLunchTime((prev) => ({ ...prev, minute }));
                          } else {
                            setDinnerTime((prev) => ({ ...prev, minute }));
                          }
                        }}
                      >
                        <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                          {minute}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* AM/PM Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>AM/PM</Text>
                <View style={styles.periodPicker}>
                  {PERIODS.map((period) => {
                    const currentTime = activeTimeField === 'lunch' ? lunchTime : dinnerTime;
                    const isSelected = currentTime.period === period;
                    return (
                      <TouchableOpacity
                        key={period}
                        style={[styles.periodItem, isSelected && styles.periodItemSelected]}
                        onPress={() => {
                          if (activeTimeField === 'lunch') {
                            setLunchTime((prev) => ({ ...prev, period }));
                          } else {
                            setDinnerTime((prev) => ({ ...prev, period }));
                          }
                        }}
                      >
                        <Text style={[styles.periodItemText, isSelected && styles.periodItemTextSelected]}>
                          {period}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* New Time Preview */}
            <View style={styles.newTimePreview}>
              <Text style={styles.newTimeLabel}>New Cut-off Time:</Text>
              <Text style={styles.newTimeValue}>
                {activeTimeField === 'lunch'
                  ? formatTimeString(lunchTime.hour, lunchTime.minute, lunchTime.period)
                  : formatTimeString(dinnerTime.hour, dinnerTime.minute, dinnerTime.period)}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.cutoffActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  // Reset to current settings
                  setLunchTime(parseTimeString(cutoffSettings.lunchCutoff));
                  setDinnerTime(parseTimeString(cutoffSettings.dinnerCutoff));
                  setShowCutoffModal(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  const newSettings: CutoffSettings = {
                    ...cutoffSettings,
                    lunchCutoff: formatTimeString(lunchTime.hour, lunchTime.minute, lunchTime.period),
                    dinnerCutoff: formatTimeString(dinnerTime.hour, dinnerTime.minute, dinnerTime.period),
                  };
                  onCutoffChange(newSettings);
                  setShowCutoffModal(false);
                  showSuccess(
                    'Cut-off Extended',
                    `${activeTimeField === 'lunch' ? 'Lunch' : 'Dinner'} cut-off time has been updated.`
                  );
                }}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GradientBox>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  menuButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: spacing.borderRadiusSm,
  },
  dateText: {
    fontSize: 13,
    color: colors.white,
    marginHorizontal: spacing.xs,
  },
  todayLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  leftActions: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: spacing.borderRadiusSm,
    marginRight: spacing.sm,
  },
  actionButtonActive: {
    backgroundColor: colors.errorLight,
  },
  actionButtonText: {
    fontSize: 12,
    color: colors.white,
    marginLeft: 4,
  },
  actionButtonTextActive: {
    color: colors.error,
  },
  downloadButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsScrollView: {
    marginTop: spacing.sm,
  },
  statsContainer: {
    paddingHorizontal: spacing.lg,
  },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadiusMd,
    padding: spacing.md,
    marginRight: spacing.sm,
    minWidth: 100,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statTitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusMenu: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadiusLg,
    padding: spacing.md,
    minWidth: 200,
  },
  statusMenuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  statusMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.borderRadiusSm,
  },
  statusMenuItemSelected: {
    backgroundColor: colors.background,
  },
  statusMenuItemText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginLeft: spacing.sm,
  },
  // Cutoff Modal Styles
  cutoffModal: {
    backgroundColor: colors.white,
    borderRadius: spacing.borderRadiusLg,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  cutoffModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cutoffModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mealTabs: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    padding: 4,
  },
  mealTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadiusSm,
  },
  mealTabActive: {
    backgroundColor: colors.primary,
  },
  mealTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  mealTabTextActive: {
    color: colors.white,
  },
  currentCutoffContainer: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadiusMd,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  currentCutoffLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  currentCutoffValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  pickerColumn: {
    alignItems: 'center',
    flex: 1,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  pickerScroll: {
    height: 150,
    width: '100%',
  },
  pickerItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderRadius: spacing.borderRadiusSm,
    marginVertical: 2,
  },
  pickerItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  pickerItemText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  pickerItemTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  periodPicker: {
    flex: 1,
    justifyContent: 'center',
  },
  periodItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderRadius: spacing.borderRadiusSm,
    marginVertical: 4,
  },
  periodItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  periodItemText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  periodItemTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  newTimePreview: {
    backgroundColor: colors.successLight,
    borderRadius: spacing.borderRadiusMd,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newTimeLabel: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '500',
  },
  newTimeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.success,
  },
  cutoffActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadiusMd,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});

export default KitchenHeader;
