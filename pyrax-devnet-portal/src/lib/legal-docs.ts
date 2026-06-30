// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Source of truth for the devnet legal documents (NDA + Alpha Test Program T&C). The same content
// renders in the first-login signing gate AND on the read-only Legal pages, so there is exactly one
// copy of each document. Bump a doc's `version` to force every tester to re-accept it on next login.

export interface LegalDoc {
  id: "nda" | "tos";
  /** Bump to force re-acceptance. Recorded with each signature. */
  version: string;
  /** Human effective date shown in the document. */
  effectiveDate: string;
  /** Title shown on the Legal page + in notifications. */
  title: string;
  /** Title shown on the signing modal. */
  modalTitle: string;
  /** Whether this doc requires a typed signature + recipient name (NDA) vs. plain acceptance (T&C). */
  requiresSignature: boolean;
  /** Markdown body (rendered by renderLegalMarkdown). */
  body: string;
}

export const NDA_VERSION = "1.0";
export const TOS_VERSION = "1.0";
export const LEGAL_EFFECTIVE = "June 30, 2026";

export const NDA: LegalDoc = {
  id: "nda",
  version: NDA_VERSION,
  effectiveDate: LEGAL_EFFECTIVE,
  title: "Non-Disclosure & Confidentiality Agreement",
  modalTitle: "We've updated our Non-Disclosure Agreement",
  requiresSignature: true,
  body: `# MUTUAL / UNILATERAL NON-DISCLOSURE AND CONFIDENTIALITY AGREEMENT

**Effective Date:** ${LEGAL_EFFECTIVE}

This Non-Disclosure and Confidentiality Agreement ("**Agreement**") is entered into as of the Effective Date by and between:

**PYRAX LLC**
30 N Gould St Ste N
Sheridan, WY 82801
United States

("**PYRAX**", "**Company**", or "**Disclosing Party**")

and

**Recipient:** the individual accepting this Agreement (collectively with PYRAX, the "**Parties**," or individually a "**Party**.")

---

# 1. PURPOSE

The Recipient may receive access to confidential, proprietary, technical, commercial, strategic, operational, or otherwise non-public information relating to PYRAX LLC, the PYRAX Blockchain ecosystem, software, applications, products, services, infrastructure, business operations, research, development, and future initiatives.

The purpose of this Agreement is to protect all Confidential Information disclosed by PYRAX while allowing Recipient to evaluate, test, develop, audit, consult, provide services, or otherwise engage with PYRAX.

---

# 2. DEFINITIONS

For purposes of this Agreement, "**Confidential Information**" means any information disclosed directly or indirectly by PYRAX in any form, whether oral, written, electronic, digital, visual, recorded, or otherwise, including but not limited to:

## A. Blockchain Technology

* Blockchain architecture
* Consensus mechanisms
* Validator systems
* Network infrastructure
* Smart contract systems
* Protocols
* APIs
* SDKs
* Wallet technologies
* Bridges
* Cryptographic methods
* Security systems
* Node software
* Source code
* Object code
* Algorithms
* Technical documentation
* Whitepapers not publicly released
* Internal specifications
* Roadmaps
* Testnets
* Mainnet developments
* Scaling technologies
* Performance metrics
* Internal tooling

## B. Applications and Software

Including but not limited to:

* Desktop applications
* Mobile applications
* Web applications
* Internal software
* Developer tools
* AI technologies
* APIs
* Backend services
* Cloud infrastructure
* Databases
* User interfaces
* Dashboards
* Administrative systems

## C. Business Information

* Financial information
* Tokenomics
* Strategic planning
* Marketing plans
* Partnerships
* Investor information
* Customer information
* Vendor information
* Pricing
* Product plans
* Product launches
* Internal communications
* Employee information
* Organizational structure

## D. Intellectual Property

* Trade secrets
* Know-how
* Patentable inventions
* Copyrightable works
* Proprietary methods
* Designs
* Research
* Development materials

## E. Media

Confidential Information expressly includes any media relating to PYRAX including:

* Photographs
* Screenshots
* Screen recordings
* Videos
* Audio recordings
* Livestreams
* Demonstrations
* Product previews
* Internal presentations
* User interfaces
* Documentation
* Graphics
* Mockups
* CAD files
* Diagrams
* Images
* Logos not publicly released
* Branding concepts
* Internal communications

Whether captured by camera, mobile phone, software, recording device, or any other means.

---

# 3. NON-DISCLOSURE OBLIGATIONS

Recipient agrees that it shall not, directly or indirectly:

* disclose Confidential Information to any third party;
* publish Confidential Information;
* distribute Confidential Information;
* reproduce Confidential Information except as necessary for the approved purpose;
* upload Confidential Information to websites;
* upload Confidential Information to cloud services except those expressly approved by PYRAX;
* post Confidential Information on social media;
* discuss Confidential Information in public forums;
* discuss Confidential Information with media outlets;
* discuss Confidential Information in interviews;
* disclose Confidential Information in podcasts;
* disclose Confidential Information in livestreams;
* disclose Confidential Information in videos;
* disclose Confidential Information in blogs;
* disclose Confidential Information in articles;
* disclose Confidential Information in presentations;
* disclose Confidential Information through AI systems not expressly authorized by PYRAX;
* disclose Confidential Information through any current or future communication technology.

---

# 4. ABSOLUTE PROHIBITION ON PUBLIC DISCLOSURE

Unless expressly authorized in advance by PYRAX in a written authorization signed by an authorized officer of PYRAX, Recipient shall not publicly disclose, publish, display, transmit, share, discuss, describe, demonstrate, exhibit, distribute, or otherwise make available any information relating to:

* the PYRAX Blockchain;
* blockchain infrastructure;
* blockchain technology;
* applications;
* software;
* websites;
* APIs;
* SDKs;
* products;
* unreleased features;
* updates;
* security mechanisms;
* architecture;
* documentation;
* development;
* testing;
* roadmaps;
* branding;
* logos not publicly released;
* interfaces;
* screenshots;
* images;
* videos;
* demonstrations;
* recordings;
* audio;
* promotional material;
* technical information;
* business information;
* internal communications;
* or any Confidential Information.

This prohibition applies regardless of whether disclosure occurs through:

* social media;
* Discord;
* Telegram;
* Reddit;
* X;
* Facebook;
* Instagram;
* TikTok;
* YouTube;
* Twitch;
* livestreaming platforms;
* blogs;
* podcasts;
* conferences;
* interviews;
* public speaking;
* printed publications;
* AI platforms;
* messaging applications;
* forums;
* websites;
* or any other communication medium now existing or later developed.

Written approval must specifically identify the material authorized for disclosure. General permission to participate in testing, development, consulting, employment, or partnership shall not constitute permission to publicly disclose Confidential Information.

---

# 5. PERMITTED DISCLOSURES

Recipient may disclose Confidential Information only:

* to employees or contractors who have a legitimate need to know;
* who are bound by confidentiality obligations no less restrictive than this Agreement;
* solely for the approved business purpose.

Recipient remains fully responsible for all disclosures made by its employees, contractors, consultants, affiliates, agents, or representatives.

---

# 6. USE OF CONFIDENTIAL INFORMATION

Recipient shall use Confidential Information solely for the authorized business purpose approved by PYRAX.

Recipient shall not use Confidential Information:

* for personal gain;
* for competitive purposes;
* for development of competing technologies;
* for reverse engineering;
* for commercial exploitation;
* for publication;
* for investment decisions based upon confidential information;
* for token trading based on non-public information where prohibited by applicable law.

---

# 7. NO LICENSE

Nothing contained in this Agreement grants Recipient any ownership, license, intellectual property rights, trademark rights, copyright rights, patent rights, or other rights except the limited right to use Confidential Information for the approved purpose.

---

# 8. INTELLECTUAL PROPERTY

All Confidential Information remains the exclusive property of PYRAX.

Nothing in this Agreement transfers ownership of any:

* patent;
* copyright;
* trademark;
* trade secret;
* software;
* blockchain technology;
* documentation;
* invention;
* database;
* design;
* source code;
* object code;
* derivative work;
* proprietary technology.

---

# 9. REVERSE ENGINEERING

Recipient shall not:

* reverse engineer;
* decompile;
* disassemble;
* analyze;
* derive source code;
* circumvent security;
* exploit vulnerabilities;
* reproduce proprietary functionality;
* create derivative works based upon Confidential Information,

except to the extent such restrictions are prohibited by applicable law and cannot legally be waived.

---

# 10. SECURITY

Recipient agrees to exercise at least commercially reasonable safeguards, and in no event less than reasonable care, to protect Confidential Information against unauthorized access, disclosure, copying, theft, alteration, or loss.

---

# 11. RETURN OR DESTRUCTION

Upon request by PYRAX, or upon termination of the relationship, Recipient shall promptly:

* return all Confidential Information;
* permanently delete electronic copies;
* destroy physical copies;
* certify destruction if requested by PYRAX,

except where retention is required by applicable law or for routine backup systems that remain subject to this Agreement until deleted in the ordinary course.

---

# 12. EXCLUSIONS

Confidential Information does not include information that Recipient can demonstrate by competent written evidence:

1. was lawfully public before disclosure;
2. became public through no breach of this Agreement;
3. was lawfully received from an independent third party without confidentiality obligations;
4. was independently developed without use of Confidential Information.

---

# 13. LEGALLY REQUIRED DISCLOSURE

If Recipient is legally compelled to disclose Confidential Information, Recipient shall, where legally permitted:

* promptly notify PYRAX in writing before disclosure;
* cooperate with PYRAX in seeking a protective order or other appropriate remedy; and
* disclose only the minimum Confidential Information legally required.

---

# 14. TERM

This Agreement becomes effective on the Effective Date.

Recipient's confidentiality obligations shall continue:

* throughout the relationship between the Parties; and
* for **ten (10) years** following the last disclosure of Confidential Information.

Notwithstanding the foregoing, obligations relating to trade secrets shall survive for so long as the applicable information remains protected as a trade secret under applicable law.

---

# 15. REMEDIES

Recipient acknowledges that unauthorized disclosure of Confidential Information may cause immediate and irreparable harm to PYRAX for which monetary damages alone would be an inadequate remedy.

Accordingly, PYRAX shall be entitled, in addition to any other remedies available at law or in equity, to seek temporary, preliminary, and permanent injunctive relief, specific performance, and other equitable remedies without the necessity of proving actual damages or posting bond where permitted by applicable law.

Recipient shall also be liable for all damages recoverable under applicable law resulting from any breach of this Agreement.

---

# 16. NO PUBLIC ANNOUNCEMENTS

Recipient shall not announce, advertise, imply, or represent any relationship with PYRAX, including participation in testing, consulting, development, partnerships, investment, advisory activities, or any other engagement, without prior written authorization from PYRAX.

---

# 17. FEEDBACK

Any suggestions, ideas, recommendations, improvements, discoveries, or feedback voluntarily provided by Recipient regarding the PYRAX Blockchain, applications, software, products, or services may be used by PYRAX without restriction or obligation, unless otherwise agreed in writing.

---

# 18. ASSIGNMENT

Recipient may not assign or transfer this Agreement without PYRAX's prior written consent.

PYRAX may assign this Agreement to any successor, affiliate, purchaser, or entity acquiring substantially all of its assets or business.

---

# 19. EXPORT COMPLIANCE

Recipient agrees to comply with all applicable export control, sanctions, and international trade laws relating to Confidential Information.

---

# 20. GLOBAL ENFORCEMENT

The Parties intend this Agreement to be enforceable to the maximum extent permitted by applicable law in any jurisdiction where enforcement is sought.

If any provision is determined to be unenforceable under the law of a particular jurisdiction, that provision shall be interpreted or modified only to the minimum extent necessary to make it enforceable in that jurisdiction, and all remaining provisions shall remain in full force and effect.

Nothing in this Agreement limits PYRAX's right to seek enforcement, injunctive relief, or other remedies in any court of competent jurisdiction where a breach has occurred or where the Recipient, its assets, or the Confidential Information are located.

---

# 21. GOVERNING LAW AND VENUE

This Agreement shall be governed by and construed in accordance with the laws of the State of Wyoming, United States, without regard to conflict of law principles.

The Parties consent to the exclusive jurisdiction of the state and federal courts located in Wyoming for any dispute arising from this Agreement, except that PYRAX may seek injunctive or equitable relief in any jurisdiction where such relief is appropriate or where the Recipient or Confidential Information is located.

---

# 22. SEVERABILITY

If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall remain fully enforceable.

---

# 23. WAIVER

Failure by PYRAX to enforce any provision shall not constitute a waiver of future enforcement.

---

# 24. ENTIRE AGREEMENT

This Agreement constitutes the complete agreement between the Parties concerning Confidential Information and supersedes all prior discussions, understandings, or agreements relating to confidentiality.

This Agreement may be amended only by a written document signed by both Parties.

---

# 25. ELECTRONIC SIGNATURES

Electronic signatures, digital signatures, scanned signatures, and signatures executed through recognized electronic signature platforms shall be deemed original signatures and shall have the same legal effect as handwritten signatures, to the fullest extent permitted by applicable law.

---

# 26. COUNTERPARTS

This Agreement may be executed in one or more counterparts, each of which shall be deemed an original, and all of which together constitute one instrument.

---

# SIGNATURES

### PYRAX LLC

By: Shawn Wilson
Title: Managing Member
Date: ${LEGAL_EFFECTIVE}

---

### RECIPIENT

By accepting below, you confirm your full legal name, adopt your typed name as your binding electronic signature, and agree to be bound by this Agreement. The date and your IP address are recorded at the time of signing.`,
};

