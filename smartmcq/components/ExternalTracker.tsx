"use client";

import { useState, useEffect } from "react";

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
  const [sessions, setSessions] = useState<ExternalSession[]>([]);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("prepflow_external") || "[]");
      setSessions(data.reverse());
    } catch {}
  }, [done]);

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

  const handleDelete = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    localStorage.setItem("prepflow_external", JSON.stringify(updated.reverse()));
    setSessions(updated);
  };

  const platformEmoji: Record<string, string> = {
    DeepSeek: "🔍",
    Claude: "🧠",
    ChatGPT: "🤖",
  };

  return (
    <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm space-y-4">
      <h3 className="font-bold text-amber-800">📝 বাইরের প্ল্যাটফর্মে পঠিত</h3>
      
      {/* Input Form */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* History List */}
      {sessions.length > 0 && (
        <div className="border-t pt-3 mt-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">📋 সাম্প্রতিক ইতিহাস</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-amber-50 rounded-lg p-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>{platformEmoji[s.platform]}</span>
                  <span className="font-medium">{s.topic}</span>
                  <span className="text-xs text-gray-500">({s.questions} প্রশ্ন)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{s.date}</span>
                  <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}