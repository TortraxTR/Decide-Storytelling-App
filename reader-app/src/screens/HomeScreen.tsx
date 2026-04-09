import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LiquidScreen } from '../components/ui/LiquidScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { textStyles } from '../theme/typography';
import { colors } from '../theme/colors';
import { fetchStories } from '../api';

type StoryCard = {
  id: string;
  title: string;
  author: string;
  coverImage: string;
};

type Props = {
  navigation: any;
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [stories, setStories] = useState<StoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        const data = await fetchStories();
        if (!cancelled) setStories(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load stories');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const feature = stories[0];
  const rest = stories.slice(1);

  return (
    <LiquidScreen>
      <View style={styles.hero}>
        <Text style={textStyles.label}>Tonight&apos;s feature</Text>
        <Text style={[textStyles.displayLg, styles.title]}>
          The city remembers every decision you never made.
        </Text>
        <Text style={[textStyles.body, styles.subtitle]}>
          Slip back into your branching narrative. We&apos;ll pick up from the
          stories that are already glowing.
        </Text>
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Fetching published stories…</Text>
        </View>
      )}

      {error && !loading && <Text style={styles.error}>{error}</Text>}

      {feature && (
        <GlassCard elevated style={styles.card}>
          <Text style={textStyles.title}>Featured story</Text>
          <Text style={[textStyles.bodySm, styles.meta]}>
            By {feature.author}
          </Text>
          <Text style={[textStyles.body, styles.featureTitle]}>
            {feature.title}
          </Text>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate('EpisodeList', {
                storyId: feature.id,
                storyTitle: feature.title,
              })
            }
            style={styles.primaryLink}
          >
            <Text style={styles.primaryLinkText}>View episodes</Text>
          </TouchableOpacity>
        </GlassCard>
      )}

      {rest.length > 0 && (
        <FlatList
          data={rest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('EpisodeList', {
                  storyId: item.id,
                  storyTitle: item.title,
                })
              }
              style={styles.itemWrapper}
            >
              <GlassCard>
                <Text style={textStyles.titleSm}>{item.title}</Text>
                <Text style={[textStyles.meta, styles.meta]}>
                  By {item.author}
                </Text>
              </GlassCard>
            </TouchableOpacity>
          )}
        />
      )}
    </LiquidScreen>
  );
};

const styles = StyleSheet.create({
  hero: {
    marginTop: 8,
    marginBottom: 22,
  },
  title: {
    marginTop: 4,
  },
  subtitle: {
    marginTop: 10,
    color: colors.onSurfaceVariant,
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
  card: {
    marginBottom: 18,
  },
  featureTitle: {
    marginTop: 8,
  },
  meta: {
    marginTop: 4,
    color: colors.onSurfaceVariant,
  },
  primaryLink: {
    marginTop: 14,
  },
  primaryLinkText: {
    ...textStyles.bodySm,
    color: colors.secondary,
  },
  listContent: {
    paddingBottom: 32,
  },
  itemWrapper: {
    marginBottom: 12,
  },
});

export default HomeScreen;
