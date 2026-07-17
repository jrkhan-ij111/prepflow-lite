// app/api/generate-mcq/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, textInput, fileBase64, fileMimeType, count = 10 } = body;

    if (!topic) {
      return NextResponse.json({ error: "topic প্রয়োজন" }, { status: 400 });
    }

    if (!textInput?.trim() && !fileBase64) {
      return NextResponse.json({ error: "টেক্সট বা ফাইল প্রয়োজন" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 500 });
    }

    const parts: any[] = [];
    if (textInput?.trim()) {
      parts.push({ text: textInput.trim() });
    }

    const promptText = `তুমি একজন বিশেষজ্ঞ শিক্ষক ও BCS পরীক্ষার প্রশ্ন-নির্মাতা। নিচের সোর্স কনটেন্ট থেকে "${topic}" টপিকের উপর ${count}টি ইউনিক MCQ বাংলায় তৈরি করো।
প্রতিটি প্রশ্নে ঠিক ৪টি অপশন থাকবে, অপশন লেবেল সবসময় "A", "B", "C", "D" হবে।
প্রতিটি প্রশ্নের জন্য 'difficulty' ফিল্ডে 'easy' অথবা 'hard' ট্যাগ দাও।
প্রতিটি প্রশ্নের জন্য 'subtopic' ফিল্ডে সংক্ষিপ্ত উপ-বিষয়ের নাম দাও।
উত্তর শুধুমাত্র JSON ফরম্যাটে দাও, কোনো অতিরিক্ত টেক্সট বা মার্কডাউন ব্যাকটিক্স ছাড়া।
ফরম্যাট:
[
  {
    "question": "প্রশ্ন",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correctAnswer": "B",
    "explanation": "সংক্ষিপ্ত বাংলা ব্যাখ্যা",
    "difficulty": "easy",
    "subtopic": "উপ-বিষয়ের নাম"
  }
]
সোর্স টেক্সট: ${textInput}`;

    parts.push({ text: promptText });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] }),
    });

    // ✅ 429 রেট লিমিট চেক
    if (response.status === 429) {
      return NextResponse.json(
        { error: "আজকের ফ্রি লিমিট শেষ হয়ে গেছে অথবা একটু বেশি দ্রুত রিকোয়েস্ট করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।" },
        { status: 429 }
      );
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini raw error:", errText);
      throw new Error("Gemini API failed: " + errText.slice(0, 200));
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!rawText) throw new Error("API থেকে কোনো কনটেন্ট আসেনি");

    const jsonString = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    let mcqs;
    try {
      mcqs = JSON.parse(jsonString);
    } catch {
      throw new Error("MCQ JSON পার্স করতে ব্যর্থ। আবার চেষ্টা করুন।");
    }

    if (!Array.isArray(mcqs) || mcqs.length === 0) {
      throw new Error("কোনো MCQ তৈরি হয়নি। কনটেন্ট আরও সমৃদ্ধ করুন।");
    }

    return NextResponse.json({ mcqs });
  } catch (error: any) {
    console.error("MCQ error:", error);
    return NextResponse.json(
      { error: error.message || "MCQ তৈরিতে ত্রুটি" },
      { status: 500 }
    );
  }
}