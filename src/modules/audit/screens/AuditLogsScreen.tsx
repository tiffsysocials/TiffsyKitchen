import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import adminDashboardService, { AuditLog } from '../../../services/admin-dashboard.service';
import { Card } from '../../../components/common/Card';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { Header } from '../../../components/common/Header';
import { useNavigation } from '../../../context/NavigationContext';
import { colors } from '../../../theme';
import { format } from 'date-fns';

type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | undefined;
type EntityType = 'ORDER' | 'USER' | 'KITCHEN' | 'MENU' | 'VOUCHER' | 'REFUND' | undefined;

const AuditLogsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedAction, setSelectedAction] = useState<ActionType>(undefined);
  const [selectedEntity, setSelectedEntity] = useState<EntityType>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['auditLogs', selectedAction, selectedEntity],
    queryFn: ({ pageParam = 1 }) =>
      adminDashboardService.getAuditLogs({
        action: selectedAction,
        entityType: selectedEntity,
        page: pageParam,
        limit: 20,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.pages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
  });

  const { data: logDetail } = useQuery({
    queryKey: ['auditLogDetail', selectedLog],
    queryFn: () => adminDashboardService.getAuditLogDetail(selectedLog!),
    enabled: !!selectedLog,
  });

  const actionTypes: ActionType[] = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
  const entityTypes: EntityType[] = ['ORDER', 'USER', 'KITCHEN', 'MENU', 'VOUCHER', 'REFUND'];

  const allLogs = data?.pages.flatMap((page) => page.logs) || [];

  const getActionColor = (action: string): string => {
    const colors: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      LOGIN: 'bg-purple-100 text-purple-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getRoleColor = (role: string): string => {
    const colors: Record<string, string> = {
      ADMIN: 'bg-red-100 text-red-800',
      CUSTOMER: 'bg-blue-100 text-blue-800',
      KITCHEN_STAFF: 'bg-orange-100 text-orange-800',
      DRIVER: 'bg-purple-100 text-purple-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const renderLogItem = ({ item }: { item: AuditLog }) => (
    <TouchableOpacity onPress={() => setSelectedLog(item._id)}>
      <Card className="mb-3">
        <View className="p-4">
          <View className="flex-row justify-between items-start mb-2">
            <View className={`px-2 py-1 rounded ${getActionColor(item.action)}`}>
              <Text className="text-xs font-semibold">{item.action}</Text>
            </View>
            <Text className="text-xs text-gray-500">
              {format(new Date(item.createdAt), 'MMM dd, yyyy HH:mm')}
            </Text>
          </View>

          <View className="flex-row items-center mb-2">
            <Text className="text-sm font-medium text-gray-800 mr-2">Entity:</Text>
            <Text className="text-sm text-gray-600">{item.entityType}</Text>
          </View>

          <View className="flex-row items-center">
            <Icon name="person" size={16} color="#6b7280" />
            <Text className="text-sm text-gray-600 ml-1">{item.userId.name}</Text>
            <View className={`ml-2 px-2 py-1 rounded ${getRoleColor(item.userId.role)}`}>
              <Text className="text-xs font-medium">{item.userId.role}</Text>
            </View>
          </View>

          {item.details && Object.keys(item.details).length > 0 && (
            <View className="mt-2 pt-2 border-t border-gray-200">
              <Text className="text-xs text-gray-500">Tap to view details</Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderFilters = () => (
    <View className="bg-white border-b border-gray-200 p-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-lg font-semibold text-gray-800">Filters</Text>
        <TouchableOpacity onPress={() => setShowFilters(false)}>
          <Icon name="close" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Action Filter */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">Action Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={() => setSelectedAction(undefined)}
              className={`px-4 py-2 rounded-lg ${
                selectedAction === undefined ? 'bg-orange-500' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`font-medium ${
                  selectedAction === undefined ? 'text-white' : 'text-gray-700'
                }`}
              >
                All
              </Text>
            </TouchableOpacity>
            {actionTypes.map((action) => (
              <TouchableOpacity
                key={action}
                onPress={() => setSelectedAction(action)}
                className={`px-4 py-2 rounded-lg ${
                  selectedAction === action ? 'bg-orange-500' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`font-medium ${
                    selectedAction === action ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {action}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Entity Filter */}
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">Entity Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={() => setSelectedEntity(undefined)}
              className={`px-4 py-2 rounded-lg ${
                selectedEntity === undefined ? 'bg-orange-500' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`font-medium ${
                  selectedEntity === undefined ? 'text-white' : 'text-gray-700'
                }`}
              >
                All
              </Text>
            </TouchableOpacity>
            {entityTypes.map((entity) => (
              <TouchableOpacity
                key={entity}
                onPress={() => setSelectedEntity(entity)}
                className={`px-4 py-2 rounded-lg ${
                  selectedEntity === entity ? 'bg-orange-500' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`font-medium ${
                    selectedEntity === entity ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {entity}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <TouchableOpacity
        onPress={() => {
          setShowFilters(false);
          refetch();
        }}
        className="bg-orange-500 py-3 rounded-lg"
      >
        <Text className="text-white font-semibold text-center">Apply Filters</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDetailModal = () => (
    <Modal visible={!!selectedLog} animationType="slide" transparent onRequestClose={() => setSelectedLog(null)}>
      <View className="flex-1 bg-black/50">
        <View className="flex-1 mt-20 bg-white rounded-t-3xl">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-800">Log Details</Text>
            <TouchableOpacity onPress={() => setSelectedLog(null)}>
              <Icon name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            {logDetail && (
              <View>
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Action</Text>
                  <View className={`self-start px-3 py-1.5 rounded ${getActionColor(logDetail.action)}`}>
                    <Text className="text-sm font-semibold">{logDetail.action}</Text>
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Entity Type</Text>
                  <Text className="text-base text-gray-800">{logDetail.entityType}</Text>
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Entity ID</Text>
                  <Text className="text-base text-gray-800 font-mono">{logDetail.entityId}</Text>
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-1">User</Text>
                  <View className="flex-row items-center">
                    <Text className="text-base text-gray-800 mr-2">{logDetail.userId.name}</Text>
                    <View className={`px-2 py-1 rounded ${getRoleColor(logDetail.userId.role)}`}>
                      <Text className="text-xs font-medium">{logDetail.userId.role}</Text>
                    </View>
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Timestamp</Text>
                  <Text className="text-base text-gray-800">
                    {format(new Date(logDetail.createdAt), 'MMMM dd, yyyy HH:mm:ss')}
                  </Text>
                </View>

                {logDetail.details && Object.keys(logDetail.details).length > 0 && (
                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-2">Additional Details</Text>
                    <Card className="p-3 bg-gray-50">
                      <Text className="text-sm font-mono text-gray-800">
                        {JSON.stringify(logDetail.details, null, 2)}
                      </Text>
                    </Card>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaScreen topBackgroundColor={colors.primary}>
      <Header
        title="Audit Logs"
        showBack
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            accessibilityLabel="Toggle filters"
          >
            <Icon name="filter-list" size={24} color="#ffffff" />
          </TouchableOpacity>
        }
      />
      <View className="flex-1 bg-gray-50">

      {/* Filters */}
      {showFilters && renderFilters()}

      {/* Active Filters Display */}
      {(selectedAction || selectedEntity) && (
        <View className="bg-white border-b border-gray-200 p-4">
          <View className="flex-row flex-wrap">
            {selectedAction && (
              <View className="bg-orange-100 px-3 py-1.5 rounded-full flex-row items-center mr-2 mb-2">
                <Text className="text-orange-800 text-sm font-medium mr-1">
                  Action: {selectedAction}
                </Text>
                <TouchableOpacity onPress={() => setSelectedAction(undefined)}>
                  <Icon name="close" size={16} color="#ea580c" />
                </TouchableOpacity>
              </View>
            )}
            {selectedEntity && (
              <View className="bg-orange-100 px-3 py-1.5 rounded-full flex-row items-center mr-2 mb-2">
                <Text className="text-orange-800 text-sm font-medium mr-1">
                  Entity: {selectedEntity}
                </Text>
                <TouchableOpacity onPress={() => setSelectedEntity(undefined)}>
                  <Icon name="close" size={16} color="#ea580c" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Logs List */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <FlatList
          data={allLogs}
          keyExtractor={(item) => item._id}
          renderItem={renderLogItem}
          contentContainerStyle={{ padding: 16 }}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator size="small" color="#f97316" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Card className="p-6">
              <Text className="text-center text-gray-500">No audit logs found</Text>
            </Card>
          }
        />
      )}

      {/* Detail Modal */}
      {renderDetailModal()}
      </View>
    </SafeAreaScreen>
  );
};

export default AuditLogsScreen;