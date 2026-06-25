// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// team-pyrax — configuration + the platform's role / module model.
//
// Everything tunable lives here. Secrets are read from the environment ONLY (never
// committed); sensible non-secret defaults keep local development frictionless.

import crypto from "node:crypto";

// --- identity / access rules ------------------------------------------------

/** The team's PRIMARY email domain — used only for default copy + the default Brevo
 *  sender address. It is NO LONGER an access restriction: access is whitelist-only, so
 *  ANY valid email a user-admin whitelists can sign in (e.g. external B2B contractors). */
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
  NODE_CONTROL: "node-control", // the network node monitor + remote kill switch
  FAUCET: "faucet", // dispense test PYRX from the team faucet
});
export const ALL_ROLES = Object.freeze(Object.values(ROLES));

/** Human-facing role metadata (shown in the admin UI). */
export const ROLE_META = Object.freeze({
  [ROLES.SUPERUSER]: { label: "Superuser", desc: "Full access to every module. Cannot be revoked." },
  [ROLES.USER_ADMIN]: { label: "User Admin", desc: "Whitelist teammates and assign their roles." },
  [ROLES.DOWNLOADS]: { label: "Downloads", desc: "Access the app + CLI download center." },
  [ROLES.NODE_CONTROL]: { label: "Node Control", desc: "Monitor every network node's version + remotely kill an out-of-date node (last resort)." },
  [ROLES.FAUCET]: { label: "Faucet", desc: "Dispense test PYRX from the team faucet." },
});

/** App Roles — per-tab access to the Ember DESKTOP app's Admin area. These are
 *  distinct from the module roles above (which gate THIS team site's dashboard
 *  tiles): each Ember admin TAB has its own App Role. A teammate is granted App
 *  Roles here, then unlocks Ember's admin area with an emailed OTP — Ember loads
 *  ONLY the admin tabs the teammate's App Roles permit. Add a tab ⇒ add a role +
 *  its `tab` mapping here. */
export const APP_ROLES = Object.freeze({
  EMBER_SEED_LISTS: "ember-seed-lists",
});
export const ALL_APP_ROLES = Object.freeze(Object.values(APP_ROLES));

/** App-Role metadata. `tab` is the Ember nav-item id this role unlocks. */
export const APP_ROLE_META = Object.freeze({
  [APP_ROLES.EMBER_SEED_LISTS]: { label: "Ember · Seed Lists", desc: "Publish + sign signed seed lists in the Ember admin app.", tab: "seedlists" },
});

/** Every role a user may legitimately hold (module + app), for storage validation
 *  + assignment. Superuser implicitly grants all of them. */
export const ASSIGNABLE_ROLES = Object.freeze([...ALL_ROLES, ...ALL_APP_ROLES]);

/** Dashboard module tiles. Each requires a role (superuser always passes). `key`
 *  is stable; the frontend supplies the icon/route. New modules append here. */
export const MODULES = Object.freeze([
  { key: "downloads", title: "Downloads", desc: "Latest Ember, Inferno & CLI installers for Windows, macOS and Linux.", role: ROLES.DOWNLOADS, icon: "download" },
  { key: "users", title: "User Management", desc: "Whitelist teammates & contractors and assign their module roles.", role: ROLES.USER_ADMIN, icon: "users" },
  { key: "node-control", title: "Node Control", desc: "Live network node monitor — versions vs. the current release — with a remote kill switch.", role: ROLES.NODE_CONTROL, icon: "power" },
  { key: "faucet", title: "Faucet", desc: "Dispense test PYRX to any address on the internal networks.", role: ROLES.FAUCET, icon: "droplet" },
]);

// --- node-control / tunnel admin (the kill switch calls the self-hosted relay's
//     HMAC-gated /__admin API; the relay shares PYRAX_TUNNEL_ADMIN_SECRET) ----------
/** The tunnel relay's internal base URL (compose service) for the admin control plane. */
export const TUNNEL_ADMIN_BASE = process.env.PYRAX_TUNNEL_ADMIN_BASE ?? "http://tunnel-relay:8792";
/** Shared HMAC secret with the tunnel relay's /__admin API (must equal the relay's). */
export const TUNNEL_ADMIN_SECRET = process.env.PYRAX_TUNNEL_ADMIN_SECRET ?? "";

// --- auth tunables ----------------------------------------------------------

export const MAGIC_TTL_MS = 15 * 60 * 1000; // a sign-in link is valid 15 min, single-use
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // a session lasts 7 days (sliding)
export const MAGIC_MAX_PER_WINDOW = 5; // at most N links per email per MAGIC_TTL_MS
export const COOKIE_NAME = "tp_session";

// --- Ember admin OTP --------------------------------------------------------
// A teammate unlocks the Ember desktop app's admin area with a single-use code
// emailed here. 7 uppercase alphanumeric chars (excluding ambiguous 0/O/1/I).
export const EMBER_OTP_TTL_MS = 10 * 60 * 1000; // valid 10 min, single-use
export const EMBER_OTP_MAX_PER_WINDOW = 5; // at most N codes per email per TTL
export const EMBER_OTP_LENGTH = 7;
export const EMBER_OTP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

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

/** Brand logo shown in transactional emails — the horizontal wordmark rasterized to a
 *  PNG (email clients block SVG), hosted on the public Spaces CDN. Override with
 *  EMAIL_LOGO_URL once a custom assets domain exists. */
export const EMAIL_LOGO_URL =
  process.env.EMAIL_LOGO_URL ?? "https://pyrax-assets.nyc3.cdn.digitaloceanspaces.com/email/logo-horizontal.png";

/** The dark fire/blue glow field behind transactional emails (matches the site hero),
 *  hosted on the Spaces CDN. Applied via CSS + a VML background so it renders in Outlook. */
export const EMAIL_BG_URL =
  process.env.EMAIL_BG_URL ?? "https://pyrax-assets.nyc3.digitaloceanspaces.com/email/email-bg.png";

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

// --- database (DigitalOcean Managed PostgreSQL) -----------------------------

/** Postgres connection string. In production this is the cluster's VPC (private)
 *  URL (`...?sslmode=require`), injected by the deploy. Local dev defaults to a
 *  throwaway local Postgres (see README). */
export const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:dev@localhost:5544/team_pyrax";

/** TLS to the DB: DO requires it (sslmode=require). When DATABASE_CA is provided
 *  the server cert is verified; otherwise the connection is encrypted but not
 *  verified (acceptable on a private VPC, where there is no MITM surface). */
export const DATABASE_SSL = /sslmode=require/i.test(DATABASE_URL) || process.env.DATABASE_SSL === "1";
export const DATABASE_CA = process.env.DATABASE_CA ?? ""; // PEM of DO's CA cert (optional)

// --- runtime ----------------------------------------------------------------

export const PORT = Number(process.env.PORT ?? 8790);
/** Honour X-Forwarded-For only behind a known proxy (Caddy sets it). */
export const TRUST_PROXY = process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true";
