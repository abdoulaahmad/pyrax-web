// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Bounded, standalone DB reachability probe for /healthz. Kept separate from the heavy db.ts data
// layer so the health route imports only a tiny module (no schema init, no side effects). Resolves
// the SAME connection string db.ts uses, but with its own small pool and a hard timeout so a slow or
// unreachable Postgres can NEVER hang the health check — it just reports "down" (a non-fatal field).
import pg from "pg";

const URL_RAW = process.env.DATABASE_URL_DEVNET
  || (process.env.DATABASE_URL || process.env.DATABASE_URL_TEAM_PYRAX || "").replace(/\/team_pyrax(\?|$)/, "/devnet_tester$1");
const connectionString = URL_RAW.replace(/[?&]sslmode=[^&]*/, "");

let pool: pg.Pool | null = null;
function probePool(): pg.Pool {
  // connectionTimeoutMillis bounds a connect attempt to an unreachable host (pg default 0 = wait
  // forever, which would hang /healthz + the container HEALTHCHECK).
  if (!pool) pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 2, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 4_000 });
  return pool;
}

/** Resolve "up" | "down" | "unconfigured" within ~4.5s, never throwing. A slow/unreachable DB is
 *  treated as "down" so the health check stays responsive. */
export async function pingDb(): Promise<"up" | "down" | "unconfigured"> {
  if (!connectionString) return "unconfigured";
  return await new Promise<"up" | "down" | "unconfigured">((resolve) => {
    const t = setTimeout(() => resolve("down"), 4_500);
    probePool().query("SELECT 1").then(
      () => { clearTimeout(t); resolve("up"); },
      () => { clearTimeout(t); resolve("down"); },
    );
  });
}
