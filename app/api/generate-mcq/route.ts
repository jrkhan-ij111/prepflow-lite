// app/api/generate-mcq/route.ts
import { NextResponse } from "next/server";

const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, textInput, fileBase64, fileMimeType, count = 5 } = body;

    if (!topic) {
      return NextResponse.json({ error: "topic প্রয়োজন" }, { status: 400 });
    }

    if (!textInput?.trim() && !fileBase64) {
      return NextResponse.json({ error: "টেক্সট বা ফাইল প্রয়োজন" }, { status: 400 });
    }

    // ✅ শুধু GEMINI_API_KEY (কোনো NEXT_PUBLIC_ prefix নেই)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 500 });
    }

    const parts: any[] = [];

    if (textInput?.trim()) {
      parts.push({ text: textInput.trim() });
    }

    if (fileBase64 && fileMimeType) {
      parts.push({
        inline_data: {
          mime_type: fileMimeType,
          data: fileBase64,
        },
      });
    }

    const promptText = `তুমি একজন বিশেষজ্ঞ শিক্ষক। নিচের কনটেন্ট এবং "${topic}" টপিকের জ্ঞান থেকে ${count}টি BCS-মানের MCQ বাংলায় তৈরি করো।
প্রতিটি প্রশ্নে ঠিক ৪টি অপশন থাকবে, অপশন লেবেল সবসময় "A", "B", "C", "D" হবে।
উত্তর শুধুমাত্র JSON ফরম্যাটে দাও, কোনো অতিরিক্ত টেক্সট বা মার্কডাউন ব্যাকটিক্স ছাড়া।
ফরম্যাট:
[
  {
    "question": "প্রশ্ন",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correctAnswer": "B",
    "explanation": "সংক্ষিপ্ত বাংলা ব্যাখ্যা"
  }
]`;

    parts.push({ text: promptText });

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || "Gemini API request failed");
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
    console.error("MCQ generation error:", error);
    return NextResponse.json(
      { error: error.message || "MCQ তৈরিতে ত্রুটি" },
      { status: 500 }
    );
  }
}