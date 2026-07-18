"use client";

import { useState, useEffect } from "react";
import MCQGenerator from "@/components/MCQGenerator";
import LocalMCQViewer from "@/components/LocalMCQViewer";
import ExternalTracker from "@/components/ExternalTracker";
import StudyTracker from "@/components/StudyTracker";

// ---------- Types ----------
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

// ---------- Subjects with Icons ----------
const SUBJECTS: Record<string, { topics: string[]; icon: string }> = {
  "বাংলা": { topics: ["বাংলা ব্যাকরণ", "বাংলা সাহিত্য"], icon: "🇧🇩" },
  "ইংরেজী": { topics: ["English Grammar", "English Literature"], icon: "🇬🇧" },
  "গণিত": { topics: ["পাটিগণিত", "বীজগণিত", "জ্যামিতি ও পরিমিতি", "ত্রিকোণমিতি"], icon: "🔢" },
  "মানসিক দক্ষতা": { topics: ["ভাষাগত যৌক্তিক বিচার", "সংখ্যাগত ক্ষমতা", "স্থানিক ক্ষমতা", "বিন্যাস", "ডাটা ইন্টারপ্রিটেশন"], icon: "🧠" },
  "সাধারণ জ্ঞান (বাংলাদেশ)": { topics: ["প্রাচীন ইতিহাস", "ব্রিটিশ ও পাকিস্তান", "মুক্তিযুদ্ধ", "ভূগোল", "জাতীয় বিষয়", "সংবিধান", "অর্থনীতি"], icon: "🇧🇩" },
  "সাধারণ জ্ঞান (আন্তর্জাতিক)": { topics: ["বৈশ্বিক ইতিহাস", "দেশ পরিচিতি", "আন্তর্জাতিক সংস্থা", "আঞ্চলিক জোট", "পরিবেশ", "পুরস্কার"], icon: "🌍" },
  "সাধারণ বিজ্ঞান": { topics: ["ভৌত বিজ্ঞান", "জীববিজ্ঞান", "আধুনিক বিজ্ঞান"], icon: "🔬" },
  "কম্পিউটার ও আইসিটি": { topics: ["হার্ডওয়্যার", "মেমোরি", "সফটওয়্যার", "সংখ্যা পদ্ধতি", "নেটওয়ার্কিং", "আধুনিক প্রযুক্তি"], icon: "💻" },
  "ভূগোল ও পরিবেশ": { topics: ["বাংলাদেশ ভূগোল", "পরিবেশ", "দুর্যোগ ব্যবস্থাপনা"], icon: "🌿" },
  "নৈতিকতা ও সুশাসন": { topics: ["নৈতিকতা", "সুশাসন"], icon: "⚖️" },
  "ব্যাংকিং ও ফিন্যান্স": { topics: ["ব্যাংকিং টার্মস", "বাংলাদেশ ব্যাংক", "ফিন্যান্স"], icon: "💰" },
};

