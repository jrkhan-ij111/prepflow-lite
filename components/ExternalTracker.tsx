"use client";

import { useState } from "react";

interface ExternalSession {
  id: string;
  platform: "DeepSeek" | "Claude" | "ChatGPT";
  topic: string;
  questions: number;
  date: string;
}

interface Props {
  onSessionAdded?: () => void;
}

export default function ExternalTracker({ onSessionAdded }: Props) {
  const [platform, setPlatform] = useState<"DeepSeek" | "Claude" | "ChatGPT">("DeepSeek");
  const [topic, setTopic] = useState("");
  const [questions, setQuestions] = useState(10);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = () => {
    if (!topic.trim()) return;
    setSaving(true);
    const session: ExternalSession = {
      id: `ext-${Date.now()}`,
      platform,
      topic: topic.trim(),
      questions,
      date: new Date().toISOString().slice(0, 10),
    };
    try {
      const prev = JSON.parse(localStorage.getItem("prepflow_external") || "[]");
      prev.push(session);
      localStorage.setItem("prepflow_external", JSON.stringify(prev));
      setDone(true);
      onSessionAdded?.();
      setTimeout(() => setDone(false), 2000);
    } catch {}
    setSaving(false);
    setTopic("");
    setQuestions(10);
  };

  return (
    <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
      <h3 className="font-bold text-amber-800 mb-3">📝 বাইরের প্ল্যাটফর্মে পঠিত</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <select value={platform} onChange={e => setPlatform(e.target.value as any)} className="rounded-xl border border-gray-300 p-2 text-sm">
          <option value="DeepSeek">🔍 DeepSeek</option>
          <option value="Claude">🧠 Claude</option>
          <option value="ChatGPT">🤖 ChatGPT</option>
        </select>
        <input type="text" placeholder="টপিক (যেমন: কারক)" value={topic} onChange={e => setTopic(e.target.value)} className="rounded-xl border border-gray-300 p-2 text-sm" />
        <input type="number" min={1} max={100} value={questions} onChange={e => setQuestions(Number(e.target.value))} className="rounded-xl border border-gray-300 p-2 text-sm" />
      </div>
      <button onClick={handleSave} disabled={saving || !topic.trim()} className="w-full bg-amber-500 text-white py-2 rounded-xl font-semibold text-sm disabled:opacity-50">
        {done ? "✓ সংরক্ষিত!" : saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
      </button>
    </div>
  );
}