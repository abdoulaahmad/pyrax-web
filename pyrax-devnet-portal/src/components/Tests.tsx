// SPDX-License-Identifier: LicenseRef-Proprietary
//
// The Product Tests tab. Two prereq-gated tracks (CLI + Inferno), each a progression path of test
// cards. Opening a test launches a STEP-BY-STEP runner: per step the instruction, an inline proof
// uploader (photo/video per the step's proof kind → POST /api/uploads/sign then PUT to Spaces, with a
// client-computed SHA-256 content hash for anti-fraud dedup), a pass/fail toggle + note; then the big
// paste-your-logs field before submit. The tester's submission history + live status, a consistency
// streak meter, and the (overall) testing leaderboard round it out. A failed step offers a one-click
// "file a bug" that pre-fills the Issue Council form with the step's context + its uploaded proof.
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, Button, Badge, PageHeader, Icon } from "./ui";
import { BugForm, type BugPrefill } from "./modules";

const fmt = (n: number) => n.toLocaleString("en-US");
const ago = (ms: number) => { const s = Math.floor((Date.now() - ms) / 1000); if (s < 60) return s + "s ago"; if (s < 3600) return Math.floor(s / 60) + "m ago"; if (s < 86400) return Math.floor(s / 3600) + "h ago"; return Math.floor(s / 86400) + "d ago"; };

type ReviewStatus = "not_started" | "submitted" | "ai_screening" | "in_review" | "needs_more" | "accepted" | "rejected";
interface Step { title: string; instruction: string; proof: "photo" | "video" | "either" | "none"; logsPrompt?: string }
interface TestItem {
  id: string; slug: string | null; track: string; title: string; body: string; steps: Step[];
  prereqSlugs: string[]; orderIdx: number; estMinutes: number; weightPyrx: number; appVersion: string; status: string;
  myStatus: ReviewStatus; mySubmissionId: string | null; locked: boolean; missingPrereqs: string[];
}
interface Attachment { url: string; type: string; name?: string; size?: number; stepIndex?: number; contentHash?: string }

const STATUS_LABEL: Record<ReviewStatus, string> = {
  not_started: "Not started", submitted: "Submitted", ai_screening: "AI screening", in_review: "In review",
  needs_more: "Needs more", accepted: "Accepted", rejected: "Rejected",
};
const STATUS_TONE: Record<ReviewStatus, any> = {
  not_started: "muted", submitted: "water", ai_screening: "water", in_review: "brand",
  needs_more: "warning", accepted: "positive", rejected: "danger",
};

/** SHA-256 of a file's bytes, hex — the anti-fraud content hash. Best-effort: returns undefined if the
 *  browser lacks SubtleCrypto (e.g. non-secure context), in which case dedup simply can't match it. */
