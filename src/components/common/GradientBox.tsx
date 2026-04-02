import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle, LayoutChangeEvent } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors } from '../../theme/colors';

interface GradientBoxProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

export const GradientBox: React.FC<GradientBoxProps> = ({ children, style }) => {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
  };

  return (
    <View style={[{ overflow: 'hidden', backgroundColor: colors.headerGradientStart }, style]} onLayout={onLayout}>
      {layout.width > 0 && layout.height > 0 && (
        <Svg
          width={layout.width}
          height={layout.height}
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <LinearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.headerGradientStart} />
              <Stop offset="1" stopColor={colors.headerGradientEnd} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={layout.width} height={layout.height} fill="url(#headerGrad)" />
        </Svg>
      )}
      {children}
    </View>
  );
};
