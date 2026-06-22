// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Cloudflare Worker — the Brevo waitlist proxy. The static site POSTs { email } to this route;
// the worker holds the Brevo API key server-side (NEVER in client JS) and creates/updates the
// contact via Brevo's REST API. Deploy to e.g. https://pyraxchain.com/api/subscribe (route binding) and
// set BREVO_API_KEY + BREVO_LIST_ID as Worker secrets/vars.
//
//   wrangler secret put BREVO_API_KEY
//   wrangler deploy   (with [vars] BREVO_LIST_ID and a route for /api/subscribe)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    const cors = {
      "access-control-allow-origin": env.ALLOW_ORIGIN || "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "bad_json" }, 400, cors);
    }
    const email = String(body?.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return json({ error: "invalid_email" }, 400, cors);
    if (!env.BREVO_API_KEY) return json({ error: "not_configured" }, 500, cors);

    const listIds = env.BREVO_LIST_ID ? [Number(env.BREVO_LIST_ID)] : undefined;
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        email,
        listIds,
        updateEnabled: true,
        attributes: { SOURCE: String(body?.source || "pyrax-website") },
      }),
    });

    if (res.ok || res.status === 204) return json({ ok: true }, 200, cors);
    // Brevo returns 400 "duplicate_parameter" when the contact already exists.
    const txt = await res.text();
    if (res.status === 400 && /duplicate/i.test(txt)) return json({ ok: true, existing: true }, 409, cors);
    return json({ error: "brevo_error", status: res.status }, 502, cors);
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}
