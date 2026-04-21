import { API_BASE_URL } from "./config";
const API_BASE = import.meta.env.VITE_API_URL?.trim() || API_BASE_URL;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PublishStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface AuthResponse {
    user_id: string;
}

export interface AuthorDto {
    id: string;
    userId: string;
    bio: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface StoryDto {
    id: string;
    authorId: string;
    title: string;
    description: string | null;
    thumbnail: string | null;
    status: PublishStatus;
    createdAt: string;
    updatedAt: string;
}

export interface EpisodeDto {
    id: string;
    storyId: string;
    title: string;
    order: number;
    status: PublishStatus;
    createdAt: string;
    updatedAt: string;
}

export interface EpisodeNodeDto {
    id: string;
    episodeId: string;
    assetKey: string;
    assetWidth: number | null;
    assetHeight: number | null;
    canvasX?: number | null;
    canvasY?: number | null;
    isStart: boolean;
    isEnd: boolean;
}

export interface DecisionDto {
    id: string;
    episodeId: string;
    sourceNodeId: string;
    targetNodeId: string;
    text: string | null;
}

export interface ReadSessionDto {
    id: string;
    readerId: string;
    episodeId: string;
    currentNodeId: string;
    createdAt: string;
    updatedAt: string;
}

export interface PresignResponse {
    key: string;
    url: string;
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) ?? {}),
    };

    let res: Response;
    try {
        res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch {
        throw new Error("Cannot reach the server. Please check your connection or try again later.");
    }

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `Request failed (${res.status})`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
}

export { request };

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function register(
    email: string,
    password: string,
    username?: string
): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
            email,
            password,
            username: username || undefined,
            role: "Author",
        }),
    });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role: "Author" }),
    });
}

export async function resetPassword(email: string, newPassword: string): Promise<void> {
    return request<void>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, new_password: newPassword }),
    });
}

// ---------------------------------------------------------------------------
// Authors
// ---------------------------------------------------------------------------

export async function ensureAuthorForUser(userId: string): Promise<AuthorDto> {
    const authors = await request<AuthorDto[]>("/authors/");
    const existing = authors.find((a) => a.userId === userId);
    if (existing) return existing;
    return request<AuthorDto>("/authors/", {
        method: "POST",
        body: JSON.stringify({ userId }),
    });
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export async function listStories(authorId?: string): Promise<StoryDto[]> {
    const params = authorId ? `?author_id=${authorId}` : "";
    return request<StoryDto[]>(`/stories/${params}`);
}

export async function createStory(payload: {
    authorId: string;
    title: string;
    description?: string;
    thumbnail?: string;
    status?: PublishStatus;
}): Promise<StoryDto> {
    return request<StoryDto>("/stories/", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateStory(
    storyId: string,
    payload: Partial<{ title: string; description: string; thumbnail: string; status: PublishStatus }>
): Promise<StoryDto> {
    return request<StoryDto>(`/stories/${storyId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export async function deleteStory(storyId: string): Promise<void> {
    return request<void>(`/stories/${storyId}`, { method: "DELETE" });
}

export async function getStory(storyId: string): Promise<StoryDto> {
    return request<StoryDto>(`/stories/${storyId}`);
}

// ---------------------------------------------------------------------------
// Episodes
// ---------------------------------------------------------------------------

export async function listEpisodes(storyId?: string): Promise<EpisodeDto[]> {
    const params = storyId ? `?story_id=${storyId}` : "";
    return request<EpisodeDto[]>(`/episodes/${params}`);
}

export async function createEpisode(payload: {
    storyId: string;
    title: string;
    order: number;
    status?: PublishStatus;
}): Promise<EpisodeDto> {
    return request<EpisodeDto>("/episodes/", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateEpisode(
    episodeId: string,
    payload: Partial<{ title: string; order: number; status: PublishStatus }>
): Promise<EpisodeDto> {
    return request<EpisodeDto>(`/episodes/${episodeId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export async function deleteEpisode(episodeId: string): Promise<void> {
    return request<void>(`/episodes/${episodeId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

export async function listNodes(episodeId?: string): Promise<EpisodeNodeDto[]> {
    const params = episodeId ? `?episode_id=${episodeId}` : "";
    return request<EpisodeNodeDto[]>(`/nodes/${params}`);
}

export async function createNode(payload: {
    episodeId: string;
    assetKey: string;
    assetWidth?: number;
    assetHeight?: number;
    canvasX?: number;
    canvasY?: number;
    isStart?: boolean;
    isEnd?: boolean;
}): Promise<EpisodeNodeDto> {
    return request<EpisodeNodeDto>("/nodes/", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateNode(
    nodeId: string,
    payload: Partial<{
        assetKey: string;
        assetWidth: number;
        assetHeight: number;
        canvasX: number;
        canvasY: number;
        isStart: boolean;
        isEnd: boolean;
    }>
): Promise<EpisodeNodeDto> {
    return request<EpisodeNodeDto>(`/nodes/${nodeId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export async function deleteNode(nodeId: string): Promise<void> {
    return request<void>(`/nodes/${nodeId}`, { method: "DELETE" });
}

export async function getNodeMediaUrl(nodeId: string): Promise<{ url: string; expiresIn: number }> {
    return request(`/nodes/${nodeId}/media-url`);
}

// ---------------------------------------------------------------------------
// Presigned upload
// ---------------------------------------------------------------------------

export async function presignNodeUpload(payload: {
    episodeId: string;
    filename: string;
    contentType?: string;
}): Promise<PresignResponse> {
    return request<PresignResponse>("/uploads/presign", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function presignStoryUpload(payload: {
    storyId: string;
    filename: string;
    contentType?: string;
}): Promise<PresignResponse> {
    return request<PresignResponse>("/uploads/presign-story", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

export async function listDecisions(episodeId?: string): Promise<DecisionDto[]> {
    const params = episodeId ? `?episode_id=${episodeId}` : "";
    return request<DecisionDto[]>(`/decisions/${params}`);
}

export async function createDecision(payload: {
    episodeId: string;
    sourceNodeId: string;
    targetNodeId: string;
    text?: string;
}): Promise<DecisionDto> {
    return request<DecisionDto>("/decisions/", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateDecision(
    decisionId: string,
    payload: Partial<{ text: string; targetNodeId: string }>
): Promise<DecisionDto> {
    return request<DecisionDto>(`/decisions/${decisionId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export async function deleteDecision(decisionId: string): Promise<void> {
    return request<void>(`/decisions/${decisionId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Read sessions
// ---------------------------------------------------------------------------

export async function listSessions(episodeId?: string): Promise<ReadSessionDto[]> {
    const params = episodeId ? `?episode_id=${episodeId}` : "";
    return request<ReadSessionDto[]>(`/sessions/${params}`);
}

export async function deleteSession(sessionId: string): Promise<void> {
    return request<void>(`/sessions/${sessionId}`, { method: "DELETE" });
}
