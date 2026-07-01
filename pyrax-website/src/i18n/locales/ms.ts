// SPDX-License-Identifier: LicenseRef-Proprietary
import type { Dict } from "./en";
type LocaleDict = { [K in keyof Dict]?: Partial<Dict[K]> };
export const ms: LocaleDict = {
  meta: {
    titleSuffix: "PYRAX™ Network",
    description:
      "PYRAX ialah Layer-1 yang dibina dari awal: blockDAG GhostDAG, peribadi secara lalai, terdesentralisasi sepenuhnya, tahan-ISP — dengan pasaran pengkomputeran AI yang boleh disahkan. Sasaran 500,000+ TPS.",
  },
  nav: {
    products: "Produk",
    industries: "Industri",
    technology: "Teknologi",
    developers: "Pembangun",
    network: "Rangkaian",
    token: "Token",
    company: "Syarikat",
    launchApp: "Lancarkan Aplikasi",
    explorer: "Explorer",
    nodes: "Jalankan Node",
    devnet: "Portal Devnet",
    wallet: "Dompet",
    docs: "Dokumentasi",
    whitepaper: "Whitepaper",
    pitch: "Pelabur",
    viewAll: "Lihat semua",
    exploreIndustries: "Terokai kesemua 100 industri",
  },
  hero: {
    eyebrow: "Layer-1 yang peribadi dan selari",
    title: "Blockchain yang dibina seperti tuntutan masa depan.",
    subtitle:
      "PYRAX menggantikan rantaian tunggal dengan jaringan blok GhostDAG — peribadi secara lalai, terdesentralisasi sepenuhnya, tahan-ISP, dan direka bentuk untuk 500,000+ transaksi sesaat. Perkakasan perlombongan yang terbiar menjadi pasaran pengkomputeran AI yang boleh disahkan.",
    ctaPrimary: "Terokai rangkaian",
    ctaSecondary: "Baca whitepaper",
    liveOn: "Aktif di",
  },
  stats: {
    blockHeight: "Ketinggian blok",
    peers: "Peer bersambung",
    tps: "TPS langsung",
    finality: "Kemuktamadan",
    offline: "luar talian",
    target: "sasaran",
    supplyCap: "Bekalan maksimum",
    streams: "Strim perlombongan",
  },
  pillars: {
    title: "Empat invarian, bukan ciri semata-mata",
    subtitle:
      "Kebanyakan rangkaian menambahnya kemudian. PYRAX menguatkuasakannya dalam jenis data paling asasnya.",
    throughputT: "Throughput tinggi",
    throughputD:
      "BlockDAG GhostDAG menerima banyak blok serentak — kerja selari yang jujur turut dimasukkan, bukan menjadi orphan. Sasaran: 500,000+ TPS sebagai agregat yang diukur dan di-benchmark.",
    privacyT: "Peribadi secara lalai",
    privacyD:
      "Setiap pemindahan dilindungi secara lalai dengan bukti zero-knowledge tanpa trusted-setup. Penghantar, penerima, dan jumlah disembunyikan. Telus menjadi pengecualian yang eksplisit.",
    decentralT: "Terdesentralisasi sepenuhnya",
    decentralD:
      "Penemuan peer tanpa bootstrap — tiada pelayan permulaan yang dikendalikan syarikat pada laluan kritikal untuk menyertai. Tiga strim perlombongan yang tidak berkorelasi ditambah kemuktamadan proof-of-stake BLS.",
    ispT: "Tahan-ISP",
    ispD:
      "Trafik menempuh mixnet onion Sphinx dengan paket bersaiz tetap dan cover traffic, jadi pemerhati di laluan — termasuk ISP anda — hanya melihat aliran tersulit yang seragam.",
  },
  cta: {
    buildTitle: "Bina di atas PYRAX",
    buildBody:
      "EVM, WASM, dan Cairo — tiga virtual machine, satu rantaian. Bawa perkakas Ethereum anda atau tulis kontrak yang boleh dibuktikan.",
    build: "Mula membina",
    industriesTitle: "PYRAX untuk industri anda",
    industriesBody:
      "100 industri dipetakan kepada integrasi PYRAX yang konkrit, unjuran pasaran terkini, dan idea dApp yang bersedia untuk buildathon.",
  },
  footer: {
    tagline:
      "Throughput tinggi · peribadi secara lalai · terdesentralisasi sepenuhnya · tahan-ISP · open-core.",
    product: "Produk",
    developers: "Pembangun",
    network: "Rangkaian",
    community: "Komuniti",
    resources: "Sumber",
    rights: "Hak cipta terpelihara.",
    openCore:
      "Protokol terbuka di bawah Apache-2.0. Aplikasi, dompet, NEURAX & perkhidmatan bersifat proprietary. PYRAX™ ialah tanda dagangan.",
    selectLanguage: "Bahasa",
    selectNetwork: "Rangkaian",
  },
  common: {
    learnMore: "Ketahui lebih lanjut",
    getStarted: "Mulakan",
    comingSoon: "Akan datang",
    live: "Aktif",
    audited: "Menunggu audit",
  },
};
