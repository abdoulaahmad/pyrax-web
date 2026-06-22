// SPDX-License-Identifier: LicenseRef-PYRAX-Proprietary
//
// Waitlist / newsletter capture, wired to Brevo. A static site must NOT hold the Brevo API key in
// client JS, so the form POSTs a tiny JSON body to BREVO_ENDPOINT — a small serverless proxy that
// holds the key server-side and calls Brevo's REST API. A ready-to-deploy Cloudflare Worker for
// this lives in `worker/subscribe.js` (see the README). Until the endpoint is wired, the form
// validates + gives honest feedback rather than silently dropping addresses.

import { icon } from "./ui.js";

// The serverless proxy that forwards to Brevo. Point this at your deployed worker route.
export const BREVO_ENDPOINT = "/api/subscribe";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The waitlist form markup. `id` lets a page host more than one (header CTA target uses #waitlist). */
export function waitlistForm(opts: { compact?: boolean } = {}): string {
  const compact = opts.compact ?? false;
  return `
  <form data-waitlist class="mx-auto ${compact ? "max-w-md" : "max-w-lg"}" novalidate>
    <div class="flex flex-col gap-2 sm:flex-row">
      <input
        type="email"
        name="email"
        required
        autocomplete="email"
        placeholder="you@email.com"
        aria-label="Email address"
        class="min-w-0 flex-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-ink)] placeholder:text-[var(--color-faint)] focus:border-[var(--color-brand)]"
      />
      <button type="submit" class="btn btn-primary whitespace-nowrap" data-submit>
        Join the waitlist ${icon("arrow", "h-4 w-4")}
      </button>
    </div>
    <p data-status class="mt-3 min-h-[1.25rem] text-sm text-[var(--color-muted)]" role="status" aria-live="polite"></p>
  </form>`;
}

/** Attach submit handling to every [data-waitlist] form on the page. */
export function wireWaitlist(): void {
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>("[data-waitlist]"));
  for (const form of forms) {
    const status = form.querySelector<HTMLParagraphElement>("[data-status]");
    const btn = form.querySelector<HTMLButtonElement>("[data-submit]");
    const input = form.querySelector<HTMLInputElement>('input[name="email"]');
    const setStatus = (msg: string, tone: "ok" | "err" | "info" = "info") => {
      if (!status) return;
      status.textContent = msg;
      status.style.color =
        tone === "ok" ? "var(--color-positive)" : tone === "err" ? "var(--color-danger)" : "var(--color-muted)";
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (input?.value ?? "").trim();
      if (!EMAIL_RE.test(email)) {
        setStatus("Please enter a valid email address.", "err");
        input?.focus();
        return;
      }
      if (btn) btn.disabled = true;
      setStatus("Adding you…");
      try {
        const res = await fetch(BREVO_ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, source: "pyrax-website" }),
        });
        if (res.ok) {
          form.reset();
          setStatus("You're on the list — watch your inbox to confirm. 🔥", "ok");
        } else if (res.status === 409) {
          setStatus("You're already on the list — thank you!", "ok");
        } else {
          setStatus("Couldn't add you right now. Please try again shortly.", "err");
        }
      } catch {
        setStatus("Network error — please try again, or email hello@pyraxchain.com.", "err");
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }
}
