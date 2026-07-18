// app/api/local-mcq/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TOPIC_MAP: Record<string, string> = {
  "বাংলা ব্যাকরণ": "data/bangla/grammar/samas.json",
  "বাংলা সাহিত্য": "data/bangla/literature/nazrul.json",
  "English Grammar": "data/english/grammar/tense.json",
  "English Literature": "data/english/literature.json",
  "পাটিগণিত": "data/math/arithmetic.json",
  "বীজগণিত": "data/math/algebra.json",
  "জ্যামিতি ও পরিমিতি": "data/math/geometry.json",
  "বাংলাদেশ বিষয়াবলি": "data/gk/bangladesh/constitution.json",
  "কম্পিউটার ও আইসিটি": "data/ict/computer.json",
};

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();
    if (!topic) return NextResponse.json({ error: "topic প্রয়োজন" }, { status: 400 });

    const filePath = TOPIC_MAP[topic] || path.join(process.cwd(), "data", "misc.json");
    if (!fs.existsSync(filePath)) return NextResponse.json({ error: "MCQ এখনো তৈরি হয়নি", mcqs: [] }, { status: 404 });

    const mcqs = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!Array.isArray(mcqs) || mcqs.length === 0) return NextResponse.json({ error: "কোনো MCQ নেই", mcqs: [] }, { status: 404 });

    return NextResponse.json({ mcqs, total: mcqs.length });
  } catch {
    return NextResponse.json({ error: "লোড ত্রুটি" }, { status: 500 });
  }
}