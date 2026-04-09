import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

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

import { LiquidScreen } from '../components/ui/LiquidScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { textStyles } from '../theme/typography';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

type Node = { id: string; assetKey: string; isStart: boolean; isEnd: boolean };
type Decision = {
  id: string;
  text: string;
  sourceNodeId: string;
  targetNodeId: string;
};
type RenderNode = { node: Node; mediaUrl: string };

type HistoryItem = {
  id: string;
  renderNodes: RenderNode[];
  tailNode: Node;
  decisions: Decision[];
  selectedDecision?: Decision;
};

type EpisodeRouteParams = {
  storyId?: string;
  episodeId?: string;
  title?: string;
  episodeTitle?: string;
  storyTitle?: string;
  userId?: string;
};

type Props = {
  route: { params?: EpisodeRouteParams };
};

const EpisodeScreen: React.FC<Props> = ({ route }) => {
  const { userId: authUserId } = useAuth();

  const params = route?.params ?? {};
  const {
    storyId,
    episodeId: selectedEpisodeId,
    title,
    episodeTitle,
    storyTitle,
    userId: routeUserId,
  } = params;

  const effectiveUserId = routeUserId ?? authUserId ?? null;
  const displayTitle = episodeTitle ?? title ?? storyTitle ?? 'Episode';

  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState('');

  const [episodeId, setEpisodeId] = useState('');
  const [sessionId, setSessionId] = useState('');

  const [history, setHistory] = useState<HistoryItem[]>([]);
  // const scrollViewRef = useRef<ScrollView>(null);

  const episodeNodesByIdRef = useRef<Record<string, Node>>({});

  const endSessionIfNeeded = useCallback(
    async (node: Node, sid?: string) => {
      if (!sid || !node.isEnd) return;
      try {
        await deleteSession(sid);
      } catch {
        // ignore
      } finally {
        setSessionId(prev => (prev === sid ? '' : prev));
      }
    },
    [],
  );

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

        tailNode = node;
        tailDecisions = outgoing;
        break;
      }

      await endSessionIfNeeded(tailNode, sid);

      return {
        id: Date.now().toString() + tailNode.id,
        renderNodes: collected,
        tailNode,
        decisions: tailDecisions,
      };
    },
    [endSessionIfNeeded],
  );

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError('');

        let targetEpisodeId = selectedEpisodeId;

        if (!targetEpisodeId) {
          if (!storyId) {
            setError('Episode information is missing.');
            return;
          }
          const story = await fetchStory(storyId);
          if (!story.episodes || story.episodes.length === 0) {
            setError('This story has no episodes yet.');
            return;
          }
          const firstEpisode = story.episodes.sort(
            (a: any, b: any) => a.order - b.order,
          )[0];
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

        if (effectiveUserId) {
          const readers = await getReaderByUserId(effectiveUserId);
          if (readers.length > 0) {
            readerId = readers[0].id;
          } else {
            const newReader = await createReader(effectiveUserId);
            readerId = newReader.id;
          }
        }

        let firstBlock: HistoryItem;

        if (readerId) {
          const session = await createOrResumeSession(
            readerId,
            targetEpisodeId,
            startNode.id,
          );
          setSessionId(session.id);
          const resumedNode =
            nodes.find(n => n.id === session.currentNodeId) ?? startNode;
          firstBlock = await hydrateLinearPath(
            resumedNode,
            targetEpisodeId,
            session.id,
          );
        } else {
          firstBlock = await hydrateLinearPath(startNode, targetEpisodeId);
        }

        setHistory([firstBlock]);
      } catch (e: any) {
        setError(e.message || 'Failed to load story');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [storyId, selectedEpisodeId, effectiveUserId, hydrateLinearPath]);

  const handleDecision = async (decision: Decision, historyIndex: number) => {
    if (advancing) return;

    try {
      setAdvancing(true);

      setHistory(prev => {
        const newHistory = [...prev];
        newHistory[historyIndex].selectedDecision = decision;
        return newHistory;
      });

      let nextNode: Node;

      if (sessionId) {
        const result = await advanceSession(sessionId, decision.id);
        nextNode = result.currentNode;
      } else {
        nextNode = episodeNodesByIdRef.current[decision.targetNodeId];
        if (!nextNode) throw new Error('Next node could not be found.');
      }

      const nextBlock = await hydrateLinearPath(nextNode, episodeId, sessionId);
      setHistory(prev => [...prev, nextBlock]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to advance story');
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) {
    return (
      <LiquidScreen scrollable={false}>
        <View style={styles.fullCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Summoning this episode…</Text>
        </View>
      </LiquidScreen>
    );
  }

  if (error) {
    return (
      <LiquidScreen scrollable={false}>
        <View style={styles.fullCenter}>
          <GlassCard elevated>
            <Text style={styles.errorText}>{error}</Text>
          </GlassCard>
        </View>
      </LiquidScreen>
    );
  }

  return (
    <LiquidScreen scrollable={false}>
      <View style={styles.header}>
        <Text style={textStyles.label}>Episode</Text>
        <Text style={[textStyles.headline, styles.headerTitle]} numberOfLines={2}>
          {displayTitle}
        </Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const isLastItem = index === history.length - 1;

          return (
            <View style={styles.historyBlock}>
              {item.renderNodes.map((rn, rnIndex) => (
                <Image
                  key={`${rn.node.id}-${rnIndex}`}
                  source={{ uri: rn.mediaUrl }}
                  style={styles.panelImage}
                  resizeMode="cover"
                />
              ))}

              {item.tailNode.isEnd && (
                <View style={styles.endContainer}>
                  <Text style={styles.endText}>— The End —</Text>
                </View>
              )}

              {!item.tailNode.isEnd && (
                <View style={styles.decisionContainer}>
                  {item.selectedDecision ? (
                    <View style={styles.selectedBubbleWrapper}>
                      <GlassCard style={styles.selectedBubble}>
                        <Text style={styles.selectedBubbleText}>
                          {item.selectedDecision.text}
                        </Text>
                      </GlassCard>
                    </View>
                  ) : (
                    isLastItem && (
                      <GlassCard style={styles.choicesCard}>
                        {item.decisions.length > 1 && (
                          <Text style={styles.decisionPrompt}>
                            What do you do?
                          </Text>
                        )}
                        {item.decisions.length > 0 ? (
                          item.decisions.map((d) => (
                            <TouchableOpacity
                              key={d.id}
                              style={styles.decisionButton}
                              onPress={() => handleDecision(d, index)}
                              disabled={advancing}
                            >
                              <LinearGradient
                                colors={[colors.primary, colors.primaryContainer]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[
                                  styles.decisionGradient,
                                  advancing && styles.decisionGradientDisabled,
                                ]}
                              >
                                {advancing ? (
                                  <ActivityIndicator color="#07006c" size="small" />
                                ) : (
                                  <Text style={styles.decisionButtonText}>{d.text}</Text>
                                )}
                              </LinearGradient>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <Text style={styles.decisionPrompt}>
                            No paths forward from here.
                          </Text>
                        )}
                      </GlassCard>
                    )
                  )}
                </View>
              )}
            </View>
          );
        }}
      />
    </LiquidScreen>
  );
};

const styles = StyleSheet.create({
  fullCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...textStyles.bodySm,
    marginTop: 12,
    color: colors.onSurfaceVariant,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  historyBlock: {
    marginBottom: 0,
  },
  panelImage: {
    width,
    height: width * 1.33,
    backgroundColor: colors.surfaceContainerLowest,
  },
  decisionContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  choicesCard: {
    backgroundColor: colors.surfaceContainerLowest,
  },
  decisionPrompt: {
    ...textStyles.titleSm,
    textAlign: 'center',
    marginBottom: 16,
  },
  decisionButton: {
    marginBottom: 10,
  },
  decisionGradient: {
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionGradientDisabled: {
    opacity: 0.6,
  },
  decisionButtonText: {
    ...textStyles.body,
    color: '#07006c',
    fontFamily: 'Inter-SemiBold',
  },
  selectedBubbleWrapper: {
    alignItems: 'flex-end',
  },
  selectedBubble: {
    maxWidth: '85%',
    backgroundColor: colors.surfaceContainerHigh,
  },
  selectedBubbleText: {
    ...textStyles.body,
  },
  endContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  endText: {
    ...textStyles.title,
    color: colors.secondary,
    fontStyle: 'italic',
  },
  errorText: {
    ...textStyles.bodySm,
    color: '#ff4d6a',
    textAlign: 'center',
  },
});

export default EpisodeScreen;