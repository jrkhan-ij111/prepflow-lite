// app/api/generate-mcq/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { topic, textInput, count = 20 } = await req.json();
    if (!topic || !textInput?.trim()) return NextResponse.json({ error: "টপিক ও টেক্সট প্রয়োজন" }, { status: 400 });

    const promptText = `তুমি একজন BCS প্রশ্ন-নির্মাতা। "${topic}" টপিকের উপর ${count}টি বাংলা MCQ JSON ফরম্যাটে দাও। ফরম্যাট: [{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correctAnswer":"B","explanation":"...","difficulty":"easy","subtopic":"..."}]। সোর্স: ${textInput}`;

    let mcqs: any[] = [];
    let used = "dummy";

    // OpenAI try
    if (process.env.OPENAI_API_KEY) {
      try {
        const { default: OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "user", content: promptText }], temperature: 0.7, max_tokens: 2000 });
        const raw = completion.choices[0]?.message?.content || "";
        mcqs = JSON.parse(raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim());
        if (mcqs.length > 0) used = "openai";
      } catch {}
    }

    // Gemini try
    if (mcqs.length === 0 && process.env.GEMINI_API_KEY) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }) });
        if (res.ok) {
          const data = await res.json();
          const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          mcqs = JSON.parse(raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim());
          if (mcqs.length > 0) used = "gemini";
        }
      } catch {}
    }

    // Dummy fallback
    if (mcqs.length === 0) {
      const sentences = textInput.split(/[।!?]/).filter((s: string) => s.trim().length > 15);
      for (let i = 0; i < Math.min(count, sentences.length); i++) {
        const s = sentences[i].trim();
        const correct = `${s.substring(0, 30)}... সম্পর্কে সঠিক তথ্য।`;
        const wrongs = ["ভুল তথ্য", "অপ্রাসঙ্গিক", "আংশিক সত্য"];
        const opts = [correct, ...wrongs].sort(() => Math.random() - 0.5);
        mcqs.push({ question: `"${s.substring(0, 50)}..."`, options: { A: opts[0], B: opts[1], C: opts[2], D: opts[3] }, correctAnswer: "ABCD"[opts.indexOf(correct)], explanation: correct, difficulty: "easy", subtopic: topic });
      }
      used = "dummy";
    }

    if (mcqs.length === 0) return NextResponse.json({ error: "কোনো MCQ তৈরি হয়নি" }, { status: 400 });
    return NextResponse.json({ mcqs, used });
  } catch (err: any) {
    return NextResponse.json({ error: "MCQ তৈরিতে ত্রুটি" }, { status: 500 });
  }
}