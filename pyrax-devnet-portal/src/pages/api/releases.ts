// SPDX-License-Identifier: LicenseRef-Proprietary
// Release feed. GET lists releases (any tester). POST publishes one (releases.publish) and fans out
// notifications: in-app + email + web push + a #announcements chat post.
import type { APIRoute } from "astro";
import { requireTester, subjectOf } from "../../server/guard";
import { listReleases, createRelease, listTesters, addNotification, postSystemMessage, listPushSubs, deletePushSub } from "../../server/db";
import { json } from "../../server/http";
import { can } from "../../lib/permissions";
import { sendReleaseAlert } from "../../server/email";
import { sendPushToAll } from "../../server/push";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false }, 401);
  return json({ ok: true, releases: await listReleases() });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "releases.publish")) return json({ ok: false, error: "Forbidden." }, 403);
  const b = await request.json().catch(() => ({}));
  const version = String(b?.version ?? "").trim();
  if (!version) return json({ ok: false, errors: { version: "Version is required." } }, 422);
  const release = await createRelease(me.id, { version, channel: b?.channel, title: b?.title, notes: b?.notes, downloadUrl: b?.downloadUrl });

  // Fan-out (fire-and-forget so publish stays fast).
  const title = String(b?.title ?? "").trim();
  void (async () => {
    try {
      const testers = (await listTesters()).filter((t) => t.status === "active");
      for (const t of testers) await addNotification(t.id, "release", `New build ${version}`, title || "A new devnet build is available.", "/app");
      for (const t of testers) void sendReleaseAlert(t.email, version, title, String(b?.notes ?? ""), b?.downloadUrl || undefined);
      await postSystemMessage("announcements", `🚀 New release ${version}${title ? " — " + title : ""}. Update + keep your node online.`);
      const subs = await listPushSubs();
      const gone = await sendPushToAll(subs, { title: `PYRAX Devnet — ${version}`, body: title || "A new build is available. Update now.", url: "/app" });
      for (const ep of gone) await deletePushSub(ep);
    } catch (e) { console.error("[releases] fan-out:", e); }
  })();

  return json({ ok: true, release }, 201);
};
