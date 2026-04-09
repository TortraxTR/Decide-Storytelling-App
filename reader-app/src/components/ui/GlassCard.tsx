import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

type Props = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  elevated?: boolean;
};

export const GlassCard: React.FC<Props> = ({ children, style, elevated }) => {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        Array.isArray(style) ? style : [style],
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(70, 69, 84, 0.15)', // ghost border
    overflow: 'hidden',
  },
  elevated: {
    backgroundColor: colors.surfaceContainerHigh,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    elevation: 10,
  },
});