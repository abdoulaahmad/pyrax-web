// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Tests for the WS framing hardening (finding H11): a client that declares a huge frame
// length must be rejected as fatal (never buffered), and the accumulated per-connection
// buffer must be bounded. These guard the unauthenticated OOM vector on /__tunnel/register.

import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeFrames, encodeFrame, MAX_FRAME_BYTES, MAX_BUFFER_BYTES } from "../ws.mjs";

/** Build a masked client→server frame (browsers/clients MUST mask; the relay decodes masked
 *  frames). `declaredLen` lets a test lie about the length independent of the real payload. */
function maskedFrame(payload, opcode = 0x1, declaredLen = payload.length) {
  const mask = Buffer.from([0x11, 0x22, 0x33, 0x44]);
  let header;
  if (declaredLen < 126) {
    header = Buffer.from([0x80 | opcode, 0x80 | declaredLen]);
  } else if (declaredLen < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(declaredLen, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(declaredLen), 2);
  }
  const masked = Buffer.allocUnsafe(payload.length);
  for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i & 3];
  return Buffer.concat([header, mask, masked]);
}

test("decodeFrames round-trips a normal masked text frame", () => {
  const frame = maskedFrame(Buffer.from("hello-node", "utf8"));
  const { texts, fatal, rest } = decodeFrames(frame);
  assert.deepEqual(texts, ["hello-node"]);
  assert.equal(fatal, false);
  assert.equal(rest.length, 0);
});

test("decodeFrames flags a frame that DECLARES an over-cap length as fatal (no buffering)", () => {
  // Declare a 5 GiB frame but send only the 2-byte extended-length header prefix. The old
  // code would `break` and keep waiting for 5 GiB of payload; the hardened code must set
  // fatal so the caller can destroy the socket immediately.
  const huge = MAX_FRAME_BYTES + 1;
  const header = Buffer.alloc(10);
  header[0] = 0x80 | 0x1;
  header[1] = 0x80 | 127;
  header.writeBigUInt64BE(BigInt(huge), 2);
  const mask = Buffer.from([0, 0, 0, 0]);
  const { fatal, texts } = decodeFrames(Buffer.concat([header, mask]));
  assert.equal(fatal, true, "an over-cap declared length must be fatal");
  assert.equal(texts.length, 0);
});

test("decodeFrames flags a 2^53-ish absurd length as fatal, not NaN/silent", () => {
  const header = Buffer.alloc(10);
  header[0] = 0x80 | 0x1;
  header[1] = 0x80 | 127;
  header.writeBigUInt64BE(0xffffffffffffffffn, 2); // max u64
  const { fatal } = decodeFrames(Buffer.concat([header, Buffer.alloc(4)]));
  assert.equal(fatal, true);
});

test("decodeFrames accepts a frame exactly at the cap", () => {
  // A frame whose declared length == MAX_FRAME_BYTES is allowed (the cap is inclusive); we
  // only need the header to be non-fatal — supplying a full payload here would allocate the
  // cap, so assert on a partial buffer that must simply NOT be fatal (just incomplete).
  const header = Buffer.alloc(10);
  header[0] = 0x80 | 0x1;
  header[1] = 0x80 | 127;
  header.writeBigUInt64BE(BigInt(MAX_FRAME_BYTES), 2);
  const { fatal, texts, rest } = decodeFrames(Buffer.concat([header, Buffer.alloc(4)]));
  assert.equal(fatal, false, "a frame at exactly the cap is not fatal");
  assert.equal(texts.length, 0); // payload not yet complete
  assert.ok(rest.length > 0); // header is buffered, waiting for the (legitimate) payload
});

test("the buffer cap is larger than a single max frame so a legit max frame still fits", () => {
  assert.ok(MAX_BUFFER_BYTES >= MAX_FRAME_BYTES);
});
