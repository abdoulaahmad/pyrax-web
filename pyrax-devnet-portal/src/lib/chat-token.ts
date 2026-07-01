// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Short-lived chat token, HMAC-signed with DEVNET_CHAT_SECRET. The devnet portal AND the team site
// each mint one for their signed-in user; the standalone chat WS server verifies it. This decouples
// the shared chat from each app's session cookie. (The team site ships an identical copy.)
import crypto from "node:crypto";

// Fail-closed secret guard (mirrors src/server/crypto.ts): in production the shared chat secret MUST
// be set to a real value. An unset secret — or the public dev placeholder — would let anyone forge a
// chat token, so we refuse to boot rather than ship a default-allow signing key.
const DEV_DEFAULT = "dev-chat-secret-change-me";
const RAW_SECRET = process.env.DEVNET_CHAT_SECRET || "";
if ((!RAW_SECRET || RAW_SECRET === DEV_DEFAULT) && process.env.NODE_ENV === "production") {
  throw new Error("DEVNET_CHAT_SECRET must be set to a non-default value in production.");
}
const SECRET = RAW_SECRET || DEV_DEFAULT;

// Defensive bound on claim string lengths — keeps a forged/oversized token from bloating presence,
// history rows, or the members roster. The signer never produces names this long.
const MAX_CLAIM = 64;
const clampClaim = (v: unknown): string => (typeof v === "string" ? v.slice(0, MAX_CLAIM) : "");

export interface ChatClaims { uid: string; name: string; user: string; admin: boolean; role: "admin" | "support" | "tester"; exp: number }

const b64u = (b: Buffer) => b.toString("base64url");

export function signChatToken(c: Omit<ChatClaims, "exp">, ttlSec = 3600): string {
  const payload: ChatClaims = { ...c, exp: Math.floor(Date.now() / 1000) + ttlSec };
  const body = b64u(Buffer.from(JSON.stringify(payload)));
  const sig = b64u(crypto.createHmac("sha256", SECRET).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyChatToken(token: string): ChatClaims | null {
  const [body, sig] = (token || "").split(".");
  if (!body || !sig) return null;
  const expect = b64u(crypto.createHmac("sha256", SECRET).update(body).digest());
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const c = JSON.parse(Buffer.from(body, "base64url").toString()) as ChatClaims;
    if (!c || typeof c.exp !== "number" || c.exp < Math.floor(Date.now() / 1000)) return null;
    // Clamp identity claims defensively even on a validly-signed token.
    c.name = clampClaim(c.name);
    c.user = clampClaim(c.user);
    c.uid = clampClaim(c.uid);
    return c;
  } catch { return null; }
}
