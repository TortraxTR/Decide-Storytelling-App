import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';

type Props = {
  label: string;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
};

export const SecondaryButton: React.FC<Props> = ({ label, onPress, style }) => {
  return (
    <Pressable onPress={onPress} style={[styles.button, style]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(70, 69, 84, 0.15)',
  },
  label: {
    ...textStyles.titleSm,
    color: colors.onSurfaceVariant,
  },
});