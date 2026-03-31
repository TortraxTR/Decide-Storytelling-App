const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface AuthResponse {
    user_id: string;
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
    return res.json();
}

export async function register(
    email: string,
    password: string,
    username?: string
): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, username: username || undefined }),
    });
}

export async function login(
    email: string,
    password: string
): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
}

export { request };
export type { AuthResponse };
