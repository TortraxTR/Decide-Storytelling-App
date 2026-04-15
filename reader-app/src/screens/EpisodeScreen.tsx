import React, { useState, useEffect, useCallback } from 'react';
import { CommonActions } from '@react-navigation/native';
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
  deleteSession,
} from '../api';

const { width } = Dimensions.get('window');

type Node = { id: string; assetKey: string; isStart: boolean; isEnd: boolean };
type Decision = { id: string; text: string; sourceNodeId: string; targetNodeId: string };
type PanelEntry = { node: Node; mediaUrl: string };

export default function EpisodeScreen({ route, navigation }: any) {
  const { storyId, episodeId: selectedEpisodeId, title, userId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState('');

  const [episodeId, setEpisodeId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [readerId, setReaderId] = useState('');
  const [startNode, setStartNode] = useState<Node | null>(null);
  const [currentNode, setCurrentNode] = useState<Node | null>(null);
  const [panelEntries, setPanelEntries] = useState<PanelEntry[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);

  const resolveLinearSequence = useCallback(async (
    startNode: Node,
    epId: string,
    activeSessionId: string | null,
    nodeIndex: Map<string, Node>,
  ) => {
    const panels: PanelEntry[] = [];
    let node = startNode;
    let decisionList: Decision[] = [];

    for (let safety = 0; safety < 50; safety += 1) {
      const [url, nextDecisions] = await Promise.all([
        fetchNodeMediaUrl(node.id),
        node.isEnd ? Promise.resolve([]) : fetchDecisionsForNode(epId, node.id),
      ]);

      panels.push({ node, mediaUrl: url });
      decisionList = nextDecisions;

      if (node.isEnd || nextDecisions.length !== 1) {
        return { panels, terminalNode: node, terminalDecisions: nextDecisions };
      }

      const onlyDecision = nextDecisions[0];

      if (activeSessionId) {
        const result = await advanceSession(activeSessionId, onlyDecision.id);
        node = result.currentNode;
      } else {
        const nextNode = nodeIndex.get(onlyDecision.targetNodeId);
        if (!nextNode) {
          throw new Error('Story path is incomplete.');
        }
        node = nextNode;
      }
    }

    throw new Error('Story path is too deep to resolve.');
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
        const nodeIndex = new Map(nodes.map((node) => [node.id, node]));
        const startNode = nodes.find(n => n.isStart);
        if (!startNode) {
          setError('Episode has no start node.');
          return;
        }
        setStartNode(startNode);

        let readerId: string | null = null;
        if (userId) {
          const readers = await getReaderByUserId(userId);
          if (readers.length > 0) {
            readerId = readers[0].id;
          } else {
            const newReader = await createReader(userId);
            readerId = newReader.id;
          }
          setReaderId(readerId);
        }

        if (readerId) {
          const session = await createOrResumeSession(readerId, targetEpisodeId, startNode.id);
          setSessionId(session.id);
          const resumedNode = nodes.find(n => n.id === session.currentNodeId) ?? startNode;
          const resolved = await resolveLinearSequence(resumedNode, targetEpisodeId, session.id, nodeIndex);
          setCurrentNode(resolved.terminalNode);
          setPanelEntries(resolved.panels);
          setDecisions(resolved.terminalDecisions);
        } else {
          // Guest mode: show start node without session tracking
          const resolved = await resolveLinearSequence(startNode, targetEpisodeId, null, nodeIndex);
          setCurrentNode(resolved.terminalNode);
          setPanelEntries(resolved.panels);
          setDecisions(resolved.terminalDecisions);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load story');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [storyId, selectedEpisodeId, userId, resolveLinearSequence]);

  const handleDecision = async (decisionId: string) => {
    if (!sessionId || advancing) return;
    try {
      setAdvancing(true);
      const result = await advanceSession(sessionId, decisionId);
      const nextNode = result.currentNode;
      const nodes = await fetchEpisodeNodes(episodeId);
      const nodeIndex = new Map(nodes.map((node) => [node.id, node]));
      const resolved = await resolveLinearSequence(nextNode, episodeId, sessionId, nodeIndex);
      setCurrentNode(resolved.terminalNode);
      setPanelEntries(resolved.panels);
      setDecisions(resolved.terminalDecisions);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to advance story');
    } finally {
      setAdvancing(false);
    }
  };

  const handleRestart = async () => {
    if (!startNode || !episodeId || advancing) return;

    try {
      setAdvancing(true);
      setError('');

      const nodes = await fetchEpisodeNodes(episodeId);
      const nodeIndex = new Map(nodes.map((node) => [node.id, node]));
      const freshStartNode = nodes.find((node) => node.isStart) ?? startNode;
      setStartNode(freshStartNode);

      if (sessionId) {
        await deleteSession(sessionId);
      }

      if (readerId) {
        const session = await createOrResumeSession(readerId, episodeId, freshStartNode.id);
        setSessionId(session.id);
        const resumedNode = nodeIndex.get(session.currentNodeId) ?? freshStartNode;
        const resolved = await resolveLinearSequence(resumedNode, episodeId, session.id, nodeIndex);
        setCurrentNode(resolved.terminalNode);
        setPanelEntries(resolved.panels);
        setDecisions(resolved.terminalDecisions);
      } else {
        setSessionId('');
        const resolved = await resolveLinearSequence(freshStartNode, episodeId, null, nodeIndex);
        setCurrentNode(resolved.terminalNode);
        setPanelEntries(resolved.panels);
        setDecisions(resolved.terminalDecisions);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to restart story');
    } finally {
      setAdvancing(false);
    }
  };

  const handleQuit = () => {
    if (storyId) {
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: 'Home', params: { userId } },
            {
              name: 'EpisodeList',
              params: {
                storyId,
                storyTitle: title,
                userId,
              },
            },
          ],
        }),
      );
      return;
    }

    navigation.goBack();
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
        {panelEntries.length > 0 ? (
          panelEntries.map((panel, index) => (
            <Image
              key={`${panel.node.id}-${index}`}
              source={{ uri: panel.mediaUrl }}
              style={styles.panelImage}
              resizeMode="cover"
            />
          ))
        ) : (
          <View style={[styles.panelImage, styles.imagePlaceholder]}>
            <ActivityIndicator color="#BB86FC" />
          </View>
        )}

        {currentNode?.isEnd && (
          <View style={styles.endContainer}>
            <Text style={styles.endText}>— The End —</Text>
            <View style={styles.endActions}>
              <TouchableOpacity
                style={[styles.endSecondaryButton, advancing && styles.decisionButtonDisabled]}
                onPress={handleQuit}
                disabled={advancing}
              >
                <Text style={styles.endSecondaryButtonText}>Quit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.restartButton, advancing && styles.decisionButtonDisabled]}
                onPress={handleRestart}
                disabled={advancing}
              >
                {advancing ? (
                  <ActivityIndicator color="#121212" />
                ) : (
                  <Text style={styles.restartButtonText}>Restart Story</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!currentNode?.isEnd && decisions.length > 1 && (
          <View style={styles.decisionContainer}>
            <Text style={styles.decisionPrompt}>What do you do?</Text>
            {decisions.map((d, index) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.decisionButton, advancing && styles.decisionButtonDisabled]}
                onPress={() => handleDecision(d.id)}
                disabled={advancing}
              >
                {advancing ? (
                  <ActivityIndicator color="#121212" />
                ) : (
                  <Text style={styles.decisionButtonText}>{d.text?.trim() || `Option ${index + 1}`}</Text>
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
  endActions: {
    marginTop: 24,
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  restartButton: {
    backgroundColor: '#BB86FC',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restartButtonText: { color: '#121212', fontSize: 16, fontWeight: 'bold' },
  endSecondaryButton: {
    backgroundColor: '#2B2B33',
    borderWidth: 1,
    borderColor: '#4B4B58',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endSecondaryButtonText: { color: '#F4F4F5', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#FF6B6B', fontSize: 16, textAlign: 'center', margin: 20 },
});
