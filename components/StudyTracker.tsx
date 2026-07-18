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
}

const SUBJECTS = [
  "বাংলা", "ইংরেজী", "গণিত", "মানসিক দক্ষতা",
  "সাধারণ জ্ঞান (বাংলাদেশ)", "সাধারণ জ্ঞান (আন্তর্জাতিক)",
  "সাধারণ বিজ্ঞান", "কম্পিউটার ও আইসিটি", "ভূগোল ও পরিবেশ",
  "নৈতিকতা ও সুশাসন", "ব্যাংকিং ও ফিন্যান্স",
];

const SOURCES = ["PrepFlow", "DeepSeek", "Claude", "ChatGPT", "Other"];

export default function StudyTracker() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subject, setSubject] = useState("বাংলা");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(30);
  const [questions, setQuestions] = useState(0);
  const [source, setSource] = useState("PrepFlow");
  const [notes, setNotes] = useState("");
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);

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
    };
    const updated = [...sessions, session];
    localStorage.setItem("prepflow_study_log", JSON.stringify(updated));
    setSessions(updated.reverse());
    setTopic(""); setNotes(""); setDuration(30); setQuestions(0);
    setTimer(0); setRunning(false);
  };

  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter(s => s.date.startsWith(today));
  const todayMinutes = todaySessions.reduce((s, x) => s + x.duration, 0);
  const todayQuestions = todaySessions.reduce((s, x) => s + x.questions, 0);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl p-5 text-white">
        <h2 className="text-lg font-bold mb-3">📊 আজকের স্টাডি</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><p className="text-2xl font-extrabold">{todaySessions.length}</p><p className="text-xs opacity-80">সেশন</p></div>
          <div><p className="text-2xl font-extrabold">{Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m</p><p className="text-xs opacity-80">সময়</p></div>
          <div><p className="text-2xl font-extrabold">{todayQuestions}</p><p className="text-xs opacity-80">প্রশ্ন</p></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-amber-200 p-5 text-center shadow-sm">
        <h3 className="font-bold text-amber-800 mb-3">⏱️ স্টাডি টাইমার</h3>
        <p className="text-4xl font-bold text-amber-700 mb-3 font-mono">{formatTime(timer)}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setRunning(!running)} className={`px-5 py-2 rounded-xl font-semibold ${running ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}>{running ? "⏸️ বিরতি" : "▶️ শুরু"}</button>
          <button onClick={() => { setTimer(0); setRunning(false); }} className="bg-gray-200 px-5 py-2 rounded-xl font-semibold">🔄 রিসেট</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
        <h3 className="font-bold text-amber-800 mb-3">📝 নতুন সেশন যোগ করুন</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select value={subject} onChange={e => setSubject(e.target.value)} className="rounded-xl border p-2 text-sm">
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="টপিক (যেমন: কারক)" className="rounded-xl border p-2 text-sm" />
          <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} placeholder="সময় (মিনিট)" className="rounded-xl border p-2 text-sm" />
          <input type="number" value={questions} onChange={e => setQuestions(Number(e.target.value))} placeholder="প্রশ্ন সংখ্যা" className="rounded-xl border p-2 text-sm" />
          <select value={source} onChange={e => setSource(e.target.value)} className="rounded-xl border p-2 text-sm">
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="নোট (ঐচ্ছিক)" className="rounded-xl border p-2 text-sm" />
        </div>
        <button onClick={handleSave} disabled={!topic.trim()} className="mt-3 w-full bg-amber-500 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50">💾 সেভ করুন</button>
      </div>

      <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
        <h3 className="font-bold text-amber-800 mb-3">📋 স্টাডি হিস্টোরি</h3>
        {sessions.length === 0 && <p className="text-gray-500 text-sm">এখনো কোনো সেশন নেই।</p>}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-amber-50 rounded-lg p-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-amber-200 px-2 py-0.5 rounded-full">{s.subject}</span>
                <span className="font-medium">{s.topic}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{s.duration}m</span>
                <span>{s.questions}Q</span>
                <span className="text-gray-400">{s.date.slice(0, 10)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}