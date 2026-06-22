<!-- SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary -->
# PYRAX Network — Technical Whitepaper

**Version 3.0 · 2026-06-08**
**License: Open-core — Apache-2.0 (protocol/node/SDK) · proprietary apps & services**

---

## Abstract

PYRAX is a from-scratch, Rust-implemented Layer-1 protocol designed around four
properties that most networks treat as add-ons but PYRAX treats as
non-negotiable invariants baked into its lowest-level types: **high throughput**,
**privacy by default**, **full decentralization**, and **resistance to
network-level (ISP) surveillance and censorship**. Consensus is not a linear
chain but a **blockDAG** ordered by **GhostDAG** (k-cluster blue-set selection),
fed by a **TriStream** mining model (two independent proof-of-work families plus
proof-of-stake) and finalized by **BLS-aggregated proof-of-stake BFT**. Every
transfer is **shielded by default** using an Orchard-style note-commitment /
nullifier model with zk-SNARKs that require **no trusted setup**; transparent
transfers exist only as an explicit special case. The peer-to-peer layer is
**bootstrapless** — there is no project-operated boot node — and node traffic
(plus first-class anonymous file-transfer and media streaming services) rides an
**onion-routed mixnet** so that an on-path observer sees only uniform, padded,
encrypted flows. Execution scales outward through a multi-VM L2 (EVM, WASM,
Cairo) and a recursive ZK-rollup L3, and idle Stream-B compute capacity feeds a
verifiable GPU/CPU job market. The protocol — node, consensus, ZK circuits, and
SDK — is released under **Apache-2.0** so anyone can run and independently verify
it; the wallet, apps, and hosted services are proprietary. This document specifies the architecture as
it is actually designed and partially implemented; it is consistent with the
PYRAX single source of truth and the Phase-0 foundation crates.

---

## 1. Design Goals

PYRAX is governed by five north-star properties that are enforced across every
layer rather than negotiated per feature.

| # | Property | What it means concretely |
|---|----------|--------------------------|
| 1 | **DAG, not a chain** | Consensus is a multi-parent blockDAG ordered by GhostDAG. Blocks reference many tips at once, so honest parallel work is *included*, not orphaned — yielding high throughput and fast confirmations. |
| 2 | **Privacy everywhere (shielded by default)** | The default transaction hides sender, receiver, and amount via zk-SNARKs over note commitments and nullifiers (no trusted setup). Transparent transactions are the explicit exception, not the rule. |
| 3 | **100% decentralized, no boot node** | Peer discovery is bootstrapless: mDNS, Kademlia DHT random-walk, peer exchange, a signed community-maintained seed list, and DHT rendezvous. No project-run server sits on the critical path to joining. |
| 4 | **Metadata privacy / ISP-resistance** | Node traffic and the file/media streaming services ride an onion-routed mixnet with cover traffic and padding, so an ISP cannot learn *what* is transferred or *who* is communicating. |
| 5 | **Open & verifiable** | The protocol — node, consensus, ZK circuits, CLI, SDK — is Apache-2.0, so anyone can run and verify the validity rules (a chain with secret rules is not trustless). Apps, wallet, and services are proprietary; the PYRAX™ mark is protected by trademark. |

These are design *constraints*, not aspirations. The Phase-0 foundation crates
(`pyrax-crypto`, `pyrax-primitives`, `pyrax-codec`) already encode DAG-aware and
privacy-aware types so that every later layer is built against them from day one.

---

## 2. Architecture Overview

PYRAX is layered. L1 is the GhostDAG blockDAG with shielded-by-default state; L2
provides multiple execution environments anchored to L1; L3 is a recursive
ZK-rollup that settles to L1. Two cross-cutting transports — a bootstrapless
libp2p mesh and an onion-routed mixnet over it — carry all traffic, and the
application tier (wallets, the node/miner app, anonymous file drop, media streaming) sits on
top.

```
   Apps:  Wallet (shielded+transparent · ext/mobile/desktop)  ·  Node+Miner+AI app (Electron)
          Anonymous File Drop  ·  media streaming  ────────────────────────┐
   ┌──────────────────────────────────────────────────────────────────────┴──┐
   │ L3 — ZK Rollup (plonky2/halo2; recursive validity proofs)   settle ↓       │
   ├───────────────────────────────────────────────────────────────────────────┤
   │ L2 — EVM (revm) · WASM (wasmtime) · Cairo                   anchor ↓        │
   ├───────────────────────────────────────────────────────────────────────────┤
   │ L1 — PYRAX GhostDAG blockDAG (Rust, from scratch)                          │
   │   • Shielded-by-default tx (note commitments + nullifiers + zk proofs)     │
   │   • GhostDAG ordering (blue set / k-cluster) over a multi-parent blockDAG  │
   │   • TriStream mining → A: BLAKE3+SHA-256 · B: KAWPOW+RandomX ↔ AI · C: PoS │
   │   • Stream-C PoS BFT finality over the DAG (BLS aggregate attestations)    │
   └───────────────────────────────────────────────────────────────────────────┘
      ▲  Onion-routed MIXNET (cover traffic, ISP-resistant) over the P2P mesh   ▲
      ▲  Bootstrapless libp2p (mDNS · Kademlia DHT · peer-exchange · seed list) ▲
```

