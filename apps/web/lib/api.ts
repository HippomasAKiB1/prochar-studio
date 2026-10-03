/**
 * Thin fetch wrapper for the Prochar API.
 *
 * - Browser: calls same-origin `/api/*`, which Next.js rewrites to the API (see next.config.js),
 *   so the httpOnly auth cookie stays first-party.
 * - Server (RSC / route handlers): calls `process.env.API_URL` directly; pass `cookie` to forward
 *   the caller's session.
 * - Request bodies are never logged (they contain user data).
 */

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface RequestOptions {
  /** Server-side only: raw Cookie header to forward. */
  cookie?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

function baseUrl(): string {
  if (typeof window !== "undefined") return "";
  return process.env.API_URL ?? "http://localhost:8080";
}

/**
 * Normalise both error shapes the API emits:
 *   { error: { code, message, details? } }   (posters, upload)
 *   { error: "CODE", message, details? }     (auth)
 */
export function parseErrorBody(body: unknown, status: number): ApiError {
  if (body && typeof body === "object") {
    const b = body as { error?: unknown; message?: unknown; details?: unknown };
    if (b.error && typeof b.error === "object") {
      const e = b.error as { code?: unknown; message?: unknown; details?: unknown };
      return new ApiError(
        typeof e.code === "string" ? e.code : "UNKNOWN",
        typeof e.message === "string" ? e.message : "Request failed",
        status,
        e.details
      );
    }
    if (typeof b.error === "string") {
      return new ApiError(
        b.error,
        typeof b.message === "string" ? b.message : "Request failed",
        status,
        b.details
      );
    }
  }
  return new ApiError("UNKNOWN", "Request failed", status);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.cookie) headers["Cookie"] = opts.cookie;

  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method,
      headers,
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: opts.signal,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "Network request failed", 0);
  }

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) throw parseErrorBody(data, res.status);
  return data as T;
}

export function get<T>(path: string, opts?: RequestOptions): Promise<T> {
  return request<T>("GET", path, undefined, opts);
}

export function post<T, B = unknown>(path: string, body?: B, opts?: RequestOptions): Promise<T> {
  return request<T>("POST", path, body ?? {}, opts);
}

export function patch<T, B = unknown>(path: string, body?: B, opts?: RequestOptions): Promise<T> {
  return request<T>("PATCH", path, body ?? {}, opts);
}

export function del<T = void>(path: string, opts?: RequestOptions): Promise<T> {
  return request<T>("DELETE", path, undefined, opts);
}
