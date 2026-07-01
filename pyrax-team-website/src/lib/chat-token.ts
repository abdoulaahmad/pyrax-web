// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Short-lived chat token, HMAC-signed with DEVNET_CHAT_SECRET. The devnet portal AND the team site
// each mint one for their signed-in user; the standalone chat WS server verifies it. This decouples
// the shared chat from each app's session cookie. (The team site ships an identical copy.)
import crypto from "node:crypto";
import { resolveSecret } from "./env-guard";

// Fail-closed: in production the secret MUST be set to a real, non-default value — otherwise the
// chat-token HMAC would be forgeable by anyone who knows the public placeholder. Mirrors the
// SESSION_SECRET guard in src/server/crypto.ts. Outside production we fall back to a dev placeholder
// so local previews and tests don't require the secret to be configured.
const SECRET = resolveSecret({
  value: process.env.DEVNET_CHAT_SECRET,
  devDefault: "dev-chat-secret-change-me",
  nodeEnv: process.env.NODE_ENV,
  name: "DEVNET_CHAT_SECRET",
});

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
    return c;
  } catch { return null; }
}
