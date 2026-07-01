<!-- SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary -->
# PYRAX Network — Plain-English Whitepaper

**Version 4.0 · A companion to the PYRAX Technical Whitepaper · 2026-06-30**

This document explains everything the technical whitepaper covers, written for an intelligent reader who
does not need to know how blockchains work under the hood. Every figure and claim here comes directly
from the technical paper and the live source code — nothing is invented or exaggerated. Where the
technical paper is honest about something still being built or gated behind an outside audit, this
companion says so too. **Honesty is part of the brand.**

---

## What is PYRAX? (Executive Summary)

PYRAX is a new public network for moving value and running programs — a "blockchain," though as you'll
see it is technically more like a *web* than a chain. It is built from scratch in the Rust programming
language, and it is organized around four promises that most networks treat as optional extras but that
PYRAX treats as foundational, non-negotiable rules:

1. **High throughput.** It is designed to handle a very large number of transactions at once — the
   stated target is **at least 500,000 transactions per second** across the whole network.
2. **Privacy by default.** When you send value on PYRAX, the sender, receiver, and amount are hidden
   automatically. You have to go out of your way to make a transaction *public*, not the other way
   around.
3. **Full decentralization.** There is no company-run "starter server" you must connect to in order to
   join. No single party — not even PYRAX itself — sits on the critical path.
4. **Resistance to network-level spying.** Even your internet provider, who can normally see who you
   talk to and how much data you send, cannot tell *what* you are doing or *who* you are communicating
   with on PYRAX.

On top of that foundation, PYRAX adds three things most chains don't have:

- **NEURAX** — a marketplace that puts the same graphics cards and processors used for mining to work
  running paid AI and computing jobs, with cryptographic checks that the work was actually done
  correctly.
- **Crucible** — a first-party mining program with a **zero developer fee**, so miners keep 100% of
  what they earn.
- **NOVA** — an autonomous "operations brain" that watches the whole system, diagnoses problems, and
  can safely repair them.

**A big honest update since earlier versions of this paper.** Older drafts described PYRAX as mostly a
*design* ("the foundations are built; the rest is planned"). That is no longer true. **The system is now
substantially built and tested.** The network runs today as a single program across four separate
networks, and the live networks are a **faithful simulation running on real machinery** — real
web-of-blocks ordering, real cryptography, real privacy, real programmable contracts — with the real
"production" mode wired in and ready. The core protocol is **open-source (Apache-2.0)** so anyone can
inspect, run, and verify it; the apps, wallet, NEURAX, and hosted services are proprietary.

One caveat stated plainly, as always: **nothing involving the privacy math ships to the live "mainnet"
until it has passed dedicated outside cryptography audits**, and a few advanced pieces (the highest
scaling layer's coordinator, some of NEURAX's trust hardware, the standalone miner) are still being
built. PYRAX does not claim to be finished; it claims to be honestly engineered toward a clear goal, and
it is much further along than it used to be.

---

## 1. The Five North Stars

| # | Property | What it means in plain terms |
|---|----------|------------------------------|
| 1 | **A web, not a chain** | Blocks reference many recent blocks at once, so honest parallel work is *included* rather than thrown away. More capacity, faster confirmation. |
| 2 | **Privacy everywhere** | The default transaction hides who sent it, who received it, and how much. Public transactions are the rare exception you must explicitly choose. |
| 3 | **Truly decentralized, no starter server** | You can join using only methods no single party controls — there is no company server you depend on to get connected. |
| 4 | **Hides metadata from your ISP** | Network traffic is wrapped and padded so your internet provider can't tell what you're transferring or who you're talking to. |
| 5 | **Open and verifiable** | The protocol's rules are public so anyone can check them. A network with secret rules can't really be trusted. |

---

## 2. The Big Picture — How the Layers Fit Together

Think of PYRAX as a stack of layers:

- **Layer 1** is the foundation: the web-of-blocks ledger where value lives, with privacy built in at
  the lowest level.
- **Layer 2** runs programs ("smart contracts") in *three* different programming environments, all
  anchored back to Layer 1 for security.
- **Layer 3** bundles enormous numbers of transactions together and settles them to Layer 1 with a
  single compact mathematical proof.
- **NEURAX** sits above that as the AI and compute marketplace.

