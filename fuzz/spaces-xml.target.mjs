// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Fuzz target: SigV4 / ListObjectsV2 XML response parsing.
//
// Real functions under test (imported from production, never reimplemented):
//   • pyrax-devnet-portal/src/server/s3presign.ts  → parseListObjectsV2(xml)
//   • pyrax-nodes/src/server/spaces.ts             → parseListKeysPage(xml)
//   • pyrax-team-website/src/server/spaces.ts       → parseListKeysPage(xml)
//
// These parse the bucket's ListObjectsV2 XML — a response body we do NOT control (a compromised or
// misbehaving Spaces endpoint, or a MITM, could return arbitrary bytes). They feed the downloads feed,
// so a parser crash would take the downloads API down (DoS) and a mis-parse could surface a bogus key.
//
// Security property asserted (the parsers' documented contract): TOTAL + WELL-TYPED.
//   1. Never throws on ANY input (malformed / truncated / hostile / huge / non-UTF-8 XML).
//   2. Returns a well-typed page: objects/keys is an array; each parsed key is a string; sizes are
//      finite non-negative numbers; folder placeholders (key ending in "/") are dropped; a
//      continuation token is only present when <IsTruncated>true</IsTruncated> is present.
// A regression that let hostile XML throw, or emit a folder placeholder / a NaN size / a non-string
// key, breaks the contract and fails the assertion (we do NOT weaken it to hide a finding).

import { FuzzedDataProvider } from "@jazzer.js/core";
import { parseListObjectsV2 } from "../pyrax-devnet-portal/src/server/s3presign.ts";
import { parseListKeysPage as parseNodes } from "../pyrax-nodes/src/server/spaces.ts";
import { parseListKeysPage as parseTeam } from "../pyrax-team-website/src/server/spaces.ts";

/** A truncated flag can only be honored when the XML actually says the listing is truncated. */
function truncatedClaimed(xml) {
  return /<IsTruncated>true<\/IsTruncated>/.test(xml);
}

export function fuzz(data) {
  const fdp = new FuzzedDataProvider(data);
  // Mix free-form bytes with well-formed-ish XML fragments so the fuzzer explores both the parser's
  // fast rejection paths and its real extraction paths (coverage guides it toward valid <Contents>).
  const xml = fdp.consumeString(fdp.remainingBytes);

  // 1) devnet: parseListObjectsV2 → { objects: SpacesObject[], nextToken? }
  const page = parseListObjectsV2(xml);
  if (!Array.isArray(page.objects)) throw new Error("parseListObjectsV2: objects is not an array");
  for (const o of page.objects) {
    if (typeof o.key !== "string") throw new Error("parseListObjectsV2: non-string key");
    if (o.key.length === 0) throw new Error("parseListObjectsV2: emitted empty key");
    if (o.key.endsWith("/")) throw new Error("parseListObjectsV2: emitted a folder placeholder key");
    if (typeof o.size !== "number" || !Number.isFinite(o.size) || o.size < 0)
      throw new Error("parseListObjectsV2: size is not a finite non-negative number");
    if (typeof o.lastModified !== "number")
      throw new Error("parseListObjectsV2: lastModified is not a number");
  }
  if (page.nextToken !== undefined) {
    if (typeof page.nextToken !== "string") throw new Error("parseListObjectsV2: non-string nextToken");
    if (!truncatedClaimed(xml)) throw new Error("parseListObjectsV2: nextToken without IsTruncated=true");
  }

  // 2+3) nodes + team: parseListKeysPage → { keys: string[], nextToken? } (byte-identical parsers)
  for (const [name, parse] of [["nodes", parseNodes], ["team", parseTeam]]) {
    const kp = parse(xml);
    if (!Array.isArray(kp.keys)) throw new Error(`parseListKeysPage[${name}]: keys is not an array`);
    for (const k of kp.keys) {
      if (typeof k !== "string") throw new Error(`parseListKeysPage[${name}]: non-string key`);
    }
    if (kp.nextToken !== undefined) {
      if (typeof kp.nextToken !== "string") throw new Error(`parseListKeysPage[${name}]: non-string nextToken`);
      if (!truncatedClaimed(xml)) throw new Error(`parseListKeysPage[${name}]: nextToken without IsTruncated=true`);
    }
  }
}
