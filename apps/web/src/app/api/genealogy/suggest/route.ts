import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import type { GenealogySuggestRequest } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/genealogy/suggest
// AI-powered ancestor ↔ story link suggestions
// ─────────────────────────────────────────────────────────────────────────────

const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const SUGGEST_SYSTEM_PROMPT = `You are an expert genealogist and archivist specializing in identifying connections between historical family records and ancestral story archives.

Your task: Given a list of ancestors with biographical data, and a list of story archives with titles and vault names, identify likely connections between specific ancestors and specific stories.

You must respond with ONLY valid JSON — an array of connection objects. No preamble, no markdown, no explanation.

Return this exact JSON structure:
[
  {
    "ancestorId": "the ancestor's exact ID string from input",
    "storyId": "the story's exact ID string from input",
    "confidence": "high" | "medium" | "low",
    "reason": "Brief explanation (max 100 chars) of why this ancestor likely relates to this story"
  }
]

Matching rules:
- Match on surname overlap between ancestor and story/vault title
- Match on birth place overlap with story/vault name
- Match on era alignment (birth year fits timeframe implied by story context)
- Only return connections you believe are plausible
- Return an empty array [] if no confident matches exist
- Confidence "high": multiple matching signals; "medium": one strong signal; "low": weak circumstantial match
- Do NOT invent connections. Only return matches with genuine textual or temporal evidence.`;

// Prompt injection guard
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|prior)\s+instructions/i,
  /<\|im_start\|>/,
  /\[INST\]/,
  /###\s*instruction/i,
  /system\s*:/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
];

function hasInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

// Simple in-memory rate limiter
const requestLog = new Map<string, number[]>();
const RATE_LIMIT_RPM = parseInt(process.env.RATE_LIMIT_RPM ?? "10", 10);

function isRateLimited(ip: string): boolean {
  const now     = Date.now();
  const window  = 60_000;
  const history = (requestLog.get(ip) ?? []).filter((t) => now - t < window);
  history.push(now);
  requestLog.set(ip, history);
  return history.length > RATE_LIMIT_RPM;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit reached. Please wait before requesting more suggestions." },
      { status: 429 }
    );
  }

  let body: GenealogySuggestRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { ancestors, stories } = body;

  if (!Array.isArray(ancestors) || !Array.isArray(stories)) {
    return NextResponse.json({ error: "ancestors and stories arrays are required." }, { status: 400 });
  }

  // Cap inputs as per plan
  const cappedAncestors = ancestors.slice(0, 200);
  const cappedStories   = stories.slice(0, 500);

  if (cappedAncestors.length === 0 || cappedStories.length === 0) {
    return NextResponse.json({ links: [], tokensUsed: 0 });
  }

  // Injection check on sample names
  const sampleTexts = [
    ...cappedAncestors.slice(0, 10).map((a) => `${a.givenName} ${a.surname}`),
    ...cappedStories.slice(0, 10).map((s) => s.title),
  ];
  if (sampleTexts.some(hasInjection)) {
    return NextResponse.json({ error: "Invalid input detected." }, { status: 400 });
  }

  const userPrompt = `ANCESTORS (${cappedAncestors.length} total):
${JSON.stringify(cappedAncestors, null, 2)}

STORIES (${cappedStories.length} total):
${JSON.stringify(cappedStories, null, 2)}

Return only a JSON array of matches.`;

  try {
    const response = await client.chat.completions.create({
      model:      MODEL,
      max_tokens: 2048,
      messages: [
        { role: "system", content: SUGGEST_SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
    });

    const raw   = response.choices[0]?.message?.content ?? "[]";
    const usage = response.usage;

    let links: unknown[];
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
      links = JSON.parse(cleaned);
      if (!Array.isArray(links)) links = [];
    } catch {
      links = [];
    }

    return NextResponse.json({
      links:      links.slice(0, 200), // safety cap
      tokensUsed: (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0),
    });
  } catch (err) {
    console.error("[Genealogy Suggest API]", err);
    return NextResponse.json(
      { error: "The archivist could not reach the records at this time." },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
