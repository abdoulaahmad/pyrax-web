// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Side-effect-free ingestion caps, kept out of ingest.js (which pulls in the DB pool + RPC client) so
// the storage-growth guards are independently unit-testable (`node --test`).
import { MAX_LOG_DATA_BYTES } from "./config.js";

// A 0x-hex byte is 2 chars, so the char budget is 2 (for "0x") + 2 * MAX_LOG_DATA_BYTES.
export const CAP_LOG_DATA_CHARS = 2 + 2 * MAX_LOG_DATA_BYTES;

/**
 * Cap a single log's hex `data` blob before storage so a hostile contract can't persist arbitrarily
 * large values verbatim (unbounded DB growth). A blob over the cap is truncated on a byte boundary and
 * flagged with a marker so it is never mistaken for the full data. Non-strings pass through unchanged.
 * @param {unknown} data
 */
export function capLogData(data) {
  if (typeof data !== "string" || data.length <= CAP_LOG_DATA_CHARS) return data;
  return data.slice(0, CAP_LOG_DATA_CHARS) + "…truncated";
}
