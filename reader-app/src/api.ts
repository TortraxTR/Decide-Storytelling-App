import { API_BASE_URL as BASE_URL, S3_BUCKET_URL } from './config';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const login = async (
  email: string,
  password: string,
  role: 'Author' | 'Reader'
) => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Login failed');
  return data as { user_id: string };
};

export const register = async (email: string, password: string, username: string, role: string) => {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username, role }),
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  const body = isJson ? await response.json().catch(() => null) : await response.text();
  
  if (!response.ok) {
    const detail =
      typeof body === 'object' && body && 'detail' in body ? (body as any).detail : undefined;

    throw new Error(detail || (typeof body === 'string' && body) || `Registration failed (${response.status})`);
  }

  return body as { user_id: string };
};

// ─── Readers ─────────────────────────────────────────────────────────────────

export const getReaderByUserId = async (userId: string) => {
  const response = await fetch(`${BASE_URL}/readers/?user_id=${userId}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to fetch reader');
  return data as { id: string; userId: string }[];
};

export const createReader = async (userId: string) => {
  const response = await fetch(`${BASE_URL}/readers/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to create reader');
  return data as { id: string; userId: string };
};

/** Idempotent: safe to call on every launch after login. */
export const ensureReader = async (userId: string) => {
  const response = await fetch(`${BASE_URL}/readers/ensure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to ensure reader profile');
  return data as { id: string; userId: string };
};

// ─── Stories ─────────────────────────────────────────────────────────────────

const mapStoryThumb = (thumbnail: string | null | undefined) =>
  thumbnail ? `${S3_BUCKET_URL}/${thumbnail}` : 'https://via.placeholder.com/200x300';

export const fetchStories = async () => {
  try {
    const response = await fetch(`${BASE_URL}/stories/?publish_status=PUBLISHED`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((story: any) => ({
      id: story.id,
      title: story.title,
      author: story.author?.user?.username || 'Unknown Author',
      coverImage: mapStoryThumb(story.thumbnail),
    }));
  } catch {
    return [];
  }
};

export type FeedStoryCard = {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  thumbsUpCount?: number;
  publishedEpisodeCount?: number;
};

const mapFeedStory = (story: any): FeedStoryCard => ({
  id: story.id,
  title: story.title,
  author: story.author?.user?.username || 'Unknown Author',
  coverImage: mapStoryThumb(story.thumbnail),
  thumbsUpCount: typeof story.thumbsUpCount === 'number' ? story.thumbsUpCount : undefined,
  publishedEpisodeCount:
    typeof story.publishedEpisodeCount === 'number' ? story.publishedEpisodeCount : undefined,
});

export const fetchFeedRecent = async (limit = 30) => {
  try {
    const response = await fetch(`${BASE_URL}/feed/recent?limit=${limit}`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data as any[]).map(mapFeedStory);
  } catch {
    return [];
  }
};

export const fetchFeedTopRated = async (limit = 30) => {
  try {
    const response = await fetch(`${BASE_URL}/feed/top-rated?limit=${limit}`);
    if (!response.ok) return [];
    const data = await response.json();
    return (data as any[]).map(mapFeedStory);
  } catch {
    return [];
  }
};

export const fetchStory = async (storyId: string) => {
  const response = await fetch(`${BASE_URL}/stories/${storyId}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to fetch story');
  return data as {
    id: string;
    title: string;
    episodes: { id: string; title: string; order: number }[];
  };
};

export const fetchEpisode = async (episodeId: string) => {
  const response = await fetch(`${BASE_URL}/episodes/${episodeId}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to fetch episode');
  return data as { id: string; storyId: string; title: string; order: number };
};

// ─── Nodes ───────────────────────────────────────────────────────────────────

export const fetchEpisodeNodes = async (episodeId: string) => {
  const response = await fetch(`${BASE_URL}/nodes/?episode_id=${episodeId}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to fetch nodes');
  return data as { id: string; assetKey: string }[];
};

export const fetchNodeMediaUrl = async (nodeId: string): Promise<string> => {
  try {
    const response = await fetch(`${BASE_URL}/nodes/${nodeId}/media-url`);
    if (!response.ok) throw new Error('presigned url failed');
    const data = await response.json();
    return data.url;
  } catch {
    return '';
  }
};

// ─── Decisions ───────────────────────────────────────────────────────────────

export const fetchDecisionsForNode = async (episodeId: string, sourceNodeId: string) => {
  const response = await fetch(
    `${BASE_URL}/decisions/?episode_id=${episodeId}&source_node_id=${sourceNodeId}`
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to fetch decisions');
  return data as { id: string; text: string; sourceNodeId: string; targetNodeId: string }[];
};

// ─── Sessions ────────────────────────────────────────────────────────────────

export const createOrResumeSession = async (
  readerId: string,
  episodeId: string,
  currentNodeId: string
) => {
  const response = await fetch(`${BASE_URL}/sessions/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ readerId, episodeId, currentNodeId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to create session');
  return data as { id: string; readerId: string; episodeId: string; currentNodeId: string };
};

export const advanceSession = async (sessionId: string, decisionId: string) => {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/advance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisionId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to advance session');
  return data as {
    id: string;
    currentNodeId: string;
    currentNode: { id: string; assetKey: string };
  };
};

export const deleteSession = async (sessionId: string) => {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || 'Failed to delete session');
  }
};

// ─── Favorites (library) ─────────────────────────────────────────────────────

export const fetchFavorites = async (readerId: string) => {
  const response = await fetch(`${BASE_URL}/favorites/?reader_id=${encodeURIComponent(readerId)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to fetch favorites');
  return data as {
    id: string;
    storyId: string;
    story: {
      id: string;
      title: string;
      thumbnail: string | null;
      author?: { user?: { username?: string | null } };
    };
  }[];
};

export const addFavorite = async (readerId: string, storyId: string) => {
  const response = await fetch(`${BASE_URL}/favorites/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ readerId, storyId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to add favorite');
  return data;
};

export const removeFavorite = async (readerId: string, storyId: string) => {
  const q = new URLSearchParams({ reader_id: readerId, story_id: storyId });
  const response = await fetch(`${BASE_URL}/favorites/?${q.toString()}`, {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 204) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as any).detail || 'Failed to remove favorite');
  }
};

// ─── Ratings ───────────────────────────────────────────────────────────────────

export const upsertStoryRating = async (readerId: string, storyId: string, value = 1) => {
  const response = await fetch(`${BASE_URL}/ratings/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ readerId, storyId, value }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to save rating');
  return data;
};

export const removeStoryRating = async (readerId: string, storyId: string) => {
  const q = new URLSearchParams({ reader_id: readerId, story_id: storyId });
  const response = await fetch(`${BASE_URL}/ratings/?${q.toString()}`, {
    method: 'DELETE',
  });
  if (response.status === 404) return;
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as any).detail || 'Failed to remove rating');
  }
};

export const fetchStoryRatingSummary = async (storyId: string, readerId?: string | null) => {
  const qs = readerId ? `?reader_id=${encodeURIComponent(readerId)}` : '';
  const response = await fetch(`${BASE_URL}/ratings/story/${storyId}/summary${qs}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to fetch rating summary');
  return data as { storyId: string; thumbsUpCount: number; myValue: number | null };
};

// ─── Continue reading ──────────────────────────────────────────────────────────

export type ContinueReadingSession = {
  id: string;
  readerId: string;
  episodeId: string;
  currentNodeId: string;
  updatedAt: string;
  completed: boolean;
  episode: {
    id: string;
    title: string;
    order: number;
    story: {
      id: string;
      title: string;
    };
  };
};

export const fetchContinueReading = async (readerId: string, incompleteOnly = true) => {
  const q = incompleteOnly ? '?incomplete_only=true' : '';
  const response = await fetch(`${BASE_URL}/readers/${readerId}/continue-reading${q}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to load continue reading');
  return data as ContinueReadingSession[];
};