export const TOS: LegalDoc = {
  id: "tos",
  version: TOS_VERSION,
  effectiveDate: LEGAL_EFFECTIVE,
  title: "Alpha Test Program Terms & Conditions",
  modalTitle: "Alpha Test Program — Terms & Conditions",
  requiresSignature: false,
  body: `# PYRAX LLC ALPHA TEST PROGRAM TERMS AND CONDITIONS

**Effective Date:** ${LEGAL_EFFECTIVE}

These Alpha Test Program Terms and Conditions ("**Agreement**") govern participation in the PYRAX LLC Alpha Test Program ("**Alpha Program**").

By registering for, downloading, accessing, installing, or using any Alpha Program software, blockchain network, applications, websites, APIs, services, or related technologies, the participant ("**Participant**") agrees to be bound by this Agreement.

If the Participant does not agree to these Terms, the Participant must not access or use the Alpha Program.

---

# 1. PARTIES

This Agreement is entered into between:

**PYRAX LLC**
30 N Gould St Ste N
Sheridan, WY 82801
United States

("**PYRAX**," "**Company**," "we," "our," or "us")

and

the individual or legal entity participating in the Alpha Program ("**Participant**," "you," or "your").

---

# 2. PURPOSE

The Alpha Program exists solely for evaluating, testing, identifying bugs, collecting feedback, assessing performance, and improving unreleased PYRAX technologies.

Participation is by invitation or approval only and may be revoked at any time.

---

# 3. ALPHA SOFTWARE

The Alpha Program may include access to:

* PYRAX Blockchain
* Validator software
* Node software
* Wallet applications
* Desktop applications
* Mobile applications
* Web applications
* Smart contracts
* APIs
* SDKs
* Developer tools
* Documentation
* Testnet infrastructure
* Mainnet preview functionality
* AI-powered services
* Websites
* Administrative portals
* Experimental technologies

All software and services provided through the Alpha Program are collectively referred to as the "**Alpha Software**."

---

# 4. ACKNOWLEDGEMENT OF ALPHA STATUS

Participant acknowledges that the Alpha Software:

* is unfinished;
* is experimental;
* contains known and unknown bugs;
* may experience crashes;
* may lose data;
* may be unavailable without notice;
* may contain security vulnerabilities;
* may produce inaccurate results;
* may change significantly before release;
* may never be commercially released.

Participant assumes all risks associated with using Alpha Software.

---

# 5. NO PRODUCTION USE

The Alpha Software is intended exclusively for testing and evaluation.

Participant shall not rely upon the Alpha Software for:

* financial transactions;
* production environments;
* business operations;
* custody of valuable digital assets;
* mission-critical activities;
* safety-critical systems.

---

# 6. ELIGIBILITY

Participant represents that:

* they are legally capable of entering into this Agreement;
* all information provided is accurate;
* participation complies with applicable laws in their jurisdiction.

---

# 7. ACCOUNT SECURITY

Participant is responsible for maintaining the confidentiality of account credentials, private keys, authentication devices, and passwords.

Participant is solely responsible for all activity occurring under their account.

---

# 8. ACCEPTABLE USE

Participant agrees not to:

* interfere with network operations;
* intentionally disrupt testing;
* exploit bugs for personal gain;
* introduce malware;
* upload malicious software;
* attack PYRAX infrastructure;
* bypass security systems;
* access unauthorized systems;
* impersonate another person;
* abuse APIs;
* spam network services;
* perform denial-of-service attacks;
* use automated tools except where expressly authorized;
* engage in unlawful activity.

---

# 9. TEST TOKENS

Any testnet tokens, credits, virtual assets, or similar items provided during the Alpha Program:

* have no monetary value;
* are not legal tender;
* are not redeemable;
* may be reset or deleted at any time;
* do not represent ownership or investment;
* may be removed without compensation.

---

# 10. FEEDBACK

Participant is encouraged to submit:

* bug reports;
* feature requests;
* suggestions;
* usability feedback;
* performance reports;
* security observations.

By submitting feedback, Participant grants PYRAX a perpetual, worldwide, irrevocable, royalty-free, sublicensable license to use, modify, publish, incorporate, commercialize, and otherwise exploit such feedback without compensation or attribution.

---

# 11. INTELLECTUAL PROPERTY

All right, title, and interest in the Alpha Software, the PYRAX Blockchain, trademarks, copyrights, patents, trade secrets, documentation, software, source code, object code, interfaces, graphics, branding, and related intellectual property remain the exclusive property of PYRAX LLC and its licensors.

Participation in the Alpha Program grants only a limited, revocable, non-exclusive, non-transferable, non-sublicensable license to use the Alpha Software solely for testing purposes.

---

# 12. CONFIDENTIALITY

Participant acknowledges that unreleased features, software, documentation, technical information, screenshots, videos, discussions, roadmaps, source code, interfaces, and all non-public information relating to the Alpha Program are confidential.

Where the Participant has separately executed a Non-Disclosure Agreement with PYRAX, that NDA shall govern confidentiality obligations. If no separate NDA exists, the confidentiality obligations set forth in this Agreement apply.

Participant shall not disclose, publish, record, livestream, share, demonstrate, or otherwise make available any confidential information except with PYRAX's prior written approval.

---

# 13. SCREENSHOTS, RECORDINGS, AND MEDIA

Unless expressly authorized in writing by PYRAX, Participant shall not:

* record videos;
* capture screenshots;
* livestream;
* publish photographs;
* upload recordings;
* distribute demonstrations;
* share internal interfaces;
* disclose unreleased branding;
* publish benchmark results;
* share documentation.

This restriction applies to all online and offline communication channels.

---

# 14. NO EXPECTATION OF FUTURE ACCESS

Participation in the Alpha Program does not guarantee:

* continued access;
* future invitations;
* employment;
* partnership;
* investment opportunities;
* token allocations;
* airdrops;
* rewards;
* early access;
* commercial licensing.

---

# 15. MODIFICATIONS

PYRAX may modify, suspend, reset, replace, discontinue, or terminate any aspect of the Alpha Program at any time without prior notice.

---

# 16. DATA COLLECTION

Participant acknowledges that PYRAX may collect technical and operational information relating to use of the Alpha Software, including:

* crash reports;
* diagnostics;
* device information;
* operating system information;
* performance metrics;
* telemetry;
* log files;
* blockchain interactions;
* bug reports.

Such information may be used to improve the Alpha Software and services.

---

# 17. PRIVACY

Any personal information collected during participation will be handled in accordance with PYRAX's applicable Privacy Policy, as updated from time to time.

---

# 18. NO WARRANTIES

THE ALPHA SOFTWARE IS PROVIDED "AS IS," "WITH ALL FAULTS," AND "AS AVAILABLE."

TO THE MAXIMUM EXTENT PERMITTED BY LAW, PYRAX DISCLAIMS ALL WARRANTIES, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, AVAILABILITY, ACCURACY, SECURITY, OR ERROR-FREE OPERATION.

---

# 19. LIMITATION OF LIABILITY

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, PYRAX, ITS MEMBERS, MANAGERS, OFFICERS, EMPLOYEES, CONTRACTORS, AFFILIATES, LICENSORS, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, CONSEQUENTIAL, PUNITIVE, OR LOST PROFITS DAMAGES ARISING OUT OF OR RELATED TO THE ALPHA PROGRAM.

TO THE MAXIMUM EXTENT PERMITTED BY LAW, PYRAX'S TOTAL AGGREGATE LIABILITY ARISING OUT OF THIS AGREEMENT SHALL NOT EXCEED ONE HUNDRED UNITED STATES DOLLARS (US \\$100).

NOTHING IN THIS AGREEMENT EXCLUDES OR LIMITS LIABILITY THAT CANNOT BE EXCLUDED OR LIMITED UNDER APPLICABLE LAW.

---

# 20. INDEMNIFICATION

Participant agrees to defend, indemnify, and hold harmless PYRAX, its affiliates, officers, employees, contractors, and agents from and against any claims, damages, liabilities, losses, costs, and reasonable attorneys' fees arising out of or relating to:

* Participant's breach of this Agreement;
* Participant's misuse of the Alpha Software;
* Participant's violation of applicable law; or
* Participant's infringement of any third-party rights.

---

# 21. TERMINATION

PYRAX may suspend or terminate Participant's access immediately, with or without notice, for any reason, including violation of this Agreement.

Upon termination, Participant shall cease using the Alpha Software and, upon request, delete or return confidential materials in their possession.

---

# 22. EXPORT COMPLIANCE

Participant agrees to comply with all applicable export control, sanctions, and trade laws relating to the Alpha Software.

---

# 23. GOVERNING LAW

This Agreement shall be governed by the laws of the State of Wyoming, United States, without regard to conflict of law principles.

---

# 24. DISPUTE RESOLUTION

Before initiating formal legal proceedings, the Parties agree to attempt in good faith to resolve disputes through informal negotiations.

If a dispute cannot be resolved informally, it shall be submitted to the state or federal courts located in Wyoming, except that PYRAX may seek injunctive or equitable relief in any court of competent jurisdiction where necessary to protect its intellectual property or confidential information.

---

# 25. SEVERABILITY

If any provision of this Agreement is found unenforceable, the remaining provisions shall remain in full force and effect.

---

# 26. ENTIRE AGREEMENT

This Agreement, together with any applicable Non-Disclosure Agreement and Privacy Policy, constitutes the complete agreement regarding participation in the Alpha Program and supersedes all prior understandings relating to the Alpha Program.

---

# 27. CHANGES TO THESE TERMS

PYRAX may update these Terms from time to time. Material changes will be communicated through appropriate channels or by updating the effective date. Continued participation after such changes constitutes acceptance of the revised Terms.

---

# 28. CONTACT INFORMATION

PYRAX LLC
30 N Gould St Ste N
Sheridan, WY 82801
United States

Email: devnet@pyraxchain.com

Website: https://pyraxchain.com

---

# BY PARTICIPATING

BY ACCESSING OR USING THE PYRAX ALPHA PROGRAM, THE PARTICIPANT ACKNOWLEDGES THAT THEY HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS AND CONDITIONS.`,
};

