const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

export function apiUrl(path: string): string {
    return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getStoredAuthToken(): string | null {
    if (typeof window === "undefined") {
        return null;
    }
    return localStorage.getItem("llm_validator_auth_token");
}

export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
    const token = getStoredAuthToken();
    const headers = new Headers(init?.headers || {});
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(apiUrl(path), { ...(init || {}), headers });
}
