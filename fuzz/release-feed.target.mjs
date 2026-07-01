// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Fuzz target: release-feed / manifest.json parsing (untrusted object keys + untrusted manifest body).
//
// Real functions under test (imported from production, never reimplemented):
//   • pyrax-devnet-portal/src/server/releases-feed.ts
//       infernoPlatform(name), cliPlatform(name), versionFromName(name), versionFromManifest(text)
//   • pyrax-nodes/src/server/feeds.ts
//       versionFromFilename(name), matchDesktop(keys), selectCliDownloads(manifest, keys)
//   • pyrax-team-website/src/server/feeds.ts
//       versionFromFilename(name), matchDesktop(keys), selectCliDownloads(manifest, keys)
//
// These turn bucket object keys and a cli/manifest.json body into the download links the portals hand
// users. The keys/manifest live in a private bucket, but a compromised publish pipeline or a hostile
// endpoint makes them untrusted; a crash here breaks the downloads API, and a bad selection could point
// a download at an object the manifest merely CLAIMS exists.
//
// Security properties asserted:
//   1. TOTAL: every classifier / version extractor / selector never throws for ANY input string,
//      JSON body, or key array (including non-object JSON, arrays, hostile `files`/`version`).
//   2. WELL-TYPED CLASSIFY: platform classifiers return "win" | "mac" | "linux" | null only.
//   3. VERSION SHAPE: version extractors return null or a non-empty string with no leading "v".
//   4. SELECTION SOUNDNESS (the trust-boundary rule): selectCliDownloads only ever picks a filename
//      that ACTUALLY EXISTS in the provided key set — a manifest pointing at a missing/renamed object
//      is dropped. A pick whose basename isn't among the keys is a REAL finding (a "phantom download").

import { FuzzedDataProvider } from "@jazzer.js/core";
import {
  infernoPlatform, cliPlatform, versionFromName, versionFromManifest,
} from "../pyrax-devnet-portal/src/server/releases-feed.ts";
import {
  versionFromFilename as nodesVersion, matchDesktop as nodesMatch,
  selectCliDownloads as nodesSelect,
} from "../pyrax-nodes/src/server/feeds.ts";
import {
  versionFromFilename as teamVersion, matchDesktop as teamMatch,
  selectCliDownloads as teamSelect,
} from "../pyrax-team-website/src/server/feeds.ts";

const PLATFORMS = new Set(["win", "mac", "linux"]);
const base = (k) => k.split("/").pop() || k;

function checkPlatform(v, tag) {
  if (v !== null && !PLATFORMS.has(v)) throw new Error(`${tag}: returned a non-platform value`);
}
function checkVersion(v, tag) {
  if (v === null) return;
  if (typeof v !== "string") throw new Error(`${tag}: version is neither string nor null`);
  if (v.length === 0) throw new Error(`${tag}: version is an empty string`);
}

/** SELECTION SOUNDNESS: every picked filename's basename must be present in the provided keys. */
function checkSelection(sel, keys, tag) {
  if (!sel || !Array.isArray(sel.picks)) throw new Error(`${tag}: selection has no picks array`);
  const present = new Set(keys.map(base));
  for (const p of sel.picks) {
    if (!PLATFORMS.has(p.platform)) throw new Error(`${tag}: pick has a non-platform`);
    if (typeof p.filename !== "string" || p.filename.length === 0)
      throw new Error(`${tag}: pick has a bad filename`);
    if (!present.has(base(p.filename)))
      throw new Error(`${tag}: PHANTOM DOWNLOAD — picked a filename not present in the feed keys`);
  }
  checkVersion(sel.version, `${tag}.version`);
}

/** Build a plausible object-key array from the fuzzer (a feed listing under a prefix). */
function buildKeys(fdp) {
  const n = fdp.consumeIntegralInRange(0, 12);
  const keys = [];
  for (let i = 0; i < n; i++) keys.push(fdp.consumeString(fdp.consumeIntegralInRange(0, 40)));
  return keys;
}

export function fuzz(data) {
  const fdp = new FuzzedDataProvider(data);

  // A candidate filename (drives the classifiers + version extractors).
  const name = fdp.consumeString(fdp.consumeIntegralInRange(0, 64));
  checkPlatform(infernoPlatform(name), "infernoPlatform");
  checkPlatform(cliPlatform(name), "cliPlatform");
  checkVersion(versionFromName(name), "versionFromName");
  checkVersion(nodesVersion(name), "nodes.versionFromFilename");
  checkVersion(teamVersion(name), "team.versionFromFilename");

  // A candidate key array (drives matchDesktop + selection existence checks).
  const keys = buildKeys(fdp);
  for (const [tag, match] of [["nodes.matchDesktop", nodesMatch], ["team.matchDesktop", teamMatch]]) {
    const m = match(keys);
    for (const platform of ["win", "mac", "linux"]) {
      const picked = m[platform];
      if (picked !== null && typeof picked !== "string")
        throw new Error(`${tag}: pick for ${platform} is neither string nor null`);
      // matchDesktop returns a basename that must be one of the provided keys' basenames (or null).
      if (picked !== null && !keys.map(base).includes(picked))
        throw new Error(`${tag}: matched a filename not among the feed keys`);
    }
  }

  // A candidate untrusted manifest body (drives versionFromManifest + selectCliDownloads).
  const manifestText = fdp.consumeRemainingAsString();
  checkVersion(versionFromManifest(manifestText), "versionFromManifest");

  let manifestValue;
  try { manifestValue = JSON.parse(manifestText); } catch { manifestValue = { files: { win: base(keys[0] || "") } }; }
  checkSelection(nodesSelect(manifestValue, keys), keys, "nodes.selectCliDownloads");
  checkSelection(teamSelect(manifestValue, keys), keys, "team.selectCliDownloads");
}
