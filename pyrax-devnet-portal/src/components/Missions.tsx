import React, { useState, useEffect } from "react";
import { Card, Icon, PageHeader, SectionHeader, Button } from "./ui";
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
  // Guard the single-mission case: (length - 1) would divide by zero and blow the width out to Infinity%.
  const trackPercent = missions.length > 1
    ? Math.min(100, Math.max(0, ((currentMissionNumber - 1) / (missions.length - 1)) * 100))
    : (isAllComplete ? 100 : 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Onboarding"
        index="02"
        title="DevNet onboarding journey"
        subtitle="Follow these steps to fully unlock your operator access."
      />

      {/* Step rail */}
      <div className="relative mb-10 px-1" data-reveal>
        <div className="absolute left-0 right-0 top-4 h-px -translate-y-1/2 bg-[color:var(--color-line)]" />
        <div
          className="absolute left-0 top-4 h-px -translate-y-1/2 bg-[color:var(--color-brand)] transition-all duration-500"
          style={{ width: `${trackPercent}%` }}
        />
        <div className="relative flex justify-between">
          {missions.map((m) => {
            const isCompleted = m.mission_number < currentMissionNumber || m.progress?.status === "completed";
            const isActive = m.mission_number === currentMissionNumber && !isAllComplete;
            return (
              <div key={m.id} className="flex flex-col items-center gap-2">
                <div
                  className={`grid h-8 w-8 place-items-center rounded-full border font-mono text-[0.68rem] font-semibold transition-all duration-300 ${
                    isCompleted
                      ? "border-[color:var(--color-positive)] bg-[rgba(61,220,132,0.12)] text-[color:var(--color-positive)]"
                      : isActive
                        ? "border-[color:var(--color-brand)] bg-[rgba(246,138,36,0.12)] text-[color:var(--color-brand)] shadow-[0_0_0_4px_rgba(246,138,36,0.08)]"
                        : "border-line bg-[color:var(--color-bg)] text-faint"
                  }`}
                >
                  {isCompleted ? <Icon.check className="h-4 w-4" /> : String(m.mission_number).padStart(2, "0")}
                </div>
                <span className={`hidden text-[0.62rem] tracking-[0.1em] sm:block ${isActive ? "text-ink" : "text-faint"}`}>
                  {String(m.mission_number).padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isAllComplete ? (
          <motion.div key="completed" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="tick tick-positive px-8 py-16 text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[color:rgba(61,220,132,0.3)] bg-[rgba(61,220,132,0.08)] text-[color:var(--color-positive)]">
                <Icon.check className="h-10 w-10" />
              </div>
              <h2 className="display-caps mt-6 font-display text-2xl">All steps completed</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
                You have successfully completed the onboarding journey. You are now fully certified and ready to operate your DevNet node.
              </p>
              <Button variant="primary" onClick={() => window.location.reload()} className="mt-7 px-6 py-2.5">
                Go to dashboard <span aria-hidden="true">→</span>
              </Button>
            </Card>
          </motion.div>
        ) : activeMission ? (
          <motion.div key={activeMission.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
            <Card className="tick overflow-hidden">
              <div className="relative overflow-hidden border-b border-line px-7 py-7">
                <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-30" />
                <div className="relative">
                  <div className="eyebrow">Step {String(activeMission.mission_number).padStart(2, "0")}</div>
                  <h2 className="display-caps mt-3 font-display text-2xl leading-tight">{activeMission.title}</h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{activeMission.description}</p>
                </div>
              </div>

              <div className="px-7 py-7">
                <SectionHeader eyebrow="Checklist" title="What you need to do" />
                <div className="rows mb-7">
                  {Object.entries(activeMission.completion_criteria || {}).map(([key], i) => (
                    <div key={key} className="row" style={{ gridTemplateColumns: "auto 1fr" }}>
                      <span className="mono-meta">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-sm">
                        Ensure <strong className="font-semibold capitalize text-ink">{key.replace(/_/g, " ")}</strong> is completed.
                      </span>
                    </div>
                  ))}
                  {Object.keys(activeMission.completion_criteria || {}).length === 0 && (
                    <div className="row" style={{ gridTemplateColumns: "1fr" }}>
                      <span className="text-sm text-faint">Read the instructions carefully.</span>
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-[color:rgba(251,111,115,0.4)] bg-[rgba(251,111,115,0.08)] px-4 py-3 text-sm text-[color:var(--color-negative)]">
                    <Icon.alert className="h-4 w-4 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-line-soft pt-6 sm:flex-row">
                  {onNavigate && actionInfo && (
                    <Button variant="ghost" onClick={() => onNavigate(actionInfo.route)} className="flex-1 justify-center py-3">
                      {actionInfo.label}
                    </Button>
                  )}
                  <Button variant="primary" onClick={() => handleVerify(activeMission.id)} disabled={verifying} className="flex-1 justify-center py-3">
                    {verifying ? (
                      <><Icon.activity className="h-4 w-4 animate-spin" /> Verifying…</>
                    ) : (
                      <>Verify &amp; continue <span aria-hidden="true">→</span></>
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
