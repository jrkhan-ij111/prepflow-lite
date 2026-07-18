"use client";

import { useState, useEffect } from "react";
import MCQGenerator from "@/components/MCQGenerator";
import ExternalTracker from "@/components/ExternalTracker";

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

// ---------- Subjects ----------
const SUBJECTS: Record<string, string[]> = {
  "বাংলা": ["বাংলা ব্যাকরণ", "বাংলা সাহিত্য"],
  "ইংরেজী": ["English Grammar", "English Literature"],
  "গণিত": ["পাটিগণিত", "বীজগণিত", "জ্যামিতি ও পরিমিতি", "ত্রিকোণমিতি"],
  "মানসিক দক্ষতা": ["ভাষাগত যৌক্তিক বিচার", "সংখ্যাগত ক্ষমতা", "স্থানিক ক্ষমতা", "বিন্যাস", "ডাটা ইন্টারপ্রিটেশন"],
  "সাধারণ জ্ঞান (বাংলাদেশ)": ["প্রাচীন ইতিহাস", "ব্রিটিশ ও পাকিস্তান", "মুক্তিযুদ্ধ", "ভূগোল", "জাতীয় বিষয়", "সংবিধান", "অর্থনীতি"],
  "সাধারণ জ্ঞান (আন্তর্জাতিক)": ["বৈশ্বিক ইতিহাস", "দেশ পরিচিতি", "আন্তর্জাতিক সংস্থা", "আঞ্চলিক জোট", "পরিবেশ", "পুরস্কার"],
  "সাধারণ বিজ্ঞান": ["ভৌত বিজ্ঞান", "জীববিজ্ঞান", "আধুনিক বিজ্ঞান"],
  "কম্পিউটার ও আইসিটি": ["হার্ডওয়্যার", "মেমোরি", "সফটওয়্যার", "সংখ্যা পদ্ধতি", "নেটওয়ার্কিং", "আধুনিক প্রযুক্তি"],
  "ভূগোল ও পরিবেশ": ["বাংলাদেশ ভূগোল", "পরিবেশ", "দুর্যোগ ব্যবস্থাপনা"],
  "নৈতিকতা ও সুশাসন": ["নৈতিকতা", "সুশাসন"],
  "ব্যাংকিং ও ফিন্যান্স": ["ব্যাংকিং টার্মস", "বাংলাদেশ ব্যাংক", "ফিন্যান্স"],
};