The implementation is organized as a Cargo workspace of single-responsibility
crates. The subsystems referenced throughout this paper map to crates as follows.

| Crate | Role |
|-------|------|
| `pyrax-crypto` | Hashes (BLAKE3/SHA-256/Keccak-256), secp256k1/Ed25519/BLS12-381, AEAD, and ZK-privacy primitives (commitments, nullifiers, note encryption). |
| `pyrax-primitives` | Multi-parent GhostDAG block types + shielded and transparent transaction types. |
| `pyrax-codec` / `pyrax-proto` | Canonical deterministic codec + protobuf wire bridge. |
| `pyrax-dag` | GhostDAG: DAG store, blue-set/k-cluster, tip selection, blue work, DAA score. |
| `pyrax-zk` | Proving system (Halo2/Plonky2): circuit registry, prover/verifier, recursion. |
| `pyrax-privacy` | Shielded pool: note-commitment tree, nullifier set, viewing keys, note encryption. |
| `pyrax-mixnet` | Onion routing (Sphinx-style), relays, cover traffic. |
| `pyrax-stream` | E2E file transfer + media streaming: chunking, content addressing, sessions. |
| `pyrax-consensus` (+ streams) | TriStream + GhostDAG orchestration + PoS finality. |
| `pyrax-p2p` | Bootstrapless libp2p mesh + GhostDAG gossip. |
| `pyrax-storage` / `-state` / `-mempool` | Storage, state transition, transaction pool. |
| `pyrax-vm-*` / `pyrax-rollup` / `pyrax-job-market` | L2 / L3 / compute market. |

---

## 2A. Performance & Scalability — ≥ 500,000 TPS

PYRAX targets **≥ 500,000 sustained transactions per second**, exceeding any
chain in production today. This is an explicit, measured engineering mandate, not
a marketing figure: it is pursued as a **network-wide aggregate** with a high
**L1 floor**, and **no throughput number is published without a reproducible
benchmark** (`pyrax-bench`) that states the workload and the exact hardware and
bandwidth assumptions.

**The headline metric** is simple value transfers (as chains conventionally quote
TPS); contract-call TPS and shielded TPS are measured and reported separately, so
every figure is honest and comparable.

**The scaling stack.** No single trick reaches 500k; PYRAX composes several:

| Lever | Mechanism |
|-------|-----------|
| **DAG parallelism** | GhostDAG accepts many blocks concurrently — there is no single-leader bottleneck, and the confirmable block rate rises with network capacity. |
| **Parallel execution** | non-conflicting transactions execute concurrently (optimistic, Block-STM-style), with deterministic re-execution on conflict, so execution scales with cores. |
| **L2 / L3 rollups** | the majority of throughput lives in rollups; the L3 **recursive ZK rollup** batches enormous transaction counts and settles a single succinct proof to L1. |
| **Recursive proof aggregation** | thousands of shielded-transaction proofs fold into **one** recursive proof, so a validator performs ≈ one verification per batch. This is the key that lets *private-by-default* transactions scale — private throughput is otherwise bottlenecked by per-transaction proof verification. |
| **Data-availability sampling** | light and mobile clients verify that block data is *available* (and the chain reconstructable) by randomly sampling a few erasure-coded shares, instead of downloading and replaying everything. |
| **Hardware-accelerated proving** | GPU (and later ASIC) provers generate shielded and rollup proofs; this ties naturally into the idle GPU capacity of Stream-B miners. |
| **Fast networking** | compact block/DAG relay, erasure-coded propagation, transaction batching, and QUIC keep propagation ahead of execution. |

**Privacy at scale.** Because verifying one zk-proof per shielded transfer would
cap throughput, recursive aggregation is treated as a first-class consensus
mechanism rather than an optimization: it is what reconciles *shielded by
default* with the 500k-TPS target.

**Decentralization at scale.** High aggregate TPS does not require every
participant to process every transaction. PYRAX defines explicit **node-class
profiles** — archival, full, light, mobile — where full validators may be
prosumer-grade while light and mobile clients rely on data-availability sampling
and succinct proofs. Combined with most throughput living in L2, this preserves
permissionless, consumer-grade participation; the 500k target never silently
trades away decentralization.

**Honest framing & roadmap.** 500k sustained is beyond every production network
today; it is an aggregate goal realized progressively — a single-node baseline
(Phase 1), an L1 DAG floor with parallel execution (Phase 3), batched shielded
verification (Phase 4), and the L2/L3 rollup aggregate (Phase 11) — each gated by
reproducible `pyrax-bench` numbers.

---

## 3. Consensus: GhostDAG blockDAG, TriStream Mining, and PoS Finality

### 3.1 Why a blockDAG

