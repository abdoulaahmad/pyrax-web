// SPDX-License-Identifier: LicenseRef-Proprietary
import { describe, it, expect } from "vitest";
import { NAV, NAV_GROUPS, NAV_ORDER, navMeta, type ModuleKey } from "../src/lib/nav";

describe("nav", () => {
  it("has unique keys", () => {
    const keys = NAV.map((n) => n.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("derives groups in first-encounter order, matching how the sidebar paints sections", () => {
    expect(NAV_GROUPS).toEqual(["Workspace", "Onboarding", "Testing", "Community", "Account", "Legal", "Admin"]);
  });

  it("flattens into sidebar paint order — grouped, not declaration order", () => {
    // Declaration order interleaves Workspace and Onboarding; the rendered order must not.
    expect(NAV_ORDER.map((n) => n.key)).toEqual([
      "dashboard", "downloads", "releases",
      "missions", "training", "quiz", "certification",
      "tests", "issues",
      "leaderboard", "chat",
      "settings",
      "nda", "tos",
      "triage", "testers",
    ]);
  });

  it("keeps NAV_ORDER a permutation of NAV — nothing dropped or duplicated by grouping", () => {
    expect(NAV_ORDER).toHaveLength(NAV.length);
    expect(new Set(NAV_ORDER.map((n) => n.key))).toEqual(new Set(NAV.map((n) => n.key)));
  });

  it("numbers pages by sidebar position, zero-padded", () => {
    // This is the regression: Dashboard used to hard-code eyebrow 'Onboarding' / index '01' while
    // sitting in the Workspace group. Both now come from one place and cannot disagree.
    expect(navMeta("dashboard")).toMatchObject({ eyebrow: "Workspace", index: "01" });
    expect(navMeta("downloads").index).toBe("02");
    expect(navMeta("missions")).toMatchObject({ eyebrow: "Onboarding", index: "04" });
    expect(navMeta("certification")).toMatchObject({ eyebrow: "Onboarding", index: "07" });
    expect(navMeta("testers").index).toBe("16");
  });

  it("gives every nav item an eyebrow matching its own group", () => {
    for (const item of NAV) {
      expect(navMeta(item.key).eyebrow).toBe(item.group);
      expect(navMeta(item.key).label).toBe(item.label);
    }
  });

  it("indices are two digits, unique, and contiguous from 01", () => {
    const indices = NAV.map((n) => navMeta(n.key).index);
    expect(new Set(indices).size).toBe(NAV.length);
    for (const i of indices) expect(i).toMatch(/^\d{2}$/);
    expect([...indices].sort()).toEqual(
      Array.from({ length: NAV.length }, (_, i) => String(i + 1).padStart(2, "0")),
    );
  });

  it("returns empty metadata for an unknown key rather than throwing", () => {
    expect(navMeta("nope" as ModuleKey)).toEqual({ eyebrow: "", index: "", label: "" });
  });
});
