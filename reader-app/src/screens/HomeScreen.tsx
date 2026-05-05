import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LiquidScreen } from '../components/ui/LiquidScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { Chip } from '../components/ui/Chip';
import { textStyles } from '../theme/typography';
import { colors } from '../theme/colors';
import {
  fetchFeedRecent,
  fetchFeedTopRated,
  fetchContinueReading,
  type FeedStoryCard,
  type ContinueReadingSession,
} from '../api';
import { useAuth } from '../context/AuthContext';

type Props = {
  navigation: any;
};

type FeedTab = 'recent' | 'top';

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { readerId } = useAuth();
  const [tab, setTab] = useState<FeedTab>('recent');
  const [recent, setRecent] = useState<FeedStoryCard[]>([]);
  const [topRated, setTopRated] = useState<FeedStoryCard[]>([]);
  const [continueRows, setContinueRows] = useState<ContinueReadingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [r, t] = await Promise.all([fetchFeedRecent(40), fetchFeedTopRated(40)]);
      setRecent(r);
      setTopRated(t);
      if (readerId) {
        try {
          const cr = await fetchContinueReading(readerId, true);
          setContinueRows(cr);
        } catch {
          setContinueRows([]);
        }
      } else {
        setContinueRows([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [readerId]);

  useEffect(() => {
    load();
  }, [load]);

  const list = tab === 'recent' ? recent : topRated;
  const featured = topRated[0] ?? recent[0];
  const rest = list.filter((s) => !featured || s.id !== featured.id);

  return (
    <LiquidScreen>
      <View style={styles.topBar}>
        <Text style={[textStyles.headline, styles.brand]}>Discover</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Library')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.savedLink}>Liked</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <Text style={textStyles.label}>Tonight&apos;s feature</Text>
        <Text style={[textStyles.displayLg, styles.title]}>
          The city remembers every decision you never made.
        </Text>
        <Text style={[textStyles.body, styles.subtitle]}>
          Slip back into your branching narrative. We&apos;ll pick up from the stories that are
          already glowing.
        </Text>
      </View>

      {readerId && continueRows.length > 0 && (
        <View style={styles.section}>
          <Text style={[textStyles.titleSm, styles.sectionTitle]}>Continue reading</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {continueRows.map((row) => (
              <TouchableOpacity
                key={row.id}
                onPress={() =>
                  navigation.navigate('Episode', {
                    storyId: row.episode.story.id,
                    episodeId: row.episodeId,
                    episodeTitle: row.episode.title,
                    storyTitle: row.episode.story.title,
                  })
                }
                style={styles.continueCard}
              >
                <GlassCard>
                  <Text style={textStyles.meta} numberOfLines={1}>
                    {row.episode.story.title}
                  </Text>
                  <Text style={[textStyles.bodySm, styles.continueEp]} numberOfLines={2}>
                    {row.episode.title}
                  </Text>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.tabRow}>
        <Chip label="Recent" selected={tab === 'recent'} onPress={() => setTab('recent')} />
        <Chip label="Top rated" selected={tab === 'top'} onPress={() => setTab('top')} />
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading stories…</Text>
        </View>
      )}

      {error && !loading && <Text style={styles.error}>{error}</Text>}

      {featured && (
        <GlassCard elevated style={styles.card}>
          <Text style={textStyles.title}>Featured story</Text>
          <Text style={[textStyles.bodySm, styles.meta]}>
            By {featured.author}
            {typeof featured.thumbsUpCount === 'number' ? ` · ${featured.thumbsUpCount} likes` : ''}
          </Text>
          <Text style={[textStyles.body, styles.featureTitle]}>{featured.title}</Text>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate('EpisodeList', {
                storyId: featured.id,
                storyTitle: featured.title,
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
          scrollEnabled={false}
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
                  {typeof item.thumbsUpCount === 'number' ? ` · ${item.thumbsUpCount} likes` : ''}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brand: {
    fontSize: 22,
  },
  savedLink: {
    ...textStyles.bodySm,
    color: colors.secondary,
    fontFamily: 'Inter-SemiBold',
  },
  hero: {
    marginTop: 4,
    marginBottom: 16,
  },
  title: {
    marginTop: 4,
  },
  subtitle: {
    marginTop: 10,
    color: colors.onSurfaceVariant,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  continueCard: {
    width: 200,
    marginRight: 12,
  },
  continueEp: {
    marginTop: 6,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
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