A linear chain forces every block to choose a single parent, so blocks produced
concurrently by honest miners become orphans — wasted work that also lowers the
effective honest hashpower and therefore weakens security. PYRAX instead uses a
**blockDAG**: a block may reference *many* current tips as parents. Concurrent
honest blocks are all absorbed into the DAG, raising throughput and shortening
the time to a confident ordering. The cost is that "which block came first" is no
longer given by structure; it must be *computed*. That computation is GhostDAG.

### 3.2 The DAG block

The on-wire/canonical DAG block (in `pyrax-primitives::dag`) carries the fields
GhostDAG needs:

```
DagBlockHeader {
    parents: Vec<Hash>      // many parents; parents[0] is the SELECTED PARENT
    blue_score: u64         // size of the ordered blue set up to this block
    blue_work: u128         // accumulated blue work (cross-branch fork choice)
    daa_score: u64          // difficulty-adjustment-algorithm score
    state_root: Hash        // accounts + note tree + nullifier set
    transactions_root: Hash
    receipts_root: Hash
    timestamp: Timestamp
    stream: Stream          // A | B | C — which TriStream mined it
    seal: Vec<u8>           // opaque PoW/PoS seal for the producing stream
}
```

A full `DagBlock` is this header plus a vector of transaction envelopes (`Tx`),
each of which is `Shielded` by default or `Transparent` as the special case. The
block hash is BLAKE3 over the deterministic canonical encoding of the header, so
every node derives an identical hash from identical fields, and any change to the
parent set or any field changes the hash.

### 3.3 GhostDAG ordering: blue set, k-cluster, selected-parent chain

GhostDAG (the practical realization of the PHANTOM protocol) produces a total
order over the DAG that honest, well-connected miners agree on quickly, while
isolating blocks that withhold or build in secret.

- **Selected parent.** Among a block's parents, one — `parents[0]` — is the
  *selected parent*: the parent whose past has the highest blue work. Following
  selected parents from any block back to genesis gives the **selected-parent
  chain**, GhostDAG's analogue of a "main chain."
- **Blue set / k-cluster.** A block is *blue* if adding it keeps the set of blue
  blocks a **k-cluster**: every blue block has at most `k` blue blocks in its
  "anticone" (blocks neither in its past nor its future). Intuitively, honest
  blocks produced within roughly one network-propagation delay of each other are
  mutually visible and stay blue; a block secretly mined off to the side has a
  large anticone of honest blue blocks and is colored **red**.
- **Blue score and blue work.** A block's `blue_score` is the number of blue
  blocks in its past (set size); its `blue_work` accumulates the difficulty of
  those blue blocks. Blue work is the fork-choice weight: the heaviest-blue-work
  tip wins.
- **Mergeset ordering.** When a new block merges several tips, GhostDAG orders
  the *mergeset* (the blocks newly included relative to the selected parent)
  deterministically — blue blocks ahead of red, ties broken by hash — producing
  the canonical execution order in which `transactions_root` is computed.

```
            ┌──► B ─┐
   genesis ─┤        ├──► E ──► F ──►  (selected-parent chain: heaviest blue work)
            └──► C ─┘        ▲
                  └──► D ─────┘   D's parents = {C, ...}; D may be blue if its
                                  anticone of blue blocks ≤ k, else red.
```

The `k` parameter, retarget rules, and exact mergeset tie-breaks are fixed in the
Phase-3 design document and subjected to external review before mainnet; the
*types* (`blue_score`, `blue_work`, `daa_score`, selected parent) are already
frozen in the foundations.

### 3.4 TriStream mining

Blocks enter the DAG from three independent **streams**, each with its own
sealing rule but all producing the same `DagBlock` shape and all ordered by the
same GhostDAG logic. The producing stream is recorded in the header's `stream`
field (`Stream::A | B | C`).

| Stream | Mechanism | Hardware class | Notes |
|--------|-----------|----------------|-------|
| **A** | Dual-algorithm PoW: **BLAKE3 + SHA-256** | ASIC / specialized | SHA-256 is also used inside Stream-A verification; high raw throughput. |
| **B** | Dual-algorithm PoW: **KAWPOW (GPU) + RandomX (CPU)** | Commodity GPU/CPU | Memory-hard, ASIC-resistant; **AI-compute hook** ties idle capacity to the job market. |
| **C** | **Proof-of-Stake** | Validators (staked) | Also runs the BFT finality gadget (§3.5). |

Three streams with *different* hardware bases is a deliberate security choice
(§3.6). Block rewards are split across the three streams (a roughly equal split
is the design baseline; the precise schedule is set in the consensus design doc),
so no single stream dominates issuance.

Stream B is special: KAWPOW and RandomX target exactly the GPUs and CPUs that the
PYRAX compute market (§9) wants for inference and general jobs. The same worker
machine can mine when idle and serve verifiable compute when demand exists,
through a shared hook between `stream-b-pow` and `pyrax-job-market`.

### 3.5 BLS-aggregated PoS BFT finality

PoW gives *probabilistic* ordering; PYRAX adds *deterministic finality* via
Stream C. Validators stake (design baseline: a minimum stake with a multi-day
unbonding period and slashing for equivocation) and vote on
GhostDAG-ordered blocks. Votes are **BLS12-381 signatures** (min-pubkey variant:
48-byte G1 public keys, 96-byte G2 signatures), which **aggregate**: the votes of
hundreds of validators compress to a single signature verifiable against the
aggregate of their public keys.

