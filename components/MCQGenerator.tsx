// components/MCQGenerator.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ---------- Types ----------
interface MCQ {
  id?: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  explanation: string;
  difficulty?: "easy" | "hard";
  subtopic?: string;
}

interface SavedFile {
  base64: string;
  mimeType: string;
  fileName: string;
}

interface QuestionBank {
  sourceText: string;
  questions: MCQ[];
  createdAt: string;
}

interface PerQuestionStats {
  attempts: number;
  correct: number;
}

interface DailyStats {
  attempted: number;
  correct: number;
}

interface TopicStats {
  totalAttempted: number;
  totalCorrect: number;
  perQuestion: Record<string, PerQuestionStats>;
  daily: Record<string, DailyStats>;
  history: { date: string; correct: boolean }[];
}

interface Props {
  topic: string;
}

// ---------- Constants ----------
const HISTORY_KEY = "prepflow_results";
const MAX_HISTORY = 200;

// ---------- localStorage helpers ----------
function safeGetItem(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSetItem(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
function safeRemoveItem(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getBankKey(topic: string): string {
  return `prepflow_bank_${topic}`;
}
function getStatsKey(topic: string): string {
  return `prepflow_stats_${topic}`;
}
function getTopicFileKey(topic: string): string {
  return `prepflow_file_${topic}`;
}
function getTopicSourceKey(topic: string): string {
  return `prepflow_source_${topic}`;
}

// ---------- Stats helpers ----------
function emptyStats(): TopicStats {
  return { totalAttempted: 0, totalCorrect: 0, perQuestion: {}, daily: {}, history: [] };
}

function loadStats(topic: string): TopicStats {
  const key = getStatsKey(topic);
  const raw = safeGetItem(key);
  if (!raw) return emptyStats();
  try { return JSON.parse(raw); } catch { return emptyStats(); }
}

function saveStats(topic: string, stats: TopicStats) {
  const key = getStatsKey(topic);
  safeSetItem(key, JSON.stringify(stats));
}

function loadResults(): { topic: string; date: string; correct: boolean }[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveResult(topic: string, correct: boolean) {
  const results = loadResults();
  results.push({ topic, date: new Date().toISOString().slice(0, 10), correct });
  safeSetItem(HISTORY_KEY, JSON.stringify(results));
}

function getQuestionAccuracy(stats: TopicStats, qId: string): number {
  const q = stats.perQuestion[qId];
  if (!q || q.attempts === 0) return 0;
  return (q.correct / q.attempts) * 100;
}

function isMastered(stats: TopicStats, qId: string): boolean {
  const accuracy = getQuestionAccuracy(stats, qId);
  const attempts = stats.perQuestion[qId]?.attempts || 0;
  return accuracy >= 80 && attempts >= 3;
}

function computeMastery(stats: TopicStats): { level: string; score: number } {
  if (stats.totalAttempted === 0) return { level: "শুরু", score: 0 };
  const totalQuestions = Object.keys(stats.perQuestion).length;
  if (totalQuestions < 15) return { level: "শুরু", score: 0 };

  const overallAccuracy = (stats.totalCorrect / stats.totalAttempted) * 100;
  const recentHistory = stats.history.slice(-20);
  const recentCorrect = recentHistory.filter(h => h.correct).length;
  const recentAccuracy = recentHistory.length > 0 ? (recentCorrect / recentHistory.length) * 100 : overallAccuracy;

  const score = Math.round(overallAccuracy * 0.6 + recentAccuracy * 0.4);

  if (score >= 90) return { level: "মাস্টার লেভেল 🏆", score };
  if (score >= 75) return { level: "দক্ষ", score };
  if (score >= 55) return { level: "উন্নতিশীল", score };
  if (score >= 35) return { level: "অনুশীলন প্রয়োজন", score };
  return { level: "শুরু", score };
}

// ---------- MCQGenerator Component ----------
export default function MCQGenerator({ topic }: Props) {
  // Tab state
  const [activeTab, setActiveTab] = useState<"practice" | "progress">("practice");

  // Input state
  const [textInput, setTextInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Bank & Stats
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [stats, setStats] = useState<TopicStats>(emptyStats);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasBank, setHasBank] = useState(false);

  // Quiz state
  const [currentQuestion, setCurrentQuestion] = useState<MCQ | null>(null);
  const [currentQId, setCurrentQId] = useState<string>("");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [allMastered, setAllMastered] = useState(false);

  // Saved file info
  const [savedFileName, setSavedFileName] = useState<string | null>(null);
  const [fileSizeWarning, setFileSizeWarning] = useState(false);

  // Exclude list
  const [excludeIds, setExcludeIds] = useState<string[]>([]);

  // ---------- Load bank on mount ----------
  useEffect(() => {
    const bankKey = getBankKey(topic);
    const raw = safeGetItem(bankKey);
    if (raw) {
      try {
        const bank: QuestionBank = JSON.parse(raw);
        setMcqs(bank.questions);
        setHasBank(true);
      } catch {}
    }
    // Load file info
    const fileKey = getTopicFileKey(topic);
    const savedFileRaw = safeGetItem(fileKey);
    if (savedFileRaw) {
      try {
        const parsed: SavedFile = JSON.parse(savedFileRaw);
        setSavedFileName(parsed.fileName);
      } catch {}
    }
    // Load source text
    const sourceKey = getTopicSourceKey(topic);
    const savedSource = safeGetItem(sourceKey);
    if (savedSource) setTextInput(savedSource);

    // Load stats
    setStats(loadStats(topic));
  }, [topic]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) setTextInput("");
  };

  const clearFile = () => {
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // ---------- Weighted random pick ----------
  const pickNextQuestion = useCallback((bank: MCQ[], currentStats: TopicStats, exclude: string[]): { question: MCQ; id: string } | null => {
    const active = bank.filter(q => {
      if (exclude.includes(q.id!)) return false;
      return !isMastered(currentStats, q.id!);
    });
    if (active.length === 0) return null;

    const weights = active.map(q => {
      const acc = getQuestionAccuracy(currentStats, q.id!);
      const attempts = currentStats.perQuestion[q.id!]?.attempts || 0;
      if (attempts === 0) return 3;
      if (acc < 50) return 4;
      if (acc < 80) return 2;
      return 1;
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < active.length; i++) {
      random -= weights[i];
      if (random <= 0) return { question: active[i], id: active[i].id! };
    }
    return { question: active[active.length - 1], id: active[active.length - 1].id! };
  }, []);

  // ---------- MCQ Generation ----------
  const generateMCQs = async () => {
    if (!textInput.trim() && !file && !savedFileName) {
      setErrorMsg("দয়া করে টেক্সট দিন অথবা একটি ফাইল সিলেক্ট করুন।");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setAllMastered(false);
    setExcludeIds([]);
    setScore(0);
    setSessionCount(0);

    try {
      let fileBase64 = "";
      let fileMimeType = "";
      let fileName = "";
      let effectiveSource = textInput.trim();

      if (file) {
        fileBase64 = await toBase64(file);
        fileMimeType = file.type;
        fileName = file.name;
        effectiveSource = effectiveSource || fileName;
      } else if (savedFileName) {
        const fileKey = getTopicFileKey(topic);
        const saved = safeGetItem(fileKey);
        if (saved) {
          const parsed: SavedFile = JSON.parse(saved);
          fileBase64 = parsed.base64;
          fileMimeType = parsed.mimeType;
          fileName = parsed.fileName;
          effectiveSource = effectiveSource || fileName;
        }
      }

      const response = await fetch("/api/generate-mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          textInput: effectiveSource,
          fileBase64,
          fileMimeType,
          count: 10,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "API request failed");
      if (!Array.isArray(data.mcqs) || data.mcqs.length === 0) {
        throw new Error("কোনো MCQ তৈরি হয়নি। কনটেন্ট আরও সমৃদ্ধ করুন।");
      }

      const questions: MCQ[] = data.mcqs.map((q: MCQ, i: number) => ({
        ...q,
        id: q.id || `q-${i}-${Date.now()}`,
      }));

      // Save bank
      const bank: QuestionBank = {
        sourceText: effectiveSource,
        questions,
        createdAt: new Date().toISOString(),
      };
      safeSetItem(getBankKey(topic), JSON.stringify(bank));
      safeSetItem(getTopicSourceKey(topic), effectiveSource);
      if (fileBase64) {
        const saved: SavedFile = { base64: fileBase64, mimeType: fileMimeType, fileName };
        const ok = safeSetItem(getTopicFileKey(topic), JSON.stringify(saved));
        if (!ok) setFileSizeWarning(true);
        else setSavedFileName(fileName);
      }

      // Fresh stats
      const freshStats = emptyStats();
      saveStats(topic, freshStats);
      setStats(freshStats);

      setMcqs(questions);
      setHasBank(true);

      // Pick first question
      const picked = pickNextQuestion(questions, freshStats, []);
      if (picked) {
        setCurrentQuestion(picked.question);
        setCurrentQId(picked.id);
        setSelectedAnswer(null);
        setIsAnswered(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "MCQ তৈরিতে অজানা ত্রুটি।");
    } finally {
      setLoading(false);
    }
  };

  const startPractice = () => {
    const freshStats = loadStats(topic);
    setStats(freshStats);
    setScore(0);
    setSessionCount(0);
    setExcludeIds([]);
    setAllMastered(false);
    const picked = pickNextQuestion(mcqs, freshStats, []);
    if (picked) {
      setCurrentQuestion(picked.question);
      setCurrentQId(picked.id);
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  };

  // ---------- Quiz handlers ----------
  const handleOptionSelect = (key: string) => {
    if (isAnswered) return;
    setSelectedAnswer(key);
  };

  const handleAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;
    const correct = selectedAnswer === currentQuestion.correctAnswer;
    setIsAnswered(true);
    setSessionCount(prev => prev + 1);
    if (correct) setScore(prev => prev + 1);

    // Update stats
    const today = new Date().toISOString().slice(0, 10);
    const updatedStats: TopicStats = {
      ...stats,
      totalAttempted: stats.totalAttempted + 1,
      totalCorrect: stats.totalCorrect + (correct ? 1 : 0),
      perQuestion: { ...stats.perQuestion },
      daily: { ...stats.daily },
      history: [...stats.history, { date: today, correct }],
    };

    if (!updatedStats.perQuestion[currentQId]) {
      updatedStats.perQuestion[currentQId] = { attempts: 0, correct: 0 };
    }
    updatedStats.perQuestion[currentQId] = {
      attempts: updatedStats.perQuestion[currentQId].attempts + 1,
      correct: updatedStats.perQuestion[currentQId].correct + (correct ? 1 : 0),
    };

    if (!updatedStats.daily[today]) {
      updatedStats.daily[today] = { attempted: 0, correct: 0 };
    }
    updatedStats.daily[today] = {
      attempted: updatedStats.daily[today].attempted + 1,
      correct: updatedStats.daily[today].correct + (correct ? 1 : 0),
    };

    if (updatedStats.history.length > MAX_HISTORY) {
      updatedStats.history = updatedStats.history.slice(-MAX_HISTORY);
    }

    setStats(updatedStats);
    saveStats(topic, updatedStats);
    saveResult(topic, correct);
  };

  const handleNext = () => {
    const newExclude = [...excludeIds, currentQId];
    setExcludeIds(newExclude);

    const picked = pickNextQuestion(mcqs, stats, newExclude);
    if (!picked) {
      setAllMastered(true);
      return;
    }
    setCurrentQuestion(picked.question);
    setCurrentQId(picked.id);
    setSelectedAnswer(null);
    setIsAnswered(false);
  };

  const handleReset = () => {
    safeRemoveItem(getBankKey(topic));
    safeRemoveItem(getStatsKey(topic));
    safeRemoveItem(getTopicSourceKey(topic));
    safeRemoveItem(getTopicFileKey(topic));
    setMcqs([]);
    setHasBank(false);
    setCurrentQuestion(null);
    setScore(0);
    setSessionCount(0);
    setAllMastered(false);
    setTextInput("");
    setFile(null);
    setSavedFileName(null);
    setStats(emptyStats());
  };

  // ---------- Progress tab data ----------
  const mastery = computeMastery(stats);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayStats = stats.daily[todayStr] || { attempted: 0, correct: 0 };
  const overallAccuracy = stats.totalAttempted > 0
    ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100)
    : 0;

  // Last 7 days chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, count: stats.daily[ds]?.attempted || 0 };
  }).reverse();
  const maxDayCount = Math.max(1, ...last7Days.map(d => d.count));

  // Weak questions
  const weakQuestions = Object.entries(stats.perQuestion)
    .map(([id, ps]) => ({ id, accuracy: ps.attempts > 0 ? (ps.correct / ps.attempts) * 100 : 0, attempts: ps.attempts }))
    .filter(q => q.attempts > 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2">
        {(["practice", "progress"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === tab
                ? "bg-amber-500 text-white shadow"
                : "bg-white text-amber-800 border border-amber-200"
            }`}
          >
            {tab === "practice" ? "অনুশীলন" : "অগ্রগতি"}
          </button>
        ))}
      </div>

      {/* ==================== PRACTICE TAB ==================== */}
      {activeTab === "practice" && (
        <>
          {/* Input form – only if no bank */}
          {!hasBank && !loading && (
            <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
              <h2 className="text-lg font-bold text-amber-800 mb-3">{topic} – MCQ তৈরি করুন</h2>

              <textarea
                className="w-full h-32 rounded-xl border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
                placeholder="এখানে আপনার নোট / টেক্সট পেস্ট করুন..."
                value={textInput}
                onChange={(e) => {
                  setTextInput(e.target.value);
                  if (e.target.value) clearFile();
                }}
                disabled={loading}
              />

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="cursor-pointer bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-800 hover:bg-amber-100 transition">
                  📎 PDF/ইমেজ সিলেক্ট করুন
                  <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileChange} disabled={loading} />
                </label>
                {file && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <button onClick={clearFile} className="text-red-500 hover:underline" disabled={loading}>✕</button>
                  </div>
                )}
                {savedFileName && !file && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="truncate max-w-[200px]">📄 {savedFileName}</span>
                  </div>
                )}
              </div>

              {fileSizeWarning && (
                <p className="mt-2 text-xs text-amber-700">ফাইলটি অনেক বড়, সংরক্ষণ করা যায়নি।</p>
              )}

              <button
                onClick={generateMCQs}
                disabled={loading || (!textInput.trim() && !file && !savedFileName)}
                className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition"
              >
                {loading ? "তৈরি হচ্ছে..." : "MCQ তৈরি করুন"}
              </button>
              {errorMsg && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg p-3">{errorMsg}</p>}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center text-amber-700 mt-10">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full mb-2" />
              <p>Gemini AI প্রশ্ন তৈরি করছে...</p>
            </div>
          )}

          {/* Has bank but no current question – start button */}
          {hasBank && !currentQuestion && !allMastered && (
            <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center shadow-sm">
              <p className="text-gray-700 mb-4">আপনার আগের MCQ ব্যাংক পাওয়া গেছে।</p>
              <div className="flex gap-3 justify-center">
                <button onClick={startPractice} className="bg-amber-500 text-white px-6 py-3 rounded-xl font-semibold">
                  অনুশীলন শুরু করুন
                </button>
                <button onClick={handleReset} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold">
                  নতুন সোর্স দিন
                </button>
              </div>
            </div>
          )}

          {/* All mastered */}
          {allMastered && (
            <div className="bg-white rounded-2xl border border-green-300 p-8 text-center shadow-sm">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-bold text-green-700 mb-2">এই সোর্সের সব প্রশ্ন আয়ত্ত হয়ে গেছে!</h2>
              <div className="flex gap-3 justify-center mt-4">
                <button onClick={handleReset} className="bg-amber-500 text-white px-6 py-2 rounded-xl font-semibold">নতুন সোর্স দিন</button>
              </div>
            </div>
          )}

          {/* Quiz */}
          {currentQuestion && !allMastered && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
              <div className="p-6">
                {/* Session badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">{topic}</span>
                  <span className="text-sm text-gray-600">
                    আজ: {todayStats.attempted} টি | সেশন: {sessionCount} টি
                  </span>
                </div>

                <p className="text-lg font-semibold text-gray-800 mb-5">{currentQuestion.question}</p>

                <div className="space-y-2">
                  {Object.entries(currentQuestion.options).map(([key, value]) => {
                    const isCorrectOption = key === currentQuestion.correctAnswer;
                    const isSelected = key === selectedAnswer;
                    let optionClass = "border-gray-200 bg-white";
                    if (isAnswered) {
                      if (isCorrectOption) optionClass = "border-green-500 bg-green-50";
                      else if (isSelected && !isCorrectOption) optionClass = "border-red-500 bg-red-50";
                      else optionClass = "opacity-60 border-gray-100";
                    } else if (isSelected) {
                      optionClass = "border-amber-500 bg-amber-50";
                    }
                    return (
                      <button
                        key={key}
                        disabled={isAnswered}
                        onClick={() => handleOptionSelect(key)}
                        className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition ${optionClass} ${
                          !isAnswered ? "hover:bg-amber-50 cursor-pointer" : "cursor-default"
                        }`}
                      >
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold ${
                          isSelected && !isAnswered ? "border-amber-500 bg-amber-500 text-white" : "border-gray-300 text-gray-600"
                        } ${isAnswered && isCorrectOption ? "border-green-500 bg-green-500 text-white" : ""} ${
                          isAnswered && isSelected && !isCorrectOption ? "border-red-500 bg-red-500 text-white" : ""
                        }`}>
                          {key}
                        </span>
                        <span className="text-sm">{value}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5">
                  {!isAnswered ? (
                    <button
                      onClick={handleAnswer}
                      disabled={!selectedAnswer}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50 transition"
                    >
                      উত্তর দেখুন
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className={`p-4 rounded-xl border ${
                        selectedAnswer === currentQuestion.correctAnswer ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"
                      }`}>
                        <p className="font-bold text-lg mb-1">
                          {selectedAnswer === currentQuestion.correctAnswer ? "✓ সঠিক!" : "✗ ভুল"}
                        </p>
                        {selectedAnswer !== currentQuestion.correctAnswer && (
                          <p className="text-sm text-gray-700 mb-1">
                            সঠিক উত্তর: <span className="font-semibold">{currentQuestion.correctAnswer}</span>
                          </p>
                        )}
                        <p className="text-sm text-gray-700">{currentQuestion.explanation}</p>
                      </div>
                      <button
                        onClick={handleNext}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl transition"
                      >
                        পরবর্তী প্রশ্ন →
                      </button>
                    </div>
                  )}
                </div>

                <button onClick={handleReset} className="mt-4 text-xs text-gray-500 underline hover:text-red-500">
                  নতুন সোর্স দিন
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================== PROGRESS TAB ==================== */}
      {activeTab === "progress" && (
        <div className="space-y-6">
          {/* Mastery Card */}
          <div className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
            <h2 className="text-lg font-bold mb-2">মাস্টারি স্তর</h2>
            <p className="text-3xl font-extrabold mb-2">{mastery.level}</p>
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${mastery.score}%` }}
              />
            </div>
            <p className="text-sm mt-2 opacity-80">{mastery.score}% কমপ্লিট</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center">
              <p className="text-2xl font-bold text-amber-700">{stats.totalAttempted}</p>
              <p className="text-xs text-gray-500">মোট প্রশ্ন</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center">
              <p className="text-2xl font-bold text-green-600">{overallAccuracy}%</p>
              <p className="text-xs text-gray-500">নির্ভুলতা</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center">
              <p className="text-2xl font-bold text-amber-700">{todayStats.attempted}</p>
              <p className="text-xs text-gray-500">আজকের প্রশ্ন</p>
            </div>
          </div>

          {/* Last 7 Days Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5">
            <h3 className="font-bold text-lg text-amber-800 mb-3">গত ৭ দিনের অনুশীলন</h3>
            <div className="flex items-end justify-between h-24">
              {last7Days.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-1">
                  <span className="text-xs text-gray-600">{d.count || ""}</span>
                  <div
                    className="w-6 bg-amber-400 rounded-t"
                    style={{ height: `${Math.max(4, (d.count / maxDayCount) * 60)}px` }}
                  />
                  <span className="text-xs text-gray-400">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weak Questions */}
          {weakQuestions.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5">
              <h3 className="font-bold text-lg text-amber-800 mb-3">দুর্বল প্রশ্নসমূহ</h3>
              <div className="space-y-2">
                {weakQuestions.map(wq => {
                  const q = mcqs.find(m => m.id === wq.id);
                  return (
                    <div key={wq.id} className="flex items-center gap-3 p-2">
                      <div className="flex-1 text-sm text-gray-700 truncate">
                        {q?.question || "অজানা প্রশ্ন"}
                      </div>
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${wq.accuracy < 40 ? "bg-red-500" : wq.accuracy < 70 ? "bg-amber-500" : "bg-green-500"}`}
                          style={{ width: `${wq.accuracy}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">{Math.round(wq.accuracy)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}