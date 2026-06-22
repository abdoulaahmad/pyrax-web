// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// team-pyrax — configuration + the platform's role / module model.
//
// Everything tunable lives here. Secrets are read from the environment ONLY (never
// committed); sensible non-secret defaults keep local development frictionless.

import crypto from "node:crypto";

// --- identity / access rules ------------------------------------------------

/** The ONLY email domain permitted to access the platform. Enforced on every
 *  login request AND when whitelisting a user — there is no path in for any other
 *  domain. */
export const EMAIL_DOMAIN = (process.env.TEAM_EMAIL_DOMAIN ?? "pyraxchain.com").toLowerCase();

/** The hardcoded superuser — seeded on first boot, always all-access, and never
 *  removable or demotable. This is the account that whitelists everyone else. */
export const SUPERUSER_EMAIL = (process.env.TEAM_SUPERUSER ?? "shawn.wilson@pyraxchain.com").toLowerCase();

// --- roles + modules --------------------------------------------------------

/** The role catalogue. `superuser` implicitly grants every role; new modules add
 *  their own role here as the platform grows. */
export const ROLES = Object.freeze({
  SUPERUSER: "superuser",
  USER_ADMIN: "user-admin", // whitelist teammates + assign roles ("adding users")
  DOWNLOADS: "downloads", // access the download center
});
export const ALL_ROLES = Object.freeze(Object.values(ROLES));

/** Human-facing role metadata (shown in the admin UI). */
export const ROLE_META = Object.freeze({
  [ROLES.SUPERUSER]: { label: "Superuser", desc: "Full access to every module. Cannot be revoked." },
  [ROLES.USER_ADMIN]: { label: "User Admin", desc: "Whitelist teammates and assign their roles." },
  [ROLES.DOWNLOADS]: { label: "Downloads", desc: "Access the app + CLI download center." },
});

/** Dashboard module tiles. Each requires a role (superuser always passes). `key`
 *  is stable; the frontend supplies the icon/route. New modules append here. */
export const MODULES = Object.freeze([
  { key: "downloads", title: "Downloads", desc: "Latest Ember, Inferno & CLI installers for Windows, macOS and Linux.", role: ROLES.DOWNLOADS, icon: "download" },
  { key: "users", title: "User Management", desc: `Whitelist @${EMAIL_DOMAIN} teammates and assign their module roles.`, role: ROLES.USER_ADMIN, icon: "users" },
]);

// --- auth tunables ----------------------------------------------------------

export const MAGIC_TTL_MS = 15 * 60 * 1000; // a sign-in link is valid 15 min, single-use
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // a session lasts 7 days (sliding)
export const MAGIC_MAX_PER_WINDOW = 5; // at most N links per email per MAGIC_TTL_MS
export const COOKIE_NAME = "tp_session";

/** Pepper used to HMAC magic tokens + session ids before storage and to derive
 *  CSRF tokens. If unset, a random per-boot value is used — fine for local dev, but
 *  every restart invalidates outstanding links/sessions, so SET IT in production. */
const EPHEMERAL = crypto.randomBytes(32).toString("hex");
export const SESSION_SECRET = process.env.SESSION_SECRET ?? EPHEMERAL;
export const SESSION_SECRET_IS_EPHEMERAL = !process.env.SESSION_SECRET;

// --- public origin ----------------------------------------------------------

/** This site's public origin — builds the magic-link URL and locks CORS / CSRF /
 *  Secure-cookie behaviour. */
export const PUBLIC_URL = (process.env.PUBLIC_URL ?? "https://team-pyrax.pyraxchain.com").replace(/\/+$/, "");

// --- transactional email (Brevo) -------------------------------------------

export const BREVO_API_KEY = process.env.BREVO_API_KEY ?? "";
export const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? `noreply@${EMAIL_DOMAIN}`;
export const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME ?? "PYRAX Team";

// --- downloads (DigitalOcean Spaces OTA feed) -------------------------------

/** Public OTA base (Cloudflare in front of DO Spaces) where the electron-updater
 *  metadata (latest*.yml) + installers live. Used to resolve "newest version". */
export const OTA_BASE = (process.env.OTA_BASE ?? "https://updates.pyraxchain.com").replace(/\/+$/, "");

/** DO Spaces (S3-compatible) — only needed for DOWNLOAD_MODE=presign, where the
 *  backend mints short-lived signed URLs straight from the bucket (true gating).
 *  Resolving "newest" always uses the public OTA base, so version metadata works
 *  even without these. Accepts SPACES_* or the apps' DO_SPACES_* names. */
export const SPACES = Object.freeze({
  region: process.env.SPACES_REGION ?? process.env.DO_SPACES_REGION ?? "",
  bucket: process.env.SPACES_BUCKET ?? process.env.DO_SPACES_BUCKET ?? "",
  key: process.env.SPACES_KEY ?? process.env.DO_SPACES_KEY ?? "",
  secret: process.env.SPACES_SECRET ?? process.env.DO_SPACES_SECRET ?? "",
  endpoint: process.env.SPACES_ENDPOINT ?? "", // e.g. nyc3.digitaloceanspaces.com (else derived from region)
});

/** `presign` = mint short-lived signed Spaces URLs (gated); `public` = redirect to
 *  the OTA CDN. Defaults to presign when Spaces creds are present, else public. */
export const DOWNLOAD_MODE =
  (process.env.DOWNLOAD_MODE ?? (SPACES.key && SPACES.secret && SPACES.bucket ? "presign" : "public")).toLowerCase();

/** Presigned-URL lifetime (seconds). Short — the link is handed only to an
 *  authenticated session and is meant to be followed immediately. */
export const PRESIGN_TTL_S = Number(process.env.PRESIGN_TTL_S ?? 120);

/** Download catalogue. `feed` is the OTA prefix; electron products read
 *  electron-updater latest*.yml, manifest products read <feed>/manifest.json. */
export const PRODUCTS = Object.freeze([
  { key: "ember", name: "Ember", tagline: "Internal seed / admin console", feed: "ember", kind: "electron" },
  { key: "inferno", name: "Inferno Node", tagline: "Public node — mine, stake, contribute compute", feed: "node", kind: "electron" },
  { key: "cli", name: "PYRAX CLI", tagline: "Headless node installer for servers", feed: "cli", kind: "manifest" },
]);

// --- runtime ----------------------------------------------------------------

export const PORT = Number(process.env.PORT ?? 8790);
export const DATA_DIR = process.env.DATA_DIR ?? ".";
/** Honour X-Forwarded-For only behind a known proxy (Caddy sets it). */
export const TRUST_PROXY = process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true";