// ---------- Detailed Topic Lists ----------
const SUBJECT_TOPICS: Record<string, Record<string, string[]>> = {
  "বাংলা": { "বাংলা ব্যাকরণ": ["ধ্বনি-বর্ণ","শব্দ","পদ","উপসর্গ","অনুসর্গ","সন্ধি","সমাস","প্রকৃতি-প্রত্যয়","বাক্য","বিপরীত শব্দ","সমার্থক","বাগধারা","বানান"], "বাংলা সাহিত্য": ["চর্যাপদ","মধ্যযুগ","বৈষ্ণব","বিদ্যাসাগর","বঙ্কিম","মধুসূদন","রবীন্দ্রনাথ","নজরুল","মীর মশাররফ","শরৎচন্দ্র","জসীমউদ্দীন","মুনীর চৌধুরী"] },
  "ইংরেজী": { "English Grammar": ["Parts of Speech","Tense","Voice","Narration","Clause","Preposition","Phrases","Synonyms","Spelling","Correction"], "English Literature": ["Periods","Shakespeare","Milton","Wordsworth","Shelley","Keats","Dickens","Shaw","Eliot","Yeats","Terms"] },
  "গণিত": { "পাটিগণিত": ["সংখ্যা","লসাগু","অনুপাত","শতকরা","লাভ-ক্ষতি","সুদ","সময়-কাজ","গড়"], "বীজগণিত": ["সূত্র","সমীকরণ","অসমতা","লগারিদম","ধারা","সেট","সম্ভাব্যতা"], "জ্যামিতি ও পরিমিতি": ["রেখা-কোণ","ত্রিভুজ","চতুর্ভুজ","বৃত্ত","পরিমিতি"], "ত্রিকোণমিতি": ["অনুপাত","উচ্চতা"] },
  "মানসিক দক্ষতা": { "ভাষাগত": ["রক্তসম্পর্ক","দিক","ঘড়ি"], "সংখ্যাগত": ["সিরিজ","কোডিং"], "স্থানিক": ["আয়না","পানি","চিত্র"], "বিন্যাস": ["সিটিং","পাজল"], "ডাটা": ["টেবিল","চার্ট"] },
  "সাধারণ জ্ঞান (বাংলাদেশ)": { "প্রাচীন ইতিহাস": ["জনপদ","পাল","মোঘল"], "ব্রিটিশ": ["১৭৫৭","ভাষা","ছয় দফা"], "মুক্তিযুদ্ধ": ["৭ মার্চ","মুজিবনগর","বীরশ্রেষ্ঠ"], "ভূগোল": ["সীমানা","নদী"], "জাতীয়": ["প্রতীক","প্রজেক্ট"], "সংবিধান": ["অনুচ্ছেদ"], "অর্থনীতি": ["জিডিপি","বাজেট"] },
  "সাধারণ জ্ঞান (আন্তর্জাতিক)": { "ইতিহাস": ["বিশ্বযুদ্ধ","স্নায়ু"], "দেশ": ["রাজধানী","মুদ্রা"], "সংস্থা": ["UN","IMF"], "জোট": ["SAARC","ASEAN","OIC","EU","BRICS"], "পরিবেশ": ["COP","প্যারিস"], "পুরস্কার": ["নোবেল","অলিম্পিক"] },
  "সাধারণ বিজ্ঞান": { "ভৌত": ["পদার্থ","আলো","শব্দ","বিদ্যুৎ"], "জীব": ["কোষ","রক্ত","রোগ","ভিটামিন"], "আধুনিক": ["মহাবিশ্ব","বায়োটেক"] },
  "কম্পিউটার ও আইসিটি": { "হার্ডওয়্যার": ["ইনপুট","আউটপুট"], "মেমোরি": ["RAM","ROM"], "সফটওয়্যার": ["OS","Office"], "সংখ্যা": ["বাইনারি"], "নেটওয়ার্ক": ["LAN","IP","ক্লাউড"], "প্রযুক্তি": ["AI","সাইবার"] },
  "ভূগোল ও পরিবেশ": { "বাংলাদেশ": ["অবস্থান","প্রকৃতি"], "পরিবেশ": ["বাস্তুতন্ত্র","ওজোন"], "দুর্যোগ": ["বন্যা","ভূমিকম্প","SDG"] },
  "নৈতিকতা ও সুশাসন": { "নৈতিকতা": ["উৎস","গুণাবলি"], "সুশাসন": ["উপাদান","RTI"] },
  "ব্যাংকিং ও ফিন্যান্স": { "টার্মস": ["CRR","SLR","Repo"], "বাংলাদেশ ব্যাংক": ["ইতিহাস","মুদ্রানীতি"], "ফিন্যান্স": ["জাবেদা","ব্যালেন্স"] },
};

// ---------- Helpers ----------
function safeGet(key: string): any | null {
  if (typeof window === "undefined") return null;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
}

function getTopicOverview(topic: string): TopicOverview {
  const stats = safeGet(`prepflow_stats_${topic}`);
  const bank = safeGet(`prepflow_bank_${topic}`);
  const today = new Date().toISOString().slice(0, 10);
  if (!stats) return { topic, accuracy: 0, totalQuestions: 0, masteredQuestions: 0, learningQuestions: 0, newQuestions: bank?.questions?.length || 0, todayCount: 0, lastPracticed: null };
  const total = Object.keys(stats.perQuestion || {}).length;
  const mastered = Object.values(stats.perQuestion || {}).filter((q: any) => q.attempts >= 3 && (q.correct / q.attempts) >= 0.8).length;
  const learning = Object.values(stats.perQuestion || {}).filter((q: any) => q.attempts > 0 && !(q.attempts >= 3 && (q.correct / q.attempts) >= 0.8)).length;
  const acc = stats.totalAttempted > 0 ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 0;
  const todayCount = stats.daily?.[today]?.attempted || 0;
  const dates = Object.keys(stats.daily || {}).sort().reverse();
  return { topic, accuracy: acc, totalQuestions: total, masteredQuestions: mastered, learningQuestions: learning, newQuestions: Math.max(0, total - mastered - learning), todayCount, lastPracticed: dates.length > 0 ? dates[0] : null };
}

