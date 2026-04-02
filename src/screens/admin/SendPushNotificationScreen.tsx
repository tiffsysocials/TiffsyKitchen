import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAlert } from '../../hooks/useAlert';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../components/common/SafeAreaScreen';
import { GradientBox } from '../../components/common/GradientBox';
import { Card } from '../../components/common/Card';
import {
  notificationService,
  AdminPushPayload,
  BroadcastNotification,
} from '../../services/notification.service';
import { colors } from '../../theme';

const MAX_TITLE_LENGTH = 100;
const MAX_BODY_LENGTH = 500;
const PAGE_SIZE = 20;

const TARGET_TYPES = [
  {
    value: 'ROLE',
    label: 'By Role',
    icon: 'person',
    description: 'Send to specific user role',
  },
  {
    value: 'ALL_CUSTOMERS',
    label: 'All Customers',
    icon: 'group',
    description: 'Send to all registered customers',
  },
  {
    value: 'ACTIVE_SUBSCRIBERS',
    label: 'Active Subscribers',
    icon: 'verified-user',
    description: 'Send to customers with active subscriptions',
  },
] as const;

const ROLE_OPTIONS = [
  { value: 'CUSTOMER', label: 'Customers', icon: 'person' },
  { value: 'DRIVER', label: 'Drivers', icon: 'local-shipping' },
  { value: 'KITCHEN_STAFF', label: 'Kitchen Staff', icon: 'restaurant' },
] as const;

type TargetType = 'ALL_CUSTOMERS' | 'ACTIVE_SUBSCRIBERS' | 'ROLE';
type TargetRole = 'DRIVER' | 'KITCHEN_STAFF' | 'CUSTOMER';

// ─── Section 1: Send Notification ────────────────────────────────────

