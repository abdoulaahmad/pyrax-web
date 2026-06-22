// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
// Logs & Events — query indexed contract event logs by address / topic0 / block range.

import { mountShell } from "../lib/shell.js";
import { subscribe, getSelectedNetwork } from "@pyrax/shared";
import type { NetSnapshot } from "@pyrax/shared";
import { apiLogs, isIndexed, type IdxLog } from "../lib/api.js";
import { pageHead, card, loading, errorPanel, offlinePanel, emptyPanel, addrLink, txLink, blockLink, wireCopy } from "../lib/widgets.js";
import { escapeHtml } from "../lib/format.js";

const main = mountShell("logs");
let chainId = getSelectedNetwork().chainId;

function form(): string {
  return card(`
    <div style="display:grid;gap:.7rem;grid-template-columns:1fr 1fr">
      <div><label class="expl-stat-label">Address (optional)</label><input data-addr class="expl-search-input" placeholder="0x…" style="display:block;width:100%;margin-top:.3rem;padding:.5rem;border:1px solid var(--color-line);border-radius:.5rem;background:var(--color-bg-2)"></div>
      <div><label class="expl-stat-label">Topic0 (event sig, optional)</label><input data-topic class="expl-search-input" placeholder="0x…" style="display:block;width:100%;margin-top:.3rem;padding:.5rem;border:1px solid var(--color-line);border-radius:.5rem;background:var(--color-bg-2)"></div>
      <div><label class="expl-stat-label">From block</label><input data-from class="expl-search-input" placeholder="0" style="display:block;width:100%;margin-top:.3rem;padding:.5rem;border:1px solid var(--color-line);border-radius:.5rem;background:var(--color-bg-2)"></div>
      <div><label class="expl-stat-label">To block</label><input data-to class="expl-search-input" placeholder="latest" style="display:block;width:100%;margin-top:.3rem;padding:.5rem;border:1px solid var(--color-line);border-radius:.5rem;background:var(--color-bg-2)"></div>
    </div>
    <button data-go class="expl-search-btn" style="margin-top:.9rem;border:0;cursor:pointer">Search logs</button>
  `);
}

function results(rows: IdxLog[]): string {
  if (!rows.length) return emptyPanel("No logs match — try widening the filters, or this network may have no events yet.");
  return rows
    .map(
      (l) => card(`<div style="font-size:.8rem">
      <div style="display:flex;gap:.8rem;flex-wrap:wrap;align-items:center">${addrLink(l.address, false)} · ${blockLink(l.block_number)} · ${txLink(l.tx_hash)}</div>
      <div style="margin-top:.4rem;color:var(--color-faint)">topics</div>
      ${[l.topic0, l.topic1, l.topic2, l.topic3].filter(Boolean).map((t, i) => `<div class="expl-mono" style="word-break:break-all">[${i}] ${escapeHtml(t as string)}</div>`).join("")}
      <div style="margin-top:.4rem;color:var(--color-faint)">data</div>
      <div class="expl-mono" style="word-break:break-all">${escapeHtml(l.data || "0x")}</div>
    </div>`),
    )
    .join("");
}

function frame(): void {
  const net = getSelectedNetwork();
  main.innerHTML = pageHead("Logs & Events", `Query indexed event logs on ${net.name}.`) + form() + `<div data-out></div>`;
  wire();
}

function wire(): void {
  main.querySelector<HTMLButtonElement>("[data-go]")?.addEventListener("click", () => void run());
}

async function run(): Promise<void> {
  const net = getSelectedNetwork();
  const out = main.querySelector("[data-out]");
  if (!out) return;
  if (!(await isIndexed(net.chainId))) {
    out.innerHTML = net.rpc ? emptyPanel("Log search requires the indexer, which isn't indexing this network yet.") : offlinePanel(net.name);
    return;
  }
  out.innerHTML = loading();
  const params: Record<string, string | number> = { limit: 50 };
  const addr = main.querySelector<HTMLInputElement>("[data-addr]")?.value.trim();
  const topic = main.querySelector<HTMLInputElement>("[data-topic]")?.value.trim();
  const from = main.querySelector<HTMLInputElement>("[data-from]")?.value.trim();
  const to = main.querySelector<HTMLInputElement>("[data-to]")?.value.trim();
  if (addr) params.address = addr;
  if (topic) params.topic0 = topic;
  if (from && /^\d+$/.test(from)) params.fromBlock = Number(from);
  if (to && /^\d+$/.test(to)) params.toBlock = Number(to);
  try {
    out.innerHTML = results(await apiLogs(net.chainId, params));
    wireCopy(main);
  } catch (e) {
    out.innerHTML = errorPanel((e as Error).message);
  }
}

frame();
void run();
subscribe((s: NetSnapshot) => {
  if (s.selected.chainId !== chainId) { chainId = s.selected.chainId; frame(); void run(); }
});
