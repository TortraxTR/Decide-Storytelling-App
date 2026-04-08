import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { textStyles } from '../../theme/typography';

type Props = TextInputProps & {
  label?: string;
  containerStyle?: ViewStyle | ViewStyle[];
};

export const TextField: React.FC<Props> = ({
  label,
  containerStyle,
  ...inputProps
}) => {
  return (
    <View
      style={[styles.container, Array.isArray(containerStyle) ? containerStyle : [containerStyle]]}
    >
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        <TextInput
          placeholderTextColor="rgba(199, 196, 215, 0.6)"
          {...inputProps}
          style={[styles.input, inputProps.style]}
        />
        <View style={styles.glow} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    ...textStyles.label,
    marginBottom: 6,
  },
  inputWrapper: {
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  input: {
    ...textStyles.body,
    padding: 0,
  },
  glow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -6,
    height: 10,
    backgroundColor: 'rgba(192, 193, 255, 0.25)',
    opacity: 0,
  },
});