The crypto layer already implements exactly this. `pyrax-crypto::bls` provides
`sign`, `aggregate`, `verify_aggregate` (using `fast_aggregate_verify`), and —
critically — `verify_pop` for **proofs of possession**. Each validator must
register a POP (a signature over its own public key under a distinct
domain-separation tag); `verify_aggregate` additionally subgroup- and
infinity-validates every key. Together these defeat the rogue-key attack, in
which an attacker would otherwise register `pk_rogue = pk_attacker − pk_honest`
to forge an aggregate attributed to an honest validator. A block is **final**
once aggregate attestations representing more than two-thirds of staked weight
cover it; finalized blocks cannot be reverted without slashing a supermajority of
stake.

```
validators ──sign(block)──► [σ₁ σ₂ … σₙ]  ──aggregate──►  σ_agg (96 bytes)
   pks ─────────────────────────────────────────────────►  verify_aggregate(pks, block, σ_agg)
   (each pk POP-checked + subgroup-validated at registration)
```

### 3.6 51%-resistance via stream diversity + DAG structure

A classic 51% attack assumes one resource (one hash function's hashpower) an
attacker can amass. PYRAX makes that assumption false in two ways:

1. **Stream diversity.** To rewrite history an attacker would need a majority of
   Stream-A ASIC hashpower *and* a majority of Stream-B GPU+CPU hashpower *and* a
   staked supermajority in Stream C — three uncorrelated resources with different
   supply chains and economics. Dominating one buys little: the other streams and
   the finality gadget still order and finalize the honest DAG.
2. **DAG structure.** Because honest concurrent work is *merged* rather than
   orphaned, the honest blue set grows at the full honest production rate. A
   secretly built attacker branch accrues a large anticone against the honest
   blue set, is colored red by GhostDAG, and loses on blue work. Withholding does
   not help; publishing late does not help.

Finality (§3.5) closes the loop: even a transient ordering disagreement is
resolved deterministically once two-thirds of stake attests, and reverting a
finalized block is an explicitly slashable offense.

---

## 4. Privacy: Shielded by Default

### 4.1 The default is private

PYRAX's default transaction is **shielded**. The block-level transaction
envelope `Tx` is `Shielded(ShieldedTransaction)` by default and
`Transparent(Transaction)` only when explicitly chosen. This is enforced at the
type level — blocks carry `Tx`, not the bare transparent type — so privacy is the
path of least resistance rather than an opt-in users forget.

### 4.2 The Orchard-style note model

Shielded state is not an account balance; it is a set of **notes**. A note
represents some value owned by a recipient. The global shielded state is two
structures:

- a growing **note-commitment Merkle tree**, into which the commitment of every
  created note is appended; its root at any point is an **anchor**; and
- a **nullifier set**, the set of nullifiers of all notes that have been spent.

Creating a note appends its commitment to the tree. Spending a note reveals its
nullifier (added to the set) but *not* which commitment it corresponds to.

The on-wire shielded transaction (`pyrax-primitives::shielded::ShieldedTransaction`)
reveals only this:

```
ShieldedTransaction {
    chain_id: ChainId          // replay protection
    anchor: Hash               // note-tree root the spend proofs are anchored to
    nullifiers: Vec<Hash>      // nullifiers of spent notes (double-spend guard)
    commitments: Vec<Hash>     // commitments of newly created output notes
    value_balance: i128        // net transparent value in/out of the shielded pool
    ciphertexts: Vec<Vec<u8>>  // encrypted note plaintexts, one per output
    proof: Vec<u8>             // the zk-SNARK proof
    binding_sig: Signature     // binds the proof to value_balance
}
```

Notice what is *absent*: no sender, no receiver, no per-note amounts. For a fully
shielded transfer, `value_balance` is `0`.

### 4.3 Commitments, nullifiers, viewing keys, note encryption

The transparent (out-of-circuit) primitives that wallets and nodes use are
implemented today in `pyrax-crypto::privacy`:

- **Note commitment** — `note_commitment(note_fields, blinding)` is **hiding**
  (without the blinding factor it reveals nothing about the note) and **binding**
  (the committer cannot later open it to different fields). The included tests
  confirm both: the same fields with a different blinding produce a different
  commitment (hiding), and different fields with the same blinding produce a
  different commitment (binding).
- **Nullifier** — `nullifier(nullifier_key, commitment)` deterministically
  derives a note's nullifier from the owner's nullifier key and the note
  commitment. Revealed on spend, its uniqueness (enforced by the nullifier set)
  prevents double-spends, while leaking nothing that links it back to the
  commitment without the nullifier key.
- **Note encryption** — `encrypt_note` / `decrypt_note` wrap ChaCha20-Poly1305
  AEAD under a shared key (e.g. an ECDH shared secret) with a domain-separated
  AAD and a fresh random nonce per note, so a recipient can detect and decrypt
  notes addressed to them on-chain.
- **Viewing keys** — `pyrax-privacy` (Phase 4) provides viewing keys that let a
  recipient (or an auditor the recipient authorizes) scan and decrypt their
  incoming notes *without* the ability to spend, separating "see" from "spend."

The in-circuit commitments and nullifiers use a SNARK-friendly hash (e.g.
Poseidon); the out-of-circuit primitives above use BLAKE3 and are the matching
scanning/building functions. The two are kept consistent by the Phase-4 circuit
design.

### 4.4 The shielded transfer zk-SNARK

A shielded transfer must convince the network it is valid *without revealing its
contents*. The spend/output circuit proves, in zero knowledge:

1. **Membership.** Each spent note's commitment is in the note-commitment tree at
   the stated `anchor` (a Merkle-path proof against the anchor).
2. **Nullifier correctness.** Each revealed nullifier is the correct derivation
   for the corresponding spent note (binding spend authority), and — checked
   outside the proof against the nullifier set — has never appeared before.
3. **Value balance.** Input value equals output value plus `value_balance`
   (conservation of value), with all shielded amounts hidden.
4. **Output well-formedness.** Each new output commitment correctly commits to a
   well-formed note (valid value range, correct recipient binding).

Proofs are produced and verified by `pyrax-zk` using **Halo2 or Plonky2** —
chosen specifically because **neither requires a trusted setup**, eliminating the
toxic-waste ceremony risk of older SNARKs and providing a clean path to the
recursive aggregation the L3 rollup needs. The `proof` field carries the
serialized proof; the `binding_sig` ties it to the declared `value_balance` so a
proof cannot be replayed with a different transparent value.

Verification a node performs per shielded transaction:

```
verify_proof(proof, public_inputs = {anchor, nullifiers, commitments, value_balance})
   ∧  ∀ nf ∈ nullifiers:  nf ∉ nullifier_set        // no double-spend
   ∧  anchor ∈ recent_anchors                        // valid tree state
   ∧  verify_binding_sig(binding_sig, value_balance) // value bound to proof
```

### 4.5 Transparent transfers, shielding and deshielding

Transparent transfers are the explicit special case: the familiar
account/UTXO-style `Transaction` (signed with recoverable secp256k1; sender
recoverable from the signature) carried as `Tx::Transparent`. The boundary
between worlds is the `value_balance` field:

- **Shield** — move transparent value *into* the shielded pool: `value_balance`
  is positive (transparent value consumed), and the proof creates output notes of
  equal value.
- **Deshield** — move shielded value *out*: `value_balance` is negative
  (transparent value produced), and the proof spends notes of equal value.

A purely shielded transfer has `value_balance = 0` and is indistinguishable from
any other shielded transfer in the clear. Double-spends are impossible to commit
twice: a node rejects any transaction whose nullifier is already in the set.

---

## 5. Networking: Bootstrapless Decentralization

A network that depends on a project-operated boot node is not fully
decentralized — that node is a single point of censorship, failure, and
deanonymization. PYRAX's `pyrax-p2p` (built on libp2p with Noise + Yamux over
QUIC/TCP/WebRTC) is **bootstrapless**: a new node can join using only mechanisms
that no single party controls.

