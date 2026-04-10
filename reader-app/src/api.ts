import { API_BASE_URL as BASE_URL, S3_BUCKET_URL } from './config';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const login = async (email: string, password: string) => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
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

// ─── Stories ─────────────────────────────────────────────────────────────────

export const fetchStories = async () => {
  try {
    const response = await fetch(`${BASE_URL}/stories/`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.map((story: any) => ({
      id: story.id,
      title: story.title,
      author: story.author?.user?.username || 'Unknown Author',
      coverImage: story.thumbnail
        ? `${S3_BUCKET_URL}/${story.thumbnail}`
        : 'https://via.placeholder.com/200x300',
    }));
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

// ─── Nodes ───────────────────────────────────────────────────────────────────

export const fetchEpisodeNodes = async (episodeId: string) => {
  const response = await fetch(`${BASE_URL}/nodes/?episode_id=${episodeId}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Failed to fetch nodes');
  return data as { id: string; assetKey: string; isStart: boolean; isEnd: boolean }[];
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
    currentNode: { id: string; assetKey: string; isStart: boolean; isEnd: boolean };
  };
};
