// app/api/generate-mcq/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    const promptText = `তুমি একজন বিশেষজ্ঞ শিক্ষক ও BCS পরীক্ষার প্রশ্ন-নির্মাতা। নিচের সোর্স কনটেন্ট থেকে "${topic}" টপিকের উপর ${count}টি ইউনিক, সমালোচনামূলক (critical thinking), এবং BCS-মানের MCQ বাংলায় তৈরি করো।

প্রথমে সোর্স কনটেন্টটি বিশ্লেষণ করে এর প্রধান উপ-বিষয়/অংশগুলো চিহ্নিত করো। তারপর মোট ${count}টি MCQ এমনভাবে তৈরি করো যাতে প্রতিটা প্রধান অংশ থেকে অন্তত একটি প্রশ্ন থাকে।

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

সোর্স টেক্সট:
${textInput || "(ফাইল থেকে extracted)"}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful MCQ generator. Always respond with valid JSON only." },
        { role: "user", content: promptText },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const rawText = completion.choices[0]?.message?.content || "";
    if (!rawText) throw new Error("API থেকে কোনো কনটেন্ট আসেনি");

    const jsonString = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

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
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: error.message || "MCQ তৈরিতে ত্রুটি" },
      { status: 500 }
    );
  }
}