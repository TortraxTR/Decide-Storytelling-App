const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

type PublishStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

interface LoginResponse {
    user_id: string;
}

interface RegisterResponse {
    user_id: string;
}

interface UserDto {
    id: string;
    email: string;
    username?: string | null;
    author?: { id: string; userId: string; bio?: string | null } | null;
}

interface StoryDto {
    id: string;
    authorId: string;
    title: string;
    description?: string | null;
    thumbnail?: string | null;
    status: PublishStatus;
}

interface EpisodeDto {
    id: string;
    storyId: string;
    title: string;
    order: number;
    status: PublishStatus;
}

interface EpisodeNodeDto {
    id: string;
    episodeId: string;
    assetKey: string;
    assetWidth?: number | null;
    assetHeight?: number | null;
    isStart: boolean;
    isEnd: boolean;
}

interface DecisionDto {
    id: string;
    episodeId: string;
    sourceNodeId: string;
    targetNodeId: string;
    text?: string | null;
}

interface PresignResponse {
    key: string;
    url: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) ?? {}),
    };

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Request failed (${res.status})`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

export async function register(email: string, password: string, username?: string): Promise<RegisterResponse> {
    return request<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, username: username || undefined }),
    });
}

export async function login(email: string, password: string): Promise<LoginResponse> {
    return request<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
}

export async function getUser(userId: string): Promise<UserDto> {
    return request<UserDto>(`/users/${userId}`);
}

export async function ensureAuthorForUser(userId: string): Promise<{ authorId: string }> {
    const user = await getUser(userId);
    if (user.author?.id) return { authorId: user.author.id };

    // FastAPI redirects /authors -> /authors/ (307). Browsers may block redirecting CORS preflights.
    // Call the canonical trailing-slash route directly.
    const author = await request<{ id: string }>(`/authors/`, {
        method: "POST",
        body: JSON.stringify({ userId }),
    });
    return { authorId: author.id };
}

export async function listStories(authorId: string): Promise<StoryDto[]> {
    return request<StoryDto[]>(`/stories/?author_id=${encodeURIComponent(authorId)}`);
}

export async function createStory(payload: {
    authorId: string;
    title: string;
    description?: string;
    thumbnail?: string;
    status?: PublishStatus;
}): Promise<StoryDto> {
    return request<StoryDto>(`/stories/`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateStory(storyId: string, payload: Partial<Omit<StoryDto, "id" | "authorId">>): Promise<StoryDto> {
    return request<StoryDto>(`/stories/${storyId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export async function deleteStory(storyId: string): Promise<void> {
    return request<void>(`/stories/${storyId}`, { method: "DELETE" });
}

export async function listEpisodes(storyId: string): Promise<EpisodeDto[]> {
    return request<EpisodeDto[]>(`/episodes/?story_id=${encodeURIComponent(storyId)}`);
}

export async function createEpisode(payload: {
    storyId: string;
    title: string;
    order: number;
    status?: PublishStatus;
}): Promise<EpisodeDto> {
    return request<EpisodeDto>(`/episodes/`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function deleteEpisode(episodeId: string): Promise<void> {
    return request<void>(`/episodes/${episodeId}`, { method: "DELETE" });
}

export async function listNodes(episodeId: string): Promise<EpisodeNodeDto[]> {
    return request<EpisodeNodeDto[]>(`/nodes/?episode_id=${encodeURIComponent(episodeId)}`);
}

export async function createNode(payload: {
    episodeId: string;
    assetKey: string;
    assetWidth?: number;
    assetHeight?: number;
    isStart?: boolean;
    isEnd?: boolean;
}): Promise<EpisodeNodeDto> {
    return request<EpisodeNodeDto>(`/nodes/`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function deleteNode(nodeId: string): Promise<void> {
    return request<void>(`/nodes/${nodeId}`, { method: "DELETE" });
}

export async function listDecisions(episodeId: string, sourceNodeId?: string): Promise<DecisionDto[]> {
    const params = new URLSearchParams({ episode_id: episodeId });
    if (sourceNodeId) params.set("source_node_id", sourceNodeId);
    return request<DecisionDto[]>(`/decisions/?${params.toString()}`);
}

export async function createDecision(payload: {
    episodeId: string;
    sourceNodeId: string;
    targetNodeId: string;
    text?: string;
}): Promise<DecisionDto> {
    return request<DecisionDto>(`/decisions/`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function deleteDecision(decisionId: string): Promise<void> {
    return request<void>(`/decisions/${decisionId}`, { method: "DELETE" });
}

export async function presignNodeUpload(payload: {
    episodeId: string;
    filename: string;
    contentType?: string;
}): Promise<PresignResponse> {
    return request<PresignResponse>(`/uploads/presign`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export { request };
export type {
    PublishStatus,
    StoryDto,
    EpisodeDto,
    EpisodeNodeDto,
    DecisionDto,
    UserDto,
    LoginResponse,
    RegisterResponse,
    PresignResponse,
};
