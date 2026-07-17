"use client";

import { useState, useEffect } from "react";
import MCQGenerator from "@/components/MCQGenerator";

// ---------- Types ----------
interface SessionRecord {
  id: string;
  date: string;
  topic: string;
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
}

// ---------- Subjects & Sub-topics ----------
const SUBJECTS: Record<string, string[]> = {
  "বাংলা": ["বাংলা ব্যাকরণ", "বাংলা সাহিত্য"],
  "ইংরেজী": ["English Grammar", "English Literature"],
  "গণিত": ["পাটিগণিত", "বীজগণিত"],
  "সাধারণ জ্ঞান": ["বাংলাদেশ", "আন্তর্জাতিক"],
  "বিজ্ঞান": ["পদার্থবিজ্ঞান", "রসায়নবিজ্ঞান"],
  "আইসিটি": ["কম্পিউটার", "তথ্য প্রযুক্তি"],
};

// ---------- localStorage helpers ----------
const HISTORY_KEY = "prepflow_mcq_records";

function loadAllRecords(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecord(record: SessionRecord) {
  const records = loadAllRecords();
  records.push(record);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
}

// ---------- Main App ----------
export default function Home() {
  const [activeTab, setActiveTab] = useState<"practice" | "progress">("practice");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const [allRecords, setAllRecords] = useState<SessionRecord[]>([]);

  useEffect(() => {
    if (activeTab === "progress") {
      setAllRecords(loadAllRecords());
    }
  }, [activeTab]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const totalQuestions = allRecords.reduce((sum, r) => sum + r.total, 0);
  const totalCorrect = allRecords.reduce((sum, r) => sum + r.correct, 0);
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const topicAgg: Record<string, { total: number; correct: number }> = {};
  allRecords.forEach(r => {
    if (!topicAgg[r.topic]) topicAgg[r.topic] = { total: 0, correct: 0 };
    topicAgg[r.topic].total += r.total;
    topicAgg[r.topic].correct += r.correct;
  });
  const topicStats = Object.entries(topicAgg)
    .map(([topic, val]) => ({
      topic,
      total: val.total,
      correct: val.correct,
      accuracy: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = allRecords.filter(r => r.date.startsWith(dateStr)).length;
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, count };
  }).reverse();

  const resetToSubjects = () => {
    setSelectedSubject(null);
    setSelectedTopic(null);
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-800">PrepFlow</h1>
        <div className="flex gap-2">
          {(["practice", "progress"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-amber-500 text-white shadow"
                  : "bg-white text-amber-800 border border-amber-200"
              }`}
            >
              {tab === "practice" ? "অনুশীলন" : "অগ্রগতি"}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "practice" && (
        <div>
          {!selectedSubject && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.keys(SUBJECTS).map(subject => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6 hover:shadow-md transition text-center"
                >
                  <span className="text-2xl mb-2 block">
                    {subject === "বাংলা" ? "🇧🇩" :
                     subject === "ইংরেজী" ? "🇬🇧" :
                     subject === "গণিত" ? "🔢" :
                     subject === "সাধারণ জ্ঞান" ? "🌍" :
                     subject === "বিজ্ঞান" ? "🔬" : "💻"}
                  </span>
                  <span className="font-semibold text-amber-900">{subject}</span>
                </button>
              ))}
            </div>
          )}

          {selectedSubject && !selectedTopic && (
            <div className="space-y-4">
              <button onClick={() => setSelectedSubject(null)} className="text-amber-700 text-sm underline">
                ← বিষয় পরিবর্তন
              </button>
              <h2 className="text-xl font-bold text-amber-800">{selectedSubject}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUBJECTS[selectedSubject].map(topic => (
                  <button
                    key={topic}
                    onClick={() => setSelectedTopic(topic)}
                    className="bg-white rounded-xl border border-amber-200 p-4 hover:bg-amber-50 transition text-left"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedTopic && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button onClick={resetToSubjects} className="text-amber-700 text-sm underline">
                  ← বিষয় পরিবর্তন
                </button>
                <span className="text-sm font-medium text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                  {selectedTopic}
                </span>
              </div>

              {/* ✅ Gemini MCQ Generator */}
              <MCQGenerator topic={selectedTopic} />
            </div>
          )}
        </div>
      )}

      {activeTab === "progress" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-amber-800">আপনার অগ্রগতি</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center">
              <p className="text-3xl font-bold text-amber-700">{totalQuestions}</p>
              <p className="text-sm text-gray-500">মোট প্রশ্ন</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center">
              <p className="text-3xl font-bold text-green-600">{totalCorrect}</p>
              <p className="text-sm text-gray-500">সঠিক</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center">
              <p className="text-3xl font-bold text-amber-700">{overallAccuracy}%</p>
              <p className="text-sm text-gray-500">নির্ভুলতা</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5">
            <h3 className="font-bold text-lg text-amber-800 mb-3">টপিক ভিত্তিক পারফরম্যান্স</h3>
            {topicStats.length === 0 ? (
              <p className="text-gray-500 text-sm">এখনো কোনো ডেটা নেই।</p>
            ) : (
              <div className="space-y-3">
                {topicStats.map(ts => (
                  <div key={ts.topic} className="flex items-center gap-3">
                    <span className="w-28 text-sm truncate">{ts.topic}</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${ts.accuracy}%` }}
                      />
                    </div>
                    <span className="text-sm w-16 text-right">{ts.accuracy}% ({ts.total})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5">
            <h3 className="font-bold text-lg text-amber-800 mb-3">গত ৭ দিনের অনুশীলন</h3>
            <div className="flex items-end justify-between h-24">
              {last7Days.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-1">
                  <span className="text-xs text-gray-600">{d.count || ""}</span>
                  <div
                    className="w-6 bg-amber-400 rounded-t"
                    style={{ height: `${Math.max(4, d.count * 10)}px` }}
                  />
                  <span className="text-xs text-gray-400">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}