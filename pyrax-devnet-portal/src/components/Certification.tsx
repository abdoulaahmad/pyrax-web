// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useState, useEffect } from "react";
import { Card, Badge, Icon, PageHeader, Button } from "./ui";
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

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Checking certification status...</div>;
  if (error) return <div className="p-8 text-center text-[color:var(--color-danger)]">{error}</div>;
  if (!state) return null;

  const hasCert = !!state.certification_id && state.certification;
  
  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Operator Certification" subtitle="Your official credentials for running a Pyrax node." />
      
      {hasCert ? (
        <CertificationBadge state={state} />
      ) : (
        <CertificationPending state={state} />
      )}
    </div>
  );
}

function CertificationBadge({ state }: { state: UserOnboardingState }) {
  const cert = state.certification!;
  const issuedDate = new Date(Number(cert.issued_at)).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const expiresDate = cert.expires_at ? new Date(Number(cert.expires_at)).toLocaleDateString() : 'Never';

  return (
    <Card className="overflow-hidden border-[color:var(--color-brand)] bg-gradient-to-br from-[rgba(245,134,34,0.1)] to-transparent">
      <div className="p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full bg-[rgba(245,134,34,0.15)] border-4 border-[rgba(245,134,34,0.3)] shadow-[0_0_30px_rgba(245,134,34,0.2)]">
            <Icon.shield className="h-14 w-14 text-[color:var(--color-brand)]" />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <Badge tone="positive" className="mb-3 font-bold uppercase tracking-widest text-xs">Official Certification</Badge>
            <h2 className="text-3xl font-extrabold mb-1 text-white">{state.display_name}</h2>
            <p className="text-lg text-[color:var(--color-brand)] font-medium mb-6">Certified Node Operator</p>
            
            <div className="grid grid-cols-2 gap-4 bg-[rgba(0,0,0,0.3)] p-4 rounded-xl border border-[rgba(255,255,255,0.05)]">
              <div>
                <div className="text-[0.65rem] uppercase tracking-wider text-faint mb-1">Certification ID</div>
                <div className="font-mono text-sm text-white bg-[rgba(255,255,255,0.05)] px-2 py-1 rounded inline-block">{cert.cert_number}</div>
              </div>
              <div>
                <div className="text-[0.65rem] uppercase tracking-wider text-faint mb-1">Status</div>
                <div className="text-sm font-semibold text-[color:var(--color-positive)] uppercase tracking-wider">{cert.status}</div>
              </div>
              <div>
                <div className="text-[0.65rem] uppercase tracking-wider text-faint mb-1">Issued On</div>
                <div className="text-sm">{issuedDate}</div>
              </div>
              <div>
                <div className="text-[0.65rem] uppercase tracking-wider text-faint mb-1">Valid Until</div>
                <div className="text-sm">{expiresDate}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-[rgba(245,134,34,0.05)] border-t border-[rgba(245,134,34,0.1)] p-4 text-center">
        <p className="text-xs text-muted">This certification authorizes the holder to participate in the Pyrax DevNet as a trusted node operator.</p>
      </div>
    </Card>
  );
}

function CertificationPending({ state }: { state: UserOnboardingState }) {
  const isTrainingComplete = state.training_completed;
  const isQuizPassed = state.quiz_passed;
  
  return (
    <Card className="p-8 text-center bg-[rgba(0,0,0,0.2)]">
      <div className="grid h-20 w-20 mx-auto place-items-center rounded-full bg-[rgba(255,255,255,0.05)] text-muted mb-6">
        <Icon.shield className="h-8 w-8" />
      </div>
      
      <h2 className="text-2xl font-bold mb-3">Certification Pending</h2>
      <p className="text-muted max-w-md mx-auto mb-8">
        You must complete the required training modules and pass the certification quiz before you can receive your operator credentials.
      </p>
      
      <div className="max-w-sm mx-auto text-left bg-[rgba(255,255,255,0.02)] border border-line p-5 rounded-xl">
        <h3 className="font-semibold text-sm mb-4 border-b border-line pb-2">Requirements</h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`grid h-6 w-6 place-items-center rounded-full ${isTrainingComplete ? 'bg-[color:var(--color-positive)] text-black' : 'bg-line text-muted'}`}>
              <Icon.check className="h-4 w-4" />
            </div>
            <span className={isTrainingComplete ? 'text-white' : 'text-muted'}>Complete Training Modules</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`grid h-6 w-6 place-items-center rounded-full ${isQuizPassed ? 'bg-[color:var(--color-positive)] text-black' : 'bg-line text-muted'}`}>
              <Icon.check className="h-4 w-4" />
            </div>
            <span className={isQuizPassed ? 'text-white' : 'text-muted'}>Pass Certification Quiz (80%+)</span>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <Button variant="ghost" disabled className="opacity-50 cursor-not-allowed">
          Download Certificate (Locked)
        </Button>
      </div>
    </Card>
  );
}
