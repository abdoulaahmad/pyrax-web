import React, { useState, useEffect } from "react";
import { Card, Badge, Icon, PageHeader, Button } from "./ui";
import type { Mission, MissionProgress } from "../types/onboarding";
import { motion, AnimatePresence } from "framer-motion";

export default function Missions({ onNavigate }: { onNavigate?: (k: string) => void }) {
  const [missions, setMissions] = useState<(Mission & { progress: MissionProgress | null })[]>([]);
  const [currentMissionNumber, setCurrentMissionNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadMissions() {
    try {
      const r = await fetch("/api/onboarding/missions");
      const d = await r.json();
      if (d.ok) {
        setMissions(d.missions || []);
        setCurrentMissionNumber(d.current_mission_number || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMissions();
  }, []);

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading journey...</div>;

  const activeMission = missions.find(m => m.mission_number === currentMissionNumber) || missions[missions.length - 1];
  const isAllComplete = missions.length > 0 && missions.every(m => m.progress?.status === 'completed');

  async function handleVerify(missionId: string) {
    setVerifying(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/onboarding/missions/${missionId}/complete`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        // Successfully verified and advanced!
        await loadMissions();
      } else {
        setErrorMsg(data.error || "Requirements not met yet. Please complete the task first!");
      }
    } catch (e) {
      setErrorMsg("Network error verifying mission.");
    } finally {
      setVerifying(false);
    }
  }

  function getActionLabelAndRoute(mNum: number) {
    switch (mNum) {
      case 1: return { label: "Edit Profile", route: "settings" };
      case 2: return { label: "Go to Training", route: "training" };
      case 3: return { label: "Take Quiz", route: "quiz" };
      case 4: return { label: "Download Node", route: "downloads" };
      case 5: return { label: "Pair Node", route: "dashboard" }; // Node pairing happens on dashboard or dedicated page
      case 6: return { label: "View Status", route: "dashboard" };
      case 7: return { label: "View Testing Phase", route: "dashboard" };
      default: return { label: "Review Dashboard", route: "dashboard" };
    }
  }

  const actionInfo = activeMission ? getActionLabelAndRoute(activeMission.mission_number) : null;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">DevNet Onboarding Journey</h1>
        <p className="text-muted">Follow these steps to fully unlock your operator access.</p>
      </div>

      {/* Progress Steps Header */}
      <div className="mb-10 relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-[rgba(255,255,255,0.05)] -translate-y-1/2 z-0" />
        <div className="absolute top-1/2 left-0 h-1 bg-[color:var(--color-brand)] -translate-y-1/2 z-0 transition-all duration-500" 
             style={{ width: `${Math.max(0, (currentMissionNumber - 1) / (missions.length - 1)) * 100}%` }} />
        
        <div className="flex justify-between relative z-10">
          {missions.map((m) => {
            const isCompleted = m.mission_number < currentMissionNumber || m.progress?.status === 'completed';
            const isActive = m.mission_number === currentMissionNumber && !isAllComplete;
            return (
              <div key={m.id} className="flex flex-col items-center">
                <div className={`grid h-8 w-8 place-items-center rounded-full font-bold text-xs transition-all duration-300
                  ${isCompleted ? 'bg-[color:var(--color-positive)] text-black shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 
                    isActive ? 'bg-[color:var(--color-brand)] text-black shadow-[0_0_20px_rgba(245,134,34,0.6)] scale-125' : 
                    'bg-[rgba(255,255,255,0.1)] text-muted'}`}>
                  {isCompleted ? <Icon.check className="h-4 w-4" /> : m.mission_number}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isAllComplete ? (
          <motion.div key="completed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
            <div className="grid h-24 w-24 mx-auto place-items-center rounded-full bg-[rgba(52,211,153,0.1)] text-[color:var(--color-positive)] mb-6">
              <Icon.check className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-bold mb-4">All Steps Completed!</h2>
            <p className="text-muted mb-8 max-w-lg mx-auto">You have successfully completed the onboarding journey. You are now fully certified and ready to operate your DevNet node.</p>
            <Button onClick={() => { window.location.reload(); }} className="bg-[color:var(--color-brand)] text-black px-8 py-3 rounded-xl font-bold text-lg hover:scale-105 transition-transform">
              Go to Dashboard
            </Button>
          </motion.div>
        ) : activeMission ? (
          <motion.div key={activeMission.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
            <Card className="overflow-hidden border-2 border-[color:var(--color-brand)] shadow-[0_10px_40px_-10px_rgba(245,134,34,0.15)]">
              <div className="bg-[rgba(245,134,34,0.05)] p-8 border-b border-[rgba(245,134,34,0.1)]">
                <div className="flex items-center gap-3 mb-4">
                  <Badge tone="brand" className="text-xs uppercase tracking-widest font-bold px-3 py-1">Step {activeMission.mission_number}</Badge>
                </div>
                <h2 className="text-3xl font-bold mb-3">{activeMission.title}</h2>
                <p className="text-lg text-muted">{activeMission.description}</p>
              </div>
              
              <div className="p-8 bg-[rgba(5,6,9,0.8)]">
                <h3 className="font-semibold text-sm text-[color:var(--color-brand)] uppercase tracking-wider mb-4">What you need to do</h3>
                
                <ul className="space-y-4 mb-8">
                  {Object.entries(activeMission.completion_criteria || {}).map(([key, val]) => (
                    <li key={key} className="flex items-center gap-3 bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-line-soft">
                      <div className="h-6 w-6 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center shrink-0">
                        <div className="h-2 w-2 rounded-full bg-muted" />
                      </div>
                      <span className="text-sm">Ensure <strong className="capitalize text-ink">{key.replace(/_/g, ' ')}</strong> is completed.</span>
                    </li>
                  ))}
                  {Object.keys(activeMission.completion_criteria || {}).length === 0 && (
                    <li className="text-faint italic">Read the instructions carefully.</li>
                  )}
                </ul>

                {errorMsg && (
                  <div className="mb-6 p-4 bg-[rgba(239,68,68,0.1)] border border-[color:var(--color-danger)] text-[color:var(--color-danger)] rounded-xl text-sm font-medium flex items-center gap-2">
                    <Icon.alert className="h-5 w-5 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-line-soft">
                  {onNavigate && actionInfo && (
                    <Button 
                      onClick={() => onNavigate(actionInfo.route)} 
                      className="flex-1 py-4 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-line rounded-xl font-semibold transition-colors"
                    >
                      {actionInfo.label}
                    </Button>
                  )}
                  <Button 
                    onClick={() => handleVerify(activeMission.id)} 
                    disabled={verifying}
                    className="flex-1 py-4 bg-[color:var(--color-brand)] text-black hover:bg-orange-400 rounded-xl font-bold transition-all shadow-lg hover:shadow-[0_0_20px_rgba(245,134,34,0.4)] disabled:opacity-50 disabled:hover:shadow-none"
                  >
                    {verifying ? (
                      <span className="flex items-center justify-center gap-2">
                        <Icon.activity className="h-5 w-5 animate-spin" /> Verifying...
                      </span>
                    ) : (
                      "I've Done This! Verify & Continue →"
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
