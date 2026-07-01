// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Fail-closed secret resolution. A required secret MUST be set to a real, non-default value in
// production; otherwise this throws at module load, so the auth/crypto graph never initializes and
// every request fails closed (default-deny) — the app never serves a single response keyed with a
// guessable/public placeholder. (The listener may bind before the first request triggers the throw,
// so the container HEALTHCHECK also fails, which is the intended signal.) Outside production we fall
// back to a dev placeholder so local previews + tests don't need every secret configured.
//
// Extracted as a pure helper so the security invariant is unit-testable without triggering a real
// module-load throw. Used by src/server/crypto.ts (SESSION_SECRET) and src/lib/chat-token.ts
// (DEVNET_CHAT_SECRET).

export interface SecretOptions {
  /** The configured value (typically process.env.X), may be undefined/empty. */
  value: string | undefined;
  /** The well-known dev placeholder. Treated as "not set" in production. */
  devDefault: string;
  /** Environment name (typically process.env.NODE_ENV). */
  nodeEnv: string | undefined;
  /** Human name of the variable, for the error message. */
  name: string;
}

/**
 * Resolve a fail-closed secret.
 * - In production: throws if `value` is empty or equals `devDefault`.
 * - Otherwise: returns `value` if set, else `devDefault`.
 */
export function resolveSecret({ value, devDefault, nodeEnv, name }: SecretOptions): string {
  const v = value || "";
  const isProd = nodeEnv === "production";
  if (isProd && (!v || v === devDefault)) {
    throw new Error(`${name} is required (and must not be the dev default) in production.`);
  }
  return v || devDefault;
}
