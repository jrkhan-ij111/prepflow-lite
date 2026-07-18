// app/api/local-mcq/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();
    if (!topic) return NextResponse.json({ error: "topic প্রয়োজন" }, { status: 400 });

    const dataDir = path.join(process.cwd(), "data");
    let mcqs: any[] = [];

    // বাংলা ব্যাকরণ = grammar ফোল্ডারের সব JSON
    if (topic === "বাংলা ব্যাকরণ") {
      const dir = path.join(dataDir, "bangla", "grammar");
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
        for (const file of files) {
          const content = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
          if (Array.isArray(content)) mcqs.push(...content);
        }
      }
    }
    // অন্যান্য টপিক
    else {
      const topicFile = topic.toLowerCase().replace(/\s+/g, "_") + ".json";
      // search in data folder
      const found = findFile(dataDir, topicFile);
      if (found) {
        mcqs = JSON.parse(fs.readFileSync(found, "utf-8"));
      }
    }

    if (mcqs.length === 0) {
      return NextResponse.json({ error: "এই টপিকের MCQ এখনো তৈরি হয়নি", mcqs: [] }, { status: 404 });
    }

    return NextResponse.json({ mcqs: [...mcqs].sort(() => Math.random() - 0.5), total: mcqs.length });
  } catch (err: any) {
    return NextResponse.json({ error: "লোড ত্রুটি: " + err.message }, { status: 500 });
  }
}

function findFile(dir: string, fileName: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      const found = findFile(full, fileName);
      if (found) return found;
    } else if (item === fileName) {
      return full;
    }
  }
  return null;
}