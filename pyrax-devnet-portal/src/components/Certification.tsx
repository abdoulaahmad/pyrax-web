// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useState, useEffect } from "react";
import { Card, Badge, Icon, PageHeader, SectionHeader, Panel, Button, BrandMark } from "./ui";
import type { UserOnboardingState } from "../types/onboarding";

export default function Certification() {
  const [state, setState] = useState<UserOnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const r = await fetch("/api/onboarding/status");
        const d = await r.json();
        if (d.ok && d.state) {
          setState(d.state);
        } else {
          setError(d.error || "Failed to load status.");
        }
      } catch (e) {
        setError("Failed to load certification status.");
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Checking certification status…</div>;
  if (error) return <div className="p-8 text-center text-[color:var(--color-negative)]">{error}</div>;
  if (!state) return null;

  const hasCert = !!state.certification_id && state.certification;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader navKey="certification" title="Operator Certification" subtitle="Your official credentials for running a Pyrax node." />
      {hasCert ? <CertificationBadge state={state} /> : <CertificationPending state={state} />}
    </div>
  );
}

/** One label/value pair in the credential's data plate. */
function Field({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="stat-caption">{label}</div>
      {/* break-all, not truncate: a certificate ID is the one value an operator will need to read
          out or copy in full, so it wraps rather than hiding characters behind an ellipsis. */}
      <div className={`mt-1.5 text-sm text-ink ${mono ? "break-all font-mono" : ""}`}>{children}</div>
    </div>
  );
}

function CertificationBadge({ state }: { state: UserOnboardingState }) {
  const cert = state.certification!;
  const fmt = (v: number) => new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const issuedDate = fmt(Number(cert.issued_at));
  const expiresDate = cert.expires_at ? fmt(Number(cert.expires_at)) : "No expiry";

  return (
    <>
      {/* The credential itself. Treated as a physical document: a gilt hairline at the head, an
          engraved guilloche field, the holder's name set large in display type, and a data plate
          at the foot. Everything decorative is a pseudo-element or pointer-events-none layer so
          the whole card stays selectable and copyable. */}
      <Card className="relative overflow-hidden p-0" data-reveal>
        <div className="flame-bar h-1" />

        <div className="relative px-6 py-9 sm:px-10 sm:py-11">
          {/* Engraved backdrop: fine grid + a warm radial bloom behind the seal. */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="grid-backdrop absolute inset-0 opacity-[0.35]" />
            <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(246,138,36,0.16),transparent_65%)] blur-2xl" />
          </div>

          {/* Guilloche corner brackets — the anti-forgery flourish on a real certificate. */}
          <div className="pointer-events-none absolute left-4 top-4 h-7 w-7 border-l border-t border-[color:rgba(246,138,36,0.45)]" aria-hidden="true" />
          <div className="pointer-events-none absolute right-4 top-4 h-7 w-7 border-r border-t border-[color:rgba(246,138,36,0.45)]" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-4 left-4 h-7 w-7 border-b border-l border-[color:rgba(246,138,36,0.45)]" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-4 right-4 h-7 w-7 border-b border-r border-[color:rgba(246,138,36,0.45)]" aria-hidden="true" />

          <div className="relative">
            {/* Head: issuing authority, centred like a diploma. */}
            <div className="flex flex-col items-center text-center">
              <BrandMark variant="horizontal" className="h-7 w-[5.2rem]" />
              <div className="eyebrow mt-4">Pyrax Network · DevNet</div>
              <div className="mt-1.5 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-faint">Certificate of Operator Competency</div>
            </div>

            {/* Seal. */}
            <div className="mt-9 flex justify-center">
              <div className="relative grid h-28 w-28 place-items-center">
                {/* Slowly rotating outer ring — reads as an embossed medallion, not a spinner. */}
                <div className="absolute inset-0 animate-[orbit_22s_linear_infinite] rounded-full border border-dashed border-[color:rgba(246,138,36,0.4)] motion-reduce:animate-none" aria-hidden="true" />
                <div className="grid h-[5.5rem] w-[5.5rem] place-items-center rounded-full border border-[color:rgba(246,138,36,0.45)] bg-[radial-gradient(circle_at_30%_25%,rgba(246,138,36,0.22),rgba(246,138,36,0.05))] shadow-[0_0_34px_-6px_rgba(246,138,36,0.5),inset_0_1px_0_rgba(255,255,255,0.14)]">
                  <Icon.certificate className="h-10 w-10 text-[color:var(--color-gold)]" />
                </div>
              </div>
            </div>

            {/* Attestation. */}
            <div className="mt-8 text-center">
              <p className="text-sm text-muted">This certifies that</p>
              <h2 className="display-caps mt-3 break-words font-display text-[1.75rem] leading-[1.08] sm:text-[2.1rem]">{state.display_name}</h2>
              {/* Gilt rule under the name — the flourish that makes it read as engraved. */}
              <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-[color:var(--color-gold)] to-transparent" aria-hidden="true" />
              <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
                has completed the required training and examination, and is recognised as a
              </p>
              <p className="mt-2 font-display text-lg font-semibold text-[color:var(--color-brand)]">Certified Node Operator</p>
              <div className="mt-5 flex justify-center">
                <Badge tone="positive"><Icon.check className="h-3 w-3" /> {cert.status}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Data plate. sm:grid-cols-2 (not grid-cols-2) so a long cert ID gets the full width on a
            phone instead of being crushed into a half-column. */}
        <Panel inset className="mx-4 mb-4 grid gap-5 rounded-xl p-5 sm:mx-8 sm:mb-8 sm:grid-cols-2 sm:gap-x-8 sm:p-6">
          <Field label="Certificate ID" mono>{cert.cert_number}</Field>
          <Field label="Status">
            <span className="font-semibold uppercase tracking-wide text-[color:var(--color-positive)]">{cert.status}</span>
          </Field>
          <Field label="Issued on">{issuedDate}</Field>
          <Field label="Valid until">{expiresDate}</Field>
        </Panel>

        <div className="section-rule bg-[rgba(246,138,36,0.04)] px-6 py-4 text-center">
          <p className="text-xs leading-relaxed text-muted">
            This certification authorises the holder to participate in the Pyrax DevNet as a trusted node operator.
          </p>
        </div>
      </Card>

      <p className="mono-meta mt-4 text-center">Verify this credential against its certificate ID in the operator registry.</p>
    </>
  );
}

