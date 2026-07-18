// components/LocalMCQViewer.tsx
"use client";

import { useState, useEffect } from "react";

interface MCQ {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  difficulty?: string;
  topic?: string;
}

interface Props {
  topic: string;
}

export default function LocalMCQViewer({ topic }: Props) {
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => { loadMCQs(); }, [topic]);

  const loadMCQs = async () => {
    setLoading(true); setErrorMsg("");
    try {
      const res = await fetch("/api/local-mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (data.mcqs?.length > 0) {
        setMcqs(data.mcqs); setCurrentIndex(0); setSelectedOption(null);
        setIsRevealed(false); setScore(0); setQuizFinished(false);
      } else setErrorMsg(data.error || "কোনো MCQ পাওয়া যায়নি");
    } catch { setErrorMsg("MCQ লোড করতে সমস্যা হয়েছে"); }
    finally { setLoading(false); }
  };

  const currentMCQ = mcqs[currentIndex] || null;

  const handleOptionSelect = (idx: number) => { if (isRevealed) return; setSelectedOption(idx); };

  const handleCheckAnswer = () => {
    if (selectedOption === null || !currentMCQ) return;
    setIsRevealed(true);
    if (selectedOption === currentMCQ.answer) setScore(p => p + 1);
  };

  const handleNext = () => {
    if (currentIndex + 1 < mcqs.length) { setCurrentIndex(p => p + 1); setSelectedOption(null); setIsRevealed(false); }
    else setQuizFinished(true);
  };

  const handleRetry = () => { setCurrentIndex(0); setSelectedOption(null); setIsRevealed(false); setScore(0); setQuizFinished(false); };

  if (loading) return <div className="text-center py-10"><div className="animate-spin inline-block w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full mb-2" /><p className="text-amber-700">MCQ লোড হচ্ছে...</p></div>;
  if (errorMsg) return <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center"><p className="text-red-600">{errorMsg}</p><button onClick={loadMCQs} className="mt-3 bg-amber-500 text-white px-4 py-2 rounded-xl text-sm">আবার চেষ্টা</button></div>;

  return (
    <div className="space-y-6">
      {!quizFinished && currentMCQ && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="h-2 bg-amber-100"><div className="h-full bg-amber-500 transition-all" style={{ width: `${((currentIndex + (isRevealed ? 1 : 0)) / mcqs.length) * 100}%` }} /></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium bg-amber-100 px-3 py-1 rounded-full">প্রশ্ন {currentIndex + 1} / {mcqs.length}</span>
              <span className="text-sm text-gray-600">সঠিক: {score}</span>
            </div>
            <p className="text-lg font-semibold text-gray-800 mb-5">{currentMCQ.question}</p>
            <div className="space-y-2">
              {currentMCQ.options.map((opt, idx) => {
                const isCorrect = idx === currentMCQ.answer, isSelected = idx === selectedOption;
                let cls = "border-gray-200 bg-white";
                if (isRevealed) { if (isCorrect) cls = "border-green-500 bg-green-50"; else if (isSelected && !isCorrect) cls = "border-red-500 bg-red-50"; else cls = "opacity-60"; }
                else if (isSelected) cls = "border-amber-500 bg-amber-50";
                return <button key={idx} disabled={isRevealed} onClick={() => handleOptionSelect(idx)} className={`w-full text-left p-3 rounded-xl border transition ${cls} ${!isRevealed ? "hover:bg-amber-50" : ""}`}>{String.fromCharCode(65 + idx)}. {opt}</button>;
              })}
            </div>
            <div className="mt-4">
              {!isRevealed ? <button onClick={handleCheckAnswer} disabled={selectedOption === null} className="w-full bg-amber-500 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50">উত্তর দেখুন</button> : (
                <div className="space-y-3">
                  <div className={`p-3 rounded-xl ${selectedOption === currentMCQ.answer ? "bg-green-50 border border-green-300" : "bg-red-50 border border-red-300"}`}><p className="font-bold">{selectedOption === currentMCQ.answer ? "✓ সঠিক!" : "✗ ভুল"}</p>{selectedOption !== currentMCQ.answer && <p className="text-sm">সঠিক: {String.fromCharCode(65 + currentMCQ.answer)}</p>}<p className="text-sm mt-1">{currentMCQ.explanation}</p></div>
                  <button onClick={handleNext} className="w-full bg-amber-500 text-white py-2.5 rounded-xl font-semibold">পরবর্তী →</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {quizFinished && <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center"><div className="text-4xl mb-3">🎯</div><h2 className="text-2xl font-bold text-amber-800 mb-3">কুইজ শেষ!</h2><p className="text-lg">সঠিক: {score} / {mcqs.length} ({Math.round((score / mcqs.length) * 100)}%)</p><button onClick={handleRetry} className="mt-4 bg-amber-500 text-white px-6 py-2 rounded-xl font-semibold">আবার শুরু</button></div>}
    </div>
  );
}