| Mechanism | Role |
|-----------|------|
| **mDNS** | Zero-config discovery of peers on the same LAN. |
| **Kademlia DHT random-walk** | Crawl the global DHT to discover peers without a fixed entry point. |
| **Peer exchange (PEX)** | Peers gossip the peers they know, so connectivity spreads epidemically. |
| **Signed community seed list** | A community-maintained, cryptographically *signed* list of candidate addresses — a data artifact anyone can host or mirror, not a server PYRAX operates. |
| **DHT rendezvous** | Nodes register under a well-known rendezvous key in the DHT and find each other there. |

There is no privileged "discovery node": Discovery vs. Operator behavior is a
**config flag**, not infrastructure. Combined, these let a 3-node devnet
self-assemble with no boot node — a tx submitted on node A appears on B and C.

### 5.1 GhostDAG gossip and DAG sync

Blocks and (shielded) transactions propagate over **GossipSub v1.1** topics with
message validation and peer scoring to resist spam and eclipse attempts. Because
the ledger is a DAG, sync is not "download blocks N…M" but **tip exchange +
mergeset download**: a joining or lagging node exchanges its known tips with
peers and pulls the missing ancestors (the mergeset) needed to extend its DAG and
recompute the GhostDAG ordering. Peer management — connection caps, ban scoring,
backoff — guards against resource exhaustion and misbehavior.

---

## 6. Metadata Privacy and ISP-Resistance: the Mixnet

Shielding hides *what* a transaction says; it does not hide *who is talking to
whom at the IP layer*. An ISP can still see that a given IP connects to PYRAX
peers, when, and how much it sends — traffic analysis that can deanonymize users
even when payloads are encrypted. PYRAX closes this gap with an **onion-routed
mixnet** (`pyrax-mixnet`) that sits as a transport *under* `pyrax-p2p`.

