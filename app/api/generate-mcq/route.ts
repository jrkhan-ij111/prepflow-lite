import { NextResponse } from "next/server";

async function tryOpenAI(topic: string, textInput: string, count: number) {
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const prompt = `তুমি একজন BCS প্রশ্ন-নির্মাতা। "${topic}" টপিকের উপর ${count}টি বাংলা MCQ JSON ফরম্যাটে দাও। ফরম্যাট: [{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correctAnswer":"B","explanation":"...","difficulty":"easy","subtopic":"..."}]। সোর্স: ${textInput}`;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 2000,
  });
  const raw = completion.choices[0]?.message?.content || "";
  return JSON.parse(raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim());
}

async function tryGemini(topic: string, textInput: string, count: number) {
  const apiKey = process.env.GEMINI_API_KEY!;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const promptText = `তুমি একজন বিশেষজ্ঞ শিক্ষক। "${topic}" টপিকের উপর ${count}টি বাংলা MCQ JSON ফরম্যাটে দাও। ফরম্যাট: [{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correctAnswer":"B","explanation":"...","difficulty":"easy","subtopic":"..."}]। সোর্স: ${textInput}`;
  const res = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
  });
  if (!res.ok) throw new Error("Gemini failed");
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return JSON.parse(raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim());
}

async function tryDeepSeek(topic: string, textInput: string, count: number) {
  const apiKey = process.env.DEEPSEEK_API_KEY!;
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: `তুমি একজন BCS MCQ নির্মাতা। "${topic}" টপিকের উপর ${count}টি বাংলা MCQ JSON ফরম্যাটে দাও। ফরম্যাট: [{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correctAnswer":"B","explanation":"...","difficulty":"easy","subtopic":"..."}]। সোর্স: ${textInput}` }],
      temperature: 0.7, max_tokens: 2000,
    }),
  });
  if (!res.ok) throw new Error("DeepSeek failed");
  const data = await res.json();
  const raw = data.choices[0]?.message?.content || "";
  return JSON.parse(raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim());
}

function generateDummy(text: string, topic: string, count: number) {
  const sentences = text.split(/[।!?]/).filter((s: string) => s.trim().length > 15);
  if (sentences.length === 0) return [];
  const mcqs: any[] = [];
  for (let i = 0; i < Math.min(count, sentences.length); i++) {
    const s = sentences[i].trim();
    const correct = `${s.substring(0, 30)}... সম্পর্কে সঠিক তথ্য।`;
    const wrongs = ["ভুল তথ্য", "অপ্রাসঙ্গিক", "আংশিক সত্য"];
    const opts = [correct, ...wrongs].sort(() => Math.random() - 0.5);
    mcqs.push({
      question: `"${s.substring(0, 50)}..." — নিচের কোনটি সঠিক?`,
      options: { A: opts[0], B: opts[1], C: opts[2], D: opts[3] },
      correctAnswer: "ABCD"[opts.indexOf(correct)],
      explanation: correct, difficulty: "easy", subtopic: topic,
    });
  }
  return mcqs;
}

export async function POST(req: Request) {
  try {
    const { topic, textInput, count = 20 } = await req.json();
    if (!topic || !textInput?.trim()) return NextResponse.json({ error: "টপিক ও টেক্সট প্রয়োজন" }, { status: 400 });

    let mcqs: any[] = [];
    let used = "dummy";

    // OpenAI try
    if (process.env.OPENAI_API_KEY) {
      try { mcqs = await tryOpenAI(topic, textInput, count); used = "openai"; } catch {}
    }
    // Gemini try
    if (mcqs.length === 0 && process.env.GEMINI_API_KEY) {
      try { mcqs = await tryGemini(topic, textInput, count); used = "gemini"; } catch {}
    }
    // DeepSeek try
    if (mcqs.length === 0 && process.env.DEEPSEEK_API_KEY) {
      try { mcqs = await tryDeepSeek(topic, textInput, count); used = "deepseek"; } catch {}
    }
    // Dummy fallback
    if (mcqs.length === 0) {
      mcqs = generateDummy(textInput, topic, count);
      used = "dummy";
    }

    if (mcqs.length === 0) return NextResponse.json({ error: "কোনো MCQ তৈরি হয়নি" }, { status: 400 });
    return NextResponse.json({ mcqs, used });
  } catch (err: any) {
    return NextResponse.json({ error: "MCQ তৈরিতে ত্রুটি" }, { status: 500 });
  }
}