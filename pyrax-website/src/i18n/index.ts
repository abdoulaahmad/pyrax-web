// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The translation resolver. `useT(lang)` returns a `t("nav.products")` function that reads the locale's
// dictionary and falls back to English key-by-key, so a partially-translated locale never shows a blank.
// Registered locales are added to DICTS as their files land (Phase 6 i18n content); everything else
// renders English until then — no missing strings, ever.
import { en, type Dict } from "./locales/en";
import { DEFAULT_LOCALE } from "./config";
import { zhCN } from "./locales/zh-CN";
import { zhTW } from "./locales/zh-TW";
import { es } from "./locales/es";
import { hi } from "./locales/hi";
import { ar } from "./locales/ar";
import { pt } from "./locales/pt";
import { ru } from "./locales/ru";
import { ja } from "./locales/ja";
import { ko } from "./locales/ko";
import { fr } from "./locales/fr";
import { de } from "./locales/de";
import { tr } from "./locales/tr";
import { vi } from "./locales/vi";
import { id } from "./locales/id";
import { it } from "./locales/it";
import { nl } from "./locales/nl";
import { th } from "./locales/th";
import { fil } from "./locales/fil";
import { uk } from "./locales/uk";
import { pl } from "./locales/pl";
import { fa } from "./locales/fa";
import { bn } from "./locales/bn";
import { ur } from "./locales/ur";
import { ms } from "./locales/ms";
import { he } from "./locales/he";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

// Locale dictionaries. English is complete; others fall back to English key-by-key.
export const DICTS: Record<string, DeepPartial<Dict>> = {
  en,
  "zh-CN": zhCN, "zh-TW": zhTW, es, hi, ar, pt, ru, ja, ko, fr, de, tr, vi,
  id, it, nl, th, fil, uk, pl, fa, bn, ur, ms, he,
};

function resolve(obj: any, path: string): unknown {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** Returns a `t(key)` bound to a locale, with English fallback and an optional literal default. */
export function useT(lang: string) {
  const dict = DICTS[lang] ?? DICTS[DEFAULT_LOCALE];
  return (key: string, fallback?: string): string => {
    const hit = resolve(dict, key);
    if (typeof hit === "string") return hit;
    const enHit = resolve(en, key);
    if (typeof enHit === "string") return enHit;
    return fallback ?? key;
  };
}

export type { Dict };