- **Sphinx-style packets.** Messages are wrapped in fixed-size, layered-encrypted
  onion packets. Each relay can decrypt exactly one layer — learning only the
  next hop, never the source, the final destination, or the contents — and every
  packet is the same size regardless of payload, defeating length-based
  correlation.
- **Circuits and relays.** A sender selects a path of relays over the DHT and
  builds a circuit; each hop peels one layer and forwards. Relays are
  **content-blind** by construction — they cannot see plaintext — and replay
  protection prevents a captured packet from being re-injected.
- **Cover traffic and padding.** Nodes emit decoy traffic and pad real traffic to
  uniform shape and timing, so an observer cannot distinguish "sending a
  transaction" from "sending nothing," nor correlate timing across hops.

The policy is configurable (always-on or opt-in), with a clear, explicit UX
warning on any fallback to direct connections when the mixnet is unavailable. The
goal, validated in Phase 5, is that an on-path observer — including an ISP —
cannot link sender to receiver.

```
sender ─[onion: Eₐ(E_b(E_c(msg)))]─► relay A ─[E_b(E_c(msg))]─► relay B ─[E_c(msg)]─► relay C ─► dest
        each relay learns only its immediate next hop; packets are fixed-size + padded;
        cover traffic makes "talking" indistinguishable from "silent"
```

---

## 7. Anonymous Services: E2E File Transfer and Media Streaming

PYRAX ships two first-class services that exploit the mixnet so that an ISP sees
only uniform encrypted flows, regardless of whether you are sending a document or
watching a live stream. Both live in `pyrax-stream`.

### 7.1 Content-addressed, end-to-end-encrypted file transfer

Files are split into chunks; each chunk is content-addressed by its **BLAKE3**
hash, and the chunks form a **chunk DAG** referenced by a content-addressed
manifest. Content is **end-to-end encrypted** with per-chunk keys gated by
capability tokens, so possession of the manifest hash does not grant read access
— only a holder of the capability can decrypt. Availability is advertised via the
DHT, transfers are resumable, and all bytes travel over the mixnet. Because
relays are content-blind and packets are uniform, an ISP cannot tell a file
transfer from any other PYRAX traffic, nor recover the plaintext.

### 7.2 Decentralized media streaming

Live media streams are segmented into short, encrypted segments published and subscribed
through a swarm — a decentralized CDN with no origin server to block. Segment
distribution is tuned for low-latency playback, and, like file transfer, every
segment rides the mixnet. An ISP observing a viewer sees the same padded,
uniform, encrypted flow it would see for any other activity: it cannot tell that
a stream is being watched, which stream, or from whom.

### 7.3 Anti-abuse

Because relays cannot see plaintext, abuse is mitigated *without* breaking
privacy: rate limits, optional capability-based allow/deny, and the per-chunk
capability model let operators bound resource use while remaining unable to
inspect or selectively censor content. Optional paid-relay and paid-storage tie-ins
to the job market (§9) provide an incentive for capacity.

---

## 8. Execution Layers: L2 and L3

L1 is deliberately lean — DAG consensus and shielded value transfer. Rich
programmability and horizontal scale live above it.

### 8.1 L2 — multi-VM execution

PYRAX L2 offers three execution environments, each anchored to L1, so developers
can bring existing tooling:

| VM | Engine | Audience |
|----|--------|----------|
| **EVM** | `revm` | Solidity/Vyper contracts and the existing Ethereum tooling ecosystem. |
| **WASM** | `wasmtime` | Sandboxed general-purpose contracts in any WASM-targeting language. |
| **Cairo** | Cairo / StarkNet path | Provable computation native to a STARK-friendly model. |

An L1↔L2 bridge anchors L2 state to the L1 DAG. **System contracts**
(`pyrax-contracts`) implement protocol-level functions on the multi-VM L2 — the
native token, staking, the bridge, the ZK verifier, and AI-compute job escrow —
in Solidity/Vyper (Foundry) and Cairo (Scarb).

### 8.2 L3 — recursive ZK rollup

`pyrax-rollup` is a validity (ZK) rollup. A sequencer batches L3 transactions; a
prover generates a validity proof for the batch; and — the defining feature —
proofs are **recursively aggregated**, so many batch proofs compress into a single
succinct proof that an on-L1 verifier checks before settlement. The rollup
**reuses `pyrax-zk`**, the same no-trusted-setup proving stack (Halo2/Plonky2)
that powers shielded transactions, so PYRAX maintains one proving toolchain
across privacy and scaling. The result: L3 throughput far beyond L1, with L1
security inherited via the settled validity proof.

```
L3 txs ─► sequencer ─► batch proofs π₁…πₖ ─► recursive aggregation ─► Π ─► L1 verifier ─► settle
                         (each proves a batch valid)         (one succinct proof)
```

---

## 9. AI / Compute Market

PYRAX turns the hardware already mining Stream B into a **verifiable compute
market** (`pyrax-job-market`). Stream B's KAWPOW/RandomX miners are GPUs and CPUs
that sit idle between blocks; the job market lets them serve paid inference and
general compute jobs, with a hook that switches a worker between mining and
serving based on demand.