// ---------- Detailed Topic Lists ----------
const SUBJECT_TOPICS: Record<string, Record<string, string[]>> = {
  "বাংলা": {
    "বাংলা ব্যাকরণ": [
      "ধ্বনি ও বর্ণ", "শব্দ (উৎসমূলক)", "পদ ও পদের শ্রেণিবিভাগ",
      "উপসর্গ", "অনুসর্গ", "সন্ধি", "সমাস", "প্রকৃতি ও প্রত্যয়",
      "বাক্য ও বাক্যের গুণ", "বাক্যের রূপান্তর",
      "বিপরীত শব্দ", "সমার্থক শব্দ", "বাগধারা", "বানান শুদ্ধি", "পারিভাষিক শব্দ",
    ],
    "বাংলা সাহিত্য": [
      "প্রাচীন যুগ (চর্যাপদ)", "মধ্যযুগ (শ্রীকৃষ্ণকীর্তন, মঙ্গলকাব্য)", "বৈষ্ণব পদাবলি",
      "ফোর্ট উইলিয়াম কলেজ", "ঈশ্বরচন্দ্র বিদ্যাসাগর", "বঙ্কিমচন্দ্র",
      "মাইকেল মধুসূদন দত্ত", "রবীন্দ্রনাথ ঠাকুর", "কাজী নজরুল ইসলাম",
      "মীর মশাররফ হোসেন", "শরৎচন্দ্র", "জসীমউদ্দীন", "মুনীর চৌধুরী",
      "ভাষা আন্দোলন ও মুক্তিযুদ্ধ সাহিত্য",
    ],
  },
  "ইংরেজী": {
    "English Grammar": [
      "Parts of Speech", "Noun", "Pronoun", "Adjective", "Verb", "Adverb",
      "Preposition", "Conjunction", "Sentences & Clauses", "Conditionals",
      "Subject-Verb Agreement", "Voice", "Narration", "Phrases & Idioms",
      "Synonyms & Antonyms", "Spelling", "Sentence Correction",
    ],
    "English Literature": [
      "Periods of Literature", "Shakespeare", "John Milton", "Wordsworth",
      "Coleridge", "Shelley", "Keats", "Tennyson", "Dickens", "G.B. Shaw",
      "T.S. Eliot", "W.B. Yeats", "Literary Terms",
    ],
  },
  "গণিত": {
    "পাটিগণিত": ["বাস্তব সংখ্যা", "লসাগু-গসাগু", "অনুপাত", "শতকরা", "লাভ-ক্ষতি", "সুদকষা", "ঐকিক নিয়ম", "সময়-কাজ", "গড়"],
    "বীজগণিত": ["সূত্রাবলি", "সমীকরণ", "অসমতা", "সূচক-লগারিদম", "ধারা", "সেট", "বিন্যাস-সমাবেশ", "সম্ভাব্যতা"],
    "জ্যামিতি ও পরিমিতি": ["রেখা-কোণ", "ত্রিভুজ", "চতুর্ভুজ", "বৃত্ত", "পরিমিতি"],
    "ত্রিকোণমিতি": ["অনুপাত", "উচ্চতা-দূরত্ব"],
  },
  "মানসিক দক্ষতা": {
    "ভাষাগত যৌক্তিক বিচার": ["রক্তসম্পর্ক", "দিক-দূরত্ব", "ঘড়ি-ক্যালেন্ডার"],
    "সংখ্যাগত ক্ষমতা": ["সিরিজ", "কোডিং-ডিকোডিং"],
    "স্থানিক ক্ষমতা": ["আয়না প্রতিবিম্ব", "পানি প্রতিফলন", "চিত্র গণনা"],
    "বিন্যাস": ["সিটিং অ্যারেঞ্জমেন্ট", "পাজল"],
    "ডাটা ইন্টারপ্রিটেশন": ["টেবিল", "পাই-চার্ট", "বার-গ্রাফ"],
  },
  "সাধারণ জ্ঞান (বাংলাদেশ)": {
    "প্রাচীন ইতিহাস": ["প্রাচীন জনপদ", "পাল-সেন", "সুলতানি-মোঘল"],
    "ব্রিটিশ ও পাকিস্তান": ["১৭৫৭-১৯৪৭", "ভাষা আন্দোলন", "ছয় দফা", "গণঅভ্যুত্থান"],
    "মুক্তিযুদ্ধ": ["৭ মার্চ", "মুজিবনগর সরকার", "সেক্টর", "বীরশ্রেষ্ঠ"],
    "ভূগোল": ["সীমানা", "নদ-নদী", "জলবায়ু", "সুন্দরবন"],
    "জাতীয় বিষয়": ["প্রতীক", "ইউনেস্কো", "মেগা প্রজেক্ট"],
    "সংবিধান": ["ইতিহাস", "অনুচ্ছেদ", "সংশোধনী"],
    "অর্থনীতি": ["জনসংখ্যা", "জিডিপি", "বাজেট", "কৃষি-শিল্প"],
  },
  "সাধারণ জ্ঞান (আন্তর্জাতিক)": {
    "বৈশ্বিক ইতিহাস": ["বিশ্বযুদ্ধ", "স্নায়ুযুদ্ধ", "চুক্তি"],
    "দেশ পরিচিতি": ["রাজধানী", "মুদ্রা", "সংসদ"],
    "আন্তর্জাতিক সংস্থা": ["জাতিসংঘ", "বিশ্বব্যাংক", "IMF", "WTO"],
    "আঞ্চলিক জোট": ["সার্ক", "আসিয়ান", "ওআইসি", "ইইউ", "ব্রিকস", "জি-২০"],
    "পরিবেশ": ["কোপ", "গ্রিনহাউস", "প্যারিস চুক্তি"],
    "পুরস্কার": ["নোবেল", "অস্কার", "অলিম্পিক", "বিশ্বকাপ"],
  },
  "সাধারণ বিজ্ঞান": {
    "ভৌত বিজ্ঞান": ["পদার্থ", "পরমাণু", "এসিড-ক্ষার", "আলো", "শব্দ", "বিদ্যুৎ", "চুম্বক"],
    "জীববিজ্ঞান": ["কোষ", "রক্ত", "পরিপাক", "রেচন", "রোগ", "ভিটামিন"],
    "আধুনিক বিজ্ঞান": ["মহাবিশ্ব", "সৌরজগৎ", "বায়ুমণ্ডল", "জোয়ার", "বায়োটেকনোলজি"],
  },
  "কম্পিউটার ও আইসিটি": {
    "হার্ডওয়্যার": ["ইনপুট", "আউটপুট", "সিপিইউ"],
    "মেমোরি": ["RAM", "ROM", "স্টোরেজ"],
    "সফটওয়্যার": ["OS", "MS Office"],
    "সংখ্যা পদ্ধতি": ["বাইনারি", "লজিক গেট"],
    "নেটওয়ার্কিং": ["LAN", "WAN", "IP", "DNS", "ক্লাউড"],
    "আধুনিক প্রযুক্তি": ["AI", "সাইবার", "ই-কমার্স", "ক্রিপ্টো"],
  },
  "ভূগোল ও পরিবেশ": {
    "বাংলাদেশ ভূগোল": ["অবস্থান", "ভূপ্রকৃতি"],
    "পরিবেশ": ["বাস্তুতন্ত্র", "জীববৈচিত্র্য", "ওজোন"],
    "দুর্যোগ ব্যবস্থাপনা": ["বন্যা", "ভূমিকম্প", "সুনামি", "SDG"],
  },
  "নৈতিকতা ও সুশাসন": {
    "নৈতিকতা": ["উৎস", "সুনাগরিক"],
    "সুশাসন": ["উপাদান", "ডিজিটাল গভর্নেন্স", "RTI"],
  },
  "ব্যাংকিং ও ফিন্যান্স": {
    "ব্যাংকিং টার্মস": ["চেক", "CRR", "SLR", "Repo", "NPA"],
    "বাংলাদেশ ব্যাংক": ["ইতিহাস", "মুদ্রানীতি"],
    "ফিন্যান্স": ["ডেবিট-ক্রেডিট", "জাবেদা", "ব্যালেন্স শিট"],
  },
};

