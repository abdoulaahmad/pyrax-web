// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Feed → per-platform installer resolution. Given the object keys under a feed prefix (from Spaces
// ListObjectsV2), pick the current installer for Windows / macOS / Linux and extract the version.
// Only the newest build per feed exists in the bucket (release.yml `aws s3 sync --delete`), so the
// resolution is simply "the one installer of each platform's type".
//
//   node/  (Inferno) + ember/ (Ember): electron-builder artifacts
//       Windows -> *.exe            (NSIS installer; skip *.blockmap)
//       macOS   -> *.dmg
//       Linux   -> *.AppImage
//       version -> parsed from the filename (e.g. Inferno-0.6.0.exe -> 0.6.0)
//   cli/ : version + filenames come from manifest.json ({version, files:{win,mac,linux}}).
import { listKeys, presignGet } from "./spaces";

export type Platform = "win" | "mac" | "linux";
export const PLATFORMS: Platform[] = ["win", "mac", "linux"];
export const PLATFORM_LABEL: Record<Platform, string> = { win: "Windows", mac: "macOS", linux: "Linux" };

export interface PlatformDownload {
  platform: Platform;
  label: string;
  filename: string;
  url: string; // presigned GET URL (valid ~15 min)
}
export interface Product {
  id: string;
  name: string;
  note: string;
  restricted?: boolean; // true => individually access-gated (e.g. internal Ember)
  version: string | null; // null => nothing published yet
  downloads: PlatformDownload[]; // empty => nothing published for any platform yet
}

/** Basename of an object key (part after the last "/"). Exported for fuzzing (untrusted bucket key). */
export const base = (key: string) => key.split("/").pop() || key;

/** Extract a semver-ish version from an installer filename (first N.N[.N…] run).
 *  Exported for fuzzing: the input is an attacker-influenceable object key from a bucket listing. */
export function versionFromFilename(name: string): string | null {
  // Match the semver ONLY — a bare 3-part (or 2-part) version. Do NOT trail into filename tokens like
  // `-Setup.exe` / `-arm64.dmg`: the artifactName is `<productName>-<version>-<suffix>.<ext>`, and a
  // greedy suffix match previously produced junk versions like "0.1.1-Setup.exe" on the download cards.
  const m = name.match(/(\d+\.\d+\.\d+)/) ?? name.match(/(\d+\.\d+)/);
  return m ? m[1] : null;
}

/** Match a desktop-app (Inferno/Ember) feed: one installer per platform by extension.
 *  Exported for fuzzing: `keys` are attacker-influenceable object keys from a bucket listing. */
export function matchDesktop(keys: string[]): Record<Platform, string | null> {
  const files = keys.map(base);
  const pick = (test: (n: string) => boolean) => files.find(test) ?? null;
  return {
    // .exe but never the .blockmap sidecar; installers only.
    win: pick((n) => /\.exe$/i.test(n)),
    mac: pick((n) => /\.dmg$/i.test(n)),
    // Prefer the portable .AppImage; fall back to a .deb if that's all the feed published.
    linux: pick((n) => /\.AppImage$/i.test(n)) ?? pick((n) => /\.deb$/i.test(n)),
  };
}

/** Resolve an Inferno/Ember-style desktop feed into a Product (presigning each platform's installer). */
export async function resolveDesktopFeed(
  feed: string,
  meta: { id: string; name: string; note: string; restricted?: boolean },
): Promise<Product> {
  const keys = await listKeys(`${feed}/`);
  const picks = matchDesktop(keys);
  const downloads: PlatformDownload[] = [];
  let version: string | null = null;
  for (const platform of PLATFORMS) {
    const file = picks[platform];
    if (!file) continue;
    version ??= versionFromFilename(file);
    const url = presignGet(`${feed}/${file}`);
    if (url) downloads.push({ platform, label: PLATFORM_LABEL[platform], filename: file, url });
  }
  return { id: meta.id, name: meta.name, note: meta.note, restricted: meta.restricted, version, downloads };
}

interface CliManifest {
  version?: string;
  files?: { win?: string; mac?: string; linux?: string };
}

/** A CLI download selection: the version + the per-platform filenames that also exist in the feed. */
export interface CliSelection { version: string | null; picks: { platform: Platform; filename: string }[] }

/**
 * Pure selection from an UNTRUSTED parsed cli/manifest.json plus the set of keys actually present in
 * the feed. Extracted from resolveCliFeed() so the untrusted-manifest handling can be fuzzed without a
 * network/presign step. Total: `manifest` is `unknown` (may be non-object, an array, or have hostile
 * `files`/`version`), yet this never throws — it returns only platforms whose declared filename is a
 * string AND actually present in `keys` (guards a stale/hostile manifest pointing at a missing/renamed
 * object). Presigning + URL building stays in resolveCliFeed; this is the trust-boundary decision.
 */
export function selectCliDownloads(manifest: unknown, keys: string[]): CliSelection {
  const present = new Set(keys.map(base));
  const m = (manifest && typeof manifest === "object" ? manifest : {}) as CliManifest;
  const files = (m.files && typeof m.files === "object" ? m.files : {}) as Record<string, unknown>;
  const picks: { platform: Platform; filename: string }[] = [];
  for (const platform of PLATFORMS) {
    const file = files[platform];
    if (typeof file !== "string" || !file) continue;
    if (!present.has(base(file))) continue; // only offer files that actually exist in the feed
    picks.push({ platform, filename: file });
  }
  const version = typeof m.version === "string" && m.version ? m.version : null;
  return { version, picks };
}

/** Resolve the CLI feed from cli/manifest.json ({version, files:{win,mac,linux}} — filenames only). */
export async function resolveCliFeed(
  meta: { id: string; name: string; note: string } = { id: "cli", name: "PYRAX CLI", note: "Headless node + wallet for servers and power users." },
): Promise<Product> {
  const keys = await listKeys("cli/");
  const empty: Product = { id: meta.id, name: meta.name, note: meta.note, version: null, downloads: [] };
  if (!keys.some((k) => base(k) === "manifest.json")) return empty;
  const raw = presignGet("cli/manifest.json");
  if (!raw) return empty;
  let manifest: unknown;
  try {
    const res = await fetch(raw);
    if (!res.ok) return empty;
    manifest = await res.json();
  } catch {
    return empty;
  }
  const selection = selectCliDownloads(manifest, keys);
  const downloads: PlatformDownload[] = [];
  for (const { platform, filename } of selection.picks) {
    const url = presignGet(`cli/${filename}`);
    if (url) downloads.push({ platform, label: PLATFORM_LABEL[platform], filename, url });
  }
  return { id: meta.id, name: meta.name, note: meta.note, version: selection.version, downloads };
}
