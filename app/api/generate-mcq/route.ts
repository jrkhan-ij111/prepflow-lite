// app/api/generate-mcq/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sourceText, topic, count = 5 } = body;

    if (!sourceText || !topic) {
      return NextResponse.json({ error: "sourceText and topic required" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key missing" }, { status: 500 });
    }

    const prompt = `তুমি একটি MCQ জেনারেটর। নিচের সোর্স টেক্সট থেকে "${topic}" টপিকের উপর ${count}টি বাংলা MCQ তৈরি করো।
প্রতিটি MCQ-তে ৪টি অপশন থাকবে, একটি সঠিক উত্তর (index), এবং বিস্তারিত ব্যাখ্যা।
JSON অ্যারে ফরম্যাটে দাও:
[
  {
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "correctIndex": 0,
    "explanation": "...",
    "topic": "${topic}"
  }
]

সোর্স টেক্সট:
${sourceText}`;

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a helpful assistant that generates MCQs in JSON format." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || "DeepSeek API error");
    }

    const data = await res.json();
    const content = data.choices[0]?.message?.content || "";
    // Extract JSON array
    const match = content.match(/```json\s*([\s\S]*?)\s*```/) || [null, content];
    const jsonStr = match[1] || content;
    let mcqs;
    try {
      mcqs = JSON.parse(jsonStr.trim());
    } catch {
      // try to find a JSON array
      const arrMatch = jsonStr.match(/\[([\s\S]*)\]/);
      if (arrMatch) {
        mcqs = JSON.parse(arrMatch[0]);
      } else {
        throw new Error("Could not parse MCQ JSON");
      }
    }

    return NextResponse.json({ mcqs });
  } catch (error: any) {
    console.error("DeepSeek API error:", error);
    return NextResponse.json(
      { error: error.message || "MCQ generation failed" },
      { status: 500 }
    );
  }
}