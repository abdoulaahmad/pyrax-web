// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useState, useEffect, useRef } from "react";
import { Card, Button, Badge, Icon, PageHeader } from "./ui";
import type { TrainingLesson } from "../types/onboarding";
import { motion } from "framer-motion";

export default function Training() {
  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<TrainingLesson | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLessons();
  }, []);

  async function loadLessons() {
    try {
      const r = await fetch("/api/training/lessons");
      const d = await r.json();
      if (d.ok) setLessons(d.lessons || []);
      else setError(d.error || "Failed to load");
    } catch (e) {
      setError("Failed to load lessons.");
    } finally {
      setLoading(false);
    }
  }

  async function completeLesson(id: string) {
    try {
      const r = await fetch(`/api/training/lessons/${id}/complete`, { method: "POST" });
      const d = await r.json();
      if (d.ok) {
         setActiveLesson(null);
         loadLessons();
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) return <div className="p-8 text-center text-muted animate-pulse">Loading training modules...</div>;
  if (error) return <div className="p-8 text-center text-[color:var(--color-negative)]">{error}</div>;

  if (activeLesson) {
     const currentIndex = lessons.findIndex(l => l.id === activeLesson.id);
     const nextLesson = lessons.slice(currentIndex + 1).find(l => !l.completed) || lessons[currentIndex + 1];
     return <LessonView lesson={activeLesson} nextLesson={nextLesson} onBack={() => setActiveLesson(null)} onComplete={() => completeLesson(activeLesson.id)} onNext={() => setActiveLesson(nextLesson)} />;
  }

  const completedCount = lessons.filter(l => l.completed).length;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div>
      <PageHeader eyebrow="Onboarding" index="03" title="Training Modules" subtitle="Complete the required modules to unlock the certification quiz." />
      {progressPercent === 100 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl border border-[color:var(--color-positive)] bg-[rgba(61,220,132,0.1)] flex items-center gap-4">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--color-positive)] text-black shrink-0">
             <Icon.shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-ink">Certification Quiz Unlocked!</h3>
            <p className="text-sm text-muted">You have completed all training modules. Click the <strong className="text-ink">Quiz</strong> tab in the sidebar to begin your certification.</p>
          </div>
        </motion.div>
      )}
      <TrainingProgress percent={progressPercent} completed={completedCount} total={lessons.length} />
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {lessons.map(l => (
           <LessonCard key={l.id} lesson={l} onClick={() => setActiveLesson(l)} />
        ))}
      </div>
    </div>
  );
}

function TrainingProgress({ percent, completed, total }: { percent: number; completed: number; total: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-2">
         <span className="font-semibold text-sm">Your Progress</span>
         <span className="text-sm text-faint">{completed} of {total} completed</span>
      </div>
      <div className="h-2 w-full bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className="h-full bg-[color:var(--color-brand)]" />
      </div>
    </Card>
  );
}

function LessonCard({ lesson, onClick }: { lesson: TrainingLesson; onClick: () => void }) {
  return (
    <Card hover className="p-5 cursor-pointer flex flex-col h-full" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <Badge tone={lesson.completed ? "positive" : "muted"}>{lesson.completed ? "Completed" : "Pending"}</Badge>
        {lesson.required_for_cert && <Icon.shield className="h-4 w-4 text-faint" />}
      </div>
      <h3 className="font-bold text-lg mb-2">{lesson.title}</h3>
      <div className="text-xs text-muted flex items-center gap-1 mb-2">
         <Icon.clock className="h-3 w-3" />
         <span>~{Math.max(3, Math.round(JSON.stringify(lesson.content).length / 500))} min read</span>
      </div>
      <div className="mt-auto pt-4 flex items-center text-sm text-[color:var(--color-brand)] font-medium">
         {lesson.completed ? "Review Module" : "Start Module"} <Icon.activity className="ml-2 h-4 w-4" />
      </div>
    </Card>
  );
}

