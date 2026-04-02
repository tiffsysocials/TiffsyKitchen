import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors, spacing } from '../../../theme';
import { GradientBox } from '../../../components/common/GradientBox';

interface MenuHeaderProps {
  onMenuPress: () => void;
}

export const MenuHeader: React.FC<MenuHeaderProps> = ({ onMenuPress }) => {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <GradientBox style={styles.container}>
        <View style={[styles.titleRow, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
            <MaterialIcons name="menu" size={26} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Menu Management</Text>
            <Text style={styles.subtitle}>Configure daily Lunch/Dinner menus</Text>
          </View>
        </View>
      </GradientBox>
    </>
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
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
});

export default MenuHeader;