The hard problem is *trust*: a buyer paying for off-chain compute must know the
result is correct. PYRAX's design space (finalized in Phase 9) includes redundant
execution (compare results across independent workers), fraud proofs (challenge
an incorrect result), and ZK-ML (prove correct execution in zero knowledge).
Jobs are escrowed on-chain via a system contract, executed in **sandboxed
workers** (containerized, network- and resource-restricted), verified, and
settled — submit an inference job, a sandboxed worker runs it, the result is
verified, and the worker is paid on-chain.

---

## 10. Token and Incentives

PYRAX's incentive design (qualitative here; exact parameters are fixed in the
consensus and economics design documents) aligns the actors that keep the network
secure, private, and available.

- **Emission split across three streams.** Block rewards are divided across
  Stream A, Stream B, and Stream C (an approximately equal three-way split is the
  design baseline), so issuance never concentrates in one hardware class or
  consensus mechanism and the diversity that underpins 51%-resistance is
  economically sustained.
- **Staking.** Stream-C validators bond stake (design baseline: a minimum stake
  with a multi-day unbonding delay) to participate in finality and earn the
  PoS share of rewards; equivocation and finality violations are **slashable**.
- **Fees.** Transactions pay fees (the transparent transaction carries an
  explicit gas price; shielded transactions carry fees within their value
  accounting), prioritizing inclusion and funding block producers.
- **Relay and storage incentives.** Mixnet relays and `pyrax-stream` storage
  providers can be compensated through the job-market tie-in, paying for the
  bandwidth and capacity that make the anonymous services usable while keeping
  relays content-blind.

---

## 11. Security and Threat Model

PYRAX maintains a per-phase threat model. The principal adversaries and the
defenses against them:

| Threat | Surface | Defense |
|--------|---------|---------|
| **Consensus takeover (51%)** | DAG ordering / fork choice | Three uncorrelated mining resources (ASIC PoW, GPU+CPU PoW, staked PoS); GhostDAG colors withheld branches red; BLS PoS finality makes reverting finalized blocks slashable (§3.6). |
| **Equivocation / nothing-at-stake** | Stream C validators | Slashing of double-signers; POP-protected, subgroup-validated BLS aggregate attestations (§3.5). |
| **Double-spend (shielded)** | Nullifier reuse | Global nullifier set; any repeated nullifier is rejected (§4.4). |
| **Forged shielded value** | zk proof soundness | No-trusted-setup SNARK (Halo2/Plonky2); binding signature ties the proof to `value_balance`; circuit + crypto audits before mainnet. |
| **Transaction-graph deanonymization** | On-chain analysis | Shielded-by-default notes/nullifiers reveal no sender/receiver/amount; uniform shielded transactions resist clustering (§4). |
| **Network-level deanonymization** | ISP / on-path observer | Onion mixnet: fixed-size Sphinx packets, content-blind relays, cover traffic + padding (§6). |
| **Eclipse / spam / Sybil** | P2P layer | Bootstrapless multi-source discovery, GossipSub scoring, connection caps, ban scoring, replay protection (§5). |
| **Malicious untrusted compute** | Job-market workers | Sandboxed (containerized, restricted) execution; verifiable-compute strategy (redundancy / fraud proofs / ZK-ML) (§9). |
| **Signature malleability** | Transparent tx canonicalization | secp256k1 low-s enforcement: high-s twins are rejected, keeping one authorization ⇒ one encoding (implemented and tested in `pyrax-crypto`). |

### 11.1 Audit and testnet → mainnet path

The road to mainnet is explicitly gated on review. Phase 13 mandates: fuzzing of
consensus, DAG, codec, and circuits; **dedicated cryptography and circuit
audits**; external review of both the consensus design and the privacy design; an
**incentivized public testnet**; a bug bounty; and only then mainnet genesis. No
shielded circuit ships to mainnet unaudited, and the GhostDAG parameters and
finality rules receive external review before launch.

---

## 12. Governance and Licensing

### 12.1 Open-core: an Apache-2.0 protocol, proprietary apps

The PYRAX **protocol is open and verifiable**: the node, consensus, ZK circuits,
CLI, SDK, and smart-contract interfaces are licensed under **Apache-2.0**, with an
SPDX identifier on the first line of every source file. A decentralized chain's
validity rules *must* be public — node operators have to be able to verify the
consensus rules, the shielded circuits, and the transaction format for the network
to be trustless; this is precisely *why* Bitcoin, Ethereum, and Zcash are
open-source and trusted. Apache-2.0 also carries an explicit **patent grant**,
protecting the ecosystem and signalling that PYRAX will not patent-troll its own
users or integrators.

The **apps, wallet, NEURAX, and hosted services are proprietary**
(`LicenseRef-PYRAX-Proprietary`). A blockchain cannot be meaningfully "protected"
by a restrictive code license — *any* chain can be forked regardless of license
(Bitcoin and Ethereum have been forked many times, and the originals retained
dominance through network effects, not licensing). PYRAX's real, defensible moat is
therefore the **brand (PYRAX™, protected by trademark)**, the **network and its
effects**, the **wallet/app UX**, and the **off-chain services** — not secrecy of
the protocol source. This open-core split maximizes both protection (of what is
actually defensible) and trust (of the chain itself).

