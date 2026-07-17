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

// ---------- localStorage helpers ----------
const RESULTS_KEY = "prepflow_results";

function safeGetItem(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSetItem(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
function safeRemoveItem(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

function saveResult(topic: string, correct: boolean) {
  const results = loadResults();
  results.push({ topic, date: new Date().toISOString().slice(0, 10), correct });
  safeSetItem(RESULTS_KEY, JSON.stringify(results));
}
function loadResults(): { topic: string; date: string; correct: boolean }[] {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getBankKey(topic: string, sourceHash: string): string {
  return `prepflow_bank_${topic}_${sourceHash}`;
}
function getStatsKey(topic: string, sourceHash: string): string {
  return `prepflow_stats_${topic}_${sourceHash}`;
}
function getTopicFileKey(topic: string): string {
  return `prepflow_file_${topic}`;
}
function getTopicSourceKey(topic: string): string {
  return `prepflow_source_${topic}`;
}

// ---------- Stats helpers ----------
function initStats(): TopicStats {
  return { totalAttempted: 0, totalCorrect: 0, perQuestion: {}, daily: {}, history: [] };
}

function loadStats(key: string): TopicStats {
  const raw = safeGetItem(key);
  if (!raw) return initStats();
  try { return JSON.parse(raw); } catch { return initStats(); }
}

function saveStats(key: string, stats: TopicStats) {
  safeSetItem(key, JSON.stringify(stats));
}

function recordAttempt(stats: TopicStats, questionId: string, correct: boolean) {
  const today = new Date().toISOString().slice(0, 10);
  stats.totalAttempted++;
  if (correct) stats.totalCorrect++;
  if (!stats.perQuestion[questionId]) stats.perQuestion[questionId] = { attempts: 0, correct: 0 };
  stats.perQuestion[questionId].attempts++;
  if (correct) stats.perQuestion[questionId].correct++;
  if (!stats.daily[today]) stats.daily[today] = { attempted: 0, correct: 0 };
  stats.daily[today].attempted++;
  if (correct) stats.daily[today].correct++;
  stats.history.push({ date: today, correct });
  if (stats.history.length > 200) stats.history.shift();
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
  const overallAccuracy = (stats.totalCorrect / stats.totalAttempted) * 100;
  const recentHistory = stats.history.slice(-20);
  const recentCorrect = recentHistory.filter(h => h.correct).length;
  const recentAccuracy = recentHistory.length > 0 ? (recentCorrect / recentHistory.length) * 100 : overallAccuracy;
  const totalQuestions = Object.keys(stats.perQuestion).length;
  const masteredQuestions = Object.keys(stats.perQuestion).filter(id => isMastered(stats, id)).length;
  const masteryRatio = totalQuestions > 0 ? (masteredQuestions / totalQuestions) * 100 : 0;
  const score = Math.round((overallAccuracy * 0.4) + (recentAccuracy * 0.35) + (masteryRatio * 0.25));
  if (score >= 90) return { level: "মাস্টার লেভেল 🏆", score };
  if (score >= 75) return { level: "দক্ষ", score };
  if (score >= 55) return { level: "উন্নতিশীল", score };
  if (score >= 35) return { level: "অনুশীলন প্রয়োজন", score };
  return { level: "শুরু", score };
}

// ---------- MCQGenerator Component ----------
export default function MCQGenerator({ topic }: Props) {
  const [textInput, setTextInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [currentQuestion, setCurrentQuestion] = useState<MCQ | null>(null);
  const [currentQId, setCurrentQId] = useState<string>("");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);

  const [savedFileName, setSavedFileName] = useState<string | null>(null);
  const [fileSizeWarning, setFileSizeWarning] = useState(false);

  const [sourceHash, setSourceHash] = useState<string>("");
  const [bankKey, setBankKey] = useState<string>("");
  const [statsKey, setStatsKey] = useState<string>("");
  const [stats, setStats] = useState<TopicStats>(initStats());
  const [allMastered, setAllMastered] = useState(false);

  // exclude list for current round
  const [excludeIds, setExcludeIds] = useState<string[]>([]);

  const persistFile = useCallback((fileBase64: string, fileMimeType: string, fileName: string) => {
    const fileKey = getTopicFileKey(topic);
    const saved: SavedFile = { base64: fileBase64, mimeType: fileMimeType, fileName };
    const ok = safeSetItem(fileKey, JSON.stringify(saved));
    if (!ok) setFileSizeWarning(true);
    else setSavedFileName(fileName);
  }, [topic]);

  const persistSource = useCallback((text: string) => {
    const sourceKey = getTopicSourceKey(topic);
    safeSetItem(sourceKey, text);
  }, [topic]);

  const loadBank = useCallback((): QuestionBank | null => {
    if (!bankKey) return null;
    const raw = safeGetItem(bankKey);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }, [bankKey]);

  const saveBank = useCallback((bank: QuestionBank) => {
    safeSetItem(bankKey, JSON.stringify(bank));
  }, [bankKey]);

  useEffect(() => {
    const fileKey = getTopicFileKey(topic);
    const savedFileRaw = safeGetItem(fileKey);
    if (savedFileRaw) {
      try {
        const parsed: SavedFile = JSON.parse(savedFileRaw);
        setSavedFileName(parsed.fileName);
      } catch {}
    }
    const sourceKey = getTopicSourceKey(topic);
    const savedSource = safeGetItem(sourceKey);
    if (savedSource) setTextInput(savedSource);
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

  // ---- Weighted random pick ----
  const pickNextQuestion = useCallback((bank: QuestionBank, currentStats: TopicStats, exclude: string[]): { question: MCQ; id: string } | null => {
    const active = bank.questions.filter(q => {
      const qId = q.id!;
      if (exclude.includes(qId)) return false;
      return !isMastered(currentStats, qId);
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

  const generateMCQs = async (existingBank?: QuestionBank) => {
    setLoading(true);
    setErrorMsg("");
    setScore(0);
    setSessionCount(0);
    setAllMastered(false);
    setExcludeIds([]);

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

      if (existingBank) {
        const hash = computeSourceHash(effectiveSource, fileName);
        setSourceHash(hash);
        setBankKey(getBankKey(topic, hash));
        setStatsKey(getStatsKey(topic, hash));
        const loadedStats = loadStats(getStatsKey(topic, hash));
        setStats(loadedStats);
        const picked = pickNextQuestion(existingBank, loadedStats, []);
        if (picked) {
          setMcqs(existingBank.questions);
          setCurrentQuestion(picked.question);
          setCurrentQId(picked.id);
          setSelectedAnswer(null);
          setIsRevealed(false);
        }
        setLoading(false);
        return;
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

      const questions = data.mcqs.map((q: MCQ, i: number) => ({
        ...q,
        id: q.id || `q-${i}-${Date.now()}`,
      }));

      const hash = computeSourceHash(effectiveSource, fileName);
      const key = getBankKey(topic, hash);
      const statsK = getStatsKey(topic, hash);
      const bank: QuestionBank = {
        sourceText: effectiveSource,
        questions,
        createdAt: new Date().toISOString(),
      };

      setSourceHash(hash);
      setBankKey(key);
      setStatsKey(statsK);
      saveBank(bank);
      persistSource(effectiveSource);
      if (fileBase64) persistFile(fileBase64, fileMimeType, fileName);

      const initialStats = initStats();
      saveStats(statsK, initialStats);
      setStats(initialStats);

      const picked = pickNextQuestion(bank, initialStats, []);
      if (picked) {
        setMcqs(questions);
        setCurrentQuestion(picked.question);
        setCurrentQId(picked.id);
        setSelectedAnswer(null);
        setIsRevealed(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "MCQ তৈরিতে অজানা ত্রুটি।");
    } finally {
      setLoading(false);
    }
  };

  const computeSourceHash = useCallback((text: string, fileName?: string) => {
    return simpleHash(text + (fileName || ""));
  }, []);

  const handleOptionSelect = (key: string) => {
    if (isRevealed) return;
    setSelectedAnswer(key);
  };

  const handleCheckAnswer = () => {
    if (!selectedAnswer || !currentQuestion) return;
    const correct = selectedAnswer === currentQuestion.correctAnswer;
    setIsRevealed(true);
    setSessionCount(prev => prev + 1);
    if (correct) setScore(prev => prev + 1);

    // Update stats
    const updatedStats = { ...stats };
    recordAttempt(updatedStats, currentQId, correct);
    saveStats(statsKey, updatedStats);
    setStats(updatedStats);
    saveResult(topic, correct);
  };

  const handleNext = () => {
    const bank = loadBank();
    if (!bank) return;

    // Add current question to exclude list so it doesn't repeat immediately
    const newExclude = [...excludeIds, currentQId];
    setExcludeIds(newExclude);

    const picked = pickNextQuestion(bank, stats, newExclude);
    if (!picked) {
      setAllMastered(true);
      return;
    }
    setCurrentQuestion(picked.question);
    setCurrentQId(picked.id);
    setSelectedAnswer(null);
    setIsRevealed(false);
  };

  const handleRetry = (clearAll: boolean) => {
    if (clearAll) {
      safeRemoveItem(getTopicSourceKey(topic));
      safeRemoveItem(getTopicFileKey(topic));
      safeRemoveItem(bankKey);
      safeRemoveItem(statsKey);
      setTextInput("");
      setFile(null);
      setSavedFileName(null);
      setMcqs([]);
      setCurrentQuestion(null);
      setScore(0);
      setSessionCount(0);
      setAllMastered(false);
    } else {
      const bank = loadBank();
      if (bank) {
        safeRemoveItem(statsKey);
        const freshStats = initStats();
        saveStats(statsKey, freshStats);
        setStats(freshStats);
        setScore(0);
        setSessionCount(0);
        setExcludeIds([]);
        setAllMastered(false);
        const picked = pickNextQuestion(bank, freshStats, []);
        if (picked) {
          setMcqs(bank.questions);
          setCurrentQuestion(picked.question);
          setCurrentQId(picked.id);
          setSelectedAnswer(null);
          setIsRevealed(false);
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Input form */}
      {!currentQuestion && !loading && !allMastered && (
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
              📎 ফাইল সিলেক্ট করুন
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
            <p className="mt-2 text-xs text-amber-700">ফাইলটি অনেক বড়, তাই সংরক্ষণ করা যায়নি।</p>
          )}
          <button
            onClick={() => generateMCQs()}
            disabled={loading || (!textInput.trim() && !file && !savedFileName)}
            className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition"
          >
            {loading ? "তৈরি হচ্ছে..." : "MCQ তৈরি করুন"}
          </button>
          {errorMsg && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg p-3">{errorMsg}</p>}
        </div>
      )}

      {loading && (
        <div className="text-center text-amber-700 mt-10">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full mb-2" />
          <p>Gemini AI প্রশ্ন তৈরি করছে...</p>
        </div>
      )}

      {/* All mastered message */}
      {allMastered && (
        <div className="bg-white rounded-2xl border border-green-300 p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-green-700 mb-2">এই সোর্সের সব প্রশ্ন আয়ত্ত হয়ে গেছে!</h2>
          <div className="flex gap-3 justify-center mt-4">
            <button onClick={() => handleRetry(false)} className="bg-amber-500 text-white px-6 py-2 rounded-xl font-semibold">একই সোর্স দিয়ে আবার প্র্যাকটিস</button>
            <button onClick={() => handleRetry(true)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-xl font-semibold">নতুন সোর্স</button>
          </div>
        </div>
      )}

      {/* Quiz */}
      {currentQuestion && !allMastered && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                সঠিক: {score} / {sessionCount}
              </span>
              {currentQuestion.difficulty && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${currentQuestion.difficulty === "hard" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                  {currentQuestion.difficulty === "hard" ? "কঠিন" : "সহজ"}
                </span>
              )}
            </div>

            <p className="text-lg font-semibold text-gray-800 mb-5">{currentQuestion.question}</p>

            <div className="space-y-2">
              {Object.entries(currentQuestion.options).map(([key, value]) => {
                const isCorrectOption = key === currentQuestion.correctAnswer;
                const isSelected = key === selectedAnswer;
                let optionClass = "border-gray-200 bg-white";
                if (isRevealed) {
                  if (isCorrectOption) optionClass = "border-green-500 bg-green-50";
                  else if (isSelected && !isCorrectOption) optionClass = "border-red-500 bg-red-50";
                  else optionClass = "opacity-60 border-gray-100";
                } else if (isSelected) {
                  optionClass = "border-amber-500 bg-amber-50";
                }
                return (
                  <button
                    key={key}
                    disabled={isRevealed}
                    onClick={() => handleOptionSelect(key)}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition ${optionClass} ${!isRevealed ? "hover:bg-amber-50 cursor-pointer" : "cursor-default"}`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold ${isSelected && !isRevealed ? "border-amber-500 bg-amber-500 text-white" : "border-gray-300 text-gray-600"} ${isRevealed && isCorrectOption ? "border-green-500 bg-green-500 text-white" : ""} ${isRevealed && isSelected && !isCorrectOption ? "border-red-500 bg-red-500 text-white" : ""}`}>
                      {key}
                    </span>
                    <span className="text-sm">{value}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              {!isRevealed ? (
                <button onClick={handleCheckAnswer} disabled={!selectedAnswer} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50 transition">
                  উত্তর দেখুন
                </button>
              ) : (
                <div className="space-y-3">
                  <div className={`p-4 rounded-xl border ${selectedAnswer === currentQuestion.correctAnswer ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                    <p className="font-bold text-lg mb-1">{selectedAnswer === currentQuestion.correctAnswer ? "✓ সঠিক!" : "✗ ভুল"}</p>
                    {selectedAnswer !== currentQuestion.correctAnswer && (
                      <p className="text-sm text-gray-700 mb-1">সঠিক উত্তর: <span className="font-semibold">{currentQuestion.correctAnswer}</span></p>
                    )}
                    {currentQuestion.subtopic && <p className="text-xs text-gray-500 mb-1">উপ-বিষয়: {currentQuestion.subtopic}</p>}
                    <p className="text-sm text-gray-700">{currentQuestion.explanation}</p>
                  </div>
                  <button onClick={handleNext} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl transition">
                    পরবর্তী প্রশ্ন →
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => handleRetry(true)} className="mt-4 text-xs text-gray-500 underline hover:text-red-500">
              নতুন করে শুরু করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}