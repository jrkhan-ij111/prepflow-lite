// components/MCQGenerator.tsx
"use client";

import { useState, useRef } from "react";

interface MCQ {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  explanation: string;
}

interface Props {
  topic: string;
}

// ---------- localStorage helpers ----------
const RESULTS_KEY = "prepflow_results";

function loadResults(): { topic: string; date: string; correct: boolean }[] {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveResult(topic: string, correct: boolean) {
  const results = loadResults();
  const today = new Date().toISOString().slice(0, 10);
  results.push({ topic, date: today, correct });
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}

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
  };

  const generateMCQs = async () => {
    if (!textInput.trim() && !file) {
      setErrorMsg("দয়া করে টেক্সট দিন অথবা একটি ফাইল সিলেক্ট করুন।");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    resetQuiz();

    try {
      let fileBase64 = "";
      let fileMimeType = "";

      if (file) {
        fileBase64 = await toBase64(file);
        fileMimeType = file.type;
      }

      // ✅ ক্লায়েন্ট থেকে নিজস্ব API route-এ কল – কোনো API key নেই
      const response = await fetch("/api/generate-mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          textInput: textInput.trim(),
          fileBase64,
          fileMimeType,
          count: 5,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "API request failed");
      }

      if (!Array.isArray(data.mcqs) || data.mcqs.length === 0) {
        throw new Error("কোনো MCQ তৈরি হয়নি। কনটেন্ট আরও সমৃদ্ধ করুন।");
      }

      setMcqs(data.mcqs);
    } catch (err: any) {
      setErrorMsg(err.message || "MCQ তৈরিতে অজানা ত্রুটি।");
    } finally {
      setLoading(false);
    }
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
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    saveResult(topic, isCorrect);
  };

  const handleNext = () => {
    if (currentIndex + 1 < mcqs.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsRevealed(false);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRetry = () => {
    resetQuiz();
    setTextInput("");
    setFile(null);
  };

  return (
    <div className="space-y-6">
      {mcqs.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-amber-800 mb-3">
            {topic} – MCQ তৈরি করুন
          </h2>

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
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={loading}
              />
            </label>
            {file && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button onClick={clearFile} className="text-red-500 hover:underline" disabled={loading}>
                  ✕
                </button>
              </div>
            )}
          </div>

          <button
            onClick={generateMCQs}
            disabled={loading || (!textInput.trim() && !file)}
            className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition"
          >
            {loading ? "তৈরি হচ্ছে..." : "MCQ তৈরি করুন"}
          </button>

          {errorMsg && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg p-3">{errorMsg}</p>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center text-amber-700 mt-10">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full mb-2"></div>
          <p>Gemini AI প্রশ্ন তৈরি করছে...</p>
        </div>
      )}

      {mcqs.length > 0 && !quizFinished && currentMCQ && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="h-2 bg-amber-100">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${((currentIndex + (isRevealed ? 1 : 0)) / mcqs.length) * 100}%` }}
            />
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                প্রশ্ন {currentIndex + 1} / {mcqs.length}
              </span>
              <span className="text-sm text-gray-600">সঠিক: {score}</span>
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
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition ${optionClass} ${
                      !isRevealed ? "hover:bg-amber-50 cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold ${
                        isSelected && !isRevealed
                          ? "border-amber-500 bg-amber-500 text-white"
                          : "border-gray-300 text-gray-600"
                      } ${isRevealed && isCorrectOption ? "border-green-500 bg-green-500 text-white" : ""} ${
                        isRevealed && isSelected && !isCorrectOption ? "border-red-500 bg-red-500 text-white" : ""
                      }`}
                    >
                      {key}
                    </span>
                    <span className="text-sm">{value}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              {!isRevealed ? (
                <button
                  onClick={handleCheckAnswer}
                  disabled={!selectedAnswer}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50 transition"
                >
                  উত্তর দেখুন
                </button>
              ) : (
                <div className="space-y-3">
                  <div
                    className={`p-4 rounded-xl border ${
                      selectedAnswer === currentMCQ.correctAnswer
                        ? "bg-green-50 border-green-300"
                        : "bg-red-50 border-red-300"
                    }`}
                  >
                    <p className="font-bold text-lg mb-1">
                      {selectedAnswer === currentMCQ.correctAnswer ? "✓ সঠিক!" : "✗ ভুল"}
                    </p>
                    {selectedAnswer !== currentMCQ.correctAnswer && (
                      <p className="text-sm text-gray-700 mb-1">
                        সঠিক উত্তর: <span className="font-semibold">{currentMCQ.correctAnswer}</span>
                      </p>
                    )}
                    <p className="text-sm text-gray-700">{currentMCQ.explanation}</p>
                  </div>

                  <button
                    onClick={handleNext}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl transition"
                  >
                    {currentIndex + 1 < mcqs.length ? "পরবর্তী প্রশ্ন →" : "ফলাফল দেখুন"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {quizFinished && (
        <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 mx-auto mb-4">
            <span className="text-3xl">🎯</span>
          </div>
          <h2 className="text-2xl font-bold text-amber-800 mb-3">কুইজ শেষ!</h2>
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-6">
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-3xl font-bold text-amber-700">{score}</p>
              <p className="text-xs text-gray-500">সঠিক</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-3xl font-bold text-amber-700">
                {Math.round((score / mcqs.length) * 100)}%
              </p>
              <p className="text-xs text-gray-500">নির্ভুলতা</p>
            </div>
          </div>
          <p className="text-gray-600 mb-6">
            মোট প্রশ্ন: {mcqs.length} | সঠিক: {score} | ভুল: {mcqs.length - score}
          </p>
          <button
            onClick={handleRetry}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-3 rounded-xl transition"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      )}
    </div>
  );
}