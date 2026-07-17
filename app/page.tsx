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

// ---------- Subjects & Sub-topics ----------
const SUBJECTS: Record<string, string[]> = {
  "বাংলা": ["বাংলা ব্যাকরণ", "বাংলা সাহিত্য"],
  "ইংরেজী": ["English Grammar", "English Literature"],
  "গণিত": ["পাটিগণিত", "বীজগণিত", "জ্যামিতি", "ত্রিকোণমিতি", "পরিসংখ্যান"],
  "সাধারণ জ্ঞান": ["বাংলাদেশ", "আন্তর্জাতিক", "সংবিধান", "ভূগোল", "ইতিহাস", "অর্থনীতি"],
  "বিজ্ঞান": ["পদার্থবিজ্ঞান", "রসায়নবিজ্ঞান", "জীববিজ্ঞান", "পরিবেশ"],
  "আইসিটি": ["কম্পিউটার", "তথ্য প্রযুক্তি", "ইন্টারনেট", "প্রোগ্রামিং"],
};

// ---------- Helpers ----------
function getStatsKey(topic: string): string {
  return `prepflow_stats_${topic}`;
}

function getBankKey(topic: string): string {
  return `prepflow_bank_${topic}`;
}

function loadTopicStats(topic: string): TopicStats | null {
  try {
    const raw = localStorage.getItem(getStatsKey(topic));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadTopicBank(topic: string): any | null {
  try {
    const raw = localStorage.getItem(getBankKey(topic));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getTopicOverview(topic: string): TopicOverview {
  const stats = loadTopicStats(topic);
  const bank = loadTopicBank(topic);
  const todayStr = new Date().toISOString().slice(0, 10);

  if (!stats) {
    return {
      topic,
      accuracy: 0,
      totalQuestions: 0,
      masteredQuestions: 0,
      learningQuestions: 0,
      newQuestions: bank?.questions?.length || 0,
      todayCount: 0,
      lastPracticed: null,
    };
  }

  const totalQuestions = Object.keys(stats.perQuestion).length;
  const masteredQuestions = Object.values(stats.perQuestion).filter(
    (q: any) => q.attempts >= 3 && (q.correct / q.attempts) >= 0.8
  ).length;
  const learningQuestions = Object.values(stats.perQuestion).filter(
    (q: any) => q.attempts > 0 && (q.attempts < 3 || (q.correct / q.attempts) < 0.8)
  ).length;
  const newQuestions = totalQuestions - masteredQuestions - learningQuestions;
  const accuracy = stats.totalAttempted > 0
    ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100)
    : 0;
  const todayCount = stats.daily[todayStr]?.attempted || 0;

  const dates = Object.keys(stats.daily).sort().reverse();
  const lastPracticed = dates.length > 0 ? dates[0] : null;

  return {
    topic,
    accuracy,
    totalQuestions,
    masteredQuestions,
    learningQuestions,
    newQuestions: Math.max(0, newQuestions),
    todayCount,
    lastPracticed,
  };
}

function getAllTopicsOverviews(): TopicOverview[] {
  const overviews: TopicOverview[] = [];
  Object.values(SUBJECTS).forEach(topics => {
    topics.forEach(topic => {
      overviews.push(getTopicOverview(topic));
    });
  });
  return overviews;
}

// ---------- Main App ----------
export default function Home() {
  const [activeTab, setActiveTab] = useState<"practice" | "progress">("practice");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [overviews, setOverviews] = useState<TopicOverview[]>([]);

  useEffect(() => {
    setOverviews(getAllTopicsOverviews());
  }, [activeTab]);

  const resetToSubjects = () => {
    setSelectedSubject(null);
    setSelectedTopic(null);
  };

  const totalAllQuestions = overviews.reduce((sum, o) => sum + o.totalQuestions, 0);
  const totalAllAttempted = overviews.reduce((sum, o) => sum + (loadTopicStats(o.topic)?.totalAttempted || 0), 0);
  const totalAllCorrect = overviews.reduce((sum, o) => sum + (loadTopicStats(o.topic)?.totalCorrect || 0), 0);
  const overallAccuracy = totalAllAttempted > 0
    ? Math.round((totalAllCorrect / totalAllAttempted) * 100)
    : 0;
  const totalMastered = overviews.reduce((sum, o) => sum + o.masteredQuestions, 0);
  const todayTotal = overviews.reduce((sum, o) => sum + o.todayCount, 0);

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    let count = 0;
    overviews.forEach(o => {
      const stats = loadTopicStats(o.topic);
      if (stats?.daily[ds]) {
        count += stats.daily[ds].attempted;
      }
    });
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, count };
  }).reverse();
  const maxDayCount = Math.max(1, ...last30Days.map(d => d.count));

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

      {/* Claude AI লিংক */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl p-4 shadow-md text-center mb-6">
        <p className="text-white font-medium text-sm mb-2">🤖 কঠিন কিছু বুঝতে চান? Claude AI-কে জিজ্ঞাসা করুন</p>
        <a
          href="https://claude.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-white text-purple-700 px-6 py-2 rounded-xl text-sm font-semibold hover:bg-purple-50 transition"
        >
          Claude খুলুন →
        </a>
        <p className="text-white/70 text-xs mt-1">ফ্রি • কোনো API key লাগবে না</p>
      </div>

      {activeTab === "practice" && (
        <div>
          {!selectedSubject && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.keys(SUBJECTS).map(subject => {
                const subjectTopics = SUBJECTS[subject];
                const subjectOverviews = overviews.filter(o => subjectTopics.includes(o.topic));
                const subjectAccuracy = subjectOverviews.length > 0
                  ? Math.round(subjectOverviews.reduce((sum, o) => sum + o.accuracy, 0) / subjectOverviews.length)
                  : 0;
                const subjectTotal = subjectOverviews.reduce((sum, o) => sum + o.totalQuestions, 0);

                return (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5 hover:shadow-md transition text-center"
                  >
                    <span className="text-2xl mb-2 block">
                      {subject === "বাংলা" ? "🇧🇩" :
                       subject === "ইংরেজী" ? "🇬🇧" :
                       subject === "গণিত" ? "🔢" :
                       subject === "সাধারণ জ্ঞান" ? "🌍" :
                       subject === "বিজ্ঞান" ? "🔬" : "💻"}
                    </span>
                    <span className="font-semibold text-amber-900 text-sm">{subject}</span>
                    {subjectTotal > 0 && (
                      <div className="mt-2">
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${subjectAccuracy}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {subjectAccuracy}% ({subjectTotal} প্রশ্ন)
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedSubject && !selectedTopic && (
            <div className="space-y-4">
              <button onClick={() => setSelectedSubject(null)} className="text-amber-700 text-sm underline">
                ← বিষয় পরিবর্তন
              </button>
              <h2 className="text-xl font-bold text-amber-800">{selectedSubject}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUBJECTS[selectedSubject].map(topic => {
                  const overview = overviews.find(o => o.topic === topic);
                  const hasData = overview && overview.totalQuestions > 0;

                  return (
                    <button
                      key={topic}
                      onClick={() => setSelectedTopic(topic)}
                      className="bg-white rounded-xl border border-amber-200 p-4 hover:bg-amber-50 transition text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-amber-900 text-sm">{topic}</span>
                        {hasData && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            overview.accuracy >= 80 ? "bg-green-100 text-green-700" :
                            overview.accuracy >= 50 ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {overview.accuracy}%
                          </span>
                        )}
                      </div>
                      {hasData && (
                        <div className="mt-2">
                          <div className="flex gap-1 text-xs text-gray-500">
                            <span>🟢 {overview.masteredQuestions}</span>
                            <span>🟡 {overview.learningQuestions}</span>
                            <span>⚪ {overview.newQuestions}</span>
                          </div>
                          {overview.lastPracticed && (
                            <p className="text-xs text-gray-400 mt-1">
                              শেষ: {overview.lastPracticed}
                              {overview.todayCount > 0 && ` | আজ: ${overview.todayCount}টি`}
                            </p>
                          )}
                        </div>
                      )}
                      {!hasData && (
                        <p className="text-xs text-gray-400 mt-1">শুরু করুন</p>
                      )}
                    </button>
                  );
                })}
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
              <MCQGenerator topic={selectedTopic} />
            </div>
          )}
        </div>
      )}

      {activeTab === "progress" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-amber-800">সার্বিক অগ্রগতি</h2>

          {/* Overall Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center">
              <p className="text-2xl font-bold text-amber-700">{totalAllQuestions}</p>
              <p className="text-xs text-gray-500">মোট প্রশ্ন ব্যাংক</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center">
              <p className="text-2xl font-bold text-green-600">{totalMastered}</p>
              <p className="text-xs text-gray-500">মাস্টার্ড</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center">
              <p className="text-2xl font-bold text-amber-700">{overallAccuracy}%</p>
              <p className="text-xs text-gray-500">সামগ্রিক নির্ভুলতা</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-200 text-center">
              <p className="text-2xl font-bold text-amber-700">{todayTotal}</p>
              <p className="text-xs text-gray-500">আজকের প্রশ্ন</p>
            </div>
          </div>

          {/* ৩০ দিনের চার্ট */}
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5 overflow-x-auto">
            <h3 className="font-bold text-lg text-amber-800 mb-3">গত ৩০ দিনের অনুশীলন</h3>
            <div className="flex items-end justify-between gap-1 min-w-[600px]" style={{ height: 100 }}>
              {last30Days.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-1">
                  <span className="text-[10px] text-gray-500">{d.count || ""}</span>
                  <div
                    className="w-full max-w-[12px] bg-amber-400 rounded-t"
                    style={{ height: `${Math.max(3, (d.count / maxDayCount) * 50)}px` }}
                  />
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subject-wise Overview */}
          <div className="space-y-4">
            {Object.entries(SUBJECTS).map(([subject, topics]) => {
              const subjectOverviews = overviews.filter(o => topics.includes(o.topic));
              const subjectAccuracy = subjectOverviews.length > 0
                ? Math.round(subjectOverviews.reduce((sum, o) => sum + o.accuracy, 0) / subjectOverviews.length)
                : 0;
              const subjectTotal = subjectOverviews.reduce((sum, o) => sum + o.totalQuestions, 0);
              const subjectMastered = subjectOverviews.reduce((sum, o) => sum + o.masteredQuestions, 0);

              return (
                <div key={subject} className="bg-white rounded-2xl shadow-sm border border-amber-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-amber-800">{subject}</h3>
                    <span className="text-sm text-gray-500">
                      {subjectMastered}/{subjectTotal} মাস্টার্ড
                    </span>
                  </div>
                  {subjectTotal > 0 && (
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${subjectAccuracy}%` }}
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    {topics.map(topic => {
                      const overview = overviews.find(o => o.topic === topic);
                      return (
                        <div key={topic} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{topic}</span>
                          <span className="text-gray-500">
                            {overview?.totalQuestions || 0} প্রশ্ন
                            {overview?.lastPracticed && ` | শেষ: ${overview.lastPracticed}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}