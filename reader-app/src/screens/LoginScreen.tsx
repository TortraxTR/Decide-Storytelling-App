import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LiquidScreen } from '../components/ui/LiquidScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientButton } from '../components/ui/GradientButton';
import { TextField } from '../components/ui/TextField';
import { textStyles } from '../theme/typography';
import { colors } from '../theme/colors';
import { login, getReaderByUserId, createReader } from '../api';
import { useAuth, Role } from '../context/AuthContext';

type Props = {
  navigation: any;
  route: { params?: { role?: Role } };
};

const LoginScreen: React.FC<Props> = ({ navigation, route }) => {
  const { setAuth } = useAuth();
  const role: Role = route.params?.role ?? 'reader';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const apiRole = role === 'author' ? 'Author' : 'Reader';
      const { user_id } = await login(email.trim(), password, apiRole);

      if (role === 'reader') {
        const readers = await getReaderByUserId(user_id);
        let readerId: string;

        if (readers.length > 0) {
          readerId = readers[0].id;
        } else {
          const created = await createReader(user_id);
          readerId = created.id;
        }

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
      setError(e?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LiquidScreen>
      <View style={styles.hero}>
        <Text style={textStyles.label}>Sign in</Text>
        <Text style={[textStyles.headline, styles.title]}>
          Continue your unfinished chapter.
        </Text>
      </View>

      <GlassCard elevated style={styles.card}>
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
          label={submitting ? 'Entering…' : 'Enter the story'}
          onPress={handleSubmit}
          style={styles.btn}
          disabled={submitting}
        />

        {submitting && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.loadingText}>Talking to the narrator…</Text>
          </View>
        )}

        <TouchableOpacity onPress={() => {}} style={styles.tertiary}>
          <Text style={[textStyles.bodySm, styles.tertiaryText]}>
            Forgot your password?
          </Text>
        </TouchableOpacity>
      </GlassCard>

      <TouchableOpacity
        onPress={() => navigation.navigate('Register', { role })}
      >
        <Text style={[textStyles.bodySm, styles.switchText]}>
          New here?{' '}
          <Text style={{ color: colors.secondary }}>Create an account</Text>
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
  tertiary: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  tertiaryText: {
    color: colors.secondary,
  },
  switchText: {
    textAlign: 'center',
    marginTop: 8,
    color: colors.onSurfaceVariant,
  },
});

export default LoginScreen;
