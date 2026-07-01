// SPDX-License-Identifier: LicenseRef-Proprietary
import type { Dict } from "./en";
type LocaleDict = { [K in keyof Dict]?: Partial<Dict[K]> };
export const th: LocaleDict = {
  meta: {
    titleSuffix: "PYRAX™ Network",
    description:
      "PYRAX คือ Layer-1 ที่สร้างขึ้นใหม่ตั้งแต่ต้น: blockDAG แบบ GhostDAG ที่เป็นส่วนตัวโดยค่าเริ่มต้น กระจายศูนย์อย่างสมบูรณ์ และต้านทาน ISP — พร้อมตลาดการประมวลผล AI ที่ตรวจสอบได้ เป้าหมาย 500,000+ TPS",
  },
  nav: {
    products: "ผลิตภัณฑ์",
    industries: "อุตสาหกรรม",
    technology: "เทคโนโลยี",
    developers: "นักพัฒนา",
    network: "เครือข่าย",
    token: "โทเคน",
    company: "บริษัท",
    launchApp: "เปิดแอป",
    explorer: "Explorer",
    nodes: "รันโหนด",
    devnet: "พอร์ทัล Devnet",
    wallet: "กระเป๋าเงิน",
    docs: "เอกสาร",
    whitepaper: "Whitepaper",
    pitch: "นักลงทุน",
    viewAll: "ดูทั้งหมด",
    exploreIndustries: "สำรวจทั้ง 100 อุตสาหกรรม",
  },
  hero: {
    eyebrow: "Layer-1 ที่เป็นส่วนตัวและทำงานแบบขนาน",
    title: "บล็อกเชนที่สร้างขึ้นตามที่อนาคตต้องการ",
    subtitle:
      "PYRAX แทนที่เชนเดี่ยวด้วยเว็บของบล็อกแบบ GhostDAG — เป็นส่วนตัวโดยค่าเริ่มต้น กระจายศูนย์อย่างสมบูรณ์ ต้านทาน ISP และออกแบบมาเพื่อรองรับ 500,000+ ธุรกรรมต่อวินาที ฮาร์ดแวร์ขุดที่ว่างอยู่จะกลายเป็นตลาดการประมวลผล AI ที่ตรวจสอบได้",
    ctaPrimary: "สำรวจเครือข่าย",
    ctaSecondary: "อ่าน whitepaper",
    liveOn: "ใช้งานบน",
  },
  stats: {
    blockHeight: "ความสูงบล็อก",
    peers: "เพียร์ที่เชื่อมต่อ",
    tps: "TPS สด",
    finality: "การสรุปผลขั้นสุดท้าย",
    offline: "ออฟไลน์",
    target: "เป้าหมาย",
    supplyCap: "อุปทานสูงสุด",
    streams: "สตรีมการขุด",
  },
  pillars: {
    title: "สี่หลักการที่ไม่แปรผัน ไม่ใช่แค่ฟีเจอร์",
    subtitle:
      "เครือข่ายส่วนใหญ่นำสิ่งเหล่านี้มาเสริมทีหลัง แต่ PYRAX บังคับใช้มันในชนิดข้อมูลระดับต่ำสุด",
    throughputT: "ทรูพุตสูง",
    throughputD:
      "blockDAG แบบ GhostDAG รับบล็อกจำนวนมากได้พร้อมกัน — งานแบบขนานที่ซื่อสัตย์จะถูกรวมเข้าไว้ ไม่ถูกทิ้งเป็น orphan เป้าหมาย: 500,000+ TPS ในฐานะค่ารวมที่วัดและ benchmark ได้",
    privacyT: "เป็นส่วนตัวโดยค่าเริ่มต้น",
    privacyD:
      "ทุกการโอนได้รับการปกป้องโดยค่าเริ่มต้นด้วยพิสูจน์ zero-knowledge แบบไม่ต้อง trusted-setup ผู้ส่ง ผู้รับ และจำนวนเงินจะถูกซ่อนไว้ ความโปร่งใสเป็นข้อยกเว้นที่ต้องระบุอย่างชัดเจน",
    decentralT: "กระจายศูนย์อย่างสมบูรณ์",
    decentralD:
      "การค้นหาเพียร์แบบไม่ต้องมี bootstrap — ไม่มีเซิร์ฟเวอร์เริ่มต้นที่บริษัทเป็นผู้ดำเนินการอยู่บนเส้นทางสำคัญในการเข้าร่วม สามสตรีมการขุดที่ไม่มีความสัมพันธ์กัน บวกกับการสรุปผลขั้นสุดท้ายแบบ proof-of-stake ด้วย BLS",
    ispT: "ต้านทาน ISP",
    ispD:
      "ทราฟฟิกวิ่งผ่าน mixnet onion แบบ Sphinx ด้วยแพ็กเก็ตขนาดคงที่และ cover traffic ดังนั้นผู้สังเกตการณ์บนเส้นทาง — รวมถึง ISP ของคุณ — จะเห็นเพียงกระแสข้อมูลที่เข้ารหัสอย่างสม่ำเสมอเท่านั้น",
  },
  cta: {
    buildTitle: "สร้างบน PYRAX",
    buildBody:
      "EVM, WASM และ Cairo — สาม virtual machine หนึ่งเชน นำเครื่องมือ Ethereum ของคุณมาใช้ หรือเขียนสัญญาที่พิสูจน์ได้",
    build: "เริ่มสร้าง",
    industriesTitle: "PYRAX สำหรับอุตสาหกรรมของคุณ",
    industriesBody:
      "100 อุตสาหกรรมที่จับคู่กับการผสานรวม PYRAX ที่เป็นรูปธรรม การคาดการณ์ตลาดล่าสุด และไอเดีย dApp ที่พร้อมสำหรับ buildathon",
  },
  footer: {
    tagline:
      "ทรูพุตสูง · เป็นส่วนตัวโดยค่าเริ่มต้น · กระจายศูนย์อย่างสมบูรณ์ · ต้านทาน ISP · open-core",
    product: "ผลิตภัณฑ์",
    developers: "นักพัฒนา",
    network: "เครือข่าย",
    community: "ชุมชน",
    resources: "แหล่งข้อมูล",
    rights: "สงวนลิขสิทธิ์ทั้งหมด",
    openCore:
      "โปรโตคอลแบบเปิดภายใต้ Apache-2.0 แอป กระเป๋าเงิน NEURAX และบริการต่าง ๆ เป็น proprietary PYRAX™ เป็นเครื่องหมายการค้า",
    selectLanguage: "ภาษา",
    selectNetwork: "เครือข่าย",
  },
  common: {
    learnMore: "เรียนรู้เพิ่มเติม",
    getStarted: "เริ่มต้นใช้งาน",
    comingSoon: "เร็ว ๆ นี้",
    live: "ใช้งานอยู่",
    audited: "รอการตรวจสอบ",
  },
};
