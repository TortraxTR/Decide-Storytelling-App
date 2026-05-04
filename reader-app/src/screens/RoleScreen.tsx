import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LiquidScreen } from '../components/ui/LiquidScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { Chip } from '../components/ui/Chip';
import { textStyles } from '../theme/typography';
import type { Role } from '../context/AuthContext';

type Props = {
  navigation: any;
};

const RoleScreen: React.FC<Props> = ({ navigation }) => {
  const [role, setRole] = useState<Role>('reader');

  const handleContinue = () => {
    navigation.navigate('AuthChoice', { role });
  };

  return (
    <LiquidScreen>
      <View style={styles.hero}>
        <Text style={textStyles.label}>Choose your vantage point</Text>
        <Text style={[textStyles.displayLg, styles.title]}>
          Are you in the crowd or behind the curtain?
        </Text>
      </View>

      <GlassCard elevated style={styles.card}>
        <Text style={textStyles.body}>
          Decide how you step into Decide. You can switch roles later, but
          we&apos;ll tune the experience from this first choice.
        </Text>

        <View style={styles.chips}>
          <Chip
            label="Immersive Reader"
            selected={role === 'reader'}
            onPress={() => setRole('reader')}
          />
          <Chip
            label="Story Author"
            selected={role === 'author'}
            onPress={() => setRole('author')}
          />
        </View>

        <GradientButton
          label="Continue"
          onPress={handleContinue}
          style={styles.btn}
        />
      </GlassCard>
    </LiquidScreen>
  );
};

const styles = StyleSheet.create({
  hero: {
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    marginTop: 6,
  },
  card: {
    marginBottom: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 18,
  },
  btn: {
    marginTop: 20,
    width: '100%',
  },
});

export default RoleScreen;