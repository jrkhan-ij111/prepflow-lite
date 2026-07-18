// app/api/local-mcq/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TOPIC_MAP: Record<string, string> = {
  "বাংলা ব্যাকরণ": "data/bangla/grammar/sandhi.json",
  "বাংলা সাহিত্য": "data/bangla/literature/nazrul.json",
  "English Grammar": "data/english/grammar/tense.json",
  "English Literature": "data/english/literature.json",
  "পাটিগণিত": "data/math/arithmetic.json",
  "বীজগণিত": "data/math/algebra.json",
  "জ্যামিতি ও পরিমিতি": "data/math/geometry.json",
  "ত্রিকোণমিতি": "data/math/trigonometry.json",
  "সংখ্যাগত ক্ষমতা": "data/mental_ability/non_verbal.json",
  "বিন্যাস": "data/mental_ability/analytical.json",
  "ডাটা ইন্টারপ্রিটেশন": "data/mental_ability/pyq.json",
  "প্রাচীন ইতিহাস": "data/gk/bangladesh/history.json",
  "মুক্তিযুদ্ধ": "data/gk/bangladesh/liberation.json",
  "সংবিধান": "data/gk/bangladesh/constitution.json",
  "ভূগোল": "data/gk/bangladesh/geography.json",
  "অর্থনীতি": "data/gk/bangladesh/economy.json",
  "বৈশ্বিক ইতিহাস": "data/gk/international/world_history.json",
  "দেশ পরিচিতি": "data/gk/international/countries.json",
  "আন্তর্জাতিক সংস্থা": "data/gk/international/organizations.json",
  "ভৌত বিজ্ঞান": "data/science/physics.json",
  "জীববিজ্ঞান": "data/science/biology.json",
  "আধুনিক বিজ্ঞান": "data/science/astronomy.json",
  "হার্ডওয়্যার": "data/ict/computer.json",
  "মেমোরি": "data/ict/computer.json",
  "সফটওয়্যার": "data/ict/computer.json",
  "সংখ্যা পদ্ধতি": "data/ict/computer.json",
  "নেটওয়ার্কিং": "data/ict/computer.json",
  "আধুনিক প্রযুক্তি": "data/ict/computer.json",
  "নৈতিকতা": "data/ethics/ethics.json",
  "সুশাসন": "data/ethics/governance.json",
  "ব্যাংকিং টার্মস": "data/banking/banking_terms.json",
  "বাংলাদেশ ব্যাংক": "data/banking/banking_terms.json",
  "ফিন্যান্স": "data/banking/finance.json",
};

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();
    if (!topic) return NextResponse.json({ error: "topic প্রয়োজন" }, { status: 400 });

    let filePath = TOPIC_MAP[topic];
    
    if (!filePath) {
      const dataDir = path.join(process.cwd(), "data");
      const files = findAllJsonFiles(dataDir);
      const match = files.find(f => f.includes(topic.toLowerCase().replace(/\s+/g, "_")));
      filePath = match || path.join(dataDir, "misc.json");
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "এই টপিকের MCQ এখনো তৈরি হয়নি", mcqs: [] }, { status: 404 });
    }

    const mcqs = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!Array.isArray(mcqs) || mcqs.length === 0) {
      return NextResponse.json({ error: "কোনো MCQ নেই", mcqs: [] }, { status: 404 });
    }

    return NextResponse.json({ mcqs, total: mcqs.length });
  } catch (err: any) {
    return NextResponse.json({ error: "লোড ত্রুটি: " + err.message }, { status: 500 });
  }
}

function findAllJsonFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) results.push(...findAllJsonFiles(fullPath));
    else if (item.endsWith(".json")) results.push(fullPath);
  }
  return results;
}