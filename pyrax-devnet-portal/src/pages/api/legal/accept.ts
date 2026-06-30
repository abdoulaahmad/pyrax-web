// SPDX-License-Identifier: LicenseRef-Proprietary
// Record acceptance of a legal document (NDA or Alpha T&C). The NDA additionally captures the
// recipient's full legal name + their typed digital signature. IP + user agent are recorded for the
// audit trail that admins can review on the team site.
import type { APIRoute } from "astro";
import { requireTester } from "../../../server/guard";
import { recordLegalAcceptance, getLegalStatus } from "../../../server/db";
import { currentSessionStart, SESSION_COOKIE } from "../../../server/auth";
import { json, clientIp } from "../../../server/http";
import { LEGAL_DOCS } from "../../../lib/legal-docs";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const me = await requireTester(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);

  const b = await request.json().catch(() => ({}));
  const doc = LEGAL_DOCS[String(b?.doc ?? "")];
  if (!doc) return json({ ok: false, error: "Unknown document." }, 400);

  let recipientName: string | null = null;
  let signature: string | null = null;
  if (doc.requiresSignature) {
    recipientName = String(b?.recipientName ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
    signature = String(b?.signature ?? "").trim().slice(0, 120);
    if (recipientName.split(" ").filter(Boolean).length < 2) return json({ ok: false, error: "Enter your first and last name." }, 422);
    if (!signature) return json({ ok: false, error: "Type your name to sign." }, 422);
    if (b?.confirmed !== true) return json({ ok: false, error: "Confirm your digital signature." }, 422);
  }

  await recordLegalAcceptance(me.id, doc.id, doc.version, {
    recipientName, signature,
    ip: clientIp(request, clientAddress),
    userAgent: request.headers.get("user-agent") || "",
  });
  const startedAt = (await currentSessionStart(cookies.get(SESSION_COOKIE)?.value)) ?? Date.now();
  return json({ ok: true, legal: await getLegalStatus(me.id, startedAt) });
};
