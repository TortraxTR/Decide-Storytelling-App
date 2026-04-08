import React from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../theme/colors';

type Props = {
  progress: number; // 0–1
};

export const StoryProgressBar: React.FC<Props> = ({ progress }) => {
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={styles.track}>
      <LinearGradient
        colors={[colors.secondary, colors.primary]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.fill, { width: `${clamped * 100}%` }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(70, 69, 84, 0.6)',
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 999,
  },
});