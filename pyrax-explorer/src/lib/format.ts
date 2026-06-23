// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Pure formatting + parsing helpers shared across explorer pages (no DOM). PYRAX denominations:
// the base unit is the ASH (smallest, 18 decimals); gas prices are shown in SPARK (1 spark = 1e9 ash,
// i.e. 9 decimals); PYRX is the whole token (1 PYRX = 1e9 spark = 1e18 ash).

export const hexToInt = (h: unknown): number => (typeof h === "string" ? parseInt(h, 16) : NaN);

export const hexToBig = (h: unknown): bigint => {
  if (typeof h !== "string" || !/^0x[0-9a-fA-F]*$/.test(h)) return 0n;
  return BigInt(h === "0x" ? "0x0" : h);
};

const TEN = 10n;
const pow10 = (n: bigint): bigint => {
  let r = 1n;
  for (let i = 0n; i < n; i++) r *= TEN;
  return r;
};

/** Format a base-unit bigint with up to `maxFrac` fraction digits + thousands separators. */
export function formatUnits(value: bigint, decimals = 18, maxFrac = 6): string {
  const base = pow10(BigInt(decimals));
  const neg = value < 0n;
  const v = neg ? -value : value;
  const whole = (v / base).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (v % base).toString().padStart(decimals, "0").slice(0, maxFrac).replace(/0+$/, "");
  return (neg ? "-" : "") + whole + (frac ? "." + frac : "");
}

/** PYRX from a hex/bigint base-unit (ash) value. */
export const toPyrx = (ash: string | bigint, maxFrac = 6): string =>
  formatUnits(typeof ash === "bigint" ? ash : hexToBig(ash), 18, maxFrac);

/** Spark from a hex/bigint base-unit (ash) value — gas prices (1 spark = 1e9 ash). */
export const toSpark = (ash: string | bigint, maxFrac = 3): string =>
  formatUnits(typeof ash === "bigint" ? ash : hexToBig(ash), 9, maxFrac);

export const commas = (n: number | string): string => {
  const s = typeof n === "number" ? Math.trunc(n).toString() : n;
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/** Abbreviate a hash/address: 0x1234…abcd */
export const shorten = (s: string, lead = 6, tail = 4): string =>
  !s ? "" : s.length <= lead + tail + 2 ? s : `${s.slice(0, lead + 2)}…${s.slice(-tail)}`;

/** Relative "12s ago" from a unix-seconds timestamp. */
export function timeAgo(tsSeconds: number, nowMs = Date.now()): string {
  const diff = Math.max(0, Math.floor(nowMs / 1000) - tsSeconds);
  if (diff < 2) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function fullTime(tsSeconds: number): string {
  return new Date(tsSeconds * 1000).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

// Universal-search input-type detection.
export const isAddress = (s: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(s.trim());
export const isHash32 = (s: string): boolean => /^0x[0-9a-fA-F]{64}$/.test(s.trim());
export const isBlockNumber = (s: string): boolean => /^\d+$/.test(s.trim());

export const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Read a query-string param from the current URL. */
export const qp = (name: string): string => new URLSearchParams(window.location.search).get(name) ?? "";
