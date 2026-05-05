import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LiquidScreen } from '../components/ui/LiquidScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { TextField } from '../components/ui/TextField';
import { textStyles } from '../theme/typography';
import { colors } from '../theme/colors';
import { register, ensureReader } from '../api';
import { useAuth, Role } from '../context/AuthContext';

type Props = {
  navigation: any;
  route: { params?: { role?: Role } };
};

const RegisterScreen: React.FC<Props> = ({ navigation, route }) => {
  const { setAuth } = useAuth();
  const role: Role = route.params?.role ?? 'reader';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const { user_id } = await register(
        email.trim(),
        password,
        name.trim(),
        role,
      );

      if (role === 'reader') {
        const { id: readerId } = await ensureReader(user_id);
        setAuth({ userId: user_id, readerId, role: 'reader' });
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        setAuth({ userId: user_id, readerId: null, role: 'author' });
        navigation.reset({
          index: 0,
          routes: [{ name: 'AuthorDashboard' }],
        });
      }
    } catch (e: any) {
      setError(e?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LiquidScreen>
      <View style={styles.hero}>
        <Text style={textStyles.label}>Create profile</Text>
        <Text style={[textStyles.headline, styles.title]}>
          Claim your seat in the audience—or on stage.
        </Text>
      </View>

      <GlassCard elevated style={styles.card}>
        <TextField
          label="Display name"
          value={name}
          onChangeText={setName}
        />
        <TextField
          label="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          label="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <GradientButton
          label={submitting ? 'Opening the doors…' : 'Begin the story'}
          onPress={handleSubmit}
          style={styles.btn}
          disabled={submitting}
        />

        {submitting && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.loadingText}>Configuring your storyline…</Text>
          </View>
        )}
      </GlassCard>

      <TouchableOpacity
        onPress={() => navigation.navigate('Login', { role })}
      >
        <Text style={[textStyles.bodySm, styles.switchText]}>
          Already have an account?{' '}
          <Text style={{ color: colors.secondary }}>Sign in</Text>
        </Text>
      </TouchableOpacity>
    </LiquidScreen>
  );
};

const styles = StyleSheet.create({
  hero: {
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
  },
  btn: {
    marginTop: 16,
    width: '100%',
  },
  error: {
    marginTop: 8,
    color: '#ff4d6a',
    ...textStyles.bodySm,
  },
  loadingRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    ...textStyles.meta,
    color: colors.onSurfaceVariant,
  },
  switchText: {
    textAlign: 'center',
    marginTop: 8,
    color: colors.onSurfaceVariant,
  },
});

export default RegisterScreen;