const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    const method = (init?.method || "GET").toUpperCase();
    const isIdempotent = method === "GET" || method === "HEAD";
    const maxAttempts = isIdempotent ? 4 : 1;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await fetch(apiUrl(path), { ...(init || {}), headers });
            if (!isIdempotent || !RETRYABLE_STATUS.has(response.status) || attempt === maxAttempts) {
                return response;
            }
        } catch (err) {
            lastError = err;
            if (!isIdempotent || attempt === maxAttempts) {
                throw err;
            }
        }

        await sleep(500 * attempt);
    }

    if (lastError) {
        throw lastError;
    }

    return fetch(apiUrl(path), { ...(init || {}), headers });
}
