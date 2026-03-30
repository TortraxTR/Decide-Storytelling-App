const BASE_URL = 'https://mswgurkeeq.eu-central-1.awsapprunner.com';
const S3_BUCKET_URL = 'https://decide-media-dev.s3.eu-central-1.amazonaws.com';

const getAuthHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
});

export const login = async (email: string, password: string) => {
  console.log(`[API] Attempting login to: ${BASE_URL}/auth/login`);
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const text = await response.text();
    console.log(`[API] Raw response: ${text.substring(0, 100)}`);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error(`[API] Failed to parse JSON. Raw text: "${text}"`);
      throw new Error(`Invalid server response (not JSON). Character found: ${text[0]}`);
    }

    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    return data;
  } catch (error: any) {
    console.error('[API] Login error:', error);
    throw error;
  }
};

export const fetchStories = async (token?: string) => {
  console.log(`[API] Fetching stories from: ${BASE_URL}/stories/`);
  try {
    const response = await fetch(`${BASE_URL}/stories/`, {
      headers: getAuthHeaders(token),
    });

    const text = await response.text();

    if (response.status === 401) {
       console.error('[API] 401 Unauthorized');
       return [];
    }

    if (!response.ok) {
        console.error(`[API] Error response (${response.status}): ${text}`);
        return [];
    }

    const data = JSON.parse(text);
    return data.map((story: any) => ({
      id: story.id,
      title: story.title,
      author: story.author?.user?.username || 'Unknown Author',
      coverImage: story.thumbnail ? `${S3_BUCKET_URL}/${story.thumbnail}` : 'https://via.placeholder.com/200x300',
    }));
  } catch (error) {
    console.error('[API] Error fetching stories:', error);
    return [];
  }
};

export const fetchStoryNodes = async (storyId: string, token?: string) => {
  try {
    const response = await fetch(`${BASE_URL}/stories/${storyId}`, {
        headers: getAuthHeaders(token),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || 'Failed to fetch story details');
    }

    if (data.episodes && data.episodes.length > 0) {
        const firstEpisode = data.episodes[0];
        const nodesResponse = await fetch(`${BASE_URL}/nodes/?episode_id=${firstEpisode.id}`, {
            headers: getAuthHeaders(token),
        });

        const nodes = await nodesResponse.json();
        return nodes.map((node: any) => ({
            id: node.id,
            type: 'image',
            url: `${S3_BUCKET_URL}/${node.assetKey}`,
            isStart: node.isStart,
            isEnd: node.isEnd
        }));
    }
    return [];
  } catch (error) {
    console.error('[API] Error fetching story nodes:', error);
    return [];
  }
};
