// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Resolves the CURRENT downloadable builds from the private DigitalOcean Spaces release feeds and
// hands back time-limited presigned links. The apps are published to feed folders in the bucket:
//   node/  — Inferno desktop installers (Inferno-*.exe / *.dmg / *.AppImage) + latest*.yml
//   cli/   — pyrax-cli-*-windows-x86_64.zip / *-mac.tar.gz / *-linux.tar.gz + manifest.json
//   ember/ — Ember desktop app (NOT offered to devnet testers — intentionally ignored here)
// Only the newest version is retained per feed, so "the file that matches this platform" IS the
// current build. The bucket is PRIVATE → every link is a presigned SigV4 GET, never a public URL.
import { listPrefix, presignGet, getObjectText, spacesConfigured, type SpacesObject } from "./s3presign";

export type Platform = "win" | "mac" | "linux";
export interface DownloadAsset { platform: Platform; filename: string; size: number; url: string }
export interface FeedResult { available: boolean; version: string | null; assets: DownloadAsset[] }

const PRESIGN_TTL_S = 3600; // 1h — long enough to click through, short enough to expire

/** Classify an installer/archive filename to a platform, or null if it isn't a user download. */
function infernoPlatform(name: string): Platform | null {
  const n = name.toLowerCase();
  if (n.endsWith(".yml") || n.endsWith(".yaml") || n.endsWith(".blockmap")) return null; // updater metadata
  if (n.endsWith(".exe")) return "win";
  if (n.endsWith(".dmg") || n.endsWith(".pkg")) return "mac";
  if (n.endsWith(".appimage") || n.endsWith(".deb") || n.endsWith(".rpm")) return "linux";
  return null;
}
function cliPlatform(name: string): Platform | null {
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

/** Best-effort semver-ish version pulled from a filename, e.g. "Inferno-0.3.1.exe" → "0.3.1". */
function versionFromName(name: string): string | null {
  const m = name.match(/(\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)/);
  return m ? m[1] : null;
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

/** Resolve the current Inferno desktop build from the `node/` feed. */
export async function infernoFeed(): Promise<FeedResult> {
  if (!spacesConfigured()) return { available: false, version: null, assets: [] };
  const objects = await listPrefix("node/");
  const assets = pickAssets(objects, infernoPlatform);
  const version = assets.map((a) => versionFromName(a.filename)).find(Boolean) ?? null;
  return { available: assets.length > 0, version, assets };
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
    if (text) {
      try {
        const m = JSON.parse(text);
        const v = m?.version ?? m?.latest ?? m?.tag ?? null;
        if (typeof v === "string" && v.trim()) version = v.trim().replace(/^v/, "");
      } catch { /* fall through to filename-derived version */ }
    }
  }
  if (!version) version = assets.map((a) => versionFromName(a.filename)).find(Boolean) ?? null;
  return { available: assets.length > 0, version, assets };
}

/** The full downloads payload for the portal: Inferno (node feed) + CLI, each with a version + links. */
export async function downloadsPayload(): Promise<{ configured: boolean; inferno: FeedResult; cli: FeedResult }> {
  const configured = spacesConfigured();
  if (!configured) {
    const empty: FeedResult = { available: false, version: null, assets: [] };
    return { configured, inferno: empty, cli: empty };
  }
  const [inferno, cli] = await Promise.all([infernoFeed(), cliFeed()]);
  return { configured, inferno, cli };
}
