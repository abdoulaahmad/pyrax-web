// SPDX-License-Identifier: LicenseRef-Proprietary
// Devnet status + the downloads Open/Closed gate (requires devnet.manage). Edits the shared
// devnet_tester settings that the tester portal reads.
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { getDevnetSettings, setDevnetSettings } from "../../../server/devnet-db";
import { audit } from "../../../server/db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;
const str = (v: unknown, max: number, fb = "") => { const s = typeof v === "string" ? v.trim() : ""; return s ? s.slice(0, max) : fb; };

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  return json({ ok: true, settings: await getDevnetSettings() });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  if (!can(subjectOf(me), "devnet.manage")) return json({ ok: false, error: "Forbidden." }, 403);
  const b = (await request.json().catch(() => ({})))?.settings || {};
  const cur = await getDevnetSettings();
  const downloads = Array.isArray(b.downloads) ? b.downloads.slice(0, 12).map((d: any) => ({ name: str(d?.name, 40), platform: str(d?.platform, 40), url: str(d?.url, 400), note: str(d?.note, 80) })).filter((d: any) => d.name && d.url) : cur.downloads;
  const next = {
    devnetName: str(b.devnetName, 80, cur.devnetName),
    version: str(b.version, 40, cur.version),
    chainId: Number.isFinite(Number(b.chainId)) ? Math.floor(Number(b.chainId)) : cur.chainId,
    rpc: str(b.rpc, 200, cur.rpc),
    whatToTest: str(b.whatToTest, 1000, cur.whatToTest),
    telemetryUrl: str(b.telemetryUrl, 200, cur.telemetryUrl || ""),
    downloadsOpen: typeof b.downloadsOpen === "boolean" ? b.downloadsOpen : cur.downloadsOpen,
    downloadsClosedMessage: str(b.downloadsClosedMessage, 400, cur.downloadsClosedMessage),
    downloads,
    legalRequired: typeof b.legalRequired === "boolean" ? b.legalRequired : (cur.legalRequired ?? true),
  };
  await setDevnetSettings(next);
  await audit({ actorId: me.id, actorEmail: me.email, action: "devnet.settings", detail: { version: next.version, downloadsOpen: next.downloadsOpen } });
  return json({ ok: true, settings: next });
};