Running underneath everything are two transport systems: the peer-to-peer network that connects
computers with no central server, and the onion "mixnet" that hides traffic patterns. At the very top
are the applications people use: the wallet, the node-and-mining app, the anonymous file-sharing tool,
and the media-streaming service.

The software is organized into many small, single-purpose modules, each responsible for one job — the
cryptography, the ordering, the privacy pool, the mixnet, the file/streaming service, the consensus
engine, the networking, the storage, the execution layers, and the AI market. This modular design means
each piece can be built, tested, and verified on its own — and most of them now are.

---

## 2A. Performance and Scale — the 500,000 TPS Target

PYRAX aims for **at least 500,000 sustained transactions per second**, treated as a measured engineering
mandate, not a slogan. The rule the project sets for itself: **no throughput number is ever published
without a reproducible benchmark** stating the exact workload, hardware, and bandwidth behind it. The
headline number refers to simple value transfers; contract-call and private-transaction speeds are
measured and reported separately.

No single trick gets you to 500,000. PYRAX stacks several:

- **Parallel blocks (the web).** Many blocks can be accepted at once — no single leader everyone waits
  on — so capacity grows as the network grows.
- **Parallel execution.** Transactions that don't conflict run at the same time across processor cores.
- **Layer-2/3 rollups.** Most volume happens in the upper layers; Layer 3 bundles huge numbers of
  transactions and settles a single small proof.
- **Recursive proof folding.** Thousands of private-transaction proofs fold into *one* combined proof,
  so a validator checks roughly one proof per batch instead of one per transaction. This is exactly
  what makes "private by default" compatible with high speed.
- **Sampling for light devices.** Phones and laptops confirm data is available by checking a few random
  pieces instead of downloading everything.
- **Hardware-accelerated proving.** Graphics cards generate the proofs — reusing the same GPUs that mine
  Stream B.

High total throughput does *not* require every participant to process every transaction. PYRAX defines
four node classes — archival, full, light, and mobile — so ordinary consumer machines can still take
part. The 500,000 target is reached progressively and **never silently trades away decentralization**.

---

## 3. Consensus — How Everyone Agrees on What Happened

### 3.1 A web of blocks instead of a chain

In a traditional blockchain, every new block points to exactly one previous block, forming a single
line. If two honest participants produce a block at the same moment, only one "wins" — the other becomes
wasted work (an "orphan"), which also weakens security. PYRAX uses a **web of blocks** instead: each new
block can point back to many recent blocks at once, so concurrent honest work is absorbed rather than
discarded. The catch — "which block came first" is no longer obvious from the shape — is solved by an
algorithm called **GhostDAG**, which computes a single agreed order.

### 3.2 GhostDAG, by analogy

Imagine a busy room where people pin notes to a giant board, each note referencing the notes already
visible. Honest people looking at the same board reference each other and form a tightly-connected
cluster; GhostDAG colors these **blue** — the honest mainstream. Now imagine someone sneaks off and
secretly writes a private stack of notes to reveal later and rewrite history. Because those notes ignored
everything the honest crowd wrote, they stand apart — GhostDAG colors them **red** and sidelines them.
The tip with the most honest ("blue") work behind it wins, so withholding blocks or publishing them late
simply doesn't pay off. Importantly, no single kind of mining can reorder blocks made by the others.

### 3.3 TriStream — three independent doors into the network

New blocks enter through **three independent streams**, over five "lanes," all producing the same kind
of block:

| Stream | How it works | Who runs it |
|--------|--------------|-------------|
| **Stream A** | Two mining algorithms — **BLAKE3** and **double-SHA-256** | Specialized mining chips (ASICs) |
| **Stream B** | Two *memory-hard* algorithms — **kHeavyHash** (for graphics cards) + **Argon2id** (for processors) | Ordinary consumer GPUs and CPUs |
| **Stream C** | **Proof-of-stake** — participants who lock up tokens vote | Validators who have staked |

Using three streams with completely different hardware is a deliberate security choice. Rewards are
split roughly evenly across the three, so no single group dominates how new tokens are created. **Stream
B is special:** the exact hardware it uses (graphics cards and processors) is what the NEURAX
marketplace wants, so the same machine can mine when idle and switch to paid computing jobs on demand.

