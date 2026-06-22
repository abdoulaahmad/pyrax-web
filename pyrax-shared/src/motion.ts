// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Lightweight, tasteful motion for the "bolder & dynamic" polish: count-up stats and subtle
// scroll parallax. Both respect prefers-reduced-motion and degrade to static. No dependencies.

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function fmt(n: number, dp: number): string {
  // Sub-1000 values that explicitly request >= 2 decimals (e.g. the $0.0025 genesis price) are
  // rendered with fixed decimals — never rounded through toLocaleString (which would show "$0").
  if (dp >= 2 && n < 1000) return n.toFixed(dp);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(dp)}`.replace(/\.0$/, "") + "B";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(dp)}`.replace(/\.0$/, "") + "M";
  if (n >= 1_000) return `${(n / 1_000).toFixed(dp)}`.replace(/\.0$/, "") + "k";
  return Math.round(n).toLocaleString("en-US");
}

/**
 * Count-up any element with `data-count="<number>"`, once, when it scrolls into view.
 * Optional: data-prefix, data-suffix, data-dp (decimal places for k/M), data-dur (ms),
 * data-format="plain" (no k/M abbreviation — plain grouped integer).
 */
export function wireCounters(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-count]"));
  if (els.length === 0) return;
  const run = (el: HTMLElement) => {
    const target = Number(el.dataset.count || "0");
    const prefix = el.dataset.prefix ?? "";
    const suffix = el.dataset.suffix ?? "";
    const dp = Number(el.dataset.dp ?? "1");
    const plain = el.dataset.format === "plain";
    const dur = Number(el.dataset.dur ?? "1400");
    if (reduced() || !Number.isFinite(target)) {
      el.textContent = prefix + (plain ? Math.round(target).toLocaleString("en-US") : fmt(target, dp)) + suffix;
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const v = target * eased;
      el.textContent = prefix + (plain ? Math.round(v).toLocaleString("en-US") : fmt(v, dp)) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (!("IntersectionObserver" in window)) {
    els.forEach(run);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          run(e.target as HTMLElement);
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.4 },
  );
  els.forEach((el) => io.observe(el));
}

/**
 * Subtle scroll parallax for any element with `data-parallax="<factor>"` (e.g. 0.12).
 * Translates the element a fraction of the scroll delta from its rest position. rAF-throttled.
 */
export function wireParallax(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
  if (els.length === 0 || reduced()) return;
  let ticking = false;
  const apply = () => {
    const vh = window.innerHeight;
    for (const el of els) {
      const factor = Number(el.dataset.parallax || "0.1");
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const offset = (center - vh / 2) * factor;
      el.style.transform = `translate3d(0, ${(-offset).toFixed(1)}px, 0)`;
    }
    ticking = false;
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(apply);
    }
  };
  apply();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
}

/** Convenience: wire both. */
export function wireMotion(): void {
  wireCounters();
  wireParallax();
}
