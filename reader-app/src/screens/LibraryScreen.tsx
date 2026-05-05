import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LiquidScreen } from '../components/ui/LiquidScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { textStyles } from '../theme/typography';
import { colors } from '../theme/colors';
import { fetchFavorites } from '../api';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

type Props = {
  navigation: any;
};

type FavRow = {
  id: string;
  storyId: string;
  title: string;
  author: string;
};

const LibraryScreen: React.FC<Props> = ({ navigation }) => {
  const { readerId } = useAuth();
  const [items, setItems] = useState<FavRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!readerId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const raw = await fetchFavorites(readerId);
      setItems(
        raw.map((f) => ({
          id: f.id,
          storyId: f.story.id,
          title: f.story.title,
          author: f.story.author?.user?.username || 'Unknown Author',
        })),
      );
    } catch (e: any) {
      setError(e?.message || 'Could not load saved stories');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [readerId]);

  //useEffect(() => {
   // load();
  //}, [load]);
  useFocusEffect(
  useCallback(() => {
    load();
  }, [load])
);

  if (!readerId) {
    return (
      <LiquidScreen>
        <Text style={styles.muted}>Sign in as a reader to see saved stories.</Text>
      </LiquidScreen>
    );
  }

  return (
    <LiquidScreen>
      <View style={styles.hero}>
        <Text style={textStyles.label}>Library</Text>
        <Text style={[textStyles.headline, styles.title]}>Saved stories</Text>
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      )}

      {error && !loading && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.muted}>No saved stories yet. Tap ♡ on a story while reading.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('EpisodeList', {
                storyId: item.storyId,
                storyTitle: item.title,
              })
            }
            style={styles.itemWrapper}
          >
            <GlassCard elevated>
              <Text style={textStyles.titleSm}>{item.title}</Text>
              <Text style={[textStyles.meta, styles.meta]}>By {item.author}</Text>
            </GlassCard>
          </TouchableOpacity>
        )}
      />
    </LiquidScreen>
  );
};

const styles = StyleSheet.create({
  hero: {
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    marginTop: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    ...textStyles.meta,
    color: colors.onSurfaceVariant,
  },
  error: {
    ...textStyles.bodySm,
    color: '#ff4d6a',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 32,
  },
  itemWrapper: {
    marginBottom: 12,
  },
  meta: {
    marginTop: 4,
    color: colors.onSurfaceVariant,
  },
  muted: {
    ...textStyles.body,
    color: colors.onSurfaceVariant,
  },
});

export default LibraryScreen;
