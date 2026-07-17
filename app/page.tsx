"use client";

import { useState, useEffect } from "react";

// ---------- Types ----------
interface MCQ {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

interface SessionRecord {
  id: string;
  date: string;
  topic: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
}

// ---------- Subjects & Sub-topics ----------
const SUBJECTS: Record<string, string[]> = {
  "বাংলা": ["বাংলা ব্যাকরণ", "বাংলা সাহিত্য"],
  "ইংরেজী": ["English Grammar", "English Literature"],
  "গণিত": ["পাটিগণিত", "বীজগণিত"],
  "সাধারণ জ্ঞান": ["বাংলাদেশ", "আন্তর্জাতিক"],
  "বিজ্ঞান": ["পদার্থবিজ্ঞান", "রসায়নবিজ্ঞান"],
  "আইসিটি": ["কম্পিউটার", "তথ্য প্রযুক্তি"],
};

// ---------- localStorage helpers ----------
const HISTORY_KEY = "prepflow_mcq_records";

function loadAllRecords(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecord(record: SessionRecord) {
  const records = loadAllRecords();
  records.push(record);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
}

// ---------- ডামি MCQ জেনারেটর (কোনো API লাগবে না) ----------
function generateDummyMCQs(sourceText: string, topic: string, count: number = 5): MCQ[] {
  const sentences = sourceText
    .split(/[।!?]/)
    .map(s => s.trim())
    .filter(s => s.length > 15);
  if (sentences.length === 0) return [];
  const mcqs: MCQ[] = [];
  for (let i = 0; i < count; i++) {
    const s = sentences[Math.floor(Math.random() * sentences.length)];
    const question = `নিচের বাক্যটির মূল বক্তব্য কী?\n"${s}…"`;
    const correct = `বাক্যটি ${topic} সম্পর্কে একটি গুরুত্বপূর্ণ তথ্য প্রদান করে।`;
    const wrongs = [
      "এটি একটি সম্পূর্ণ ভুল ধারণা।",
      "বাক্যটির কোনো নির্দিষ্ট অর্থ নেই।",
      "উক্ত বাক্যটি অপ্রাসঙ্গিক।"
    ];
    const options = [correct, wrongs[0], wrongs[1], wrongs[2]].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(correct);
    mcqs.push({
      id: `q-${i}-${Date.now()}`,
      question,
      options,
      correctIndex,
      explanation: correct,
      topic,
    });
  }
  return mcqs;
}

// ---------- Main App ----------
export default function Home() {
  const [activeTab, setActiveTab] = useState<"practice" | "progress">("practice");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const [sourceText, setSourceText] = useState("");
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [sessionScores, setSessionScores] = useState<boolean[]>([]);

  const [allRecords, setAllRecords] = useState<SessionRecord[]>([]);

  // load records for progress tab
  useEffect(() => {
    if (activeTab === "progress") {
      setAllRecords(loadAllRecords());
    }
  }, [activeTab]);

  // stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = allRecords.filter(r => r.date.startsWith(todayStr));
  const totalQuestions = allRecords.reduce((sum, r) => sum + r.total, 0);
  const totalCorrect = allRecords.reduce((sum, r) => sum + r.correct, 0);
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const topicAgg: Record<string, { total: number; correct: number }> = {};
  allRecords.forEach(r => {
    if (!topicAgg[r.topic]) topicAgg[r.topic] = { total: 0, correct: 0 };
    topicAgg[r.topic].total += r.total;
    topicAgg[r.topic].correct += r.correct;
  });
  const topicStats = Object.entries(topicAgg)
    .map(([topic, val]) => ({
      topic,
      total: val.total,
      correct: val.correct,
      accuracy: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = allRecords.filter(r => r.date.startsWith(dateStr)).length;
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, count };
  }).reverse();

  // ---------- Handlers ----------
  const handleGenerate = () => {
    if (!sourceText.trim() || !selectedTopic) return;
    setLoading(true);
    setErrorMsg("");
    setMcqs([]);
    setCurrentIndex(0);
    setSelectedOption(null);
    setSessionScores([]);
    setTimeout(() => {
      const newMCQs = generateDummyMCQs(sourceText, selectedTopic, 5);
      if (newMCQs.length === 0) {
        setErrorMsg("কোনো MCQ তৈরি হয়নি। টেক্সট আরও বড় দিন।");
        setLoading(false);
        return;
      }
      setMcqs(newMCQs);
      setLoading(false);
    }, 500);
  };

  const handleOptionClick = (idx: number) => {
    if (selectedOption !== null || !mcqs[currentIndex]) return;
    setSelectedOption(idx);
    setSessionScores(prev => [...prev, idx === mcqs[currentIndex].correctIndex]);
  };

  const handleNext = () => {
    if (currentIndex + 1 < mcqs.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
    } else {
      // save session
      const correctCount = sessionScores.filter(Boolean).length;
      const total = mcqs.length;
      saveRecord({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        topic: selectedTopic!,
        total,
        correct: correctCount,
        wrong: total - correctCount,
        accuracy: Math.round((correctCount / total) * 100),
      });
      // reset
      setSelectedSubject(null);
      setSelectedTopic(null);
      setMcqs([]);
      setSourceText("");
    }
  };

  const resetToSubjects = () => {
    setSelectedSubject(null);
    setSelectedTopic(null);
    setMcqs([]);
    setSourceText("");
  };

  const currentMCQ = mcqs[currentIndex] || null;
  const isQuizOver = mcqs.length > 0 && currentIndex >= mcqs.length;

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-800">PrepFlow</h1>
        <div className="flex gap-2">
          {(["practice", "progress"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-amber-500 text-white shadow"
                  : "bg-white text-amber-800 border border-amber-200"
              }`}
            >
              {tab === "practice" ? "অনুশীলন" : "অগ্রগতি"}
            </button>
          ))}
        </div>
      </div>

      {/* Practice Tab */}
      {activeTab === "practice" && (
        <div>
          {/* Subject selection */}
          {!selectedSubject && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.keys(SUBJECTS).map(subject => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6 hover:shadow-md transition text-center"
                >
                  <span className="text-2xl mb-2 block">
                    {subject === "বাংলা" ? "🇧🇩" :
                     subject === "ইংরেজী" ? "🇬🇧" :
                     subject === "গণিত" ? "🔢" :
                     subject === "সাধারণ জ্ঞান" ? "🌍" :
                     subject === "বিজ্ঞান" ? "🔬" : "💻"}
                  </span>
                  <span className="font-semibold text-amber-900">{subject}</span>
                </button>
              ))}
            </div>
          )}

          {/* Sub-topic selection */}
          {selectedSubject && !selectedTopic && (
            <div className="space-y-4">
              <button onClick={() => setSelectedSubject(null)} className="text-amber-700 text-sm underline">
                ← বিষয় পরিবর্তন
              </button>
              <h2 className="text-xl font-bold text-amber-800">{selectedSubject}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUBJECTS[selectedSubject].map(topic => (
                  <button
                    key={topic}
                    onClick={() => setSelectedTopic(topic)}
                    className="bg-white rounded-xl border border-amber-200 p-4 hover:bg-amber-50 transition text-left"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MCQ Practice Area */}
          {selectedTopic && (
            <div className="space-y-6">
              {/* Top bar */}
              <div className="flex items-center justify-between">
                <button onClick={resetToSubjects} className="text-amber-700 text-sm underline">
                  ← বিষয় পরিবর্তন
                </button>
                <span className="text-sm font-medium text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                  {selectedTopic}
                </span>
                {mcqs.length > 0 && !isQuizOver && (
                  <div className="text-sm text-gray-600">
                    {currentIndex + 1}/{mcqs.length} · {sessionScores.filter(Boolean).length} সঠিক
                  </div>
                )}
              </div>

              {/* Text input */}
              {mcqs.length === 0 && !loading && (
                <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6">
                  <h2 className="font-bold text-lg text-amber-800 mb-2">{selectedTopic}</h2>
                  <textarea
                    value={sourceText}
                    onChange={e => setSourceText(e.target.value)}
                    rows={6}
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    placeholder="এখানে আপনার নোট/টেক্সট পেস্ট করুন (ডামি MCQ তৈরি হবে)"
                  />
                  {errorMsg && <p className="text-red-600 text-sm mt-2">{errorMsg}</p>}
                  <button
                    onClick={handleGenerate}
                    disabled={loading || !sourceText.trim()}
                    className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition"
                  >
                    {loading ? "MCQ তৈরি হচ্ছে..." : "MCQ তৈরি করুন"}
                  </button>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="text-center text-amber-700 mt-10">
                  <div className="animate-spin inline-block w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full mb-2"></div>
                  <p>প্রশ্ন তৈরি হচ্ছে...</p>
                </div>
              )}

              {/* Current MCQ */}
              {currentMCQ && !isQuizOver && (
                <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
                  <div className="h-2 bg-amber-100">
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${((currentIndex + (selectedOption !== null ? 1 : 0)) / mcqs.length) * 100}%` }}
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-lg font-semibold text-gray-800 mb-4">{currentMCQ.question}</p>
                    <div className="space-y-2">
                      {currentMCQ.options.map((opt, idx) => {
                        let className =
                          "w-full text-left p-3 rounded-xl border transition bg-white";
                        if (selectedOption !== null) {
                          if (idx === currentMCQ.correctIndex) className += " border-green-500 bg-green-50";
                          else if (idx === selectedOption) className += " border-red-500 bg-red-50";
                          else className += " opacity-60";
                        } else {
                          className += " border-gray-200 hover:bg-amber-50";
                        }
                        return (
                          <button
                            key={idx}
                            disabled={selectedOption !== null}
                            onClick={() => handleOptionClick(idx)}
                            className={className}
                          >
                            {String.fromCharCode(65 + idx)}. {opt}
                          </button>
                        );
                      })}
                    </div>
                    {selectedOption !== null && (
                      <div className="mt-5 p-4 bg-amber-50 rounded-xl border border-amber-200">
                        <p className={`font-bold text-lg ${selectedOption === currentMCQ.correctIndex ? "text-green-600" : "text-red-500"}`}>
                          {selectedOption === currentMCQ.correctIndex ? "✓ সঠিক!" : "✗ ভুল"}
                        </p>
                        <p className="mt-2 text-sm text-gray-700">{currentMCQ.explanation}</p>
                        <button
                          onClick={handleNext}
                          className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl transition"
                        >
                          {currentIndex + 1 < mcqs.length ? "পরবর্তী প্রশ্ন →" : "ফলাফল দেখুন"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Session finished */}
              {isQuizOver && (
                <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-8 text-center">
                  <h2 className="text-2xl font-bold text-amber-800 mb-4">সেশন শেষ</h2>
                  <p className="text-lg">
                    সঠিক: {sessionScores.filter(Boolean).length} / {mcqs.length} · নির্ভুলতা: {Math.round((sessionScores.filter(Boolean).length / mcqs.length) * 100)}%
                  </p>
                  <button
                    onClick={resetToSubjects}
                    className="mt-6 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-semibold transition"
                  >
                    নতুন বিষয় শুরু করুন
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Progress Tab */}
      {activeTab === "progress" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-amber-800">আপনার অগ্রগতি</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center">
              <p className="text-3xl font-bold text-amber-700">{totalQuestions}</p>
              <p className="text-sm text-gray-500">মোট প্রশ্ন</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center">
              <p className="text-3xl font-bold text-green-600">{totalCorrect}</p>
              <p className="text-sm text-gray-500">সঠিক</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center">
              <p className="text-3xl font-bold text-amber-700">{overallAccuracy}%</p>
              <p className="text-sm text-gray-500">নির্ভুলতা</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5">
            <h3 className="font-bold text-lg text-amber-800 mb-3">টপিক ভিত্তিক পারফরম্যান্স</h3>
            {topicStats.length === 0 ? (
              <p className="text-gray-500 text-sm">এখনো কোনো ডেটা নেই।</p>
            ) : (
              <div className="space-y-3">
                {topicStats.map(ts => (
                  <div key={ts.topic} className="flex items-center gap-3">
                    <span className="w-28 text-sm truncate">{ts.topic}</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${ts.accuracy}%` }}
                      />
                    </div>
                    <span className="text-sm w-16 text-right">{ts.accuracy}% ({ts.total})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5">
            <h3 className="font-bold text-lg text-amber-800 mb-3">গত ৭ দিনের অনুশীলন</h3>
            <div className="flex items-end justify-between h-24">
              {last7Days.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-1">
                  <span className="text-xs text-gray-600">{d.count || ""}</span>
                  <div
                    className="w-6 bg-amber-400 rounded-t"
                    style={{ height: `${Math.max(4, d.count * 10)}px` }}
                  />
                  <span className="text-xs text-gray-400">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}