*(One honest detail: on the live production networks, the node itself mines the processor-friendly Stream
A and proposes Stream C; the heavier graphics-card and memory-hard lanes are mined by dedicated external
miners, which is normal for those algorithms. And a correction from older drafts: Stream B now uses
kHeavyHash and Argon2id, not the previously-listed KAWPOW/RandomX.)*

### 3.4 Finality — making confirmed transactions permanent

Mining (Streams A and B) gives *probabilistic* ordering — the more time passes, the more confident you
are, but never 100%. PYRAX adds **deterministic finality** through Stream C. Validators lock up at least
**32 PYRX** and vote on blocks. Their votes use a special signature type (BLS) that can be **aggregated**
— hundreds of votes compress into a single signature checked all at once. Once votes representing **more
than two-thirds of all staked weight** cover a block, it is **final** and cannot be reversed without a
supermajority of stakers being financially punished ("slashed" — losing 5% of their stake, with a 10%
bounty to whoever reports the cheating). Undoing a finalized transaction would mean attackers
deliberately destroying an enormous amount of their own money. The cryptography for this, including a
defense against a known forgery trick called the "rogue-key attack," is real, tested code today.

### 3.5 Why a 51% attack doesn't work here

To rewrite history, an attacker would need a majority of **Stream-A specialized-chip power** *and* a
majority of **Stream-B graphics-card-plus-processor power** *and* a controlling supermajority of **staked
tokens** — three unrelated resources with different supply chains. Dominating one buys very little,
because the other streams plus finality keep ordering and finalizing the honest history, and reversing a
finalized block is a slashable offense.

---

## 4. Privacy — Shielded by Default

### 4.1 Private is the default

On most public blockchains, every transaction is visible forever — who paid whom, and how much. PYRAX
flips this: its **default transaction is shielded (private)**, enforced at the deepest level of the
software. On the live production networks, privacy is the path of least resistance.

### 4.2 The "note" model, by analogy

Instead of visible account balances, PYRAX's private system tracks **notes** — like sealed envelopes of
cash only the owner can open. Creating a note adds a tamper-proof *receipt* to a growing tree without
revealing what's inside. Spending a note publishes a unique one-time "spent" marker (a "nullifier") that
prevents double-spending *without* revealing which note it was.

### 4.3 What a private transaction reveals

A shielded transaction reveals only technical bookkeeping: which network it's on, a reference to the
tree's state, the list of "spent" markers, the list of new receipts, a net-value figure (zero for a
fully private transfer), the encrypted note contents (only the recipient can decrypt), and the
zero-knowledge proof. **What's absent is the point: no sender, no receiver, no amounts.** A fully private
transfer looks identical to every other one. A tiny flat fee is charged and burned to prevent spam.

### 4.4 The zero-knowledge proof, by analogy