// ---------- Safe localStorage ----------
function safeGet(key: string): any | null {
  if (typeof window === "undefined") return null;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
}

function getTopicOverview(topic: string): TopicOverview {
  const statsKey = `prepflow_stats_${topic}`;
  const bankKey = `prepflow_bank_${topic}`;
  const stats = safeGet(statsKey);
  const bank = safeGet(bankKey);
  const today = new Date().toISOString().slice(0, 10);
  let extQuestions = 0, extCorrect = 0, extToday = 0;
  try { const ext = JSON.parse(localStorage.getItem("prepflow_external") || "[]"); ext.forEach((s: any) => { if (s.topic === topic) { extQuestions += s.questions || 0; extCorrect += Math.round((s.questions || 0) * 0.7); if (s.date === today) extToday += s.questions || 0; } }); } catch {}
  if (!stats) return { topic, accuracy: 0, totalQuestions: extQuestions, masteredQuestions: 0, learningQuestions: 0, newQuestions: (bank?.questions?.length || 0) + extQuestions, todayCount: extToday, lastPracticed: null };
  const total = Object.keys(stats.perQuestion || {}).length + extQuestions;
  const mastered = Object.values(stats.perQuestion || {}).filter((q: any) => q.attempts >= 3 && (q.correct / q.attempts) >= 0.8).length;
  const learning = Object.values(stats.perQuestion || {}).filter((q: any) => q.attempts > 0 && (q.attempts < 3 || (q.correct / q.attempts) < 0.8)).length;
  const totalAttempted = stats.totalAttempted + extQuestions;
  const totalCorrect = stats.totalCorrect + extCorrect;
  const acc = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
  const todayCount = (stats.daily?.[today]?.attempted || 0) + extToday;
  const dates = Object.keys(stats.daily || {}).sort().reverse();
  return { topic, accuracy: acc, totalQuestions: total, masteredQuestions: mastered, learningQuestions: learning, newQuestions: Math.max(0, total - mastered - learning), todayCount, lastPracticed: dates.length > 0 ? dates[0] : null };
}

