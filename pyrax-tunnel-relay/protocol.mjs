// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// PYRAX node-portal tunnel — the runtime-agnostic core (self-hosted relay).
//
// Each PYRAX node dials a single OUTBOUND WebSocket to this relay (so it works behind
// NAT) and registers its subdomain id = first-12-hex of SHA-256(peerId). The relay then
// proxies every browser request for `https://<id>.nodes.pyraxchain.com` over that one
// tunnel: HTTP requests and the portal's control WebSocket are MULTIPLEXED by an integer
// stream id. This is the wire protocol + the `TunnelHub` mux, written against a tiny
// `Sock` interface so the same logic is transport-agnostic.
//
// Ported verbatim (types stripped) from the retired Cloudflare Worker's
// `pyrax-tunnel-worker/src/protocol.ts` — this self-hosted copy is now canonical.
//
// Security: the relay never holds tokens. The browser's `?token=` rides through in the
// WS path; the NODE (agent) validates it against its portal before accepting, because
// tunneled traffic reaches the local portal as loopback (which is trusted).

const HTTP_TIMEOUT_MS = 20_000;
/** Cap concurrent in-flight streams per node so a misbehaving/hostile browser swarm
 *  can't exhaust the relay's memory. */
const MAX_STREAMS = 256;

/** A node's public subdomain id parsed from the Host header. Accepts the prod wildcard
 *  `<id>.nodes.pyraxchain.com` and `<id>.localhost` (browsers resolve `*.localhost` to
 *  loopback, so local dev mirrors prod with no DNS/hosts edits). */
export function nodeIdFromHost(host) {
  if (!host) return null;
  const h = String(host).split(":")[0].toLowerCase();
  const m = h.match(/^([0-9a-f]{4,64})\.(?:nodes\.pyraxchain\.com|localhost)$/);
  return m ? m[1] : null;
}

/** Multiplexes browser HTTP + WS over ONE agent tunnel for a single node id. */
export class TunnelHub {
  #agent = null;
  #seq = 1;
  #pendingHttp = new Map();
  #browserWs = new Map();
  #onAgentChange;

  constructor(opts) {
    this.#onAgentChange = opts?.onAgentChange;
  }

  hasAgent() {
    return this.#agent !== null;
  }

  /** Attach (or replace) the node agent's tunnel socket. */
  setAgent(sock) {
    if (this.#agent && this.#agent !== sock) this.#agent.close();
    this.#agent = sock;
    this.#onAgentChange?.(true);
  }

  /** Detach `sock` if it is the current agent; fail every in-flight stream. */
  dropAgent(sock) {
    if (this.#agent !== sock) return; // a stale close from a replaced agent
    this.#agent = null;
    for (const resolve of this.#pendingHttp.values()) resolve({ status: 502, headers: {}, body: null });
    this.#pendingHttp.clear();
    for (const b of this.#browserWs.values()) b.close();
    this.#browserWs.clear();
    this.#onAgentChange?.(false);
  }

  /** Send a keepalive ping to the agent (kept alive through the Cloudflare proxy). */
  ping() {
    this.#agent?.send(JSON.stringify({ t: "ping" }));
  }

  /** Feed one JSON message received FROM the agent. */
  handleAgent(text) {
    let m;
    try {
      m = JSON.parse(text);
    } catch {
      return;
    }
    // `JSON.parse` accepts bare `null`/numbers/strings/arrays as valid documents; ignore any
    // non-object envelope so a hostile/buggy agent frame (e.g. the literal `null`) can't crash
    // the message loop by dereferencing a field on a non-object.
    if (m === null || typeof m !== "object") return;
    if (m.t === "res") {
      const resolve = this.#pendingHttp.get(m.id);
      if (resolve) {
        this.#pendingHttp.delete(m.id);
        resolve({ status: m.status, headers: m.headers ?? {}, body: m.body ?? null });
      }
    } else if (m.t === "wsmsg") {
      this.#browserWs.get(m.id)?.send(m.data);
    } else if (m.t === "wsclose" || (m.t === "wsopen" && !m.ok)) {
      const b = this.#browserWs.get(m.id);
      if (b) {
        this.#browserWs.delete(m.id);
        b.close();
      }
    }
    // "pong" needs no action; the keepalive is the round-trip itself.
  }

  /** Proxy a browser HTTP request to the node; resolves with its response. When
   *  `targetPort` is given (the opt-in /rpc route), the agent proxies it to that loopback
   *  port instead of the default portal — RPC shares this same stream pool. */
  http(method, path, headers, body, targetPort) {
    if (!this.#agent) return Promise.resolve({ status: 502, headers: {}, body: null });
    if (this.#pendingHttp.size + this.#browserWs.size >= MAX_STREAMS) {
      return Promise.resolve({ status: 503, headers: {}, body: null });
    }
    const id = this.#seq++;
    const agent = this.#agent;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.#pendingHttp.delete(id)) resolve({ status: 504, headers: {}, body: null });
      }, HTTP_TIMEOUT_MS);
      this.#pendingHttp.set(id, (r) => {
        clearTimeout(timer);
        resolve(r);
      });
      const msg =
        targetPort === undefined
          ? { t: "req", id, method, path, headers, body }
          : { t: "req", id, method, path, headers, body, targetPort };
      agent.send(JSON.stringify(msg));
    });
  }

  /** Proxy a browser WebSocket to the node. `browser` is the relay's socket to the
   *  browser; returns handlers the transport calls when the browser speaks/closes. */
  openWs(browser, path) {
    const noop = { onMessage: () => {}, onClose: () => {} };
    if (!this.#agent || this.#browserWs.size + this.#pendingHttp.size >= MAX_STREAMS) {
      browser.close();
      return noop;
    }
    const id = this.#seq++;
    const agent = this.#agent;
    this.#browserWs.set(id, browser);
    agent.send(JSON.stringify({ t: "wsopen", id, path }));
    return {
      onMessage: (data) => {
        if (this.#browserWs.has(id)) agent.send(JSON.stringify({ t: "wsmsg", id, data }));
      },
      onClose: () => {
        if (this.#browserWs.delete(id)) agent.send(JSON.stringify({ t: "wsclose", id }));
      },
    };
  }

  /** Live stream count (in-flight HTTP + open browser WS) — for tests/metrics. */
  get streamCount() {
    return this.#pendingHttp.size + this.#browserWs.size;
  }
}