The centerpiece is a **zero-knowledge proof**: you prove a statement is true without revealing any of
the information behind it — like proving you know a password by walking through a locked door and back,
without ever saying the password. For a private transfer, the proof convinces the whole network that the
notes being spent really exist, that the "spent" markers are correctly derived and unused, that value is
conserved (inputs equal outputs), and that the new notes are well-formed — all without revealing the
contents. PYRAX's proving system requires **no "trusted setup"** (no risky one-time ceremony that could
leak secret "toxic waste"), which eliminates a whole category of risk and is exactly what enables the
proof-folding that powers Layer 3. This proving code is real and runs by default; its exact circuits are
"pinned" (the node refuses to run if they've been tampered with) and will be **independently audited
before mainnet**.

### 4.5 Moving between the public and private worlds

**Shielding** moves public value into the private pool; **deshielding** moves private value out; a pure
private transfer touches neither. Double-spending is simply impossible — the network rejects any
transaction whose "spent" marker already appears.

---

## 5. Networking — Joining Without a Gatekeeper

A network that depends on a company-run "starter server" isn't truly decentralized. PYRAX is
**bootstrapless**: a brand-new node joins using only methods no single party controls — local discovery,
a global directory crawl, peer-to-peer word-of-mouth, and a community-maintained **signed** seed list
(a file anyone can host, *not* a server PYRAX runs). Blocks and private transactions spread via a gossip
protocol with spam resistance, and the network protects itself against being flooded or isolated
(connection limits, misbehavior scoring, and a cap of 8 peers from any single network neighborhood to
prevent "eclipse" attacks). It is also **honest about sync status** — a node that's behind won't falsely
claim it's 100% caught up.

---

## 6. Hiding Metadata from Your ISP — the Mixnet

Shielding hides *what* a transaction says; it doesn't hide *who is talking to whom* at the internet
level. PYRAX closes this with an **onion mixnet** underneath the regular network. Your message is wrapped
in multiple layers of encryption, like an onion, and travels through a chain of relays; each relay peels
exactly one layer, learning only the next hop — never the original sender, final destination, or
contents. Every packet is the **same fixed size** (so length can't be used to correlate traffic), relays
physically cannot see the contents, and decoy/cover traffic makes "sending a transaction" look identical
to "sending nothing." *(The core onion routing is built; the always-on cover-traffic generator is still
being finished.)*

---

## 7. Anonymous Services — File Transfer and Media Streaming

PYRAX ships two services that ride the mixnet, so an internet provider sees only uniform encrypted flows
whether you're sending a document or watching a live stream:

- **File transfer.** Files are split into chunks, each identified by a fingerprint and **end-to-end
  encrypted** with access-token-gated keys, so knowing a file's fingerprint does not grant the ability
  to read it. Transfers are resumable and travel over the mixnet.
- **Media streaming.** Live streams are broken into short encrypted segments delivered through a swarm —
  a decentralized content network with no origin server to block.

Because relays are content-blind, abuse is curbed *without* breaking privacy (rate limits and
access-token allow/deny lists). Paying relays and storage providers for capacity is planned as part of
the marketplace.

---

## 8. Running Programs at Scale — Layers 2 and 3

Layer 1 is deliberately lean. Rich programmability lives above it.

**Layer 2 — three programming environments.** PYRAX runs smart contracts in three "virtual machines,"
all anchored back to Layer 1 and able to call each other:

| Environment | What it runs | For whom |
|-------------|--------------|----------|
| **EVM** | Ethereum-style contracts (Solidity/Vyper) | The huge existing Ethereum developer ecosystem — MetaMask and Foundry work out of the box |
| **WASM** | Sandboxed general-purpose contracts in many languages | Developers who want broad language choice |
| **Cairo** | Proof-friendly contracts | Developers who want provable computation |

There are six kinds of transaction in total: shielded (private), transparent (public), Ethereum-style,
compute-escrow (for NEURAX), staking, and governance.

**Layer 3 — the recursive rollup.** Layer 3 bundles an enormous number of transactions off to the side
and settles them efficiently: a coordinator gathers transactions into batches, a prover proves each
batch valid, and — the defining feature — those proofs are **folded into a single compact proof** that
Layer 1 checks before settling. *Honest status: the mathematical core (the validity proof, the folding,
and the on-chain checker) is real and tested; the coordinator that turns it into a live service is still
being wired up, so this layer isn't switched on yet.*

---

## 9. NEURAX — the AI and Compute Marketplace

PYRAX turns the very hardware mining Stream B into a **verifiable compute marketplace.** Graphics cards
and processors that sit idle between blocks can earn money serving paid AI-inference and general
computing jobs.

**The hard problem is trust:** if you pay someone to run a computation on their own machine, how do you
know they actually ran it correctly? PYRAX answers with a **four-rung verification ladder**, from
cheapest to strongest:

1. **Redundant execution** — several independent workers run the same job and their results must match
   (compared only within a group of identical hardware/software, since different GPUs don't produce
   bit-identical results).
2. **Fraud proofs** — anyone can challenge a bad result within a challenge window.
3. **Interactive dispute** — a clever "narrow it down" game that pinpoints the exact step where two
   parties diverge, where the honest party always wins.
4. **Trusted hardware (TEE)** — for the highest tier, the work runs inside a sealed, attested hardware
   enclave.

Jobs are **escrowed on-chain** (payment locked in advance), run in **sandboxed workers**, verified, and
settled — the worker is paid on-chain once the result checks out. Payment goes to a **verified
cryptographic key**, never a self-declared name, closing a whole class of payment-redirection tricks.

NEURAX is **local-first**: it's designed so a mainstream graphics card (an **RTX 3060, the baseline
target**) can run useful models, and the same routing logic decides whether to run a job on your machine
or send it to the network. There are three trust tiers — **Open** (any consumer GPU), **Secure**
(open models split across several consumer GPUs — a deterrent, not a cryptographic guarantee), and
**Trusted** (sealed datacenter hardware only, for proprietary models).

The project is unusually honest about the physics: consumer AI video is "a few seconds, in minutes — not
Sora, not real-time"; giant models split across home internet run slowly; and today's cryptography can't
yet prove a large AI computation ran correctly (which is exactly why the verification ladder exists
instead). A large part of NEURAX is built and tested; some advanced pieces (the trusted-hardware
attestation, the public gateway, the coding copilot, high-end video) are still ahead.

---

## 10. Crucible — Mining with Zero Developer Fee

**Crucible** is PYRAX's own miner-manager — think of it like NiceHash, but with a **hard-coded zero
developer fee**, so miners keep 100% of what they earn. It points at the operator's *own local node*
(so rewards go straight to the operator, with no third-party pool taking a cut or hiding where the work
goes) and supports all the mining lanes: ASICs for Stream A, graphics cards and processors for Stream B.
*Crucible is designed and scaffolded; its full build is intentionally deferred until the core network's
mainnet program is complete.*

---

## 11. NOVA — the Autonomous Operations Brain

**NOVA** is the system that keeps the whole ecosystem healthy. It continuously watches every service,
notices problems, investigates them by gathering evidence, and — when it's confident and the problem
isn't sensitive — can **safely repair** them: it drives an AI coding assistant against an approved copy
of the code, refuses to touch anything sensitive (keys, wallets, consensus rules), **runs the full test
suite, and only ships the fix if everything passes** (otherwise it rolls back and leaves no trace).
NOVA is **advisory-first** — its autonomy is off by default, the most dangerous actions always require a
human, and anything that would restart a chain service broadcasts a 15-minute warning first. It runs its
AI brain locally and keeps an unchangeable audit log of everything it does. NOVA is built and **live
today**.

---

## 12. Token and Economics — Every Detail

This is the part the technical paper now specifies precisely (older drafts deferred the numbers). All of
the following are **enforced or defined in the live code.**

### 12.1 The token

- **Name / ticker:** PYRAX / **PYRX**.
- **Smallest unit:** one PYRX divides into 10¹⁸ base units (called "ash") — the same 18-decimal
  convention as Ethereum.
- **Maximum supply:** **50 billion PYRX**, a **hard cap the software enforces** — it is impossible for
  the network to ever create more. This 50 billion is made of **37.5 billion created at launch
  ("premine") + 12.5 billion paid out to miners over ~26 years.**
- **Genesis price:** **$0.0025 per PYRX** (a roughly **$125 million** fully-diluted valuation).

### 12.2 Where the 50 billion goes

The 37.5 billion created at launch is split into fixed pools:

| Pool | Amount | Share | Purpose |
|---|---:|---:|---|
| **Genesis (public) distribution** | 25,000,000,000 | 50% | Sold to the public + the launch bonus |
| **Ecosystem & liquidity** | 5,000,000,000 | 10% | Grants, integrations, exchange liquidity |
| **AI-Compute pool** | 4,000,000,000 | 8% | Pays NEURAX compute providers |
| **Team & advisors** | 2,500,000,000 | 5% | The team (with a 1-year cliff, see below) |
| **DAO treasury** | 1,000,000,000 | 2% | Community-governed reserve |
| **Mined by miners** | 12,500,000,000 | 25% | Block rewards over ~26 years |
| **PYRAX operations treasury** | starts at 0 | — | Filled over time from network fees |

**The launch event.** 20 billion PYRX are offered at $0.0025 each (**$50 million** if fully sold), plus a
**25% bonus** (5 billion PYRX) framed as network-access / compute credits — **never** as an investment
return. So launch participants receive **25 billion PYRX total**.

**Lock-ups (vesting).** These are the intended schedules (the on-chain enforcement contract is a later
phase): launch buyers and the bonus are fully liquid at launch; the team's tokens are locked for a
**1-year cliff and then release over 36 months**; the ecosystem pool releases 40% at launch and the rest
over 24 months; the AI-compute pool streams over 48 months; the DAO releases 10% at launch and the rest
by community vote. About **27 billion PYRX (~54%) is in circulation at launch.**

### 12.3 How new tokens are created (emissions)

Miners earn a **block reward that starts at 300 PYRX per block** and **halves every 21 million blocks
(about every 4 years)**, stopping once the 12.5-billion mining cap is reached (about 26 years, with
~80% paid out in the first ~8 years). After that, miners are paid purely from transaction fees. The full
reward for each block goes to whoever produced it; because each of the three streams produces roughly a
third of the blocks, the reward ends up split roughly evenly across them over time.

### 12.4 Transaction fees — who gets what

PYRAX uses the modern "EIP-1559" fee model (a base fee plus an optional tip). The split is **frozen in
the protocol and cannot be changed by any vote:**

- **Base fee:** **25% is burned** (permanently removed from supply), **50% goes to the PYRAX operations
  treasury**, and **25% goes to the DAO treasury**.
- **Tip:** **70% goes to the block producer**, **20% to the operations treasury**, and **10% to the
  DAO.**

Private (shielded) transactions also pay a small flat fee that is burned.

### 12.5 The AI-compute economy

Compute is priced in **Compute Units (CU)**, where **1 CU = one hour of a reference high-end graphics
card** (an RTX 4090). The rate is a fixed **8 PYRX per CU**. The 4-billion AI pool funds roughly
**70 million PYRX per month** of payouts, adjusted by quality (0.8–1.2×) and demand (buyers can pay up to
2× for priority). Over time, as the marketplace earns real revenue (job fees plus the treasury's share
of network fees), that revenue gradually replaces the pool; once revenue fully covers payouts, the
**leftover pool returns to the DAO treasury.** The program is candid that, at the launch price, 8 PYRX/CU
(~$0.02 per GPU-hour) means early provider earnings depend on the token's value growing.

### 12.6 Staking

Validators (the Stream-C, stake-based participants) lock up at least **32 PYRX**, wait about **7 days** to
withdraw, and earn a share of block rewards, tips on blocks they produce, and staking rewards. Cheating
(double-signing) costs them **5% of their stake**, with **10% of that going as a bounty** to whoever
reported it.

---

## 13. Governance — Who Can Change What

PYRAX has **on-chain governance**: anyone can submit a proposal (locking a 1,000-PYRX refundable
deposit), validators vote weighted by their stake, and if a proposal reaches **at least one-third
participation** and **more than two-thirds approval**, it automatically takes effect after a one-day
warning window. But governance is deliberately **narrow** — only three technical settings can be changed
(the block size limit, the minimum validator stake, and the withdrawal waiting period). **Some things
can never be changed by any vote:** the fee split, the 50-billion cap and the halving schedule, and the
governance rules themselves. (Spending the DAO treasury by vote is a planned later addition.) This keeps
the economic promises credible while still letting the community tune the network.

---

## 14. The Four Networks

PYRAX ships as one program that can run four separate networks:

| Network | Chain ID | What it is |
|---|---:|---|
| **PYRAX Seed** | 881,109 | A permanent developer sandbox with play-money — like a practice field. It runs a simplified "instant" mode and is the only network without the hard supply cap. |
| **PYRAX Forge** | 710,823 | A closed public alpha running the real production engine, with a small set of starter validators. |
| **PYRAX Rise** | 104,928 | The official public testnet — a real, incentivized test of the live system. |
| **PYRAX One** | 563,821 | The mainnet. Launches after the external audit; no faucet, no shortcuts. |

An important safety property: a real production network **can never fake the sandbox's "instant" mode** —
the software checks this — so you always know whether you're on the real thing or the practice field.

---

## 15. The Apps and Wallet

PYRAX has desktop apps — **Inferno** (the public operator app: run a full node, mine, stake, and
contribute AI/compute) and an internal seeding variant — plus a **command-line tool** for advanced users
that embeds the whole node. The **wallet** is built for serious security: your secret keys are protected
by strong password-based encryption, sealed to your operating system's keychain, and guarded by an extra
two-factor code, and **your private-spending key never leaves the app** (it is never sent to the node).
The apps update themselves over the internet and connect to a per-node web portal through a
self-hosted secure tunnel.

*(Honest notes: the automatic updater relies on standard secure transport and operating-system code
signing but doesn't yet add its own extra signature check on downloads; and the command-line tool's key
protection, while solid, is slightly weaker than the desktop wallet's. Both are known items on the
security to-do list.)*

---

## 16. Security and the Path to Mainnet

PYRAX maintains a formal list of **invariants** — properties the software must always uphold (the supply
can never exceed 50 billion, value is conserved in every transaction, finalized blocks can't be reverted,
private transactions can't double-spend or forge value, and so on) — each backed by a test. It also
keeps a **threat model** listing the attackers it defends against and how.

**The road to mainnet is explicitly gated on outside review.** Before PYRAX One launches:

- Automated stress-testing (fuzzing) of the consensus, the ordering, the data formats, and the circuits;
- **Dedicated cryptography and circuit audits** by outside experts;
- External review of the consensus design and the privacy design;
- An **incentivized public testnet** (that's Rise) and a **bug bounty**;
- …and **only then** mainnet.

The single external gate before mainnet is an audit of the consensus, the privacy math, and the bridge.
**No privacy circuit ships to mainnet unaudited.** And crucially, **the system never deploys itself** —
going live is always a deliberate human decision.

The project is equally clear about what's **not yet finished**: the highest scaling layer's coordinator,
the always-on cover-traffic generator, some NEURAX trust hardware and services, and the standalone miner
are still being built; and a couple of the app-security items above are on the to-do list. None of these
gaps are hidden.

---

## 17. Governance Philosophy and Licensing

PYRAX is **"open-core."** The protocol — the node, consensus, privacy circuits, command-line tools,
developer kit, and contract interfaces — is **open-source under Apache-2.0**, because a decentralized
network's rules *must* be public for it to be trustworthy (exactly why Bitcoin, Ethereum, and Zcash are
open). The apps, wallet, NEURAX, and hosted services are **proprietary.**

The reasoning is honest: a restrictive code license wouldn't protect a blockchain anyway — any chain can
be copied regardless of license. So the real, defensible advantages are the **brand** (PYRAX™, a
trademark), the **network and its effects**, the **wallet/app/NEURAX experience**, and the **off-chain
services** — not secrecy of the protocol source. Apache-2.0's patent grant also signals PYRAX won't use
patents against its own users. And governance follows the same principle: **no project-run infrastructure
sits on the critical path** — the network can run, and users can join, without trusting any single
operator, including PYRAX itself.

---

## Closing — What PYRAX Is, and What It Honestly Isn't

**What PYRAX is:** an ambitious, from-scratch network where high throughput, default privacy, full
decentralization, and resistance to internet-level surveillance are built into the lowest level — now
substantially *built*, not just designed. It replaces the single-chain model with a web of blocks,
secures itself with three independent mining/staking streams plus financial finality, makes every
transfer private by default with no-trusted-setup zero-knowledge proofs, routes traffic through an onion
mixnet so even your ISP is blind, scales through three programming environments and a recursive rollup,
turns idle mining hardware into a verifiable AI and compute marketplace (NEURAX), gives miners a
zero-fee first-party tool (Crucible), and watches over itself with an autonomous ops brain (NOVA). Its
core protocol is open-source so anyone can verify the rules, and its economics — a 50-billion hard cap,
a transparent launch, a capped halving emission, a fixed fee split, and narrow, credible governance —
are specified precisely and enforced in code.

**What PYRAX honestly isn't (yet):** finished. Most of the system is real and tested, but the privacy
guarantees stay test-grade until independent cryptography audits clear them (and no privacy circuit ships
to mainnet unaudited), the top scaling layer and a few NEURAX and app pieces are still being built, and
mainnet launches only after outside review. That combination — a bold technical vision paired with
disciplined honesty about what is proven versus what is still being built — is the heart of how PYRAX
presents itself, and this companion has aimed to convey both faithfully.

---

*PYRAX™ — high-throughput, private-by-default, fully decentralized, ISP-resistant, and open-core. This
plain-English companion describes the protocol as implemented as of 2026-06-30; every figure comes
directly from the technical paper and the live source code, and the honest limitations of the current
build are stated plainly above.*