// ---- Rich text renderer: parses ALL CAPS headings, labeled lines, PYRX numbers ----
function inlineHighlight(text: string): React.ReactNode[] {
  // Highlight: PYRX amounts, percentages, dollar values, port numbers, key terms
  const pattern = /([\d,]+(?:\.\d+)?\s*PYRX|[\d.]+%\+?|\$[\d.]+\s*(?:USD)?|port\s+\d+|72.hour(?:s)?|\d+\+?\s*GB|\d+k\+|Bronze|Silver|Gold|Diamond)/gi;
  const parts = text.split(pattern);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // Highlight matches: PYRX amounts in brand orange, percentages in water blue, tiers in purple
      const isTier = /Bronze|Silver|Gold|Diamond/i.test(part);
      const isPct = /%/.test(part);
      const cls = isTier
        ? 'font-bold text-[#c084fc]'
        : isPct
        ? 'font-semibold text-[color:var(--color-bolt-bright)]'
        : 'font-bold text-[color:var(--color-brand)]';
      return <span key={i} className={cls}>{part}</span>;
    }
    return part;
  });
}

// Matches: "LABEL:", "Stream A (ASIC Mining):", "Layer 1 (TriStream Blockchain):", "Full Node:"
function parseLabel(line: string): { label: string; body: string } | null {
  const m = line.match(/^([A-Za-z][A-Za-z0-9\s\/&(),-]{1,60}):\s*(.+)$/);
  return m ? { label: m[1].trim(), body: m[2].trim() } : null;
}

