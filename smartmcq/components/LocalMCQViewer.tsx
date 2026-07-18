"use client";

import { useState, useEffect } from "react";
import samasMCQs from "@/data/bangla/grammar/samas.json";
import jibananandaMCQs from "@/data/bangla/literature/jibanananda.json";
import nazrulMCQs from "@/data/bangla/literature/nazrul.json";
import permutationMCQs from "@/data/math/permutation_combination.json";

interface MCQ {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

interface Props { topic: string; }

const MCQ_BANK: Record<string, MCQ[]> = {
  "বাংলা ব্যাকরণ": samasMCQs,
  "জীবনানন্দ দাশ": jibananandaMCQs,
  "কাজী নজরুল ইসলাম": nazrulMCQs,
  "বীজগণিত": permutationMCQs,
  "বাংলা সাহিত্য": [
    { id: "bs1", question: "কাজী নজরুল ইসলামের জন্মস্থান?", options: ["ঢাকা", "চুরুলিয়া, বর্ধমান", "কলকাতা", "কুমিল্লা"], answer: 1, explanation: "পশ্চিমবঙ্গের বর্ধমান জেলার চুরুলিয়ায় জন্ম।" },
    { id: "bs2", question: "নজরুলের প্রথম প্রকাশিত কবিতা?", options: ["বিদ্রোহী", "আনন্দময়ীর আগমনে", "মুক্তি", "প্রলয়শিখা"], answer: 2, explanation: "১৯১৯ সালে 'মুক্তি' প্রকাশিত।" },
    { id: "bs3", question: "নজরুলের প্রথম উপন্যাস?", options: ["মৃত্যুক্ষুধা", "কুহেলিকা", "বাঁধনহারা", "ঝিলিমিলি"], answer: 2, explanation: "'বাঁধনহারা' (১৯২৭) প্রথম উপন্যাস ও প্রথম পত্রোপন্যাস।" },
    { id: "bs4", question: "নজরুলের শৈশবের ডাক নাম?", options: ["খোকা", "দুখু মিয়া", "নুরু", "বুলবুল"], answer: 1, explanation: "দারিদ্র্যের কারণে 'দুখু মিয়া'।" },
    { id: "bs5", question: "রবীন্দ্রনাথ নজরুলকে কোন নাটক উৎসর্গ করেন?", options: ["চিত্রাঙ্গদা", "বসন্ত", "শ্যামা", "চণ্ডালিকা"], answer: 1, explanation: "নজরুল জেলে থাকাকালীন 'বসন্ত' উৎসর্গ।" },
    { id: "bs6", question: "নজরুল কত সালে বাংলাদেশের নাগরিকত্ব পান?", options: ["১৯৭২", "১৯৭৪", "১৯৭৫", "১৯৭৬"], answer: 3, explanation: "১৯৭৬ সালের ১৮ ফেব্রুয়ারি।" },
    { id: "bs7", question: "জীবনানন্দ দাশের জন্মস্থান?", options: ["কলকাতা", "ঢাকা", "বরিশাল", "খুলনা"], answer: 2, explanation: "১৮৯৯ সালের ১৭ ফেব্রুয়ারি বরিশালে জন্ম।" },
    { id: "bs8", question: "জীবনানন্দ দাশের প্রথম কাব্যগ্রন্থ?", options: ["ঝরা পালক", "ধূসর পাণ্ডুলিপি", "বনলতা সেন", "রূপসী বাংলা"], answer: 0, explanation: "'ঝরা পালক' (১৯২৭)।" },
    { id: "bs9", question: "'আবার আসিব ফিরে ধানসিঁড়িটির তীরে' — কার লেখা?", options: ["রবীন্দ্রনাথ", "নজরুল", "জীবনানন্দ দাশ", "জসীমউদ্দীন"], answer: 2, explanation: "জীবনানন্দ দাশের বিখ্যাত কবিতা।" },
    { id: "bs10", question: "'বনলতা সেন' কবিতাটি কোন কাব্যগ্রন্থের?", options: ["ধূসর পাণ্ডুলিপি", "বনলতা সেন", "মহাপৃথিবী", "রূপসী বাংলা"], answer: 1, explanation: "১৯৪২ সালে প্রকাশিত 'বনলতা সেন' কাব্যগ্রন্থের।" },
    { id: "bs11", question: "নজরুলের প্রথম গল্পগ্রন্থ?", options: ["রিক্তের বেদন", "ব্যথার দান", "কুহেলিকা", "যুগবাণী"], answer: 1, explanation: "'ব্যথার দান' (১৯২২) প্রথম প্রকাশিত গ্রন্থ।" },
    { id: "bs12", question: "নজরুলের প্রথম নাট্যগ্রন্থ?", options: ["আলেয়া", "মধুমালা", "ঝিলিমিলি", "বিদ্যাপতি"], answer: 2, explanation: "'ঝিলিমিলি' (১৯২৭) প্রথম নাট্যগ্রন্থ।" },
    { id: "bs13", question: "জীবনানন্দ দাশের মৃত্যু হয় কীভাবে?", options: ["হৃদরোগে", "ক্যান্সারে", "ট্রাম দুর্ঘটনায়", "আত্মহত্যায়"], answer: 2, explanation: "১৯৫৪ সালে কলকাতায় ট্রাম দুর্ঘটনায় মৃত্যু।" },
    { id: "bs14", question: "জীবনানন্দ দাশকে কী বলা হয়?", options: ["বিদ্রোহী কবি", "রূপসী বাংলার কবি", "পল্লীকবি", "স্বভাবকবি"], answer: 1, explanation: "বাংলার প্রকৃতি অসাধারণভাবে ফুটিয়েছেন বলে।" },
    { id: "bs15", question: "নজরুল কোন কবিতার জন্য প্রথম কারাবরণ করেন?", options: ["বিদ্রোহী", "প্রলয়শিখা", "আনন্দময়ীর আগমনে", "ভাঙার গান"], answer: 2, explanation: "১৯২২ সালে 'ধূমকেতু'তে 'আনন্দময়ীর আগমনে' প্রকাশের জন্য।" },
  ],
  "English Grammar": [
    { id: "eg1", question: "She _____ to school every day.", options: ["go", "goes", "going", "gone"], answer: 1, explanation: "Third person singular → goes।" },
    { id: "eg2", question: "Change voice: 'He wrote a letter.'", options: ["A letter was written by him", "A letter is written", "A letter was wrote", "A letter writes"], answer: 0, explanation: "Past indefinite passive: was/were + V3।" },
    { id: "eg3", question: "He said, 'I am busy.' (Narration)", options: ["He said that I am busy", "He said that he was busy", "He said that he is busy", "He said I was busy"], answer: 1, explanation: "Direct → Indirect: present → past।" },
    { id: "eg4", question: "The passive of 'They are watching TV':", options: ["TV is watched", "TV is being watched", "TV was watched", "TV has been watched"], answer: 1, explanation: "Present continuous passive: is/are + being + V3।" },
    { id: "eg5", question: "Which tense: 'I have been waiting'?", options: ["Present Perfect", "Present Perfect Continuous", "Past Perfect", "Past Continuous"], answer: 1, explanation: "have been + V-ing = Present Perfect Continuous।" },
    { id: "eg6", question: "Noun form of 'decide':", options: ["decided", "deciding", "decision", "decisive"], answer: 2, explanation: "decision = noun form।" },
    { id: "eg7", question: "Article: 'He is _____ honest man.'", options: ["a", "an", "the", "no article"], answer: 1, explanation: "honest vowel sound → 'an'।" },
    { id: "eg8", question: "Synonym of 'Abandon':", options: ["Keep", "Forsake", "Hold", "Protect"], answer: 1, explanation: "Abandon = Forsake (ত্যাগ করা)।" },
    { id: "eg9", question: "Antonym of 'Generous':", options: ["Kind", "Liberal", "Stingy", "Noble"], answer: 2, explanation: "Generous (উদার) ≠ Stingy (কৃপণ)।" },
    { id: "eg10", question: "The book _____ on the table.", options: ["is", "are", "am", "be"], answer: 0, explanation: "Singular subject → is।" },
  ],
  "সংবিধান": [
    { id: "c1", question: "সংবিধান কত সালে কার্যকর?", options: ["১৯৭১", "১৯৭২", "১৯৭৩", "১৯৭৪"], answer: 1, explanation: "১৬ ডিসেম্বর ১৯৭২ থেকে।" },
    { id: "c2", question: "প্রস্তাবনায় কয়টি মূলনীতি?", options: ["৩", "৪", "৫", "৬"], answer: 1, explanation: "জাতীয়তাবাদ, সমাজতন্ত্র, গণতন্ত্র, ধর্মনিরপেক্ষতা — ৪টি।" },
    { id: "c3", question: "আইনের দৃষ্টিতে সমতা — কোন অনুচ্ছেদ?", options: ["২৫", "২৭", "২৯", "৩১"], answer: 1, explanation: "অনুচ্ছেদ ২৭।" },
    { id: "c4", question: "রাষ্ট্রপতির মেয়াদ?", options: ["৪", "৫", "৬", "৭"], answer: 1, explanation: "অনুচ্ছেদ ৫০(২): ৫ বছর।" },
    { id: "c5", question: "জাতীয় সংসদের মেয়াদ?", options: ["৪", "৫", "৬", "৩"], answer: 1, explanation: "অনুচ্ছেদ ৭২(৩): ৫ বছর।" },
    { id: "c6", question: "সংবিধান কতবার সংশোধন?", options: ["১৫", "১৬", "১৭", "১৮"], answer: 2, explanation: "১৭ বার (সর্বশেষ ২০১৮)।" },
    { id: "c7", question: "ধর্মনিরপেক্ষতা কোন সংশোধনীতে ফিরে আসে?", options: ["১২তম", "১৩তম", "১৪তম", "১৫তম"], answer: 3, explanation: "১৫তম সংশোধনী (২০১১)।" },
    { id: "c8", question: "তত্ত্বাবধায়ক সরকার কোন সংশোধনীতে বাতিল?", options: ["১৩তম", "১৪তম", "১৫তম", "১৬তম"], answer: 2, explanation: "১৫তম সংশোধনী (২০১১)।" },
    { id: "c9", question: "প্রধানমন্ত্রী কে নিয়োগ দেন?", options: ["স্পিকার", "রাষ্ট্রপতি", "চিফ জাস্টিস", "সংসদ"], answer: 1, explanation: "অনুচ্ছেদ ৫৬(৩): রাষ্ট্রপতি।" },
    { id: "c10", question: "বিচারপতির অবসরের বয়স?", options: ["৬২", "৬৫", "৬৭", "৭০"], answer: 2, explanation: "অনুচ্ছেদ ৯৬(১): ৬৭ বছর।" },
  ],
  "কম্পিউটার ও আইসিটি": [
    { id: "ict1", question: "কম্পিউটারের জনক?", options: ["চার্লস ব্যাবেজ", "টুরিং", "নিউম্যান", "বিল গেটস"], answer: 0, explanation: "চার্লস ব্যাবেজ Analytical Engine তৈরি করেন।" },
    { id: "ict2", question: "RAM-এর পূর্ণরূপ?", options: ["Read Access Memory", "Random Access Memory", "Read And Memory", "Rapid Access Memory"], answer: 1, explanation: "Random Access Memory, volatile।" },
    { id: "ict3", question: "ROM-এর পূর্ণরূপ?", options: ["Random Only Memory", "Read Only Memory", "Rapid Output Memory", "Read Output Memory"], answer: 1, explanation: "Read Only Memory, non-volatile।" },
    { id: "ict4", question: "১ GB = কত MB?", options: ["১০০", "৫১২", "১০২৪", "১০৪৮"], answer: 2, explanation: "1 GB = 1024 MB।" },
    { id: "ict5", question: "CPU-র গাণিতিক অংশ?", options: ["CU", "ALU", "MU", "Register"], answer: 1, explanation: "ALU গাণিতিক ও যৌক্তিক কাজ করে।" },
    { id: "ict6", question: "WWW-এর পূর্ণরূপ?", options: ["World Wide Web", "World Web Wide", "Web World Wide", "Wide World Web"], answer: 0, explanation: "World Wide Web, ১৯৮৯ সালে টিম বার্নার্স-লি।" },
    { id: "ict7", question: "ইন্টারনেটের জনক?", options: ["টিম বার্নার্স-লি", "ভিন্ট সার্ফ ও বব কান", "বিল গেটস", "স্টিভ জবস"], answer: 1, explanation: "TCP/IP প্রোটোকলের উদ্ভাবক।" },
    { id: "ict8", question: "AI-র পূর্ণরূপ?", options: ["Advanced Internet", "Artificial Intelligence", "Automated Input", "Analog Integration"], answer: 1, explanation: "Artificial Intelligence।" },
    { id: "ict9", question: "DNS-এর কাজ?", options: ["এনক্রিপ্ট", "ডোমেইন→IP", "ভাইরাস স্ক্যান", "স্পিড"], answer: 1, explanation: "ডোমেইন নামকে IP-তে রূপান্তর।" },
    { id: "ict10", question: "ফায়ারওয়াল কী করে?", options: ["ভাইরাস স্ক্যান", "অননুমোদিত প্রবেশ রোধ", "ডাটা স্টোর", "স্পিড বাড়ায়"], answer: 1, explanation: "নেটওয়ার্ক নিরাপত্তা দেয়।" },
  ],
  "জ্যামিতি ও পরিমিতি": [
    { id: "gm1", question: "পিথাগোরাসের উপপাদ্য কোন ত্রিভুজের জন্য?", options: ["সমবাহু", "সমদ্বিবাহু", "সমকোণী", "স্থূলকোণী"], answer: 2, explanation: "সমকোণী ত্রিভুজে অতিভুজ² = ভূমি² + লম্ব²।" },
    { id: "gm2", question: "বৃত্তের পরিধি = ?", options: ["πr", "2πr", "πr²", "2πr²"], answer: 1, explanation: "বৃত্তের পরিধি = 2πr।" },
    { id: "gm3", question: "ত্রিভুজের ক্ষেত্রফল = ?", options: ["½ × ভূমি × উচ্চতা", "দৈর্ঘ্য × প্রস্থ", "πr²", "বাহু³"], answer: 0, explanation: "ত্রিভুজের ক্ষেত্রফল = ½ × ভূমি × উচ্চতা।" },
    { id: "gm4", question: "বর্গের কর্ণ = ?", options: ["a", "a√2", "a√3", "2a"], answer: 1, explanation: "বর্গের কর্ণ = বাহু × √2 = a√2।" },
    { id: "gm5", question: "গোলকের আয়তন = ?", options: ["4/3 πr³", "πr²h", "4πr²", "2/3 πr³"], answer: 0, explanation: "গোলকের আয়তন = 4/3 πr³।" },
    { id: "gm6", question: "রম্বসের ক্ষেত্রফল = ?", options: ["½ × কর্ণদ্বয়ের গুণফল", "দৈর্ঘ্য × প্রস্থ", "বাহু²", "πr²"], answer: 0, explanation: "রম্বসের ক্ষেত্রফল = ½ × d1 × d2।" },
    { id: "gm7", question: "সমবাহু ত্রিভুজের ক্ষেত্রফল = ?", options: ["√3/4 a²", "½ a²", "a²", "√3 a²"], answer: 0, explanation: "সমবাহু ত্রিভুজের ক্ষেত্রফল = √3/4 × বাহু²।" },
    { id: "gm8", question: "চতুর্ভুজের চার কোণের সমষ্টি?", options: ["১৮০°", "২৭০°", "৩৬০°", "৯০°"], answer: 2, explanation: "যেকোনো চতুর্ভুজের চার কোণের সমষ্টি ৩৬০°।" },
    { id: "gm9", question: "সামান্তরিকের ক্ষেত্রফল = ?", options: ["ভূমি × উচ্চতা", "½ × ভূমি × উচ্চতা", "দৈর্ঘ্য × প্রস্থ", "πr²"], answer: 0, explanation: "সামান্তরিকের ক্ষেত্রফল = ভূমি × উচ্চতা।" },
    { id: "gm10", question: "বৃত্তের ক্ষেত্রফল = ?", options: ["πr", "2πr", "πr²", "2πr²"], answer: 2, explanation: "বৃত্তের ক্ষেত্রফল = πr²।" },
  ],
};

export default function LocalMCQViewer({ topic }: Props) {
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    setLoading(true);
    const found = MCQ_BANK[topic];
    if (found && found.length > 0) {
      setMcqs([...found].sort(() => Math.random() - 0.5));
      setCurrentIndex(0); setSelectedOption(null); setIsRevealed(false); setScore(0); setQuizFinished(false);
      setErrorMsg("");
    } else {
      setErrorMsg("এই টপিকের MCQ এখনো তৈরি হয়নি। AI MCQ ব্যবহার করুন।");
    }
    setLoading(false);
  }, [topic]);

  const q = mcqs[currentIndex];
  const done = quizFinished;

  if (loading) return <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full mb-2 mx-auto" /><p className="text-amber-700">লোড হচ্ছে...</p></div>;
  if (errorMsg) return <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center"><p className="text-red-600">{errorMsg}</p></div>;

  return (
    <div className="space-y-4">
      {!done && q && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
          <div className="flex justify-between mb-3 text-sm text-gray-500">
            <span>প্রশ্ন {currentIndex + 1}/{mcqs.length}</span>
            <span>সঠিক: {score}</span>
          </div>
          <p className="font-semibold text-gray-800 mb-4">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((o, i) => {
              const c = i === q.answer, s = i === selectedOption;
              let cls = "border-gray-200 bg-white";
              if (isRevealed) { if (c) cls = "border-green-500 bg-green-50"; else if (s) cls = "border-red-500 bg-red-50"; else cls = "opacity-60"; }
              else if (s) cls = "border-amber-500 bg-amber-50";
              return <button key={i} disabled={isRevealed} onClick={() => { if (!isRevealed) setSelectedOption(i); }} className={`w-full text-left p-3 rounded-xl border transition ${cls}`}>{String.fromCharCode(65 + i)}. {o}</button>;
            })}
          </div>
          <div className="mt-4">
            {!isRevealed ? (
              <button onClick={() => { if (selectedOption !== null) { setIsRevealed(true); if (selectedOption === q.answer) setScore(p => p + 1); } }} disabled={selectedOption === null} className="w-full bg-amber-500 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50">উত্তর দেখুন</button>
            ) : (
              <div className="space-y-3">
                <div className={`p-3 rounded-xl ${selectedOption === q.answer ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                  <p className="font-bold">{selectedOption === q.answer ? "✓ সঠিক!" : "✗ ভুল"}</p>
                  {selectedOption !== q.answer && <p className="text-sm">সঠিক: {String.fromCharCode(65 + q.answer)}</p>}
                  <p className="text-sm mt-1">{q.explanation}</p>
                </div>
                <button onClick={() => { if (currentIndex + 1 < mcqs.length) { setCurrentIndex(p => p + 1); setSelectedOption(null); setIsRevealed(false); } else setQuizFinished(true); }} className="w-full bg-amber-500 text-white py-2.5 rounded-xl font-semibold">পরবর্তী →</button>
              </div>
            )}
          </div>
        </div>
      )}
      {done && (
        <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center">
          <div className="text-4xl mb-3">🎯</div>
          <h2 className="text-xl font-bold text-amber-800 mb-2">কুইজ শেষ!</h2>
          <p className="text-lg">সঠিক: {score}/{mcqs.length} ({Math.round((score/mcqs.length)*100)}%)</p>
          <button onClick={() => { setCurrentIndex(0); setSelectedOption(null); setIsRevealed(false); setScore(0); setQuizFinished(false); }} className="mt-4 bg-amber-500 text-white px-6 py-2 rounded-xl font-semibold">আবার শুরু</button>
        </div>
      )}
    </div>
  );
}