export const LEGAL_DOCS: Record<string, LegalDoc> = { nda: NDA, tos: TOS };

/** Minimal, safe Markdown → HTML for our trusted legal docs. Supports #/##/### headings, **bold**,
 *  bullet (*) and numbered (1.) lists with blank-line tolerance, --- rules, links, and paragraphs. */
export function renderLegalMarkdown(md: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s)
      .replace(/\\\$/g, "$")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\b(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');

  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  const isBullet = (l: string) => /^\s*[*-]\s+/.test(l);
  const isOrdered = (l: string) => /^\s*\d+\.\s+/.test(l);
  const nextNonBlank = (from: number) => { let j = from; while (j < lines.length && lines[j].trim() === "") j++; return j; };

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (t === "") { i++; continue; }
    if (/^---+$/.test(t)) { out.push('<hr class="lg-hr">'); i++; continue; }
    if (t.startsWith("### ")) { out.push(`<h3 class="lg-h3">${inline(t.slice(4))}</h3>`); i++; continue; }
    if (t.startsWith("## ")) { out.push(`<h2 class="lg-h2">${inline(t.slice(3))}</h2>`); i++; continue; }
    if (t.startsWith("# ")) { out.push(`<h1 class="lg-h1">${inline(t.slice(2))}</h1>`); i++; continue; }
    if (isBullet(t)) {
      const items: string[] = [];
      while (i < lines.length) {
        if (lines[i].trim() === "") { const n = nextNonBlank(i); if (n < lines.length && isBullet(lines[n])) { i = n; continue; } break; }
        if (!isBullet(lines[i])) break;
        items.push(`<li>${inline(lines[i].replace(/^\s*[*-]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul class="lg-ul">${items.join("")}</ul>`);
      continue;
    }
    if (isOrdered(t)) {
      const items: string[] = [];
      while (i < lines.length) {
        if (lines[i].trim() === "") { const n = nextNonBlank(i); if (n < lines.length && isOrdered(lines[n])) { i = n; continue; } break; }
        if (!isOrdered(lines[i])) break;
        items.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ol class="lg-ol">${items.join("")}</ol>`);
      continue;
    }
    // paragraph: gather consecutive non-blank, non-structural lines (keep single-line breaks)
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^---+$/.test(lines[i].trim()) && !lines[i].trim().startsWith("#") && !isBullet(lines[i]) && !isOrdered(lines[i])) {
      para.push(inline(lines[i].trim()));
      i++;
    }
    out.push(`<p class="lg-p">${para.join("<br>")}</p>`);
  }
  return out.join("\n");
}
