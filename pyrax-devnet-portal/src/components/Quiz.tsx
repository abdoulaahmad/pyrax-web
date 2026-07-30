// SPDX-License-Identifier: LicenseRef-Proprietary
import React, { useState, useEffect } from "react";
import { Card, Button, Badge, Icon, PageHeader } from "./ui";
import { QUIZ_MAX_RETRIES } from "../lib/onboarding";
import type { QuizQuestion, QuizAttempt } from "../types/onboarding";
import { motion } from "framer-motion";

type QuizState = 'intro' | 'active' | 'review';

export default function Quiz() {
  const [state, setState] = useState<QuizState>('intro');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [history, setHistory] = useState<QuizAttempt[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const r = await fetch("/api/quiz/history");
      const d = await r.json();
      if (d.ok) setHistory(d.history || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function startQuiz() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/quiz/start");
      const d = await r.json();
      if (d.ok) {
        setQuestions(d.questions);
        setAnswers({});
        setState('active');
      } else {
        setError(d.error || "Failed to start quiz.");
      }
    } catch (e) {
      setError("Failed to start quiz.");
    } finally {
      setLoading(false);
    }
  }

  async function submitQuiz() {
    setLoading(true);
    try {
      const r = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers })
      });
      const d = await r.json();
      if (d.ok) {
        setResult(d);
        setState('review');
        loadHistory();
      } else {
        setError(d.error || "Submission failed");
      }
    } catch (e) {
      setError("Submission failed");
    } finally {
      setLoading(false);
    }
  }

  if (state === 'intro') {
    const attemptsRemaining = QUIZ_MAX_RETRIES > 0 ? QUIZ_MAX_RETRIES - history.length : 'Unlimited';
    const canAttempt = QUIZ_MAX_RETRIES === 0 || history.length < QUIZ_MAX_RETRIES;
    const hasPassed = history.some(h => h.passed);

    return (
      <div className="max-w-4xl mx-auto">
        <PageHeader title="Certification Quiz" subtitle="Pass the quiz to become a certified node operator." />
        <Card className="p-8 mt-6">
          <div className="flex flex-col items-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[rgba(245,134,34,0.1)] text-[color:var(--color-brand)] mb-4">
               <Icon.shield className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Ready to test your knowledge?</h2>
            <p className="text-muted max-w-lg mb-6">
              The quiz consists of randomized questions based on the training modules. 
              You need a score of 80% or higher to pass and receive your certification.
            </p>
            {QUIZ_MAX_RETRIES > 0 && !hasPassed && (
              <div className="mb-8 font-medium bg-[rgba(255,255,255,0.05)] py-2 px-6 rounded-full border border-line">
                 Attempts Remaining: <span className={`font-bold ${attemptsRemaining === 0 ? "text-[color:var(--color-danger)]" : "text-white"}`}>{attemptsRemaining}</span> of {QUIZ_MAX_RETRIES}
              </div>
            )}
            {error && <div className="mb-4 text-[color:var(--color-danger)]">{error}</div>}
            
            {hasPassed ? (
               <Badge tone="positive" className="text-lg py-3 px-6">Certification Passed!</Badge>
            ) : (
               <Button onClick={startQuiz} disabled={loading || !canAttempt} className="bg-[color:var(--color-brand)] text-black px-8 py-3 rounded-lg font-bold hover:bg-orange-400 transition text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                 {loading ? "Starting..." : (canAttempt ? "Start Quiz" : "No attempts remaining")}
               </Button>
            )}
          </div>
        </Card>
        
        {history.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-bold mb-4">Previous Attempts</h3>
            <div className="grid gap-3">
              {history.map(h => (
                <Card key={h.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{new Date(h.created_at).toLocaleDateString()}</div>
                    <div className="text-sm text-faint">Score: {h.score}%</div>
                  </div>
                  <Badge tone={h.passed ? "positive" : "danger"}>{h.passed ? "Passed" : "Failed"}</Badge>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (state === 'active') {
    return (
      <div className="max-w-3xl mx-auto">
         <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Certification Quiz</h1>
            <span className="text-muted text-sm">{Object.keys(answers).length} of {questions.length} answered</span>
         </div>
         <div className="grid gap-6">
           {questions.map((q, idx) => (
             <Card key={q.id} className="p-6">
               <div className="font-bold mb-4"><span className="text-[color:var(--color-brand)] mr-2">{idx + 1}.</span> {q.question}</div>
               <div className="space-y-2 mt-4">
                 {q.options.map((opt, i) => (
                   <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${answers[q.id] === i ? 'border-[color:var(--color-brand)] bg-[rgba(245,134,34,0.05)]' : 'border-line hover:border-[rgba(255,255,255,0.2)]'}`}>
                     <input type="radio" name={`q-${q.id}`} value={i} checked={answers[q.id] === i} onChange={() => setAnswers({...answers, [q.id]: i})} className="mt-1" />
                     <span>{opt}</span>
                   </label>
                 ))}
               </div>
             </Card>
           ))}
         </div>
         <div className="mt-8 flex justify-end">
           <Button onClick={submitQuiz} disabled={loading || Object.keys(answers).length < questions.length} className="bg-[color:var(--color-brand)] text-black px-6 py-2 rounded-lg font-bold hover:bg-orange-400 transition disabled:opacity-50 disabled:cursor-not-allowed">
             {loading ? "Submitting..." : "Submit Quiz"}
           </Button>
         </div>
      </div>
    );
  }

  if (state === 'review') {
    return (
      <div className="max-w-2xl mx-auto text-center mt-12">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className={`mx-auto grid h-24 w-24 place-items-center rounded-full mb-6 ${result.passed ? 'bg-[rgba(52,211,153,0.1)] text-[color:var(--color-positive)]' : 'bg-[rgba(239,68,68,0.1)] text-red-500'}`}>
            {result.passed ? <Icon.check className="h-12 w-12" /> : <Icon.alert className="h-12 w-12" />}
          </div>
          <h1 className="text-4xl font-extrabold mb-2">{result.passed ? "Congratulations!" : "Keep Trying"}</h1>
          <p className="text-xl text-muted mb-6">You scored <span className="font-bold text-white">{result.score}%</span></p>
          
          <Card className="p-6 text-left mb-8 bg-[rgba(0,0,0,0.2)]">
            <h3 className="font-bold mb-2">Feedback</h3>
            <p className="text-sm text-faint">{result.explanation || (result.passed ? "You have successfully passed the certification quiz. You can now proceed to download the node software." : "You did not reach the 80% passing score. Please review the training materials and try again.")}</p>
          </Card>

          <Button onClick={() => result.passed ? window.location.reload() : setState('intro')} className="bg-[rgba(255,255,255,0.1)] px-6 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.15)] transition">
            {result.passed ? "Continue to Next Steps" : "Return to Quiz Dashboard"}
          </Button>
        </motion.div>
      </div>
    );
  }

  return null;
}
