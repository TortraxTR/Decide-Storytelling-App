import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LiquidScreen } from '../components/ui/LiquidScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { textStyles } from '../theme/typography';
import { colors } from '../theme/colors';
import { fetchStory } from '../api';

type Episode = {
  id: string;
  title: string;
  order: number;
};

type Props = {
  navigation: any;
  route: { params: { storyId: string; storyTitle: string } };
};

const EpisodeListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { storyId, storyTitle } = route.params;

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        const story = await fetchStory(storyId);
        if (!cancelled) {
          const sorted = [...story.episodes].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0),
          );
          setEpisodes(sorted);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load episodes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  return (
    <LiquidScreen>
      <View style={styles.hero}>
        <Text style={textStyles.label}>Episodes</Text>
        <Text style={[textStyles.headline, styles.title]}>{storyTitle}</Text>
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Fetching episodes…</Text>
        </View>
      )}

      {error && !loading && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={episodes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Episode', {
                episodeId: item.id,
                episodeTitle: item.title,
                storyTitle,
              })
            }
            style={styles.itemWrapper}
          >
            <GlassCard elevated>
              <Text style={textStyles.meta}>Episode {item.order}</Text>
              <Text style={[textStyles.title, styles.episodeTitle]}>
                {item.title}
              </Text>
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
    marginBottom: 14,
  },
  episodeTitle: {
    marginTop: 4,
  },
});

export default EpisodeListScreen;