// SPDX-License-Identifier: LicenseRef-Proprietary
import type { Dict } from "./en";
type LocaleDict = { [K in keyof Dict]?: Partial<Dict[K]> };
export const bn: LocaleDict = {
  meta: {
    titleSuffix: "PYRAX™ Network",
    description:
      "PYRAX হলো একদম নতুন করে তৈরি একটি Layer-1: একটি GhostDAG blockDAG, ডিফল্টভাবে ব্যক্তিগত, সম্পূর্ণ বিকেন্দ্রীভূত, ISP-প্রতিরোধী — সঙ্গে একটি যাচাইযোগ্য AI কম্পিউট মার্কেটপ্লেস। লক্ষ্য 500,000+ TPS।",
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
      "একটি GhostDAG blockDAG একসঙ্গে বহু ব্লক গ্রহণ করে — সৎ প্যারালাল কাজ অন্তর্ভুক্ত হয়, orphan হয় না। লক্ষ্য: পরিমাপকৃত ও benchmark-কৃত সমষ্টি হিসেবে 500,000+ TPS।",
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
      "Apache-2.0-এর অধীনে উন্মুক্ত প্রোটোকল। অ্যাপ, ওয়ালেট, NEURAX ও সেবাসমূহ proprietary। PYRAX™ একটি ট্রেডমার্ক।",
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
};
