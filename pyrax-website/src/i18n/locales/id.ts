// SPDX-License-Identifier: LicenseRef-Proprietary
import type { Dict } from "./en";
type LocaleDict = { [K in keyof Dict]?: Partial<Dict[K]> };
export const id: LocaleDict = {
  meta: {
    titleSuffix: "PYRAX™ Network",
    description:
      "PYRAX adalah Layer-1 yang dibangun dari nol: blockDAG GhostDAG, privat secara bawaan, sepenuhnya terdesentralisasi, tahan-ISP — dengan marketplace komputasi AI yang dapat diverifikasi. Target 500,000+ TPS.",
  },
  nav: {
    products: "Produk",
    industries: "Industri",
    technology: "Teknologi",
    developers: "Pengembang",
    network: "Jaringan",
    token: "Token",
    company: "Perusahaan",
    launchApp: "Jalankan Aplikasi",
    explorer: "Explorer",
    nodes: "Jalankan Node",
    devnet: "Portal Devnet",
    wallet: "Dompet",
    docs: "Dokumentasi",
    whitepaper: "Whitepaper",
    pitch: "Investor",
    viewAll: "Lihat semua",
    exploreIndustries: "Jelajahi semua 100 industri",
  },
  hero: {
    eyebrow: "Layer-1 yang privat dan paralel",
    title: "Blockchain yang dibangun seperti tuntutan masa depan.",
    subtitle:
      "PYRAX menggantikan rantai tunggal dengan jaring blok GhostDAG — privat secara bawaan, sepenuhnya terdesentralisasi, tahan-ISP, dan dirancang untuk 500,000+ transaksi per detik. Perangkat mining yang menganggur menjadi marketplace komputasi AI yang dapat diverifikasi.",
    ctaPrimary: "Jelajahi jaringan",
    ctaSecondary: "Baca whitepaper",
    liveOn: "Aktif di",
  },
  stats: {
    blockHeight: "Tinggi blok",
    peers: "Peer terhubung",
    tps: "TPS langsung",
    finality: "Finalitas",
    offline: "offline",
    target: "target",
    supplyCap: "Suplai maksimal",
    streams: "Stream mining",
  },
  pillars: {
    title: "Empat invarian, bukan sekadar fitur",
    subtitle:
      "Kebanyakan jaringan menambahkannya belakangan. PYRAX menegakkannya di tipe data paling dasarnya.",
    throughputT: "Throughput tinggi",
    throughputD:
      "BlockDAG GhostDAG menerima banyak blok sekaligus — kerja paralel yang jujur ikut disertakan, bukan menjadi orphan. Target: 500,000+ TPS sebagai agregat terukur dan ter-benchmark.",
    privacyT: "Privat secara bawaan",
    privacyD:
      "Setiap transfer terlindungi secara bawaan dengan bukti zero-knowledge tanpa trusted-setup. Pengirim, penerima, dan jumlah disembunyikan. Transparan menjadi pengecualian yang eksplisit.",
    decentralT: "Sepenuhnya terdesentralisasi",
    decentralD:
      "Penemuan peer tanpa bootstrap — tidak ada server awal yang dikelola perusahaan pada jalur kritis untuk bergabung. Tiga stream mining yang tidak berkorelasi ditambah finalitas proof-of-stake BLS.",
    ispT: "Tahan-ISP",
    ispD:
      "Trafik melewati mixnet onion Sphinx dengan paket berukuran tetap dan cover traffic, sehingga pengamat di jalur — termasuk ISP Anda — hanya melihat aliran terenkripsi yang seragam.",
  },
  cta: {
    buildTitle: "Bangun di atas PYRAX",
    buildBody:
      "EVM, WASM, dan Cairo — tiga virtual machine, satu rantai. Bawa perangkat Ethereum Anda atau tulis kontrak yang dapat dibuktikan.",
    build: "Mulai membangun",
    industriesTitle: "PYRAX untuk industri Anda",
    industriesBody:
      "100 industri dipetakan ke integrasi PYRAX yang konkret, proyeksi pasar terkini, dan ide dApp yang siap untuk buildathon.",
  },
  footer: {
    tagline:
      "Throughput tinggi · privat secara bawaan · sepenuhnya terdesentralisasi · tahan-ISP · open-core.",
    product: "Produk",
    developers: "Pengembang",
    network: "Jaringan",
    community: "Komunitas",
    resources: "Sumber Daya",
    rights: "Semua hak dilindungi.",
    openCore:
      "Protokol terbuka di bawah Apache-2.0. Aplikasi, dompet, NEURAX & layanan bersifat proprietary. PYRAX™ adalah merek dagang.",
    selectLanguage: "Bahasa",
    selectNetwork: "Jaringan",
  },
  common: {
    learnMore: "Pelajari lebih lanjut",
    getStarted: "Mulai",
    comingSoon: "Segera hadir",
    live: "Aktif",
    audited: "Menunggu audit",
  },
};
