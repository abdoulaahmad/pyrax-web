// SPDX-License-Identifier: LicenseRef-Proprietary
export const shortHash = (h?: string | null, n = 6): string => (h ? `${h.slice(0, 2 + n)}…${h.slice(-4)}` : "—");
export const shortAddr = (a?: string | null): string => (a ? `${a.slice(0, 8)}…${a.slice(-4)}` : "—");
export const fmtNum = (n: number | string): string => Number(n).toLocaleString("en-US");
export const timeAgo = (sec: number): string => { const s = Math.max(0, Math.floor(Date.now() / 1000) - sec); return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`; };
export const TX_TYPE_TONE: Record<string, string> = { transparent: "#9aa4ba", ethereum: "#f58622", shielded: "#7c5cff", escrow: "#60b8cc", stake: "#fcd03d", gov: "#34d399" };
export const STREAM_TONE: Record<string, string> = { A: "#f58622", B: "#60b8cc", C: "#34d399" };
