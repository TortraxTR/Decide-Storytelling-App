import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';

import {
  fetchStory,
  fetchEpisodeNodes,
  fetchNodeMediaUrl,
  fetchDecisionsForNode,
  getReaderByUserId,
  createReader,
  createOrResumeSession,
  advanceSession,
} from '../api';

const { width } = Dimensions.get('window');

type Node = { id: string; assetKey: string; isStart: boolean; isEnd: boolean };
type Decision = { id: string; text: string; sourceNodeId: string; targetNodeId: string };

export default function EpisodeScreen({ route }: any) {
  const { storyId, episodeId: selectedEpisodeId, title, userId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState('');

  const [episodeId, setEpisodeId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [currentNode, setCurrentNode] = useState<Node | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [decisions, setDecisions] = useState<Decision[]>([]);

  const loadNodeContent = useCallback(async (node: Node, epId: string) => {
    const [url, decisionList] = await Promise.all([
      fetchNodeMediaUrl(node.id),
      node.isEnd ? Promise.resolve([]) : fetchDecisionsForNode(epId, node.id),
    ]);
    setMediaUrl(url);
    setDecisions(decisionList);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError('');

        let targetEpisodeId = selectedEpisodeId;

        // Fallback for old navigation paths that only pass storyId
        if (!targetEpisodeId) {
          const story = await fetchStory(storyId);
          if (!story.episodes || story.episodes.length === 0) {
            setError('This story has no episodes yet.');
            return;
          }
          const firstEpisode = story.episodes.sort((a, b) => a.order - b.order)[0];
          targetEpisodeId = firstEpisode.id;
        }

        setEpisodeId(targetEpisodeId);

        const nodes = await fetchEpisodeNodes(targetEpisodeId);
        const startNode = nodes.find(n => n.isStart);
        if (!startNode) {
          setError('Episode has no start node.');
          return;
        }

        let readerId: string | null = null;
        if (userId) {
          const readers = await getReaderByUserId(userId);
          if (readers.length > 0) {
            readerId = readers[0].id;
          } else {
            const newReader = await createReader(userId);
            readerId = newReader.id;
          }
        }

        if (readerId) {
          const session = await createOrResumeSession(readerId, targetEpisodeId, startNode.id);
          setSessionId(session.id);
          const resumedNode = nodes.find(n => n.id === session.currentNodeId) ?? startNode;
          setCurrentNode(resumedNode);
          await loadNodeContent(resumedNode, targetEpisodeId);
        } else {
          // Guest mode: show start node without session tracking
          setCurrentNode(startNode);
          await loadNodeContent(startNode, targetEpisodeId);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load story');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [storyId, selectedEpisodeId, userId, loadNodeContent]);

  const handleDecision = async (decisionId: string) => {
    if (!sessionId || advancing) return;
    try {
      setAdvancing(true);
      const result = await advanceSession(sessionId, decisionId);
      const nextNode = result.currentNode;
      setCurrentNode(nextNode);
      await loadNodeContent(nextNode, episodeId);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to advance story');
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#BB86FC" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {mediaUrl ? (
          <Image source={{ uri: mediaUrl }} style={styles.panelImage} resizeMode="cover" />
        ) : (
          <View style={[styles.panelImage, styles.imagePlaceholder]}>
            <ActivityIndicator color="#BB86FC" />
          </View>
        )}

        {currentNode?.isEnd && (
          <View style={styles.endContainer}>
            <Text style={styles.endText}>— The End —</Text>
          </View>
        )}

        {!currentNode?.isEnd && decisions.length > 0 && (
          <View style={styles.decisionContainer}>
            <Text style={styles.decisionPrompt}>What do you do?</Text>
            {decisions.map(d => (
              <TouchableOpacity
                key={d.id}
                style={[styles.decisionButton, advancing && styles.decisionButtonDisabled]}
                onPress={() => handleDecision(d.id)}
                disabled={advancing}
              >
                {advancing ? (
                  <ActivityIndicator color="#121212" />
                ) : (
                  <Text style={styles.decisionButtonText}>{d.text}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!currentNode?.isEnd && decisions.length === 0 && !loading && (
          <View style={styles.decisionContainer}>
            <Text style={styles.decisionPrompt}>No paths forward from here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 15,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    alignItems: 'center',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingBottom: 40 },
  panelImage: {
    width: width,
    height: width * 1.33,
    backgroundColor: '#1E1E1E',
  },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  decisionContainer: {
    padding: 20,
    backgroundColor: '#1E1E1E',
    marginTop: 10,
    alignItems: 'center',
  },
  decisionPrompt: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  decisionButton: {
    backgroundColor: '#BB86FC',
    width: '80%',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  decisionButtonDisabled: { opacity: 0.6 },
  decisionButtonText: { color: '#121212', fontSize: 16, fontWeight: 'bold' },
  endContainer: { padding: 40, alignItems: 'center' },
  endText: { color: '#BB86FC', fontSize: 20, fontWeight: 'bold', fontStyle: 'italic' },
  errorText: { color: '#FF6B6B', fontSize: 16, textAlign: 'center', margin: 20 },
});
