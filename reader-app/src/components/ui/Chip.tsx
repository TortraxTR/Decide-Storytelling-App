import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
};

export const Chip: React.FC<Props> = ({ label, selected, onPress, style }) => {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected ? styles.selected : styles.unselected,
        style,
      ]}
    >
      <Text style={[textStyles.bodySm, selected && styles.selectedLabel]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  unselected: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  selected: {
    backgroundColor: colors.primaryContainer,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  selectedLabel: {
    color: '#07006c',
    fontFamily: 'Inter-SemiBold',
  },
});