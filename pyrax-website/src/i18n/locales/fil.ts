// SPDX-License-Identifier: LicenseRef-Proprietary
import type { Dict } from "./en";
type LocaleDict = { [K in keyof Dict]?: Partial<Dict[K]> };
export const fil: LocaleDict = {
  meta: {
    titleSuffix: "PYRAX™ Network",
    description:
      "Ang PYRAX ay isang Layer-1 na ginawa mula sa simula: isang GhostDAG blockDAG, pribado bilang default, ganap na desentralisado, ISP-resistant — na may verifiable na AI compute marketplace. Target na 500,000+ TPS.",
  },
  nav: {
    products: "Mga Produkto",
    industries: "Mga Industriya",
    technology: "Teknolohiya",
    developers: "Mga Developer",
    network: "Network",
    token: "Token",
    company: "Kompanya",
    launchApp: "Ilunsad ang App",
    explorer: "Explorer",
    nodes: "Magpatakbo ng Node",
    devnet: "Devnet Portal",
    wallet: "Wallet",
    docs: "Mga Dokumento",
    whitepaper: "Whitepaper",
    pitch: "Mga Mamumuhunan",
    viewAll: "Tingnan lahat",
    exploreIndustries: "Tuklasin ang lahat ng 100 industriya",
  },
  hero: {
    eyebrow: "Ang pribado at parallel na Layer-1",
    title: "Ang blockchain na ginawa ayon sa hinihingi ng hinaharap.",
    subtitle:
      "Pinapalitan ng PYRAX ang iisang chain ng isang GhostDAG web ng mga block — pribado bilang default, ganap na desentralisado, ISP-resistant, at idinisenyo para sa 500,000+ na transaksyon kada segundo. Ang idle na mining hardware ay nagiging verifiable na AI compute marketplace.",
    ctaPrimary: "Tuklasin ang network",
    ctaSecondary: "Basahin ang whitepaper",
    liveOn: "Live sa",
  },
  stats: {
    blockHeight: "Block height",
    peers: "Mga nakakonektang peer",
    tps: "Live na TPS",
    finality: "Finality",
    offline: "offline",
    target: "target",
    supplyCap: "Pinakamataas na supply",
    streams: "Mga mining stream",
  },
  pillars: {
    title: "Apat na invariant, hindi mga feature",
    subtitle:
      "Karamihan sa mga network ay idinadagdag lang ito. Ipinatutupad ng PYRAX ang mga ito sa pinakamababang antas ng mga uri ng data nito.",
    throughputT: "Mataas na throughput",
    throughputD:
      "Tumatanggap ang GhostDAG blockDAG ng maraming block nang sabay-sabay — ang tapat na parallel na trabaho ay isinasama, hindi na-oorphan. Target: 500,000+ TPS bilang sinukat at benchmarked na aggregate.",
    privacyT: "Pribado bilang default",
    privacyD:
      "Ang bawat transfer ay shielded bilang default gamit ang no-trusted-setup na zero-knowledge proofs. Ang nagpadala, tumanggap, at halaga ay nakatago. Ang transparent ay ang eksplisitong eksepsiyon.",
    decentralT: "Ganap na desentralisado",
    decentralD:
      "Bootstrapless na peer discovery — walang server na pinapatakbo ng kompanya sa kritikal na landas para sumali. Tatlong hindi magkaugnay na mining stream kasama ang BLS proof-of-stake finality.",
    ispT: "ISP-resistant",
    ispD:
      "Dumadaan ang traffic sa isang onion Sphinx mixnet na may fixed-size na mga packet at cover traffic, kaya't ang isang on-path observer — kasama ang iyong ISP — ay nakakakita lamang ng pare-parehong encrypted na mga daloy.",
  },
  cta: {
    buildTitle: "Mag-build sa PYRAX",
    buildBody:
      "EVM, WASM, at Cairo — tatlong virtual machine, isang chain. Dalhin ang iyong Ethereum tooling o magsulat ng mga provable na kontrata.",
    build: "Simulang mag-build",
    industriesTitle: "PYRAX para sa iyong industriya",
    industriesBody:
      "100 industriya na naka-map sa mga konkretong PYRAX integration, kasalukuyang projection ng merkado, at mga ideya ng dApp na handa para sa buildathon.",
  },
  footer: {
    tagline:
      "Mataas na throughput · pribado bilang default · ganap na desentralisado · ISP-resistant · open-core.",
    product: "Produkto",
    developers: "Mga Developer",
    network: "Network",
    community: "Komunidad",
    resources: "Mga Mapagkukunan",
    rights: "Nakalaan ang lahat ng karapatan.",
    openCore:
      "Bukas na protocol sa ilalim ng Apache-2.0. Ang mga app, wallet, NEURAX at mga serbisyo ay proprietary. Ang PYRAX™ ay isang trademark.",
    selectLanguage: "Wika",
    selectNetwork: "Network",
  },
  common: {
    learnMore: "Matuto pa",
    getStarted: "Magsimula",
    comingSoon: "Malapit nang dumating",
    live: "Live",
    audited: "Naghihintay ng audit",
  },
};
