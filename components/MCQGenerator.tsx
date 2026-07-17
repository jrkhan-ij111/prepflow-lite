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
  status?: "new" | "learning" | "mastered";
  correctStreak?: number;
  wrongCount?: number;
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

function loadResults(): { topic: string; date: string; correct: boolean }[] {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveResult(topic: string, correct: boolean) {
  const results = loadResults();
  results.push({ topic, date: new Date().toISOString().slice(0, 10), correct });
  safeSetItem(RESULTS_KEY, JSON.stringify(results));
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getBankKey(topic: string, sourceHash: string): string {
  return `prepflow_bank_${topic}_${sourceHash}`;
}

function getTopicFileKey(topic: string): string {
  return `prepflow_file_${topic}`;
}

function getTopicSourceKey(topic: string): string {
  return `prepflow_source_${topic}`;
}

// ---------- MCQGenerator Component ----------
export default function MCQGenerator({ topic }: Props) {
  const [textInput, setTextInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const [savedFileName, setSavedFileName] = useState<string | null>(null);
  const [fileSizeWarning, setFileSizeWarning] = useState(false);

  const [sourceHash, setSourceHash] = useState<string>("");
  const [bankKey, setBankKey] = useState<string>("");
  const [allMastered, setAllMastered] = useState(false);

  const [mode, setMode] = useState<"practice" | "revision">("practice");
  const [revisionSources, setRevisionSources] = useState<{ topic: string; hash: string; label: string }[]>([]);
  const [selectedRevisionSource, setSelectedRevisionSource] = useState<string>("");

  // persist session file & source
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

  // save/load question bank
  const loadBank = useCallback((): QuestionBank | null => {
    if (!bankKey) return null;
    const raw = safeGetItem(bankKey);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }, [bankKey]);

  const saveBank = useCallback((bank: QuestionBank) => {
    safeSetItem(bankKey, JSON.stringify(bank));
  }, [bankKey]);

  const computeSourceHash = useCallback((text: string, fileName?: string) => {
    return simpleHash(text + (fileName || ""));
  }, []);

  // load revision sources
  useEffect(() => {
    const sources: { topic: string; hash: string; label: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("prepflow_bank_")) {
        const parts = key.split("_");
        const bankTopic = parts[2];
        const bankHash = parts.slice(3).join("_");
        const raw = safeGetItem(key);
        if (raw) {
          try {
            const bank: QuestionBank = JSON.parse(raw);
            const label = bank.sourceText?.slice(0, 60) || `Source ${bankHash}`;
            sources.push({ topic: bankTopic, hash: bankHash, label });
          } catch {}
        }
      }
    }
    setRevisionSources(sources);
  }, [mcqs]);

  // restore saved file info
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

  const resetQuiz = () => {
    setMcqs([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsRevealed(false);
    setScore(0);
    setQuizFinished(false);
    setAllMastered(false);
  };

  const prepareQuestionBank = (questions: MCQ[]): MCQ[] => {
    return questions.map((q, i) => ({
      ...q,
      id: q.id || `q-${i}-${Date.now()}`,
      status: q.status || "new",
      correctStreak: q.correctStreak ?? 0,
      wrongCount: q.wrongCount ?? 0,
    }));
  };

  const pickNextQuestionIndex = (bank: QuestionBank): number => {
    const learningQuestions = bank.questions
      .map((q, i) => ({ ...q, idx: i }))
      .filter(q => q.status !== "mastered" && q.status === "learning");
    if (learningQuestions.length > 0) {
      const randomLearning = learningQuestions[Math.floor(Math.random() * learningQuestions.length)];
      return randomLearning.idx;
    }
    const newQuestions = bank.questions
      .map((q, i) => ({ ...q, idx: i }))
      .filter(q => q.status === "new");
    if (newQuestions.length > 0) {
      return newQuestions[0].idx;
    }
    return -1;
  };

  const updateQuestionBank = (updatedQuestion: MCQ) => {
    const bank = loadBank();
    if (!bank) return;
    const idx = bank.questions.findIndex(q => q.id === updatedQuestion.id);
    if (idx !== -1) {
      bank.questions[idx] = updatedQuestion;
      saveBank(bank);
      
      // check if all mastered
      const allDone = bank.questions.every(q => q.status === "mastered");
      if (allDone) {
        setAllMastered(true);
        setQuizFinished(true);
      }
    }
  };

  const generateMCQs = async (existingBank?: QuestionBank) => {
    setLoading(true);
    setErrorMsg("");
    resetQuiz();
    setAllMastered(false);

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

      // If we already have a bank, reuse questions
      if (existingBank) {
        const hash = computeSourceHash(effectiveSource, fileName);
        setSourceHash(hash);
        setBankKey(getBankKey(topic, hash));
        setMcqs(existingBank.questions);
        const nextIdx = pickNextQuestionIndex(existingBank);
        if (nextIdx !== -1) {
          setCurrentIndex(nextIdx);
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

      const questions = prepareQuestionBank(data.mcqs);
      const hash = computeSourceHash(effectiveSource, fileName);
      const key = getBankKey(topic, hash);
      const bank: QuestionBank = {
        sourceText: effectiveSource,
        questions,
        createdAt: new Date().toISOString(),
      };
      
      setSourceHash(hash);
      setBankKey(key);
      saveBank(bank);
      persistSource(effectiveSource);
      if (fileBase64) persistFile(fileBase64, fileMimeType, fileName);

      setMcqs(questions);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setIsRevealed(false);
    } catch (err: any) {
      setErrorMsg(err.message || "MCQ তৈরিতে অজানা ত্রুটি।");
    } finally {
      setLoading(false);
    }
  };

  const loadRevisionSource = (hash: string) => {
    const key = getBankKey(topic, hash);
    const raw = safeGetItem(key);
    if (!raw) return;
    try {
      const bank: QuestionBank = JSON.parse(raw);
      setMcqs(bank.questions);
      setBankKey(key);
      setSourceHash(hash);
      setMode("revision");
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setIsRevealed(false);
      setScore(0);
      setQuizFinished(false);
      setAllMastered(false);
    } catch {}
  };

  const currentMCQ = mcqs[currentIndex] || null;

  const handleOptionSelect = (key: string) => {
    if (isRevealed) return;
    setSelectedAnswer(key);
  };

  const handleCheckAnswer = () => {
    if (!selectedAnswer || !currentMCQ) return;
    const isCorrect = selectedAnswer === currentMCQ.correctAnswer;
    setIsRevealed(true);
    
    const updatedQuestion = { ...currentMCQ };
    
    if (mode === "practice") {
      if (isCorrect) {
        setScore((prev) => prev + 1);
        updatedQuestion.correctStreak = (updatedQuestion.correctStreak || 0) + 1;
        if ((updatedQuestion.correctStreak || 0) >= 2) {
          updatedQuestion.status = "mastered";
        } else {
          updatedQuestion.status = "learning";
        }
      } else {
        updatedQuestion.correctStreak = 0;
        updatedQuestion.wrongCount = (updatedQuestion.wrongCount || 0) + 1;
        updatedQuestion.status = "learning";
      }
      
      const newMcqs = [...mcqs];
      newMcqs[currentIndex] = updatedQuestion;
      setMcqs(newMcqs);
      saveResult(topic, isCorrect);
      updateQuestionBank(updatedQuestion);
    }
  };

  const handleNext = () => {
    if (allMastered) {
      setQuizFinished(true);
      return;
    }
    
    const bank = loadBank();
    if (bank) {
      const nextIdx = pickNextQuestionIndex(bank);
      if (nextIdx !== -1) {
        setCurrentIndex(nextIdx);
        setSelectedAnswer(null);
        setIsRevealed(false);
      } else {
        setAllMastered(true);
        setQuizFinished(true);
      }
    }
  };

  const handleRetry = (clearAll: boolean) => {
    if (clearAll) {
      safeRemoveItem(getTopicSourceKey(topic));
      safeRemoveItem(getTopicFileKey(topic));
      safeRemoveItem(bankKey);
      setTextInput("");
      setFile(null);
      setSavedFileName(null);
      resetQuiz();
      setMode("practice");
    } else {
      const bank = loadBank();
      if (bank) {
        generateMCQs(bank);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode("practice"); resetQuiz(); }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold ${mode === "practice" ? "bg-amber-500 text-white" : "bg-white text-amber-800 border border-amber-200"}`}
        >
          অনুশীলন
        </button>
        <button
          onClick={() => setMode("revision")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold ${mode === "revision" ? "bg-amber-500 text-white" : "bg-white text-amber-800 border border-amber-200"}`}
        >
          রিভিশন
        </button>
      </div>

      {/* Revision source selector */}
      {mode === "revision" && mcqs.length === 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-amber-800 mb-3">রিভিশন সোর্স সিলেক্ট করুন</h2>
          {revisionSources.length === 0 ? (
            <p className="text-gray-500">এখনো কোনো সোর্স জমা নেই।</p>
          ) : (
            <div className="space-y-2">
              {revisionSources.map(src => (
                <button
                  key={src.hash}
                  onClick={() => loadRevisionSource(src.hash)}
                  className="w-full text-left p-3 rounded-xl border border-amber-200 hover:bg-amber-50"
                >
                  <p className="text-sm font-medium">{src.label}</p>
                  <p className="text-xs text-gray-500">{src.topic}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input form */}
      {mcqs.length === 0 && !loading && mode === "practice" && (
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

      {/* Loading */}
      {loading && (
        <div className="text-center text-amber-700 mt-10">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full mb-2" />
          <p>Gemini AI প্রশ্ন তৈরি করছে...</p>
        </div>
      )}

      {/* All mastered message */}
      {allMastered && !quizFinished && (
        <div className="bg-white rounded-2xl border border-green-300 p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-green-700 mb-2">এই সোর্সের সব প্রশ্ন মাস্টার হয়ে গেছে!</h2>
          <p className="text-gray-600 mb-4">তুমি সবগুলো প্রশ্ন সঠিকভাবে সম্পন্ন করেছ।</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => handleRetry(false)} className="bg-amber-500 text-white px-6 py-2 rounded-xl font-semibold">একই সোর্স দিয়ে আবার প্র্যাকটিস</button>
            <button onClick={() => handleRetry(true)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-xl font-semibold">নতুন সোর্স</button>
          </div>
        </div>
      )}

      {/* Quiz */}
      {mcqs.length > 0 && !quizFinished && !allMastered && currentMCQ && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="h-2 bg-amber-100">
            <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${30}%` }} />
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                {mode === "revision" ? "রিভিশন" : `প্রশ্ন ${currentIndex + 1}`}
              </span>
              {mode === "practice" && <span className="text-sm text-gray-600">সঠিক: {score}</span>}
              {currentMCQ.difficulty && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${currentMCQ.difficulty === "hard" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                  {currentMCQ.difficulty === "hard" ? "কঠিন" : "সহজ"}
                </span>
              )}
            </div>

            <p className="text-lg font-semibold text-gray-800 mb-5">{currentMCQ.question}</p>

            <div className="space-y-2">
              {Object.entries(currentMCQ.options).map(([key, value]) => {
                const isCorrectOption = key === currentMCQ.correctAnswer;
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
                  <div className={`p-4 rounded-xl border ${selectedAnswer === currentMCQ.correctAnswer ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                    <p className="font-bold text-lg mb-1">{selectedAnswer === currentMCQ.correctAnswer ? "✓ সঠিক!" : "✗ ভুল"}</p>
                    {selectedAnswer !== currentMCQ.correctAnswer && (
                      <p className="text-sm text-gray-700 mb-1">সঠিক উত্তর: <span className="font-semibold">{currentMCQ.correctAnswer}</span></p>
                    )}
                    {currentMCQ.subtopic && <p className="text-xs text-gray-500 mb-1">উপ-বিষয়: {currentMCQ.subtopic}</p>}
                    <p className="text-sm text-gray-700">{currentMCQ.explanation}</p>
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

      {/* Summary */}
      {quizFinished && (
        <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 mx-auto mb-4">
            <span className="text-3xl">🎯</span>
          </div>
          <h2 className="text-2xl font-bold text-amber-800 mb-3">কুইজ শেষ!</h2>
          {mode === "practice" && (
            <>
              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-6">
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-3xl font-bold text-amber-700">{score}</p>
                  <p className="text-xs text-gray-500">সঠিক</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-3xl font-bold text-amber-700">{Math.round((score / (mcqs.length || 1)) * 100)}%</p>
                  <p className="text-xs text-gray-500">নির্ভুলতা</p>
                </div>
              </div>
            </>
          )}
          <p className="text-gray-600 mb-6">মোট প্রশ্ন: {mcqs.length}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => handleRetry(false)} className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transition">
              একই সোর্স দিয়ে নতুন MCQ বানান
            </button>
            <button onClick={() => handleRetry(true)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-xl transition">
              সম্পূর্ণ নতুন সোর্স দিন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}