const SendNotificationSection: React.FC = () => {
  const { showSuccess, showError, showWarning } = useAlert();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('ROLE');
  const [targetRole, setTargetRole] = useState<TargetRole>('CUSTOMER');

  // Recipient count preview
  const {
    data: recipientData,
    isFetching: isCountLoading,
  } = useQuery({
    queryKey: [
      'recipientCount',
      targetType,
      targetType === 'ROLE' ? targetRole : null,
    ],
    queryFn: () =>
      notificationService.getRecipientCount(
        targetType,
        targetType === 'ROLE' ? targetRole : undefined
      ),
  });

  const recipientCount = recipientData?.data?.count;

  const canSend = title.trim().length > 0 && body.trim().length > 0;

  const sendMutation = useMutation({
    mutationFn: (payload: AdminPushPayload) =>
      notificationService.sendAdminPush(payload),
    onSuccess: (response) => {
      const count = response.data.sentCount ?? response.data.usersNotified;
      showSuccess('Success', `Notification sent to ${count} users`);
      setTitle('');
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['notificationHistory'] });
    },
    onError: (error: any) => {
      showError(
        'Error',
        error?.message || 'Failed to send notification. Please try again.'
      );
    },
  });

  const handleSend = () => {
    if (!canSend) {
      showWarning('Missing Information', 'Please enter both title and message');
      return;
    }

    const payload: AdminPushPayload = {
      title: title.trim(),
      body: body.trim(),
      targetType,
      data: {},
    };

    if (targetType === 'ROLE') {
      payload.targetRole = targetRole;
    }

    sendMutation.mutate(payload);
  };

  return (
    <Card className="p-4 mb-4">
      <View className="flex-row items-center mb-4">
        <Icon name="send" size={22} color={colors.primary} />
        <Text className="text-lg font-semibold text-gray-800 ml-2">
          Send Notification
        </Text>
      </View>

      {/* Title Input */}
      <View className="mb-4">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-sm font-semibold text-gray-900">
            Title <Text className="text-red-500">*</Text>
          </Text>
          <Text
            className={`text-xs ${
              title.length > MAX_TITLE_LENGTH ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            {title.length}/{MAX_TITLE_LENGTH}
          </Text>
        </View>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Notification title"
          maxLength={MAX_TITLE_LENGTH}
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900"
          placeholderTextColor={colors.gray400}
        />
      </View>

      {/* Body Input */}
      <View className="mb-4">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-sm font-semibold text-gray-900">
            Body <Text className="text-red-500">*</Text>
          </Text>
          <Text
            className={`text-xs ${
              body.length > MAX_BODY_LENGTH ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            {body.length}/{MAX_BODY_LENGTH}
          </Text>
        </View>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Notification message..."
          maxLength={MAX_BODY_LENGTH}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 min-h-[90px]"
          placeholderTextColor={colors.gray400}
        />
      </View>

      {/* Target Type */}
      <View className="mb-4">
        <Text className="text-sm font-semibold text-gray-900 mb-2">
          Target Type <Text className="text-red-500">*</Text>
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {TARGET_TYPES.map((target) => (
            <TouchableOpacity
              key={target.value}
              onPress={() => setTargetType(target.value)}
              className={`flex-row items-center px-3 py-2 rounded-lg border ${
                targetType === target.value
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <Icon
                name={target.icon}
                size={18}
                color={
                  targetType === target.value ? colors.primary : colors.gray500
                }
              />
              <Text
                className={`ml-2 text-sm font-medium ${
                  targetType === target.value
                    ? 'text-orange-700'
                    : 'text-gray-700'
                }`}
              >
                {target.label}
              </Text>
              {targetType === target.value && (
                <Icon
                  name="check-circle"
                  size={16}
                  color={colors.primary}
                  style={{ marginLeft: 6 }}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Target Role (conditional) */}
      {targetType === 'ROLE' && (
        <View className="mb-4">
          <Text className="text-sm font-semibold text-gray-900 mb-2">
            Target Role <Text className="text-red-500">*</Text>
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {ROLE_OPTIONS.map((role) => (
              <TouchableOpacity
                key={role.value}
                onPress={() => setTargetRole(role.value)}
                className={`flex-row items-center px-3 py-2 rounded-lg border ${
                  targetRole === role.value
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <Icon
                  name={role.icon}
                  size={18}
                  color={
                    targetRole === role.value ? colors.primary : colors.gray500
                  }
                />
                <Text
                  className={`ml-2 text-sm font-medium ${
                    targetRole === role.value
                      ? 'text-orange-700'
                      : 'text-gray-700'
                  }`}
                >
                  {role.label}
                </Text>
                {targetRole === role.value && (
                  <Icon
                    name="check-circle"
                    size={16}
                    color={colors.primary}
                    style={{ marginLeft: 6 }}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Recipient Count Preview */}
      <View className="bg-blue-50 p-3 rounded-lg mb-4 flex-row items-center">
        <Icon name="people" size={20} color={colors.info} />
        <Text className="ml-2 text-sm text-gray-700 flex-1">
          {isCountLoading ? (
            'Calculating recipients...'
          ) : recipientCount != null ? (
            `This notification will be sent to ${recipientCount} users`
          ) : (
            'Select a target to see recipient count'
          )}
        </Text>
        {isCountLoading && (
          <ActivityIndicator size="small" color={colors.info} />
        )}
      </View>

      {/* Send Button */}
      <TouchableOpacity
        onPress={handleSend}
        disabled={!canSend || sendMutation.isPending}
        className={`flex-row items-center justify-center py-3 rounded-lg ${
          !canSend || sendMutation.isPending ? 'bg-gray-300' : 'bg-orange-500'
        }`}
      >
        {sendMutation.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Icon name="send" size={18} color="white" />
            <Text className="text-white font-semibold text-sm ml-2">
              Send Notification
            </Text>
          </>
        )}
      </TouchableOpacity>
    </Card>
  );
};

// ─── Section 2: Notification History ─────────────────────────────────

const FILTER_TARGET_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'ROLE', label: 'By Role' },
  { value: 'ALL_CUSTOMERS', label: 'All Customers' },
  { value: 'ACTIVE_SUBSCRIBERS', label: 'Active Subscribers' },
];

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const formatTargetLabel = (targetType: string, targetRole?: string) => {
  const typeLabels: Record<string, string> = {
    ROLE: 'By Role',
    ALL_CUSTOMERS: 'All Customers',
    ACTIVE_SUBSCRIBERS: 'Active Subscribers',
  };
  const roleLabels: Record<string, string> = {
    CUSTOMER: 'Customers',
    DRIVER: 'Drivers',
    KITCHEN_STAFF: 'Kitchen Staff',
  };
  let label = typeLabels[targetType] || targetType;
  if (targetRole) {
    label += ` - ${roleLabels[targetRole] || targetRole}`;
  }
  return label;
};

const NotificationHistoryRow: React.FC<{ item: BroadcastNotification }> = ({
  item,
}) => {
  const truncatedBody =
    item.body.length > 60 ? item.body.substring(0, 60) + '...' : item.body;

  return (
    <View className="border-b border-gray-100 py-3 px-1">
      <View className="flex-row items-start justify-between mb-1">
        <Text className="text-sm font-semibold text-gray-900 flex-1 mr-2" numberOfLines={1}>
          {item.title}
        </Text>
        <Text className="text-xs text-gray-400">{formatDate(item.createdAt)}</Text>
      </View>
      <Text className="text-xs text-gray-500 mb-2" numberOfLines={2}>
        {truncatedBody}
      </Text>
      <View className="flex-row items-center flex-wrap gap-2">
        <View className="bg-blue-50 px-2 py-0.5 rounded-full">
          <Text className="text-xs text-blue-700">
            {formatTargetLabel(item.targetType, item.targetRole)}
          </Text>
        </View>
        <View className="bg-green-50 px-2 py-0.5 rounded-full flex-row items-center">
          <Icon name="people" size={12} color={colors.success} />
          <Text className="text-xs text-green-700 ml-1">
            {item.recipientCount}
          </Text>
        </View>
        {item.sentByName && (
          <Text className="text-xs text-gray-400">
            by {item.sentByName}
          </Text>
        )}
      </View>
    </View>
  );
};

const NotificationHistorySection: React.FC = () => {
  const [page, setPage] = useState(1);
  const [filterTargetType, setFilterTargetType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['notificationHistory', page, filterTargetType, dateFrom, dateTo],
    queryFn: () =>
      notificationService.getNotificationHistory({
        page,
        limit: PAGE_SIZE,
        targetType: filterTargetType || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  });

  const broadcasts = data?.data?.broadcasts || [];
  const pagination = data?.data?.pagination;
  const totalPages = pagination?.pages || 1;

  const handleApplyFilters = () => {
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilterTargetType('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <Card className="p-4">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <Icon name="history" size={22} color={colors.primary} />
          <Text className="text-lg font-semibold text-gray-800 ml-2">
            Notification History
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          className="flex-row items-center px-3 py-1.5 rounded-lg bg-gray-100"
        >
          <Icon name="filter-list" size={18} color={colors.gray600} />
          <Text className="text-sm text-gray-600 ml-1">Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View className="bg-gray-50 p-3 rounded-lg mb-4">
          {/* Target Type Filter */}
          <Text className="text-xs font-semibold text-gray-600 mb-1.5">
            Target Type
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {FILTER_TARGET_TYPES.map((ft) => (
              <TouchableOpacity
                key={ft.value}
                onPress={() => {
                  setFilterTargetType(ft.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full border ${
                  filterTargetType === ft.value
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    filterTargetType === ft.value
                      ? 'text-orange-700'
                      : 'text-gray-600'
                  }`}
                >
                  {ft.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Range */}
          <Text className="text-xs font-semibold text-gray-600 mb-1.5">
            Date Range
          </Text>
          <View className="flex-row gap-2 mb-3">
            <View className="flex-1">
              <TextInput
                value={dateFrom}
                onChangeText={setDateFrom}
                placeholder="YYYY-MM-DD"
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900"
                placeholderTextColor={colors.gray400}
              />
            </View>
            <Text className="text-gray-400 self-center">to</Text>
            <View className="flex-1">
              <TextInput
                value={dateTo}
                onChangeText={setDateTo}
                placeholder="YYYY-MM-DD"
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900"
                placeholderTextColor={colors.gray400}
              />
            </View>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleApplyFilters}
              className="flex-1 bg-orange-500 py-2 rounded-lg items-center"
            >
              <Text className="text-white text-xs font-semibold">
                Apply Filters
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClearFilters}
              className="flex-1 bg-gray-200 py-2 rounded-lg items-center"
            >
              <Text className="text-gray-600 text-xs font-semibold">Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* History List */}
      {isLoading ? (
        <View className="py-8 items-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : broadcasts.length === 0 ? (
        <View className="py-8 items-center">
          <Icon name="notifications-off" size={40} color={colors.gray300} />
          <Text className="text-sm text-gray-400 mt-2">
            No notifications found
          </Text>
        </View>
      ) : (
        <>
          {broadcasts.map((item) => (
            <NotificationHistoryRow key={item._id} item={item} />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <TouchableOpacity
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={`flex-row items-center px-3 py-2 rounded-lg ${
                  page <= 1 ? 'bg-gray-100' : 'bg-orange-50'
                }`}
              >
                <Icon
                  name="chevron-left"
                  size={18}
                  color={page <= 1 ? colors.gray300 : colors.primary}
                />
                <Text
                  className={`text-xs font-medium ml-1 ${
                    page <= 1 ? 'text-gray-300' : 'text-orange-700'
                  }`}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              <Text className="text-xs text-gray-500">
                Page {page} of {totalPages}
                {pagination?.total ? ` (${pagination.total} total)` : ''}
              </Text>

              <TouchableOpacity
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={`flex-row items-center px-3 py-2 rounded-lg ${
                  page >= totalPages ? 'bg-gray-100' : 'bg-orange-50'
                }`}
              >
                <Text
                  className={`text-xs font-medium mr-1 ${
                    page >= totalPages ? 'text-gray-300' : 'text-orange-700'
                  }`}
                >
                  Next
                </Text>
                <Icon
                  name="chevron-right"
                  size={18}
                  color={page >= totalPages ? colors.gray300 : colors.primary}
                />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Fetching indicator for page changes */}
      {isFetching && !isLoading && (
        <View className="absolute top-0 right-0 p-2">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </Card>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────

interface SendPushNotificationScreenProps {
  onMenuPress?: () => void;
}

export const SendPushNotificationScreen: React.FC<SendPushNotificationScreenProps> = ({ onMenuPress }) => {
  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" backgroundColor="#f3f4f6">
      {/* Header */}
      <GradientBox style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onMenuPress} className="mr-3 p-1">
          <Icon name="menu" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold flex-1">Push Notifications</Text>
      </GradientBox>

      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ padding: 16 }}
      >
        <SendNotificationSection />
        <NotificationHistorySection />
      </ScrollView>
    </SafeAreaScreen>
  );
};
