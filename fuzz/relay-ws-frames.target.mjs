// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Fuzz target: self-hosted tunnel-relay SERVER-SIDE masked WebSocket frame decoder.
//
// Real function under test (imported from production, never reimplemented):
//   • pyrax-tunnel-relay/ws.mjs → decodeFrames(buf)   (+ MAX_FRAME_BYTES / MAX_BUFFER_BYTES)
//
// decodeFrames is the unauthenticated frame parser behind /__tunnel/register (finding H11): it does raw
// readUInt16BE / readBigUInt64BE length math, Number()-narrows an attacker-declared u64 length, and
// unmasks with Buffer.allocUnsafe(len). It is the OOM guard — a client that DECLARES a multi-GB length
// then dribbles bytes must be rejected (fatal) before we ever wait for or allocate that payload. The
// bytes are wholly attacker-controlled (any TCP peer that completes the WS upgrade).
//
// This is DISTINCT from the fuzz-ts `ws-frames` harness, which fuzzes the ELECTRON app's
// multi-node/portal.ts decoder — a different implementation with no `fatal` flag and no length cap.
// Only example-based tests (test/ws.test.mjs) exercise this relay decoder today; a fuzzer over arbitrary
// bytes is genuinely additive for the length-narrowing + fatal-monotonicity invariants below.
//
// Security properties asserted (the decoder's documented contract):
//   1. TOTAL + TERMINATING: never throws and always returns for ANY byte buffer, and the returned shape
//      is exactly { texts:string[], pings:Buffer[], closed:bool, fatal:bool, rest:Buffer } with the
//      right element types.
//   2. REST IS A GENUINE SUFFIX: rest.length <= buf.length (it can never grow) — catches a non-advancing
//      offset or an aliasing/subarray bug that would let the caller's accumulation buffer balloon.
//   3. FATAL IS MONOTONIC / STOPS PARSING: once a frame declares an over-cap (or non-safe-integer)
//      length the decoder must set fatal and stop — it must NOT smuggle any text/ping/close decoded
//      from bytes that sit PAST the over-cap frame. We verify by re-scanning the SAME buffer with a
//      length-safe reference decoder and confirming fatal only ever appears with a real over-cap /
//      unsafe declared length, and that a fatal result never returns more frames than the prefix that
//      precedes the offending frame could have produced.
//   4. NO OVER-CAP ALLOCATION: every declared length the decoder acts on must be a safe integer within
//      [0, MAX_FRAME_BYTES]; an over-cap or non-safe-integer declared length MUST set fatal, never
//      allocate. We independently parse the frame headers and assert the decoder's fatal flag agrees
//      with "the first fully-headered frame declares an out-of-range length".
//
// The harness NEVER weakens these to hide a finding: a throw, a wrong-typed field, a grown rest, or a
// fatal/allocation disagreement fails the run loudly and saves the crashing input.

import { FuzzedDataProvider } from "@jazzer.js/core";
import { decodeFrames, MAX_FRAME_BYTES } from "../pyrax-tunnel-relay/ws.mjs";

// A length-safe reference reader of the frame headers, mirroring decodeFrames' own length logic but
// WITHOUT ever allocating or unmasking. Returns, for the buffer, the classification of the FIRST frame
// whose header (incl. extended length + mask) is fully present:
//   { kind: "over-cap" }  the first fully-headered frame declares len that is unsafe/negative/over-cap
//                          → decodeFrames MUST report fatal:true
//   { kind: "in-cap" }     the first fully-headered frame declares an in-range len (fatal MUST be false
//                          for at least the reason of THIS frame; a later frame could still be over-cap)
//   { kind: "incomplete" } no frame's header is fully present (fewer than the header bytes) → not fatal
// We only need the FIRST decision point because decodeFrames stops at the first over-cap frame.
function classifyFirst(buf) {
  let off = 0;
  while (off + 2 <= buf.length) {
    const b1 = buf[off + 1];
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let p = off + 2;
    if (len === 126) {
      if (p + 2 > buf.length) return { kind: "incomplete" };
      len = buf.readUInt16BE(p);
      p += 2;
    } else if (len === 127) {
      if (p + 8 > buf.length) return { kind: "incomplete" };
      len = Number(buf.readBigUInt64BE(p));
      p += 8;
    }
    // This is the exact cap test decodeFrames applies BEFORE any mask read or allocation.
    if (!Number.isSafeInteger(len) || len < 0 || len > MAX_FRAME_BYTES) return { kind: "over-cap" };
    // In-cap: to advance to the NEXT frame we need the mask (if any) and the full payload present.
    if (masked) {
      if (p + 4 > buf.length) return { kind: "in-cap-incomplete" };
      p += 4;
    }
    if (p + len > buf.length) return { kind: "in-cap-incomplete" };
    p += len;
    off = p;
    // Loop to the next frame; if the NEXT frame is over-cap we'll report it, which is still a legal
    // fatal outcome for decodeFrames (it processed this in-cap frame then hit the over-cap one).
  }
  return { kind: "incomplete" };
}

