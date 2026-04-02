import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets, Edge } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { GradientBox } from './GradientBox';

const PRIMARY_COLORS = [colors.primary, '#FE8733', '#FE8733'];

interface SafeAreaScreenProps {
    children: React.ReactNode;
    style?: ViewStyle;
    topBackgroundColor?: string;
    bottomBackgroundColor?: string;
    backgroundColor?: string;
    statusBarColor?: string;
    darkIcon?: boolean;
    useGradientTop?: boolean;
}

export const SafeAreaScreen: React.FC<SafeAreaScreenProps> = ({
    children,
    style,
    topBackgroundColor,
    bottomBackgroundColor,
    backgroundColor = colors.background,
    statusBarColor,
    darkIcon = false,
    useGradientTop,
}) => {
    const insets = useSafeAreaInsets();

    // effective colors
    const effectiveTopColor = topBackgroundColor || backgroundColor;
    const effectiveBottomColor = bottomBackgroundColor || backgroundColor;

    // Auto-detect gradient when top color is primary
    const shouldUseGradient = useGradientTop ?? PRIMARY_COLORS.includes(effectiveTopColor);

    return (
        <View style={[styles.container, style]}>
            <StatusBar
                backgroundColor={shouldUseGradient ? 'transparent' : (statusBarColor || effectiveTopColor)}
                barStyle={darkIcon ? 'dark-content' : 'light-content'}
                translucent={shouldUseGradient}
            />

            {/* Top Spacer - when gradient, transparent status bar lets gradient show through */}
            {shouldUseGradient ? (
                <GradientBox style={{ height: insets.top }} />
            ) : (
                <View style={{ height: insets.top, backgroundColor: effectiveTopColor }} />
            )}

            {/* Content */}
            <View style={[styles.content, { backgroundColor }]}>
                {children}
            </View>

            {/* Bottom Spacer */}
            {insets.bottom > 0 && (
                <View style={{ height: insets.bottom, backgroundColor: effectiveBottomColor }} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
});
