import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_URL = "http://localhost:5000";
const REQUEST_TIMEOUT_MS = 25_000;

function getBackendBaseUrl(): string {
  return (
    process.env.BACKEND_INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    DEFAULT_BACKEND_URL
  ).replace(/\/$/, "");
}

function toTargetUrl(request: NextRequest, pathSegments: string[]): string {
  const baseUrl = getBackendBaseUrl();
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
  const targetUrl = toTargetUrl(request, pathSegments);
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
  } catch {
    return NextResponse.json(
      {
        error: "Backend is temporarily unavailable",
      },
      { status: 503 },
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
