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

interface Props { topic: string; }

// MCQ Bank সরাসরি এখানে
const MCQ_BANK: Record<string, MCQ[]> = {
  "বাংলা ব্যাকরণ": [
    {
      id: "s1",
      question: "'উপশহর' শব্দে 'উপ' উপসর্গটি কোন অর্থে ব্যবহৃত হয়েছে?",
      options: ["ক্ষুদ্র অর্থে", "সাদৃশ্য অর্থে", "সমীপ্য অর্থে", "বিরোধ অর্থে"],
      answer: 1,
      explanation: "শহরের সদৃশ = উপশহর। এখানে 'উপ' উপসর্গটি সাদৃশ্য অর্থে ব্যবহৃত।"
    },
    {
      id: "s2",
      question: "'যথারীতি' শব্দে 'যথা' উপসর্গটি কোন অর্থ প্রকাশ করে?",
      options: ["সাদৃশ্য", "অতিক্রান্ত", "অনতিক্রম্যতা", "বিরোধ"],
      answer: 2,
      explanation: "রীতিকে অতিক্রম না করে = যথারীতি। 'যথা' উপসর্গটি অনতিক্রম্যতা অর্থে ব্যবহৃত।"
    },
    {
      id: "s3",
      question: "'উচ্ছৃঙ্খল' শব্দে 'উৎ' উপসর্গটি কোন অর্থে ব্যবহৃত?",
      options: ["ঈষৎ অর্থে", "অতিক্রান্ত অর্থে", "ক্ষুদ্র অর্থে", "পূর্ণ অর্থে"],
      answer: 1,
      explanation: "শৃঙ্খলাকে অতিক্রান্ত = উচ্ছৃঙ্খল। 'উৎ' উপসর্গটি অতিক্রান্ত অর্থে ব্যবহৃত।"
    },
    {
      id: "s4",
      question: "'প্রতিবাদ' শব্দে 'প্রতি' উপসর্গটি কোন অর্থে ব্যবহৃত?",
      options: ["পশ্চাৎ অর্থে", "প্রতিনিধি অর্থে", "বিরোধ অর্থে", "সাদৃশ্য অর্থে"],
      answer: 2,
      explanation: "বিরুদ্ধ বাদ = প্রতিবাদ। 'প্রতি' উপসর্গটি বিরোধ অর্থে ব্যবহৃত।"
    },
    {
      id: "s5",
      question: "সমাস কাকে বলে?",
      options: ["দুটি পদের মিলন", "পরস্পর সম্পর্কযুক্ত দুই বা ততোধিক পদের এক পদে পরিণত হওয়া", "শব্দের বিভক্তি যোগ", "উপসর্গ যোগ"],
      answer: 1,
      explanation: "পরস্পর সম্পর্কযুক্ত দুই বা ততোধিক পদ এক পদে পরিণত হওয়াকে সমাস বলে।"
    }
  ],
  "বাংলা সাহিত্য": [
    {
      id: "n1",
      question: "কাজী নজরুল ইসলামের জন্মস্থান কোথায়?",
      options: ["ঢাকা", "চুরুলিয়া, বর্ধমান", "কলকাতা", "কুমিল্লা"],
      answer: 1,
      explanation: "নজরুল পশ্চিমবঙ্গের বর্ধমান জেলার চুরুলিয়ায় জন্মগ্রহণ করেন।"
    },
    {
      id: "n2",
      question: "নজরুলের প্রথম প্রকাশিত কবিতা কোনটি?",
      options: ["বিদ্রোহী", "আনন্দময়ীর আগমনে", "মুক্তি", "প্রলয়শিখা"],
      answer: 2,
      explanation: "১৯১৯ সালে 'মুক্তি' কবিতাটি বঙ্গীয় মুসলিম সাহিত্য পত্রিকায় প্রকাশিত হয়।"
    },
    {
      id: "n3",
      question: "জীবনানন্দ দাশ কত সালে জন্মগ্রহণ করেন?",
      options: ["১৮৯৯", "১৯০০", "১৯০১", "১৯০২"],
      answer: 0,
      explanation: "জীবনানন্দ দাশ ১৮৯৯ সালের ১৭ ফেব্রুয়ারি বরিশালে জন্মগ্রহণ করেন।"
    },
    {
      id: "n4",
      question: "'আবার আসিব ফিরে ধানসিঁড়িটির তীরে' — কার লেখা?",
      options: ["রবীন্দ্রনাথ", "নজরুল", "জীবনানন্দ দাশ", "জসীমউদ্দীন"],
      answer: 2,
      explanation: "এটি জীবনানন্দ দাশের বিখ্যাত কবিতা।"
    }
  ]
};

export default function LocalMCQViewer({ topic }: Props) {
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    setLoading(true);
    const found = MCQ_BANK[topic];
    if (found && found.length > 0) {
      const shuffled = [...found].sort(() => Math.random() - 0.5);
      setMcqs(shuffled);
      setCurrentIndex(0); setSelectedOption(null); setIsRevealed(false); setScore(0); setQuizFinished(false);
      setErrorMsg("");
    } else {
      setErrorMsg("এই টপিকের MCQ এখনো তৈরি হয়নি। নতুন MCQ তৈরি করতে AI MCQ ব্যবহার করুন।");
    }
    setLoading(false);
  }, [topic]);

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
  if (errorMsg) return <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center"><p className="text-red-600">{errorMsg}</p></div>;

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