// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Cross-portal red-team orchestrator. Runs every portal's `npm run redteam` in sequence, aggregates the
// results, and exits non-zero if ANY attack succeeded (i.e. any suite failed). Designed for the fuzz
// farm: a non-zero exit is the "an attack got through — a defense regressed" signal.
//
// Usage:
//   node redteam/run-all.mjs          one round across all three portals (exit 0 = all attacks blocked)
//   node redteam/run-all.mjs --loop   run forever with a short delay between rounds (24/7 farm mode)
//
// No external deps — plain Node. Each portal is a sibling dir under pyrax-web/.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, ".."); // pyrax-web/

const PORTALS = ["pyrax-team-website", "pyrax-devnet-portal", "pyrax-nodes"];
const LOOP = process.argv.includes("--loop");
const DELAY_MS = Number(process.env.REDTEAM_LOOP_DELAY_MS || 5000);

function runPortal(portal) {
  const cwd = path.join(ROOT, portal);
  const started = Date.now();
  // shell: true so the platform resolves `npm`/`npm.cmd` correctly (npm is a shell script on Windows).
  const res = spawnSync("npm run redteam", { cwd, stdio: "inherit", shell: true });
  const ms = Date.now() - started;
  if (res.error) {
    console.error(`  spawn error for ${portal}: ${res.error.message}`);
    return { portal, ok: false, ms, code: -1 };
  }
  return { portal, ok: res.status === 0, ms, code: res.status ?? -1 };
}

function runRound(round) {
  const stamp = new Date().toISOString();
  console.log(`\n=== PYRAX red-team round${round != null ? " #" + round : ""} @ ${stamp} ===`);
  const results = PORTALS.map(runPortal);
  const failed = results.filter((r) => !r.ok);
  console.log("\n--- summary ---");
  for (const r of results) {
    console.log(`  ${r.ok ? "PASS (all attacks blocked)" : "FAIL (an attack SUCCEEDED — vuln!)"}  ${r.portal}  (${r.ms}ms)`);
  }
  if (failed.length) {
    console.error(`\nRED ALERT: ${failed.length} portal(s) had a succeeding attack: ${failed.map((f) => f.portal).join(", ")}`);
  } else {
    console.log("\nAll portals green: every codified attack was blocked.");
  }
  return failed.length === 0;
}

if (LOOP) {
  let round = 1;
  // Run forever; each round is independent. A failing round logs RED ALERT but the loop keeps guarding.
  // The farm's supervisor watches stderr / the exit of a wrapper for the alert; Ctrl-C stops the loop.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    runRound(round++);
    const wait = new Int32Array(new SharedArrayBuffer(4));
    Atomics.wait(wait, 0, 0, DELAY_MS); // block DELAY_MS without a busy-spin
  }
} else {
  const ok = runRound(null);
  process.exit(ok ? 0 : 1);
}
