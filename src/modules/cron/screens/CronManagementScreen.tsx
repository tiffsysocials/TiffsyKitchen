/**
 * Cron Management Screen
 *
 * Main screen with tabs for Cron Jobs, Auto-Order Logs, and Failure Summary
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { GradientBox } from '../../../components/common/GradientBox';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { CronJobsTab } from '../components/CronJobsTab';
import { AutoOrderLogsTab } from '../components/AutoOrderLogsTab';
import { FailureSummaryTab } from '../components/FailureSummaryTab';

const PRIMARY_COLOR = '#FE8733';

type CronTab = 'jobs' | 'logs' | 'summary';

interface CronManagementScreenProps {
  onMenuPress?: () => void;
}

export const CronManagementScreen: React.FC<CronManagementScreenProps> = ({ onMenuPress }) => {
  const [activeTab, setActiveTab] = useState<CronTab>('jobs');

  const tabs: { key: CronTab; label: string; icon: string }[] = [
    { key: 'jobs', label: 'Cron Jobs', icon: 'schedule' },
    { key: 'logs', label: 'Auto-Order Logs', icon: 'list-alt' },
    { key: 'summary', label: 'Failure Summary', icon: 'error-outline' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'jobs':
        return <CronJobsTab />;
      case 'logs':
        return <AutoOrderLogsTab />;
      case 'summary':
        return <FailureSummaryTab />;
    }
  };

  return (
    <SafeAreaScreen
      topBackgroundColor={PRIMARY_COLOR}
      bottomBackgroundColor="#f9fafb"
      backgroundColor="#f9fafb"
    >
      {/* Header */}
      <GradientBox style={[styles.header, { paddingTop: 8 }]}>
        {onMenuPress && (
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <Icon name="menu" size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Cron Management</Text>
      </GradientBox>

      {/* Tabs */}
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Icon
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? PRIMARY_COLOR : '#9ca3af'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {renderContent()}
    </SafeAreaScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  menuButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: PRIMARY_COLOR,
  },
});