async function sha256Hex(file: File): Promise<string | undefined> {
  try {
    if (!crypto?.subtle) return undefined;
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch { return undefined; }
}

/** Sign + PUT one file to the tester's own CDN prefix, returning the stored attachment record (with the
 *  content hash + step index) or an error message. Mirrors the Issue Council upload flow. */
async function uploadProof(file: File, stepIndex: number): Promise<{ att?: Attachment; error?: string }> {
  try {
    const sign = await (await fetch("/api/uploads/sign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }) })).json();
    if (!sign.ok) return { error: sign.reason === "unconfigured" ? "Attachments aren't configured yet — you can still submit with logs + notes." : sign.error || "Upload failed." };
    const contentHash = await sha256Hex(file);
    const put = await fetch(sign.url, { method: "PUT", headers: { ...sign.headers, "content-type": file.type }, body: file });
    if (!put.ok) return { error: "Upload to storage failed." };
    return { att: { url: sign.publicUrl, type: sign.kind, name: file.name, size: file.size, stepIndex, ...(contentHash ? { contentHash } : {}) } };
  } catch { return { error: "Upload failed." }; }
}

/* ------------------------------------------------------------------ streak meter */
function StreakMeter({ stats, consistency }: { stats: any; consistency: any }) {
  if (!stats || !consistency) return null;
  const streak = Math.max(0, Math.min(consistency.sustainedWeeks, stats.weeklyStreak || 0));
  const pct = Math.round((streak / Math.max(1, consistency.sustainedWeeks)) * 100);
  const rate = Math.round((stats.rollingAcceptRate ?? 1) * 100);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold">Consistency streak</h3>
        <Badge tone={streak >= consistency.sustainedWeeks ? "positive" : "brand"}>{streak}/{consistency.sustainedWeeks} weeks</Badge>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full border border-line bg-[rgba(5,6,9,0.5)]">
        <motion.div className="h-full flame-bar" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <p className="mt-2 text-xs text-muted">
        Qualify each week with <span className="text-ink">{consistency.minAcceptedTestsPerWeek} accepted tests</span> or <span className="text-ink">{consistency.minAcceptedIssueReportsPerWeek} accepted issue reports</span>, at a rolling accept-rate of 60%+. Sustain {consistency.sustainedWeeks} weeks for a <span className="text-gold">{fmt(consistency.bonusPyrx)} PYRX</span> bonus.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-line p-2"><div className="text-lg font-bold">{stats.acceptedThisWeek ?? 0}</div><div className="text-[0.66rem] uppercase tracking-wide text-faint">tests this wk</div></div>
        <div className="rounded-lg border border-line p-2"><div className="text-lg font-bold">{stats.acceptedIssueReportsThisWeek ?? 0}</div><div className="text-[0.66rem] uppercase tracking-wide text-faint">bugs this wk</div></div>
        <div className="rounded-lg border border-line p-2"><div className="text-lg font-bold">{rate}%</div><div className="text-[0.66rem] uppercase tracking-wide text-faint">accept rate</div></div>
      </div>
      {consistency.meetsThisWeek && <p className="mt-2 text-center text-xs text-[color:var(--color-positive)]">This week counts toward your streak.</p>}
    </Card>
  );
}

/* ------------------------------------------------------------------ per-step runner card */
function StepCard({ step, index, result, atts, onResult, onUpload, onRemoveAtt, onFileBug, uploading }: {
  step: Step; index: number; result: { pass: boolean | null; note: string };
  atts: Attachment[]; onResult: (r: { pass: boolean | null; note: string }) => void;
  onUpload: (files: FileList | null) => void; onRemoveAtt: (url: string) => void;
  onFileBug: () => void; uploading: boolean;
}) {
  const proofAccept = step.proof === "video" ? "video/*" : step.proof === "photo" ? "image/*" : "image/*,video/*";
  const needsProof = step.proof !== "none";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-xs font-bold text-muted">{index + 1}</span>
          <div className="font-semibold">{step.title}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {needsProof && <Badge tone="muted">{step.proof === "either" ? "photo/video" : step.proof}</Badge>}
          {result.pass === true && <Badge tone="positive">Pass</Badge>}
          {result.pass === false && <Badge tone="danger">Fail</Badge>}
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{step.instruction}</p>
      {step.logsPrompt && <p className="mt-2 rounded-lg border border-line bg-[rgba(5,6,9,0.4)] p-2 text-xs text-faint">📋 {step.logsPrompt} — paste it in the logs field below before you submit.</p>}

      {needsProof && (
        <div className="mt-3">
          <label className="label">Proof <span className="font-normal text-faint">({step.proof === "either" ? "a screenshot or a short clip" : step.proof === "video" ? "a short screen recording" : "a screenshot"})</span></label>
          <input type="file" accept={proofAccept} multiple onChange={(e) => { onUpload(e.target.files); e.currentTarget.value = ""; }}
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:text-ink" />
          {uploading && <p className="mt-1 text-xs text-faint">Uploading…</p>}
          {atts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {atts.map((a, i) => (
                <span key={i} className="chip">{a.type === "video" ? "🎬" : a.type === "image" ? "🖼️" : "📎"} {a.name || "proof"}<button onClick={() => onRemoveAtt(a.url)} className="ml-1 text-faint hover:text-[color:var(--color-negative)]" aria-label="Remove">✕</button></span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => onResult({ ...result, pass: true })} className={`rounded-lg border px-3 py-1.5 text-sm ${result.pass === true ? "border-[color:rgba(61,220,132,0.5)] bg-[rgba(61,220,132,0.1)] text-[color:var(--color-positive)]" : "border-line text-muted hover:text-ink"}`}>✓ Pass</button>
        <button onClick={() => onResult({ ...result, pass: false })} className={`rounded-lg border px-3 py-1.5 text-sm ${result.pass === false ? "border-[color:rgba(251,111,115,0.5)] bg-[rgba(251,111,115,0.1)] text-[color:var(--color-negative)]" : "border-line text-muted hover:text-ink"}`}>✕ Fail</button>
        {result.pass === false && <Button variant="ghost" className="ml-auto text-xs" onClick={onFileBug}><Icon.alert className="h-3.5 w-3.5" /> File a bug for this step</Button>}
      </div>
      <input className="input mt-2 text-sm" placeholder="Optional note for this step…" value={result.note} onChange={(e) => onResult({ ...result, note: e.target.value })} />
    </Card>
  );
}

/* ------------------------------------------------------------------ the runner (one test) */
function Runner({ test, onClose, onSubmitted, onFileBug }: {
  test: TestItem; onClose: () => void; onSubmitted: () => void;
  onFileBug: (prefill: BugPrefill) => void;
}) {
  const steps = test.steps || [];
  const [results, setResults] = useState<Array<{ pass: boolean | null; note: string }>>(steps.map(() => ({ pass: null, note: "" })));
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [logs, setLogs] = useState("");
  const [notes, setNotes] = useState("");
  const [uploadingStep, setUploadingStep] = useState<number | null>(null);
  const [uploadNote, setUploadNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const attsForStep = (i: number) => atts.filter((a) => a.stepIndex === i);
  const decidedCount = results.filter((r) => r.pass !== null).length;
  const allDecided = decidedCount === steps.length;
  // Proof completeness: every step that REQUIRES proof and was marked Pass must have an upload.
  const missingProof = steps.some((s, i) => s.proof !== "none" && results[i]?.pass === true && attsForStep(i).length === 0);

  async function handleUpload(stepIndex: number, files: FileList | null) {
    const list = Array.from(files || []);
    if (!list.length) return;
    setUploadingStep(stepIndex); setUploadNote("");
    for (const file of list) {
      const { att, error } = await uploadProof(file, stepIndex);
      if (error) { setUploadNote(error); continue; }
      if (att) setAtts((a) => [...a, att]);
    }
    setUploadingStep(null);
  }
  function removeAtt(url: string) { setAtts((a) => a.filter((x) => x.url !== url)); }
  function setResult(i: number, r: { pass: boolean | null; note: string }) { setResults((prev) => prev.map((x, idx) => (idx === i ? r : x))); }

  function fileBugForStep(i: number) {
    const step = steps[i];
    const proof = attsForStep(i);
    onFileBug({
      title: `[${test.title}] Step ${i + 1}: ${step.title}`,
      component: test.track === "cli" ? "PYRAX CLI" : "Inferno",
      severity: "medium",
      reproSteps: `Product Test: ${test.title} (${test.slug || test.id})\nFailing step ${i + 1}: ${step.title}\n\n${step.instruction}`,
      description: results[i]?.note ? `Tester note: ${results[i].note}` : "",
      actual: results[i]?.note || "",
      attachments: proof.map((a) => ({ url: a.url, type: a.type, name: a.name, size: a.size, stepIndex: a.stepIndex, contentHash: a.contentHash })),
      // Include the logs the tester has typed so far — the bug carries the same evidence as the test.
      expected: logs ? `Logs at time of failure:\n${logs}` : "",
    });
  }

  async function submit() {
    setBusy(true); setErr("");
    try {
      const body = {
        results: results.map((r, i) => ({ stepIndex: i, pass: r.pass === true, ...(r.note.trim() ? { note: r.note } : {}) })),
        attachments: atts,
        logs: logs || undefined,
        notes: notes || undefined,
      };
      const res = await fetch(`/api/tests/${test.id}/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) {
        if (d.reason === "prereq") setErr("Complete the prerequisite tests first.");
        else if (d.reason === "closed") setErr("This test is closed.");
        else if (d.reason === "not_found") setErr("This test no longer exists.");
        else setErr(d.error || "Couldn't submit.");
        setBusy(false); return;
      }
      setDone(true);
      onSubmitted();
    } catch { setErr("Network error."); }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
        <Card className="max-w-md p-8 text-center" >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[rgba(61,220,132,0.12)] text-[color:var(--color-positive)]"><Icon.check className="h-6 w-6" /></div>
          <p className="mt-3 text-lg font-bold">Submitted for review</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Your proof is in. It's screened by Sentinel and reviewed by the team — you'll be notified and, if accepted, {fmt(test.weightPyrx)} PYRX is added to your earnings.</p>
          <div className="mt-4"><Button variant="primary" onClick={onClose}>Back to tests</Button></div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-line bg-[rgba(8,10,17,0.98)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Badge tone={test.track === "cli" ? "water" : "brand"}>{test.track === "cli" ? "CLI" : "Inferno"}</Badge><Badge tone="brand">{fmt(test.weightPyrx)} PYRX</Badge>{test.estMinutes > 0 && <span className="text-xs text-faint">~{test.estMinutes} min</span>}</div>
            <h2 className="mt-1.5 text-lg font-bold">{test.title}</h2>
          </div>
          <button onClick={onClose} className="text-faint hover:text-ink" aria-label="Close">✕</button>
        </div>
        <p className="text-sm text-muted">{test.body}</p>

        <div className="mt-3 flex items-center justify-between rounded-lg border border-line bg-[rgba(5,6,9,0.4)] px-3 py-2 text-xs">
          <span className="text-muted">{decidedCount}/{steps.length} steps marked</span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]"><div className="h-full flame-bar" style={{ width: `${Math.round((decidedCount / Math.max(1, steps.length)) * 100)}%` }} /></div>
        </div>

        <div className="mt-4 space-y-3">
          {steps.map((s, i) => (
            <StepCard key={i} step={s} index={i} result={results[i]} atts={attsForStep(i)}
              onResult={(r) => setResult(i, r)} onUpload={(files) => handleUpload(i, files)} onRemoveAtt={removeAtt}
              onFileBug={() => fileBugForStep(i)} uploading={uploadingStep === i} />
          ))}
        </div>

        <div className="mt-5">
          <label className="label">Paste your logs / errors <span className="font-normal text-faint">(the big field — CLI output, app logs, stack traces; ≤16,000 chars)</span></label>
          <textarea className="input font-mono text-xs" rows={7} value={logs} onChange={(e) => setLogs(e.target.value.slice(0, 16000))} placeholder="Paste the relevant log output here…" />
          <div className="mt-1 text-right text-[0.66rem] text-faint">{logs.length.toLocaleString("en-US")}/16,000</div>
        </div>
        <div className="mt-2">
          <label className="label">Anything else for the reviewer? <span className="font-normal text-faint">(optional)</span></label>
          <textarea className="input text-sm" rows={2} value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 2000))} />
        </div>

        {uploadNote && <p className="mt-2 text-xs text-[color:var(--color-warning)]">{uploadNote}</p>}
        {!allDecided && <p className="mt-2 text-xs text-faint">Mark every step Pass or Fail before submitting ({decidedCount}/{steps.length} done).</p>}
        {allDecided && missingProof && <p className="mt-2 text-xs text-[color:var(--color-warning)]">Some passed steps still need their proof upload.</p>}
        {err && <p className="mt-2 text-sm text-[color:var(--color-negative)]">{err}</p>}

        <div className="mt-4 flex gap-3">
          <Button variant="primary" onClick={submit} disabled={busy || uploadingStep !== null || !allDecided || missingProof}>{busy ? "Submitting…" : "Submit for review"}</Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ test card */
function TestCard({ test, onOpen }: { test: TestItem; onOpen: () => void }) {
  const status = test.myStatus;
  const clickable = !test.locked && test.status === "open";
  return (
    <Card hover={clickable} className={`p-4 ${clickable ? "cursor-pointer" : "opacity-80"}`} onClick={clickable ? onOpen : undefined}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {test.locked && <Badge tone="muted">🔒 Locked</Badge>}
            {test.status === "closed" && <Badge tone="warning">Closed</Badge>}
            <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
            <Badge tone="brand">{fmt(test.weightPyrx)} PYRX</Badge>
          </div>
          <div className="mt-1.5 font-semibold">{test.title}</div>
          <div className="mt-0.5 line-clamp-2 text-xs text-muted">{test.body}</div>
          <div className="mt-1 text-[0.7rem] text-faint">{(test.steps || []).length} steps{test.estMinutes > 0 ? ` · ~${test.estMinutes} min` : ""}</div>
          {test.locked && test.missingPrereqs.length > 0 && (
            <div className="mt-1.5 text-[0.7rem] text-faint">Unlock by completing: {test.missingPrereqs.join(", ")}</div>
          )}
        </div>
        <div className="shrink-0 self-center text-faint">
          {status === "accepted" ? <Icon.check className="h-5 w-5 text-[color:var(--color-positive)]" /> : clickable ? <span className="text-xl">→</span> : test.locked ? <Icon.shield className="h-5 w-5" /> : null}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ track column */
function Track({ label, tone, tests, onOpen }: { label: string; tone: any; tests: TestItem[]; onOpen: (t: TestItem) => void }) {
  const accepted = tests.filter((t) => t.myStatus === "accepted").length;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold"><Badge tone={tone}>{label}</Badge></h3>
        <span className="text-xs text-faint">{accepted}/{tests.length} accepted</span>
      </div>
      <div className="space-y-2">
        {tests.length === 0 ? <Card className="p-6 text-center text-sm text-faint">No tests in this track yet.</Card>
          : tests.map((t) => <TestCard key={t.id} test={t} onOpen={() => onOpen(t)} />)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ history + leaderboard */
function History({ submissions }: { submissions: any[] }) {
  if (!submissions?.length) return <Card className="p-6 text-center text-sm text-faint">No submissions yet — start a test above.</Card>;
  return (
    <Card className="overflow-hidden">
      <div className="divide-y divide-line">
        {submissions.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium">{s.testTitle}</div>
              <div className="text-xs text-faint">{s.track === "cli" ? "CLI" : "Inferno"} · {ago(Number(s.createdAt))}{s.awardedPyrx > 0 ? ` · +${fmt(s.awardedPyrx)} PYRX` : ""}</div>
            </div>
            <Badge tone={STATUS_TONE[(s.reviewStatus as ReviewStatus)] || "muted"}>{STATUS_LABEL[(s.reviewStatus as ReviewStatus)] || s.reviewStatus}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LeaderboardMini({ rows, meId }: { rows: any[]; meId: string }) {
  if (!rows?.length) return null;
  return (
    <Card className="p-5">
      <h3 className="text-base font-bold">Testing leaderboard</h3>
      <p className="mb-2 text-xs text-faint">Top testers by accrued PYRX.</p>
      <div className="space-y-1">
        {rows.slice(0, 8).map((t: any, i: number) => (
          <div key={t.id} className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-sm ${t.id === meId ? "bg-[rgba(246,138,36,0.08)]" : "odd:bg-[rgba(255,255,255,0.02)]"}`}>
            <div className="flex items-center gap-3"><span className="w-5 text-center font-mono text-faint">{i + 1}</span><span className="font-medium">{t.handle ? "@" + t.handle : t.display_name}</span>{t.id === meId && <span className="text-xs text-faint">you</span>}</div>
            <span className="font-mono text-muted">{fmt(Number(t.total))} PYRX</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ================================================================== Tests tab */
export function Tests({ me }: { me: { id: string } }) {
  const [tests, setTests] = useState<TestItem[] | null>(null);
  const [subs, setSubs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [consistency, setConsistency] = useState<any>(null);
  const [board, setBoard] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<TestItem | null>(null);
  const [bugPrefill, setBugPrefill] = useState<BugPrefill | null>(null);

  async function loadCatalog() {
    try { const d = await (await fetch("/api/tests")).json(); if (d.ok) setTests(d.tests); else setErr("Couldn't load tests."); }
    catch { setErr("Network error."); }
  }
  async function loadHistory() {
    try { const d = await (await fetch("/api/tests/submissions")).json(); if (d.ok) { setSubs(d.submissions); setStats(d.stats); setConsistency(d.consistency); } } catch {}
  }
  async function loadBoard() {
    try { const d = await (await fetch("/api/dashboard")).json(); if (d.ok) setBoard(d.leaderboardTop || []); } catch {}
  }
  useEffect(() => { loadCatalog(); loadHistory(); loadBoard(); }, []);

  const cli = useMemo(() => (tests || []).filter((t) => t.track === "cli"), [tests]);
  const inferno = useMemo(() => (tests || []).filter((t) => t.track === "inferno"), [tests]);

  function afterSubmit() { loadCatalog(); loadHistory(); loadBoard(); }

  return (
    <>
      <PageHeader navKey="tests" title="Tests" subtitle="Work through the CLI and Inferno tracks step by step. Capture proof at each step, paste your logs, and submit — accepted tests pay PYRX toward the airdrop." />
      {err && <Card className="mb-4 p-4 text-sm text-[color:var(--color-negative)]">{err}</Card>}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><StreakMeter stats={stats} consistency={consistency} /></div>
        <LeaderboardMini rows={board} meId={me.id} />
      </div>

      {!tests ? (
        <Card className="p-10 text-center text-sm text-muted"><span className="mr-2 inline-block h-4 w-4 animate-spin-slow rounded-full border-2 border-line border-t-[color:var(--color-brand)] align-middle" />Loading tests…</Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Track label="Inferno track" tone="brand" tests={inferno} onOpen={setOpen} />
          <Track label="CLI track" tone="water" tests={cli} onOpen={setOpen} />
        </div>
      )}

      <div className="mt-6">
        <h3 className="mb-3 text-base font-bold">Your submissions</h3>
        <History submissions={subs} />
      </div>

      {open && <Runner test={open} onClose={() => setOpen(null)} onSubmitted={() => { setOpen(null); afterSubmit(); }} onFileBug={(p) => { setOpen(null); setBugPrefill(p); }} />}
      {bugPrefill && <BugForm prefill={bugPrefill} onClose={() => setBugPrefill(null)} onCreated={() => { setBugPrefill(null); }} />}
    </>
  );
}
