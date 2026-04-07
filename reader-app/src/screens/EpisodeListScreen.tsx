import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchStory } from '../api';

type Episode = {
  id: string;
  title: string;
  summary?: string;
  publishedAt?: string;
};

type EpisodeListScreenProps = {
  navigation: any;
  route: {
    params?: {
      storyId?: string;
      storyTitle?: string;
    };
  };
};

const EpisodeListScreen: React.FC<EpisodeListScreenProps> = ({ navigation, route }) => {
  const storyId = route?.params?.storyId ?? '';
  const storyTitle = route?.params?.storyTitle ?? 'Story';

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEpisodes = useCallback(async () => {
    if (!storyId) {
      setError('Story ID is missing');
      setEpisodes([]);
      return;
    }

    try {
      setError(null);
      const story = await fetchStory(storyId);
      
      const episodeList: Episode[] = (story.episodes || []).map((ep: any) => ({
        id: ep.id,
        title: ep.title,
        summary: ep.summary,
        publishedAt: ep.publishedAt,
      }));
      
      setEpisodes(episodeList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load episodes';
      setError(errorMessage);
      setEpisodes([]);
    }
  }, [storyId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchEpisodes();
      setLoading(false);
    };
    load();
  }, [fetchEpisodes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEpisodes();
    setRefreshing(false);
  }, [fetchEpisodes]);

  const openEpisode = (episode: Episode) => {
    navigation.navigate('StoryScreen', {
      storyId,
      episodeId: episode.id,
      episodeTitle: episode.title,
    });
  };

  const renderItem: ListRenderItem<Episode> = ({ item }) => (
    <Pressable style={styles.card} onPress={() => openEpisode(item)}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      {!!item.summary && <Text style={styles.cardSummary}>{item.summary}</Text>}
      {!!item.publishedAt && <Text style={styles.cardDate}>Published: {item.publishedAt}</Text>}
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{storyTitle}</Text>
        <Text style={styles.subtitle}>Episodes</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#C7D2FE" />
          <Text style={styles.loadingText}>Loading episodes...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={episodes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={episodes.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No episodes found for this story.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1020' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { color: '#F5F7FF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#98A2B3', fontSize: 14, marginTop: 4 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#C7D2FE', marginTop: 6 },
  errorText: { color: '#FF6B6B', fontSize: 15, textAlign: 'center', paddingHorizontal: 20 },
  retryButton: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#2E3A66', borderRadius: 8 },
  retryText: { color: '#C7D2FE', fontWeight: '600' },

  listContent: { padding: 16, gap: 12 },
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: '#98A2B3', fontSize: 15, textAlign: 'center' },

  card: {
    backgroundColor: '#111833',
    borderColor: '#1F2A4D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  cardTitle: { color: '#EEF2FF', fontSize: 17, fontWeight: '600' },
  cardSummary: { color: '#B4C0E0', marginTop: 6, lineHeight: 20 },
  cardDate: { color: '#8FA2D8', marginTop: 10, fontSize: 12 },
});

export default EpisodeListScreen;