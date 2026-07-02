// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Shared chat WebSocket server for the PYRAX Devnet Portal + Team site. Auth is a short-lived
// HMAC chat token (DEVNET_CHAT_SECRET) minted by either app; messages persist in devnet_tester.
// Channels, presence, @mentions (client highlights), GIFs, admin delete, rate limiting.
//   env: DATABASE_URL_DEVNET, DEVNET_CHAT_SECRET, CHAT_WS_PORT (default 8788)
import crypto from "node:crypto";
import http from "node:http";
import { WebSocketServer } from "ws";
import pg from "pg";

// --- Sentinel crash telemetry (server-operated path) -------------------------------------------
// This process runs on the droplet, so it uses the agent-secret ingest: POST ${SENTINEL_INGEST_URL}
// /api/errors with Authorization: Bearer ${NOVA_AGENT_SECRET}. Reports are DIAGNOSTIC-ONLY (an error
// CLASS + a fixed context string) — NEVER a chat body, token, tester id, or DB row (this DB holds
// tester identity + messages). Fail-open: a no-op when unconfigured; every failure is swallowed;
// bounded ~10s; deduped/throttled to one report per signature per 15 min with an occurrence count.
const SENTINEL_BASE = (process.env.SENTINEL_INGEST_URL || "https://status.pyraxchain.com").replace(/\/+$/, "");
const SENTINEL_SECRET = process.env.NOVA_AGENT_SECRET || "";
const SENTINEL_SOURCE = "devnet-chat";
const SENTINEL_THROTTLE_MS = 15 * 60 * 1000;
const sentinelWindows = new Map();
function sentinelReport(kind, err) {
  if (!SENTINEL_SECRET) return; // silent no-op when unconfigured
  try {
    const cls = (err && err.constructor && String(err.constructor.name).slice(0, 60)) || "Error";
    const sig = `${SENTINEL_SOURCE}|${kind}|${cls}`;
    const now = Date.now();
    const w = sentinelWindows.get(sig);
    if (w && now - w.firstTs < SENTINEL_THROTTLE_MS) { w.count += 1; return; } // accrue within the window
    const prevCount = w ? w.count : 0;
    sentinelWindows.set(sig, { firstTs: now, count: 1 });
    const count = prevCount + 1;
    const title = `${cls} in ${SENTINEL_SOURCE}:${kind}${count > 1 ? ` (x${count})` : ""}`.slice(0, 200);
    // No message/stack: a chat DB error or token-verify failure can embed identity/message data.
    const detail = `${cls} during ${kind} (message/stack withheld — this service handles tester `
      + `identity, chat tokens, and chat messages).`;
    fetch(`${SENTINEL_BASE}/api/errors`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SENTINEL_SECRET}` },
      body: JSON.stringify({ source: SENTINEL_SOURCE, title, detail, level: "error", droplet: process.env.HOSTNAME || undefined }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => {}); // best-effort; never surfaced
  } catch { /* telemetry must never break the chat server */ }
}

// Fail-closed: in production the chat secret MUST be set to a real, non-default value. An unset secret
// (or the public dev placeholder) would let anyone forge a chat token, so we refuse to start.
const DEV_DEFAULT = "dev-chat-secret-change-me";
const RAW_SECRET = process.env.DEVNET_CHAT_SECRET || "";
if ((!RAW_SECRET || RAW_SECRET === DEV_DEFAULT) && process.env.NODE_ENV === "production") {
  console.error("[chat] FATAL: DEVNET_CHAT_SECRET must be set to a non-default value in production.");
  process.exit(1);
}
const SECRET = RAW_SECRET || DEV_DEFAULT;
const MAX_CLAIM = 64;
const clampClaim = (v) => (typeof v === "string" ? v.slice(0, MAX_CLAIM) : "");
const PORT = Number(process.env.CHAT_WS_PORT || 8788);
const CHANNELS = ["announcements", "general", "getting-started", "node-support", "bug-chat", "feedback", "known-issues", "off-topic"];
const cs = (process.env.DATABASE_URL_DEVNET || "").replace(/[?&]sslmode=[^&]*/, "");
const pool = new pg.Pool({ connectionString: cs, ssl: { rejectUnauthorized: false }, max: 4 });
const id = (p) => `${p}_${crypto.randomBytes(8).toString("base64url")}`;

function verify(token) {
  const [body, sig] = (token || "").split(".");
  if (!body || !sig) return null;
  const expect = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const c = JSON.parse(Buffer.from(body, "base64url").toString());
    // Reject a missing/non-numeric exp (a bare `c.exp < now` would treat undefined/NaN as valid),
    // mirroring src/lib/chat-token.ts so the two verifiers agree.
    if (!c || typeof c.exp !== "number" || c.exp < Math.floor(Date.now() / 1000)) return null;
    // Clamp identity claims defensively (mirrors src/lib/chat-token.ts).
    c.name = clampClaim(c.name); c.user = clampClaim(c.user); c.uid = clampClaim(c.uid);
    return c;
  } catch (e) {
    // A VALID HMAC over an UN-parseable body is anomalous (a mismatched signer / corrupt token),
    // not a routine bad token — report the class only (never the token bytes). A bad signature
    // returned above is expected/benign and is intentionally NOT reported.
    sentinelReport("token.verify", e);
    return null;
  }
}

// Plain HTTP server so the droplet monitor can name-check the chat service at GET /health; the
// WebSocket server shares this same port via the upgrade handshake.
const httpServer = http.createServer((req, res) => {
  if (req.method === "GET" && (req.url === "/health" || req.url === "/healthz")) {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify({ ok: true, service: "pyrax-devnet-chat", clients: wss.clients.size, channels: CHANNELS.length }));
    return;
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});
const wss = new WebSocketServer({ server: httpServer });
const send = (ws, obj) => { try { ws.send(JSON.stringify(obj)); } catch {} };
const broadcast = (channel, obj) => { for (const c of wss.clients) if (c.readyState === 1 && c.channel === channel) send(c, obj); };
function presence(channel) {
  const seen = new Map();
  for (const c of wss.clients) if (c.readyState === 1 && c.channel === channel && c.claims) seen.set(c.claims.user || c.claims.uid, { user: c.claims.user, name: c.claims.name, admin: c.claims.admin, role: c.claims.role });
  return [...seen.values()];
}
const pushPresence = (channel) => broadcast(channel, { type: "presence", channel, users: presence(channel) });

// Public channels are open; private conversation ids require membership.
async function canAccess(channel, uid) {
  if (CHANNELS.includes(channel)) return true;
  const r = await pool.query("SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND member_id=$2", [channel, uid]);
  return (r.rowCount ?? 0) > 0;
}
// Global online roster (everyone connected, deduped) — drives the chat members panel.
function globalOnline() {
  const seen = new Map();
  for (const c of wss.clients) if (c.readyState === 1 && c.claims) seen.set(c.claims.user || c.claims.uid, { user: c.claims.user, name: c.claims.name, admin: c.claims.admin, role: c.claims.role });
  return [...seen.values()];
}
function broadcastOnline() { const u = globalOnline(); for (const c of wss.clients) if (c.readyState === 1) send(c, { type: "online", users: u }); }

async function history(channel) {
  const r = await pool.query("SELECT id,channel,author_id,author_name,author_user,author_admin,author_role,body,gif,created_at FROM chat_messages WHERE channel=$1 AND deleted=FALSE ORDER BY created_at DESC LIMIT 50", [channel]);
  return r.rows.reverse();
}

// --- NEURAX Sentinel in chat -------------------------------------------------------------------
// The on-GPU brain answers @Sentinel / slash commands and passively moderates. Reached server-side
// the same way the team portal does: POST ${SENTINEL_BACKEND_URL}/api/nova/ask with a bearer service
// secret. Fully INERT (a no-op) until SENTINEL_ADMIN_SECRET is set — @mentions just post as plain text.
const BRAIN_BASE = (process.env.SENTINEL_BACKEND_URL || "https://status.pyraxchain.com").replace(/\/+$/, "");
const BRAIN_SECRET = process.env.SENTINEL_ADMIN_SECRET || "";
const SENTINEL_ON = !!BRAIN_SECRET;
const BRAIN_TIMEOUT_MS = 130_000; // matches the team proxy (nova's infer timeout is 120s)
const SENTINEL_BOT = { uid: "sentinel", name: "NEURAX Sentinel", user: "Sentinel", role: "sentinel" };
const SENTINEL_SYSTEM = "You are NEURAX Sentinel, the PYRAX network's on-GPU AI assistant, replying inside a team/tester chat. Be concise, accurate, and friendly — a few sentences suited to chat. If you are unsure, say so.";
const sentinelBusy = new Set(); // channels with a public request in flight (protects the single GPU)

async function brainAsk(question, context) {
  const r = await fetch(`${BRAIN_BASE}/api/nova/ask`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${BRAIN_SECRET}` },
    body: JSON.stringify({ question: String(question).slice(0, 8000), context: context ? String(context).slice(0, 12000) : undefined }),
    signal: AbortSignal.timeout(BRAIN_TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`brain HTTP ${r.status}`);
  const j = await r.json().catch(() => ({}));
  return String(j?.answer ?? "").trim();
}

