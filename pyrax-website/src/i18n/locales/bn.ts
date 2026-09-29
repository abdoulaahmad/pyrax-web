// SPDX-License-Identifier: LicenseRef-Proprietary
import type { Dict } from "./en";
type LocaleDict = { [K in keyof Dict]?: Partial<Dict[K]> };
export const bn: LocaleDict = {
  meta: {
    titleSuffix: "PYRAX™ Network",
    description:
      "PYRAX হলো একদম নতুন করে তৈরি একটি Layer-1: একটি GhostDAG, ডিফল্টভাবে ব্যক্তিগত, সম্পূর্ণ বিকেন্দ্রীভূত, ISP-প্রতিরোধী — সঙ্গে একটি যাচাইযোগ্য AI কম্পিউট মার্কেটপ্লেস। লক্ষ্য 500,000+ TPS।",
  },
  nav: {
    products: "পণ্যসমূহ",
    industries: "শিল্পখাত",
    technology: "প্রযুক্তি",
    developers: "ডেভেলপার",
    network: "নেটওয়ার্ক",
    token: "টোকেন",
    company: "কোম্পানি",
    launchApp: "অ্যাপ চালু করুন",
    explorer: "Explorer",
    nodes: "নোড চালান",
    devnet: "Devnet পোর্টাল",
    wallet: "ওয়ালেট",
    docs: "ডকুমেন্টেশন",
    whitepaper: "Whitepaper",
    pitch: "বিনিয়োগকারী",
    viewAll: "সব দেখুন",
    exploreIndustries: "সব ১০০টি শিল্পখাত অন্বেষণ করুন",
  },
  hero: {
    eyebrow: "ব্যক্তিগত ও প্যারালাল Layer-1",
    title: "ভবিষ্যৎ যেমন দাবি করে, তেমনভাবে তৈরি ব্লকচেইন।",
    subtitle:
      "PYRAX একক চেইনের বদলে ব্লকের একটি GhostDAG জাল ব্যবহার করে — ডিফল্টভাবে ব্যক্তিগত, সম্পূর্ণ বিকেন্দ্রীভূত, ISP-প্রতিরোধী, এবং প্রতি সেকেন্ডে 500,000+ লেনদেনের জন্য প্রকৌশলিত। অলস মাইনিং হার্ডওয়্যার একটি যাচাইযোগ্য AI কম্পিউট মার্কেটপ্লেসে পরিণত হয়।",
    ctaPrimary: "নেটওয়ার্ক অন্বেষণ করুন",
    ctaSecondary: "Whitepaper পড়ুন",
    liveOn: "চালু আছে",
  },
  stats: {
    blockHeight: "ব্লক উচ্চতা",
    peers: "সংযুক্ত পিয়ার",
    tps: "লাইভ TPS",
    finality: "চূড়ান্ততা",
    offline: "অফলাইন",
    target: "লক্ষ্য",
    supplyCap: "সর্বোচ্চ সরবরাহ",
    streams: "মাইনিং স্ট্রিম",
  },
  pillars: {
    title: "চারটি অপরিবর্তনীয় নীতি, নিছক ফিচার নয়",
    subtitle:
      "বেশিরভাগ নেটওয়ার্ক এগুলো পরে জুড়ে দেয়। PYRAX এগুলোকে তার সর্বনিম্ন-স্তরের ডেটা টাইপে বাধ্যতামূলক করে।",
    throughputT: "উচ্চ থ্রুপুট",
    throughputD:
      "একটি GhostDAG একসঙ্গে বহু ব্লক গ্রহণ করে — সৎ প্যারালাল কাজ অন্তর্ভুক্ত হয়, orphan হয় না। লক্ষ্য: পরিমাপকৃত ও benchmark-কৃত সমষ্টি হিসেবে 500,000+ TPS।",
    privacyT: "ডিফল্টভাবে ব্যক্তিগত",
    privacyD:
      "প্রতিটি লেনদেন ডিফল্টভাবে no-trusted-setup zero-knowledge প্রমাণ দিয়ে সুরক্ষিত। প্রেরক, প্রাপক এবং পরিমাণ গোপন থাকে। স্বচ্ছতা হলো সুস্পষ্ট ব্যতিক্রম।",
    decentralT: "সম্পূর্ণ বিকেন্দ্রীভূত",
    decentralD:
      "Bootstrapless পিয়ার আবিষ্কার — যোগ দেওয়ার গুরুত্বপূর্ণ পথে কোম্পানি-পরিচালিত কোনো স্টার্টার সার্ভার নেই। তিনটি অসম্পর্কিত মাইনিং স্ট্রিম সঙ্গে BLS proof-of-stake চূড়ান্ততা।",
    ispT: "ISP-প্রতিরোধী",
    ispD:
      "ট্রাফিক নির্দিষ্ট আকারের প্যাকেট ও cover traffic সহ একটি onion Sphinx mixnet-এর মধ্য দিয়ে চলে, তাই পথে থাকা যেকোনো পর্যবেক্ষক — আপনার ISP সহ — কেবল অভিন্ন এনক্রিপ্টেড প্রবাহ দেখতে পায়।",
  },
  cta: {
    buildTitle: "PYRAX-এর ওপর তৈরি করুন",
    buildBody:
      "EVM, WASM, এবং Cairo — তিনটি virtual machine, একটি চেইন। আপনার Ethereum টুলিং নিয়ে আসুন অথবা প্রমাণযোগ্য কন্ট্রাক্ট লিখুন।",
    build: "তৈরি করা শুরু করুন",
    industriesTitle: "আপনার শিল্পের জন্য PYRAX",
    industriesBody:
      "১০০টি শিল্প বাস্তব PYRAX ইন্টিগ্রেশন, বর্তমান বাজার প্রক্ষেপণ এবং buildathon-উপযোগী dApp আইডিয়ার সঙ্গে ম্যাপ করা হয়েছে।",
  },
  footer: {
    tagline:
      "উচ্চ থ্রুপুট · ডিফল্টভাবে ব্যক্তিগত · সম্পূর্ণ বিকেন্দ্রীভূত · ISP-প্রতিরোধী · open-core।",
    product: "পণ্য",
    developers: "ডেভেলপার",
    network: "নেটওয়ার্ক",
    community: "কমিউনিটি",
    resources: "রিসোর্স",
    rights: "সর্বস্বত্ব সংরক্ষিত।",
    openCore:
      "Apache-2.0-এর অধীনে উন্মুক্ত প্রোটোকল। অ্যাপ, ওয়ালেট, PYRAX Compute ও সেবাসমূহ proprietary। PYRAX™ একটি ট্রেডমার্ক।",
    selectLanguage: "ভাষা",
    selectNetwork: "নেটওয়ার্ক",
  },
  common: {
    learnMore: "আরও জানুন",
    getStarted: "শুরু করুন",
    comingSoon: "শীঘ্রই আসছে",
    live: "লাইভ",
    audited: "অডিটের অপেক্ষায়",
  },
  techPage: {
    // Sub-navigation
    subConsensus: "কনসেনসাস",
    subPrivacy: "গোপনীয়তা",
    subVms: "ভার্চুয়াল মেশিন",
    subCompute: "PYRAX Compute",
    subNetwork: "নেটওয়ার্ক",
    subSecurity: "নিরাপত্তা",

    // Seal-lane table rows
    lane1Hw: "ASIC / বিশেষায়িত",
    lane2Hw: "ASIC",
    lane3Hw: "সাধারণ GPU",
    lane4Lane: "Argon2id (memory-hard)",
    lane4Hw: "সাধারণ CPU",
    lane5Lane: "BLS proof-of-stake",
    lane5Hw: "স্টেক-করা ভ্যালিডেটর",

    // Virtual machines
    vm1Desc:
      "সম্পূর্ণ Ethereum সমতুল্যতা — Solidity/Vyper, পূর্ণ eth_* JSON-RPC, ফিল্টার, সাবস্ক্রিপশন, precompile, CREATE2, এবং EIP-1559।",
    vm2Desc:
      "Rust-অগ্রাধিকারভিত্তিক স্মার্ট কন্ট্রাক্ট, WebAssembly-তে কম্পাইল করা — sandboxed, দ্রুত, এবং একই gas মার্কেটের দ্বারা metered।",
    vm3Engine: "STARK-প্রমাণযোগ্য",
    vm3Desc:
      "প্রমাণযোগ্য কম্পিউটেশনের জন্য Cairo VM, যাতে ভারী লজিক অফ-চেইনে প্রমাণ করে অন-চেইনে যাচাই করা যায়।",

    // Transaction types
    tx1: "Shielded",
    tx2: "স্বচ্ছ",
    tx3: "Ethereum",
    tx4: "Escrow",
    tx5: "Stake",
    tx6: "গভর্ন্যান্স",

    // Page meta
    metaTitle: "প্রযুক্তি — PYRAX™ Network",
    metaDescription:
      "PYRAX কীভাবে কাজ করে: পাঁচটি লেনে তিনটি স্ট্রিম দিয়ে সিল-করা একটি GhostDAG, BLS proof-of-stake চূড়ান্ততা, ডিফল্টভাবে-shielded গোপনীয়তা, একটি multi-VM এক্সিকিউশন স্তর, PYRAX Compute কম্পিউট মার্কেট, একটি bootstrapless ISP-প্রতিরোধী নেটওয়ার্ক, এবং mainnet-এর দিকে একটি অডিট-নিয়ন্ত্রিত পথ।",

    // Hero
    heroEyebrow: "প্রযুক্তি",
    heroTitlePre: "একটি Layer-1 যা ",
    heroTitleParallel: "প্যারালাল",
    heroTitleMid: ", ",
    heroTitlePrivate: "ব্যক্তিগত",
    heroTitlePost: ", এবং প্রমাণযোগ্য",
    heroLede:
      "একটি বাইনারি, চারটি chainspec। একটি DAG যা সৎ প্যারালাল কাজকে orphan না করে অন্তর্ভুক্ত করে, ট্রান্সফার যা ডিফল্টভাবে shielded, তিনটি ভার্চুয়াল মেশিন, এবং একটি যাচাইযোগ্য কম্পিউট মার্কেট — কোড এবং mainnet-এর মধ্যে দাঁড়িয়ে একটি একক বাহ্যিক অডিট।",

    // Consensus
    consensusEyebrow: "01 · কনসেনসাস",
    consensusTitle: "GhostDAG + TriStream",
    consensusLede1: "PYRAX একটি ",
    consensusLedeDAG: "DAG",
    consensusLede2:
      " সাজায়, একটিমাত্র চেইন নয়। GhostDAG-এর k-cluster নিয়ম সুসংযুক্ত ব্লকের একটি \"blue set\" নির্বাচন করে এবং একটি selected-parent chain-এর সাপেক্ষে সবকিছু সাজায় — তাই প্যারালালভাবে মাইন করা সৎ ব্লকগুলো ",
    consensusLedeIncluded: "অন্তর্ভুক্ত ও পুরস্কৃত হয়",
    consensusLede3:
      ", orphan হয় না। এটিই proof-of-work-এর নিরাপত্তা ত্যাগ না করেই থ্রুপুট স্কেল করতে দেয়।",

    // Seal-lane table headings
    lanesCardTitle: "তিনটি স্ট্রিম · পাঁচটি সিল লেন",
    lanesColStream: "স্ট্রিম",
    lanesColSealLane: "সিল লেন",
    lanesColHardware: "হার্ডওয়্যার",

    // BLS finality card
    finalityTitle: "BLS-aggregated PoS চূড়ান্ততা",
    finalityBody1: "Proof-of-work দেয় সম্ভাব্যতামূলক ক্রমবিন্যাস; ",
    finalityStreamC: "Stream C",
    finalityBody2:
      " যোগ করে নির্ধারক চূড়ান্ততা। ভ্যালিডেটররা ন্যূনতম একটি স্টেক bond করে ",
    finalityBody3:
      " এবং BLS12-381 স্বাক্ষর দিয়ে ভোট দেয় যা aggregate হয় — শত শত সংকুচিত হয়ে একটিতে পরিণত হয়। একটি ব্লক ",
    finalityFinal: "চূড়ান্ত হয় যখন attestation স্টেক-করা ওজনের > 2/3 ঢেকে ফেলে",
    finalityBody4: ", এবং চূড়ান্ততা কাজকে override করে।",

    // 51%-resistance card
    resistTitle: "তিনটি রিসোর্স জুড়ে 51%-প্রতিরোধ",
    resistBody1: "ইতিহাস পুনর্লিখনের জন্য প্রয়োজন হবে একটি সংখ্যাগরিষ্ঠ ",
    resistBody2: " এবং ",
    resistBody3: " hashpower এবং একটি ",
    resistSupermajority: "স্টেক-করা সুপারমেজরিটি",
    resistBody4:
      " — একসঙ্গে তিনটি অসম্পর্কিত সরবরাহ-শৃঙ্খল — এদিকে GhostDAG আটকে-রাখা শাখাগুলোকে লাল রঙ করে এবং একটি চূড়ান্ত ব্লক ফেরানো একটি slashable অপরাধ (5% burn + 10% রিপোর্টার বাউন্টি)।",

    // Privacy
    privacyEyebrow: "02 · গোপনীয়তা",
    privacyTitle: "ডিফল্টভাবে shielded",
    privacyLede1: "প্রতিটি production নেটওয়ার্কে ডিফল্ট ট্রান্সফার হলো ",
    privacyLedeShielded: "Shielded",
    privacyLede2:
      " — স্বচ্ছ হলো সুস্পষ্ট বিশেষ ক্ষেত্র, টাইপ স্তরে বাধ্যতামূলক। একটি shielded লেনদেন কোনো প্রেরক, কোনো প্রাপক, এবং প্রতি-নোট পরিমাণ প্রকাশ করে না।",
    privacyCard1Title: "নোট, ব্যালেন্স নয়",
    privacyCard1Desc:
      "স্টেট হলো depth-32 note-commitment Merkle tree-তে থাকা নোটের একটি সেট এবং একটি nullifier সেট। খরচ করলে একটি nullifier প্রকাশ পায় — কখনোই এটি কোন commitment থেকে এসেছে তা নয়।",
    privacyCard2Title: "কোনো trusted setup নেই",
    privacyCard2Desc:
      "plonky2-স্টাইলের ব্যাকএন্ড সহ Poseidon-over-Goldilocks প্রমাণ। বিশ্বাস করার মতো কোনো toxic-waste ceremony নেই, এবং সার্কিটটি আজ ডিফল্ট-অন।",
    privacyCard3Title: "ইচ্ছা অনুযায়ী auditable",
    privacyCard3Desc:
      "Viewing key একজন অডিটর বা নিয়ন্ত্রকের কাছে শুধু-পঠনযোগ্য দৃশ্যমানতা দেয়, কখনোই খরচ করার ক্ষমতা উন্মুক্ত না করেই — ব্যবহারকারীদের জন্য ব্যক্তিগত, তদারকির জন্য প্রমাণযোগ্য।",
    privacyCalloutLead: "Recursive aggregation গোপনীয়তাকে স্কেলের সঙ্গে মিলিয়ে দেয়:",
    privacyCalloutBody:
      " হাজার হাজার shielded প্রমাণ একটি recursive প্রমাণে ভাঁজ হয়ে যায়, তাই একজন ভ্যালিডেটর প্রতি batch-এ প্রায় একটিমাত্র যাচাই সম্পাদন করে। anti-DoS হিসেবে প্রতি ট্রান্সফারে একটি সমান 100-base-unit shielded ফি burn করা হয়।",

    // Virtual machines section
    vmsEyebrow: "03 · ভার্চুয়াল মেশিন",
    vmsTitle: "তিনটি VM, cross-VM কল, একটি চেইন",
    vmsLede:
      "আপনি যে ভাষা ও toolchain ইতিমধ্যে জানেন সেটিতেই deploy করুন। তিনটি ভার্চুয়াল মেশিনই একটি স্টেট, একটি gas মার্কেট শেয়ার করে, এবং একে অপরকে কল করতে পারে — এবং একটি recursive ZK-rollup স্তর হাজার হাজার প্রমাণকে একটিতে ভাঁজ করে।",
    txTypesTitle: "ছয়টি লেনদেন প্রকার, একটি ledger",
    txTypesBody:
      "Escrow (Lock / Refund / Release / Drip / Split), Stake (Bond / Unbond / Withdraw / Slash), এবং Governance (Propose / Vote) হলো প্রথম-শ্রেণির লেনদেন প্রকার — জুড়ে-দেওয়া কন্ট্রাক্ট নয়।",

    // PYRAX Compute
    computeEyebrow: "04 · PYRAX Compute",
    computeTitle: "যাচাইযোগ্য AI ও GPU কম্পিউট",
    computeLede1:
      "যে GPU-গুলো Stream B মাইন করে সেগুলোই পেইড AI ও কম্পিউট জব চালায়, অন-চেইন escrow দ্বারা অর্থায়িত এবং একটি নির্দিষ্ট মূল্যে দামযুক্ত ",
    computeLedePrice: "8 PYRX প্রতি compute unit",
    computeLede2:
      "। কোনো প্রদানকারীর কথায় বিশ্বাস করার বদলে, ফলাফলগুলো একটি চার-ধাপের যাচাই সিঁড়ি বেয়ে ওঠে।",
    computeLadder1: "স্বাধীন প্রদানকারীদের জুড়ে অতিরিক্ত পুনঃ-এক্সিকিউশন",
    computeLadder2: "Fraud proof যা একক ভিন্ন ধাপটিকে নির্দিষ্ট করে",
    computeLadder3: "ইন্টারঅ্যাক্টিভ বিরোধ — সেই ধাপ পর্যন্ত একটি bisection গেম",
    computeLadder4: "হার্ডওয়্যার-সিল-করা এক্সিকিউশনের জন্য TEE attestation",
    computeStat1Label: "প্রতি compute unit (1 reference-GPU-hour)",
    computeStat2Label: "AI-compute pool · ~70M/month বাজেট",
    computeStat3Label: "প্রতি যাচাইকৃত জবে একটি অন-চেইন ComputeReceipt",
    computeStat4Label: "local-first বেসলাইন; ShardedExecutor GPU pool করে",
    computeCta: "AI ও কম্পিউট ব্যবহারের ক্ষেত্র অন্বেষণ করুন →",

    // Network
    networkEyebrow: "05 · নেটওয়ার্ক",
    networkTitle: "Bootstrapless ও ISP-প্রতিরোধী",
    networkLede:
      "এমন কোনো কোম্পানি-পরিচালিত স্টার্টার সার্ভার নেই যা জব্দ বা ব্লক করা যায়। পিয়াররা একটি বিকেন্দ্রীভূত mesh-এর মাধ্যমে একে অপরকে খুঁজে পায়, এবং ট্রাফিক একটি onion Sphinx mixnet-এ চলতে পারে যাতে পথে থাকা একজন পর্যবেক্ষক — একটি ISP সহ — কেবল অভিন্ন, এনক্রিপ্টেড প্রবাহ দেখে।",
    networkCard1Title: "কোনো bootstrap কর্তৃপক্ষ নেই",
    networkCard1Desc:
      "আবিষ্কার হলো একটি relay directory এবং Kademlia রাউটিং সহ peer-to-peer। বন্ধ করার মতো কেন্দ্রীয় কিছু নেই।",
    networkCard2Title: "Onion Sphinx mixnet",
    networkCard2Desc:
      "cover traffic সহ স্তরায়িত এনক্রিপশন কে কার সঙ্গে কথা বলছে তা গোপন করে — শুধু payload গোপনীয়তা নয়, metadata গোপনীয়তা।",
    networkCard3Title: "বেনামী carriage",
    networkCard3Desc:
      "একটি pull-ভিত্তিক want/have ইঞ্জিন reply-route loop guard এবং সীমাবদ্ধ reassembly সহ mixnet-এর ওপর দিয়ে ফাইল ও মিডিয়া স্থানান্তর করে।",

    // Security
    securityEyebrow: "06 · নিরাপত্তা",
    securityTitle: "mainnet-এর দিকে অডিট-নিয়ন্ত্রিত",
    securityLede:
      "PYRAX হলো open-core: প্রোটোকল, নোড, এবং SDK সর্বজনীন। সরবরাহের সীমা কনসেনসাসে বাধ্যতামূলক, ফি বিভাজন হিমায়িত, এবং কনসেনসাস, ZK, ও bridge-এর একটি একক বাহ্যিক অডিট কোড এবং PYRAX One-এর মধ্যে দাঁড়িয়ে থাকে।",
    securityCard1Title: "আনুষ্ঠানিক invariant",
    securityCard1Desc:
      "সরবরাহ, চূড়ান্ততা, এবং nullifier-set invariant কোডে দৃঢ়ভাবে জোর দেওয়া ও পরীক্ষিত।",
    securityCard2Title: "নথিভুক্ত threat model",
    securityCard2Desc:
      "তিনটি রিসোর্স জুড়ে 51%, rogue-key প্রতিরক্ষা, DoS সীমা, mempool সীমা।",
    securityCard3Title: "বাহ্যিক অডিট গেট",
    securityCard3Desc:
      "mainnet-এর আগে একটি স্বাধীন ফার্ম দ্বারা কনসেনসাস + ZK + bridge অডিট করা হয়।",
    securityCard4Title: "Open-core",
    securityCard4Desc:
      "Apache-2.0 প্রোটোকল — এই পৃষ্ঠার দাবিগুলো সোর্সে যাচাই করুন।",

    // Footer CTAs
    ctaWhitepaper: "whitepaper পড়ুন →",
    ctaNetworks: "চারটি নেটওয়ার্ক",
    ctaExplorer: "explorer খুলুন",
  },
  tokenPage: {
    eyebrow: "টোকেনোমিক্স",
    economyPre: "",
    economyPost: " অর্থনীতি",
    heroSubtitle:
      "কনসেনসাসে বাধ্যতামূলক একটি নির্দিষ্ট 50-বিলিয়ন সরবরাহ, একটি স্বচ্ছ premine, মাইনিং যা এক-চতুর্থাংশ শতাব্দী ধরে চলে, এবং একটি ফি বিভাজন যা কেউ — এমনকি একটি গভর্ন্যান্স ভোটও — কখনো বদলাতে পারবে না।",
    heroStat1: "সর্বোচ্চ সরবরাহ · হার্ড ক্যাপ",
    heroStat2: "Genesis মূল্য",
    heroStat3: "Premine · 25% মাইনকৃত",
    heroStat4: "টিকার · 18 দশমিক",
    hardCap: "PYRX হার্ড ক্যাপ",
    distributionTitle: "Genesis বণ্টন",
    distributionBody:
      "প্রতিটি pool genesis-এ একটি সংরক্ষিত, শুধু-credit সিস্টেম অ্যাকাউন্টে seed করা হয়। 12.5B মাইনিং অংশই একমাত্র সরবরাহ যা launch-এ উপস্থিত নয় — এটি ~26 বছর ধরে ব্লক প্রযোজকদের কাছে mint করা হয়।",
    card1Title: "Genesis ইভেন্ট",
    card2Title: "অংশগ্রহণকারীরা পান",
    card2Explain:
      "বোনাসটি নেটওয়ার্ক অ্যাক্সেস / compute credit হিসেবে উপস্থাপিত — কখনোই একটি বিনিয়োগ রিটার্ন নয়।",
    card3Title: "প্রাথমিক circulating",
    card3Suffix: " 50B-এর মধ্যে",
    card3Explain: "টিম 12-month cliff + 36-month linear-এ vest করে; ecosystem TGE-তে 40%।",
    emissionsTitle: "নিঃসরণ",
    emissionsIntro:
      "Bitcoin-ধাঁচের, কিন্তু চার-বছরের halving এবং একটি হার্ড মাইনিং ক্যাপ। ক্যাপের পর, ব্লক প্রযোজকরা সম্পূর্ণভাবে ফি দ্বারা পরিশোধিত হয়।",
    emInitialSubsidy: "প্রাথমিক subsidy",
    emHalving: "Halving",
    emCap: "ক্যাপ",
    emSchedule: "সময়সূচি",
    emSplit: "প্রতি-স্ট্রিম বিভাজন",
    feesTitle: "ফি",
    feesSub: "· EIP-1559, কনসেনসাস-হিমায়িত",
    feesIntro: "বিভাজনটি কনসেনসাসে হিমায়িত — কোনো গভর্ন্যান্স ভোট কখনো এটি স্পর্শ করতে পারবে না।",
    baseFee: "বেস ফি",
    priorityTip: "অগ্রাধিকার tip",
    stakingTitle: "স্টেকিং",
    minStake: "ন্যূনতম স্টেক",
    unbonding: "Unbonding",
    slashing: "Slashing",
    validatorsEarnPre: "ভ্যালিডেটররা অর্জন করে ",
    validatorsEarnPost: "।",
    governanceTitle: "গভর্ন্যান্স",
    governableIntro: "ঠিক তিনটি প্যারামিটার governable:",
    quorum: "Quorum",
    pass: "Pass",
    frozenForever: "চিরতরে হিমায়িত:",
    computeTitle: "PYRAX Compute কম্পিউট",
    price: "মূল্য",
    poolBudget: "Pool বাজেট",
    jobCap: "জব ক্যাপ",
    computeLink: "PYRAX Compute কীভাবে কাজ করে →",
    ctaWhitepaper: "সম্পূর্ণ whitepaper পড়ুন →",
    ctaExplorer: "explorer খুলুন",
  },
  networkPage: {
    eyebrow: "নেটওয়ার্ক",
    headingLead: "একটি বাইনারি,",
    headingFlame: "চারটি নেটওয়ার্ক",
    subtitle:
      "নোডটি ঠিক চারটি chainspec শিপ করে। Seed একটি স্থায়ী সিমুলেশন; Forge, Rise, এবং One আসল Production কনসেনসাস শেয়ার করে, কেবল launch ক্রম এবং অডিট গেটিং-এ ভিন্ন। একটি production chain-id কখনো instant-seal নকল করতে পারে না।",

    role1:
      "স্থায়ী ডেভেলপার sandbox — play-money এবং একটি welcome faucet সহ আসল primitive-এর ওপর একটি byte-অভিন্ন সিমুলেশন। এটি কখনো mainnet হয় না; এটি চিরকাল একটি sandbox থেকে যায়।",
    role2:
      "আসল Production কনসেনসাসের ওপর ক্লোজড পাবলিক আলফা, তিনটি seed-করা genesis ভ্যালিডেটর দিয়ে launch। প্রথম নেটওয়ার্ক যেখানে production পথটি বাইরের টেস্টারদের জন্য চলে।",
    role3:
      "অফিসিয়াল পাবলিক testnet — incentivized এবং অডিট-মুখী, একটি testnet emission ramp সহ। mainnet-এর জন্য dress rehearsal।",
    role4:
      "Mainnet। genesis ceremony বাহ্যিক অডিট গেটের অপেক্ষায় — কোনো faucet নেই, কোনো dev key নেই, আসল মূল্য।",

    statusOnline: "অনলাইন",
    statusConnecting: "সংযোগ করা হচ্ছে",
    statusNotYetLive: "এখনো লাইভ নয়",

    statHeight: "উচ্চতা",
    statPeers: "পিয়ার",
    statTpsNow: "এখন tps",

    liveFiguresCaption:
      "লাইভ পরিসংখ্যান পৃষ্ঠা লোডের সময় প্রতিটি নেটওয়ার্কের পাবলিক RPC থেকে পড়া হয়। যে নেটওয়ার্ক পৌঁছানো যায় না তা সৎ স্ট্যাটাস দেখায় — কখনোই বানানো সংখ্যা নয়।",

    roadmapEyebrow: "রোডম্যাপ",
    roadmapHeading: "mainnet-এর পথ",
    roadmapSubtitle:
      "ইচ্ছাকৃত এবং অডিট-নিয়ন্ত্রিত। প্রতিটি নেটওয়ার্ক পরেরটির ঝুঁকি কমায়; আসল মূল্য বহনকারী কিছুই বাহ্যিক অডিট পাস করার আগে শিপ হয় না।",

    roadmap1P: "এখন",
    roadmap1Title: "PYRAX Seed লাইভ",
    roadmap1Body:
      "সম্পূর্ণ প্রোটোকলের একটি বিশ্বস্ত সিমুলেশন — GhostDAG, shielded pool, multi-VM কন্ট্রাক্ট, PYRAX Compute — আজ একটি স্থায়ী ডেভেলপার sandbox হিসেবে চলছে।",
    roadmap2P: "পরবর্তী",
    roadmap2Title: "PYRAX Forge · ক্লোজড আলফা",
    roadmap2Body:
      "production কনসেনসাস পথ (আসল 5-lane TriStream + BLS চূড়ান্ততা) seed-করা ভ্যালিডেটর সহ আমন্ত্রিত টেস্টারদের জন্য খুলে যায়।",
    roadmap3P: "তারপর",
    roadmap3Title: "PYRAX Rise · পাবলিক testnet",
    roadmap3Body:
      "emission ramp সহ উন্মুক্ত, incentivized testnet — অডিট-মুখী rehearsal, প্রকাশ্যে লোড-পরীক্ষিত।",
    roadmap4P: "গেট",
    roadmap4Title: "বাহ্যিক অডিট",
    roadmap4Body:
      "কনসেনসাস, ZK সার্কিট, এবং bridge-এর একটি একক স্বাধীন অডিট। এটি পাস করার আগে কিছুই mainnet-এ পৌঁছায় না।",
    roadmap5P: "Launch",
    roadmap5Title: "PYRAX One · mainnet",
    roadmap5Body:
      "genesis ceremony, কনসেনসাসে বাধ্যতামূলক 50B হার্ড ক্যাপ, এবং আসল মূল্য — গেটের পর।",

    ctaExplore: "Seed লাইভ অন্বেষণ করুন →",
    ctaRunNode: "একটি নোড চালান",
    ctaHowItWorks: "এটি কীভাবে কাজ করে",
  },
  devPage: {
    eyebrow: "ডেভেলপার",
    headingPre: "আপনি ইতিমধ্যে ",
    headingEmphasis: "যে টুল জানেন",
    subtitle:
      "সম্পূর্ণ Ethereum RPC-এর বিপরীতে আজই Solidity শিপ করুন, অথবা প্রয়োজনে Rust, Cairo, shielded ট্রান্সফার, এবং যাচাইযোগ্য কম্পিউটের হাত বাড়ান। সবসময়-চালু Seed sandbox-এ বিনামূল্যে শুরু করুন।",
    ctaDocs: "ডক পড়ুন →",
    ctaGithub: "GitHub",
    connectTitle: "এক ধাপে সংযোগ করুন",
    connectBody:
      "Seed নেটওয়ার্ক স্ট্যান্ডার্ড Ethereum JSON-RPC বলে। এটি যেকোনো EVM ওয়ালেট বা framework-এ যোগ করুন এবং আপনি তৈরি করছেন — play-money, কোনো signup নেই, সবসময় চালু।",
    connectNetwork: "নেটওয়ার্ক",
    connectChainId: "Chain ID",
    connectCurrency: "মুদ্রা",
    connectBlockTime: "ব্লক টাইম",
    path1Title: "একটি Solidity কন্ট্রাক্ট deploy করুন",
    path1Desc:
      "আপনার বিদ্যমান Ethereum toolchain (Hardhat, Foundry, ethers) PYRAX RPC-এর দিকে নির্দেশ করুন — সম্পূর্ণ eth_* surface সেখানে আছে।",
    path2Title: "একটি Rust কন্ট্রাক্ট লিখুন",
    path2Desc:
      "WebAssembly-তে কম্পাইল করুন এবং WASM VM-এ deploy করুন, অন্য সবকিছুর মতো একই gas মার্কেট দ্বারা metered।",
    path3Title: "Cairo দিয়ে প্রমাণ করুন",
    path3Desc:
      "ভারী কম্পিউটেশন অফ-চেইনে সরান এবং Cairo VM-এর মাধ্যমে অন-চেইনে একটি STARK প্রমাণ যাচাই করুন।",
    path4Title: "একটি shielded dApp তৈরি করুন",
    path4Desc:
      "shielded ট্রান্সফার এবং viewing key ব্যবহার করুন যাতে আপনার ব্যবহারকারীরা ডিফল্টভাবে ব্যক্তিগত থাকে এবং আপনার অডিটরদের এখনও শুধু-পঠনযোগ্য প্রমাণ থাকে।",
    path5Title: "যাচাইযোগ্য কম্পিউট কিনুন",
    path5Desc:
      "একটি PYRAX Compute জব escrow করুন, একটি ComputeReceipt পান, এবং প্রতি compute unit-এ পরিশোধ করুন — বিশ্বাস নয়, প্রমাণ সহ AI inference ও training।",
    path6Title: "একটি নোড চালান",
    path6Desc:
      "একটি Inferno নোড দিয়ে mesh-এ যোগ দিন, একটি স্ট্রিম মাইন করুন, অথবা validate করতে stake করুন — কোনো bootstrap সার্ভার প্রয়োজন নেই।",
    pathsTitle: "আপনার পথ বেছে নিন",
    pathsSubtitle:
      "PYRAX-এর ওপর তৈরির ছয়টি উপায় — একটি পরিচিত Solidity deploy থেকে shielded dApp এবং যাচাইযোগ্য AI পর্যন্ত।",
    resourcesTitle: "রিসোর্স",
    res1Title: "ডকুমেন্টেশন",
    res1Desc: "গাইড, আর্কিটেকচার, এবং JSON-RPC রেফারেন্স।",
    res2Title: "Whitepaper v4",
    res2Desc: "সম্পূর্ণ টেকনিক্যাল পেপার এবং একটি সহজ-ইংরেজি সঙ্গী।",
    res3Title: "GitHub",
    res3Desc: "Apache-2.0 প্রোটোকল, নোড, এবং SDK — সোর্স পড়ুন।",
    res4Title: "ব্লক explorer",
    res4Desc: "GhostDAG ব্লক, shielded pool, এবং কন্ট্রাক্ট পরিদর্শন করুন।",
    res5Title: "নোড ও ওয়ালেট অ্যাপ",
    res5Desc: "ডেস্কটপ নোড, CLI, এবং ওয়ালেট — mesh, mine, shield, stream।",
    res6Title: "Devnet টেস্টার পোর্টাল",
    res6Desc: "ক্লোজড আলফায় যোগ দিন এবং PYRAX Forge-কে তার সীমা পর্যন্ত পরীক্ষা করুন।",
  },
  homeExtra: {
    // techStats labels
    techStatMaxSupply: "সর্বোচ্চ সরবরাহ (হার্ড ক্যাপ)",
    techStatVms: "EVM · WASM · Cairo",
    techStatSealLanes: "TriStream সিল লেন",
    techStatNetworks: "Seed · Forge · Rise · One",
    techStatRecursiveProof: "L3 recursive প্রমাণ",
    techStatOpenCore: "open-core প্রোটোকল",

    // techCards (title + description)
    techCard1T: "GhostDAG",
    techCard1D:
      "GhostDAG (k-cluster blue set) দ্বারা সাজানো ব্লকের একটি multi-parent জাল, তাই সৎ প্যারালাল কাজ অন্তর্ভুক্ত হয়, orphan হয় না।",
    techCard2T: "TriStream মাইনিং",
    techCard2D:
      "পাঁচটি সিল লেনে তিনটি স্ট্রিম — BLAKE3 + SHA-256d (ASIC), kHeavyHash + Argon2id (GPU/CPU), এবং BLS proof-of-stake চূড়ান্ততা।",
    techCard3T: "ডিফল্টভাবে shielded",
    techCard3D:
      "প্রতিটি ট্রান্সফার plonky2 প্রমাণ দিয়ে প্রেরক, প্রাপক, এবং পরিমাণ গোপন করে — কোনো trusted setup নেই, এবং সার্কিটটি আজ ডিফল্ট-অন।",
    techCard4T: "Multi-VM L2 + ZK-rollup L3",
    techCard4D:
      "EVM (revm), WASM (wasmtime), এবং Cairo cross-VM কল সহ; একটি recursive ZK-rollup হাজার হাজার প্রমাণকে একটিতে ভাঁজ করে।",
    techCard5T: "Bootstrapless ও ISP-প্রতিরোধী",
    techCard5D:
      "কোনো কোম্পানি-পরিচালিত স্টার্টার সার্ভার নেই; ট্রাফিক একটি onion Sphinx mixnet-এ চলে তাই পথে থাকা একজন পর্যবেক্ষক কেবল অভিন্ন এনক্রিপ্টেড প্রবাহ দেখে।",
    techCard6T: "mainnet-এর দিকে অডিট-নিয়ন্ত্রিত",
    techCard6D:
      "আনুষ্ঠানিক invariant, একটি নথিভুক্ত threat model, এবং PYRAX One-এর আগে কনসেনসাস + ZK + bridge-এর একটি একক বাহ্যিক অডিট।",

    // tech showcase header
    techEyebrow: "তৈরি, পরিকল্পিত নয়",
    techHeading: "একটি আসল, পরীক্ষিত Layer-1 — আজই",
    techParagraph:
      "একটি বাইনারি, চারটি chainspec: আসল primitive-এর ওপর একটি বিশ্বস্ত সিমুলেশন, production কনসেনসাস পথ end-to-end wired এবং বাহ্যিক অডিট দ্বারা mainnet-এর দিকে নিয়ন্ত্রিত।",
    readWhitepaper: "whitepaper পড়ুন →",
    learnMore: "আরও জানুন →",

    // PYRAX Compute section
    computeHeading: "অলস GPU একটি যাচাইযোগ্য কম্পিউট মার্কেটে পরিণত হয়",
    computeParagraph:
      "যে হার্ডওয়্যার Stream B মাইন করে সেটিই পেইড AI ও কম্পিউট জব চালায়, অন-চেইনে settle এবং একটি নির্দিষ্ট 8 PYRX প্রতি compute unit-এ দামযুক্ত। একটি চার-ধাপের যাচাই সিঁড়ি — redundancy, fraud proof, ইন্টারঅ্যাক্টিভ বিরোধ, এবং TEE attestation — অন্ধ বিশ্বাসের বদলে ক্রিপ্টোগ্রাফিক প্রমাণ দেয়।",
    computeHowItWorks: "PYRAX Compute কীভাবে কাজ করে",
    computeIndustries: "AI ও কম্পিউট শিল্পখাত →",
    computeTile1L: "প্রতি compute unit (1 RTX-4090-hour)",
    computeTile2L: "PYRX AI-compute pool",
    computeTile3L: "যাচাই সিঁড়ি",
    computeTile4L: "local-first বেসলাইন GPU",

    // industries teaser
    businessTypes: "ব্যবসার ধরন",

    // final CTA
    investorsTitle: "বিনিয়োগকারীদের জন্য",
    investorsBody:
      "একটি ইন্টারঅ্যাক্টিভ, অ্যানিমেটেড ডেক — দৃষ্টিভঙ্গি, প্রযুক্তি, টোকেনোমিক্স, এবং প্রস্তাব।",
    openPitchDeck: "pitch deck খুলুন →",

    // LiveStats widget
    labelBlockHeight: "ব্লক উচ্চতা",
    labelConnectedPeers: "সংযুক্ত পিয়ার",
    labelLiveTps: "লাইভ TPS",
    labelFinality: "চূড়ান্ততা",
    subBlueScore: "blue score",
    subFinal: "চূড়ান্ত",
    subOffline: "অফলাইন",
    subP2pMesh: "P2P mesh",
    subTarget: "লক্ষ্য",
    subStreamC: "Stream C · >2/3 স্টেক",
    statusLive: "লাইভ",
    statusAwaitingRpc: "RPC-এর অপেক্ষায়",
  },
  navPanels: {
    // ProductsPanel — item descriptions
    productsExplorerDesc: "GhostDAG ব্লক, shielded pool, multi-VM কন্ট্রাক্ট।",
    productsNodesDesc: "একটি Inferno নোড চালান, mesh-এ যোগ দিন, পুরস্কার অর্জন করুন।",
    productsDevnetDesc: "PYRAX Forge-এর জন্য ক্লোজড-আলফা টেস্টার পোর্টাল।",
    productsWalletDesc: "Shielded + স্বচ্ছ, key কখনো আপনার ডিভাইস ছাড়ে না।",
    // ProductsPanel — feature card
    productsFeatureEyebrow: "নেটওয়ার্ক",
    productsFeatureTitle: "একটি বাইনারি, চারটি নেটওয়ার্ক",
    productsFeatureBody:
      "Seed, Forge, Rise, এবং One — আসল primitive-এর ওপর একটি বিশ্বস্ত সিমুলেশন, বাহ্যিক অডিট দ্বারা mainnet-এর দিকে নিয়ন্ত্রিত।",
    productsFeatureLink: "নেটওয়ার্ক অন্বেষণ করুন →",

    // IndustriesPanel
    industriesTitle: "প্রতিটি শিল্পের জন্য PYRAX",
    industriesBody: "10 ক্যাটাগরি · 100 ব্যবসার ধরন · প্রক্ষেপণ + buildathon dApp আইডিয়া।",

    // TechnologyPanel — item names + descriptions
    techConsensusName: "GhostDAG + TriStream",
    techConsensusDesc: "GhostDAG দ্বারা সাজানো একটি DAG; তিনটি স্ট্রিম, পাঁচটি সিল লেন।",
    techPrivacyName: "ডিফল্টভাবে ব্যক্তিগত",
    techPrivacyDesc: "no-trusted-setup ZK প্রমাণ সহ shielded ট্রান্সফার।",
    techVmsName: "Multi-VM (EVM/WASM/Cairo)",
    techVmsDesc: "তিনটি ভার্চুয়াল মেশিন, cross-VM কল, একটি চেইন।",
    techComputeName: "PYRAX Compute কম্পিউট মার্কেট",
    techComputeDesc: "যাচাইযোগ্য, অন-চেইন-settle-করা AI ও GPU কম্পিউট।",
    techSecurityName: "নিরাপত্তা ও অডিট",
    techSecurityDesc: "আনুষ্ঠানিক invariant, threat model, বাহ্যিক অডিট গেট।",
    techWhitepaperName: "Whitepaper v4",
    techWhitepaperDesc: "সম্পূর্ণ টেকনিক্যাল + সহজ-ইংরেজি পেপার।",

    // DevelopersPanel — item descriptions
    devDocsDesc: "গাইড, RPC রেফারেন্স, SDK।",
    devWhitepaperDesc: "টেকনিক্যাল + সহজ-ইংরেজি v4।",
    devGithubDesc: "Apache-2.0 প্রোটোকল, নোড ও SDK।",
    devTokenDesc: "টোকেনোমিক্স: 50B ক্যাপ, নিঃসরণ, ফি।",
    // DevelopersPanel — feature card
    devFeatureEyebrow: "বিনিয়োগকারী",
    devFeatureTitle: "pitch দেখুন",
    devFeatureBody:
      "একটি ইন্টারঅ্যাক্টিভ, অ্যানিমেটেড বিনিয়োগকারী ডেক — দৃষ্টিভঙ্গি, প্রযুক্তি, টোকেনোমিক্স, প্রস্তাব।",
    devFeatureLink: "ডেক খুলুন →",

    // Footer — link labels not already covered by nav.* keys
    footerRoadmap: "রোডম্যাপ",
    footerSecurity: "নিরাপত্তা",
  },
  industriesUi: {
    // index.astro
    eyebrow: "শিল্পখাত",
    h1Lead: "প্রতিটি শিল্পের জন্য PYRAX ব্লকচেইন সমাধান — ",
    h1Highlight: "প্রতিটি শিল্প",
    subtitleCategories: "ক্যাটাগরি",
    subtitleBusinessTypes: "ব্যবসার ধরন।",
    subtitleTail:
      " প্রতিটি বর্তমান বাজার প্রক্ষেপণ, সুনির্দিষ্ট PYRAX ইন্টিগ্রেশন, এবং buildathon-প্রস্তুত dApp আইডিয়া সহ।",
    allTen: "সব 10 →",

    // [category].astro
    allIndustries: "← সব শিল্পখাত",
    cardCta: "আর্থিক · ইন্টিগ্রেশন · dApp →",

    // [category]/[business].astro
    breadcrumbIndustries: "শিল্পখাত",
    onPyrax: "PYRAX-এ",
    marketSizeLabel: "বাজারের আকার",
    projectionLabel: "প্রক্ষেপণ",
    theMarket: "বাজার",
    sourcePrefix: "সূত্র:",
    figuresNote: "পরিসংখ্যান নির্দেশক এবং প্রসঙ্গের জন্য দেওয়া হয়েছে।",
    whatsBroken: "আজ যা ভাঙা",
    howPyraxTransforms: "PYRAX কীভাবে এটি রূপান্তরিত করে",
    solutionsSubtitle: "এই ব্যবসায় ম্যাপ করা সুনির্দিষ্ট নেটওয়ার্ক উপাদান।",
    buildathonTitle: "Buildathon: dApp আইডিয়া",
    buildathonSubtitlePrefix: "শিপ-প্রস্তুত ধারণা ",
    buildathonSubtitleSuffix: " PYRAX-এ।",
    startBuilding: "তৈরি করা শুরু করুন →",
    briefInProgress: "বিস্তারিত brief প্রস্তুত হচ্ছে",
    briefBodyPrefix: " সম্পূর্ণ বাজার বিশ্লেষণ, PYRAX ইন্টিগ্রেশন ম্যাপ, এবং buildathon dApp আইডিয়া ",
    briefBodySuffix: " চূড়ান্ত করা হচ্ছে।",
    backToPrefix: "ফিরে যান ",
    backToSuffix: " →",
    allCategoryPrefix: "সব ",
  },
  companyPage: {
    eyebrow: "কোম্পানি",
    headingPre: "অর্থ যা ",
    headingWord1: "ব্যক্তিগত",
    headingMid: ", অবকাঠামো যা ",
    headingWord2: "অপ্রতিরোধ্য",
    subtitle:
      "PYRAX-এর অস্তিত্ব ব্যক্তিগত, উচ্চ-থ্রুপুট, যাচাইযোগ্য মূল্য স্থানান্তরকে ডিফল্ট করার জন্য — এবং একই rail-এ একটি যাচাইযোগ্য কম্পিউট অর্থনীতি স্থাপনের জন্য। আমরা প্রকাশ্যে তৈরি করি এবং একটি বাহ্যিক অডিট দিয়ে নিজেদের mainnet-এর দিকে নিয়ন্ত্রিত করি।",

    principle1Title: "ডিফল্টভাবে ব্যক্তিগত",
    principle1Desc:
      "আর্থিক গোপনীয়তা একটি অধিকার, একটি premium ফিচার নয়। ব্যবহারকারী অন্যথা বেছে না নিলে প্রতিটি ট্রান্সফার shielded — এবং অডিটররা এখনও viewing key দিয়ে যাচাই করতে পারে।",
    principle2Title: "সত্যিকারভাবে বিকেন্দ্রীভূত",
    principle2Desc:
      "কোনো কোম্পানি-পরিচালিত bootstrap সার্ভার নেই, mainnet-এ কোনো বিশেষাধিকারপ্রাপ্ত key নেই। PYRAX যদি গুরুত্বপূর্ণ হয়, তবে এটিকে আমাদের ছাড়াই টিকে থাকতে হবে।",
    principle3Title: "প্রমাণ করুন, প্রতিশ্রুতি নয়",
    principle3Desc:
      "এই সাইটের দাবিগুলো আপনি পড়তে পারেন এমন কোডে ম্যাপ করে। সরবরাহ সীমা কনসেনসাসে বাধ্যতামূলক; ফলাফল ক্রিপ্টোগ্রাফিক প্রমাণ সহ আসে।",
    principle4Title: "Open-core",
    principle4Desc:
      "প্রোটোকল, নোড, এবং SDK হলো Apache-2.0। আমরা এক্সিকিউশন ও ecosystem-এ প্রতিযোগিতা করি, গোপনীয়তায় নয়।",

    fact1Label: "PYRX হার্ড ক্যাপ, কনসেনসাসে বাধ্যতামূলক",
    fact2Label: "একটি বাইনারি থেকে নেটওয়ার্ক",
    fact3Label: "EVM · WASM · Cairo",
    fact4Label: "open-core প্রোটোকল",

    missionTitle: "আমাদের mission",
    missionPara1:
      "পাবলিক ব্লকচেইন একটি মিথ্যা পছন্দ চাপিয়ে দিয়েছে: স্বচ্ছতা যা আপনার পুরো আর্থিক জীবন ফাঁস করে, অথবা গোপনীয়তা টুল যা পরে ভাবনা হিসেবে জুড়ে দেওয়া। PYRAX এই আপস প্রত্যাখ্যান করে। একটি GhostDAG প্যারালাল কাজের থ্রুপুট দেয়; ডিফল্টভাবে-shielded ট্রান্সফার না চেয়েই গোপনীয়তা দেয়; একটি multi-VM এক্সিকিউশন স্তর ডেভেলপারদের সেখানেই দেখা করে যেখানে তারা আছে; এবং PYRAX Compute অলস GPU-কে এমন কম্পিউটের একটি মার্কেটে পরিণত করে যা আপনি সত্যিই যাচাই করতে পারেন।",
    missionPara2:
      "আমরা পথটি নিয়ে ইচ্ছাকৃতভাবে নিরাভরণ: আজ চলমান একটি বিশ্বস্ত সিমুলেশন, একটি ক্লোজড আলফা, একটি পাবলিক testnet, এবং আসল মূল্য বহনের আগে একটি একক বাহ্যিক অডিট।",

    believeTitle: "আমরা যা বিশ্বাস করি",

    contactTeamTitle: "টিম ও ক্যারিয়ার",
    contactTeamBody: "gated টিম পোর্টাল — PYRAX তৈরিকারী অবদানকারী ও সহযোগীদের জন্য।",
    contactTeamLink: "টিম পোর্টাল →",
    contactGetInTouchTitle: "যোগাযোগ করুন",
    contactGetInTouchBody: "অংশীদারিত্ব, প্রেস, এবং ecosystem অনুসন্ধান।",
    contactGetInTouchLink: "hello@pyrax.org →",
    contactSourceTitle: "সোর্স পড়ুন",
    contactSourceBody: "এই সাইটের সবকিছু open-core কোডে ম্যাপ করে। যাচাই করুন।",
    contactSourceLink: "GitHub →",

    ctaPitch: "বিনিয়োগকারী pitch দেখুন →",
    ctaWhitepaper: "whitepaper পড়ুন",
  },
  wpPage: {
    eyebrow: "Whitepaper",
    eyebrowVersion: "v4",
    headingPre: "একটি সিস্টেম যা ",
    headingWord: "তৈরি",
    headingPost: ", কেবল পরিকল্পিত নয়",
    subtitle:
      "v4 PYRAX-কে যেভাবে আজ বাস্তবায়িত সেভাবেই নির্দিষ্ট করে — চারটি chainspec জুড়ে একটি বাইনারি, আসল primitive-এর ওপর একটি বিশ্বস্ত সিমুলেশন, production কনসেনসাস পথ end-to-end wired এবং বাহ্যিক অডিটের পিছনে যা নিয়ন্ত্রিত থাকে সে সম্পর্কে সৎ।",
    downloadTechnical: "টেকনিক্যাল পেপার ডাউনলোড করুন",
    downloadPlain: "সহজ-ইংরেজি সংস্করণ",

    abstractLabel: "সারসংক্ষেপ",
    abstractPara1a:
      "PYRAX হলো একটি from-scratch, Rust-এ বাস্তবায়িত Layer-1, চারটি বৈশিষ্ট্যের চারপাশে সংগঠিত যা বেশিরভাগ নেটওয়ার্ক জুড়ে দেয় কিন্তু PYRAX invariant হিসেবে বাধ্যতামূলক করে: ",
    abstractPara1b:
      "উচ্চ থ্রুপুট, ডিফল্টভাবে গোপনীয়তা, সম্পূর্ণ বিকেন্দ্রীকরণ, এবং ISP-স্তরের নজরদারির প্রতি প্রতিরোধ।",
    abstractPara1c:
      " কনসেনসাস হলো GhostDAG দ্বারা সাজানো একটি DAG, একটি TriStream মডেল দ্বারা পরিচালিত — চারটি সিল লেনে দুটি proof-of-work পরিবার প্লাস proof-of-stake — এবং BLS-aggregated proof-of-stake BFT দ্বারা চূড়ান্তকৃত।",
    abstractPara2a:
      "মূল্য স্থানান্তর একটি Orchard-স্টাইল নোট মডেল এবং recursive zk-SNARK দিয়ে ডিফল্টভাবে shielded যার কোনো trusted setup প্রয়োজন নেই। পিয়ার স্তরটি bootstrapless, ট্রাফিক একটি onion Sphinx mixnet-এ চলে, এক্সিকিউশন একটি multi-VM L2 (EVM, WASM, Cairo) এবং একটি recursive ZK-rollup L3-এর মাধ্যমে স্কেল করে, এবং যে অলস GPU-গুলো Stream B মাইন করে সেগুলোই শক্তি দেয় ",
    abstractPara2c: ", একটি যাচাইযোগ্য অন-চেইন-settle-করা কম্পিউট মার্কেট।",

    northStarsTitle: "পাঁচটি north star",
    northStarsSubtitle:
      "সীমাবদ্ধতা, আকাঙ্ক্ষা নয় — foundation crate-গুলো এগুলো encode করে যাতে প্রতিটি পরবর্তী স্তর এদের বিপরীতে তৈরি হয়।",

    northStar1Title: "DAG, একটি চেইন নয়",
    northStar1Desc:
      "GhostDAG দ্বারা সাজানো একটি multi-parent DAG — সৎ প্যারালাল কাজ অন্তর্ভুক্ত হয়, orphan হয় না।",
    northStar2Title: "ডিফল্টভাবে গোপনীয়তা",
    northStar2Desc:
      "ডিফল্ট লেনদেন no-trusted-setup zk-SNARK দিয়ে প্রেরক, প্রাপক, এবং পরিমাণ গোপন করে। স্বচ্ছ হলো ব্যতিক্রম।",
    northStar3Title: "কোনো boot node নেই",
    northStar3Desc:
      "পিয়ার আবিষ্কার bootstrapless — mDNS, Kademlia, peer exchange, এবং একটি স্বাক্ষরিত seed তালিকা। যোগ দেওয়ার মতো কোনো প্রকল্প সার্ভার নেই।",
    northStar4Title: "ISP-প্রতিরোধ",
    northStar4Desc:
      "ট্রাফিক ও সেবা নির্দিষ্ট-আকারের প্যাকেট সহ একটি onion Sphinx mixnet-এ চলে — একজন পর্যবেক্ষক কেবল অভিন্ন এনক্রিপ্টেড প্রবাহ দেখে।",
    northStar5Title: "উন্মুক্ত ও যাচাইযোগ্য",
    northStar5Desc:
      "প্রোটোকল, কনসেনসাস, ZK সার্কিট, CLI, এবং SDK হলো Apache-2.0। গোপন নিয়মসহ একটি চেইন trustless নয়।",

    toc1: "Design Goals — Five North Stars",
    toc2: "Architecture Overview",
    toc3: "Performance & Scalability",
    toc4: "Consensus: GhostDAG + TriStream + BLS PoS",
    toc5: "Privacy: Shielded by Default",
    toc6: "Execution: Multi-VM L2",
    toc7: "L3 — Recursive ZK Rollup",
    toc8: "Networking: Bootstrapless",
    toc9: "Metadata Privacy & Anonymous Services",
    toc10: "State, Storage & Proofs",
    toc11: "PYRAX Compute — Verifiable Compute",
    toc12: "Crucible — Zero-Fee Mining",
    toc13: "NOVA — Autonomous Operations",
    toc14: "Tokenomics",
    toc15: "Governance & the DAO",
    toc16: "The Four Networks",
    toc17: "Wallet, Apps, CLI & SDK",
    toc18: "RPC Surface",
    toc19: "Cryptographic Primitives",

    editionsTitle: "দুটি সংস্করণ",
    editionsBody:
      "টেকনিক্যাল পেপার হলো সম্পূর্ণ specification। সহজ-ইংরেজি সংস্করণ গণিত ছাড়াই একই সিস্টেম ব্যাখ্যা করে — PYRAX আপনার কাছে নতুন হলে সেখান থেকে শুরু করুন।",
    editionTechnicalTitle: "টেকনিক্যাল পেপার",
    editionTechnicalCaption: "19 সেকশন · সম্পূর্ণ specification · Markdown",
    editionPlainTitle: "সহজ-ইংরেজি সংস্করণ",
    editionPlainCaption: "একই সিস্টেম, কোনো সমীকরণ নেই · Markdown",
    contentsLabel: "টেকনিক্যাল পেপার · বিষয়সূচি",
    technologyLink: "ইন্টারঅ্যাক্টিভ ভ্রমণ পছন্দ? প্রযুক্তি দেখুন →",
  },
  notFound: {
    heading: "এই ব্লকটি orphan হয়ে গেছে",
    body: "আপনি যে পৃষ্ঠাটি খুঁজছেন তা DAG-এ নেই। চলুন আপনাকে একটি নিশ্চিত পথে ফিরিয়ে নিই।",
    linkHome: "হোম",
    linkTechnology: "প্রযুক্তি",
    linkIndustries: "শিল্পখাত",
    linkToken: "টোকেন",
    linkWhitepaper: "Whitepaper",
  },
  pitch: {
    // cover slide
    coverTitlePre: "ভবিষ্যৎ যেমন ",
    coverTitleFlame: "দাবি করে তেমন",
    coverSubtitle:
      "ডিফল্টভাবে ব্যক্তিগত। নকশায় প্যারালাল। প্রমাণে যাচাইযোগ্য। AI কম্পিউটের জন্য একটি বিল্ট-ইন মার্কেট সহ একটি from-scratch Layer-1।",
    coverInvestorDeck: "বিনিয়োগকারী ডেক",

    // kickers
    kickerProblem: "সমস্যা",
    kickerSolution: "সমাধান",
    kickerTechnology: "প্রযুক্তি",
    kickerMarket: "এখনই কেন",
    kickerCompute: "wedge",
    kickerTraction: "Traction",
    kickerTokenomics: "টোকেনোমিক্স",
    kickerRoadmap: "রোডম্যাপ",
    kickerAsk: "প্রস্তাব",

    // problem slide
    problemTitle: "পাবলিক ব্লকচেইন একটি মিথ্যা পছন্দ চাপিয়ে দেয়",
    problemCard1Title: "গোপনীয়তা নাকি স্বচ্ছতা",
    problemCard1Desc:
      "স্বচ্ছ চেইন আপনার পুরো আর্থিক জীবন ফাঁস করে। জুড়ে-দেওয়া গোপনীয়তা এমন একটি পরের ভাবনা যা নিয়ন্ত্রকরা অডিট করতে পারে না।",
    problemCard2Title: "গতি নাকি নিরাপত্তা",
    problemCard2Desc:
      "রৈখিক চেইন নিরাপদ থাকতে সৎ কাজ orphan করে, থ্রুপুটকে আসল অ্যাপ্লিকেশনের প্রয়োজনের অনেক নিচে সীমাবদ্ধ করে।",
    problemCard3Title: "শুধু নামেই বিকেন্দ্রীভূত",
    problemCard3Desc:
      "বেশিরভাগ নেটওয়ার্ক কোম্পানি-পরিচালিত bootstrap সার্ভার এবং বিশেষাধিকারপ্রাপ্ত key-এর ওপর নির্ভর করে — ব্যর্থতা ও নিয়ন্ত্রণের একক বিন্দু।",

    // solution slide
    solutionTitle: "PYRAX আপস প্রত্যাখ্যান করে",
    solutionBody:
      "প্যারালাল থ্রুপুটের জন্য একটি GhostDAG, অডিটর viewing key সহ ডিফল্টভাবে-shielded গোপনীয়তা, তিনটি ভার্চুয়াল মেশিন, এবং একটি যাচাইযোগ্য কম্পিউট মার্কেট — সর্বনিম্ন-স্তরের টাইপে invariant হিসেবে বাধ্যতামূলক।",
    solutionCard1Title: "প্যারালাল",
    solutionCard1Desc: "GhostDAG সৎ কাজকে orphan না করে অন্তর্ভুক্ত করে।",
    solutionCard2Title: "ব্যক্তিগত",
    solutionCard2Desc: "প্রতিটি ট্রান্সফার প্রেরক, প্রাপক, পরিমাণ গোপন করে — ডিফল্টভাবে।",
    solutionCard3Title: "বিকেন্দ্রীভূত",
    solutionCard3Desc: "কোনো bootstrap সার্ভার নেই। ISP-প্রতিরোধী Sphinx mixnet।",
    solutionCard4Title: "যাচাইযোগ্য",
    solutionCard4Desc: "Open-core, অডিট-নিয়ন্ত্রিত, প্রতিশ্রুতির চেয়ে প্রমাণ।",

    // technology slide
    techTitle: "একটি বাইনারি, একটি সম্পূর্ণ stack",
    techCard1Title: "GhostDAG + TriStream",
    techCard1Desc:
      "পাঁচটি সিল লেনে তিনটি স্ট্রিম — ASIC, GPU, CPU — প্লাস BLS proof-of-stake চূড়ান্ততা।",
    techCard2Title: "ডিফল্টভাবে shielded",
    techCard2Desc:
      "Orchard-স্টাইল নোট এবং কোনো trusted setup ছাড়া recursive zk-SNARK; তদারকির জন্য viewing key।",
    techCard3Title: "Multi-VM L2 + ZK-rollup L3",
    techCard3Desc:
      "EVM, WASM, এবং Cairo cross-VM কল সহ; হাজার হাজার প্রমাণ একটিতে ভাঁজ হয়।",
    techCard4Title: "PYRAX Compute কম্পিউট মার্কেট",
    techCard4Desc:
      "অলস GPU যাচাইযোগ্য AI জব চালায়, অন-চেইনে settle, একটি নির্দিষ্ট 8 PYRX প্রতি compute unit-এ দামযুক্ত।",
    techFootnotePre: "51%-প্রতিরোধ ",
    techFootnoteEmph: "তিনটি অসম্পর্কিত রিসোর্স",
    techFootnotePost:
      " জুড়ে একসঙ্গে — ASIC + GPU/CPU hashpower এবং একটি স্টেক-করা সুপারমেজরিটি — এমন চূড়ান্ততা সহ যা ফেরানোকে একটি slashable অপরাধ বানায়।",

    // market slide
    marketTitle: "মাল্টি-ট্রিলিয়ন-ডলার মার্কেট, একটি চেইন",
    marketBodyPre: "PYRAX সরাসরি playbook শিপ করে ",
    marketBodyMid: " ব্যবসার ধরনের জন্য ",
    marketBodyPost:
      " শিল্প জুড়ে — প্রতিটি বাজার প্রক্ষেপণ, সুনির্দিষ্ট ইন্টিগ্রেশন, এবং buildathon dApp আইডিয়া সহ।",
    marketRef1Label: "2030-এর মধ্যে টোকেনাইজড রিয়েল-ওয়ার্ল্ড অ্যাসেট",
    marketRef1Source: "BCG",
    marketRef2Label: "2030-এর মধ্যে AI মার্কেট",
    marketRef2Source: "Statista / Grand View",
    marketRef3Label: "2030-এর মধ্যে গ্লোবাল ডিজিটাল পেমেন্ট",
    marketRef3Source: "Statista",
    marketRef4Label: "PYRAX যে ব্যবসার ধরন সরাসরি ম্যাপ করে",
    marketRef4Source: "এই সাইট",

    // PYRAX Compute slide
    computeTitle: "PYRAX Compute — যাচাইযোগ্য কম্পিউট",
    computeBody:
      "যে GPU-গুলো চেইন সুরক্ষিত করে সেগুলোই পেইড AI ও কম্পিউট জব চালায়। একটি চার-ধাপের যাচাই সিঁড়ি অন্ধ বিশ্বাস প্রতিস্থাপন করে — এবং চাহিদা বিস্ফোরিত হচ্ছে।",
    computeTile1Label: "প্রতি compute unit (নির্দিষ্ট)",
    computeTile2Label: "bootstrap কম্পিউট pool",
    computeTile3Label: "যাচাই সিঁড়ি",
    computeTile4Label: "local-first বেসলাইন GPU",
    computeFooter:
      "একটি ক্রিপ্টো-অর্থনৈতিক AI-compute নেটওয়ার্ক যা প্রদানকারীদের সেই একই টোকেনে পরিশোধ করে যা কনসেনসাস সুরক্ষিত করে — একটি স্ব-শক্তিশালীকারী flywheel।",

    // traction slide
    tractionTitle: "তৈরি, পরিকল্পিত নয়",
    tractionBody:
      "v4 whitepaper এমন একটি সিস্টেম বর্ণনা করে যা যথেষ্ট পরিমাণে বাস্তবায়িত ও পরীক্ষিত — আজ আসল primitive-এর ওপর একটি বিশ্বস্ত সিমুলেশন হিসেবে চলছে, production কনসেনসাস পথ end-to-end wired সহ।",
    builtLabel1: "একটি Rust বাইনারি থেকে নেটওয়ার্ক",
    builtLabel2: "EVM · WASM · Cairo, cross-VM",
    builtLabel3: "TPS নকশা লক্ষ্য (GhostDAG)",
    builtLabel4: "ডিফল্টভাবে shielded, কোনো trusted setup নেই",
    builtLabel5: "শিল্প playbook + dApp আইডিয়া",
    builtLabel6: "নোড, ওয়ালেট, CLI, explorer — লাইভ",

    // tokenomics slide
    tokenomicsTitle: "একটি নির্দিষ্ট 50B সরবরাহ, হিমায়িত নিয়ম",
    tokenomicsHardCap: "হার্ড ক্যাপ",
    tokenomicsGenesisSuffix: "/PYRX genesis",
    tokenomicsBaseFeePre: "বেস ফি ",
    tokenomicsBaseFeePost: "% burned",
    tokenomicsFeeSplit: "ফি বিভাজন চিরতরে হিমায়িত",

    // roadmap slide
    roadmapTitle: "mainnet-এর দিকে অডিট-নিয়ন্ত্রিত",
    roadmapLive: "LIVE",
    roadmapPlanned: "PLANNED",
    roadmapGateLabel: "গেট:",
    roadmapGateBody:
      "কনসেনসাস, ZK সার্কিট, এবং bridge-এর একটি একক বাহ্যিক অডিট। আসল মূল্য বহনকারী কিছুই এটি পাস করার আগে শিপ হয় না।",

    // ask slide
    askTitle: "PYRAX One-এর launch অর্থায়ন করুন",
    askGenesisEvent: "Genesis ইভেন্ট",
    askGenesisBody:
      "$0.0025-এ 20B PYRX, প্লাস একটি 25% utility বোনাস (5B PYRX) — অংশগ্রহণকারীরা নেটওয়ার্ক অ্যাক্সেস ও compute credit-এ 25B পান। কখনোই একটি বিনিয়োগ রিটার্ন হিসেবে উপস্থাপিত নয়।",
    askUseOfFunds: "তহবিলের ব্যবহার",
    askFund1: "বাহ্যিক অডিট + mainnet genesis ceremony",
    askFund2: "Ecosystem, liquidity ও buildathon grant",
    askFund3: "PYRAX Compute কম্পিউট বিল্ডআউট এবং প্রদানকারী incentive",
    askFund4: "কোর প্রোটোকল, অ্যাপ, এবং গ্লোবাল টিম",
    askEmailButton: "invest@pyrax.org",
    askLiveButton: "লাইভ দেখুন",

    // controls
    ctrlPrev: "পূর্ববর্তী",
    ctrlNext: "পরবর্তী",
    ctrlPrevAria: "পূর্ববর্তী স্লাইড",
    ctrlNextAria: "পরবর্তী স্লাইড",
  },
  tokData: {
    // ALLOCATIONS — label + note, in array order
    alloc0Label: "পাবলিক বণ্টন",
    alloc0Note: "Genesis ইভেন্ট — বিক্রীত + 25% utility বোনাস",
    alloc1Label: "মাইনিং নিঃসরণ",
    alloc1Note: "~26 yr ধরে coinbase-এ mint করা; একমাত্র মুদ্রাস্ফীতি",
    alloc2Label: "Ecosystem ও liquidity",
    alloc2Note: "TGE-তে 40% + 24 মাসে 60% linear",
    alloc3Label: "AI-Compute pool",
    alloc3Note: "48 মাসে stream করা; PYRAX Compute payout-এ অর্থায়ন করে",
    alloc4Label: "টিম ও উপদেষ্টা",
    alloc4Note: "12-month cliff, তারপর 36-month linear",
    alloc5Label: "DAO treasury ও reserve",
    alloc5Note: "TGE-তে 10% liquid; চলমানভাবে ফি অংশ accrue করে",
    // GENESIS
    genesisSold: "20B PYRX @ $0.0025 = $50,000,000",
    genesisBonus:
      "25% utility বোনাস (5B PYRX) — নেটওয়ার্ক অ্যাক্সেস / compute credit, কখনোই একটি return নয়",
    genesisReceived: "genesis অংশগ্রহণকারীদের কাছে 25B PYRX (সম্পূর্ণ পাবলিক pool)",
    // EMISSIONS
    emInitialSubsidy: "300 PYRX / block",
    emHalving: "প্রতি 21,000,000 block (~4 years)",
    emCap: "12.5B মাইনকৃত, তারপর শুধু ফি",
    emToCap: "ক্যাপ পর্যন্ত ~26 years · প্রথম ~8 years-এ ~80%",
    emSplit: "প্রতি স্ট্রিমে emergent এক-তৃতীয়াংশ (প্রতিটি স্ট্রিম ব্লকের ≈⅓ মাইন করে)",
    // FEES — labels are looked up by the English text (unique set)
    feeBurned: "Burned",
    feePyraxTreasury: "PYRAX treasury",
    feeDao: "DAO",
    feeBlockProducer: "ব্লক প্রযোজক",
    feeShielded: "সমান shielded ফি (100 base units) প্রতি shielded ট্রান্সফারে burn করা হয়",
    feeGasLimit: "30,000,000 block gas · বেস ফি প্রতি ব্লকে ±12.5% সরে",
    // STAKING
    stakeMinStake: "32 PYRX",
    stakeUnbonding: "~7 days",
    stakeSlash: "5% equivocation slash + 10% রিপোর্টার বাউন্টি",
    stakeEarns: "Stream-C emission অংশ · 70% প্রযোজক tip · staking পুরস্কার",
    // GOVERNANCE
    govParam0: "block_gas_limit (≤ 64×)",
    govParam1: "min_validator_stake (≤ 1024×)",
    govParam2: "unbonding_period (≤ 64×)",
    govDeposit: "1,000 PYRX (quorum ব্যর্থ হলে burned, নইলে ফেরত)",
    govQuorum: "≥ 1/3 bonded স্টেক",
    govPass: "> 2/3 ভোটিং স্টেক",
    govFrozen:
      "ফি বিভাজন, 12.5B emission ক্যাপ + halving, এবং গভর্ন্যান্স নিয়মগুলো নিজেই — চিরতরে হিমায়িত",
    // COMPUTE
    computePerCu: "8 PYRX / CU",
    computeCu: "1 CU = 1 reference-GPU-hour (RTX-4090-class)",
    computePoolBudget: "~70M PYRX / month (4B ÷ ~57 months)",
    computeDrawdownCap: "প্রতি জবে 10,000 PYRX (1,250 CU)",
    computeUsd: "genesis মূল্যে ≈ $0.02 / GPU-hour",
    computeTransition:
      "4B pool থেকে bootstrap → coverage বাড়ার সাথে revenue-funded → অব্যয়িত DAO-তে ফেরে",
  },
};


