// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Tiny fetch client. Sends cookies (same-origin) and, on mutations, the CSRF token
// the server hands back from /api/me.

let csrf = "";
export function setCsrf(token: string): void {
  csrf = token;
}

export interface ApiError extends Error {
  status: number;
  data: unknown;
}

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const method = (opts.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string>) };
  if (method !== "GET") {
    headers["content-type"] = "application/json";
    headers["x-csrf-token"] = csrf;
  }
  const res = await fetch(path, { credentials: "same-origin", ...opts, method, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data && (data as any).error) || res.statusText) as ApiError;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}
