import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:5000";
const REQUEST_TIMEOUT_MS = 90_000;

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

function getBackendBaseUrl(): string | null {
  const configuredUrl = (
    process.env.BACKEND_INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || ""
  )
    .trim()
    .replace(/\/$/, "");

  if (configuredUrl) {
    return configuredUrl;
  }

  // Local dev fallback only; production on Vercel must define an explicit backend URL.
  if (isVercelRuntime()) {
    return null;
  }

  return DEFAULT_BACKEND_URL;
}

function toTargetUrl(request: NextRequest, baseUrl: string, pathSegments: string[]): string {
  const pathname = pathSegments.join("/");
  const queryString = request.nextUrl.search;
  return `${baseUrl}/${pathname}${queryString}`;
}

function copyRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  return headers;
}

function toResponse(response: Response): NextResponse {
  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function proxy(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      {
        error: "Proxy misconfiguration: set BACKEND_INTERNAL_API_URL in Vercel environment variables.",
      },
      { status: 500 },
    );
  }

  const targetUrl = toTargetUrl(request, baseUrl, pathSegments);
  const method = request.method.toUpperCase();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const hasBody = method !== "GET" && method !== "HEAD";
    const body = hasBody ? await request.arrayBuffer() : undefined;
    const upstreamResponse = await fetch(targetUrl, {
      method,
      headers: copyRequestHeaders(request),
      body,
      signal: controller.signal,
      redirect: "manual",
      cache: "no-store",
    });

    return toResponse(upstreamResponse);
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: isAbort
          ? "Backend request timed out while waiting for Render to respond"
          : "Backend is temporarily unavailable",
      },
      { status: isAbort ? 504 : 503 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}
