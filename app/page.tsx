"use client";

import { useState, useEffect } from "react";
import MCQGenerator from "@/components/MCQGenerator";

// ---------- Types ----------
interface TopicStats {
  totalAttempted: number;
  totalCorrect: number;
  perQuestion: Record<string, { attempts: number; correct: number }>;
  daily: Record<string, { attempted: number; correct: number }>;
  history: { date: string; correct: boolean }[];
}

interface TopicOverview {
  topic: string;
  accuracy: number;
  totalQuestions: number;
  masteredQuestions: number;
  learningQuestions: number;
  newQuestions: number;
  todayCount: number;
  lastPracticed: string | null;
}

// ---------- Subjects ----------
const SUBJECTS: Record<string, string[]> = {
  "বাংলা": ["বাংলা ব্যাকরণ", "বাংলা সাহিত্য"],
  "ইংরেজী": ["English Grammar", "English Literature"],
  "গণিত": ["পাটিগণিত", "বীজগণিত", "জ্যামিতি", "ত্রিকোণমিতি", "পরিসংখ্যান"],
  "সাধারণ জ্ঞান": ["বাংলাদেশ", "আন্তর্জাতিক", "সংবিধান", "ভূগোল", "ইতিহাস", "অর্থনীতি"],
  "বিজ্ঞান": ["পদার্থবিজ্ঞান", "রসায়নবিজ্ঞান", "জীববিজ্ঞান", "পরিবেশ"],
  "আইসিটি": ["কম্পিউটার", "তথ্য প্রযুক্তি", "ইন্টারনেট", "প্রোগ্রামিং"],
};

// ---------- Safe localStorage helpers ----------
function getStatsKey(t: string) { return `prepflow_stats_${t}`; }
function getBankKey(t: string) { return `prepflow_bank_${t}`; }

function safeGet(key: string): any | null {
  if (typeof window === "undefined") return null;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
}

function getTopicOverview(topic: string): TopicOverview {
  const stats = safeGet(getStatsKey(topic)) as TopicStats | null;
  const bank = safeGet(getBankKey(topic));
  const today = new Date().toISOString().slice(0, 10);

  if (!stats) {
    return {
      topic, accuracy: 0, totalQuestions: 0, masteredQuestions: 0,
      learningQuestions: 0, newQuestions: bank?.questions?.length || 0,
      todayCount: 0, lastPracticed: null,
    };
  }

  const total = Object.keys(stats.perQuestion).length;
  const mastered = Object.values(stats.perQuestion).filter(
    (q: any) => q.attempts >= 3 && (q.correct / q.attempts) >= 0.8
  ).length;
  const learning = Object.values(stats.perQuestion).filter(
    (q: any) => q.attempts > 0 && (q.attempts < 3 || (q.correct / q.attempts) < 0.8)
  ).length;
  const acc = stats.totalAttempted > 0 ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 0;
  const todayCount = stats.daily[today]?.attempted || 0;
  const dates = Object.keys(stats.daily).sort().reverse();

  return {
    topic, accuracy: acc, totalQuestions: total,
    masteredQuestions: mastered, learningQuestions: learning,
    newQuestions: Math.max(0, total - mastered - learning),
    todayCount, lastPracticed: dates.length > 0 ? dates[0] : null,
  };
}

function getAllOverviews(): TopicOverview[] {
  if (typeof window === "undefined") return [];
  const arr: TopicOverview[] = [];
  Object.values(SUBJECTS).forEach(topics => topics.forEach(t => arr.push(getTopicOverview(t))));
  return arr;
}

