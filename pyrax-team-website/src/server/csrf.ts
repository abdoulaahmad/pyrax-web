// SPDX-License-Identifier: LicenseRef-Proprietary
//
// CSRF defense-in-depth. Session cookies are already SameSite=Lax (which blocks the common
// cross-site form/fetch attack), but for a template that other PYRAX sites copy we add a second,
// independent gate: state-changing requests (POST/PUT/PATCH/DELETE) must carry an Origin (or, as a
// fallback, a Referer) whose host matches the request's own host. A genuine same-origin fetch from
// the portal always sends a matching Origin; a forged cross-site request carries the attacker's
// Origin (or, for some legacy flows, none at all on a cross-site POST — which we also reject).
//
// Pure + dependency-free so it's unit-testable and reusable by every PYRAX site.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Host (with port) of a URL string, or null if it doesn't parse. */
function hostOf(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    return new URL(u).host.toLowerCase();
  } catch {
    return null;
  }
}

export interface CsrfInput {
  method: string;
  /** The Origin request header (may be null). */
  origin: string | null | undefined;
  /** The Referer request header (fallback when Origin is absent). */
  referer: string | null | undefined;
  /** The request's own absolute URL (we compare against its host). */
  requestUrl: string;
  /** Optional Host header — used when the request URL host is unreliable behind a proxy. */
  hostHeader?: string | null;
}

export interface CsrfResult {
  ok: boolean;
  reason?: "origin-mismatch" | "no-origin";
}

/**
 * Decide whether a request passes the same-origin CSRF check.
 * - Safe methods (GET/HEAD/OPTIONS) always pass (they must not mutate state).
 * - State-changing methods require an Origin (or Referer) whose host matches the target host.
 */
export function checkCsrf(input: CsrfInput): CsrfResult {
  if (SAFE_METHODS.has(input.method.toUpperCase())) return { ok: true };

  const target =
    (input.hostHeader && input.hostHeader.toLowerCase()) || hostOf(input.requestUrl);
  if (!target) return { ok: false, reason: "origin-mismatch" };

  // Prefer Origin; fall back to Referer's host. "null" is a real Origin value (e.g. sandboxed
  // iframe / privacy-stripped) and must be treated as a mismatch.
  const claimed = input.origin && input.origin !== "null" ? hostOf(input.origin) : hostOf(input.referer);
  if (!claimed) return { ok: false, reason: "no-origin" };
  if (claimed !== target) return { ok: false, reason: "origin-mismatch" };
  return { ok: true };
}

/** Convenience wrapper for an Astro/Fetch Request. */
export function checkRequestCsrf(request: Request): CsrfResult {
  return checkCsrf({
    method: request.method,
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    requestUrl: request.url,
    hostHeader: request.headers.get("host"),
  });
}
