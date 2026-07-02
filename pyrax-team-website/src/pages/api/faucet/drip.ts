// SPDX-License-Identifier: LicenseRef-Proprietary
// Team-portal faucet: dispense a rate-limited drip of test PYRX on PYRAX Forge (chain 710823) by
// relaying to the shared faucet service (faucet.pyraxchain.com), which signs from the genesis-funded
// Forge faucet wallet. Rate-limited per address by the service; per-user when FAUCET_BOT_KEY is set.
// (requires faucet.drip)
import type { APIRoute } from "astro";
import { requireUser, subjectOf } from "../../../server/guard";
import { audit } from "../../../server/db";
import { json } from "../../../server/http";
import { can } from "../../../lib/permissions";

export const prerender = false;
const FAUCET_URL = (process.env.FAUCET_URL || "https://faucet.pyraxchain.com").replace(/\/+$/, "");
const BOT_KEY = process.env.FAUCET_BOT_KEY || "";
const FORGE_CHAIN = 710823;
const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

export const POST: APIRoute = async ({ request, cookies }) => {
  const me = await requireUser(cookies);
  if (!me) return json({ ok: false, error: "Not signed in." }, 401);
  if (!can(subjectOf(me), "faucet.drip")) return json({ ok: false, error: "Forbidden." }, 403);

  const b = await request.json().catch(() => ({}));
  const address = String(b?.address ?? "").trim();
  if (!ADDR_RE.test(address)) return json({ ok: false, error: "Enter a valid 0x wallet address." }, 422);

  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (BOT_KEY) headers.authorization = `Bearer ${BOT_KEY}`; // per-user rate-limit keying (subject)
    const res = await fetch(`${FAUCET_URL}/drip`, {
      method: "POST",
      headers,
      body: JSON.stringify({ address, chainId: FORGE_CHAIN, subject: `team:${me.id}` }),
      signal: AbortSignal.timeout(30_000),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.ok) return json({ ok: false, error: d?.error || `Faucet error (${res.status}).` }, res.status === 429 ? 429 : 502);
    await audit({ actorId: me.id, actorEmail: me.email, action: "faucet.drip", detail: { address, network: d.network, hash: d.hash } });
    return json({ ok: true, hash: d.hash, amount: d.amount, network: d.network });
  } catch {
    return json({ ok: false, error: "Couldn't reach the faucet service — try again shortly." }, 502);
  }
};
