// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useState, useEffect } from "react";
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
  if (error) return <div className="p-8 text-center text-[color:var(--color-danger)]">{error}</div>;

  if (activeLesson) {
     return <LessonView lesson={activeLesson} onBack={() => setActiveLesson(null)} onComplete={() => completeLesson(activeLesson.id)} />;
  }

  const completedCount = lessons.filter(l => l.completed).length;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div>
      <PageHeader title="Training Modules" subtitle="Complete the required modules to unlock the certification quiz." />
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
      <div className="mt-auto pt-4 flex items-center text-sm text-[color:var(--color-brand)] font-medium">
         {lesson.completed ? "Review Module" : "Start Module"} <Icon.activity className="ml-2 h-4 w-4" />
      </div>
    </Card>
  );
}

function LessonView({ lesson, onBack, onComplete }: { lesson: TrainingLesson; onBack: () => void; onComplete: () => void }) {
  const content = lesson.content;
  let renderContent;

  if (typeof content === 'string') {
    renderContent = <div className="whitespace-pre-wrap leading-relaxed">{content}</div>;
  } else if (content?.intro || content?.sections) {
    renderContent = (
      <div>
        {content.intro && <p className="mb-6 text-lg">{content.intro}</p>}
        {content.sections?.map((s: any, i: number) => (
          <div key={i} className="mb-6">
            <h3 className="text-xl font-bold mb-2 text-[color:var(--color-ink)]">{s.title}</h3>
            <p className="whitespace-pre-wrap leading-relaxed">{s.content}</p>
          </div>
        ))}
      </div>
    );
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
            <h1 className="text-3xl font-extrabold">{lesson.title}</h1>
            {lesson.completed && <Badge tone="positive">Completed</Badge>}
          </div>
          
          <div className="prose prose-invert max-w-none text-muted mb-8">
            {renderContent}
          </div>

          <div className="mt-10 pt-6 border-t border-line flex justify-end">
            {!lesson.completed ? (
               <Button onClick={onComplete} className="bg-[color:var(--color-brand)] text-black px-6 py-2 rounded-lg font-bold hover:bg-orange-400 transition">
                 Complete Lesson
               </Button>
            ) : (
               <Button variant="ghost" onClick={onBack}>Done</Button>
            )}
          </div>
       </Card>
    </div>
  );
}
