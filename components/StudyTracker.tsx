// components/StudyTracker.tsx - আপডেটেড ভার্সন
"use client";

import { useState, useEffect } from "react";

interface StudySession {
  id: string;
  date: string;
  subject: string;
  topic: string;
  duration: number;
  questions: number;
  source: string;
  notes: string;
  mood: string;
  understanding: number;
}

const SUBJECTS = [
  "বাংলা", "ইংরেজী", "গণিত", "মানসিক দক্ষতা",
  "সাধারণ জ্ঞান (বাংলাদেশ)", "সাধারণ জ্ঞান (আন্তর্জাতিক)",
  "সাধারণ বিজ্ঞান", "কম্পিউটার ও আইসিটি", "ভূগোল ও পরিবেশ",
  "নৈতিকতা ও সুশাসন", "ব্যাংকিং ও ফিন্যান্স",
];

const SOURCES = ["PrepFlow", "DeepSeek", "Claude", "ChatGPT", "YouTube", "Book", "PDF", "Other"];
const MOODS = ["😊 Happy", "😐 Neutral", "😴 Tired", "🤩 Excited", "😤 Frustrated", "🎯 Focused"];

export default function StudyTracker() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subject, setSubject] = useState("বাংলা");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(30);
  const [questions, setQuestions] = useState(0);
  const [source, setSource] = useState("PrepFlow");
  const [notes, setNotes] = useState("");
  const [mood, setMood] = useState("🎯 Focused");
  const [understanding, setUnderstanding] = useState(3);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<"add" | "history" | "stats">("add");

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("prepflow_study_log") || "[]");
      setSessions(data.reverse());
    } catch {}
  }, []);

  useEffect(() => {
    let interval: any;
    if (running) interval = setInterval(() => setTimer(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + "h " : ""}${m}m ${s}s`;
  };

  const handleSave = () => {
    if (!topic.trim()) return;
    const session: StudySession = {
      id: `study-${Date.now()}`,
      date: new Date().toISOString(),
      subject, topic: topic.trim(),
      duration: Math.max(duration, Math.floor(timer / 60)),
      questions, source, notes: notes.trim(),
      mood, understanding,
    };
    const updated = [session, ...sessions];
    localStorage.setItem("prepflow_study_log", JSON.stringify(updated));
    setSessions(updated);
    setTopic(""); setNotes(""); setDuration(30); setQuestions(0);
    setTimer(0); setRunning(false); setUnderstanding(3);
  };

  const deleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    localStorage.setItem("prepflow_study_log", JSON.stringify(updated));
    setSessions(updated);
  };

  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter(s => s.date.startsWith(today));
  const todayMinutes = todaySessions.reduce((s, x) => s + x.duration, 0);
  const todayQuestions = todaySessions.reduce((s, x) => s + x.questions, 0);

  // Stats
  const weeklySessions = sessions.filter(s => {
    const d = new Date(s.date);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  });
  const weeklyMinutes = weeklySessions.reduce((s, x) => s + x.duration, 0);
  const weeklyHours = Math.floor(weeklyMinutes / 60);
  const subjectBreakdown: Record<string, number> = {};
  sessions.forEach(s => { subjectBreakdown[s.subject] = (subjectBreakdown[s.subject] || 0) + s.duration; });

  return (
    <div className="space-y-4">
      {/* View Tabs */}
      <div className="flex gap-2">
        {(["add", "history", "stats"] as const).map(v => (
          <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === v ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700"}`}>
            {v === "add" ? "➕ যোগ" : v === "history" ? "📋 ইতিহাস" : "📊 স্ট্যাটস"}
          </button>
        ))}
      </div>

      {/* Today Summary Card */}
      <div className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl p-4 text-white">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="text-xl font-extrabold">{todaySessions.length}</p><p className="text-xs opacity-80">সেশন</p></div>
          <div><p className="text-xl font-extrabold">{Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m</p><p className="text-xs opacity-80">সময়</p></div>
          <div><p className="text-xl font-extrabold">{todayQuestions}</p><p className="text-xs opacity-80">প্রশ্ন</p></div>
        </div>
      </div>

      {view === "add" && (
        <>
          {/* Timer */}
          <div className="bg-white rounded-2xl border border-amber-200 p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-amber-700 mb-2 font-mono">{formatTime(timer)}</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setRunning(!running)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${running ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}>{running ? "⏸️ বিরতি" : "▶️ শুরু"}</button>
              <button onClick={() => { setTimer(0); setRunning(false); }} className="bg-gray-200 px-4 py-2 rounded-xl text-sm font-semibold">🔄</button>
            </div>
          </div>

          {/* Add Form */}
          <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select value={subject} onChange={e => setSubject(e.target.value)} className="rounded-xl border p-2 text-sm">
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="টপিক (যেমন: কারক)" className="rounded-xl border p-2 text-sm" />
              <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} placeholder="সময় (মিনিট)" className="rounded-xl border p-2 text-sm" />
              <input type="number" value={questions} onChange={e => setQuestions(Number(e.target.value))} placeholder="প্রশ্ন সংখ্যা" className="rounded-xl border p-2 text-sm" />
              <select value={source} onChange={e => setSource(e.target.value)} className="rounded-xl border p-2 text-sm">
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={mood} onChange={e => setMood(e.target.value)} className="rounded-xl border p-2 text-sm">
                {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="নোট (ঐচ্ছিক)" className="rounded-xl border p-2 text-sm sm:col-span-2" />
            </div>
            {/* Understanding Slider */}
            <div className="mt-3">
              <p className="text-xs text-gray-600 mb-1">কতটুকু বুঝেছেন? {understanding}/5</p>
              <input type="range" min="1" max="5" value={understanding} onChange={e => setUnderstanding(Number(e.target.value))} className="w-full accent-amber-500" />
            </div>
            <button onClick={handleSave} disabled={!topic.trim()} className="mt-3 w-full bg-amber-500 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50">💾 সেভ করুন</button>
          </div>
        </>
      )}

      {view === "history" && (
        <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm max-h-80 overflow-y-auto">
          {sessions.length === 0 && <p className="text-gray-500 text-sm text-center py-4">এখনো কোনো সেশন নেই।</p>}
          <div className="space-y-2">
            {sessions.slice(0, 50).map(s => (
              <div key={s.id} className="flex items-center justify-between bg-amber-50 rounded-lg p-2 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-amber-200 px-2 py-0.5 rounded-full">{s.subject}</span>
                    <span className="font-medium">{s.topic}</span>
                    <span>{s.mood}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>{s.duration}m</span>
                    <span>{s.questions}Q</span>
                    <span>📚 {s.understanding}/5</span>
                    <span className="text-gray-400">{s.date.slice(0, 10)}</span>
                  </div>
                </div>
                <button onClick={() => deleteSession(s.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "stats" && (
        <div className="space-y-3">
          {/* Weekly Summary */}
          <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm">
            <h3 className="font-bold text-amber-800 mb-2">📊 সাপ্তাহিক রিপোর্ট</h3>
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="bg-amber-50 rounded-xl p-2"><p className="font-bold text-lg">{weeklySessions.length}</p><p className="text-xs text-gray-500">সেশন</p></div>
              <div className="bg-amber-50 rounded-xl p-2"><p className="font-bold text-lg">{weeklyHours}h</p><p className="text-xs text-gray-500">সময়</p></div>
            </div>
          </div>

          {/* Subject Breakdown */}
          <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-sm">
            <h3 className="font-bold text-amber-800 mb-2">📚 বিষয়ভিত্তিক সময়</h3>
            {Object.entries(subjectBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([sub, mins]) => (
              <div key={sub} className="flex items-center justify-between text-sm mb-1">
                <span>{sub}</span>
                <span className="font-medium">{Math.floor(mins / 60)}h {mins % 60}m</span>
              </div>
            ))}
            {Object.keys(subjectBreakdown).length === 0 && <p className="text-gray-500 text-sm">এখনো কোনো ডাটা নেই।</p>}
          </div>
        </div>
      )}
    </div>
  );
}