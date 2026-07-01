// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Internationalization for the 26 most-used languages in the cryptocurrency space (by adoption +
// audience), path-routed as /<lang>/…. English is the default and the source of truth; other locales
// fall back to English key-by-key until translated. Right-to-left scripts (Arabic, Persian, Urdu,
// Hebrew) set dir="rtl" on <html>.

export interface Locale {
  code: string;      // BCP-47 tag used in the URL and <html lang>
  native: string;    // endonym (shown in the switcher)
  english: string;   // English name
  rtl?: boolean;
}

// Ordered roughly by crypto-market reach. First entry is the default.
export const LOCALES: Locale[] = [
  { code: "en", native: "English", english: "English" },
  { code: "zh-CN", native: "简体中文", english: "Chinese (Simplified)" },
  { code: "zh-TW", native: "繁體中文", english: "Chinese (Traditional)" },
  { code: "es", native: "Español", english: "Spanish" },
  { code: "hi", native: "हिन्दी", english: "Hindi" },
  { code: "ar", native: "العربية", english: "Arabic", rtl: true },
  { code: "pt", native: "Português", english: "Portuguese" },
  { code: "ru", native: "Русский", english: "Russian" },
  { code: "ja", native: "日本語", english: "Japanese" },
  { code: "ko", native: "한국어", english: "Korean" },
  { code: "fr", native: "Français", english: "French" },
  { code: "de", native: "Deutsch", english: "German" },
  { code: "tr", native: "Türkçe", english: "Turkish" },
  { code: "vi", native: "Tiếng Việt", english: "Vietnamese" },
  { code: "id", native: "Bahasa Indonesia", english: "Indonesian" },
  { code: "it", native: "Italiano", english: "Italian" },
  { code: "nl", native: "Nederlands", english: "Dutch" },
  { code: "th", native: "ไทย", english: "Thai" },
  { code: "fil", native: "Filipino", english: "Filipino" },
  { code: "uk", native: "Українська", english: "Ukrainian" },
  { code: "pl", native: "Polski", english: "Polish" },
  { code: "fa", native: "فارسی", english: "Persian", rtl: true },
  { code: "bn", native: "বাংলা", english: "Bengali" },
  { code: "ur", native: "اردو", english: "Urdu", rtl: true },
  { code: "ms", native: "Bahasa Melayu", english: "Malay" },
  { code: "he", native: "עברית", english: "Hebrew", rtl: true },
];

export const DEFAULT_LOCALE = "en";
export const LOCALE_CODES = LOCALES.map((l) => l.code);
export const localeMeta = (code: string): Locale => LOCALES.find((l) => l.code === code) ?? LOCALES[0];
export const isRtl = (code: string): boolean => !!localeMeta(code).rtl;
export const isLocale = (code: string): boolean => LOCALE_CODES.includes(code);

/** Split a pathname into { lang, rest }. Missing/invalid lang => default locale, rest unchanged. */
export function parsePath(pathname: string): { lang: string; rest: string } {
  const m = pathname.match(/^\/([A-Za-z-]+)(\/.*|$)/);
  if (m && isLocale(m[1])) return { lang: m[1], rest: m[2] || "/" };
  return { lang: DEFAULT_LOCALE, rest: pathname || "/" };
}

/** Build a localized href: localizePath("en","/industries") => "/en/industries". */
export function localizePath(lang: string, path: string): string {
  const p = path.startsWith("/") ? path : "/" + path;
  return `/${lang}${p === "/" ? "" : p}` || `/${lang}`;
}

/** Pick the best supported locale from an Accept-Language header. */
export function negotiateLocale(header: string | null): string {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim();
    if (isLocale(tag)) return tag;
    const base = tag.split("-")[0];
    const hit = LOCALE_CODES.find((c) => c === base || c.startsWith(base + "-"));
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
}