function getAllOverviews(): TopicOverview[] {
  if (typeof window === "undefined") return [];
  const arr: TopicOverview[] = [];
  Object.values(SUBJECTS).forEach(topics => topics.forEach(t => arr.push(getTopicOverview(t))));
  return arr;
}

function getSubTopicStats(subject: string, subTopic: string): { questions: number; accuracy: number } {
  let questions = 0, correct = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(`prepflow_stats_${subject}_${subTopic}`)) continue;
    const raw = safeGet(key);
    if (!raw) continue;
    try { Object.entries(raw.perQuestion || {}).forEach(([_, qs]: any) => { questions += qs.attempts || 0; correct += qs.correct || 0; }); } catch {}
  }
  const accuracy = questions > 0 ? Math.round((correct / questions) * 100) : 0;
  return { questions, accuracy };
}

export default function Home() {
  const [tab, setTab] = useState<"practice" | "progress">("practice");
  const [subject, setSubject] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [overviews, setOverviews] = useState<TopicOverview[]>([]);

  useEffect(() => { setOverviews(getAllOverviews()); }, [tab, subject]);

  const allOverview = getAllOverviews();
  const subjectOverviews = subject ? allOverview.filter(o => SUBJECTS[subject]?.includes(o.topic)) : [];

  const totalQ = allOverview.reduce((s, o) => s + o.totalQuestions, 0);
  const totalAttempted = allOverview.reduce((s, o) => s + (safeGet(`prepflow_stats_${o.topic}`)?.totalAttempted || 0), 0);
  const totalCorrect = allOverview.reduce((s, o) => s + (safeGet(`prepflow_stats_${o.topic}`)?.totalCorrect || 0), 0);
  const overallAcc = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
  const totalMastered = allOverview.reduce((s, o) => s + o.masteredQuestions, 0);
  const todayTotal = allOverview.reduce((s, o) => s + o.todayCount, 0);

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i); const ds = d.toISOString().slice(0, 10);
    let c = 0; allOverview.forEach(o => { const s = safeGet(`prepflow_stats_${o.topic}`); if (s?.daily?.[ds]) c += s.daily[ds].attempted; });
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
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === t ? "bg-amber-500 text-white shadow" : "bg-white text-amber-800 border border-amber-200"}`}>{t === "practice" ? "অনুশীলন" : "অগ্রগতি"}</button>
          ))}
        </div>
      </div>

      {tab === "practice" && (
        <div>
          {!subject && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.keys(SUBJECTS).map(s => {
                const so = allOverview.filter(o => SUBJECTS[s].includes(o.topic));
                const sa = so.length > 0 ? Math.round(so.reduce((a, o) => a + o.accuracy, 0) / so.length) : 0;
                const stotal = so.reduce((a, o) => a + o.totalQuestions, 0);
                const sm = so.reduce((a, o) => a + o.masteredQuestions, 0);
                return (
                  <button key={s} onClick={() => setSubject(s)} className="bg-white rounded-2xl shadow-sm border border-amber-200 p-4 hover:shadow-md transition text-center">
                    <span className="text-xl mb-1 block">{"🇧🇩🇬🇧🔢🧠🌏🌍🔬💻🌿⚖️💰".charAt(Object.keys(SUBJECTS).indexOf(s) % 11)}</span>
                    <span className="font-semibold text-amber-900 text-xs">{s}</span>
                    {stotal > 0 && <div className="mt-1"><div className="w-full h-1 bg-gray-200 rounded-full"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${sa}%` }} /></div><p className="text-xs text-gray-500 mt-0.5">{sa}% ({sm}/{stotal})</p></div>}
                  </button>
                );
              })}
            </div>
          )}

          {subject && !topic && (
            <div className="space-y-4">
              <button onClick={() => setSubject(null)} className="text-amber-700 text-sm underline">← বিষয় পরিবর্তন</button>
              <h2 className="text-xl font-bold text-amber-800">{subject}</h2>
              {(() => {
                const sa = subjectOverviews.length > 0 ? Math.round(subjectOverviews.reduce((a, o) => a + o.accuracy, 0) / subjectOverviews.length) : 0;
                const st = subjectOverviews.reduce((a, o) => a + o.totalQuestions, 0);
                const sm = subjectOverviews.reduce((a, o) => a + o.masteredQuestions, 0);
                return (
                  <div className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl p-4 text-white shadow">
                    <div className="flex justify-between mb-2"><span className="font-bold">{subject} অগ্রগতি</span><span>{sm}/{st} মাস্টার্ড</span></div>
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
                {SUBJECTS[subject].map(t => {
                  const o = allOverview.find(x => x.topic === t); const has = o && o.totalQuestions > 0;
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
              <div className="flex justify-between"><button onClick={() => { setSubject(null); setTopic(null); }} className="text-amber-700 text-sm underline">← বিষয় পরিবর্তন</button><span className="text-sm font-medium bg-amber-100 px-3 py-1 rounded-full">{topic}</span></div>
              <MCQGenerator topic={topic} />
            </div>
          )}
        </div>
      )}

      {tab === "progress" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-amber-800">সার্বিক অগ্রগতি</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 border border-amber-200 text-center"><p className="text-2xl font-bold text-amber-700">{totalQ}</p><p className="text-xs text-gray-500">মোট প্রশ্ন</p></div>
            <div className="bg-white rounded-xl p-4 border border-amber-200 text-center"><p className="text-2xl font-bold text-green-600">{totalMastered}</p><p className="text-xs text-gray-500">মাস্টার্ড</p></div>
            <div className="bg-white rounded-xl p-4 border border-amber-200 text-center"><p className="text-2xl font-bold text-amber-700">{overallAcc}%</p><p className="text-xs text-gray-500">নির্ভুলতা</p></div>
            <div className="bg-white rounded-xl p-4 border border-amber-200 text-center"><p className="text-2xl font-bold text-amber-700">{todayTotal}</p><p className="text-xs text-gray-500">আজ</p></div>
          </div>
          <ExternalTracker onSessionAdded={() => setOverviews(getAllOverviews())} />
          <div className="mt-6"><h3 className="text-lg font-bold text-amber-800 mb-3 text-center">🤖 AI সহায়ক</h3><div className="grid grid-cols-3 gap-3">{aiTools.map(tool => (<a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer" className={`bg-gradient-to-br ${tool.color} rounded-2xl p-4 text-center shadow-lg hover:scale-105 transition-transform`}><span className="text-2xl block mb-1">{tool.emoji}</span><h4 className="text-white font-bold text-sm">{tool.name}</h4></a>))}</div></div>
        </div>
      )}
    </main>
  );
}