function renderLines(lines: string[], key: number): React.ReactNode {
  if (!lines.length) return null;

  const labeled = lines.map(parseLabel);
  const allLabeled = labeled.length > 0 && labeled.every(l => l !== null);

  if (allLabeled && lines.length > 1) {
    return (
      <div key={key} className="space-y-2">
        {labeled.map((item, li) => item && (
          <div key={li} className="flex gap-3 items-start p-3 rounded-lg bg-[rgba(246,138,36,0.04)] border border-[rgba(246,138,36,0.12)]">
            <span className="shrink-0 min-w-[120px] text-xs font-bold text-[color:var(--color-brand)] uppercase tracking-wide mt-0.5">{item.label}</span>
            <span className="text-sm text-muted leading-relaxed">{inlineHighlight(item.body)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (labeled[0] && lines.length === 1) {
    const item = labeled[0]!;
    return (
      <div key={key} className="flex gap-3 items-start p-3 rounded-lg bg-[rgba(246,138,36,0.04)] border border-[rgba(246,138,36,0.12)]">
        <span className="shrink-0 min-w-[120px] text-xs font-bold text-[color:var(--color-brand)] uppercase tracking-wide mt-0.5">{item.label}</span>
        <span className="text-sm text-muted leading-relaxed">{inlineHighlight(item.body)}</span>
      </div>
    );
  }

  return (
    <p key={key} className="text-sm text-muted leading-relaxed">
      {inlineHighlight(lines.join(' '))}
    </p>
  );
}

function RichContent({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);

  return (
    <div className="space-y-4">
      {paragraphs.map((para, pi) => {
        const lines = para.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) return null;

        const first = lines[0];
        // ALL CAPS heading (e.g. "THE TRISTREAM CONSENSUS", "NODE TYPES")
        const isHeading = first.length >= 6 && first === first.toUpperCase() && /[A-Z]{3}/.test(first) && !parseLabel(first);

        if (isHeading) {
          const rest = lines.slice(1);
          return (
            <div key={pi}>
              <div className="mt-6 mb-3">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[color:var(--color-brand)]">{first}</span>
              </div>
              {rest.length > 0 && renderLines(rest, pi)}
            </div>
          );
        }

        return renderLines(lines, pi);
      })}
    </div>
  );
}

function LessonView({ lesson, nextLesson, onBack, onComplete, onNext }: { lesson: TrainingLesson; nextLesson?: TrainingLesson; onBack: () => void; onComplete: () => void; onNext: () => void }) {
  const content = lesson.content;
  const quiz = content?.quiz || [];
  const sections = content?.sections || [];
  const hasSections = sections.length > 0;
  const totalPages = (hasSections ? sections.length : 1) + (quiz.length > 0 ? 1 : 0);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  // Compute text for current step
  let currentText = '';
  if (currentStep === 0 && content?.intro) currentText += content.intro + ' ';
  if (currentStep < sections.length) {
    currentText += sections[currentStep]?.content || '';
  } else if (!hasSections && currentStep === 0 && typeof content === 'string') {
    currentText = content;
  }
  
  // Flat 15-second read timer per section
  const minReadSeconds = (lesson.completed || currentStep >= (hasSections ? sections.length : 1)) ? 0 : 15;

  const [secondsLeft, setSecondsLeft] = useState(minReadSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!lesson.completed) {
      fetch(`/api/training/lessons/${lesson.id}/start`, { method: 'POST' }).catch(() => {});
    }

    if (lesson.completed && quiz.length > 0) {
      const correctAnswers: Record<number, number> = {};
      quiz.forEach((q: any, i: number) => { correctAnswers[i] = q.correct_answer; });
      setAnswers(correctAnswers);
      setShowResults(true);
      setCurrentStep(totalPages - 1); // Skip to quiz if completed
    }
  }, [lesson.id, lesson.completed]);

  useEffect(() => {
    if (!lesson.completed && minReadSeconds > 0) {
      setSecondsLeft(minReadSeconds);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentStep, minReadSeconds, lesson.completed]);

  const readTimeUnlocked = lesson.completed || secondsLeft === 0;

  const handleSelect = (qIdx: number, oIdx: number) => {
    if (lesson.completed) return;
    setAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
    setShowResults(false);
  };

  const allAnswered = quiz.length > 0 && Object.keys(answers).length === quiz.length;
  const allCorrect = quiz.length === 0 || quiz.every((q: any, i: number) => answers[i] === q.correct_answer);

  const checkAnswers = () => setShowResults(true);
  
  const nextStep = () => {
    if (currentStep < totalPages - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  let renderContent;
  const isQuizStep = currentStep === (hasSections ? sections.length : 1) && quiz.length > 0;

  if (isQuizStep) {
    renderContent = (
      <div className="border-t border-line pt-4">
        <h3 className="text-xl font-bold mb-4 text-[color:var(--color-brand)]">Module Knowledge Check</h3>
        <p className="text-sm text-muted mb-6">Answer the questions below to unlock module completion.</p>
        
        <div className="space-y-6">
          {quiz.map((q: any, i: number) => {
            const isAnswered = answers[i] !== undefined;
            const isCorrect = answers[i] === q.correct_answer;
            const showFeedback = showResults || lesson.completed;

            return (
              <div key={i} className={`p-5 rounded-xl border ${showFeedback ? (isCorrect ? 'border-[color:var(--color-positive)] bg-[rgba(61,220,132,0.05)]' : 'border-[#ef4444] bg-[rgba(239,68,68,0.05)]') : 'border-line bg-[rgba(0,0,0,0.2)]'}`}>
                <p className="font-semibold mb-4 text-ink">{i + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options.map((opt: string, oIdx: number) => {
                    const selected = answers[i] === oIdx;
                    return (
                      <label key={oIdx} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${selected ? 'border-[color:var(--color-brand)] bg-[rgba(246,138,36,0.1)]' : 'border-line hover:border-[rgba(255,255,255,0.2)]'} ${lesson.completed ? 'cursor-default' : ''}`}>
                        <input type="radio" name={`quiz-${i}`} checked={selected} onChange={() => handleSelect(i, oIdx)} disabled={lesson.completed} className="text-brand focus:ring-brand" />
                        <span className={`text-sm ${selected ? 'text-ink font-medium' : 'text-muted'}`}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
                {showFeedback && (
                  <div className={`mt-4 text-sm font-medium ${isCorrect ? 'text-[color:var(--color-positive)]' : 'text-[#ef4444]'}`}>
                    {isCorrect ? <span className="flex items-center gap-1"><Icon.check className="h-4 w-4" /> Correct! {q.explanation && <span className="text-muted font-normal ml-2">{q.explanation}</span>}</span> : <span className="flex items-center gap-1"><Icon.alert className="h-4 w-4" /> Incorrect. Try again.</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (hasSections) {
    const s = sections[currentStep];
    renderContent = (
      <div>
        {currentStep === 0 && content.intro && (
          <div className="mb-6 p-4 rounded-xl bg-[rgba(246,138,36,0.06)] border border-[rgba(246,138,36,0.2)]">
            <p className="text-sm leading-relaxed text-muted italic">{content.intro}</p>
          </div>
        )}
        {s && (
          <div className="mb-2">
            <h3 className="text-xl font-semibold mb-5 text-ink flex items-center gap-2">
              <span className="block h-5 w-1 rounded-full bg-[color:var(--color-brand)]" />
              {s.title}
            </h3>
            <RichContent text={s.content} />
          </div>
        )}
      </div>
    );
  } else if (typeof content === 'string') {
    renderContent = <RichContent text={content} />;
  } else {
    renderContent = <pre className="whitespace-pre-wrap leading-relaxed text-xs p-4 bg-[rgba(0,0,0,0.2)] rounded-lg">{JSON.stringify(content, null, 2)}</pre>;
  }

  return (
    <div className="max-w-3xl mx-auto">
       <Button variant="ghost" onClick={onBack} className="mb-6 flex items-center gap-2">
         <span className="text-lg">←</span> Back to Modules
       </Button>
       <Card className="p-8">
          <div className="mb-6 flex items-center justify-between border-b border-line pb-6">
            <div>
              <h1 className="text-3xl font-semibold">{lesson.title}</h1>
              {totalPages > 1 && <div className="mt-2 text-sm font-medium text-brand">Part {currentStep + 1} of {totalPages}</div>}
            </div>
            {lesson.completed && <Badge tone="positive">Completed</Badge>}
          </div>
          
          <div className="prose prose-invert max-w-none text-muted mb-8">
            {renderContent}
          </div>

          <div className="mt-10 pt-6 border-t border-line flex flex-wrap items-center justify-end gap-3">
            {!lesson.completed ? (
              <>
                {!readTimeUnlocked && !isQuizStep && (
                  <span className="text-xs text-muted flex items-center gap-1.5 mr-auto">
                    <Icon.clock className="h-3.5 w-3.5" />
                    Read time remaining: <strong className="text-ink tabular-nums">{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</strong>
                  </span>
                )}
                {isQuizStep && !showResults && (
                  <Button onClick={checkAnswers} disabled={!allAnswered} className="bg-line text-ink px-6 py-2 rounded-lg font-bold hover:bg-[rgba(255,255,255,0.2)] transition disabled:opacity-50 disabled:cursor-not-allowed">
                    Check Answers
                  </Button>
                )}
                
                {currentStep < totalPages - 1 ? (
                  <Button onClick={nextStep} disabled={!readTimeUnlocked} variant="primary" className="px-6 py-2.5">
                    Next Section →
                  </Button>
                ) : (
                  <Button onClick={onComplete} disabled={!showResults || !allCorrect} variant="primary" className="px-6 py-2.5">
                    Complete Lesson
                  </Button>
                )}
              </>
            ) : (
               <div className="flex items-center gap-3 w-full justify-between">
                 {currentStep > 0 && <Button variant="ghost" onClick={() => setCurrentStep(prev => prev - 1)}>← Previous</Button>}
                 <div className="flex items-center gap-3 ml-auto">
                   {currentStep < totalPages - 1 ? (
                     <Button onClick={nextStep} variant="primary" className="px-6 py-2.5">
                       Next Section →
                     </Button>
                   ) : (
                     <>
                       <Button variant="ghost" onClick={onBack}>Done</Button>
                       {nextLesson && (
                         <Button onClick={onNext} variant="primary" className="px-6 py-2.5">
                           Next Module: {nextLesson.title}
                         </Button>
                       )}
                     </>
                   )}
                 </div>
               </div>
            )}
          </div>
       </Card>
    </div>
  );
}