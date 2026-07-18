"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

// ---------- Types ----------
interface MCQ {
  id?: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  explanation: string;
  difficulty?: "easy" | "hard";
  subtopic?: string;
}

interface SavedFile {
  base64: string;
  mimeType: string;
  fileName: string;
}

interface QuestionBank {
  sourceText: string;
  questions: MCQ[];
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

interface Props { topic: string; }

// ---------- Constants ----------
const MAX_HISTORY = 200;

// ---------- localStorage helpers ----------
function safeGetItem(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function safeSetItem(key: string, value: string): boolean { try { localStorage.setItem(key, value); return true; } catch { return false; } }
function safeRemoveItem(key: string) { try { localStorage.removeItem(key); } catch {} }

function getBankKey(topic: string): string { return `prepflow_bank_${topic}`; }
function getStatsKey(topic: string): string { return `prepflow_stats_${topic}`; }
function getTopicFileKey(topic: string): string { return `prepflow_file_${topic}`; }
function getTopicSourceKey(topic: string): string { return `prepflow_source_${topic}`; }

function emptyStats(): TopicStats { return { totalAttempted: 0, totalCorrect: 0, perQuestion: {}, daily: {}, history: [] }; }

async function loadStats(topic: string): Promise<TopicStats> {
  try { const snap = await getDoc(doc(db, "stats", topic)); if (snap.exists()) return snap.data() as TopicStats; } catch {}
  const key = getStatsKey(topic); const raw = safeGetItem(key);
  if (!raw) return emptyStats();
  try { return JSON.parse(raw); } catch { return emptyStats(); }
}

async function saveStats(topic: string, stats: TopicStats) {
  try { await setDoc(doc(db, "stats", topic), stats); } catch {}
  safeSetItem(getStatsKey(topic), JSON.stringify(stats));
}

async function loadResults(): Promise<{ topic: string; date: string; correct: boolean }[]> {
  try { const snap = await getDoc(doc(db, "results", "all")); if (snap.exists()) return snap.data().items || []; } catch {}
  try { const raw = localStorage.getItem("prepflow_results"); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

async function saveResult(topic: string, correct: boolean) {
  const results = await loadResults();
  results.push({ topic, date: new Date().toISOString().slice(0, 10), correct });
  try { await setDoc(doc(db, "results", "all"), { items: results }); } catch {}
  safeSetItem("prepflow_results", JSON.stringify(results));
}

function getQuestionAccuracy(stats: TopicStats, qId: string): number { const q = stats.perQuestion[qId]; if (!q || q.attempts === 0) return 0; return (q.correct / q.attempts) * 100; }
function isMastered(stats: TopicStats, qId: string): boolean { return getQuestionAccuracy(stats, qId) >= 80 && (stats.perQuestion[qId]?.attempts || 0) >= 3; }

function computeMastery(stats: TopicStats): { level: string; score: number } {
  if (stats.totalAttempted === 0) return { level: "শুরু", score: 0 };
  if (Object.keys(stats.perQuestion).length < 15) return { level: "শুরু", score: 0 };
  const overall = (stats.totalCorrect / stats.totalAttempted) * 100;
  const recent = stats.history.slice(-20);
  const recentCorrect = recent.filter(h => h.correct).length;
  const recentAcc = recent.length > 0 ? (recentCorrect / recent.length) * 100 : overall;
  const score = Math.round(overall * 0.6 + recentAcc * 0.4);
  if (score >= 90) return { level: "মাস্টার লেভেল 🏆", score };
  if (score >= 75) return { level: "দক্ষ", score };
  if (score >= 55) return { level: "উন্নতিশীল", score };
  if (score >= 35) return { level: "অনুশীলন প্রয়োজন", score };
  return { level: "শুরু", score };
}

export default function MCQGenerator({ topic }: Props) {
  const [activeTab, setActiveTab] = useState<"practice" | "progress">("practice");
  const [textInput, setTextInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [stats, setStats] = useState<TopicStats>(emptyStats);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasBank, setHasBank] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<MCQ | null>(null);
  const [currentQId, setCurrentQId] = useState<string>("");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [allMastered, setAllMastered] = useState(false);
  const [savedFileName, setSavedFileName] = useState<string | null>(null);
  const [fileSizeWarning, setFileSizeWarning] = useState(false);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      // Firebase থেকে সোর্স লোড
      try {
        const snap = await getDoc(doc(db, "sources", topic));
        if (snap.exists()) {
          const data = snap.data();
          if (data.text) setTextInput(data.text);
          if (data.fileName) setSavedFileName(data.fileName);
        }
      } catch {}
      // localStorage fallback
      const raw = safeGetItem(getBankKey(topic));
      if (raw) { try { const bank: QuestionBank = JSON.parse(raw); setMcqs(bank.questions); setHasBank(true); } catch {} }
      const fileRaw = safeGetItem(getTopicFileKey(topic));
      if (fileRaw) { try { const parsed: SavedFile = JSON.parse(fileRaw); if (!savedFileName) setSavedFileName(parsed.fileName); } catch {} }
      const src = safeGetItem(getTopicSourceKey(topic));
      if (src) setTextInput(src);
      setStats(await loadStats(topic));
    })();
  }, [topic]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0] || null; setFile(f); if (f) setTextInput(""); };
  const clearFile = () => { setFile(null); if (fileRef.current) fileRef.current.value = ""; };
  const toBase64 = (f: File): Promise<string> => new Promise((resolve, reject) => { const r = new FileReader(); r.onloadend = () => { const result = r.result as string; resolve(result.split(",")[1]); }; r.onerror = reject; r.readAsDataURL(f); });

  const pickNextQuestion = useCallback((bank: MCQ[], currentStats: TopicStats, exclude: string[]): { question: MCQ; id: string } | null => {
    const active = bank.filter(q => { if (exclude.includes(q.id!)) return false; return !isMastered(currentStats, q.id!); });
    if (active.length === 0) return null;
    const weights = active.map(q => { const acc = getQuestionAccuracy(currentStats, q.id!); const att = currentStats.perQuestion[q.id!]?.attempts || 0; if (att === 0) return 3; if (acc < 50) return 4; if (acc < 80) return 2; return 1; });
    const totalW = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalW;
    for (let i = 0; i < active.length; i++) { r -= weights[i]; if (r <= 0) return { question: active[i], id: active[i].id! }; }
    return { question: active[active.length - 1], id: active[active.length - 1].id! };
  }, []);

  const generateMCQs = async () => {
    if (!textInput.trim() && !file && !savedFileName) { setErrorMsg("দয়া করে টেক্সট দিন অথবা একটি ফাইল সিলেক্ট করুন।"); return; }
    setLoading(true); setErrorMsg(""); setAllMastered(false); setExcludeIds([]); setScore(0); setSessionCount(0);
    try {
      let fb = "", fm = "", fn = "", es = textInput.trim();
      if (file) { fb = await toBase64(file); fm = file.type; fn = file.name; es = es || fn; }
      else if (savedFileName) { const saved = safeGetItem(getTopicFileKey(topic)); if (saved) { const p: SavedFile = JSON.parse(saved); fb = p.base64; fm = p.mimeType; fn = p.fileName; es = es || fn; } }
      const res = await fetch("/api/generate-mcq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic, textInput: es, fileBase64: fb, fileMimeType: fm, count: 20 }) });
      const ct = res.headers.get("content-type");
      if (!ct || !ct.includes("application/json")) throw new Error("সার্ভারে একটি সমস্যা হয়েছে।");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "API failed");
      if (!Array.isArray(data.mcqs) || data.mcqs.length === 0) throw new Error("কোনো MCQ তৈরি হয়নি।");
      const questions: MCQ[] = data.mcqs.map((q: MCQ, i: number) => ({ ...q, id: q.id || `q-${i}-${Date.now()}` }));
      const bank: QuestionBank = { sourceText: es, questions, createdAt: new Date().toISOString() };
      safeSetItem(getBankKey(topic), JSON.stringify(bank));
      safeSetItem(getTopicSourceKey(topic), es);
      if (fb) { const s: SavedFile = { base64: fb, mimeType: fm, fileName: fn }; safeSetItem(getTopicFileKey(topic), JSON.stringify(s)); setSavedFileName(fn); }
      // Firebase-এ সোর্স সেভ
      try { await setDoc(doc(db, "sources", topic), { text: es, fileName: fn || null, updatedAt: new Date().toISOString() }); } catch {}
      const freshStats = emptyStats();
      await saveStats(topic, freshStats);
      setStats(freshStats); setMcqs(questions); setHasBank(true);
      const picked = pickNextQuestion(questions, freshStats, []);
      if (picked) { setCurrentQuestion(picked.question); setCurrentQId(picked.id); setSelectedAnswer(null); setIsAnswered(false); }
    } catch (err: any) { setErrorMsg(err.message || "MCQ তৈরিতে ত্রুটি।"); }
    finally { setLoading(false); }
  };

  const startPractice = async () => { const s = await loadStats(topic); setStats(s); setScore(0); setSessionCount(0); setExcludeIds([]); setAllMastered(false); const p = pickNextQuestion(mcqs, s, []); if (p) { setCurrentQuestion(p.question); setCurrentQId(p.id); setSelectedAnswer(null); setIsAnswered(false); } };
  const handleOptionSelect = (key: string) => { if (isAnswered) return; setSelectedAnswer(key); };
  const handleAnswer = async () => {
    if (!selectedAnswer || !currentQuestion) return;
    const correct = selectedAnswer === currentQuestion.correctAnswer;
    setIsAnswered(true); setSessionCount(p => p + 1); if (correct) setScore(p => p + 1);
    const today = new Date().toISOString().slice(0, 10);
    const updated: TopicStats = { ...stats, totalAttempted: stats.totalAttempted + 1, totalCorrect: stats.totalCorrect + (correct ? 1 : 0), perQuestion: { ...stats.perQuestion }, daily: { ...stats.daily }, history: [...stats.history, { date: today, correct }] };
    if (!updated.perQuestion[currentQId]) updated.perQuestion[currentQId] = { attempts: 0, correct: 0 };
    updated.perQuestion[currentQId] = { attempts: updated.perQuestion[currentQId].attempts + 1, correct: updated.perQuestion[currentQId].correct + (correct ? 1 : 0) };
    if (!updated.daily[today]) updated.daily[today] = { attempted: 0, correct: 0 };
    updated.daily[today] = { attempted: updated.daily[today].attempted + 1, correct: updated.daily[today].correct + (correct ? 1 : 0) };
    if (updated.history.length > MAX_HISTORY) updated.history = updated.history.slice(-MAX_HISTORY);
    setStats(updated); await saveStats(topic, updated); await saveResult(topic, correct);
  };
  const handleNext = () => { const newEx = [...excludeIds, currentQId]; setExcludeIds(newEx); const p = pickNextQuestion(mcqs, stats, newEx); if (!p) { setAllMastered(true); return; } setCurrentQuestion(p.question); setCurrentQId(p.id); setSelectedAnswer(null); setIsAnswered(false); };
  const handleReset = () => { safeRemoveItem(getBankKey(topic)); safeRemoveItem(getStatsKey(topic)); safeRemoveItem(getTopicSourceKey(topic)); safeRemoveItem(getTopicFileKey(topic)); setMcqs([]); setHasBank(false); setCurrentQuestion(null); setScore(0); setSessionCount(0); setAllMastered(false); setTextInput(""); setFile(null); setSavedFileName(null); setStats(emptyStats()); };

  const mastery = computeMastery(stats);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayStats = stats.daily[todayStr] || { attempted: 0, correct: 0 };
  const overallAccuracy = stats.totalAttempted > 0 ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 0;
  const last7Days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); const ds = d.toISOString().slice(0, 10); return { label: `${d.getDate()}/${d.getMonth() + 1}`, count: stats.daily[ds]?.attempted || 0 }; }).reverse();
  const maxDayCount = Math.max(1, ...last7Days.map(d => d.count));
  const weakQuestions = Object.entries(stats.perQuestion).map(([id, ps]) => ({ id, accuracy: ps.attempts > 0 ? (ps.correct / ps.attempts) * 100 : 0, attempts: ps.attempts })).filter(q => q.attempts > 0).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(["practice", "progress"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 rounded-xl text-sm font-semibold ${activeTab === tab ? "bg-amber-500 text-white shadow" : "bg-white text-amber-800 border border-amber-200"}`}>{tab === "practice" ? "অনুশীলন" : "অগ্রগতি"}</button>
        ))}
      </div>
      {activeTab === "practice" && (<>
        {!hasBank && !loading && (<div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm"><h2 className="text-lg font-bold text-amber-800 mb-3">{topic} – MCQ তৈরি করুন</h2><textarea className="w-full h-32 rounded-xl border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-amber-400 resize-none" placeholder="এখানে আপনার নোট / টেক্সট পেস্ট করুন..." value={textInput} onChange={e => { setTextInput(e.target.value); if (e.target.value) clearFile(); }} disabled={loading} /><div className="mt-3 flex flex-wrap items-center gap-3"><label className="cursor-pointer bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-800">📎 PDF/ইমেজ<input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileChange} disabled={loading} /></label>{file && <div className="flex items-center gap-2 text-sm text-gray-600"><span className="truncate max-w-[200px]">{file.name}</span><button onClick={clearFile} className="text-red-500" disabled={loading}>✕</button></div>}{savedFileName && !file && <div className="flex items-center gap-2 text-sm text-gray-600"><span className="truncate max-w-[200px]">📄 {savedFileName}</span></div>}</div><button onClick={generateMCQs} disabled={loading || (!textInput.trim() && !file && !savedFileName)} className="mt-4 w-full bg-amber-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50">{loading ? "তৈরি হচ্ছে..." : "MCQ তৈরি করুন (২০টি)"}</button>{errorMsg && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg p-3">{errorMsg}</p>}</div>)}
        {loading && <div className="text-center text-amber-700 mt-10"><div className="animate-spin inline-block w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full mb-2" /><p>Gemini AI প্রশ্ন তৈরি করছে...</p></div>}
        {hasBank && !currentQuestion && !allMastered && (<div className="bg-white rounded-2xl border border-amber-200 p-8 text-center"><p className="text-gray-700 mb-4">আপনার আগের MCQ ব্যাংক পাওয়া গেছে।</p><div className="flex gap-3 justify-center"><button onClick={startPractice} className="bg-amber-500 text-white px-6 py-3 rounded-xl font-semibold">অনুশীলন শুরু</button><button onClick={handleReset} className="bg-gray-200 px-6 py-3 rounded-xl">নতুন সোর্স</button></div></div>)}
        {allMastered && (<div className="bg-white rounded-2xl border border-green-300 p-8 text-center"><div className="text-4xl mb-3">🎉</div><h2 className="text-xl font-bold text-green-700">সব প্রশ্ন আয়ত্ত!</h2><button onClick={handleReset} className="mt-4 bg-amber-500 text-white px-6 py-2 rounded-xl">নতুন সোর্স</button></div>)}
        {currentQuestion && !allMastered && (<div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5"><div className="flex justify-between mb-3"><span className="text-xs bg-amber-100 px-2 py-0.5 rounded-full">{topic}</span><span className="text-xs text-gray-500">আজ: {todayStats.attempted} | সেশন: {sessionCount}</span></div><p className="font-semibold mb-4">{currentQuestion.question}</p><div className="space-y-2">{Object.entries(currentQuestion.options).map(([k, v]) => { const correct = k === currentQuestion.correctAnswer; const sel = k === selectedAnswer; let cls = "border-gray-200 bg-white"; if (isAnswered) { if (correct) cls = "border-green-500 bg-green-50"; else if (sel) cls = "border-red-500 bg-red-50"; else cls = "opacity-60"; } else if (sel) cls = "border-amber-500 bg-amber-50"; return (<button key={k} disabled={isAnswered} onClick={() => handleOptionSelect(k)} className={`w-full text-left p-3 rounded-xl border transition ${cls}`}>{k}. {v}</button>); })}</div><div className="mt-4">{!isAnswered ? (<button onClick={handleAnswer} disabled={!selectedAnswer} className="w-full bg-amber-500 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50">উত্তর দেখুন</button>) : (<div className="space-y-3"><div className={`p-3 rounded-xl ${selectedAnswer === currentQuestion.correctAnswer ? "bg-green-50 border border-green-300" : "bg-red-50 border border-red-300"}`}><p className="font-bold">{selectedAnswer === currentQuestion.correctAnswer ? "✓ সঠিক!" : "✗ ভুল"}</p>{selectedAnswer !== currentQuestion.correctAnswer && <p className="text-sm">সঠিক: {currentQuestion.correctAnswer}</p>}<p className="text-sm mt-1">{currentQuestion.explanation}</p></div><button onClick={handleNext} className="w-full bg-amber-500 text-white py-2.5 rounded-xl font-semibold">পরবর্তী →</button></div>)}</div><button onClick={handleReset} className="mt-3 text-xs text-gray-500 underline">নতুন সোর্স</button></div>)}
      </>)}
      {activeTab === "progress" && (<div className="space-y-6"><div className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl p-6 text-white"><h2 className="text-lg font-bold mb-2">মাস্টারি স্তর</h2><p className="text-3xl font-extrabold mb-2">{mastery.level}</p><div className="w-full h-3 bg-white/20 rounded-full"><div className="h-full bg-white rounded-full" style={{ width: `${mastery.score}%` }} /></div></div><div className="grid grid-cols-3 gap-3"><div className="bg-white rounded-xl p-4 border border-amber-200 text-center"><p className="text-2xl font-bold text-amber-700">{stats.totalAttempted}</p><p className="text-xs text-gray-500">মোট প্রশ্ন</p></div><div className="bg-white rounded-xl p-4 border border-amber-200 text-center"><p className="text-2xl font-bold text-green-600">{overallAccuracy}%</p><p className="text-xs text-gray-500">নির্ভুলতা</p></div><div className="bg-white rounded-xl p-4 border border-amber-200 text-center"><p className="text-2xl font-bold text-amber-700">{todayStats.attempted}</p><p className="text-xs text-gray-500">আজ</p></div></div><div className="bg-white rounded-2xl border border-amber-200 p-5"><h3 className="font-bold text-lg text-amber-800 mb-3">গত ৭ দিন</h3><div className="flex items-end justify-between h-24">{last7Days.map((d, i) => (<div key={i} className="flex flex-col items-center flex-1 gap-1"><span className="text-xs">{d.count || ""}</span><div className="w-6 bg-amber-400 rounded-t" style={{ height: `${Math.max(4, (d.count / maxDayCount) * 60)}px` }} /><span className="text-xs text-gray-400">{d.label}</span></div>))}</div></div>{weakQuestions.length > 0 && (<div className="bg-white rounded-2xl border border-amber-200 p-5"><h3 className="font-bold text-lg text-amber-800 mb-3">দুর্বল প্রশ্ন</h3><div className="space-y-2">{weakQuestions.map(wq => { const q = mcqs.find(m => m.id === wq.id); return (<div key={wq.id} className="flex items-center gap-3"><div className="flex-1 text-sm truncate">{q?.question || "—"}</div><div className="w-20 h-2 bg-gray-200 rounded-full"><div className={`h-full rounded-full ${wq.accuracy < 40 ? "bg-red-500" : wq.accuracy < 70 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${wq.accuracy}%` }} /></div><span className="text-xs w-12 text-right">{Math.round(wq.accuracy)}%</span></div>); })}</div></div>)}</div>)}
    </div>
  );
}