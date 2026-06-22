<!-- SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary -->
# PYRAX Network — Plain-English Whitepaper

**Version 3.0 · A companion to the PYRAX Technical Whitepaper**

This document explains everything the PYRAX technical whitepaper covers, but
written for an intelligent reader who does not need to know how blockchains work
under the hood. Every figure and claim here comes directly from the technical
paper — nothing is invented or exaggerated. Where the technical paper is honest
about something still being in design, in research, or unproven until an outside
audit, this companion says so too. Honesty is part of the brand.

---

## What is PYRAX? (Executive Summary)

PYRAX is a new public network for moving value and running programs — a
"blockchain," in the popular term, though as you'll see it is technically more
like a web than a chain. It is built from scratch in the Rust programming
language, and it is organized around four promises that most networks treat as
optional extras but that PYRAX treats as foundational, non-negotiable rules:

1. **High throughput.** It is designed to handle a very large number of
   transactions at once — the stated target is **at least 500,000 transactions
   per second** across the whole network, more than any network running in
   production today.
2. **Privacy by default.** When you send value on PYRAX, the sender, the
   receiver, and the amount are hidden automatically. You have to go out of your
   way to make a transaction *public*, not the other way around.
3. **Full decentralization.** There is no company-run "starter server" you must
   connect to in order to join. No single party — not even the PYRAX project
   itself — sits on the critical path.
4. **Resistance to network-level spying.** Even your internet provider, who can
   normally see who you talk to and how much data you send, cannot tell *what*
   you are doing or *who* you are communicating with on PYRAX.

To deliver these, PYRAX combines several ideas:

- A **blockDAG** (a web of blocks) ordered by an algorithm called **GhostDAG**,
  instead of a single straight chain. This lets many participants add to the
  ledger at the same time without wasting work.
- A **three-stream mining model** ("TriStream") where new blocks come from three
  completely different sources — two kinds of computational mining and one
  stake-based system — so no single group can take over.
