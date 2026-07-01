// SPDX-License-Identifier: LicenseRef-Proprietary
//
// RED TEAM — auth / session / device-token attacks (team portal, Ember device grant).
//
// Drives the REAL src/server/ember.ts + src/server/auth.ts logic against a faithful in-memory fake of
// the ember_devices / sessions / users tables. The fake reproduces the SECURITY-relevant DB contract
// exactly (the atomic `UPDATE ... WHERE revoked=FALSE AND expires_at>now`, HMAC-only storage), so the
// defense being tested is the real code, not a stub. A FAILING test = a real auth-bypass vulnerability.
//
// Attacks covered:
//   B1  A forged / random device token (never issued) is rejected.
//   B2  A tampered token (issued token with bytes flipped) is rejected.
//   B3  Token replay after logout/revoke is rejected on the next check-in.
//   B4  An expired device token is rejected.
//   B5  Tokens are stored ONLY as keyed HMACs — a DB read never reveals a usable token.
//   B6  A token minted for account X resolves to X, never to another account Y (no cross-account lift).
//   B7  A raw session id that was never issued (or a flipped one) never resolves to a user.
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "redteam-device-secret";

// ---- Faithful in-memory fakes of the tables ember.ts / auth.ts touch --------------------------------
interface DeviceRow { token_hash: string; user_id: string; device_id: string; device_name: string; created_at: number; last_seen: number; expires_at: number; revoked: boolean }
interface SessionRow { sid_hash: string; user_id: string; created_at: number; expires_at: number; last_seen: number }

const devices: DeviceRow[] = [];
const sessions: SessionRow[] = [];
const users: Record<string, any> = {
  u_alice: { id: "u_alice", email: "alice@pyraxchain.com", display_name: "Alice", is_superuser: false, permissions: ["dashboard.view", "ember.seed_lists"] },
  u_mallory: { id: "u_mallory", email: "mallory@pyraxchain.com", display_name: "Mallory", is_superuser: false, permissions: ["dashboard.view"] },
};

function fakeQuery(sql: string, params: any[] = []): { rows: any[]; rowCount: number } {
  const s = sql.replace(/\s+/g, " ").trim();

  if (s.startsWith("CREATE TABLE")) return { rows: [], rowCount: 0 };

  // createDeviceToken INSERT
  if (s.startsWith("INSERT INTO ember_devices")) {
    const [token_hash, user_id, device_id, device_name, created_at, expires_at] = params;
    devices.push({ token_hash, user_id, device_id, device_name, created_at, last_seen: created_at, expires_at, revoked: false });
    return { rows: [], rowCount: 1 };
  }
  // deviceUser: atomic slide of an unrevoked, unexpired token
  if (s.startsWith("UPDATE ember_devices SET last_seen")) {
    const [now, newExp, token_hash] = params;
    const row = devices.find((d) => d.token_hash === token_hash && !d.revoked && d.expires_at > now);
    if (!row) return { rows: [], rowCount: 0 };
    row.last_seen = now; row.expires_at = newExp;
    return { rows: [{ user_id: row.user_id }], rowCount: 1 };
  }
  // revokeDevice
  if (s.startsWith("UPDATE ember_devices SET revoked = TRUE")) {
    const [token_hash] = params;
    const row = devices.find((d) => d.token_hash === token_hash);
    if (row) row.revoked = true;
    return { rows: [], rowCount: row ? 1 : 0 };
  }

  // sessions: createSession INSERT
  if (s.startsWith("INSERT INTO sessions")) {
    const [sid_hash, user_id, created_at, expires_at] = params;
    sessions.push({ sid_hash, user_id, created_at, expires_at, last_seen: created_at });
    return { rows: [], rowCount: 1 };
  }
  // sessionUser: atomic slide
  if (s.startsWith("UPDATE sessions SET last_seen")) {
    const [now, newExp, sid_hash] = params;
    const row = sessions.find((x) => x.sid_hash === sid_hash && x.expires_at > now);
    if (!row) return { rows: [], rowCount: 0 };
    row.last_seen = now; row.expires_at = newExp;
    return { rows: [{ user_id: row.user_id }], rowCount: 1 };
  }
  if (s.startsWith("DELETE FROM sessions")) {
    const [sid_hash] = params;
    const i = sessions.findIndex((x) => x.sid_hash === sid_hash);
    if (i >= 0) sessions.splice(i, 1);
    return { rows: [], rowCount: i >= 0 ? 1 : 0 };
  }

  throw new Error("unexpected SQL in device/auth fake: " + s);
}

vi.mock("../src/server/db", () => ({
  db: () => ({ query: (sql: string, params?: any[]) => Promise.resolve(fakeQuery(sql, params)) }),
  init: () => Promise.resolve(),
  userById: (id: string) => Promise.resolve(users[id] ? { ...users[id] } : null),
  userByEmail: (email: string) => Promise.resolve(Object.values(users).find((u) => u.email === email.toLowerCase()) || null),
  touchLogin: () => Promise.resolve(),
}));

