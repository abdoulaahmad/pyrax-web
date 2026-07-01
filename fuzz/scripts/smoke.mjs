// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Smoke test: load + briefly campaign EVERY fuzz target, one after another, and report a pass/fail
// table. A "pass" means the target module loaded (imports of the real production parsers resolved),
// Jazzer instrumented it, and the short libFuzzer run finished WITHOUT a crash/assertion (exit 0).
// A "fail" means either a load/type error or a real finding (a saved crash input) — both must be
// investigated, never hidden. Run: `npm run smoke`. Budget is deliberately small (a few thousand runs
// each) so it's fast in CI; the farm runs the same targets for far longer via `fuzz:*` + libFuzzer
// `-max_total_time` (see README.md).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const runner = path.resolve(here, "run.mjs");

const RUNS = process.env.SMOKE_RUNS || "4000";
const TARGETS = [
  ["spaces-xml", "spaces-xml.target.mjs", "corpus/spaces-xml"],
  ["announce-hmac", "announce-hmac.target.mjs", "corpus/announce-hmac"],
  ["announce-body", "announce-body.target.mjs", "corpus/announce-body"],
  ["otp-code", "otp-code.target.mjs", "corpus/otp-code"],
  ["release-feed", "release-feed.target.mjs", "corpus/release-feed"],
];

const results = [];
for (const [name, target, corpus] of TARGETS) {
  process.stdout.write(`\n=== smoke: ${name} (${RUNS} runs) ===\n`);
  const r = spawnSync(
    process.execPath,
    [runner, target, corpus, "--", `-runs=${RUNS}`],
    { stdio: "inherit" },
  );
  results.push([name, r.status === 0]);
}

process.stdout.write("\n================ SMOKE SUMMARY ================\n");
let allOk = true;
for (const [name, ok] of results) {
  process.stdout.write(`${ok ? "PASS" : "FAIL"}  ${name}\n`);
  if (!ok) allOk = false;
}
process.stdout.write("==============================================\n");
process.exit(allOk ? 0 : 1);
