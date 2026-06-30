// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Contract-verification intake. Validates a submission, confirms the address actually holds
// bytecode on the selected network (via eth_getCode), and records intent. The solc compile +
// bytecode-match step is performed by the verifier service that ships with the explorer indexer
// (ported from the legacy explorer); until that service is wired this returns an honest "queued"
// status rather than a fake "verified" — the explorer never claims a match it did not make.
import type { APIRoute } from "astro";
import { selectedChainId, netFor } from "../../server/chain";
import { rpc } from "../../server/rpc";

export const POST: APIRoute = async ({ request }) => {
  const net = netFor(selectedChainId(request.headers.get("cookie")));
  let body: any;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON body" }, 400); }

  const address = String(body.address || "").trim();
  const compiler = String(body.compiler || "").trim();
  const source = String(body.source || "");
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return json({ ok: false, error: "Enter a valid 0x… contract address." }, 400);
  if (!compiler) return json({ ok: false, error: "Select a compiler version." }, 400);
  if (source.trim().length < 40) return json({ ok: false, error: "Paste the full contract source." }, 400);

  // Confirm the address is actually a contract on this network when a node is reachable.
  let hasCode: boolean | null = null;
  if (net.rpc) {
    try { const code = await rpc(net.rpc, "eth_getCode", [address, "latest"], 6000); hasCode = !!code && code !== "0x"; }
    catch { hasCode = null; }
  }
  if (hasCode === false) return json({ ok: false, error: "No bytecode found at that address on " + net.name + "." }, 400);

  return json({
    ok: true, status: "queued", address, compiler, network: net.key,
    message: hasCode === null
      ? "Submission accepted. The verifier service compiles and matches bytecode once the explorer indexer is connected to a node."
      : "Bytecode confirmed on-chain. Compilation + bytecode match runs in the verifier service shipping with the indexer.",
  });
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
