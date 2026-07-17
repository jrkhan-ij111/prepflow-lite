import { NextResponse } from "next/server";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, textInput, fileBase64, fileMimeType, count = 10 } = body;

    if (!topic) return NextResponse.json({ error: "topic প্রয়োজন" }, { status: 400 });
    if (!textInput?.trim() && !fileBase64) return NextResponse.json({ error: "টেক্সট বা ফাইল প্রয়োজন" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY missing" }, { status: 500 });

    const parts: any[] = [];
    if (textInput?.trim()) parts.push({ text: textInput.trim() });
    if (fileBase64 && fileMimeType) parts.push({ inline_data: { mime_type: fileMimeType, data: fileBase64 } });

    const promptText = `তুমি একজন বিশেষজ্ঞ শিক্ষক। নিচের সোর্স থেকে "${topic}" টপিকের উপর ${count}টি MCQ বাংলায় JSON ফরম্যাটে দাও।
ফরম্যাট: [{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correctAnswer":"B","explanation":"...","difficulty":"easy","subtopic":"..."}]
সোর্স: ${textInput || "(ফাইল)"}`;

    parts.push({ text: promptText });

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] }),
    });

    if (!response.ok) throw new Error("Gemini API failed");
    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonString = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const mcqs = JSON.parse(jsonString);
    if (!Array.isArray(mcqs) || mcqs.length === 0) throw new Error("কোনো MCQ তৈরি হয়নি");

    return NextResponse.json({ mcqs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "MCQ তৈরিতে ত্রুটি" }, { status: 500 });
  }
}