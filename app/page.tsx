"use client";

import { useState, useEffect, useCallback } from "react";

// ---------- Types ----------
interface MCQ {
  id: string;
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

interface Source {
  sourceId: string;
  label: string;
  createdAt: string;
}

interface PerQuestionStats {
  attempts: number;
  correct: number;
}

interface DailyStats {
  attempted: number;
  correct: number;
}

interface TopicStats {
  totalAttempted: number;
  totalCorrect: number;
  perQuestion: Record<string, PerQuestionStats>;
  daily: Record<string, DailyStats>;
  history: { date: string; correct: boolean }[];
}

interface Props {
  topic: string;
}

// ---------- Constants ----------
const MAX_HISTORY = 200;

// ---------- localStorage helpers ----------
function safeGetItem(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSetItem(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}
function safeRemoveItem(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

function getSourcesKey(topic: string): string { return `prepflow_sources_${topic}`; }
function getBankKey(topic: string, sourceId: string): string { return `prepflow_bank_${topic}_${sourceId}`; }
function getStatsKey(topic: string, sourceId: string): string { return `prepflow_stats_${topic}_${sourceId}`; }

function emptyStats(): TopicStats {
  return { totalAttempted: 0, totalCorrect: 0, perQuestion: {}, daily: {}, history: [] };
}

function loadStats(topic: string, sourceId: string): TopicStats {
  const key = getStatsKey(topic, sourceId);
  const raw = safeGetItem(key);
  if (!raw) return emptyStats();
  try { return JSON.parse(raw); } catch { return emptyStats(); }
}

function saveStats(topic: string, sourceId: string, stats: TopicStats) {
  const key = getStatsKey(topic, sourceId);
  safeSetItem(key, JSON.stringify(stats));
}

function loadSources(topic: string): Source[] {
  const key = getSourcesKey(topic);
  const raw = safeGetItem(key);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function saveSources(topic: string, sources: Source[]) {
  const key = getSourcesKey(topic);
  safeSetItem(key, JSON.stringify(sources));
}

function loadBank(topic: string, sourceId: string): MCQ[] {
  const key = getBankKey(topic, sourceId);
  const raw = safeGetItem(key);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function saveBank(topic: string, sourceId: string, questions: MCQ[]) {
  const key = getBankKey(topic, sourceId);
  safeSetItem(key, JSON.stringify(questions));
}

// ---------- Mastery helpers ----------
function getQuestionAccuracy(stats: TopicStats, qId: string): number {
  const q = stats.perQuestion[qId];
  if (!q || q.attempts === 0) return 0;
  return (q.correct / q.attempts) * 100;
}

function isMastered(stats: TopicStats, qId: string): boolean {
  const accuracy = getQuestionAccuracy(stats, qId);
  const attempts = stats.perQuestion[qId]?.attempts || 0;
  return accuracy >= 80 && attempts >= 3;
}

function computeMastery(stats: TopicStats): { level: string; score: number } {
  if (stats.totalAttempted === 0) return { level: "শুরু", score: 0 };
  const totalQuestions = Object.keys(stats.perQuestion).length;
  if (totalQuestions < 10) return { level: "শুরু", score: 0 };
  const overallAccuracy = (stats.totalCorrect / stats.totalAttempted) * 100;
  const recentHistory = stats.history.slice(-20);
  const recentCorrect = recentHistory.filter(h => h.correct).length;
  const recentAccuracy = recentHistory.length > 0 ? (recentCorrect / recentHistory.length) * 100 : overallAccuracy;
  const score = Math.round(overallAccuracy * 0.6 + recentAccuracy * 0.4);
  if (score >= 90) return { level: "মাস্টার লেভেল 🏆", score };
  if (score >= 75) return { level: "দক্ষ", score };
  if (score >= 55) return { level: "উন্নতিশীল", score };
  if (score >= 35) return { level: "অনুশীলন প্রয়োজন", score };
  return { level: "শুরু", score };
}

// ---------- Main Component ----------
export default function SubjectPractice({ topic }: Props) {
  const [activeTab, setActiveTab] = useState<"practice" | "progress">("practice");
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [showNewSource, setShowNewSource] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loadingGen, setLoadingGen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [stats, setStats] = useState<TopicStats>(emptyStats());
  const [currentQ, setCurrentQ] = useState<MCQ | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [allMastered, setAllMastered] = useState(false);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);

  useEffect(() => { setSources(loadSources(topic)); }, [topic]);

  useEffect(() => {
    if (selectedSourceId) {
      const bank = loadBank(topic, selectedSourceId);
      setMcqs(bank); setStats(loadStats(topic, selectedSourceId));
      setCurrentQ(null); setSelectedOption(null); setIsRevealed(false);
      setAllMastered(false); setExcludeIds([]); setSessionCount(0);
    }
  }, [selectedSourceId, topic]);

  const toBase64 = (f: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => { const r = reader.result as string; resolve(r.split(",")[1]); };
      reader.onerror = reject; reader.readAsDataURL(f);
    });

  const handleGenerate = async () => {
    if (!textInput.trim() && !file) { setErrorMsg("টেক্সট বা ফাইল দিন"); return; }
    setLoadingGen(true); setErrorMsg("");
    try {
      let fb64 = "", fmime = "", fname = "";
      if (file) { fb64 = await toBase64(file); fmime = file.type; fname = file.name; }
      const res = await fetch("/api/generate-mcq", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, textInput: textInput.trim(), fileBase64: fb64, fileMimeType: fmime, count: 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (!Array.isArray(data.mcqs) || data.mcqs.length === 0) throw new Error("কোনো MCQ তৈরি হয়নি");

      const questions: MCQ[] = data.mcqs.map((q: any, i: number) => ({
        id: `q-${Date.now()}-${i}`, q: q.question,
        options: [q.options.A, q.options.B, q.options.C, q.options.D],
        answer: ["A","B","C","D"].indexOf(q.correctAnswer), explain: q.explanation || "",
      }));

      const sourceId = `src-${Date.now()}`;
      const newSource: Source = { sourceId, label: file ? fname : `সোর্স ${sources.length + 1}`, createdAt: new Date().toISOString() };
      const updatedSources = [...sources, newSource];
      saveSources(topic, updatedSources); setSources(updatedSources);
      saveBank(topic, sourceId, questions); saveStats(topic, sourceId, emptyStats());
      setSelectedSourceId(sourceId); setShowNewSource(false); setTextInput(""); setFile(null);
    } catch (err: any) { setErrorMsg(err.message || "ত্রুটি"); }
    finally { setLoadingGen(false); }
  };

  const pickNext = useCallback((bank: MCQ[], currentStats: TopicStats, exclude: string[]): MCQ | null => {
    const active = bank.filter(q => { if (exclude.includes(q.id)) return false; return !isMastered(currentStats, q.id); });
    if (active.length === 0) return null;
    const weights = active.map(q => {
      const acc = getQuestionAccuracy(currentStats, q.id);
      const att = currentStats.perQuestion[q.id]?.attempts || 0;
      if (att === 0) return 3; if (acc < 50) return 4; if (acc < 80) return 2; return 1;
    });
    const totalW = weights.reduce((a,b)=>a+b,0);
    let r = Math.random() * totalW;
    for (let i = 0; i < active.length; i++) { r -= weights[i]; if (r <= 0) return active[i]; }
    return active[active.length-1];
  }, []);

  const startQuiz = () => {
    if (!selectedSourceId || mcqs.length === 0) return;
    setExcludeIds([]); setAllMastered(false); setSessionCount(0);
    const picked = pickNext(mcqs, stats, []);
    if (picked) { setCurrentQ(picked); setSelectedOption(null); setIsRevealed(false); }
    else setAllMastered(true);
  };

  const handleOptionSelect = (idx: number) => { if (isRevealed) return; setSelectedOption(idx); };

  const handleAnswer = () => {
    if (selectedOption === null || !currentQ) return;
    const correct = selectedOption === currentQ.answer;
    setIsRevealed(true); setSessionCount(prev => prev + 1);
    const today = new Date().toISOString().slice(0,10);
    const updated: TopicStats = {
      ...stats, totalAttempted: stats.totalAttempted + 1, totalCorrect: stats.totalCorrect + (correct?1:0),
      perQuestion: { ...stats.perQuestion }, daily: { ...stats.daily }, history: [...stats.history, { date: today, correct }],
    };
    if (!updated.perQuestion[currentQ.id]) updated.perQuestion[currentQ.id] = { attempts: 0, correct: 0 };
    updated.perQuestion[currentQ.id] = { attempts: updated.perQuestion[currentQ.id].attempts + 1, correct: updated.perQuestion[currentQ.id].correct + (correct?1:0) };
    if (!updated.daily[today]) updated.daily[today] = { attempted: 0, correct: 0 };
    updated.daily[today] = { attempted: updated.daily[today].attempted + 1, correct: updated.daily[today].correct + (correct?1:0) };
    if (updated.history.length > MAX_HISTORY) updated.history = updated.history.slice(-MAX_HISTORY);
    setStats(updated); saveStats(topic, selectedSourceId!, updated);
  };

  const handleNext = () => {
    const newExclude = currentQ ? [...excludeIds, currentQ.id] : excludeIds;
    setExcludeIds(newExclude);
    const picked = pickNext(mcqs, stats, newExclude);
    if (!picked) { setAllMastered(true); return; }
    setCurrentQ(picked); setSelectedOption(null); setIsRevealed(false);
  };

  const resetSource = () => { setSelectedSourceId(null); setMcqs([]); setCurrentQ(null); };

  const mastery = computeMastery(stats);
  const todayStr = new Date().toISOString().slice(0,10);
  const todayStats = stats.daily[todayStr] || { attempted:0, correct:0 };
  const overallAccuracy = stats.totalAttempted > 0 ? Math.round((stats.totalCorrect/stats.totalAttempted)*100) : 0;

  const last7Days = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate()-i); const ds = d.toISOString().slice(0,10);
    return { label: `${d.getDate()}/${d.getMonth()+1}`, count: stats.daily[ds]?.attempted || 0 };
  }).reverse();
  const maxDay = Math.max(1, ...last7Days.map(d=>d.count));

  const allTopicStats = (() => {
    const map: Record<string, { attempted: number; correct: number }> = {};
    for (let i=0; i<localStorage.length; i++) {
      const k = localStorage.key(i); if (!k || !k.startsWith("prepflow_stats_")) continue;
      const parts = k.split("_"); const t = parts[2]; const raw = safeGetItem(k);
      if (!raw) continue;
      try { const s: TopicStats = JSON.parse(raw); if (!map[t]) map[t] = { attempted:0, correct:0 }; map[t].attempted += s.totalAttempted; map[t].correct += s.totalCorrect; } catch {}
    }
    return Object.entries(map).map(([t,v]) => ({ topic: t, accuracy: v.attempted>0?Math.round((v.correct/v.attempted)*100):0, total: v.attempted }));
  })();

  const aiTools = [
    { name: "ChatGPT", url: "https://chat.openai.com", color: "from-green-600 to-emerald-700", emoji: "🤖" },
    { name: "Claude", url: "https://claude.ai", color: "from-[#1a1a2e] to-[#0f3460]", emoji: "🧠" },
    { name: "DeepSeek", url: "https://chat.deepseek.com", color: "from-blue-600 to-indigo-700", emoji: "🔍" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(["practice","progress"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${activeTab===tab ? "bg-amber-500 text-white shadow" : "bg-white text-amber-800 border border-amber-200"}`}>
            {tab==="practice"?"অনুশীলন":"অগ্রগতি"}
          </button>
        ))}
      </div>

      {activeTab === "practice" && (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {sources.map(src => (
              <button key={src.sourceId} onClick={() => setSelectedSourceId(src.sourceId)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${selectedSourceId===src.sourceId ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-800"}`}>{src.label}</button>
            ))}
            <button onClick={() => { setShowNewSource(true); setSelectedSourceId(null); }} className="px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-300">+ নতুন সোর্স</button>
            {selectedSourceId && <button onClick={resetSource} className="text-xs text-red-500 underline">বন্ধ</button>}
          </div>

          {showNewSource && (
            <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm space-y-3 mb-4">
              <h3 className="font-bold text-amber-800">নতুন সোর্স যোগ করুন</h3>
              <textarea className="w-full h-28 rounded-xl border p-3 text-sm" placeholder="নোট পেস্ট করুন..." value={textInput} onChange={e => setTextInput(e.target.value)} />
              <div><input type="file" accept="application/pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="text-sm" /></div>
              {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
              <div className="flex gap-2">
                <button onClick={handleGenerate} disabled={loadingGen} className="bg-amber-500 text-white px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50">{loadingGen?"তৈরি হচ্ছে...":"MCQ তৈরি করুন"}</button>
                <button onClick={() => { setShowNewSource(false); setErrorMsg(""); }} className="bg-gray-200 px-5 py-2 rounded-xl text-sm">বাদ দিন</button>
              </div>
            </div>
          )}

          {selectedSourceId && mcqs.length > 0 && !allMastered && (
            currentQ ? (
              <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
                <div className="flex justify-between mb-3"><span className="text-xs bg-amber-100 px-2 py-0.5 rounded-full">{topic}</span><span className="text-xs text-gray-500">সেশন: {sessionCount}</span></div>
                <p className="font-semibold mb-4">{currentQ.q}</p>
                <div className="space-y-2">
                  {currentQ.options.map((opt, idx) => {
                    const correct = idx === currentQ.answer; const sel = idx === selectedOption;
                    let cls = "border-gray-200 bg-white";
                    if (isRevealed) { if (correct) cls = "border-green-500 bg-green-50"; else if (sel) cls = "border-red-500 bg-red-50"; else cls = "opacity-60"; }
                    else if (sel) cls = "border-amber-500 bg-amber-50";
                    return (
                      <button key={idx} disabled={isRevealed} onClick={() => handleOptionSelect(idx)} className={`w-full text-left p-3 rounded-xl border transition ${cls} ${!isRevealed?"hover:bg-amber-50":""}`}>
                        {String.fromCharCode(2453+idx)}. {opt}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4">
                  {!isRevealed ? (
                    <button onClick={handleAnswer} disabled={selectedOption===null} className="w-full bg-amber-500 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50">উত্তর দেখুন</button>
                  ) : (
                    <div className="space-y-3">
                      <div className={`p-3 rounded-xl ${selectedOption===currentQ.answer?"bg-green-50 border border-green-300":"bg-red-50 border border-red-300"}`}>
                        <p className="font-bold">{selectedOption===currentQ.answer?"✓ সঠিক!":"✗ ভুল"}</p>
                        {selectedOption!==currentQ.answer && <p className="text-sm">সঠিক: {String.fromCharCode(2453+currentQ.answer)}</p>}
                        <p className="text-sm mt-1">{currentQ.explain}</p>
                      </div>
                      <button onClick={handleNext} className="w-full bg-amber-500 text-white py-2.5 rounded-xl font-semibold">পরবর্তী প্রশ্ন →</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center">
                <button onClick={startQuiz} className="bg-amber-500 text-white px-6 py-3 rounded-xl font-semibold">অনুশীলন শুরু করুন</button>
              </div>
            )
          )}

          {allMastered && (
            <div className="bg-white rounded-2xl border border-green-300 p-8 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-bold text-green-700">এই সোর্সের সব প্রশ্ন আয়ত্ত হয়ে গেছে!</h2>
              <p className="text-gray-500 mt-2">নতুন সোর্স যোগ করুন অথবা রিভিশন মোডে যান</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "progress" && (
        <div className="space-y-6">
          <div className="bg-[#2c2620] rounded-2xl p-6 text-white shadow-lg">
            <h2 className="text-lg font-bold mb-2">মাস্টারি স্তর</h2>
            <p className="text-3xl font-extrabold mb-2">{mastery.level}</p>
            <div className="w-full h-3 bg-white/20 rounded-full"><div className="h-full bg-[#d1a84c] rounded-full transition-all" style={{width:`${mastery.score}%`}} /></div>
            <p className="text-sm mt-2 opacity-80">{mastery.score}% কমপ্লিট</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 border border-amber-200 text-center"><p className="text-2xl font-bold text-amber-700">{stats.totalAttempted}</p><p className="text-xs text-gray-500">মোট প্রশ্ন</p></div>
            <div className="bg-white rounded-xl p-4 border border-amber-200 text-center"><p className="text-2xl font-bold text-green-600">{overallAccuracy}%</p><p className="text-xs text-gray-500">নির্ভুলতা</p></div>
            <div className="bg-white rounded-xl p-4 border border-amber-200 text-center"><p className="text-2xl font-bold text-amber-700">{todayStats.attempted}</p><p className="text-xs text-gray-500">আজকের প্রশ্ন</p></div>
          </div>
          <div className="bg-white rounded-2xl border border-amber-200 p-5">
            <h3 className="font-bold text-lg text-amber-800 mb-3">গত ৭ দিনের অনুশীলন</h3>
            <div className="flex items-end justify-between h-24">
              {last7Days.map((d,i) => (<div key={i} className="flex flex-col items-center flex-1 gap-1"><span className="text-xs text-gray-600">{d.count||""}</span><div className="w-6 bg-amber-400 rounded-t" style={{height:`${Math.max(4,(d.count/maxDay)*60)}px`}} /><span className="text-xs text-gray-400">{d.label}</span></div>))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-amber-200 p-5">
            <h3 className="font-bold text-lg text-amber-800 mb-3">টপিক অনুযায়ী পারফরম্যান্স</h3>
            {allTopicStats.length===0 ? <p className="text-sm text-gray-500">এখনো কোনো ডেটা নেই।</p> : (
              <div className="space-y-3">
                {allTopicStats.map(t => (<div key={t.topic} className="flex items-center gap-3"><span className="w-24 text-sm truncate">{t.topic}</span><div className="flex-1 h-2 bg-gray-200 rounded-full"><div className="h-full bg-amber-500 rounded-full" style={{width:`${t.accuracy}%`}} /></div><span className="text-sm w-16 text-right">{t.accuracy}% ({t.total})</span></div>))}
              </div>
            )}
          </div>

          {/* AI Tools Section */}
          <div className="mt-6">
            <h3 className="text-lg font-bold text-amber-800 mb-3 text-center">🤖 AI সহায়ক টুলস</h3>
            <div className="grid grid-cols-3 gap-3">
              {aiTools.map(tool => (
                <a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer" className={`bg-gradient-to-br ${tool.color} rounded-2xl p-4 text-center shadow-lg hover:scale-105 transition-transform`}>
                  <span className="text-2xl block mb-1">{tool.emoji}</span>
                  <h4 className="text-white font-bold text-sm">{tool.name}</h4>
                  <p className="text-white/60 text-xs mt-1">খুলুন →</p>
                </a>
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">সবগুলোই ফ্রি • কোনো API key লাগবে না</p>
          </div>
        </div>
      )}
    </div>
  );
}