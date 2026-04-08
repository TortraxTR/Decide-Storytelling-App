import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';

type Props = {
  label: string;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
};

export const GradientButton: React.FC<Props> = ({
  label,
  onPress,
  style,
  disabled,
}) => {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={style}>
      <LinearGradient
        colors={[colors.primary, colors.primaryContainer]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, disabled && styles.disabled]}
      >
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...textStyles.titleSm,
    color: '#07006c', // on_primary_fixed
    letterSpacing: 0.5,
    fontFamily: 'Inter-SemiBold',
  },
  disabled: {
    opacity: 0.5,
  },
});