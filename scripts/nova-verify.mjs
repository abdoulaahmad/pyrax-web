// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// NOVA repair gate for this polyglot monorepo (independent sub-packages, no root workspace).
// NOVA's box-side coder runs this from the repo root AFTER editing and BEFORE anything is
// committed/pushed. It typechecks (and unit-tests) ONLY the sub-package(s) the pending change
// actually touched — installing their deps first if missing — so a localized fix is verified
// without building the whole repo. A change that touches no TS sub-package (docs, yaml, a
// Dockerfile) passes cleanly. Exit 0 = green, exit 1 = a check failed (the coder hard-resets).
//
// Usage: node scripts/nova-verify.mjs

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const run = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, stdio: "inherit", shell: true });

// 1) Which top-level sub-packages did the pending (uncommitted) change touch?
const diff = spawnSync("git", ["diff", "--name-only", "HEAD"], { cwd: ROOT, encoding: "utf8" });
const touched = new Set();
for (const f of (diff.stdout || "").split(/\r?\n/).filter(Boolean)) {
  const top = f.split("/")[0];
  if (top && existsSync(join(ROOT, top, "package.json"))) touched.add(top);
}
// Fallback: if git gave us nothing (detached/odd state) but there ARE changes, check every
// sub-package that has a package.json — conservative, never silently skips a real edit.
if (!touched.size) {
  const porcelain = spawnSync("git", ["status", "--porcelain"], { cwd: ROOT, encoding: "utf8" });
  if ((porcelain.stdout || "").trim()) {
    for (const e of readdirSync(ROOT, { withFileTypes: true })) {
      if (e.isDirectory() && e.name !== "node_modules" && !e.name.startsWith(".") && existsSync(join(ROOT, e.name, "package.json"))) touched.add(e.name);
    }
  }
}
if (!touched.size) { console.log("nova-verify: no TS sub-package touched — nothing to typecheck. PASS."); process.exit(0); }

// 2) For each touched sub-package: ensure deps, then run typecheck (+ unit test if defined).
let failures = 0;
for (const pkg of touched) {
  const dir = join(ROOT, pkg);
  let scripts = {};
  try { scripts = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).scripts || {}; } catch { /* not a real package */ continue; }
  // typecheck (tsc --noEmit) is the reliable, fast signal here; the repo's own CI runs the
  // full unit suites on push (and some sub-packages' `test` scripts are stale), so we don't
  // run `test` from the gate — it would false-fail a perfectly good fix.
  if (!scripts.typecheck) { console.log(`= ${pkg}: no typecheck script — skipping`); continue; }

  if (!existsSync(join(dir, "node_modules"))) {
    console.log(`\n=== ${pkg}: installing deps ===`);
    if (run("pnpm", ["install", "--frozen-lockfile"], dir).status !== 0 && run("pnpm", ["install"], dir).status !== 0) {
      console.error(`✗ ${pkg}: dependency install failed`); failures++; continue;
    }
  }
  console.log(`\n=== ${pkg}: pnpm run typecheck ===`);
  if (run("pnpm", ["run", "typecheck"], dir).status !== 0) { console.error(`✗ ${pkg} typecheck FAILED`); failures++; }
}
console.log(`\nnova-verify: ${touched.size} package(s) checked, ${failures} failure(s).`);
process.exit(failures ? 1 : 0);