export default function Home() {
  const [tab, setTab] = useState<"practice" | "progress">("practice");
  const [subject, setSubject] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [overviews, setOverviews] = useState<TopicOverview[]>([]);

  useEffect(() => { setOverviews(getAllOverviews()); }, [tab]);

  const totalQ = overviews.reduce((s, o) => s + o.totalQuestions, 0);
  const totalAttempted = overviews.reduce((s, o) => s + (safeGet(getStatsKey(o.topic))?.totalAttempted || 0), 0);
  const totalCorrect = overviews.reduce((s, o) => s + (safeGet(getStatsKey(o.topic))?.totalCorrect || 0), 0);
  const overallAcc = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
  const totalMastered = overviews.reduce((s, o) => s + o.masteredQuestions, 0);
  const todayTotal = overviews.reduce((s, o) => s + o.todayCount, 0);

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i); const ds = d.toISOString().slice(0, 10);
    let c = 0;
    overviews.forEach(o => {
      const s = safeGet(getStatsKey(o.topic)) as TopicStats | null;
      if (s?.daily[ds]) c += s.daily[ds].attempted;
    });
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, count: c };
  }).reverse();
  const maxD = Math.max(1, ...last30.map(d => d.count));

  const aiTools = [
    { name: "ChatGPT", url: "https://chat.openai.com", color: "from-green-600 to-emerald-700", emoji: "🤖" },
    { name: "Claude", url: "https://claude.ai", color: "from-[#1a1a2e] to-[#0f3460]", emoji: "🧠" },
    { name: "DeepSeek", url: "https://chat.deepseek.com", color: "from-blue-600 to-indigo-700", emoji: "🔍" },
  ];

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-800">PrepFlow</h1>
        <div className="flex gap-2">
          {(["practice", "progress"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === t ? "bg-amber-500 text-white shadow" : "bg-white text-amber-800 border border-amber-200"}`}>
              {t === "practice" ? "অনুশীলন" : "অগ্রগতি"}
            </button>
          ))}
        </div>
      </div>

      {tab === "practice" && (
        <div>
          {!subject && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.keys(SUBJECTS).map(s => {
                const st = SUBJECTS[s]; const so = overviews.filter(o => st.includes(o.topic));
                const sa = so.length > 0 ? Math.round(so.reduce((a, o) => a + o.accuracy, 0) / so.length) : 0;
                const stotal = so.reduce((a, o) => a + o.totalQuestions, 0);
                return (
                  <button key={s} onClick={() => setSubject(s)} className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5 hover:shadow-md transition text-center">
                    <span className="text-2xl mb-2 block">{s === "বাংলা" ? "🇧🇩" : s === "ইংরেজী" ? "🇬🇧" : s === "গণিত" ? "🔢" : s === "সাধারণ জ্ঞান" ? "🌍" : s === "বিজ্ঞান" ? "🔬" : "💻"}</span>
                    <span className="font-semibold text-amber-900 text-sm">{s}</span>
                    {stotal > 0 && <div className="mt-2"><div className="w-full h-1.5 bg-gray-200 rounded-full"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${sa}%` }} /></div><p className="text-xs text-gray-500 mt-1">{sa}% ({stotal} প্রশ্ন)</p></div>}
                  </button>
                );
              })}
            </div>
          )}

          {subject && !topic && (
            <div className="space-y-4">
              <button onClick={() => setSubject(null)} className="text-amber-700 text-sm underline">← বিষয় পরিবর্তন</button>
              <h2 className="text-xl font-bold text-amber-800">{subject}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUBJECTS[subject].map(t => {
                  const o = overviews.find(x => x.topic === t); const has = o && o.totalQuestions > 0;
                  return (
                    <button key={t} onClick={() => setTopic(t)} className="bg-white rounded-xl border border-amber-200 p-4 hover:bg-amber-50 transition text-left">
                      <div className="flex items-center justify-between"><span className="font-medium text-amber-900 text-sm">{t}</span>{has && <span className={`text-xs px-2 py-0.5 rounded-full ${o.accuracy >= 80 ? "bg-green-100 text-green-700" : o.accuracy >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{o.accuracy}%</span>}</div>
                      {has && <div className="mt-2"><div className="flex gap-1 text-xs text-gray-500"><span>🟢 {o.masteredQuestions}</span><span>🟡 {o.learningQuestions}</span><span>⚪ {o.newQuestions}</span></div>{o.lastPracticed && <p className="text-xs text-gray-400 mt-1">শেষ: {o.lastPracticed}{o.todayCount > 0 && ` | আজ: ${o.todayCount}টি`}</p>}</div>}
                      {!has && <p className="text-xs text-gray-400 mt-1">শুরু করুন</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {topic && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button onClick={() => { setSubject(null); setTopic(null); }} className="text-amber-700 text-sm underline">← বিষয় পরিবর্তন</button>
                <span className="text-sm font-medium text-amber-800 bg-amber-100 px-3 py-1 rounded-full">{topic}</span>
              </div>
              <MCQGenerator topic={topic} />
            </div>
          )}
        </div>
      )}

      {tab === "progress" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-amber-800">সার্বিক অগ্রগতি</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center"><p className="text-2xl font-bold text-amber-700">{totalQ}</p><p className="text-xs text-gray-500">মোট প্রশ্ন ব্যাংক</p></div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center"><p className="text-2xl font-bold text-green-600">{totalMastered}</p><p className="text-xs text-gray-500">মাস্টার্ড</p></div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center"><p className="text-2xl font-bold text-amber-700">{overallAcc}%</p><p className="text-xs text-gray-500">সামগ্রিক নির্ভুলতা</p></div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center"><p className="text-2xl font-bold text-amber-700">{todayTotal}</p><p className="text-xs text-gray-500">আজকের প্রশ্ন</p></div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5 overflow-x-auto">
            <h3 className="font-bold text-lg text-amber-800 mb-3">গত ৩০ দিনের অনুশীলন</h3>
            <div className="flex items-end justify-between gap-1 min-w-[600px]" style={{ height: 100 }}>
              {last30.map((d, i) => (<div key={i} className="flex flex-col items-center flex-1 gap-1"><span className="text-[10px] text-gray-500">{d.count || ""}</span><div className="w-full max-w-[12px] bg-amber-400 rounded-t" style={{ height: `${Math.max(3, (d.count / maxD) * 50)}px` }} /><span className="text-[10px] text-gray-400 whitespace-nowrap">{d.label}</span></div>))}
            </div>
          </div>
          <div className="space-y-4">
            {Object.entries(SUBJECTS).map(([s, topics]) => {
              const so = overviews.filter(o => topics.includes(o.topic));
              const sa = so.length > 0 ? Math.round(so.reduce((a, o) => a + o.accuracy, 0) / so.length) : 0;
              const stotal = so.reduce((a, o) => a + o.totalQuestions, 0);
              const smastered = so.reduce((a, o) => a + o.masteredQuestions, 0);
              return (
                <div key={s} className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5">
                  <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-amber-800">{s}</h3><span className="text-sm text-gray-500">{smastered}/{stotal} মাস্টার্ড</span></div>
                  {stotal > 0 && <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${sa}%` }} /></div>}
                  <div className="space-y-1">{topics.map(t => { const o = overviews.find(x => x.topic === t); return (<div key={t} className="flex items-center justify-between text-sm"><span className="text-gray-700">{t}</span><span className="text-gray-500">{o?.totalQuestions || 0} প্রশ্ন{o?.lastPracticed && ` | শেষ: ${o.lastPracticed}`}</span></div>); })}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-6">
            <h3 className="text-lg font-bold text-amber-800 mb-3 text-center">🤖 AI সহায়ক টুলস</h3>
            <div className="grid grid-cols-3 gap-3">
              {aiTools.map(tool => (<a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer" className={`bg-gradient-to-br ${tool.color} rounded-2xl p-4 text-center shadow-lg hover:scale-105 transition-transform`}><span className="text-2xl block mb-1">{tool.emoji}</span><h4 className="text-white font-bold text-sm">{tool.name}</h4><p className="text-white/60 text-xs mt-1">খুলুন →</p></a>))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">সবগুলোই ফ্রি • কোনো API key লাগবে না</p>
          </div>
        </div>
      )}
    </main>
  );
}