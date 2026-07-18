"use client";

import { useState, useEffect } from "react";

interface MCQ {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

interface Props { topic: string; }

const MCQ_BANK: Record<string, MCQ[]> = {
  // ========== বাংলা ব্যাকরণ ==========
  "বাংলা ব্যাকরণ": [
    { id: "bg1", question: "'উপশহর' শব্দে 'উপ' উপসর্গটি কোন অর্থে ব্যবহৃত হয়েছে?", options: ["ক্ষুদ্র অর্থে", "সাদৃশ্য অর্থে", "সমীপ্য অর্থে", "বিরোধ অর্থে"], answer: 1, explanation: "শহরের সদৃশ = উপশহর। সাদৃশ্য অর্থে ব্যবহৃত।" },
    { id: "bg2", question: "'যথারীতি' শব্দে 'যথা' উপসর্গটি কোন অর্থ প্রকাশ করে?", options: ["সাদৃশ্য", "অতিক্রান্ত", "অনতিক্রম্যতা", "বিরোধ"], answer: 2, explanation: "রীতিকে অতিক্রম না করে = যথারীতি। অনতিক্রম্যতা অর্থে।" },
    { id: "bg3", question: "'উচ্ছৃঙ্খল' শব্দে 'উৎ' উপসর্গটি কোন অর্থে ব্যবহৃত?", options: ["ঈষৎ অর্থে", "অতিক্রান্ত অর্থে", "ক্ষুদ্র অর্থে", "পূর্ণ অর্থে"], answer: 1, explanation: "শৃঙ্খলাকে অতিক্রান্ত = উচ্ছৃঙ্খল।" },
    { id: "bg4", question: "'প্রতিবাদ' শব্দে 'প্রতি' উপসর্গটি কোন অর্থে ব্যবহৃত?", options: ["পশ্চাৎ অর্থে", "প্রতিনিধি অর্থে", "বিরোধ অর্থে", "সাদৃশ্য অর্থে"], answer: 2, explanation: "বিরুদ্ধ বাদ = প্রতিবাদ। বিরোধ অর্থে।" },
    { id: "bg5", question: "সমাস কাকে বলে?", options: ["দুটি পদের মিলন", "পরস্পর সম্পর্কযুক্ত দুই বা ততোধিক পদের এক পদে পরিণত হওয়া", "শব্দের বিভক্তি যোগ", "উপসর্গ যোগ"], answer: 1, explanation: "পরস্পর সম্পর্কযুক্ত দুই বা ততোধিক পদ এক পদে পরিণত হওয়াকে সমাস বলে।" },
    { id: "bg6", question: "প্রাদি সমাস কাকে বলে?", options: ["যে সমাসে ব্যাসবাক্যের প্রয়োজন হয় না", "প্র, প্রতি, অনু প্রভৃতি অব্যয়ের সঙ্গে কৃৎ প্রত্যয় সাধিত বিশেষ্যের সমাস", "নিত্য সমাসবদ্ধ সমাস", "উপমান-উপমেয় সমাস"], answer: 1, explanation: "প্র, প্রতি, অনু + কৃৎ প্রত্যয় সাধিত বিশেষ্য = প্রাদি সমাস।" },
    { id: "bg7", question: "নিত্যসমাসের বৈশিষ্ট্য কী?", options: ["উপসর্গ যুক্ত", "উপমান-উপমেয়", "সমস্যমান পদ নিত্য সমাসবদ্ধ, ব্যাসবাক্য লাগে না", "বিভক্তি লোপ পায় না"], answer: 2, explanation: "পদগুলো নিত্য সমাসবদ্ধ থাকে, ব্যাসবাক্যের দরকার হয় না।" },
    { id: "bg8", question: "'আরক্তিম' শব্দে 'আ' উপসর্গটি কোন অর্থ প্রকাশ করে?", options: ["পূর্ণ অর্থে", "ক্ষুদ্র অর্থে", "ঈষৎ অর্থে", "বিরোধ অর্থে"], answer: 2, explanation: "ঈষৎ রক্তিম = আরক্তিম।" },
    { id: "bg9", question: "'অনুধাবন' শব্দে 'অনু' উপসর্গটি কী অর্থ প্রকাশ করে?", options: ["বিরোধ", "সাদৃশ্য", "পশ্চাৎ", "ক্ষুদ্র"], answer: 2, explanation: "পশ্চাৎ ধাবন = অনুধাবন।" },
    { id: "bg10", question: "'পরোক্ষ' শব্দে 'পর' উপসর্গটি কী অর্থে ব্যবহৃত?", options: ["সমীপ্য", "দূরবর্তী", "ঈষৎ", "ক্ষুদ্র"], answer: 1, explanation: "অক্ষির অগোচরে = পরোক্ষ। দূরবর্তী অর্থে।" },
  ],

  // ========== বাংলা সাহিত্য ==========
  "বাংলা সাহিত্য": [
    { id: "bs1", question: "কাজী নজরুল ইসলামের জন্মস্থান কোথায়?", options: ["ঢাকা", "চুরুলিয়া, বর্ধমান", "কলকাতা", "কুমিল্লা"], answer: 1, explanation: "পশ্চিমবঙ্গের বর্ধমান জেলার চুরুলিয়ায় জন্ম।" },
    { id: "bs2", question: "নজরুলের প্রথম প্রকাশিত কবিতা কোনটি?", options: ["বিদ্রোহী", "আনন্দময়ীর আগমনে", "মুক্তি", "প্রলয়শিখা"], answer: 2, explanation: "১৯১৯ সালে 'মুক্তি' বঙ্গীয় মুসলিম সাহিত্য পত্রিকায় প্রকাশিত।" },
    { id: "bs3", question: "নজরুলের প্রথম উপন্যাস কোনটি?", options: ["মৃত্যুক্ষুধা", "কুহেলিকা", "বাঁধনহারা", "ঝিলিমিলি"], answer: 2, explanation: "'বাঁধনহারা' (১৯২৭) প্রথম উপন্যাস ও প্রথম পত্রোপন্যাস।" },
    { id: "bs4", question: "জীবনানন্দ দাশের জন্মস্থান?", options: ["কলকাতা", "ঢাকা", "বরিশাল", "খুলনা"], answer: 2, explanation: "১৮৯৯ সালের ১৭ ফেব্রুয়ারি বরিশালে জন্ম।" },
    { id: "bs5", question: "'আবার আসিব ফিরে ধানসিঁড়িটির তীরে' — কার লেখা?", options: ["রবীন্দ্রনাথ", "নজরুল", "জীবনানন্দ দাশ", "জসীমউদ্দীন"], answer: 2, explanation: "জীবনানন্দ দাশের বিখ্যাত কবিতা।" },
    { id: "bs6", question: "জীবনানন্দ দাশের প্রথম কাব্যগ্রন্থ?", options: ["ঝরা পালক", "ধূসর পাণ্ডুলিপি", "বনলতা সেন", "রূপসী বাংলা"], answer: 0, explanation: "'ঝরা পালক' (১৯২৭) প্রথম প্রকাশিত কাব্যগ্রন্থ।" },
    { id: "bs7", question: "নজরুলের শৈশবের ডাক নাম?", options: ["খোকা", "দুখু মিয়া", "নুরু", "বুলবুল"], answer: 1, explanation: "দারিদ্র্যের কারণে 'দুখু মিয়া' নাম রাখা হয়েছিল।" },
    { id: "bs8", question: "রবীন্দ্রনাথ নজরুলকে কোন নাটক উৎসর্গ করেন?", options: ["চিত্রাঙ্গদা", "বসন্ত", "শ্যামা", "চণ্ডালিকা"], answer: 1, explanation: "নজরুল জেলে থাকাকালীন 'বসন্ত' উৎসর্গ করেন।" },
    { id: "bs9", question: "জীবনানন্দের মৃত্যু হয় কীভাবে?", options: ["হৃদরোগে", "ক্যান্সারে", "ট্রাম দুর্ঘটনায়", "আত্মহত্যায়"], answer: 2, explanation: "১৯৫৪ সালে কলকাতায় ট্রাম দুর্ঘটনায় মৃত্যু।" },
    { id: "bs10", question: "'বনলতা সেন' কবিতাটি কোন কাব্যগ্রন্থের?", options: ["ধূসর পাণ্ডুলিপি", "বনলতা সেন", "মহাপৃথিবী", "সাতটি তারার তিমির"], answer: 1, explanation: "১৯৪২ সালে প্রকাশিত 'বনলতা সেন' কাব্যগ্রন্থের অন্তর্গত।" },
  ],

  // ========== English Grammar ==========
  "English Grammar": [
    { id: "eg1", question: "She _____ to school every day.", options: ["go", "goes", "going", "gone"], answer: 1, explanation: "Third person singular → verb + s/es। She goes to school." },
    { id: "eg2", question: "The book _____ on the table.", options: ["is", "are", "am", "be"], answer: 0, explanation: "Singular subject 'book' → singular verb 'is'।" },
    { id: "eg3", question: "Change voice: 'He wrote a letter.'", options: ["A letter was written by him", "A letter is written by him", "A letter was wrote by him", "A letter writes by him"], answer: 0, explanation: "Past indefinite active → passive: object + was/were + V3 + by + subject।" },
    { id: "eg4", question: "The passive form of 'They are watching TV' is:", options: ["TV is watched", "TV is being watched", "TV was watched", "TV has been watched"], answer: 1, explanation: "Present continuous active → passive: is/are + being + V3।" },
    { id: "eg5", question: "He said, 'I am busy.' (Narration)", options: ["He said that I am busy", "He said that he was busy", "He said that he is busy", "He said I was busy"], answer: 1, explanation: "Direct → Indirect: present → past, pronoun change।" },
    { id: "eg6", question: "Which tense is used in 'I have been waiting for hours'?", options: ["Present Perfect", "Present Perfect Continuous", "Past Perfect", "Past Continuous"], answer: 1, explanation: "have been + V-ing = Present Perfect Continuous।" },
    { id: "eg7", question: "The noun form of 'decide' is:", options: ["decided", "deciding", "decision", "decisive"], answer: 2, explanation: "decision = noun form of decide।" },
    { id: "eg8", question: "Choose the correct article: 'He is _____ honest man.'", options: ["a", "an", "the", "no article"], answer: 1, explanation: "honest starts with vowel sound → 'an'।" },
    { id: "eg9", question: "Synonym of 'Abandon':", options: ["Keep", "Forsake", "Hold", "Protect"], answer: 1, explanation: "Abandon = Forsake (ত্যাগ করা, পরিত্যাগ করা)।" },
    { id: "eg10", question: "Antonym of 'Generous':", options: ["Kind", "Liberal", "Stingy", "Noble"], answer: 2, explanation: "Generous = উদার, Stingy = কৃপণ।" },
  ],

  // ========== গণিত (Permutation & Combination) ==========
  "বীজগণিত": [
    { id: "pc1", question: "5P3 এর মান কত?", options: ["10", "20", "60", "120"], answer: 2, explanation: "5P3 = 5!/(5-3)! = 5×4×3 = 60।" },
    { id: "pc2", question: "5C2 এর মান কত?", options: ["5", "10", "15", "20"], answer: 1, explanation: "5C2 = 5!/(2!×3!) = (5×4)/(2×1) = 10।" },
    { id: "pc3", question: "0! এর মান কত?", options: ["0", "1", "অসংজ্ঞায়িত", "∞"], answer: 1, explanation: "গাণিতিক সংজ্ঞা অনুযায়ী 0! = 1।" },
    { id: "pc4", question: "nPn এর মান কত?", options: ["n!", "1", "0", "n"], answer: 0, explanation: "nPn = n!/(n-n)! = n!/0! = n!।" },
    { id: "pc5", question: "'BOOK' শব্দটির অক্ষরগুলো কত প্রকারে সাজানো যায়?", options: ["12", "18", "24", "36"], answer: 0, explanation: "O দুইবার → 4!/2! = 24/2 = 12।" },
    { id: "pc6", question: "7C3 এর মান কত?", options: ["21", "35", "42", "210"], answer: 1, explanation: "7C3 = (7×6×5)/(3×2×1) = 35।" },
    { id: "pc7", question: "nCr = nC(n-r) — এটি কী নামে পরিচিত?", options: ["প্যাসকেলের সূত্র", "সাম্য সূত্র", "প্রতিসাম্য সূত্র", "বিন্যাস সূত্র"], answer: 2, explanation: "nCr = nC(n-r) সমাবেশের প্রতিসাম্য সূত্র।" },
    { id: "pc8", question: "10C0 + 10C1 + ... + 10C10 = কত?", options: ["512", "1024", "2048", "100"], answer: 1, explanation: "সমষ্টি = 2^n = 2^10 = 1024।" },
    { id: "pc9", question: "6C3 এর মান কত?", options: ["10", "15", "20", "30"], answer: 2, explanation: "6C3 = (6×5×4)/(3×2×1) = 20।" },
    { id: "pc10", question: "10P2 এর মান কত?", options: ["45", "90", "100", "20"], answer: 1, explanation: "10P2 = 10×9 = 90।" },
  ],

  // ========== সংবিধান ==========
  "সংবিধান": [
    { id: "c1", question: "বাংলাদেশের সংবিধান কত সালে কার্যকর হয়?", options: ["১৯৭১", "১৯৭২", "১৯৭৩", "১৯৭৪"], answer: 1, explanation: "১৬ ডিসেম্বর ১৯৭২ থেকে কার্যকর হয়।" },
    { id: "c2", question: "সংবিধানের প্রস্তাবনায় কয়টি মূলনীতি আছে?", options: ["৩টি", "৪টি", "৫টি", "৬টি"], answer: 1, explanation: "জাতীয়তাবাদ, সমাজতন্ত্র, গণতন্ত্র, ধর্মনিরপেক্ষতা — ৪টি।" },
    { id: "c3", question: "সংবিধানের কোন অনুচ্ছেদে আইনের দৃষ্টিতে সমতা নিশ্চিত করা হয়েছে?", options: ["২৫", "২৭", "২৯", "৩১"], answer: 1, explanation: "অনুচ্ছেদ ২৭: আইনের দৃষ্টিতে সমতা।" },
    { id: "c4", question: "বাংলাদেশের রাষ্ট্রপতির মেয়াদকাল কত বছর?", options: ["৪", "৫", "৬", "৭"], answer: 1, explanation: "অনুচ্ছেদ ৫০(২) অনুযায়ী ৫ বছর।" },
    { id: "c5", question: "জাতীয় সংসদের মেয়াদকাল কত বছর?", options: ["৪", "৫", "৬", "৩"], answer: 1, explanation: "অনুচ্ছেদ ৭২(৩) অনুযায়ী ৫ বছর।" },
    { id: "c6", question: "সংবিধান মোট কতবার সংশোধন করা হয়েছে?", options: ["১৫", "১৬", "১৭", "১৮"], answer: 2, explanation: "এ পর্যন্ত ১৭ বার সংশোধন (সর্বশেষ ২০১৮)।" },
    { id: "c7", question: "কোন সংশোধনীতে ধর্মনিরপেক্ষতা পুনঃপ্রবর্তন করা হয়?", options: ["১২তম", "১৩তম", "১৪তম", "১৫তম"], answer: 3, explanation: "১৫তম সংশোধনী (২০১১) দ্বারা ধর্মনিরপেক্ষতা পুনঃপ্রবর্তন।" },
    { id: "c8", question: "কোন সংশোধনীতে তত্ত্বাবধায়ক সরকার বাতিল হয়?", options: ["১৩তম", "১৪তম", "১৫তম", "১৬তম"], answer: 2, explanation: "১৫তম সংশোধনী (২০১১) দ্বারা বাতিল।" },
    { id: "c9", question: "প্রধানমন্ত্রী কে নিয়োগ দেন?", options: ["স্পিকার", "রাষ্ট্রপতি", "চিফ জাস্টিস", "সংসদ"], answer: 1, explanation: "অনুচ্ছেদ ৫৬(৩) অনুযায়ী রাষ্ট্রপতি নিয়োগ দেন।" },
    { id: "c10", question: "সুপ্রিম কোর্টের বিচারপতির অবসরের বয়স কত?", options: ["৬২", "৬৫", "৬৭", "৭০"], answer: 2, explanation: "অনুচ্ছেদ ৯৬(১) অনুযায়ী ৬৭ বছর।" },
  ],

  // ========== ICT ==========
  "কম্পিউটার ও আইসিটি": [
    { id: "ict1", question: "কম্পিউটারের জনক কাকে বলা হয়?", options: ["চার্লস ব্যাবেজ", "অ্যালান টুরিং", "জন ভন নিউম্যান", "বিল গেটস"], answer: 0, explanation: "চার্লস ব্যাবেজ Analytical Engine তৈরি করেন।" },
    { id: "ict2", question: "RAM-এর পূর্ণরূপ কী?", options: ["Read Access Memory", "Random Access Memory", "Read And Memory", "Rapid Access Memory"], answer: 1, explanation: "RAM = Random Access Memory, volatile মেমোরি।" },
    { id: "ict3", question: "ROM-এর পূর্ণরূপ কী?", options: ["Random Only Memory", "Read Only Memory", "Rapid Output Memory", "Read Output Memory"], answer: 1, explanation: "ROM = Read Only Memory, non-volatile।" },
    { id: "ict4", question: "১ GB = কত MB?", options: ["১০০", "৫১২", "১০২৪", "১০৪৮"], answer: 2, explanation: "1 GB = 1024 MB (বাইনারি পদ্ধতি)।" },
    { id: "ict5", question: "CPU-র কোন অংশ গাণিতিক কাজ করে?", options: ["CU", "ALU", "MU", "Register"], answer: 1, explanation: "ALU (Arithmetic Logic Unit) গাণিতিক ও যৌক্তিক কাজ করে।" },
    { id: "ict6", question: "WWW-এর পূর্ণরূপ কী?", options: ["World Wide Web", "World Web Wide", "Web World Wide", "Wide World Web"], answer: 0, explanation: "WWW = World Wide Web, ১৯৮৯ সালে টিম বার্নার্স-লি উদ্ভাবন করেন।" },
    { id: "ict7", question: "ইন্টারনেটের জনক কাকে বলা হয়?", options: ["টিম বার্নার্স-লি", "ভিন্ট সার্ফ ও বব কান", "বিল গেটস", "স্টিভ জবস"], answer: 1, explanation: "TCP/IP প্রোটোকলের উদ্ভাবক ভিন্ট সার্ফ ও বব কান।" },
    { id: "ict8", question: "AI-র পূর্ণরূপ কী?", options: ["Advanced Internet", "Artificial Intelligence", "Automated Input", "Analog Integration"], answer: 1, explanation: "AI = Artificial Intelligence (কৃত্রিম বুদ্ধিমত্তা)।" },
    { id: "ict9", question: "DNS-এর কাজ কী?", options: ["ডাটা এনক্রিপ্ট", "ডোমেইন নামকে IP-তে রূপান্তর", "ভাইরাস স্ক্যান", "স্পিড বাড়ানো"], answer: 1, explanation: "DNS ডোমেইন নামকে IP অ্যাড্রেসে রূপান্তর করে।" },
    { id: "ict10", question: "ফায়ারওয়াল কী কাজ করে?", options: ["ভাইরাস স্ক্যান", "অননুমোদিত প্রবেশ রোধ", "ডাটা স্টোর", "স্পিড বাড়ায়"], answer: 1, explanation: "ফায়ারওয়াল নেটওয়ার্কে অননুমোদিত প্রবেশ রোধ করে।" },
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

  const currentMCQ = mcqs[currentIndex] || null;
  const handleOptionSelect = (idx: number) => { if (isRevealed) return; setSelectedOption(idx); };
  const handleCheckAnswer = () => { if (selectedOption === null || !currentMCQ) return; setIsRevealed(true); if (selectedOption === currentMCQ.answer) setScore(p => p + 1); };
  const handleNext = () => { if (currentIndex + 1 < mcqs.length) { setCurrentIndex(p => p + 1); setSelectedOption(null); setIsRevealed(false); } else setQuizFinished(true); };
  const handleRetry = () => { setCurrentIndex(0); setSelectedOption(null); setIsRevealed(false); setScore(0); setQuizFinished(false); };

  if (loading) return <div className="text-center py-10"><div className="animate-spin inline-block w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full mb-2" /><p className="text-amber-700">লোড হচ্ছে...</p></div>;
  if (errorMsg) return <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center"><p className="text-red-600">{errorMsg}</p></div>;

  return (
    <div className="space-y-6">
      {!quizFinished && currentMCQ && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="h-2 bg-amber-100"><div className="h-full bg-amber-500 transition-all" style={{ width: `${((currentIndex + (isRevealed ? 1 : 0)) / mcqs.length) * 100}%` }} /></div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4"><span className="text-sm font-medium bg-amber-100 px-3 py-1 rounded-full">প্রশ্ন {currentIndex + 1} / {mcqs.length}</span><span className="text-sm text-gray-600">সঠিক: {score}</span></div>
            <p className="text-lg font-semibold text-gray-800 mb-5">{currentMCQ.question}</p>
            <div className="space-y-2">{currentMCQ.options.map((opt, idx) => { const isCorrect = idx === currentMCQ.answer, isSelected = idx === selectedOption; let cls = "border-gray-200 bg-white"; if (isRevealed) { if (isCorrect) cls = "border-green-500 bg-green-50"; else if (isSelected && !isCorrect) cls = "border-red-500 bg-red-50"; else cls = "opacity-60"; } else if (isSelected) cls = "border-amber-500 bg-amber-50"; return <button key={idx} disabled={isRevealed} onClick={() => handleOptionSelect(idx)} className={`w-full text-left p-3 rounded-xl border transition ${cls} ${!isRevealed ? "hover:bg-amber-50" : ""}`}>{String.fromCharCode(65 + idx)}. {opt}</button>; })}</div>
            <div className="mt-4">{!isRevealed ? <button onClick={handleCheckAnswer} disabled={selectedOption === null} className="w-full bg-amber-500 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50">উত্তর দেখুন</button> : <div className="space-y-3"><div className={`p-3 rounded-xl ${selectedOption === currentMCQ.answer ? "bg-green-50 border border-green-300" : "bg-red-50 border border-red-300"}`}><p className="font-bold">{selectedOption === currentMCQ.answer ? "✓ সঠিক!" : "✗ ভুল"}</p>{selectedOption !== currentMCQ.answer && <p className="text-sm">সঠিক: {String.fromCharCode(65 + currentMCQ.answer)}</p>}<p className="text-sm mt-1">{currentMCQ.explanation}</p></div><button onClick={handleNext} className="w-full bg-amber-500 text-white py-2.5 rounded-xl font-semibold">পরবর্তী →</button></div>}</div>
          </div>
        </div>
      )}
      {quizFinished && <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center"><div className="text-4xl mb-3">🎯</div><h2 className="text-2xl font-bold text-amber-800 mb-3">কুইজ শেষ!</h2><p className="text-lg">সঠিক: {score} / {mcqs.length} ({Math.round((score / mcqs.length) * 100)}%)</p><button onClick={handleRetry} className="mt-4 bg-amber-500 text-white px-6 py-2 rounded-xl font-semibold">আবার শুরু</button></div>}
    </div>
  );
}