import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface HeaderProps {
  title: string;
  onMenuPress?: () => void;
  showBack?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onMenuPress,
  showBack = false,
  onBackPress,
  rightComponent
}) => {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#F56B4C" />
      <View
        className="bg-[#F56B4C] px-4 pb-3 pt-2"
      >
        <View className="flex-row items-center justify-between">
          {/* Back Arrow or Hamburger Menu */}
          <TouchableOpacity
            onPress={showBack ? onBackPress : onMenuPress}
            className="w-10 h-10 items-center justify-center"
          >
            <Icon name={showBack ? "arrow-back" : "menu"} size={28} color="#ffffff" />
          </TouchableOpacity>

          {/* Title */}
          <Text className="text-white text-xl font-bold flex-1 ml-2">
            {title}
          </Text>

          {/* Right Component or Placeholder */}
          <View className="w-10 h-10 items-center justify-center">
            {rightComponent}
          </View>
        </View>
      </View>
    </>
  );
};