### 12.2 100%-decentralization stance

Governance follows from the same principle as the license: **no project-run
infrastructure on the critical path.** Discovery is bootstrapless (§5); relays
are content-blind (§6); the seed list is a signed community artifact, not a
server; the explorer must respect privacy and not deanonymize shielded activity.
The architecture is built so that the network can run, and users can join,
without trusting or depending on any single operator — including the PYRAX
project itself.

---

## 13. Implementation Status and Roadmap

PYRAX is built as a thin vertical slice first, then widened — but DAG, privacy,
and decentralization are designed in from Phase 0, not bolted on. **Phase 0 is
complete:** the cryptographic suite, the DAG- and privacy-aware primitive types,
the deterministic canonical codec with a protobuf bridge, and telemetry are
implemented, tested, and CI-green, and the open protocol/node/SDK is licensed
under Apache-2.0 (the apps and services are proprietary). The shielded types, the multi-parent GhostDAG block, the
BLS aggregate primitives with proofs of possession, and the note
commitment/nullifier/encryption primitives discussed above are real, tested code
today.

| Phase | Title | Status |
|------:|-------|:------:|
| 0 | Foundations, tooling, DAG + privacy-aware types | **Complete** |
| 1 | L1 devnet — single-node GhostDAG slice | Planned |
| 2 | Bootstrapless P2P mesh & multi-node | Planned |
| 3 | GhostDAG ordering + TriStream + PoS finality | Planned (research) |
| 4 | Shielded-by-default ZK privacy (`pyrax-zk` + `pyrax-privacy`) | Planned (research) |
| 5 | Mixnet / onion routing (metadata privacy) | Planned (research) |
| 6 | Wallet (shielded + transparent; ext/mobile/desktop) | Planned |
| 7 | Electron node & mining app | Planned |
| 8 | Anonymous E2E file transfer + media streaming (`pyrax-stream`) | Planned (research) |
| 9 | AI inference & compute pool | Planned (research) |
| 10 | L2 EVM/WASM/Cairo | Planned |
| 11 | L3 ZK rollup | Planned |
| 12 | Explorer, faucet, SDK, CLI | Planned |
| 13 | Security, audits, testnet → mainnet | Planned |

The milestones are concrete: Phase 1 ends with `pyrax-node --dev` producing a
queryable GhostDAG; Phase 2 with a 3-node devnet that self-assembles with no boot
node; Phase 3 with real GhostDAG + TriStream + finalized rewards; Phase 4 with a
shielded transfer that hides sender/receiver/amount and rejects nullifier reuse;
Phase 5 with tx propagation over the mixnet that an on-path observer cannot
correlate; Phase 8 with an encrypted file and a live media stream that an ISP sees
only as uniform encrypted traffic; and Phase 13 with audited circuits and an
incentivized testnet feeding into mainnet genesis.

---

## 14. References

1. Y. Sompolinsky, S. Wyborski, A. Zohar. *PHANTOM and GhostDAG: A Scalable
   Generalization of Nakamoto Consensus.*
2. The Kaspa project. *GhostDAG / k-cluster blue-set ordering* (practical
   blockDAG consensus).
3. E. Ben-Sasson, A. Chiesa, et al. *Zerocash: Decentralized Anonymous Payments
   from Bitcoin* — the note-commitment / nullifier model.
4. The Electric Coin Company / Zcash. *Orchard* shielded protocol and the
   Halo 2 proving system (no trusted setup).
5. S. Bowe, J. Grigg, D. Hopwood. *Recursive Proof Composition without a Trusted
   Setup (Halo).*
6. Polygon Zero. *Plonky2: Fast Recursive Arguments with PLONK and FRI.*
7. G. Danezis, I. Goldberg. *Sphinx: A Compact and Provably Secure Mix Format.*
8. Nym / Loopix. *Anonymous communication via stratified mixnets with cover
   traffic.*
9. P. Maymounkov, D. Mazières. *Kademlia: A Peer-to-Peer Information System Based
   on the XOR Metric.*
10. Protocol Labs. *libp2p* — modular peer-to-peer networking stack (Noise,
    Yamux, GossipSub, mDNS, Kademlia, rendezvous).
11. J. O'Connor, J.-P. Aumasson, S. Neves, Z. Wilcox-O'Hearn. *BLAKE3.*
12. D. Boneh, M. Drijvers, G. Neven. *Compact Multi-Signatures for Smaller
    Blockchains* — BLS aggregation and proofs of possession.
13. Apache Software Foundation. *Apache License, Version 2.0.*
14. tevador. *RandomX*; and the *KAWPOW* (ProgPoW-derived) proof-of-work
    specification.

---

*PYRAX™ — high-throughput, private-by-default, fully decentralized,
ISP-resistant, and copyleft. This whitepaper describes the protocol as designed
and as being implemented; consensus parameters, circuit details, and economic
constants are finalized in their respective per-phase design documents and
subject to external review before mainnet.*
