// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Small, side-effect-free HTTP helpers for the indexer read/verify API. Kept out of index.js (which
// starts the server + DB on import) so the security-critical request-body cap and the query clamps are
// independently unit-testable (`node --test`).
import { READ_MAX_OFFSET } from "./config.js";

export const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
export const clampLimit = (v) => Math.min(100, Math.max(1, num(v, 25)));
// Cap OFFSET so a caller can't drive a huge OFFSET scan on the heaviest queries (history/logs/tokens).
export const clampOffset = (v) => Math.min(READ_MAX_OFFSET, Math.max(0, num(v, 0)));

/**
 * Buffer a request body with a HARD byte cap enforced BEFORE parsing. Throws an Error with `.code = 413`
 * when Content-Length declares, or the accumulated stream exceeds, `maxBytes` — and destroys the socket
 * so a never-ending / oversized body can't allocate arbitrary memory per connection. Returns a UTF-8
 * string on success.
 * @param {import("node:http").IncomingMessage | AsyncIterable<Buffer>} req
 * @param {number} maxBytes
 */
export async function readBody(req, maxBytes) {
  const declared = Number(req.headers?.["content-length"]);
  if (Number.isFinite(declared) && declared > maxBytes) {
    req.destroy?.();
    throw tooLarge();
  }
  const chunks = [];
  let total = 0;
  for await (const c of req) {
    total += c.length;
    if (total > maxBytes) {
      req.destroy?.();
      throw tooLarge();
    }
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function tooLarge() {
  const err = new Error("request body too large");
  err.code = 413;
  return err;
}
