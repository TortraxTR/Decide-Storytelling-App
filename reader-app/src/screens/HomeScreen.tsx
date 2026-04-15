import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { fetchStories } from '../api';

export default function HomeScreen({ route, navigation }: any) {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { userId } = route.params || {};
  useEffect(() => {
    const loadStories = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchStories();
        setStories(data);
      } catch (err) {
        setStories([]);
        setError(err instanceof Error ? err.message : 'Failed to load stories');
      } finally {
        setLoading(false);
      }
    };
    loadStories();
  }, []);

  const renderStoryCard = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openStoryEpisodes(item)}
    >
      <Image source={{ uri: item.coverImage }} style={styles.coverImage} />
      <Text style={styles.storyTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.storyAuthor} numberOfLines={1}>{item.author}</Text>
    </TouchableOpacity>
  );

  const openStoryEpisodes = (story: { id: string; title: string }) => {
    navigation.navigate('EpisodeList', {
      storyId: story.id,
      storyTitle: story.title,
      userId,
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#BB86FC" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Explore</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Stories</Text>
        {stories.length === 0 ? (
          <Text style={styles.emptyText}>No published stories available right now.</Text>
        ) : (
          <FlatList
            data={stories}
            renderItem={renderStoryCard}
            keyExtractor={(item) => item.id}
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#BB86FC', fontSize: 32, fontWeight: 'bold', margin: 20, marginTop: 40 },
  section: { marginBottom: 30 },
  sectionTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  listContainer: { paddingLeft: 20 },
  errorText: { color: '#FF8FA3', fontSize: 14, marginHorizontal: 20, marginBottom: 14 },
  emptyText: { color: '#AAAAAA', fontSize: 15, marginHorizontal: 20 },
  card: { marginRight: 15, width: 140 },
  coverImage: { width: 140, height: 200, borderRadius: 10, marginBottom: 10, backgroundColor: '#333' },
  storyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  storyAuthor: { color: '#AAAAAA', fontSize: 14, marginTop: 2 },
});