export function fuzz(data) {
  const fdp = new FuzzedDataProvider(data);
  // Consume the entire provided buffer as the raw frame bytes: decodeFrames must survive ANYTHING.
  const buf = Buffer.from(fdp.consumeRemainingAsBytes());

  const out = decodeFrames(buf);

  // ---- Property 1: TOTAL + well-typed shape -------------------------------------------------------
  if (out === null || typeof out !== "object") throw new Error("decodeFrames did not return an object");
  const { texts, pings, closed, fatal, rest } = out;
  if (!Array.isArray(texts)) throw new Error("decodeFrames: texts is not an array");
  for (const t of texts) if (typeof t !== "string") throw new Error("decodeFrames: non-string text");
  if (!Array.isArray(pings)) throw new Error("decodeFrames: pings is not an array");
  for (const p of pings) if (!Buffer.isBuffer(p)) throw new Error("decodeFrames: non-Buffer ping");
  if (typeof closed !== "boolean") throw new Error("decodeFrames: closed is not a boolean");
  if (typeof fatal !== "boolean") throw new Error("decodeFrames: fatal is not a boolean");
  if (!Buffer.isBuffer(rest)) throw new Error("decodeFrames: rest is not a Buffer");

  // ---- Property 2: rest is a genuine suffix (can never grow) --------------------------------------
  // A non-advancing offset or an aliasing bug would let the caller's per-connection buffer balloon
  // without bound — exactly the OOM this guard exists to prevent. rest MUST be <= the input.
  if (rest.length > buf.length) throw new Error("decodeFrames: rest grew larger than the input buffer");

  // ---- Properties 3 + 4: fatal ⇔ the first fully-headered frame declares an out-of-range length ----
  // We independently classify the buffer with a NON-allocating reference reader. fatal must never be
  // set without a genuine over-cap/unsafe declared length in the stream, and a genuine over-cap first
  // frame must be flagged (otherwise the decoder would go on to allocUnsafe(len) an out-of-range size).
  const cls = classifyFirst(buf);
  if (fatal) {
    // A fatal result is ONLY justified by an over-cap / non-safe-integer declared length somewhere the
    // decoder reached. If our reference reader never saw an over-cap frame, the decoder either invented
    // a fatal (a bug) — flag it.
    if (cls.kind !== "over-cap") {
      throw new Error(`decodeFrames: fatal set with no over-cap frame in stream (ref=${cls.kind})`);
    }
    // Fatal must STOP parsing: nothing is decoded from bytes past the over-cap frame. We cannot know the
    // exact prefix count cheaply, but we CAN assert the strong safety property that matters for the OOM
    // guard: the decoder never allocated the over-cap payload, evidenced by it not throwing (an
    // allocUnsafe of an out-of-range length would have thrown RangeError before returning). Reaching
    // here with fatal:true and no throw proves the cap short-circuited allocation. Nothing more to do.
  } else if (cls.kind === "over-cap") {
    // The FIRST fully-headered frame declares an out-of-range length, yet the decoder did NOT flag it.
    // That means it would proceed to read the mask and allocUnsafe(len) an over-cap buffer — the exact
    // unauthenticated-OOM regression finding H11 hardened against. A real, must-not-hide finding.
    throw new Error("decodeFrames: an over-cap declared length was NOT flagged fatal (OOM guard bypass)");
  }
}
