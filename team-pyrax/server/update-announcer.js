// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// On-chain update announcer. Releases are published by CI to DigitalOcean Spaces
// (electron-updater latest*.yml / the CLI manifest.json); team-pyrax already RESOLVES
// the newest version of each product for the download dashboard. This watcher reuses
// that resolution and, whenever a product's newest version BUMPS past what we have
// already recorded, emits a single curated "update-available" event to the PYRAX
// events relayer — which signs it as a gas-only transaction funded by the MARKETING
// genesis pool (exactly like the team-login records). The on-chain payload is only
// the event kind + timestamp (no version string, no PII) — parity with logins.
//
// It is idempotent and replica-safe: `Announcements.claimIfNew` atomically moves the
// stored version, so the event fires exactly once per published release even if the
// check runs repeatedly or several server replicas race. Best-effort throughout — a
// resolution or relay failure is swallowed and simply retried on the next tick.

import { catalogue } from "./downloads.js";
import { Announcements } from "./db.js";
import { emitEvent } from "./events.js";

/** How often to re-check the OTA feeds for a new release (10 minutes). */
export const ANNOUNCE_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Resolve every product's newest version and emit one on-chain "update-available"
 * event per product whose version changed since we last recorded it. Never throws.
 */
export async function checkAndAnnounce() {
  let products;
  try {
    products = await catalogue();
  } catch {
    return; // OTA feed unreachable — try again next tick
  }
  for (const p of products) {
    if (!p?.available || !p.version) continue; // nothing published yet for this product
    try {
      const isNew = await Announcements.claimIfNew(p.key, String(p.version));
      if (isNew) {
        emitEvent("update-available"); // fire-and-forget; marketing-funded gas-only tx
        console.log(`[update-announcer] recorded update-available for ${p.key} v${p.version}`);
      }
    } catch {
      /* DB or relay hiccup — leave the version unclaimed so the next tick retries */
    }
  }
}

/**
 * Start the periodic announcer. Fires once shortly after boot (so a release published
 * while the server was down is announced promptly), then on a fixed interval. Returns
 * the interval handle (already `.unref()`-ed so it never keeps the process alive).
 */
export function startUpdateAnnouncer() {
  setTimeout(() => void checkAndAnnounce(), 30 * 1000).unref();
  const handle = setInterval(() => void checkAndAnnounce(), ANNOUNCE_INTERVAL_MS);
  handle.unref();
  return handle;
}
