// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useEffect, useState } from "react";
import { Card, Button, Badge, PageHeader, Icon } from "./ui";
import type { UserOnboardingState, Mission } from "../types/onboarding";
import { motion } from "framer-motion";

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
  if (error) return <Card className="p-8 text-center text-[color:var(--color-danger)]">{error}</Card>;
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
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader title={`Welcome back, ${state.display_name}`} subtitle="Pyrax DevNet Testing Portal" />

      {/* Onboarding Banner */}
      <Card className="border-[color:var(--color-brand)] bg-[rgba(245,134,34,0.05)] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold">Current Status: {state.onboarding_status.replace(/_/g, ' ')}</h2>
            {state.certification_id && <Badge tone="positive"><Icon.shield className="h-3 w-3 inline mr-1" /> Certified</Badge>}
          </div>
          <p className="text-sm text-muted">Complete the remaining steps to unlock full DevNet access.</p>
        </div>
        {nextAction && (
          <Button onClick={nextAction.action} className="bg-[color:var(--color-brand)] text-black px-6 py-3 rounded-lg font-bold hover:bg-orange-400 transition whitespace-nowrap">
            {nextAction.label}
          </Button>
        )}
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Current Mission Focus */}
        <Card className="md:col-span-2 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2"><Icon.activity className="h-5 w-5 text-[color:var(--color-brand)]" /> Current Mission</h3>
            <Button variant="ghost" onClick={() => onNavigate('missions')} className="text-xs">View All</Button>
          </div>
          
          {currentMission ? (
            <div className="bg-[rgba(255,255,255,0.02)] border border-line p-5 rounded-xl flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--color-brand)] text-black font-bold">
                  {currentMission.mission_number}
                </div>
                <h4 className="font-bold text-xl">{currentMission.title}</h4>
              </div>
              <p className="text-muted text-sm mb-6 flex-1">{currentMission.description}</p>
              
              <div className="mt-auto">
                <div className="flex justify-between text-xs text-faint mb-2">
                  <span>Mission Progress</span>
                  <span>{progressPercent}% Complete</span>
                </div>
                <div className="h-2 w-full bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className="h-full bg-[color:var(--color-brand)]" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-line rounded-xl">
              <Icon.check className="h-10 w-10 text-[color:var(--color-positive)] mb-3" />
              <p className="font-bold">All Missions Completed!</p>
              <p className="text-sm text-muted">You have finished the core onboarding missions.</p>
            </div>
          )}
        </Card>

        {/* Quick Status / Certification */}
        <div className="space-y-6">
          <Card className="p-6">
             <h3 className="font-bold text-base mb-4 flex items-center gap-2"><Icon.shield className="h-4 w-4" /> Certification</h3>
             {state.certification_id ? (
               <div className="text-center">
                 <div className="grid h-16 w-16 mx-auto place-items-center rounded-full bg-[rgba(52,211,153,0.1)] text-[color:var(--color-positive)] mb-3">
                    <Icon.shield className="h-8 w-8" />
                 </div>
                 <Badge tone="positive">Active</Badge>
                 <div className="mt-3 text-xs text-faint font-mono">{state.certification_id}</div>
                 <Button variant="ghost" onClick={() => onNavigate('certification')} className="w-full mt-4 border border-line">View Certificate</Button>
               </div>
             ) : (
               <div className="text-center">
                 <div className="grid h-16 w-16 mx-auto place-items-center rounded-full bg-[rgba(255,255,255,0.05)] text-muted mb-3">
                    <Icon.shield className="h-8 w-8" />
                 </div>
                 <Badge tone="muted">Pending</Badge>
                 <p className="text-xs text-muted mt-3 mb-4">Complete training & quiz</p>
                 <Button variant="ghost" onClick={() => onNavigate('training')} className="w-full border border-line">Go to Training</Button>
               </div>
             )}
          </Card>
          
          {/* Node Status Summary */}
          <Card className="p-6">
            <h3 className="font-bold text-base mb-4 flex items-center gap-2"><Icon.grid className="h-4 w-4" /> Node Status</h3>
            {state.node_paired ? (
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-[color:var(--color-positive)] shrink-0 animate-pulse" />
                <div>
                  <div className="font-semibold text-sm">Node Paired</div>
                  <div className="text-xs text-faint">Connected to DevNet</div>
                </div>
              </div>
            ) : (
              <div className="text-center p-4 bg-[rgba(255,255,255,0.02)] border border-dashed border-line rounded-lg">
                <p className="text-sm text-muted mb-3">No node paired yet.</p>
                <Button onClick={() => onNavigate('downloads')} disabled={!state.certification_id} className="w-full text-xs">Download Node</Button>
              </div>
            )}
          </Card>
        </div>
      </div>
      
      {/* Announcements */}
      <Card className="p-6 border-line-soft">
        <h3 className="font-bold text-base mb-4 flex items-center gap-2"><Icon.activity className="h-4 w-4 text-[color:var(--color-brand)]" /> Announcements</h3>
        <div className="space-y-3">
           <div className="p-3 bg-[rgba(255,255,255,0.03)] rounded-lg border border-line text-sm">
             <strong className="text-[color:var(--color-brand)]">Phase 3 Testing Started:</strong> The onboarding module is now live. Complete your missions to earn your operator certification!
           </div>
           <div className="p-3 bg-[rgba(255,255,255,0.03)] rounded-lg border border-line text-sm">
             <strong>New Training Materials:</strong> 5 new modules have been added covering consensus and incident reporting.
           </div>
        </div>
      </Card>
    </div>
  );
}
