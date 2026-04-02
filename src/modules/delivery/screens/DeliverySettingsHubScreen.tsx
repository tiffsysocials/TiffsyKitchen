import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaScreen } from '../../../components/common/SafeAreaScreen';
import { GradientBox } from '../../../components/common/GradientBox';
import { useNavigation } from '../../../context/NavigationContext';
import { Card } from '../../../components/common/Card';

interface Props {
  onMenuPress: () => void;
}

const settingsItems = [
  {
    title: 'Route Planning',
    description: 'Configure route optimization, clustering radius, and OSRM settings',
    icon: 'route',
    screen: 'RoutePlanningConfig' as const,
  },
  {
    title: 'Driver Assignment',
    description: 'Configure driver scoring, assignment modes, and broadcast settings',
    icon: 'person-pin',
    screen: 'DriverAssignmentConfig' as const,
  },
  {
    title: 'Batch Configuration',
    description: 'Configure batch size, failed order policy, and auto-dispatch delay',
    icon: 'list-alt',
    screen: 'DeliveryConfig' as const,
  },
  {
    title: 'Geofencing',
    description: 'Configure distance-based order acceptance and delivery radii',
    icon: 'my-location',
    screen: 'GeofencingConfig' as const,
  },
];

const DeliverySettingsHubScreen: React.FC<Props> = ({ onMenuPress }) => {
  const { navigate } = useNavigation();

  return (
    <SafeAreaScreen topBackgroundColor="#FE8733" bottomBackgroundColor="#f9fafb" backgroundColor="#f9fafb">
      {/* Header */}
      <GradientBox style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onMenuPress} className="mr-4">
          <Icon name="menu" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-semibold">Delivery Settings</Text>
      </GradientBox>

      <ScrollView className="flex-1 p-4">
        {settingsItems.map((item) => (
          <TouchableOpacity
            key={item.screen}
            onPress={() => navigate(item.screen)}
            activeOpacity={0.7}
          >
            <Card className="p-4 mb-4">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-orange-100 items-center justify-center mr-4">
                  <Icon name={item.icon} size={24} color="#FE8733" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-800">{item.title}</Text>
                  <Text className="text-sm text-gray-500 mt-1">{item.description}</Text>
                </View>
                <Icon name="chevron-right" size={24} color="#9ca3af" />
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaScreen>
  );
};

export default DeliverySettingsHubScreen;