function CertificationPending({ state }: { state: UserOnboardingState }) {
  const reqs = [
    { done: !!state.training_completed, label: "Complete training modules", hint: "Work through every required module." },
    { done: !!state.quiz_passed, label: "Pass certification quiz", hint: "Score 80% or higher." },
  ];
  const met = reqs.filter((r) => r.done).length;

  return (
    <Card className="relative overflow-hidden p-0" data-reveal>
      {/* Locked state keeps the credential's silhouette — same head rule, same seal footprint — so
          the operator can see exactly what they're working toward, just unfilled. */}
      <div className="h-1 bg-line" />

      <div className="relative px-6 py-10 text-center sm:px-10">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />

        <div className="relative">
          <div className="mx-auto grid h-[5.5rem] w-[5.5rem] place-items-center rounded-full border border-dashed border-line bg-[rgba(255,255,255,0.02)] text-faint">
            <Icon.lock className="h-8 w-8" />
          </div>

          <div className="eyebrow mt-6 text-faint">Not yet issued</div>
          <h2 className="display-caps mt-3 font-display text-2xl">Certification pending</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            Complete the requirements below to have your operator credential issued.
          </p>

          <div className="mono-meta mt-6">{met} of {reqs.length} requirements met</div>
        </div>
      </div>

      <div className="px-6 pb-8 sm:px-10">
        <Panel className="p-5 text-left">
          <SectionHeader eyebrow="Prerequisites" title="Requirements" className="mb-3" />
          <div className="rows">
            {reqs.map((r) => (
              <div key={r.label} className="row" style={{ gridTemplateColumns: "auto 1fr" }}>
                <div
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                    r.done
                      ? "border-[color:rgba(61,220,132,0.45)] bg-[rgba(61,220,132,0.12)] text-[color:var(--color-positive)]"
                      : "border-line bg-[rgba(255,255,255,0.02)] text-faint"
                  }`}
                >
                  {r.done ? <Icon.check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </div>
                <div className="min-w-0">
                  <div className={`text-sm ${r.done ? "text-ink" : "text-muted"}`}>{r.label}</div>
                  <div className="mono-meta mt-0.5">{r.hint}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="mt-6 text-center">
          <Button variant="ghost" disabled className="cursor-not-allowed opacity-50">
            <Icon.lock className="h-4 w-4" /> Download certificate
          </Button>
        </div>
      </div>
    </Card>
  );
}
