import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LiquidScreen } from '../components/ui/LiquidScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { textStyles } from '../theme/typography';
import { colors } from '../theme/colors';

type Props = {
  navigation: any;
};

const AuthorDashboardScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <LiquidScreen>
      <View style={styles.hero}>
        <Text style={textStyles.label}>Author space</Text>
        <Text style={[textStyles.displayLg, styles.title]}>
          Craft your worlds on the web.
        </Text>
      </View>

      <GlassCard elevated style={styles.card}>
        <Text style={textStyles.body}>
          The Decide mobile app is an immersive reader for branching stories.
          To create new tales, design narrative graphs, and upload
          high‑resolution artwork, visit the Decide author dashboard from
          your desktop browser.
        </Text>

        <Text style={[textStyles.meta, styles.meta]}>
          Use the same account you signed in with here. Your published stories
          will appear automatically for readers.
        </Text>

        <GradientButton
          label="Back to main menu"
          onPress={() => navigation.navigate('RoleSelection')}
          style={styles.button}
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
    marginBottom: 24,
  },
  meta: {
    marginTop: 12,
    color: colors.onSurfaceVariant,
  },
  button: {
    marginTop: 24,
    width: '100%',
  },
});

export default AuthorDashboardScreen;