function getAllOverviews(): TopicOverview[] {
  if (typeof window === "undefined") return [];
  const arr: TopicOverview[] = [];
  Object.values(SUBJECTS).forEach(s => s.topics.forEach(t => arr.push(getTopicOverview(t))));
  return arr;
}

function getSubTopicStats(subject: string, subTopic: string): { questions: number; accuracy: number } {
  let q = 0, c = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(`prepflow_stats_${subject}_${subTopic}`)) continue;
    const raw = safeGet(key); if (!raw) continue;
    try { Object.values(raw.perQuestion || {}).forEach((v: any) => { q += v.attempts || 0; c += v.correct || 0; }); } catch {}
  }
  return { questions: q, accuracy: q > 0 ? Math.round((c / q) * 100) : 0 };
}

// ---------- App ----------
export default function Home() {
  const [tab, setTab] = useState<"practice" | "progress">("practice");
  const [subject, setSubject] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [mcqMode, setMcqMode] = useState<"ai" | "local">("ai");

  useEffect(() => { getAllOverviews(); }, [tab, subject]);

  const all = getAllOverviews();
  const subOverviews = subject ? all.filter(o => SUBJECTS[subject]?.topics.includes(o.topic)) : [];

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
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === t ? "bg-amber-500 text-white shadow" : "bg-white text-amber-800 border border-amber-200"}`}>{t === "practice" ? "অনুশীলন" : "অগ্রগতি"}</button>
          ))}
        </div>
      </div>

      {tab === "practice" && (
        <div>
          {!subject && (
            <>
              <div className="mb-6"><StudyTracker /></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(SUBJECTS).map(([s, { icon }]) => {
                  const so = all.filter(o => SUBJECTS[s].topics.includes(o.topic));
                  const sa = so.length > 0 ? Math.round(so.reduce((a, o) => a + o.accuracy, 0) / so.length) : 0;
                  const st = so.reduce((a, o) => a + o.totalQuestions, 0);
                  const sm = so.reduce((a, o) => a + o.masteredQuestions, 0);
                  return (
                    <button key={s} onClick={() => setSubject(s)} className="bg-white rounded-2xl shadow-sm border border-amber-200 p-4 hover:shadow-md transition text-center">
                      <span className="text-2xl mb-1 block">{icon}</span>
                      <span className="font-semibold text-amber-900 text-xs">{s}</span>
                      {st > 0 && <div className="mt-1"><div className="w-full h-1 bg-gray-200 rounded-full"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${sa}%` }} /></div><p className="text-xs text-gray-500 mt-0.5">{sa}% ({sm}/{st})</p></div>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {subject && !topic && (
            <div className="space-y-4">
              <button onClick={() => setSubject(null)} className="text-amber-700 text-sm underline">← বিষয় পরিবর্তন</button>
              <h2 className="text-xl font-bold text-amber-800">{SUBJECTS[subject].icon} {subject}</h2>
              {(() => {
                const sa = subOverviews.length > 0 ? Math.round(subOverviews.reduce((a, o) => a + o.accuracy, 0) / subOverviews.length) : 0;
                const st = subOverviews.reduce((a, o) => a + o.totalQuestions, 0);
                const sm = subOverviews.reduce((a, o) => a + o.masteredQuestions, 0);
                return (
                  <div className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl p-4 text-white shadow">
                    <div className="flex justify-between mb-2"><span className="font-bold">অগ্রগতি</span><span>{sm}/{st} মাস্টার্ড</span></div>
                    <div className="w-full h-2 bg-white/20 rounded-full"><div className="h-full bg-white rounded-full" style={{ width: `${sa}%` }} /></div>
                  </div>
                );
              })()}
              {SUBJECT_TOPICS[subject] && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {Object.entries(SUBJECT_TOPICS[subject]).map(([st, tops]) => (
                    <div key={st} className="bg-white rounded-xl border border-amber-200 p-3">
                      <h3 className="font-bold text-sm text-amber-800 mb-2">{st}</h3>
                      {tops.map(t => {
                        const s = getSubTopicStats(subject, st);
                        return (
                          <div key={t} className="flex items-center gap-2 mb-1">
                            <span className="w-32 text-xs truncate">{t}</span>
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${s.accuracy}%` }} /></div>
                            <span className="text-xs w-10 text-right">{s.questions > 0 ? `${s.accuracy}%` : "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUBJECTS[subject].topics.map(t => {
                  const o = all.find(x => x.topic === t); const has = o && o.totalQuestions > 0;
                  return (
                    <button key={t} onClick={() => setTopic(t)} className="bg-white rounded-xl border border-amber-200 p-3 hover:bg-amber-50 transition text-left">
                      <div className="flex justify-between"><span className="font-medium text-amber-900 text-sm">{t}</span>{has && <span className={`text-xs px-2 py-0.5 rounded-full ${o.accuracy >= 80 ? "bg-green-100 text-green-700" : o.accuracy >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{o.accuracy}%</span>}</div>
                      {has && <div className="mt-1 flex gap-1 text-xs text-gray-500"><span>🟢{o.masteredQuestions}</span><span>🟡{o.learningQuestions}</span><span>⚪{o.newQuestions}</span></div>}
                      {!has && <p className="text-xs text-gray-400">শুরু করুন</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {topic && (
            <div className="space-y-6">
              <div className="flex justify-between">
                <button onClick={() => { setSubject(null); setTopic(null); }} className="text-amber-700 text-sm underline">← বিষয় পরিবর্তন</button>
                <span className="text-sm font-medium bg-amber-100 px-3 py-1 rounded-full">{topic}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setMcqMode("ai")} className={`px-4 py-2 rounded-xl text-sm font-semibold ${mcqMode === "ai" ? "bg-amber-500 text-white" : "bg-white border border-amber-200"}`}>🤖 AI MCQ</button>
                <button onClick={() => setMcqMode("local")} className={`px-4 py-2 rounded-xl text-sm font-semibold ${mcqMode === "local" ? "bg-amber-500 text-white" : "bg-white border border-amber-200"}`}>📚 Local MCQ</button>
              </div>
              {mcqMode === "ai" ? <MCQGenerator topic={topic} /> : <LocalMCQViewer topic={topic} />}
            </div>
          )}
        </div>
      )}

      {tab === "progress" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-amber-800">সার্বিক অগ্রগতি</h2>
          <div className="space-y-4">
            {Object.entries(SUBJECTS).map(([s, { icon, topics }]) => {
              const so = all.filter(o => topics.includes(o.topic));
              const sa = so.length > 0 ? Math.round(so.reduce((a, o) => a + o.accuracy, 0) / so.length) : 0;
              const stotal = so.reduce((a, o) => a + o.totalQuestions, 0);
              const smastered = so.reduce((a, o) => a + o.masteredQuestions, 0);
              return (
                <div key={s} className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5">
                  <div className="flex items-center justify-between mb-3"><h3 className="font-bold text-amber-800">{icon} {s}</h3><span className="text-sm text-gray-500">{smastered}/{stotal} মাস্টার্ড</span></div>
                  {stotal > 0 && <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${sa}%` }} /></div>}
                </div>
              );
            })}
          </div>
          <ExternalTracker onSessionAdded={() => getAllOverviews()} />
          <div className="mt-6"><h3 className="text-lg font-bold text-amber-800 mb-3 text-center">🤖 AI সহায়ক</h3><div className="grid grid-cols-3 gap-3">{aiTools.map(tool => (<a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer" className={`bg-gradient-to-br ${tool.color} rounded-2xl p-4 text-center shadow-lg hover:scale-105 transition-transform`}><span className="text-2xl block mb-1">{tool.emoji}</span><h4 className="text-white font-bold text-sm">{tool.name}</h4></a>))}</div></div>
        </div>
      )}
    </main>
  );
}