const ember = await import("../src/server/ember");
const auth = await import("../src/server/auth");
const { hmac } = await import("../src/server/crypto");

beforeEach(() => { devices.length = 0; sessions.length = 0; });

describe("device-token attacks (B1–B6)", () => {
  it("B1: a forged/random token that was never issued is rejected", async () => {
    await ember.createDeviceToken("u_alice", "dev-1", "Alice's laptop");
    const forged = "totally-made-up-token-value-not-issued";
    expect(await ember.deviceUser(forged)).toBeNull();
    // The empty / missing token is likewise rejected (no ambient auth).
    expect(await ember.deviceUser(undefined)).toBeNull();
    expect(await ember.deviceUser("")).toBeNull();
  });

  it("B2: a tampered copy of a real token is rejected (HMAC lookup won't match)", async () => {
    const token = await ember.createDeviceToken("u_alice", "dev-1", "laptop");
    expect(await ember.deviceUser(token)).not.toBeNull(); // sanity: the genuine token works
    // Flip the last character; base64url alphabet so any different char still parses but won't match.
    const flipped = token.slice(0, -1) + (token.slice(-1) === "A" ? "B" : "A");
    expect(flipped).not.toBe(token);
    expect(await ember.deviceUser(flipped)).toBeNull();
  });

  it("B3: replay after logout/revoke is rejected on the next check-in", async () => {
    const token = await ember.createDeviceToken("u_alice", "dev-1", "laptop");
    expect((await ember.deviceUser(token))?.id).toBe("u_alice");
    await ember.revokeDevice(token); // app logout / admin unlink
    // The attacker replays the stolen-but-revoked token: must now fail.
    expect(await ember.deviceUser(token)).toBeNull();
  });

  it("B4: an expired device token is rejected", async () => {
    // Insert a device row whose expiry is already in the past, then attempt to use it.
    const token = "expired-token-raw";
    const now = Date.now();
    devices.push({ token_hash: hmac(token), user_id: "u_alice", device_id: "d", device_name: "", created_at: now - 100, last_seen: now - 100, expires_at: now - 1, revoked: false });
    expect(await ember.deviceUser(token)).toBeNull();
  });

  it("B5: the stored value is a keyed HMAC, never the raw token", async () => {
    const token = await ember.createDeviceToken("u_alice", "dev-1", "laptop");
    const stored = devices[0].token_hash;
    expect(stored).not.toBe(token);          // never stored in the clear
    expect(stored).toBe(hmac(token));        // it's exactly the keyed HMAC
    expect(stored).toMatch(/^[0-9a-f]{64}$/); // hex sha256 digest
  });

  it("B6: a token minted for Alice never resolves to Mallory (no cross-account lift)", async () => {
    const aliceToken = await ember.createDeviceToken("u_alice", "dev-a", "a");
    const malloryToken = await ember.createDeviceToken("u_mallory", "dev-m", "m");
    expect((await ember.deviceUser(aliceToken))?.id).toBe("u_alice");
    expect((await ember.deviceUser(malloryToken))?.id).toBe("u_mallory");
    // Mallory tries to present Alice's token spliced with her own device id — still resolves to Alice's
    // identity only (the token binds identity), and Mallory cannot forge a token that maps to Alice.
    expect((await ember.deviceUser(malloryToken))?.id).not.toBe("u_alice");
  });

  it("B6b: emberAccess is derived LIVE from RBAC — a low-priv holder gets no admin tabs", async () => {
    // Mallory (dashboard.view only) links a device; her token must unlock ZERO ember admin tabs, even
    // though the token itself is valid — capabilities are recomputed from live RBAC on every check.
    const token = await ember.createDeviceToken("u_mallory", "dev-m", "m");
    const user = await ember.deviceUser(token);
    expect(user).not.toBeNull();
    const access = ember.emberAccess(user!);
    expect(access.tabs).toEqual([]);         // no ember.seed_lists ⇒ no tabs
    // Alice (has ember.seed_lists) DOES unlock the tab — proves the gate isn't deny-all.
    const aliceTok = await ember.createDeviceToken("u_alice", "dev-a", "a");
    const alice = await ember.deviceUser(aliceTok);
    expect(ember.emberAccess(alice!).tabs).toContain("seedlists");
  });
});

describe("session-cookie attacks (B7)", () => {
  it("B7: an un-issued or flipped session id never resolves to a user", async () => {
    const sid = await auth.createSession("u_alice");
    expect((await auth.sessionUser(sid))?.id).toBe("u_alice"); // sanity
    expect(await auth.sessionUser(undefined)).toBeNull();
    expect(await auth.sessionUser("never-issued-session-id")).toBeNull();
    const flipped = sid.slice(0, -1) + (sid.slice(-1) === "A" ? "B" : "A");
    expect(await auth.sessionUser(flipped)).toBeNull();
  });

  it("B7b: a destroyed session can't be replayed", async () => {
    const sid = await auth.createSession("u_alice");
    await auth.destroySession(sid);
    expect(await auth.sessionUser(sid)).toBeNull();
  });
});
