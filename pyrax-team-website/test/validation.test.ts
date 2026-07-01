// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Input-validation + href-sanitization invariants. These guarantee that user-controlled URLs (the
// booking link, signature network links + community links + map link) can only ever be https — so
// no javascript:/data:/vbscript: URL can land in a rendered signature or profile.
import { describe, it, expect } from "vitest";
import { validateProfile, validateBookingUrl, validatePhone, socialUrl } from "../src/lib/profile";
import { sanitizeSettings, DEFAULT_SIGNATURE_SETTINGS } from "../src/lib/signature-settings";

describe("validateBookingUrl() — https + allow-listed host only", () => {
  it("accepts empty (optional)", () => {
    expect(validateBookingUrl("")).toEqual({ ok: true, url: "" });
  });
  it("accepts a real Microsoft Bookings https URL", () => {
    const r = validateBookingUrl("https://outlook.office.com/bookwithme/user/abc");
    expect(r.ok).toBe(true);
    expect(r.url).toContain("https://outlook.office.com");
  });
  it("rejects http (non-TLS)", () => {
    expect(validateBookingUrl("http://outlook.office.com/x").ok).toBe(false);
  });
  it("rejects javascript: and data: schemes", () => {
    expect(validateBookingUrl("javascript:alert(1)").ok).toBe(false);
    expect(validateBookingUrl("data:text/html,<script>alert(1)</script>").ok).toBe(false);
  });
  it("rejects an https URL on a non-allow-listed host", () => {
    expect(validateBookingUrl("https://evil.example.com/book").ok).toBe(false);
  });
});

describe("sanitizeSettings() — href fields are https-only", () => {
  it("strips a javascript: network link (drops it / falls back to defaults)", () => {
    const out = sanitizeSettings({
      networkLinks: [{ label: "Evil", href: "javascript:alert(1)" }],
    });
    // The bad link is dropped; since none survive, the defaults are used — and every default is https.
    for (const l of out.networkLinks) expect(l.href.startsWith("https://")).toBe(true);
  });
  it("keeps a valid https network link", () => {
    const out = sanitizeSettings({
      networkLinks: [{ label: "Home", href: "https://pyraxchain.com" }],
    });
    expect(out.networkLinks[0]).toEqual({ label: "Home", href: "https://pyraxchain.com" });
  });
  it("blanks a non-https community handle", () => {
    const out = sanitizeSettings({ community: { x: "javascript:alert(1)", github: "http://github.com/x" } });
    expect(out.community.x).toBe("");
    expect(out.community.github).toBe("");
  });
  it("falls back to the default https map link when given garbage", () => {
    const out = sanitizeSettings({ office: { label: "HQ", mapHref: "data:text/html,x" } });
    expect(out.office.mapHref).toBe(DEFAULT_SIGNATURE_SETTINGS.office.mapHref);
    expect(out.office.mapHref.startsWith("https://")).toBe(true);
  });
  it("clamps overly long strings", () => {
    const out = sanitizeSettings({ tagline: "x".repeat(5000) });
    expect(out.tagline.length).toBeLessThanOrEqual(200);
  });
  it("limits the number of tiles + links", () => {
    const out = sanitizeSettings({
      specTiles: Array.from({ length: 20 }, (_, i) => ({ label: `t${i}`, value: `${i}` })),
      networkLinks: Array.from({ length: 20 }, (_, i) => ({ label: `l${i}`, href: `https://x${i}.com` })),
    });
    expect(out.specTiles.length).toBeLessThanOrEqual(4);
    expect(out.networkLinks.length).toBeLessThanOrEqual(6);
  });
});

describe("validateProfile()", () => {
  it("requires display name, position, and a valid email", () => {
    const r = validateProfile({ displayName: "", position: "", email: "", socials: {} });
    expect(r.ok).toBe(false);
    expect(r.errors.displayName).toBeTruthy();
    expect(r.errors.position).toBeTruthy();
    expect(r.errors.email).toBeTruthy();
  });
  it("enforces the @pyraxchain.com domain when asked", () => {
    const r = validateProfile({ displayName: "A", position: "Dev", email: "a@gmail.com", socials: {} }, { enforceDomain: true });
    expect(r.ok).toBe(false);
    expect(r.errors.email).toBeTruthy();
  });
  it("accepts a valid company profile", () => {
    const r = validateProfile({ displayName: "Ada", position: "Engineer", email: "ada@pyraxchain.com", socials: {} }, { enforceDomain: true });
    expect(r.ok).toBe(true);
  });
  it("rejects a personal handle that collides with the company handle", () => {
    const r = validateProfile(
      { displayName: "Ada", position: "Engineer", email: "ada@pyraxchain.com", socials: { x: "@pyraxnetwork" } },
      { enforceDomain: true },
    );
    expect(r.ok).toBe(false);
    expect(r.errors["social.x"]).toBeTruthy();
  });
  it("flags an invalid country calling code in a phone number", () => {
    const r = validateProfile(
      { displayName: "Ada", position: "Engineer", email: "ada@pyraxchain.com", phone: "+999 123 4567", socials: {} },
      { enforceDomain: false },
    );
    expect(r.ok).toBe(false);
    expect(r.errors.phone).toBeTruthy();
  });
});

describe("validatePhone()", () => {
  it("accepts a valid +1 NANP number", () => {
    const r = validatePhone("+1 (825) 882-5915");
    expect(r.ok).toBe(true);
    expect(r.e164).toBe("+18258825915");
  });
  it("rejects a made-up country code", () => {
    expect(validatePhone("+999 1234567").ok).toBe(false);
  });
});

describe("socialUrl()", () => {
  it("expands a bare handle to the platform https URL", () => {
    expect(socialUrl("github", "octocat")).toBe("https://github.com/octocat");
    expect(socialUrl("x", "@jack")).toBe("https://x.com/jack");
  });
  it("passes a full URL through", () => {
    expect(socialUrl("linkedin", "https://www.linkedin.com/in/foo")).toBe("https://www.linkedin.com/in/foo");
  });
});
