// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Ingestion storage caps (L9): a single log's `data` blob is truncated past MAX_LOG_DATA_BYTES so a
// hostile contract on the indexed chain can't persist arbitrarily large values verbatim. `node --test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { capLogData, CAP_LOG_DATA_CHARS } from "../caps.js";

test("capLogData leaves an in-budget blob untouched", () => {
  const small = "0x" + "ab".repeat(100); // 200 hex chars ≪ cap
  assert.equal(capLogData(small), small);
});

test("capLogData leaves a blob exactly at the cap untouched", () => {
  const exact = "0x" + "a".repeat(CAP_LOG_DATA_CHARS - 2);
  assert.equal(exact.length, CAP_LOG_DATA_CHARS);
  assert.equal(capLogData(exact), exact);
});

test("capLogData truncates + flags an over-cap blob", () => {
  const huge = "0x" + "a".repeat(CAP_LOG_DATA_CHARS * 4);
  const out = capLogData(huge);
  assert.ok(out.length < huge.length, "truncated shorter than input");
  assert.ok(out.endsWith("…truncated"), "carries the truncation marker");
  assert.ok(out.startsWith(huge.slice(0, CAP_LOG_DATA_CHARS)), "keeps the leading cap bytes");
  // The kept hex portion is bounded to exactly the cap (marker excluded).
  assert.equal(out.slice(0, CAP_LOG_DATA_CHARS).length, CAP_LOG_DATA_CHARS);
});

test("capLogData passes non-strings through unchanged", () => {
  assert.equal(capLogData(null), null);
  assert.equal(capLogData(undefined), undefined);
});