- **Shielded transactions** built with advanced cryptography ("zero-knowledge
  proofs") that prove a transfer is valid without revealing any of its details,
  and that critically require **no trusted setup** (no risky one-time ceremony
  that could be compromised).
- A **bootstrapless peer-to-peer network** with no company-operated entry point.
- An **onion-routed mixnet** — traffic is wrapped in layers and padded so an
  observer sees only uniform, encrypted flows.
- **Extra execution layers** (called L2 and L3) that run smart contracts and
  batch huge numbers of transactions for scale.
- A **compute marketplace** that puts the same hardware used for mining to work
  running paid AI and general computing jobs.

The core protocol is **open-source under the Apache-2.0 license**, so anyone can
inspect, run, and verify it. The apps, wallet, and hosted services are
**proprietary**. This split is deliberate, and explained later.

One honest caveat up front, stated plainly in the technical paper: most of PYRAX
is still being built. The cryptographic and type-level foundations ("Phase 0")
are complete, tested, and live. The rest is planned or in research, and **nothing
involving the privacy circuits ships to the live "mainnet" network until it has
passed dedicated outside cryptography audits.** PYRAX does not claim to be
finished; it claims to be honestly engineered toward a clear goal.

---

## 1. Design Goals — the Five North Stars

PYRAX is guided by five core properties that apply to every part of the system,
rather than being bargained away feature by feature.

| # | Property | What it means in plain terms |
|---|----------|------------------------------|
| 1 | **A web, not a chain** | Blocks can reference many recent blocks at once, so honest work done in parallel is *included* rather than thrown away. The result is more capacity and faster confirmation. |
| 2 | **Privacy everywhere** | The default transaction hides who sent it, who received it, and how much. Public transactions are the rare exception you must explicitly choose. |
| 3 | **Truly decentralized, no starter server** | You can join using only methods that no single party controls — there is no company server you depend on to get connected. |
| 4 | **Hides metadata from your ISP** | Network traffic is wrapped and padded so your internet provider can't tell what you're transferring or who you're talking to. |
| 5 | **Open and verifiable** | The protocol's rules are public so anyone can check them. A network with secret rules can't really be trusted; PYRAX's rules are open. |

The paper stresses these are **constraints, not aspirations**. The earliest,
already-built foundation code was written to be "DAG-aware" and "privacy-aware"
from day one, so every later layer is built on top of these guarantees rather
than trying to add them in afterward.

---

## 2. The Big Picture — How the Layers Fit Together

Think of PYRAX as a stack of layers, each sitting on the one below it:

- **Layer 1 (L1)** is the foundation: the web-of-blocks ledger ("blockDAG")
  where value lives, with privacy built in at the lowest level.
- **Layer 2 (L2)** sits on top and runs programs ("smart contracts") in three
  different programming environments, all anchored back to L1 for security.
- **Layer 3 (L3)** sits on top of that and bundles enormous numbers of
  transactions together, settling them down to L1 with a single compact proof.

Running underneath all of this are **two transport systems**: the peer-to-peer
network that connects nodes without any central server, and the onion mixnet
that hides traffic patterns. At the very top sit the **applications** people
actually use: wallets, the node-and-mining app, the anonymous file-sharing tool,
and the media-streaming service.

The software itself is organized into many small, single-purpose modules (called
"crates" in Rust), each responsible for one job — the cryptography, the
DAG ordering, the privacy pool, the mixnet, the file/streaming service, the
consensus engine, the networking, the storage, and the execution layers. This
modular design means each piece can be built, tested, and verified on its own.

---

## 2A. Performance and Scale — the 500,000 TPS Target

PYRAX aims for **at least 500,000 sustained transactions per second**. The
technical paper is careful and honest about what this number means:

- It is a **network-wide aggregate** — the whole network combined, not a single
  machine — with a high "floor" provided by the base layer.
- It is treated as **a measured engineering mandate, not a marketing slogan.**
  The rule the paper sets for itself: **no throughput number is ever published
  without a reproducible benchmark** that states the exact workload, hardware,
  and bandwidth assumptions behind it.
- The **headline number refers to simple value transfers** (the way networks
  conventionally quote "TPS"). More complex measurements — contract-call speed
  and private/shielded transaction speed — are measured and reported
  *separately*, so every figure is honest and comparable rather than mixed
  together to look bigger.

No single trick gets you to 500,000. PYRAX stacks several together:

| Technique | Plain explanation |
|-----------|-------------------|
| **Parallel blocks (the DAG)** | Many blocks can be accepted at once — there's no single leader everyone waits on — so capacity grows as the network grows. |
| **Parallel execution** | Transactions that don't conflict run at the same time across multiple processor cores; if two actually conflict, they're re-run in a deterministic order. Speed scales with cores. |
| **Layer-2 / Layer-3 rollups** | Most of the volume happens in the upper layers; the L3 layer bundles huge numbers of transactions and settles a single small proof to L1. |
| **Recursive proof aggregation** | Thousands of private-transaction proofs are folded into *one* combined proof, so a validator only has to check roughly one proof per batch instead of one per transaction. |
| **Data-availability sampling** | Lightweight and mobile devices confirm that a block's data is actually available by randomly checking a few pieces, instead of downloading and re-running everything. |
| **Hardware-accelerated proving** | Powerful graphics cards (and, later, specialized chips) generate the cryptographic proofs — naturally reusing the idle GPU capacity of the Stream-B miners. |
| **Fast networking** | Compact relaying, error-resistant data spreading, batching, and a modern fast transport protocol keep data moving through the network faster than it's processed. |

**Why the proof-folding matters so much.** Privacy normally makes scaling *harder*,
because each private transaction comes with a cryptographic proof that has to be
checked. If a validator had to check every single one, that would become the
bottleneck. PYRAX treats the "fold thousands of proofs into one" technique as a
core consensus mechanism, not a nice-to-have — it's specifically what makes
"private by default" compatible with the 500,000 target.

**Scale without sacrificing decentralization.** High total throughput does *not*
require every participant to process every transaction. PYRAX defines four
**node classes** — archival, full, light, and mobile — so ordinary
consumer-grade machines can still take part. Full validators can run on
high-end-consumer ("prosumer") hardware, while light and mobile devices rely on
the sampling and compact-proof techniques above. The paper is explicit: the
500,000 target **never silently trades away decentralization.**

**Honest framing.** The paper openly states that 500,000 sustained is beyond every
production network today, and that it's reached **progressively** through the
project's phases — a single-node baseline first, then the base-layer DAG floor
with parallel execution, then batched private-transaction verification, then the
full L2/L3 aggregate — each step gated by reproducible benchmark numbers.

---

## 3. Consensus — How Everyone Agrees on What Happened

"Consensus" is just the process by which all the independent computers running
the network agree on a single, shared history of transactions. This is the
heart of any blockchain, and PYRAX does it differently from most.

### 3.1 Why a web of blocks instead of a chain

In a traditional blockchain, every new block must point to exactly one previous
block, forming a single line. The problem: if two honest participants produce a
block at the same moment, only one can "win" — the other becomes an **orphan**,
wasted work. That wasted work also weakens security, because the effort of
honest participants gets discarded.

PYRAX uses a **blockDAG** instead — picture a web where each new block can point
back to *many* recent blocks at once. Concurrent honest blocks are all absorbed
into the web rather than discarded. This raises capacity and speeds up
confirmation.

There's a catch, and the paper is upfront about it: when blocks form a web
instead of a line, "which block came first" is no longer obvious from the shape.
It has to be **computed**. That computation is GhostDAG.

### 3.2 What's inside a block

Each block carries the information needed to figure out its place in the web,
including:

- A list of **parent blocks** it points to (one of them is marked as the
  "selected parent" — the most important one).
- Scores that measure how much honest work sits behind it.
- Cryptographic summaries ("roots") of the current state — the accounts, the
  privacy data, and the transactions.
- A timestamp, and a marker for **which of the three streams** mined it.

Every block gets a unique fingerprint computed from all of its contents, so any
node anywhere derives the exact same fingerprint, and changing any field — even
the list of parents — changes the fingerprint. This makes tampering detectable.

### 3.3 GhostDAG ordering — explained by analogy

GhostDAG is the rule that turns the web of blocks into a single agreed-upon
order. Here is the intuition:

Imagine a busy room where people are constantly writing notes and pinning them
to a giant board, each note referencing the notes already on the board that the
writer could see. Honest people who are all looking at the same board reference
each other's recent notes — they form a tightly connected cluster. GhostDAG
colors these well-connected, mutually-visible blocks **blue**. They are the
honest mainstream.

Now imagine someone sneaks off to a corner and secretly writes a private stack
of notes, hiding them from everyone else, planning to reveal them later to
rewrite history. Because those secret notes ignored everything the honest crowd
was writing, when they finally appear they stand apart from the honest blue
cluster — they have many honest blocks they "didn't see." GhostDAG colors these
isolated blocks **red** and effectively sidelines them.

More precisely:

- **Selected-parent chain.** Following the "most important parent" link from any
  block back to the beginning traces out PYRAX's equivalent of a "main chain."
- **Blue vs. red.** A block stays blue if including it keeps the set of blue
  blocks tightly clustered (technically, a "k-cluster" — each blue block has at
  most *k* other blue blocks it didn't see). Honest blocks made within roughly
  one network-propagation delay of each other stay blue. A secretly-mined block
  ends up red.
- **Blue work is the deciding weight.** Each block accumulates "blue work" from
  the honest blue blocks behind it, and the tip with the **heaviest blue work
  wins.** A secret branch can never accumulate more blue work than the honest
  mainstream, so withholding blocks or publishing them late simply doesn't pay
  off.
- **Deterministic ordering.** When a block merges several branches, GhostDAG
  orders them in a fixed, deterministic way (blue before red, ties broken by
  fingerprint), so every node computes the *same* execution order.

The exact tuning parameters (like the value of *k*) are fixed in a dedicated
design document and, importantly, will be **externally reviewed before the live
network launches.** The underlying data types are already finalized in the
foundation code.

### 3.4 TriStream mining — three independent doors into the network

New blocks enter the web through **three independent streams**, each with its own
way of "earning" the right to add a block, but all producing the same kind of
block and all ordered by the same GhostDAG rules:

| Stream | How it works | Who runs it |
|--------|--------------|-------------|
| **Stream A** | Computational mining using two hash algorithms (BLAKE3 + SHA-256) | Specialized mining chips (ASICs); very high raw speed |
| **Stream B** | Computational mining using two *memory-hard* algorithms (KAWPOW for GPUs + RandomX for CPUs) | Ordinary consumer graphics cards and processors; resistant to specialized chips |
| **Stream C** | Proof-of-stake — participants who lock up tokens vote | Validators who have staked tokens |

Using three streams with **completely different hardware bases** is a deliberate
security decision (explained in 3.6). Block rewards are split across the three
streams — an *approximately equal* three-way split is the design baseline, with
the precise schedule set in the consensus design document — so no single stream
dominates how new tokens are created.

**Stream B has a special role.** The exact hardware it uses (graphics cards and
processors) is precisely what's wanted by PYRAX's compute marketplace (Section
9). The same machine can mine when it's otherwise idle and switch to running paid
computing jobs when there's demand, through a shared link between the mining code
and the job-market code.

### 3.5 Finality — making confirmed transactions truly permanent

Computational mining (Streams A and B) gives *probabilistic* ordering — the more
time passes, the more confident you are, but never 100%. PYRAX adds **deterministic
finality** through Stream C, the stake-based stream.

Validators lock up ("stake") tokens — the design baseline is a minimum stake
with a multi-day waiting period to withdraw, and penalties for cheating — and
they vote on the GhostDAG-ordered blocks. Their votes use a special kind of
digital signature (BLS signatures) that can be **aggregated**: the votes of
hundreds of validators compress down into a *single* signature that can be
checked all at once. This is what makes large-scale voting practical.

Once enough votes — representing **more than two-thirds of all staked weight** —
cover a block, that block is **final**. A finalized block cannot be reversed
without a supermajority of stakers being financially punished ("slashed"). In
plain terms: undoing a finalized transaction would require attackers to
deliberately destroy an enormous amount of their own money.

The paper notes the cryptography for this is **already implemented and tested
today**, including a specific defense (called "proofs of possession," plus
validation of every voting key) against a known forgery trick called the
"rogue-key attack," where an attacker would otherwise craft a special key to
fake a vote on behalf of an honest validator.

### 3.6 Why a 51% attack doesn't work here

A classic "51% attack" assumes there's *one* resource an attacker can amass a
majority of (one kind of mining power) to rewrite history. PYRAX makes that
assumption false in two ways:

1. **Stream diversity.** To rewrite history, an attacker would need a majority of
   Stream-A specialized-chip power **and** a majority of Stream-B
   graphics-card-plus-processor power **and** a controlling supermajority of
   staked tokens in Stream C — three unrelated resources with different supply
   chains and economics. Dominating just one buys very little, because the other
   two streams plus finality keep ordering and finalizing the honest history.
2. **DAG structure.** Because honest parallel work is *merged* instead of
   orphaned, the honest "blue" mainstream grows at full speed. A secret attacker
   branch gets colored red and loses on blue work. Withholding doesn't help;
   publishing late doesn't help.

Finality closes the loop: even a brief disagreement about ordering is resolved
for good once two-thirds of stake votes, and reversing a finalized block is an
explicitly punishable offense.

---

## 4. Privacy — Shielded by Default

### 4.1 Private is the default

On most public blockchains, every transaction is visible to everyone forever —
who paid whom, and how much. PYRAX flips this. Its **default transaction is
shielded** (private), and this is enforced at the deepest level of the software:
blocks are built to carry the private transaction type, with public transactions
existing only as an explicit special case. Privacy is the path of least
resistance — something users get automatically, not an option they have to
remember to turn on.

### 4.2 The "note" model — explained by analogy

Instead of tracking balances in visible accounts, PYRAX's private system tracks
**notes**. A note is like a sealed envelope of cash that only its owner can open.
The global private state is kept in two structures:

- A growing **tree of note "commitments."** A commitment is like a tamper-proof
  receipt that a note exists, without revealing what's inside it. Every new
  note's commitment is added to this tree.
- A **list of "nullifiers."** When a note is spent, a unique one-time marker
  (its nullifier) is published and added to this list. This is how the network
  prevents the same note from being spent twice — *without* revealing which note
  it was.

So creating a note adds a sealed receipt to the tree; spending a note publishes a
one-time "spent" marker that can't be linked back to which note it came from.

### 4.3 What a private transaction actually reveals

A shielded transaction reveals only a minimal set of technical fields: an
identifier for which network it's on (to prevent replay), a reference to the
state of the note-tree it's proving against, the list of "spent" markers, the
list of new note receipts, a net value figure (used only when moving in or out of
the private pool — zero for a fully private transfer), the encrypted note
contents (which only the intended recipient can decrypt), and the
zero-knowledge proof itself.

What is **absent** is the important part: **no sender, no receiver, and no
per-note amounts.** For a fully private transfer, even the net-value figure is
zero, so it looks identical to every other private transfer.

### 4.4 The building blocks — commitments, nullifiers, viewing keys, encryption

The technical paper describes four privacy building blocks that are
**implemented and tested today**:

- **Note commitment** — the sealed-receipt mechanism. It is both *hiding* (it
  reveals nothing about the note's contents without a secret "blinding factor")
  and *binding* (the creator can't later claim the receipt was for a different
  note). The included tests confirm both properties.
- **Nullifier** — the one-time "spent" marker, derived from the owner's secret
  key and the note. Its uniqueness prevents double-spending, while revealing
  nothing that links it back to the original note.
- **Note encryption** — uses a well-established encryption scheme
  (ChaCha20-Poly1305) so that a recipient can find and decrypt the notes meant
  for them, while no one else can.
- **Viewing keys** — a clever feature that **separates "see" from "spend."** A
  recipient (or an auditor the recipient chooses to authorize) can be given a
  viewing key that lets them scan and read incoming notes *without* any ability
  to spend them. This supports voluntary auditing and accounting without giving
  up control of funds.

### 4.5 The zero-knowledge proof — explained by analogy

The cryptographic centerpiece is the **zero-knowledge proof** (or "zk-SNARK").
The idea sounds impossible at first: you prove a statement is true without
revealing *any* of the information behind it.

An analogy: imagine proving to a friend that you know the secret password to a
locked door, by walking through the door and back, without ever telling them the
password. They become convinced you know it; they learn nothing about what it is.

For a private transfer, the proof convinces the entire network that the
transaction is valid — specifically that:

1. **The notes being spent really exist** in the official note-tree.
2. **The "spent" markers are correctly derived** (so only the rightful owner
   could create them), and — checked separately — haven't been used before.
3. **Value is conserved** — the inputs equal the outputs — even though all the
   amounts are hidden.
4. **The new notes are well-formed** — valid amounts, correctly addressed to the
   right recipient.

…all **without revealing the contents.**

A crucial design choice: PYRAX uses proving systems (**Halo2 or Plonky2**) chosen
specifically because **neither requires a "trusted setup."** A trusted setup is a
one-time ceremony some older privacy systems needed, which produces secret
"toxic waste" that, if it were ever leaked or kept, could be used to forge money
invisibly. By avoiding that entirely, PYRAX eliminates that whole category of
risk — and these same proving systems are exactly what enables the
proof-folding that makes the L3 scaling layer possible.

### 4.6 Public transfers, and moving between worlds

Public ("transparent") transactions are the explicit special case — the familiar
kind where the sender is identifiable. The boundary between the public and
private worlds is handled by that single net-value field:

- **Shielding** = moving public value *into* the private pool.
- **Deshielding** = moving private value *out* into the public world.
- A purely private transfer touches neither — it's indistinguishable from any
  other private transfer.

And double-spending is simply impossible: the network rejects any transaction
whose "spent" marker already appears in the list.

---

## 5. Networking — Joining Without a Gatekeeper

A network that depends on a company-run "starter server" to help new participants
connect isn't truly decentralized — that server is a single point of failure,
censorship, and surveillance. PYRAX is **bootstrapless**: a brand-new node can
join using only methods that no single party controls.

| Method | What it does |
|--------|--------------|
| **Local discovery (mDNS)** | Automatically finds other PYRAX nodes on the same local network. |
| **Global crawl (Kademlia DHT)** | Wanders the global distributed directory to discover peers, with no fixed entry point. |
| **Peer exchange** | Nodes tell each other about the peers they know, so connectivity spreads like word of mouth. |
| **Signed community seed list** | A community-maintained list of starting addresses that is *cryptographically signed* — a file anyone can host or mirror, **not** a server PYRAX operates. |
| **DHT rendezvous** | Nodes register under a known "meeting point" key in the global directory and find each other there. |

There is no privileged "discovery node." Whether a node behaves as a discovery
helper or a normal operator is just a **configuration setting, not separate
infrastructure.** Combined, these methods let even a tiny 3-node test network
assemble itself with no starter server — a transaction submitted on one node
shows up on the others.

### 5.1 How blocks spread, and how new nodes catch up

Blocks and private transactions spread across the network using a gossip
protocol (GossipSub) that includes spam resistance and peer scoring to fend off
abuse and isolation attacks. Because the ledger is a web rather than a line,
catching up isn't "download blocks 5 through 10." Instead a node exchanges its
known web-tips with peers and pulls down whichever ancestor blocks it's missing,
then recomputes the GhostDAG ordering. Connection limits, misbehavior scoring,
and backoff guard against resource-exhaustion attacks.

---

## 6. Hiding Metadata from Your ISP — the Mixnet

Shielding hides *what* a transaction says. It does **not** hide *who is talking
to whom* at the internet level. Your internet provider can still see that your
device connects to PYRAX peers, when, and how much data it sends — and this kind
of "traffic analysis" can de-anonymize people even when the contents are
encrypted.

PYRAX closes this gap with an **onion-routed mixnet** — a transport layer that
sits *underneath* the regular peer-to-peer network.

The "onion" analogy is exact: your message is wrapped in **multiple layers of
encryption**, like the layers of an onion. It then travels through a chain of
relays, and **each relay can peel off exactly one layer** — learning only where
to send it next, never the original sender, the final destination, or the
contents.

Three properties make this robust:

- **Fixed-size packets.** Every onion packet is the **same size** regardless of
  what's inside, so an observer can't use message length to correlate traffic.
- **Content-blind relays.** Relays physically *cannot* see the plaintext — it's
  built into the design — and replay protection stops a captured packet from
  being re-injected.
- **Cover traffic and padding.** Nodes send decoy traffic and pad real traffic
  to a uniform shape and timing. The effect: an observer **cannot tell the
  difference between "sending a transaction" and "sending nothing."**

The mixnet can be configured to be always-on or opt-in, and the paper specifies a
**clear, explicit warning** to the user any time the system has to fall back to a
direct connection because the mixnet is unavailable — so users are never silently
exposed. The goal, to be validated in a dedicated project phase, is that any
on-path observer — including an ISP — cannot link sender to receiver.

---

## 7. Anonymous Services — File Transfer and Media Streaming

PYRAX ships two first-class services that ride on the mixnet, so that an internet
provider sees only uniform encrypted flows whether you're sending a document or
watching a live stream.

### 7.1 Anonymous, end-to-end-encrypted file transfer

Files are split into chunks. Each chunk is identified by its own cryptographic
fingerprint, and the chunks are organized by a "manifest." Crucially, content is
**end-to-end encrypted** with per-chunk keys gated by access tokens — so simply
knowing a file's fingerprint does **not** grant the ability to read it. Only
someone holding the proper access token (capability) can decrypt it.

Availability is advertised through the distributed directory, transfers can be
paused and resumed, and all the data travels over the mixnet. Because relays are
content-blind and packets are uniform, an internet provider **cannot tell a file
transfer apart from any other PYRAX traffic, nor recover the contents.**

### 7.2 Decentralized media streaming

Live media streams are broken into short, encrypted segments published and
subscribed through a swarm of participants — effectively a decentralized content
delivery network with **no origin server to block.** Segment delivery is tuned
for low-latency playback, and, like file transfer, every segment rides the
mixnet. An internet provider watching a viewer sees the same padded, uniform,
encrypted flow it would see for any other activity — it **cannot tell that a
stream is being watched, which stream, or by whom.**

### 7.3 Preventing abuse without breaking privacy

Because relays can't see content, abuse is curbed *without* breaking privacy:
rate limits, optional allow/deny lists based on access tokens, and the per-chunk
access-token model let operators cap resource use while remaining unable to
inspect or selectively censor content. Optional paid-relay and paid-storage tie-
ins to the compute market (Section 9) give people an incentive to provide
capacity.

---

## 8. Execution Layers — Running Programs at Scale

The base layer (L1) is deliberately kept lean — it does DAG consensus and private
value transfer, and not much else. Rich programmability and massive scale live in
the layers above it.

### 8.1 Layer 2 — three programming environments

PYRAX's L2 offers **three different execution environments** ("virtual machines"),
each anchored back to L1, so developers can bring tools they already use. The
analogy: three different "game consoles" that all plug into the same single
underlying ledger and share its security.

| Environment | What it runs | Who it's for |
|-------------|--------------|--------------|
| **EVM** | Ethereum-style contracts (Solidity/Vyper) | Developers from the large existing Ethereum ecosystem |
| **WASM** | Sandboxed general-purpose contracts in many languages | Developers who want broad language choice |
| **Cairo** | Contracts in a proof-friendly model | Developers who want provable computation |

A bridge anchors the L2 state back to the L1 web of blocks. Certain
protocol-level functions — the native token, staking, the bridge, the proof
verifier, and the AI-compute job escrow — are implemented as **system contracts**
running on this multi-environment L2.

### 8.2 Layer 3 — the recursive ZK rollup

L3 is a "rollup," which means it bundles up an enormous number of transactions
off to the side and then settles them down to the main network efficiently. Here
is the flow in plain terms:

- A **sequencer** gathers many L3 transactions into batches.
- A **prover** generates a cryptographic proof that each batch is valid.
- The defining feature: those batch proofs are **recursively aggregated** —
  combined into a *single* compact proof.
- An L1 verifier checks that **one** compact proof before settling.

Because it reuses the **same no-trusted-setup proving system** that powers the
private transactions, PYRAX keeps a *single* proving toolchain across both privacy
and scaling. The payoff: L3 throughput far beyond what the base layer alone could
do, while still inheriting the base layer's security through the settled proof.

---

## 9. The AI / Compute Marketplace

PYRAX turns the very hardware already mining Stream B into a **verifiable compute
marketplace.** Stream-B miners are graphics cards and processors that sit idle
between blocks. The marketplace lets them earn money serving paid AI-inference and
general computing jobs, with a built-in switch that moves a worker between mining
and serving based on demand.

The hard problem here is **trust**: if you pay someone to run a computation on
their own machine, how do you know they actually ran it correctly and didn't just
make up the answer? The paper lays out the design space (to be finalized in a
dedicated phase):

- **Redundant execution** — have several independent workers run the same job and
  compare results.
- **Fraud proofs** — let anyone challenge an incorrect result.
- **Zero-knowledge ML** — have the worker mathematically prove it ran the
  computation correctly.

Jobs are **escrowed on-chain** (payment is locked up in advance via a system
contract), executed in **sandboxed workers** (isolated, with restricted network
and resources so a malicious job can't do harm), verified, and then settled — the
worker is paid on-chain once the result checks out.

---

## 10. Token and Incentives

PYRAX's economic design (described qualitatively in the technical paper, with
exact parameters fixed in the consensus and economics design documents) is built
to reward the people who keep the network secure, private, and available.

- **Emission split across the three streams.** New tokens (block rewards) are
  divided across Stream A, Stream B, and Stream C — an *approximately equal*
  three-way split is the design baseline — so issuance never concentrates in one
  hardware class or mechanism, and the stream diversity that underpins
  51%-resistance stays economically sustainable.
- **Staking.** Stream-C validators lock up stake (baseline: a minimum stake with
  a multi-day withdrawal delay) to take part in finality and earn the stake share
  of rewards. Cheating — double-signing or violating finality — is **slashable**
  (results in losing stake).
- **Fees.** Transactions pay fees to prioritize inclusion and reward block
  producers. Public transactions carry an explicit fee; private transactions
  carry fees within their value accounting.
- **Relay and storage incentives.** Mixnet relays and file/streaming storage
  providers can be paid through the marketplace tie-in — funding the bandwidth
  and capacity that make the anonymous services usable, while keeping the relays
  content-blind.

> A note on figures: the technical whitepaper describes the token economics
> *qualitatively* and explicitly defers exact numbers (total supply, precise
> reward schedule, fee splits, prices) to separate design documents. In keeping
> with this companion's zero-misinformation rule, no specific token figures are
> invented or quoted here beyond what the technical paper itself states — namely
> the approximately-equal three-way reward split and the slashable-staking model
> above.

---

## 11. Security and the Path to Mainnet

PYRAX maintains a threat model for each phase of development. Here are the main
attacks the technical paper considers and how PYRAX defends against each, in
plain terms:

| Threat | Defense |
|--------|---------|
| **Taking over consensus (51% attack)** | Three uncorrelated mining/staking resources; GhostDAG colors hidden branches red; stake-based finality makes reversing finalized blocks a slashable offense. |
| **Validators voting two ways at once** | Slashing of double-signers; cryptographically hardened, validated aggregate votes. |
| **Spending a private note twice** | A global list of "spent" markers; any repeat is rejected. |
| **Forging private value out of thin air** | No-trusted-setup proofs; a binding signature ties each proof to its declared value; circuit and cryptography audits before mainnet. |
| **De-anonymizing users via on-chain analysis** | Private-by-default transactions reveal no sender, receiver, or amount, and look uniform. |
| **De-anonymizing users via internet-level spying** | The onion mixnet: fixed-size packets, content-blind relays, cover traffic and padding. |
| **Flooding or isolating the network (spam / eclipse / Sybil)** | Bootstrapless multi-source discovery, gossip scoring, connection caps, ban scoring, replay protection. |
| **Malicious compute-market workers** | Sandboxed execution; a verifiable-compute strategy (redundancy, fraud proofs, or zero-knowledge proofs). |
| **Signature-tampering tricks** | A specific canonicalization rule (secp256k1 "low-s" enforcement) ensures one authorization has exactly one valid encoding — already implemented and tested. |

### 11.1 The audit-gated road to mainnet — PYRAX's honesty commitment

This is one of the most important sections to take at face value. The path to the
live "mainnet" network is **explicitly gated on outside review.** The final phase
mandates, before any mainnet launch:

- Fuzzing (automated stress-testing) of consensus, the DAG, the codec, and the
  circuits;
- **Dedicated cryptography and circuit audits** by outside experts;
- External review of **both** the consensus design **and** the privacy design;
- An **incentivized public testnet** (a real, paid test of the live system);
- A **bug bounty** program;
- …and **only then** mainnet launch.

The paper states plainly: **no shielded privacy circuit ships to mainnet
unaudited**, and the GhostDAG parameters and finality rules receive external
review before launch. In other words, the privacy guarantees stay test-grade
until independent experts have verified them. PYRAX does not ask you to take its
privacy claims on faith ahead of that audit.

---

## 12. Governance and Licensing

### 12.1 Open protocol, proprietary apps — and why

PYRAX uses an **"open-core"** model:

- The **protocol is open and verifiable** — the node, consensus, zero-knowledge
  circuits, command-line tools, developer kit, and smart-contract interfaces are
  licensed under **Apache-2.0** (a permissive open-source license), with a
  license marker on the first line of every source file.
- The **apps, wallet, the AI product (NEURAX), and hosted services are
  proprietary.**

The reasoning is laid out clearly and is worth understanding:

- **A decentralized network's rules *must* be public.** For the network to be
  trustless, node operators have to be able to read and verify the consensus
  rules, the privacy circuits, and the transaction format. A chain with secret
  rules can't be trusted — which is exactly why Bitcoin, Ethereum, and Zcash are
  all open-source.
- **A restrictive code license wouldn't protect a blockchain anyway.** *Any*
  chain can be copied ("forked") regardless of its license — Bitcoin and Ethereum
  have been forked many times, and the originals kept their dominance through
  network effects, not licensing.
- **So the real, defensible moat is elsewhere:** the **brand** (PYRAX™, protected
  by trademark), the **network and its effects**, the **wallet and app
  experience**, and the **off-chain services** — *not* secrecy of the protocol
  source.
- Apache-2.0 also includes an explicit **patent grant**, signaling that PYRAX
  won't use patents against its own users or integrators.

This split is designed to **maximize both protection** (of what is actually
defensible) **and trust** (of the chain itself).

### 12.2 The 100%-decentralization stance

Governance follows the same principle as the license: **no project-run
infrastructure on the critical path.** Discovery is bootstrapless; relays are
content-blind; the seed list is a signed community file, not a server; and even
the block explorer is required to respect privacy and not de-anonymize shielded
activity. The whole architecture is built so the network can run, and users can
join, **without trusting or depending on any single operator — including the
PYRAX project itself.**

---

## 13. Where We Are, and What's Next

PYRAX is being built as a thin vertical slice first and then widened — but the
DAG, privacy, and decentralization are designed in from the very beginning, not
bolted on later.

**Phase 0 is complete.** The cryptographic suite, the DAG-aware and privacy-aware
data types, the deterministic codec with a protocol-buffer bridge, and telemetry
are all implemented, tested, and passing continuous integration. The open
protocol/node/SDK is licensed under Apache-2.0; the apps and services are
proprietary. Concretely, the technical paper states that the following are **real,
tested code today**: the shielded transaction types, the multi-parent GhostDAG
block, the BLS aggregate-voting primitives (with the rogue-key defense), and the
note-commitment / nullifier / encryption privacy primitives.

Everything beyond that is planned or in active research. Here is the roadmap
exactly as the technical paper presents it:

| Phase | Title | Status |
|------:|-------|:------:|
| 0 | Foundations, tooling, DAG + privacy-aware types | **Complete** |
| 1 | L1 devnet — single-node GhostDAG slice | Planned |
| 2 | Bootstrapless P2P mesh & multi-node | Planned |
| 3 | GhostDAG ordering + TriStream + PoS finality | Planned (research) |
| 4 | Shielded-by-default ZK privacy | Planned (research) |
| 5 | Mixnet / onion routing (metadata privacy) | Planned (research) |
| 6 | Wallet (shielded + transparent; extension/mobile/desktop) | Planned |
| 7 | Electron node & mining app | Planned |
| 8 | Anonymous file transfer + media streaming | Planned (research) |
| 9 | AI inference & compute pool | Planned (research) |
| 10 | L2 EVM/WASM/Cairo | Planned |
| 11 | L3 ZK rollup | Planned |
| 12 | Explorer, faucet, SDK, CLI | Planned |
| 13 | Security, audits, testnet → mainnet | Planned |

Each milestone is concrete and testable. For example: Phase 1 ends with a node
producing a queryable web-of-blocks; Phase 2 with a 3-node network that assembles
itself with no starter server; Phase 3 with real GhostDAG, three-stream mining,
and finalized rewards; Phase 4 with a private transfer that hides
sender/receiver/amount and rejects double-spends; Phase 5 with transactions
flowing over the mixnet that an observer can't correlate; Phase 8 with an
encrypted file and a live media stream that an ISP sees only as uniform encrypted
traffic; and Phase 13 with audited circuits and an incentivized testnet feeding
into the mainnet launch.

---

## Closing — What PYRAX Is, and What It Honestly Isn't

**What PYRAX is:** an ambitious, from-scratch network designed so that high
throughput, default privacy, full decentralization, and resistance to
internet-level surveillance are built into its lowest level — not added as
afterthoughts. It replaces the single-chain model with a web of blocks ordered by
GhostDAG, secures itself with three independent mining/staking streams plus
financial finality, makes every transfer private by default using no-trusted-
setup zero-knowledge proofs, routes traffic through an onion mixnet so even your
ISP is blind, scales through multi-environment L2 and a recursive L3 rollup, and
turns idle mining hardware into a verifiable compute marketplace. Its core
protocol is open-source so anyone can verify the rules.

**What PYRAX honestly isn't (yet):** finished. The foundations are complete,
tested, and live, but most of the system is planned or in research. The privacy
guarantees remain test-grade until independent cryptography and circuit audits
clear them, and **no privacy circuit ships to mainnet unaudited.** Performance
claims are only published alongside reproducible benchmarks. Exact economic
parameters are deferred to dedicated design documents and to external review.

That combination — a bold technical vision paired with disciplined honesty about
what is proven versus what is still being built — is the heart of how PYRAX
presents itself. This companion has aimed to convey both faithfully.

---

*PYRAX™ — high-throughput, private-by-default, fully decentralized, and
ISP-resistant. This plain-English companion describes the protocol as designed
and as being implemented. Consensus parameters, circuit details, and economic
constants are finalized in their respective per-phase design documents and are
subject to external review before mainnet.*