// A message is a Sentinel request if it @mentions Sentinel or uses a slash command. `draft` is a
// private team affordance (never broadcast); the rest post a public Sentinel reply to the channel.
function parseSentinelCommand(body) {
  const t = (body || "").trim();
  let m = t.match(/^\/(ask|summarize|catchup|catch-up|draft|moderate)\b[:,]?\s*([\s\S]*)$/i);
  if (m) {
    const cmd = m[1].toLowerCase();
    const arg = (m[2] || "").trim();
    if (cmd === "ask") return { kind: "ask", arg };
    if (cmd === "summarize" || cmd === "catchup" || cmd === "catch-up") return { kind: "summarize", arg };
    if (cmd === "draft") return { kind: "draft", arg };
    if (cmd === "moderate") return { kind: "moderate", arg };
  }
  m = t.match(/^@sentinel\b[:,]?\s*([\s\S]*)$/i);
  if (m) return { kind: "ask", arg: m[1].trim() };
  if (/(^|\s)@sentinel\b/i.test(t)) return { kind: "ask", arg: t.replace(/@sentinel\b[:,]?/i, " ").trim() };
  return null;
}

// Fast, brain-free heuristics so admins get an INSTANT moderation alert on obvious problems. Kept
// conservative (security-relevant + spam) to avoid noise; a deeper review is available via /moderate.
function heuristicFlags(body) {
  const flags = [];
  const s = String(body || "");
  const low = s.toLowerCase();
  if (/\b(0x)?[0-9a-f]{64}\b/i.test(s)) flags.push("possible private key / secret");
  if (/(seed|mnemonic|recovery)\s*(phrase|words)?/.test(low) && (s.match(/\b[a-z]{3,}\b/gi) || []).length >= 12) flags.push("possible seed phrase");
  if (/\b(free|claim|airdrop|giveaway|double your|1000x|guaranteed)\b[\s\S]{0,50}(https?:\/\/|t\.me\/|discord\.gg\/|\.io\b|\.xyz\b)/i.test(s)) flags.push("possible scam / phishing");
  if ((s.match(/@\w+/g) || []).length >= 6) flags.push("mass mention");
  if (/(.)\1{18,}/.test(s)) flags.push("spam (repeated characters)");
  if ((s.match(/https?:\/\//g) || []).length >= 4) flags.push("link flood");
  return flags;
}
function alertAdmins(channel, alert) {
  for (const c of wss.clients) if (c.readyState === 1 && c.channel === channel && c.claims && c.claims.admin) send(c, { type: "modalert", ...alert });
}

// Recent channel transcript (oldest→newest) as compact context for the brain.
async function recentContext(channel, limit = 30) {
  const rows = await history(channel);
  return rows.slice(-limit).map((r) => `${r.author_name || r.author_user || "user"}${r.author_admin ? " (team)" : ""}: ${r.body || (r.gif ? "[gif]" : "")}`).join("\n");
}

async function postSentinel(channel, body) {
  const msg = { id: id("m"), channel, author_id: SENTINEL_BOT.uid, author_name: SENTINEL_BOT.name, author_user: SENTINEL_BOT.user, author_admin: false, author_role: SENTINEL_BOT.role, body: String(body || "").slice(0, 4000), gif: null, created_at: Date.now() };
  await pool.query("INSERT INTO chat_messages (id,channel,author_id,author_name,author_user,author_admin,author_role,body,gif,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
    [msg.id, msg.channel, msg.author_id, msg.author_name, msg.author_user, msg.author_admin, msg.author_role, msg.body, null, msg.created_at]);
  broadcast(channel, { type: "msg", message: msg });
}

async function handleSentinelPublic(channel, claims, cmd) {
  if (sentinelBusy.has(channel)) { await postSentinel(channel, "One moment — I'm still working on the previous request in this channel.").catch(() => {}); return; }
  sentinelBusy.add(channel);
  broadcast(channel, { type: "sentinel", channel, state: "thinking" });
  try {
    let answer = "";
    if (cmd.kind === "ask") {
      if (!cmd.arg) answer = "Hi — I'm NEURAX Sentinel. Ask me anything about PYRAX, the devnet, your node, mining, or this chat: just mention @Sentinel with a question, or use /summarize to catch up.";
      else answer = await brainAsk(`${SENTINEL_SYSTEM}\n\nChannel: #${channel}. ${claims.name || "A member"} asked:\n${cmd.arg}`, `Recent messages in #${channel}:\n${await recentContext(channel, 24)}`);
    } else if (cmd.kind === "summarize") {
      const n = Math.min(100, Math.max(5, parseInt(cmd.arg, 10) || 40));
      const ctx = await recentContext(channel, n);
      answer = ctx.trim()
        ? await brainAsk(`${SENTINEL_SYSTEM}\n\nSummarize the recent activity in #${channel} as a short catch-up: key topics, decisions, open questions, and anything needing attention. Use tight bullet points.`, `Recent messages in #${channel} (oldest first):\n${ctx}`)
        : "There's nothing to summarize here yet.";
    } else if (cmd.kind === "moderate") {
      const ctx = await recentContext(channel, 30);
      answer = ctx.trim()
        ? await brainAsk(`${SENTINEL_SYSTEM}\n\nModerating #${channel}: review the recent messages for spam, harassment, scams/phishing, leaked secrets (private keys/seed phrases), or disruption. List only real concerns as "@user — reason"; if all clear, say so in one line.`, `Recent messages in #${channel}:\n${ctx}`)
        : "Nothing to review yet.";
    }
    await postSentinel(channel, answer || "I couldn't come up with an answer just now — please try again in a moment.");
  } catch (e) {
    sentinelReport("sentinel.public", e);
    await postSentinel(channel, "⚠️ I couldn't reach the Sentinel brain just now. Please try again shortly.").catch(() => {});
  } finally {
    sentinelBusy.delete(channel);
    broadcast(channel, { type: "sentinel", channel, state: "idle" });
  }
}

async function handleSentinelDraft(ws, channel, arg) {
  send(ws, { type: "sentinel", channel, state: "thinking" });
  try {
    const ctx = await recentContext(channel, 20);
    const want = arg
      ? `Draft a reply I (a PYRAX team member) can send in #${channel}. What I want to convey: ${arg}. Return only the message text, ready to send — friendly, clear, on-brand.`
      : `Draft a helpful reply I (a PYRAX team member) can send next in #${channel}, responding to the most recent messages. Return only the message text, ready to send.`;
    const text = await brainAsk(`${SENTINEL_SYSTEM}\n\n${want}`, `Recent messages in #${channel}:\n${ctx}`);
    send(ws, { type: "draft", channel, text: text || "" });
  } catch (e) {
    sentinelReport("sentinel.draft", e);
    send(ws, { type: "draft", channel, text: "", error: "Sentinel is unavailable right now." });
  } finally {
    send(ws, { type: "sentinel", channel, state: "idle" });
  }
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://x");
  const claims = verify(url.searchParams.get("token"));
  if (!claims) { send(ws, { type: "error", error: "auth" }); ws.close(); return; }
  ws.claims = claims; ws.channel = "general"; ws.times = [];
  send(ws, { type: "ready", me: { user: claims.user, name: claims.name, admin: claims.admin }, channels: CHANNELS });
  history("general").then((m) => send(ws, { type: "history", channel: "general", messages: m }), (e) => sentinelReport("db.history", e));
  pushPresence("general");
  broadcastOnline();

  ws.on("message", async (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    try {
    if (m.type === "join" && typeof m.channel === "string") {
      if (!(await canAccess(m.channel, claims.uid))) { send(ws, { type: "error", error: "No access to that conversation." }); return; }
      const prev = ws.channel; ws.channel = m.channel;
      send(ws, { type: "history", channel: m.channel, messages: await history(m.channel) });
      pushPresence(prev); pushPresence(m.channel);
    } else if (m.type === "msg") {
      if (!(await canAccess(ws.channel, claims.uid))) return;
      const now = Date.now();
      ws.times = ws.times.filter((t) => now - t < 60000);
      if (ws.times.length >= 20 || (ws.times.length && now - ws.times[ws.times.length - 1] < 700)) { send(ws, { type: "error", error: "Slow down a moment." }); return; }
      ws.times.push(now);
      const body = String(m.body || "").slice(0, 2000).trim();
      const gif = typeof m.gif === "string" && /^https:\/\//.test(m.gif) ? m.gif.slice(0, 500) : null;
      if (!body && !gif) return;
      const cmd = SENTINEL_ON && body ? parseSentinelCommand(body) : null;
      // /draft is a private team affordance — never broadcast the request; reply only to the requester.
      if (cmd && cmd.kind === "draft") {
        if (!claims.admin) { send(ws, { type: "error", error: "Draft is available to team members only." }); return; }
        handleSentinelDraft(ws, ws.channel, cmd.arg).catch((e) => sentinelReport("sentinel.draft", e));
        return;
      }
      const msg = { id: id("m"), channel: ws.channel, author_id: claims.uid, author_name: claims.name, author_user: claims.user, author_admin: !!claims.admin, author_role: claims.role || "tester", body, gif, created_at: now };
      await pool.query("INSERT INTO chat_messages (id,channel,author_id,author_name,author_user,author_admin,author_role,body,gif,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [msg.id, msg.channel, msg.author_id, msg.author_name, msg.author_user, msg.author_admin, msg.author_role, body, gif, now]);
      broadcast(ws.channel, { type: "msg", message: msg });
      // Route @Sentinel / slash commands to the brain (async — the reply posts when it's ready).
      if (cmd) handleSentinelPublic(ws.channel, claims, cmd).catch((e) => sentinelReport("sentinel.public", e));
      // Passive moderation on ordinary member messages (skip bot commands + team/staff posts).
      else if (body && !claims.admin) {
        const flags = heuristicFlags(body);
        if (flags.length) alertAdmins(ws.channel, { channel: ws.channel, messageId: msg.id, author_name: msg.author_name, author_user: msg.author_user, snippet: body.slice(0, 160), flags, created_at: now });
      }
    } else if (m.type === "delete" && claims.admin) {
      await pool.query("UPDATE chat_messages SET deleted=TRUE WHERE id=$1", [m.id]);
      broadcast(ws.channel, { type: "deleted", id: m.id });
    }
    } catch (e) { console.error("[chat] message error:", e?.message || e); sentinelReport("db.message", e); try { send(ws, { type: "error", error: "Something went wrong." }); } catch {} }
  });
  ws.on("close", () => { pushPresence(ws.channel); broadcastOnline(); });
});

// A pg Pool emits 'error' when an IDLE client's connection drops (a real DB failure the query-path
// try/catch can't see). Log it (default) + report the class to Sentinel. Without a listener pg would
// crash the process, so this also keeps the chat server up through transient DB blips.
pool.on("error", (e) => { console.error("[chat] pool error:", e?.message || e); sentinelReport("db.pool", e); });
process.on("unhandledRejection", (e) => { console.error("[chat] unhandledRejection:", e?.message || e); sentinelReport("unhandledRejection", e); });
httpServer.listen(PORT, () => console.log(`[chat] WebSocket chat server listening on :${PORT} (channels: ${CHANNELS.join(", ")}; health: GET /health)`));
