// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Render smoke test: key pages render server-side to a 200 HTML response using SAMPLE data (no DB,
// no RPC). Uses the Astro container API so the real Astro + React-island pipeline runs. The point is
// that the SSR routes don't throw and produce HTML even with nothing wired — the explorer's core
// promise. Network selection is forced to "Pyrax Rise" (chain 104928: no RPC fallback) so every page
// takes the pure-sample path.
import { describe, it, expect, beforeAll } from "vitest";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";

beforeAll(() => {
  delete process.env.EXPLORER_DATABASE_URL;
  delete process.env.DATABASE_URL;
  delete process.env.RPC_104928;
});

const RISE = 104928;
const cookie = `pyrax_net=${RISE}`;

async function makeContainer() {
  const container = await AstroContainer.create();
  container.addServerRenderer({ name: "@astrojs/react", renderer: reactRenderer });
  container.addClientRenderer({ name: "@astrojs/react", entrypoint: "@astrojs/react/client.js" });
  return container;
}

// Pages keyed by their import + any required params. List/overview pages need only a cookie.
const LIST_PAGES: Record<string, string> = {
  "index": "../src/pages/index.astro",
  "blocks": "../src/pages/blocks.astro",
  "txs": "../src/pages/txs.astro",
  "logs": "../src/pages/logs.astro",
  "tokens": "../src/pages/tokens.astro",
  "contracts": "../src/pages/contracts.astro",
  "dag": "../src/pages/dag.astro",
  "network": "../src/pages/network.astro",
  "gas": "../src/pages/gas.astro",
  "shielded": "../src/pages/shielded.astro",
  "validators": "../src/pages/validators.astro",
};

describe("render smoke (key pages → 200 with sample data)", () => {
  it.each(Object.entries(LIST_PAGES))("renders /%s as 200 HTML", async (name, path) => {
    const container = await makeContainer();
    const mod = await import(path);
    const request = new Request(`http://localhost/${name === "index" ? "" : name}`, { headers: { cookie } });
    const res = await container.renderToResponse(mod.default, { request, routeType: "page" });
    expect(res.status, `${name} should be 200`).toBe(200);
    const html = await res.text();
    expect(html.length).toBeGreaterThan(500);
    expect(html).toContain("<html");
    // PYRAX™ brand title is rendered on every page → confirms the layout + page body ran.
    expect(html).toContain("PYRAX™");
  });

  it("renders a parameterized detail page (/contract/[a]) as 200", async () => {
    const container = await makeContainer();
    const mod = await import("../src/pages/contract/[a].astro");
    const addr = "0x" + "1".repeat(40);
    const request = new Request(`http://localhost/contract/${addr}`, { headers: { cookie } });
    const res = await container.renderToResponse(mod.default, { request, params: { a: addr }, routeType: "page" });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<html");
    expect(html).toContain("Contract");
  });

  it("renders a parameterized detail page (/token/[a]) as 200", async () => {
    const container = await makeContainer();
    const mod = await import("../src/pages/token/[a].astro");
    const addr = "0x" + "2".repeat(40);
    const request = new Request(`http://localhost/token/${addr}`, { headers: { cookie } });
    const res = await container.renderToResponse(mod.default, { request, params: { a: addr }, routeType: "page" });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<html");
    expect(html).toContain("Token");
  });
});
