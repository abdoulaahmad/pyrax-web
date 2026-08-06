// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useEffect, useState } from "react";
import { Card, Button, Badge, PageHeader, SectionHeader, Panel, Progress, Icon } from "./ui";
import type { UserOnboardingState, Mission } from "../types/onboarding";

export default function Dashboard({ onNavigate }: { onNavigate: (k: string) => void }) {
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
          setError(d.error || "Failed to load dashboard data.");
        }
      } catch (e) {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading dashboard...</div>;
  if (error) return <Card className="p-8 text-center text-[color:var(--color-negative)]">{error}</Card>;
  if (!state) return null;

  const currentMission = state.missions?.find(m => m.mission_number === state.current_mission);
  const completedMissionsCount = state.missions?.filter(m => m.progress?.status === 'completed').length || 0;
  const missionsTotal = state.missions?.length || 8;
  const progressPercent = Math.round((completedMissionsCount / missionsTotal) * 100);

  function getNextAction() {
    if (!state) return null;
    switch (state.onboarding_status) {
      case 'REGISTERED': return { label: 'Complete Profile', action: () => onNavigate('settings') };
      case 'PROFILE_COMPLETE': return { label: 'Start Training', action: () => onNavigate('training') };
      case 'TRAINING': return { label: 'Continue Training', action: () => onNavigate('training') };
      case 'QUIZ': return { label: 'Take Quiz', action: () => onNavigate('quiz') };
      case 'CERTIFIED': return { label: 'Download Node', action: () => onNavigate('downloads') };
      case 'NODE_DOWNLOAD': return { label: 'Pair Node', action: () => onNavigate('dashboard') }; // Pair node might just show instructions
      case 'NODE_PAIRED': return { label: 'Sync Node', action: () => onNavigate('dashboard') };
      case 'TESTING': return { label: 'View Missions', action: () => onNavigate('missions') };
      case 'COMPLETED': return { label: 'View Dashboard', action: () => onNavigate('missions') };
      default: return null;
    }
  }

  const nextAction = getNextAction();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Onboarding"
        index="01"
        title={`Welcome back, ${state.display_name}`}
        subtitle="Your DevNet operator progress, node status, and the next step to unlock full network access."
      />

      {/* Status banner — the single most important "what do I do next" surface. */}
      <Card className="tick relative overflow-hidden p-6" data-reveal>
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="min-w-0">
            <div className="stat-caption">Current status</div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="display-caps font-display text-xl leading-tight">{state.onboarding_status.replace(/_/g, " ")}</h2>
              {state.certification_id && <Badge tone="positive"><Icon.shield className="mr-1 inline h-3 w-3" /> Certified</Badge>}
            </div>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">Complete the remaining steps to unlock full DevNet access.</p>
          </div>
          {nextAction && (
            <Button variant="primary" onClick={nextAction.action} className="shrink-0 px-5 py-2.5">
              {nextAction.label} <span aria-hidden="true">→</span>
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Current mission */}
        <Card className="flex flex-col p-6 lg:col-span-2" data-reveal data-reveal-delay="1">
          <SectionHeader
            eyebrow="In progress"
            title="Current mission"
            action={<Button variant="ghost" onClick={() => onNavigate("missions")} className="px-3 py-1.5 text-xs">View all</Button>}
          />
          {currentMission ? (
            <Panel className="flex flex-1 flex-col p-5">
              <div className="flex items-start gap-3.5">
                <div className="stat-figure grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[color:rgba(246,138,36,0.35)] bg-[rgba(246,138,36,0.08)] text-sm text-[color:var(--color-brand)]">
                  {String(currentMission.mission_number).padStart(2, "0")}
                </div>
                <div className="min-w-0">
                  <h4 className="font-display text-lg font-semibold leading-snug">{currentMission.title}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{currentMission.description}</p>
                </div>
              </div>
              <div className="mt-auto pt-6">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="stat-caption">Mission progress</span>
                  <span className="stat-figure text-sm text-[color:var(--color-brand)]">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} />
                <div className="mono-meta mt-2">{completedMissionsCount} of {missionsTotal} complete</div>
              </div>
            </Panel>
          ) : (
            <Panel inset className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <Icon.check className="mb-3 h-9 w-9 text-[color:var(--color-positive)]" />
              <p className="font-display font-semibold">All missions completed</p>
              <p className="mt-1 text-sm text-muted">You have finished the core onboarding missions.</p>
            </Panel>
          )}
        </Card>

        {/* Certification + node */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="tick tick-positive p-6" data-reveal data-reveal-delay="2">
            <SectionHeader eyebrow="Credential" title="Certification" />
            {state.certification_id ? (
              <div className="text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[color:rgba(61,220,132,0.3)] bg-[rgba(61,220,132,0.08)] text-[color:var(--color-positive)]">
                  <Icon.shield className="h-7 w-7" />
                </div>
                <div className="mt-3"><Badge tone="positive">Active</Badge></div>
                <div className="mono-meta mt-2.5 break-all">{state.certification_id}</div>
                <Button variant="ghost" onClick={() => onNavigate("certification")} className="mt-4 w-full justify-center">View certificate</Button>
              </div>
            ) : (
              <div className="text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-line bg-[rgba(255,255,255,0.03)] text-faint">
                  <Icon.shield className="h-7 w-7" />
                </div>
                <div className="mt-3"><Badge tone="muted">Pending</Badge></div>
                <p className="mt-2.5 text-xs text-muted">Complete training &amp; quiz</p>
                <Button variant="ghost" onClick={() => onNavigate("training")} className="mt-4 w-full justify-center">Go to training</Button>
              </div>
            )}
          </Card>

          <Card className={`tick ${state.node_paired ? "tick-positive" : ""} p-6`} data-reveal data-reveal-delay="3">
            <SectionHeader eyebrow="Hardware" title="Node status" />
            {state.node_paired ? (
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-positive)] opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-positive)]" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Node paired</div>
                  <div className="mono-meta mt-0.5">Connected to DevNet</div>
                </div>
              </div>
            ) : (
              <Panel inset className="p-4 text-center">
                <p className="text-sm text-muted">No node paired yet.</p>
                <Button onClick={() => onNavigate("downloads")} disabled={!state.certification_id} className="mt-3 w-full justify-center text-xs">Download node</Button>
              </Panel>
            )}
          </Card>
        </div>
      </div>

      {/* Announcements */}
      <Card className="mt-5 p-6" data-reveal data-reveal-delay="4">
        <SectionHeader eyebrow="Network" title="Announcements" />
        <div className="rows">
          <div className="row" style={{ gridTemplateColumns: "auto 1fr" }}>
            <span className="stat-figure text-sm text-[color:var(--color-brand)]">01</span>
            <p className="text-sm leading-relaxed text-muted">
              <strong className="font-semibold text-[color:var(--color-brand)]">Phase 3 testing started.</strong>{" "}
              The onboarding module is now live — complete your missions to earn your operator certification.
            </p>
          </div>
          <div className="row" style={{ gridTemplateColumns: "auto 1fr" }}>
            <span className="stat-figure text-sm text-faint">02</span>
            <p className="text-sm leading-relaxed text-muted">
              <strong className="font-semibold text-ink">New training materials.</strong>{" "}
              Five new modules have been added covering consensus and incident reporting.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
