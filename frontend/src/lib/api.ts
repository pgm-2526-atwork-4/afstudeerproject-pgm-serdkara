const useProxyByDefault = process.env.NEXT_PUBLIC_USE_API_PROXY !== "false";
const directApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const API_BASE_URL = useProxyByDefault ? "/backend-api" : directApiBaseUrl;

export function apiUrl(path: string): string {
    return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getStoredAuthToken(): string | null {
    if (typeof window === "undefined") {
        return null;
    }
    try {
        return localStorage.getItem("llm_validator_auth_token");
    } catch {
        return null;
    }
}

export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
    const token = getStoredAuthToken();
    const headers = new Headers(init?.headers || {});
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    try {
        return await fetch(apiUrl(path), { ...(init || {}), headers });
    } catch (error) {
        throw new Error(`Network request failed for ${path}`, { cause: error });
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            clearTimeout(timer);
            resolve();
        }, ms);
    });
}

export async function waitForBackendReady(options?: { attempts?: number; delayMs?: number }): Promise<void> {
    const attempts = options?.attempts ?? 4;
    const delayMs = options?.delayMs ?? 2500;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const response = await fetch(apiUrl("/health"), {
                method: "GET",
                cache: "no-store",
            });
            if (response.ok) {
                return;
            }
        } catch {
            // Keep retrying because Render cold starts can fail transiently.
        }

        if (attempt < attempts) {
            await sleep(delayMs);
        }
    }

    throw new Error("Backend wakeup timed out. Please try again in a few seconds.");
}
