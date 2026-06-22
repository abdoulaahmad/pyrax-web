// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// A small, accessible hero carousel: a sliding track of full-width slides with auto-advance,
// clickable dots, prev/next arrows, swipe, and a polite live region. Auto-advance pauses on hover,
// on keyboard focus within, when the tab is hidden, and when the carousel scrolls out of view; it
// is disabled entirely under prefers-reduced-motion (the controls still work). Off-screen slides
// are removed from the tab order. Plus wireCountdown() for the Devnet 2 launch timer.

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

export function mountCarousel(root: HTMLElement, opts: { interval?: number } = {}): void {
  const interval = opts.interval ?? 7000;
  const track = root.querySelector<HTMLElement>("[data-carousel-track]");
  const slides = Array.from(root.querySelectorAll<HTMLElement>("[data-slide]"));
  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-dot]"));
  const liveEl = root.querySelector<HTMLElement>("[data-carousel-live]");
  const toggleBtn = root.querySelector<HTMLButtonElement>("[data-carousel-toggle]");
  if (!track || slides.length < 2) return;

  let index = 0;
  let timer = 0;
  let hovered = false; // mouse-over or keyboard focus-within (transient, gated each tick)
  let paused = false; // explicit Pause button (persistent — WCAG 2.2.2)
  let inView = true;

  // fromUser controls the live-region announcement: only announce on user-initiated changes, never
  // on the autoplay tick (otherwise screen readers get "Slide N of 4" spam every interval).
  const go = (i: number, fromUser = false) => {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, n) => {
      const active = n === index;
      s.classList.toggle("is-active", active);
      s.setAttribute("aria-hidden", String(!active));
      s.querySelectorAll<HTMLElement>("a[href], button, input, [tabindex]").forEach((el) => {
        if (el.closest("[data-carousel-track]") !== track) return;
        el.tabIndex = active ? 0 : -1;
      });
    });
    dots.forEach((d, n) => {
      d.setAttribute("aria-current", String(n === index));
      d.classList.toggle("is-active", n === index);
    });
    if (fromUser && liveEl) liveEl.textContent = `Slide ${index + 1} of ${slides.length}`;
  };
  const next = (fromUser = false) => go(index + 1, fromUser);
  const prev = (fromUser = false) => go(index - 1, fromUser);

  const stop = () => {
    if (timer) {
      window.clearInterval(timer);
      timer = 0;
    }
  };
  // start() owns the lifecycle gates (reduced-motion, paused, tab hidden, scrolled-out); the per-tick
  // hover gate keeps the timer alive but skips advancing while the pointer/keyboard is on the carousel.
  const start = () => {
    stop();
    if (reduced() || paused || document.hidden || !inView) return;
    timer = window.setInterval(() => {
      if (!hovered) next(false);
    }, interval);
  };
  const manual = (fn: () => void) => {
    fn();
    start(); // resets the autoplay timing after a user action (no-op while paused)
  };

  root.querySelector("[data-prev]")?.addEventListener("click", () => manual(() => prev(true)));
  root.querySelector("[data-next]")?.addEventListener("click", () => manual(() => next(true)));
  dots.forEach((d, n) => d.addEventListener("click", () => manual(() => go(n, true))));

  // explicit Pause/Play toggle — the persistent, keyboard-operable control WCAG 2.2.2 requires.
  const setPaused = (p: boolean) => {
    paused = p;
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-pressed", String(p));
      toggleBtn.setAttribute("aria-label", p ? "Play slideshow" : "Pause slideshow");
      toggleBtn.classList.toggle("is-paused", p);
    }
    p ? stop() : start();
  };
  toggleBtn?.addEventListener("click", () => setPaused(!paused));

  root.addEventListener("mouseenter", () => {
    hovered = true;
  });
  root.addEventListener("mouseleave", () => {
    hovered = false;
  });
  // pause on KEYBOARD focus only (:focus-visible) — a touch/mouse tap on a control must NOT leave the
  // carousel stuck paused with focus still on the button.
  root.addEventListener("focusin", (e) => {
    const t = e.target as HTMLElement;
    if (t.matches?.(":focus-visible")) hovered = true;
  });
  root.addEventListener("focusout", (e) => {
    if (!root.contains(e.relatedTarget as Node)) hovered = false;
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      manual(() => prev(true));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      manual(() => next(true));
    }
  });

  // swipe — horizontal-dominant only, never when the press starts on a link/button, robust to cancel.
  let downX: number | null = null;
  let downY = 0;
  track.addEventListener("pointerdown", (e) => {
    if ((e.target as Element).closest("a[href], button")) {
      downX = null;
      return;
    }
    downX = e.clientX;
    downY = e.clientY;
  });
  track.addEventListener("pointerup", (e) => {
    if (downX === null) return;
    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    downX = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) manual(() => (dx < 0 ? next(true) : prev(true)));
  });
  track.addEventListener("pointercancel", () => {
    downX = null;
  });

  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        inView = e.isIntersecting;
        inView ? start() : stop();
      },
      { threshold: 0.25 },
    );
    io.observe(root);
  }

  go(0);
  start();
}

/** Live countdown to an ISO target (no timezone in the string = the viewer's local time). */
export function wireCountdown(targetIso: string): void {
  const target = new Date(targetIso).getTime();
  if (!Number.isFinite(target)) return;
  const set = (sel: string, v: number) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) el.textContent = String(v).padStart(2, "0");
  };
  let id = 0;
  const tick = () => {
    const remaining = target - Date.now();
    let diff = Math.max(0, remaining);
    const d = Math.floor(diff / 86_400_000);
    diff -= d * 86_400_000;
    const h = Math.floor(diff / 3_600_000);
    diff -= h * 3_600_000;
    const m = Math.floor(diff / 60_000);
    diff -= m * 60_000;
    const s = Math.floor(diff / 1_000);
    set("[data-cd-d]", d);
    set("[data-cd-h]", h);
    set("[data-cd-m]", m);
    set("[data-cd-s]", s);
    if (remaining <= 0 && id) window.clearInterval(id); // freeze at 00 once launched
  };
  tick();
  if (target - Date.now() > 0) id = window.setInterval(tick, 1000);
}
