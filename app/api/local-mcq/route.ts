// app/api/local-mcq/route.ts
import { NextResponse } from "next/server";

// সরাসরি JSON ইম্পোর্ট
import sandhiMCQs from "@/data/bangla/grammar/sandhi.json";
import samasMCQs from "@/data/bangla/grammar/samas.json";
import nazrulMCQs from "@/data/bangla/literature/nazrul.json";
import jibananandaMCQs from "@/data/bangla/literature/jibanananda.json";
import ictMCQs from "@/data/ict/computer.json";
import constitutionMCQs from "@/data/gk/bangladesh/constitution.json";
import pcMCQs from "@/data/math/permutation_combination.json";

const LOCAL_BANK: Record<string, any[]> = {
  "বাংলা ব্যাকরণ": [...sandhiMCQs, ...samasMCQs],
  "বাংলা সাহিত্য": [...nazrulMCQs, ...jibananandaMCQs],
  "কম্পিউটার ও আইসিটি": ictMCQs,
  "হার্ডওয়্যার": ictMCQs,
  "মেমোরি": ictMCQs,
  "সফটওয়্যার": ictMCQs,
  "সংখ্যা পদ্ধতি": ictMCQs,
  "নেটওয়ার্কিং": ictMCQs,
  "আধুনিক প্রযুক্তি": ictMCQs,
  "সংবিধান": constitutionMCQs,
  "বীজগণিত": pcMCQs,
  "জ্যামিতি ও পরিমিতি": pcMCQs,
  "পাটিগণিত": [],
  "ত্রিকোণমিতি": [],
  "English Grammar": [],
  "English Literature": [],
  "ভাষাগত যৌক্তিক বিচার": [],
  "সংখ্যাগত ক্ষমতা": [],
  "স্থানিক ক্ষমতা": [],
  "বিন্যাস": [],
  "ডাটা ইন্টারপ্রিটেশন": [],
  "প্রাচীন ইতিহাস": [],
  "ব্রিটিশ ও পাকিস্তান": [],
  "মুক্তিযুদ্ধ": [],
  "ভূগোল": [],
  "জাতীয় বিষয়": [],
  "অর্থনীতি": [],
  "বৈশ্বিক ইতিহাস": [],
  "দেশ পরিচিতি": [],
  "আন্তর্জাতিক সংস্থা": [],
  "আঞ্চলিক জোট": [],
  "পরিবেশ": [],
  "পুরস্কার": [],
  "ভৌত বিজ্ঞান": [],
  "জীববিজ্ঞান": [],
  "আধুনিক বিজ্ঞান": [],
  "বাংলাদেশ ভূগোল": [],
  "দুর্যোগ ব্যবস্থাপনা": [],
  "নৈতিকতা": [],
  "সুশাসন": [],
  "ব্যাংকিং টার্মস": [],
  "বাংলাদেশ ব্যাংক": [],
  "ফিন্যান্স": [],
};

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();
    if (!topic) return NextResponse.json({ error: "topic প্রয়োজন" }, { status: 400 });

    const mcqs = LOCAL_BANK[topic];

    if (!mcqs || mcqs.length === 0) {
      return NextResponse.json({ error: "এই টপিকের MCQ এখনো তৈরি হয়নি", mcqs: [] }, { status: 404 });
    }

    return NextResponse.json({ mcqs, total: mcqs.length });
  } catch (err: any) {
    return NextResponse.json({ error: "লোড ত্রুটি: " + err.message }, { status: 500 });
  }
}