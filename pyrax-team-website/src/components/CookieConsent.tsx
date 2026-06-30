// SPDX-License-Identifier: LicenseRef-Proprietary
//
// Granular cookie consent (Accept all / Reject all / Customize). Persists the choice in
// localStorage and re-shows only if the policy version changes. Built to be promoted into
// @pyrax/shared so every PYRAX site uses the identical banner.
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const KEY = "pyrax.cookie-consent.v1";

type Consent = { essential: true; analytics: boolean; preferences: boolean; ts: number };
const CATEGORIES = [
  { key: "essential" as const, label: "Strictly necessary", desc: "Keeps you signed in and the site secure. Always on.", locked: true },
  { key: "analytics" as const, label: "Analytics", desc: "Anonymous usage to help us improve the portal." },
  { key: "preferences" as const, label: "Preferences", desc: "Remembers your in-app settings and choices." },
];

function read(): Consent | null {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return v && v.ts ? v : null; } catch { return null; }
}
function write(c: Consent) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* ignore */ } }

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [preferences, setPreferences] = useState(false);

  useEffect(() => { if (!read()) setOpen(true); }, []);

  function save(c: Partial<Consent>) {
    write({ essential: true, analytics: !!c.analytics, preferences: !!c.preferences, ts: Date.now() });
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl">
          <div className="card overflow-hidden">
            <div className="flame-bar h-1 w-full" />
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[color:rgba(245,134,34,0.3)] bg-[rgba(245,134,34,0.07)] text-base">🍪</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">We value your privacy</div>
                  <p className="mt-1 text-xs text-muted">We use cookies to keep you signed in, secure the site, and (optionally) understand usage. You're in control — accept all, reject the optional ones, or choose.</p>

                  <AnimatePresence initial={false}>
                    {custom && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 space-y-2">
                          {CATEGORIES.map((c) => {
                            const on = c.key === "essential" ? true : c.key === "analytics" ? analytics : preferences;
                            const set = c.key === "analytics" ? setAnalytics : setPreferences;
                            return (
                              <div key={c.key} className="flex items-start justify-between gap-3 rounded-lg border border-line p-2.5">
                                <div><div className="text-xs font-semibold">{c.label}</div><div className="text-[0.7rem] text-faint">{c.desc}</div></div>
                                <button disabled={c.locked} onClick={() => !c.locked && set(!on)} aria-pressed={on}
                                  className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-[color:var(--color-brand)]" : "bg-[color:var(--color-line)]"} ${c.locked ? "opacity-60" : ""}`}>
                                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[1.15rem]" : "left-0.5"}`} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn btn-primary" onClick={() => save({ analytics: true, preferences: true })}>Accept all</button>
                    <button className="btn btn-ghost" onClick={() => save({ analytics: false, preferences: false })}>Reject all</button>
                    {custom
                      ? <button className="btn btn-ghost" onClick={() => save({ analytics, preferences })}>Save choices</button>
                      : <button className="btn btn-ghost" onClick={() => setCustom(true)}>Customize</button>}
                    <a href="/privacy" className="ml-auto self-center text-xs text-faint hover:text-muted">Cookie policy</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
