import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import adminDashboardService, { ReportSegment } from '../../../services/admin-dashboard.service';
import { Card } from '../../../components/common/Card';
import { DatePickerModal } from '../../../components/dashboard/DatePickerModal';
import { format } from 'date-fns';
import { useAlert } from '../../../hooks/useAlert';

type ReportType = 'ORDERS' | 'REVENUE' | 'VOUCHERS' | 'REFUNDS';
type SegmentBy = 'KITCHEN' | 'ZONE';

const ReportsScreen: React.FC = () => {
  const { showSuccess, showError } = useAlert();
  const [reportType, setReportType] = useState<ReportType>('ORDERS');
  const [segmentBy, setSegmentBy] = useState<SegmentBy>('KITCHEN');
  const [dateFrom, setDateFrom] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'from' | 'to'>('from');
  const [isExporting, setIsExporting] = useState(false);

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['report', reportType, segmentBy, format(dateFrom, 'yyyy-MM-dd'), format(dateTo, 'yyyy-MM-dd')],
    queryFn: () => adminDashboardService.getReports({
      type: reportType,
      segmentBy,
      dateFrom: format(dateFrom, 'yyyy-MM-dd'),
      dateTo: format(dateTo, 'yyyy-MM-dd'),
    }),
    staleTime: 60000, // 1 minute
  });

  const reportTypes: { value: ReportType; label: string }[] = [
    { value: 'ORDERS', label: 'Orders' },
    { value: 'REVENUE', label: 'Revenue' },
    { value: 'VOUCHERS', label: 'Vouchers' },
    { value: 'REFUNDS', label: 'Refunds' },
  ];

  const segmentOptions: { value: SegmentBy; label: string }[] = [
    { value: 'KITCHEN', label: 'By Kitchen' },
    { value: 'ZONE', label: 'By Zone' },
  ];

  const openDatePicker = (mode: 'from' | 'to') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const handleDateChange = (date: Date) => {
    if (datePickerMode === 'from') {
      setDateFrom(date);
    } else {
      setDateTo(date);
    }
    setShowDatePicker(false);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await adminDashboardService.exportReport({
        type: reportType,
        segmentBy,
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo, 'yyyy-MM-dd'),
        format: 'CSV',
      });
      showSuccess('Success', 'Report exported successfully');
    } catch (error) {
      showError('Error', 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const renderReportItem = ({ item }: { item: ReportSegment }) => (
    <Card className="mb-3">
      <View className="p-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-lg font-semibold text-gray-800 flex-1">
            {item.entity.name}
          </Text>
        </View>

        <View className="flex-row justify-between">
          {item.totalOrders !== undefined && (
            <View className="flex-1">
              <Text className="text-sm text-gray-600">Total Orders</Text>
              <Text className="text-xl font-semibold text-gray-800 mt-1">
                {item.totalOrders.toLocaleString()}
              </Text>
            </View>
          )}
          {item.totalValue !== undefined && (
            <View className="flex-1">
              <Text className="text-sm text-gray-600">Total Value</Text>
              <Text className="text-xl font-semibold text-gray-800 mt-1">
                ₹{item.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          )}
          {item.avgOrderValue !== undefined && (
            <View className="flex-1">
              <Text className="text-sm text-gray-600">Avg Order Value</Text>
              <Text className="text-xl font-semibold text-gray-800 mt-1">
                ₹{item.avgOrderValue.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header Controls */}
      <View className="bg-white border-b border-gray-200">
        {/* Report Type Selector */}
        <View className="p-4 border-b border-gray-100">
          <Text className="text-sm font-medium text-gray-700 mb-2">Report Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row space-x-2">
              {reportTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setReportType(type.value)}
                  className={`px-4 py-2 rounded-lg ${reportType === type.value
                    ? 'bg-[#FE8733]'
                    : 'bg-gray-100'
                    }`}
                >
                  <Text
                    className={`font-medium ${reportType === type.value ? 'text-white' : 'text-gray-700'
                      }`}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Segment By Selector */}
        <View className="p-4 border-b border-gray-100">
          <Text className="text-sm font-medium text-gray-700 mb-2">Segment By</Text>
          <View className="flex-row space-x-2">
            {segmentOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setSegmentBy(option.value)}
                className={`flex-1 px-4 py-2 rounded-lg ${segmentBy === option.value
                  ? 'bg-[#FE8733]'
                  : 'bg-gray-100'
                  }`}
              >
                <Text
                  className={`font-medium text-center ${segmentBy === option.value ? 'text-white' : 'text-gray-700'
                    }`}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date Range Selector */}
        <View className="p-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Date Range</Text>
          <View className="flex-row items-center space-x-2">
            <View className="flex-1">
              <TouchableOpacity onPress={() => openDatePicker('from')}>
                <View className="bg-gray-100 p-3 rounded-lg">
                  <Text className="text-gray-800 text-sm">
                    From: {format(dateFrom, 'MMM dd, yyyy')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <View className="flex-1">
              <TouchableOpacity onPress={() => openDatePicker('to')}>
                <View className="bg-gray-100 p-3 rounded-lg">
                  <Text className="text-gray-800 text-sm">
                    To: {format(dateTo, 'MMM dd, yyyy')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Export Button */}
        <View className="p-4 pt-0">
          <TouchableOpacity
            onPress={handleExport}
            disabled={isExporting}
            className={`flex-row items-center justify-center py-3 rounded-lg ${isExporting ? 'bg-gray-300' : 'bg-green-600'
              }`}
          >
            {isExporting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Icon name="file-download" size={20} color="#ffffff" />
                <Text className="text-white font-semibold ml-2">Export Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Report Data */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FE8733" />
        </View>
      ) : (
        <FlatList
          data={report?.data || []}
          keyExtractor={(item) => item._id}
          renderItem={renderReportItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Card className="p-6">
              <Text className="text-center text-gray-500">No data available for selected filters</Text>
            </Card>
          }
        />
      )}

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        selectedDate={datePickerMode === 'from' ? dateFrom : dateTo}
        onDateSelect={handleDateChange}
        onClose={() => setShowDatePicker(false)}
      />
    </View>
  );
};

export default ReportsScreen;