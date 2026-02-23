import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import type { PitchGenerateRequest } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/pitch/generate
// Generates a documentary film treatment brief via LoreLich AI
// ─────────────────────────────────────────────────────────────────────────────

const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const PITCH_SYSTEM_PROMPT = `You are a film development consultant specializing in documentary treatments for ancestral and cultural heritage stories.

Given a story's metadata, generate a compelling documentary pitch treatment. You must respond with ONLY valid JSON — no preamble, no markdown, no explanation.

Return this exact JSON structure:
{
  "logline": "One sentence (max 40 words) capturing the human essence and stakes",
  "synopsis": "Two to three paragraphs expanding on the story's arc, characters, and emotional journey",
  "themes": ["Theme 1", "Theme 2", "Theme 3"],
  "visualApproach": "One paragraph describing cinematic approach, interview style, archival elements, and aesthetic",
  "comparables": ["Documentary Title (Year)", "Documentary Title (Year)"],
  "targetAudience": "One sentence describing primary and secondary audience demographics and platforms"
}

Guidelines:
- Draw on the cultural and ancestral significance implied by the story title and vault context
- Themes should be universal yet culturally specific — honor the heritage
- Comparables should be real, well-known documentary films
- Visual approach should evoke the dark, intimate aesthetic of archival documentary work
- Never fabricate specific biographical facts not provided
- Keep tone reverent but commercially compelling`;

// Prompt injection guard — same patterns as lorelich route
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

// Simple in-memory rate limiter (per-IP, per-minute)
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
      { error: "Rate limit reached. Please wait before generating another brief." },
      { status: 429 }
    );
  }

  let body: PitchGenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { storyId, title, mediaType, vaultName, themes } = body;

  if (!storyId || !title || !mediaType || !vaultName) {
    return NextResponse.json({ error: "storyId, title, mediaType and vaultName are required." }, { status: 400 });
  }

  // Sanitize user-supplied strings and check injection
  const safeTitle     = title.trim().slice(0, 200);
  const safeVault     = vaultName.trim().slice(0, 100);
  const safeMediaType = mediaType.trim().slice(0, 50);

  const inputs = [safeTitle, safeVault, ...(themes ?? [])];
  if (inputs.some(hasInjection)) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const userPrompt = [
    `Story ID: ${storyId}`,
    `Title: "${safeTitle}"`,
    `Media Type: ${safeMediaType}`,
    `Vault (Family/Community): ${safeVault}`,
    themes?.length ? `Known Themes: ${themes.slice(0, 5).join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client.chat.completions.create({
      model:      MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: PITCH_SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
    });

    const raw   = response.choices[0]?.message?.content ?? "";
    const usage = response.usage;

    // Parse JSON from model response; fall back to synopsis-only on failure
    let brief: Record<string, unknown>;
    try {
      // Strip any accidental markdown fences before parsing
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
      brief = JSON.parse(cleaned);
    } catch {
      brief = {
        logline:        safeTitle,
        synopsis:       raw.slice(0, 2000),
        themes:         [],
        visualApproach: "",
        comparables:    [],
        targetAudience: "",
      };
    }

    return NextResponse.json({
      brief: {
        storyId,
        logline:        (brief.logline        as string) ?? "",
        synopsis:       (brief.synopsis        as string) ?? "",
        themes:         (brief.themes          as string[]) ?? [],
        visualApproach: (brief.visualApproach  as string) ?? "",
        comparables:    (brief.comparables     as string[]) ?? [],
        targetAudience: (brief.targetAudience  as string) ?? "",
        generatedAt:    Date.now(),
      },
      tokensUsed: (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0),
    });
  } catch (err) {
    console.error("[Pitch API]", err);
    return NextResponse.json(
      { error: "The treatment could not be woven at this time. Please try again." },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
