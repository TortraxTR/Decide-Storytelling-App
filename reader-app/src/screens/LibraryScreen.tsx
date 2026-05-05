import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { LiquidScreen } from '../components/ui/LiquidScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { Chip } from '../components/ui/Chip';
import { textStyles } from '../theme/typography';
import { colors } from '../theme/colors';
import { fetchFavorites } from '../api';
import { useAuth } from '../context/AuthContext';

type Props = {
  navigation: any;
  route: any; // Parametreleri alabilmesi için route eklendi
};

type FavRow = {
  id: string;
  storyId: string;
  title: string;
  author: string;
};

const LibraryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { readerId } = useAuth();
  
  // Ana ekrandan gelen parametreyi okuyoruz (Yoksa varsayılan 'saved')
  const initialTab = route.params?.activeTab || 'saved';
  const [tab, setTab] = useState<'saved' | 'liked'>(initialTab);

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
      let raw: any[] = [];
      
      if (tab === 'saved') {
        raw = await fetchFavorites(readerId);
      } else {
        // LIKED SEKME MANTIĞI:
        // Şimdilik çökmemesi için boş liste dönüyor. 
        // Efe api.ts'ye "fetchLikedStories" fonksiyonunu eklediğinde burayı güncelleyeceğiz.
        raw = []; 
      }
      
      setItems(
        raw.map((f: any) => ({
          id: f.id,
          storyId: f.story?.id || f.storyId || '',
          title: f.story?.title || f.title || 'Untitled',
          author: f.story?.author?.user?.username || 'Unknown Author',
        })),
      );
    } catch (e: any) {
      setError(e?.message || `Could not load ${tab} stories`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [readerId, tab]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!readerId) {
    return (
      <LiquidScreen>
        <Text style={styles.muted}>Sign in as a reader to see your lists.</Text>
      </LiquidScreen>
    );
  }

  return (
    <LiquidScreen>
      <View style={styles.hero}>
        <Text style={textStyles.label}>Library</Text>
        <Text style={[textStyles.headline, styles.title]}>
          {tab === 'saved' ? 'Saved stories' : 'Liked stories'}
        </Text>
      </View>

      <View style={styles.tabRow}>
        <Chip label="Saved" selected={tab === 'saved'} onPress={() => setTab('saved')} />
        <Chip label="Liked" selected={tab === 'liked'} onPress={() => setTab('liked')} />
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
            <Text style={styles.muted}>
              {tab === 'saved' 
                ? 'No saved stories yet. Tap ♡ on a story while reading.' 
                : 'No liked stories yet. Tap 👍 on a story while reading.'}
            </Text>
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
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
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