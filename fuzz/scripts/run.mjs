// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Cross-platform Jazzer.js launcher. Registers the `tsx` ESM loader (so harnesses can import the real
// production `.ts` parsers) and invokes the Jazzer CLI with a target + its persistent corpus dir. Any
// extra args after `--` are forwarded verbatim to libFuzzer (e.g. `-max_total_time=900`, `-runs=20000`).
//
//   node scripts/run.mjs <target.mjs> <corpusDir> [-- <libFuzzer args...>]
//
// Used by the package.json `fuzz:*` scripts and by the fuzz farm (see README.md). Keeps the loader
// wiring in one place so Windows dev + the Linux droplet run identically.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const fuzzRoot = path.resolve(here, "..");
const jazzerCli = path.resolve(fuzzRoot, "node_modules", "@jazzer.js", "core", "dist", "cli.js");

const [, , target, corpus, ...rest] = process.argv;
if (!target || !corpus) {
  console.error("usage: node scripts/run.mjs <target.mjs> <corpusDir> [-- <libFuzzer args...>]");
  process.exit(2);
}

// Everything after a literal "--" is passed through to libFuzzer; anything before is a Jazzer flag.
const dashdash = rest.indexOf("--");
const jazzerArgs = dashdash === -1 ? rest : rest.slice(0, dashdash);
const libfuzzerArgs = dashdash === -1 ? [] : rest.slice(dashdash + 1);

const args = [jazzerCli, "--sync", target, corpus, ...jazzerArgs];
if (libfuzzerArgs.length) args.push("--", ...libfuzzerArgs);

const env = { ...process.env };
// Register tsx as an ESM loader so `import ... from "../<portal>/src/.../x.ts"` resolves + transpiles.
env.NODE_OPTIONS = [env.NODE_OPTIONS, "--import", "tsx"].filter(Boolean).join(" ");

const r = spawnSync(process.execPath, args, { cwd: fuzzRoot, stdio: "inherit", env });
process.exit(r.status === null ? 1 : r.status);
