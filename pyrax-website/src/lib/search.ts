// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// pyrax-website's ⌘K entries, layered onto the shared command palette. The shared CORE (in
// @pyrax/shared) already carries the top cross-property destinations (Home, Network, Docs, Build,
// NEURAX, Token, Run a Node, Roadmap, Explorer, Peers), so these are this site's GRANULAR additions:
// the high-value in-page sections + every docs page (via the lightweight DOC_INDEX, not the heavy
// docs-data). mountChrome() merges them in; duplicates of the core entries are intentionally omitted.

import { cmdkEntry, type CmdkEntry } from "@pyrax/shared";
import { DOC_INDEX } from "./docs-index.js";

const PAGES: CmdkEntry[] = [
  cmdkEntry("GhostDAG consensus", "/network.html#ghostdag", "Network", "lanes", "blockdag blue score k-cluster fork choice"),
  cmdkEntry("TriStream mining", "/network.html#tristream", "Network", "streams", "blake3 sha256 kawpow randomx pos bls finality asic gpu cpu"),
  cmdkEntry("Shielded privacy", "/network.html#privacy", "Network", "lock", "zk plonky2 shielded note nullifier no trusted setup"),
  cmdkEntry("ISP-resistant mesh", "/network.html#mesh", "Network", "globe", "mixnet sphinx onion libp2p gossipsub bootstrapless"),
  cmdkEntry("Architecture", "/architecture.html", "Network", "cube", "layers stack execution vms l2 l3 rollup scaling"),
  cmdkEntry("NEURAX — run on your GPU", "/neurax.html#local", "NEURAX", "gpu", "local first rtx 3060 offline private"),
  cmdkEntry("NEURAX marketplace", "/neurax.html#marketplace", "NEURAX", "market", "earn compute pyrx per cu escrow settle"),
  cmdkEntry("Tokenomics — supply & allocation", "/token.html#distribution", "Token", "pie", "50b hard cap genesis 0.0025 fdv pools vesting"),
  cmdkEntry("Fees, emissions & staking", "/token.html#emissions", "Token", "flame", "eip-1559 base fee burn halving slashing 100k"),
  cmdkEntry("Use cases", "/use-cases.html", "Resources", "stack", "payments local ai earning dapps"),
  cmdkEntry("Ecosystem", "/ecosystem.html", "Resources", "server", "apps wallet cli services brand downloads"),
  cmdkEntry("Security & audits", "/security.html", "Resources", "shield", "external zk audit gate adversarial review"),
  cmdkEntry("Whitepaper", "/whitepaper.html", "Resources", "book", "technical plain english spec"),
  cmdkEntry("Company", "/company.html", "Company", "book", "about ama faq brand contact"),
  cmdkEntry("Join the waitlist", "/#waitlist", "Pages", "spark", "signup email early access mainnet"),
];

// Every docs page (lightweight index — no heavy content pulled into the bundle).
const DOCS: CmdkEntry[] = DOC_INDEX.map((d) =>
  cmdkEntry(d.title, `/docs.html#/${d.slug}`, d.category, "book", "docs documentation"),
);

/** This site's ⌘K entries, merged into the shared palette by mountChrome(). */
export const SEARCH_ENTRIES: CmdkEntry[] = [...PAGES, ...DOCS];
