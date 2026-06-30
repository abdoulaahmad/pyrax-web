// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The COMPANY-WIDE email-signature design — the parts a Signature Manager controls (everyone's
// per-user details still come from their own profile). Stored as one JSON row in Postgres; the
// renderer reads it so a manager edit propagates to every member's signature instantly. This is
// the single source of truth for the shared design + its defaults.

export interface SpecTile { label: string; value: string }
export interface LinkItem { label: string; href: string }
export type CommunityKey = "facebook" | "x" | "telegram" | "discord" | "youtube" | "github" | "linkedin";

export interface SignatureSettings {
  tagline: string;
  specTiles: SpecTile[];               // 1–4 tiles in the spec readout
  networkLinks: LinkItem[];            // first = primary (bold); rest = secondary
  community: Record<CommunityKey, string>; // official PYRAX handles (empty ⇒ icon hidden)
  office: { label: string; mapHref: string };
  disclaimer: { confidentiality: string; noAdvice: string; security: string };
  copyright: string;
}

export const COMMUNITY_KEYS: CommunityKey[] = ["facebook", "x", "telegram", "discord", "youtube", "github", "linkedin"];
export const COMMUNITY_LABELS: Record<CommunityKey, string> = {
  facebook: "Facebook", x: "X", telegram: "Telegram", discord: "Discord", youtube: "YouTube", github: "GitHub", linkedin: "LinkedIn",
};

export const DEFAULT_SIGNATURE_SETTINGS: SignatureSettings = {
  tagline: "A privacy first Layer‑1 that doubles as a decentralized AI supercomputer.",
  specTiles: [
    { label: "Token", value: "$PYRX" },
    { label: "Consensus", value: "GhostDAG" },
    { label: "Shielded by", value: "zk‑SNARKs" },
    { label: "Compute & Inference", value: "NEURAX" },
  ],
  networkLinks: [
    { label: "pyraxchain.com", href: "https://pyraxchain.com" },
    { label: "Explorer", href: "https://explorer.pyraxchain.com" },
    { label: "Nodes", href: "https://nodes.pyraxchain.com" },
    { label: "Docs", href: "https://pyraxchain.com/docs.html" },
  ],
  community: {
    facebook: "https://www.facebook.com/groups/pyraxchain",
    x: "https://x.com/PYRAX_Official",
    telegram: "https://t.me/+3DreJAHGxqhjYWQx",
    discord: "https://discord.gg/cEX6uQn24",
    youtube: "https://www.youtube.com/@PYRAXNETWORK",
    github: "https://github.com/PYRAX-NETWORK",
    linkedin: "https://www.linkedin.com/company/pyrax-llc/",
  },
  office: { label: "30 N Gould St Ste N, Sheridan, WY 82801", mapHref: "https://maps.google.com/?q=30+N+Gould+St+Ste+N,+Sheridan,+WY+82801" },
  disclaimer: {
    confidentiality: "This email and any attachments are confidential and intended only for the named recipient. If you received it in error, please notify the sender and delete it; do not copy, forward, or act on its contents.",
    noAdvice: "Nothing here is financial, investment, legal, or tax advice, nor an offer or solicitation to buy or sell any digital asset. PYRX is a utility token of the PYRAX network; digital assets are volatile and carry the risk of total loss. PYRAX LLC makes no price or market‑cap predictions — do your own research.",
    security: "PYRAX may contact you through official channels, including email and, where the law permits, direct outreach such as a phone call. We will never ask for your seed phrase or private keys, request funds, or send unsolicited social‑media direct messages asking you to connect a wallet, send crypto, or share private credentials — treat any message that does as a scam. Verify every link against pyraxchain.com before acting; our only official channels are the ones listed above.",
  },
  copyright: "© 2026 PYRAX LLC. All rights reserved.",
};

const str = (v: unknown, max: number, fallback = ""): string => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : fallback;
};
/** https-only (blocks javascript:/data: etc.); empty allowed; falls back when given garbage. */
const href = (v: unknown, fallback = ""): string => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  return /^https:\/\//i.test(s) ? s.slice(0, 400) : fallback;
};

/** Coerce arbitrary input into a valid, safe SignatureSettings (lengths clamped, hrefs https-only,
 *  missing fields filled from defaults). Used for both DB reads and the manager's PUT. */
export function sanitizeSettings(input: unknown): SignatureSettings {
  const i = (input || {}) as Record<string, any>;
  const d = DEFAULT_SIGNATURE_SETTINGS;

  const tilesIn = Array.isArray(i.specTiles) ? i.specTiles : d.specTiles;
  const specTiles = tilesIn
    .slice(0, 4)
    .map((t: any) => ({ label: str(t?.label, 40), value: str(t?.value, 40) }))
    .filter((t: SpecTile) => t.label || t.value);

  const linksIn = Array.isArray(i.networkLinks) ? i.networkLinks : d.networkLinks;
  const networkLinks = linksIn
    .slice(0, 6)
    .map((l: any) => ({ label: str(l?.label, 40), href: href(l?.href) }))
    .filter((l: LinkItem) => l.label && l.href);

  const community = {} as Record<CommunityKey, string>;
  for (const k of COMMUNITY_KEYS) community[k] = href(i.community?.[k]);

  return {
    tagline: str(i.tagline, 200, d.tagline),
    specTiles: specTiles.length ? specTiles : d.specTiles,
    networkLinks: networkLinks.length ? networkLinks : d.networkLinks,
    community,
    office: { label: str(i.office?.label, 160, d.office.label), mapHref: href(i.office?.mapHref, d.office.mapHref) },
    disclaimer: {
      confidentiality: str(i.disclaimer?.confidentiality, 1200, d.disclaimer.confidentiality),
      noAdvice: str(i.disclaimer?.noAdvice, 1500, d.disclaimer.noAdvice),
      security: str(i.disclaimer?.security, 1800, d.disclaimer.security),
    },
    copyright: str(i.copyright, 160, d.copyright),
  };
}
