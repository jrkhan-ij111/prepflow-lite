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

export default function MCQGenerator({ topic }: Props) {
  const [textInput, setTextInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const generateMCQs = async () => {
    if (!textInput.trim() && !file) {
      setErrorMsg("দয়া করে টেক্সট দিন অথবা একটি ফাইল সিলেক্ট করুন।");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setMcqs([]);
    setSelectedAnswers({});
    setSubmitted(false);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
      if (!apiKey) throw new Error("Gemini API key missing");

      const parts: any[] = [];

      if (textInput.trim()) {
        parts.push({ text: textInput.trim() });
      }

      if (file) {
        const base64Data = await toBase64(file);
        parts.push({
          inline_data: {
            mime_type: file.type,
            data: base64Data,
          },
        });
      }

      const promptText = `তুমি একজন বিশেষজ্ঞ শিক্ষক। নিচের কনটেন্ট এবং "${topic}" টপিকের জ্ঞান থেকে ৫টি BCS-মানের MCQ বাংলায় তৈরি করো।
প্রতিটি প্রশ্নে ঠিক ৪টি অপশন থাকবে, অপশন লেবেল সবসময় "A", "B", "C", "D" হবে।
উত্তর শুধুমাত্র JSON ফরম্যাটে দাও, কোনো অতিরিক্ত টেক্সট বা মার্কডাউন ব্যাকটিক্স ছাড়া।
ফরম্যাট:
[
  {
    "question": "প্রশ্ন",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correctAnswer": "B",
    "explanation": "সংক্ষিপ্ত বাংলা ব্যাখ্যা"
  }
]`;

      parts.push({ text: promptText });

      // ✅ gemini-2.5-flash endpoint
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || "API request failed");
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!rawText) throw new Error("API থেকে কোনো কনটেন্ট আসেনি");

      const jsonString = rawText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      let parsed: MCQ[];
      try {
        parsed = JSON.parse(jsonString);
      } catch {
        throw new Error("MCQ JSON পার্স করতে ব্যর্থ। আবার চেষ্টা করুন।");
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("কোনো MCQ তৈরি হয়নি। কনটেন্ট আরও সমৃদ্ধ করুন।");
      }

      setMcqs(parsed);
    } catch (err: any) {
      setErrorMsg(err.message || "MCQ তৈরিতে অজানা ত্রুটি।");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (qIndex: number, optionKey: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIndex]: optionKey }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const reset = () => {
    setMcqs([]);
    setSelectedAnswers({});
    setSubmitted(false);
    setErrorMsg("");
  };

  return (
    <div className="space-y-6">
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
              <button
                onClick={clearFile}
                className="text-red-500 hover:underline"
                disabled={loading}
              >
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

      {mcqs.length > 0 && (
        <div className="space-y-6">
          {mcqs.map((mcq, qIdx) => {
            const userChoice = selectedAnswers[qIdx];
            const isCorrect = submitted && userChoice === mcq.correctAnswer;
            const isWrong = submitted && userChoice && userChoice !== mcq.correctAnswer;
            return (
              <div key={qIdx} className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
                <p className="font-semibold text-gray-800 mb-3">
                  {qIdx + 1}. {mcq.question}
                </p>
                <div className="space-y-2">
                  {Object.entries(mcq.options).map(([key, value]) => {
                    const checked = userChoice === key;
                    let optionClass = "border-gray-200";
                    if (submitted) {
                      if (key === mcq.correctAnswer) optionClass = "border-green-500 bg-green-50";
                      else if (checked && key !== mcq.correctAnswer) optionClass = "border-red-500 bg-red-50";
                      else optionClass = "opacity-60";
                    }
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${optionClass} ${
                          !submitted ? "hover:bg-amber-50" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${qIdx}`}
                          value={key}
                          checked={checked || false}
                          onChange={() => handleAnswerChange(qIdx, key)}
                          disabled={submitted}
                          className="accent-amber-500"
                        />
                        <span className="text-sm">
                          {key}. {value}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {submitted && (
                  <div
                    className={`mt-4 p-3 rounded-lg text-sm ${
                      isCorrect
                        ? "bg-green-50 border border-green-300"
                        : isWrong
                        ? "bg-red-50 border border-red-300"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    {isCorrect && <p className="font-bold text-green-700">✓ সঠিক!</p>}
                    {isWrong && (
                      <p className="font-bold text-red-600">
                        ✗ ভুল (সঠিক উত্তর: {mcq.correctAnswer})
                      </p>
                    )}
                    {!userChoice && <p className="text-gray-500">আপনি উত্তর দেননি।</p>}
                    <p className="mt-1 text-gray-700">{mcq.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex gap-3">
            {!submitted && (
              <button
                onClick={handleSubmit}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition"
              >
                উত্তর জমা দিন
              </button>
            )}
            <button
              onClick={reset}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl transition"
            >
              আবার শুরু
            </button>
          </div>
        </div>
      )}
    </div>
  );
}