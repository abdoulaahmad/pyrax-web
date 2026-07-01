// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Minimal Node WebSocket-server framing for the self-hosted PYRAX tunnel relay.
// Handshake + single-frame text/close/ping — zero dependencies (pure Node built-ins),
// matching the rest of the pyrax-web Node services. Ported from the retired worker's
// `ws-node.mjs`.

import { createHash } from "node:crypto";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

// Hard caps against an unauthenticated OOM. A tunnel-mux text frame is a small JSON
// envelope (an HTTP request/response chunk is base64 inside it), so a couple of MiB is
// already far above any legitimate frame — anything larger is hostile. Two independent
// bounds are enforced:
//   • MAX_FRAME_BYTES — reject a single frame that DECLARES a payload larger than this
//     (a client that announces a multi-GB length then dribbles bytes can never wedge us
//     into buffering that much), and
//   • MAX_BUFFER_BYTES — cap the total un-parsed accumulation, so a stream of never-
//     completing partial frames can't grow the per-connection buffer without bound.
// On either overflow the frame decoder signals `fatal` and the socket is destroyed.
export const MAX_FRAME_BYTES = 2 * 1024 * 1024; // 2 MiB per declared frame payload
export const MAX_BUFFER_BYTES = 4 * 1024 * 1024; // 4 MiB of un-parsed accumulation

export function wsAccept(key) {
  return createHash("sha1")
    .update(key + GUID)
    .digest("base64");
}

/** One unmasked server→client frame (default opcode 0x1 = text). */
export function encodeFrame(data, opcode = 0x1) {
  const payload = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x80 | opcode, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

/** Decode whole masked client→server frames; returns leftover partial bytes. Sets
 *  `fatal:true` when a frame declares a payload larger than MAX_FRAME_BYTES — the caller
 *  MUST destroy the socket in that case (an attacker who announces a huge length then
 *  dribbles bytes would otherwise force us to buffer the whole payload). */
export function decodeFrames(buf) {
  const texts = [];
  const pings = [];
  let closed = false;
  let fatal = false;
  let off = 0;
  while (off + 2 <= buf.length) {
    const b1 = buf[off + 1];
    const opcode = buf[off] & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let p = off + 2;
    if (len === 126) {
      if (p + 2 > buf.length) break;
      len = buf.readUInt16BE(p);
      p += 2;
    } else if (len === 127) {
      if (p + 8 > buf.length) break;
      len = Number(buf.readBigUInt64BE(p));
      p += 8;
    }
    // A frame that DECLARES more than the cap is rejected before we wait for (or allocate)
    // its bytes — this is the OOM guard against "announce a multi-GB length, trickle bytes".
    if (!Number.isSafeInteger(len) || len < 0 || len > MAX_FRAME_BYTES) {
      fatal = true;
      break;
    }
    let mask = null;
    if (masked) {
      if (p + 4 > buf.length) break;
      mask = buf.subarray(p, p + 4);
      p += 4;
    }
    if (p + len > buf.length) break;
    let payload = buf.subarray(p, p + len);
    if (mask) {
      const out = Buffer.allocUnsafe(len);
      for (let i = 0; i < len; i++) out[i] = payload[i] ^ mask[i & 3];
      payload = out;
    }
    p += len;
    off = p;
    if (opcode === 0x1) texts.push(payload.toString("utf8"));
    else if (opcode === 0x8) closed = true;
    else if (opcode === 0x9) pings.push(Buffer.from(payload));
  }
  return { texts, pings, closed, fatal, rest: buf.subarray(off) };
}

/** Complete the WS handshake on a raw upgrade socket and return a text-message `Sock`
 *  plus `onText`/`onClose` registrars. */
export function acceptUpgrade(req, socket) {
  const key = req.headers["sec-websocket-key"];
  socket.write(
    `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${wsAccept(key)}\r\n\r\n`,
  );
  let buffer = Buffer.alloc(0);
  let alive = true;
  const textCbs = [];
  const closeCbs = [];
  const fireClose = () => {
    if (!alive) return;
    alive = false;
    for (const cb of closeCbs) cb();
  };
  const sock = {
    send: (t) => {
      if (alive) socket.write(encodeFrame(t));
    },
    close: () => {
      if (alive) {
        alive = false;
        try {
          socket.end(encodeFrame("", 0x8));
        } catch {
          /* already gone */
        }
      }
    },
  };
  const destroy = () => {
    fireClose();
    try {
      socket.destroy();
    } catch {
      /* already gone */
    }
  };
  socket.on("data", (chunk) => {
    if (!alive) return;
    buffer = Buffer.concat([buffer, chunk]);
    // Total un-parsed accumulation cap: a stream of never-completing partial frames (or a
    // single oversized frame whose bytes are still arriving) cannot grow this buffer past
    // the bound. Kill the connection rather than keep buffering.
    if (buffer.length > MAX_BUFFER_BYTES) {
      destroy();
      return;
    }
    const { texts, pings, closed, fatal, rest } = decodeFrames(buffer);
    buffer = rest;
    // A frame that declared an over-cap length is fatal — drop the socket immediately.
    if (fatal) {
      destroy();
      return;
    }
    for (const p of pings) socket.write(encodeFrame(p, 0xa));
    for (const t of texts) for (const cb of textCbs) cb(t);
    if (closed) {
      fireClose();
      try {
        socket.end();
      } catch {
        /* already gone */
      }
    }
  });
  socket.on("close", fireClose);
  socket.on("error", fireClose);
  return { sock, onText: (cb) => textCbs.push(cb), onClose: (cb) => closeCbs.push(cb) };
}
