// SPDX-License-Identifier: LicenseRef-Proprietary
// Read/update the public nodes site settings (open/close, default network, downloads).
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { getNodesSettings, setNodesSettings, type DownloadItem } from "../../../server/nodes-db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;
const NETWORKS = [
  { label: "seed", name: "PYRAX Seed" }, { label: "forge", name: "PYRAX Forge" },
  { label: "rise", name: "PYRAX Rise" }, { label: "one", name: "PYRAX One" },
];

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireUser(cookies);
  if (!me || (!can(subjectOf(me), "network.manage") && !can(subjectOf(me), "network.downloads"))) return json({ ok: false }, 403);
  return json({ ok: true, settings: await getNodesSettings(), networks: NETWORKS });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false }, 401);
  const subj = subjectOf(me);
  const b = await request.json().catch(() => ({}));
  const patch: any = {};

  // open / closedMessage / defaultNetwork require network.manage
  const wantsManage = "open" in b || "closedMessage" in b || "defaultNetwork" in b;
  if (wantsManage) {
    if (!can(subj, "network.manage")) return json({ ok: false, error: "Forbidden." }, 403);
    if ("open" in b) patch.open = !!b.open;
    if ("closedMessage" in b) patch.closedMessage = String(b.closedMessage ?? "").slice(0, 600);
    if ("defaultNetwork" in b && NETWORKS.some((n) => n.label === b.defaultNetwork)) patch.defaultNetwork = b.defaultNetwork;
  }
  // downloads list + the downloads kill-switch require network.downloads
  if ("downloadsOpen" in b || "downloadsMessage" in b) {
    if (!can(subj, "network.downloads")) return json({ ok: false, error: "Forbidden." }, 403);
    if ("downloadsOpen" in b) patch.downloadsOpen = !!b.downloadsOpen;
    if ("downloadsMessage" in b) patch.downloadsMessage = String(b.downloadsMessage ?? "").slice(0, 600);
  }
  if ("downloads" in b) {
    if (!can(subj, "network.downloads")) return json({ ok: false, error: "Forbidden." }, 403);
    const list = Array.isArray(b.downloads) ? b.downloads : [];
    patch.downloads = list.slice(0, 40).map((d: any): DownloadItem => ({
      product: String(d.product ?? "").slice(0, 60), platform: String(d.platform ?? "").slice(0, 30),
      arch: d.arch ? String(d.arch).slice(0, 20) : undefined, url: String(d.url ?? "").slice(0, 400),
      version: d.version ? String(d.version).slice(0, 40) : undefined, note: d.note ? String(d.note).slice(0, 160) : undefined,
    })).filter((d: DownloadItem) => d.product && d.platform && /^https?:\/\//.test(d.url));
  }
  if (!Object.keys(patch).length) return json({ ok: false, error: "Nothing to update." }, 422);
  const settings = await setNodesSettings(patch, me.display_name || me.email);
  return json({ ok: true, settings });
};
