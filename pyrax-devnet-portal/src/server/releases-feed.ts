// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Resolves the CURRENT downloadable builds from the private DigitalOcean Spaces release feeds and
// hands back time-limited presigned links. The apps are published to feed folders in the bucket:
//   node/  — Inferno desktop installers (Inferno-*.exe / *.dmg / *.AppImage) + latest*.yml
//   ember/ — Ember desktop installers (same electron-builder shapes as node/)
//   cli/   — pyrax-cli-*-windows-x86_64.zip / *-mac.tar.gz / *-linux.tar.gz + manifest.json
//            (NOT offered to devnet testers this round — intentionally ignored here)
// Only the newest version is retained per feed, so "the file that matches this platform" IS the
// current build. The bucket is PRIVATE → every link is a presigned SigV4 GET, never a public URL.
import { listPrefix, presignGet, getObjectText, spacesConfigured, type SpacesObject } from "./s3presign";

export type Platform = "win" | "mac" | "linux";
export interface DownloadAsset { platform: Platform; filename: string; size: number; url: string }
export interface FeedResult { available: boolean; version: string | null; assets: DownloadAsset[] }

const PRESIGN_TTL_S = 3600; // 1h — long enough to click through, short enough to expire

/** Classify an installer/archive filename to a platform, or null if it isn't a user download.
 *  Exported for fuzzing: the input is an attacker-influenceable object key from a bucket listing. */
export function infernoPlatform(name: string): Platform | null {
  const n = name.toLowerCase();
  if (n.endsWith(".yml") || n.endsWith(".yaml") || n.endsWith(".blockmap")) return null; // updater metadata
  if (n.endsWith(".exe")) return "win";
  if (n.endsWith(".dmg") || n.endsWith(".pkg")) return "mac";
  if (n.endsWith(".appimage") || n.endsWith(".deb") || n.endsWith(".rpm")) return "linux";
  return null;
}
/** Classify a CLI archive filename to a platform, or null if it isn't a user download.
 *  Exported for fuzzing: the input is an attacker-influenceable object key from a bucket listing. */
export function cliPlatform(name: string): Platform | null {
  const n = name.toLowerCase();
  if (n.endsWith(".json")) return null; // manifest
  if (n.includes("windows") || n.endsWith("-win.zip") || (n.endsWith(".zip") && n.includes("win"))) return "win";
  if (n.includes("-mac") || n.includes("darwin") || n.includes("apple")) return "mac";
  if (n.includes("linux")) return "linux";
  return null;
}

const baseName = (key: string) => key.split("/").pop() || key;
/** Newest object first (by LastModified, then key for determinism). */
const newest = (a: SpacesObject, b: SpacesObject) => b.lastModified - a.lastModified || (a.key < b.key ? 1 : -1);

/** Best-effort semver-ish version pulled from a filename, e.g. "Inferno-0.3.1.exe" → "0.3.1".
 *  Exported for fuzzing: the input is an attacker-influenceable object key from a bucket listing. */
export function versionFromName(name: string): string | null {
  const m = name.match(/(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)/);
  return m ? m[1] : null;
}

/**
 * Best-effort version extracted from an UNTRUSTED cli/manifest.json body. Total: any string — including
 * non-JSON, a JSON array/number/null, or an object with a hostile `version`/`latest`/`tag` — yields a
 * clean version string or null (never throws). Extracted from cliFeed() so this untrusted-JSON parsing
 * can be fuzzed in isolation; the manifest lives in a private bucket, but treat its body as untrusted.
 */
export function versionFromManifest(text: string): string | null {
  let m: unknown;
  try { m = JSON.parse(text); } catch { return null; }
  if (!m || typeof m !== "object") return null;
  const rec = m as Record<string, unknown>;
  const v = rec.version ?? rec.latest ?? rec.tag ?? null;
  if (typeof v === "string" && v.trim()) return v.trim().replace(/^v/, "");
  return null;
}

/** Pick the newest asset per platform from a feed's object list. */
function pickAssets(objects: SpacesObject[], classify: (name: string) => Platform | null): DownloadAsset[] {
  const chosen = new Map<Platform, SpacesObject>();
  for (const o of [...objects].sort(newest)) {
    const p = classify(baseName(o.key));
    if (p && !chosen.has(p)) chosen.set(p, o);
  }
  const order: Platform[] = ["win", "mac", "linux"];
  return order
    .filter((p) => chosen.has(p))
    .map((p) => {
      const o = chosen.get(p)!;
      return { platform: p, filename: baseName(o.key), size: o.size, url: presignGet(o.key, PRESIGN_TTL_S) };
    });
}

/** Resolve the current desktop build from an electron-builder feed prefix (`node/` or `ember/`).
 *  Both apps ship the same installer shapes, so they share the infernoPlatform classifier. */
async function desktopFeed(prefix: string): Promise<FeedResult> {
  if (!spacesConfigured()) return { available: false, version: null, assets: [] };
  const objects = await listPrefix(prefix);
  const assets = pickAssets(objects, infernoPlatform);
  const version = assets.map((a) => versionFromName(a.filename)).find(Boolean) ?? null;
  return { available: assets.length > 0, version, assets };
}

/** Resolve the current Inferno desktop build from the `node/` feed. */
export async function infernoFeed(): Promise<FeedResult> {
  return desktopFeed("node/");
}

/** Resolve the current Ember desktop build from the `ember/` feed. */
export async function emberFeed(): Promise<FeedResult> {
  return desktopFeed("ember/");
}

/** Resolve the current PYRAX CLI build from the `cli/` feed, reading the version from manifest.json. */
export async function cliFeed(): Promise<FeedResult> {
  if (!spacesConfigured()) return { available: false, version: null, assets: [] };
  const objects = await listPrefix("cli/");
  const assets = pickAssets(objects, cliPlatform);
  let version: string | null = null;
  const manifestKey = objects.map((o) => o.key).find((k) => baseName(k).toLowerCase() === "manifest.json");
  if (manifestKey) {
    const text = await getObjectText(manifestKey);
    if (text) version = versionFromManifest(text); // null → fall through to filename-derived version
  }
  if (!version) version = assets.map((a) => versionFromName(a.filename)).find(Boolean) ?? null;
  return { available: assets.length > 0, version, assets };
}

/** The full downloads payload for the portal: Inferno (node feed) + Ember, each with a version + links.
 *  The CLI is not offered to devnet testers this round. */
export async function downloadsPayload(): Promise<{ configured: boolean; inferno: FeedResult; ember: FeedResult }> {
  const configured = spacesConfigured();
  if (!configured) {
    const empty: FeedResult = { available: false, version: null, assets: [] };
    return { configured, inferno: empty, ember: empty };
  }
  const [inferno, ember] = await Promise.all([infernoFeed(), emberFeed()]);
  return { configured, inferno, ember };
}
