"use client";

import { useEffect, useMemo, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

type WakeupState = {
  active: boolean;
  retryAt: number | null;
};

const RETRY_DELAY_MS = 30_000;
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504, 522, 524]);

function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
}

function extractRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function extractMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) {
    return init.method.toUpperCase();
  }
  if (typeof input === "string" || input instanceof URL) {
    return "GET";
  }
  return (input.method || "GET").toUpperCase();
}

function shouldHandleRequest(input: RequestInfo | URL, apiBaseUrl: string): boolean {
  return extractRequestUrl(input).startsWith(apiBaseUrl);
}

function shouldRetryMethod(method: string): boolean {
  // Only auto-retry idempotent reads to avoid accidental duplicate writes.
  return method === "GET" || method === "HEAD";
}

function isRetryableNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const name = "name" in error ? String((error as { name?: unknown }).name || "") : "";
  return name === "TypeError";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      resolve();
    }, ms);
  });
}

export function ApiWakeupGuard() {
  const [wakeupState, setWakeupState] = useState<WakeupState>({ active: false, retryAt: null });
  const [secondsLeft, setSecondsLeft] = useState(0);
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  useEffect(() => {
    if (!wakeupState.active || !wakeupState.retryAt) {
      setSecondsLeft(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((wakeupState.retryAt! - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 500);
    return () => clearInterval(interval);
  }, [wakeupState]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const patchedFetch: typeof window.fetch = async (input, init) => {
      if (!shouldHandleRequest(input, apiBaseUrl)) {
        return originalFetch(input, init);
      }

      const method = extractMethod(input, init);
      if (!shouldRetryMethod(method)) {
        return originalFetch(input, init);
      }

      try {
        const response = await originalFetch(input, init);
        if (!RETRYABLE_STATUS_CODES.has(response.status)) {
          return response;
        }
      } catch (error) {
        if (!isRetryableNetworkError(error)) {
          throw error;
        }
      }

      const retryAt = Date.now() + RETRY_DELAY_MS;
      setWakeupState({ active: true, retryAt });

      try {
        await wait(RETRY_DELAY_MS);
        return await originalFetch(input, init);
      } finally {
        setWakeupState({ active: false, retryAt: null });
      }
    };

    window.fetch = patchedFetch;
    return () => {
      window.fetch = originalFetch;
    };
  }, [apiBaseUrl]);

  if (!wakeupState.active) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 z-80 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 text-sm text-card-foreground shadow-lg backdrop-blur">
        <Spinner size="sm" className="text-primary" />
        <p className="leading-tight">
          The server is waking up from sleep. This can take about a minute. We will retry automatically in {secondsLeft}s.
        </p>
      </div>
    </div>
  );
}
