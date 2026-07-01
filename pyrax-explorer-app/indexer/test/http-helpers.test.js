// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Indexer request-body cap (H8) + query clamps (M9). The body cap must reject BEFORE the whole body is
// buffered/parsed, both on an over-large declared Content-Length and on a stream that overruns the cap
// mid-flight. Plain Node test runner: `node --test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { readBody, clampLimit, clampOffset } from "../http-helpers.js";
import { READ_MAX_OFFSET } from "../config.js";

/** A fake IncomingMessage: an async-iterable of Buffers + a headers bag + a destroy() spy. */
function fakeReq(chunks, headers = {}) {
  const stream = Readable.from(chunks.map((c) => (Buffer.isBuffer(c) ? c : Buffer.from(c))));
  stream.headers = headers;
  stream.destroyed = false;
  const origDestroy = stream.destroy.bind(stream);
  stream.destroy = (...a) => { stream.destroyedByCap = true; return origDestroy(...a); };
  return stream;
}

test("readBody accepts a body within the cap", async () => {
  const req = fakeReq(["{\"a\":1}"], { "content-length": "7" });
  const body = await readBody(req, 1024);
  assert.equal(body, '{"a":1}');
});

test("readBody rejects (413) an over-large declared Content-Length BEFORE buffering", async () => {
  const req = fakeReq(["ignored"], { "content-length": String(10_000) });
  await assert.rejects(() => readBody(req, 1024), (e) => e.code === 413);
  assert.equal(req.destroyedByCap, true);
});

test("readBody rejects (413) a stream that overruns the cap mid-flight (no honest Content-Length)", async () => {
  // 3 chunks of 500 bytes = 1500 > cap 1024; the declared length is omitted (chunked/slowloris shape).
  const big = "x".repeat(500);
  const req = fakeReq([big, big, big], {});
  await assert.rejects(() => readBody(req, 1024), (e) => e.code === 413);
  assert.equal(req.destroyedByCap, true);
});

test("clampLimit bounds to [1,100] and defaults", () => {
  assert.equal(clampLimit("0"), 1);
  assert.equal(clampLimit("9999"), 100);
  assert.equal(clampLimit("25"), 25);
  assert.equal(clampLimit(undefined), 25);
  assert.equal(clampLimit("not-a-number"), 25);
});

test("clampOffset bounds to [0, READ_MAX_OFFSET]", () => {
  assert.equal(clampOffset("-5"), 0);
  assert.equal(clampOffset(String(READ_MAX_OFFSET + 1)), READ_MAX_OFFSET);
  assert.equal(clampOffset("42"), 42);
  assert.equal(clampOffset(undefined), 0);
});
