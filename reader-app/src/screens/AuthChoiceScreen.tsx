import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LiquidScreen } from '../components/ui/LiquidScreen';
import { GradientButton } from '../components/ui/GradientButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';
import { GlassCard } from '../components/ui/GlassCard';
import { textStyles } from '../theme/typography';
import { colors } from '../theme/colors';
import type { Role } from '../context/AuthContext';

type Props = {
  navigation: any;
  route: { params?: { role?: Role } };
};

const AuthChoiceScreen: React.FC<Props> = ({ navigation, route }) => {
  const role: Role = route.params?.role ?? 'reader';

  return (
    <LiquidScreen>
      <View style={styles.hero}>
        <Text style={textStyles.label}>Welcome back to the stage</Text>
        <Text style={[textStyles.displayLg, styles.title]}>
          Stories don&apos;t just live in books.
        </Text>
        <Text style={[textStyles.body, styles.subtitle]}>
          Step into the liquid glass chamber where every choice rewrites the
          narrative.
        </Text>
      </View>

      <GlassCard elevated style={styles.card}>
        <Text style={textStyles.title}>How would you like to enter?</Text>
        <View style={styles.actions}>
          <GradientButton
            label="I already have an account"
            onPress={() => navigation.navigate('Login', { role })}
            style={styles.btn}
          />
          <SecondaryButton
            label="Create a new profile"
            onPress={() => navigation.navigate('Register', { role })}
          />
        </View>
        <Text style={[textStyles.meta, styles.meta]}>
          You can always switch roles between Reader and Author later.
        </Text>
      </GlassCard>
    </LiquidScreen>
  );
};

const styles = StyleSheet.create({
  hero: {
    marginTop: 12,
    marginBottom: 24,
  },
  title: {
    marginTop: 6,
  },
  subtitle: {
    marginTop: 10,
    color: colors.onSurfaceVariant,
  },
  card: {
    marginBottom: 24,
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  btn: {
    width: '100%',
  },
  meta: {
    marginTop: 12,
  },
});

export default AuthChoiceScreen;