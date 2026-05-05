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
  fetchEpisode,
  fetchEpisodeNodes,
  fetchNodeMediaUrl,
  fetchDecisionsForNode,
  ensureReader,
  createOrResumeSession,
  advanceSession,
  deleteSession,
  addFavorite,
  removeFavorite,
  upsertStoryRating,
  removeStoryRating,
  fetchStoryRatingSummary,
  fetchFavorites,
} from '../api';

import { LiquidScreen } from '../components/ui/LiquidScreen';
import { GlassCard } from '../components/ui/GlassCard';
import { textStyles } from '../theme/typography';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

type Node = { id: string; assetKey: string };
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
  const { userId: authUserId, readerId: authReaderId } = useAuth();

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

  const [engagementStoryId, setEngagementStoryId] = useState<string | null>(null);
  const [thumbsUpCount, setThumbsUpCount] = useState(0);
  const [myRated, setMyRated] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  /** When init calls `ensureReader`, context may not yet have `readerId` — use for social API. */
  const [sessionReaderId, setSessionReaderId] = useState<string | null>(null);

  const endSessionIfNeeded = useCallback(
    async (sid?: string, shouldEnd = false) => {
      if (!sid || !shouldEnd) return;
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
      let reachedTerminalNode = false;

      while (node && !visited.has(node.id)) {
        visited.add(node.id);

        const mediaUrl = await fetchNodeMediaUrl(node.id);
        collected.push({ node, mediaUrl });

        const outgoing = await fetchDecisionsForNode(epId, node.id);

        if (outgoing.length === 0) {
          tailNode = node;
          tailDecisions = [];
          reachedTerminalNode = true;
          break;
        }

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

      await endSessionIfNeeded(sid, reachedTerminalNode);

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
        let resolvedStoryId = storyId ?? '';

        if (targetEpisodeId && !resolvedStoryId) {
          const epQuick = await fetchEpisode(targetEpisodeId);
          resolvedStoryId = epQuick.storyId;
        }

        if (!targetEpisodeId) {
          const sid = resolvedStoryId || storyId;
          if (!sid) {
            setError('Episode information is missing.');
            return;
          }
          const story = await fetchStory(sid);
          if (!story.episodes || story.episodes.length === 0) {
            setError('This story has no episodes yet.');
            return;
          }
          const firstEpisode = story.episodes.sort((a: any, b: any) => a.order - b.order)[0];
          targetEpisodeId = firstEpisode.id;
          resolvedStoryId = resolvedStoryId || story.id;
        }

        setEpisodeId(targetEpisodeId);
        setEngagementStoryId(resolvedStoryId || null);

        const nodes = await fetchEpisodeNodes(targetEpisodeId);
        const byId: Record<string, Node> = {};
        for (const n of nodes) byId[n.id] = n;
        episodeNodesByIdRef.current = byId;

        const outgoingByNodeId = new Map<string, Decision[]>();
        await Promise.all(
          nodes.map(async (node) => {
            outgoingByNodeId.set(node.id, await fetchDecisionsForNode(targetEpisodeId, node.id));
          }),
        );

        const targetIds = new Set<string>();
        for (const decisions of outgoingByNodeId.values()) {
          for (const decision of decisions) targetIds.add(decision.targetNodeId);
        }

        const startNode = nodes.find((n) => !targetIds.has(n.id)) ?? nodes[0];
        if (!startNode) {
          setError('Episode has no start node.');
          return;
        }

        let activeReaderId: string | null = authReaderId;

        if (effectiveUserId && !activeReaderId) {
          const ensured = await ensureReader(effectiveUserId);
          activeReaderId = ensured.id;
        }
        setSessionReaderId(activeReaderId);

        let firstBlock: HistoryItem;

        if (activeReaderId) {
          const session = await createOrResumeSession(activeReaderId, targetEpisodeId, startNode.id);
          setSessionId(session.id);
          const resumedNode = nodes.find(n => n.id === session.currentNodeId) ?? startNode;
          firstBlock = await hydrateLinearPath(resumedNode, targetEpisodeId, session.id);
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
  }, [storyId, selectedEpisodeId, effectiveUserId, hydrateLinearPath, authReaderId]);

  useEffect(() => {
    const rid = authReaderId || sessionReaderId;
    if (!engagementStoryId || !rid) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [summary, favs] = await Promise.all([
          fetchStoryRatingSummary(engagementStoryId, rid),
          fetchFavorites(rid),
        ]);
        if (cancelled) {
          return;
        }
        setThumbsUpCount(summary.thumbsUpCount);
        setMyRated(summary.myValue === 1);
        setIsFavorite(favs.some(f => f.storyId === engagementStoryId));
      } catch {
        if (!cancelled) {
          setThumbsUpCount(0);
          setMyRated(false);
          setIsFavorite(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [engagementStoryId, authReaderId, sessionReaderId]);

  const readerForSocial = authReaderId || sessionReaderId;

  const handleToggleFavorite = async () => {
    if (!readerForSocial || !engagementStoryId) {
      return;
    }
    setFavoriteBusy(true);
    try {
      if (isFavorite) {
        await removeFavorite(readerForSocial, engagementStoryId);
        setIsFavorite(false);
      } else {
        await addFavorite(readerForSocial, engagementStoryId);
        setIsFavorite(true);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update library');
    } finally {
      setFavoriteBusy(false);
    }
  };

  const handleToggleRating = async () => {
    if (!readerForSocial || !engagementStoryId) {
      return;
    }
    setRatingBusy(true);
    try {
      if (myRated) {
        await removeStoryRating(readerForSocial, engagementStoryId);
        setMyRated(false);
        const s = await fetchStoryRatingSummary(engagementStoryId, readerForSocial);
        setThumbsUpCount(s.thumbsUpCount);
      } else {
        await upsertStoryRating(readerForSocial, engagementStoryId, 1);
        setMyRated(true);
        const s = await fetchStoryRatingSummary(engagementStoryId, readerForSocial);
        setThumbsUpCount(s.thumbsUpCount);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update rating');
    } finally {
      setRatingBusy(false);
    }
  };

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

      {readerForSocial && engagementStoryId ? (
        <View style={styles.engagementRow}>
          <TouchableOpacity
            onPress={handleToggleFavorite}
            disabled={favoriteBusy}
            style={styles.engagementBtn}
          >
            <Text style={styles.engagementBtnText}>
              {favoriteBusy ? '…' : isFavorite ? '♥ Saved' : '♡ Save'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleToggleRating}
            disabled={ratingBusy}
            style={styles.engagementBtn}
          >
            <Text style={styles.engagementBtnText}>
              {ratingBusy
                ? '…'
                : myRated
                  ? `👍 ${thumbsUpCount} (tap to unlike)`
                  : `👍 ${thumbsUpCount} · Like`}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

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

              {item.tailNode && !item.decisions.length && (
                <View style={styles.endContainer}>
                  <Text style={styles.endText}>— The End —</Text>
                </View>
              )}

              {(item.decisions.length > 0 || item.selectedDecision) && (
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
  engagementRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 10,
  },
  engagementBtn: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  engagementBtnText: {
    ...textStyles.bodySm,
    color: colors.onSurface,
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