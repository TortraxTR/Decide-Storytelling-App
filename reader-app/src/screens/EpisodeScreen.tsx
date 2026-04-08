import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchStory,
  fetchEpisodeNodes,
  fetchNodeMediaUrl,
  fetchDecisionsForNode,
  getReaderByUserId,
  createReader,
  createOrResumeSession,
  advanceSession,
  deleteSession
} from '../api';

const { width } = Dimensions.get('window');

type Node = { id: string; assetKey: string; isStart: boolean; isEnd: boolean };
type Decision = { id: string; text: string; sourceNodeId: string; targetNodeId: string };
type RenderNode = { node: Node; mediaUrl: string };


type HistoryItem = {
  id: string;
  renderNodes: RenderNode[]; // Peş peşe gelen resim dizisi
  tailNode: Node;            // Karar vereceğimiz veya biten son düğüm
  decisions: Decision[];     // Ekranda gösterilecek butonlar
  selectedDecision?: Decision; // Seçilen karar
};

export default function EpisodeScreen({ route }: any) {
  const { storyId, episodeId: selectedEpisodeId, title, userId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState('');

  const [episodeId, setEpisodeId] = useState('');
  const [sessionId, setSessionId] = useState('');

  //History state ve Scroll ref
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const episodeNodesByIdRef = useRef<Record<string, Node>>({});

  const endSessionIfNeeded = useCallback(async (node: Node, sid?: string) => {
    if (!sid || !node.isEnd) return;
    try {
      await deleteSession(sid);
    } catch {
      // Hata olsa da yoksayıyoruz
    } finally {
      setSessionId(prev => (prev === sid ? '' : prev));
    }
  }, []);

  //  History dizisine eklenmek üzere bir "paket" dönüyor
  const hydrateLinearPath = useCallback(
    async (startNode: Node, epId: string, sid?: string): Promise<HistoryItem> => {
      const visited = new Set<string>();
      const collected: RenderNode[] = [];

      let node: Node | undefined = startNode;
      let tailNode: Node = startNode;
      let tailDecisions: Decision[] = [];

      while (node && !visited.has(node.id)) {
        visited.add(node.id);

        const mediaUrl = await fetchNodeMediaUrl(node.id);
        collected.push({ node, mediaUrl });

        if (node.isEnd) {
          tailNode = node;
          tailDecisions = [];
          break;
        }

        const outgoing = await fetchDecisionsForNode(epId, node.id);

        // Eğer sadece 1 seçenek varsa (otomatik atlama mantığı)
        if (outgoing.length === 1) {
          const edge = outgoing[0];
          if (sid) {
            const advanced = await advanceSession(sid, edge.id);
            node = advanced.currentNode;
          } else {
            const target = episodeNodesByIdRef.current[edge.targetNodeId];
            if (!target) throw new Error('Next node could not be found.');
            node = target;
          }
          tailNode = node;
          continue;
        }

        // Birden fazla seçenek varsa dur ve kullanıcıya sor
        tailNode = node;
        tailDecisions = outgoing;
        break;
      }

      await endSessionIfNeeded(tailNode, sid);

      // Yeni bloğu geri döndür
      return {
        id: Date.now().toString() + tailNode.id,
        renderNodes: collected,
        tailNode: tailNode,
        decisions: tailDecisions,
      };
    },
    [endSessionIfNeeded]
  );

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError('');

        let targetEpisodeId = selectedEpisodeId;

        if (!targetEpisodeId) {
          const story = await fetchStory(storyId);
          if (!story.episodes || story.episodes.length === 0) {
            setError('This story has no episodes yet.');
            return;
          }
          const firstEpisode = story.episodes.sort((a: any, b: any) => a.order - b.order)[0];
          targetEpisodeId = firstEpisode.id;
        }

        setEpisodeId(targetEpisodeId);

        const nodes = await fetchEpisodeNodes(targetEpisodeId);
        const byId: Record<string, Node> = {};
        for (const n of nodes) byId[n.id] = n;
        episodeNodesByIdRef.current = byId;

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

        let firstBlock: HistoryItem;

        if (readerId) {
          const session = await createOrResumeSession(readerId, targetEpisodeId, startNode.id);
          setSessionId(session.id);
          const resumedNode = nodes.find(n => n.id === session.currentNodeId) ?? startNode;
          // İlk bloğu oluştur
          firstBlock = await hydrateLinearPath(resumedNode, targetEpisodeId, session.id);
        } else {
          // İlk bloğu oluştur (Misafir Modu)
          firstBlock = await hydrateLinearPath(startNode, targetEpisodeId);
        }

        // Geçmişe ekle
        setHistory([firstBlock]);

      } catch (e: any) {
        setError(e.message || 'Failed to load story');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [storyId, selectedEpisodeId, userId, hydrateLinearPath]);

  const handleDecision = async (decision: Decision, historyIndex: number) => {
    if (advancing) return;

    try {
      setAdvancing(true);

      //  WhatsApp balonunu oluştur (Geçmişe göm)
      setHistory((prev) => {
        const newHistory = [...prev];
        newHistory[historyIndex].selectedDecision = decision;
        return newHistory;
      });

      let nextNode: Node;

      // İlerletme mantığı
      if (sessionId) {
        const result = await advanceSession(sessionId, decision.id);
        nextNode = result.currentNode;
      } else {
        nextNode = episodeNodesByIdRef.current[decision.targetNodeId];
        if (!nextNode) throw new Error('Next node could not be found.');
      }

      // yeni resim dizisini çek ve geçmişin en altına ekle
      const nextBlock = await hydrateLinearPath(nextNode, episodeId, sessionId);
      setHistory((prev) => [...prev, nextBlock]);

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

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        // onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {history.map((item, index) => {
          const isLastItem = index === history.length - 1;

          return (
            <View key={item.id} style={styles.historyBlock}>
              
              {/*  otomatik atlanan resimleri basma mantığı */}
              {item.renderNodes.map((rn, rnIndex) => (
                <Image
                  key={`${rn.node.id}-${rnIndex}`}
                  source={{ uri: rn.mediaUrl }}
                  style={styles.panelImage}
                  resizeMode="cover"
                />
              ))}

              {/* Hikaye Sonuysa */}
              {item.tailNode.isEnd && (
                <View style={styles.endContainer}>
                  <Text style={styles.endText}>— The End —</Text>
                </View>
              )}

              {/* Karar Aşaması ve  Balonlar */}
              {!item.tailNode.isEnd && (
                <View style={styles.decisionContainer}>
                  {item.selectedDecision ? (
                    <View style={styles.selectedBubble}>
                      <Text style={styles.selectedBubbleText}>{item.selectedDecision.text}</Text>
                    </View>
                  ) : isLastItem ? (
                    <>
                      <Text style={styles.decisionPrompt}>What do you do?</Text>
                      {item.decisions.length > 0 ? (
                        item.decisions.map((d) => (
                          <TouchableOpacity
                            key={d.id}
                            style={[styles.decisionButton, advancing && styles.decisionButtonDisabled]}
                            onPress={() => handleDecision(d, index)}
                            disabled={advancing}
                          >
                            {advancing ? (
                              <ActivityIndicator color="#121212" />
                            ) : (
                              <Text style={styles.decisionButtonText}>{d.text}</Text>
                            )}
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={styles.decisionPrompt}>No paths forward from here.</Text>
                      )}
                    </>
                  ) : null}
                </View>
              )}
            </View>
          );
        })}
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
  historyBlock: { marginBottom: 0 },
  panelImage: {
    width: width,
    height: width * 1.33,
    backgroundColor: '#1E1E1E',
  },
  decisionContainer: {
    padding: 20,
    backgroundColor: '#121212',
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
  selectedBubble: {
    backgroundColor: '#BB86FC',
    padding: 15,
    borderRadius: 20,
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 20,
    maxWidth: '85%',
  },
  selectedBubbleText: { color: '#121212', fontSize: 16, fontWeight: 'bold' },
  endContainer: { padding: 40, alignItems: 'center' },
  endText: { color: '#BB86FC', fontSize: 20, fontWeight: 'bold', fontStyle: 'italic' },
  errorText: { color: '#FF6B6B', fontSize: 16, textAlign: 'center', margin: 20 },
});