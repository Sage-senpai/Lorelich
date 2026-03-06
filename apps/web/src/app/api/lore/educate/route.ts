import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { isRateLimited, hasInjection } from "@/lib/rateLimit";
import type { EduComicRequest, EduAgeMode } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/lore/educate
// Generates age-appropriate educational comics from cultural lore
// Two modes: "young-learners" (5–10) and "explorers" (8–14)
// ─────────────────────────────────────────────────────────────────────────────

const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
const MODEL  = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const YOUNG_LEARNERS_PROMPT = `You are the LoreRich Story Friend, a warm and gentle storyteller who transforms ancestral cultural stories into fun, age-appropriate comic narratives for children ages 5–10.

Return ONLY valid JSON — no preamble, no markdown fences:
{
  "title": "fun, inviting comic title (max 8 words)",
  "tagline": "one cheerful line that captures the adventure (max 12 words)",
  "theme": "the moral or lesson of this story (1 simple sentence a child can understand)",
  "lesson": "what children will learn from this story (1 clear sentence)",
  "characters": [
    {
      "name": "character name",
      "expandedDescription": "1–2 friendly sentences about who they are",
      "traits": ["kind", "brave", "curious"]
    }
  ],
  "panels": [
    {
      "number": 1,
      "scene": "colorful, vivid scene description — imagine a children's picture book illustration",
      "characters": ["character name"],
      "dialogue": [
        { "character": "name", "line": "simple, warm dialogue" }
      ],
      "mood": "joyful",
      "caption": "simple narrator text or null"
    }
  ]
}

Rules:
- Generate exactly 4 panels
- Simple narrative arc: meet the characters → adventure/challenge → solution → happy lesson
- mood must be one of: joyful | mysterious | triumphant
- NO violence, fear, danger, conflict, or dark themes
- Use simple vocabulary — short sentences, common words
- Dialogue should sound natural for characters speaking to children
- Every story MUST end with a clear, positive moral lesson
- Characters should be kind, curious, and respectful
- Celebrate the cultural context with warmth and wonder
- Scene descriptions should be bright, colorful, and inviting`;

const EXPLORERS_PROMPT = `You are the LoreRich Cultural Guide, an engaging storyteller who transforms ancestral cultural stories into educational comic narratives for young explorers ages 8–14.

Return ONLY valid JSON — no preamble, no markdown fences:
{
  "title": "compelling educational comic title (max 10 words)",
  "tagline": "one engaging line that captures the cultural journey (max 15 words)",
  "theme": "the cultural or historical theme explored (1 sentence)",
  "lesson": "what readers will understand about this culture after reading (1–2 sentences)",
  "characters": [
    {
      "name": "character name",
      "expandedDescription": "2–3 sentences about their role and cultural significance",
      "traits": ["trait1", "trait2", "trait3"]
    }
  ],
  "panels": [
    {
      "number": 1,
      "scene": "vivid scene description that teaches something about the culture — architecture, clothing, landscape, customs",
      "characters": ["character name"],
      "dialogue": [
        { "character": "name", "line": "dialogue that naturally weaves in cultural knowledge" }
      ],
      "mood": "mysterious",
      "caption": "narrator text providing historical or cultural context, or null"
    }
  ],
  "discussion": [
    "What did you learn about [culture] from this story?",
    "How is [custom/tradition] similar to or different from your own culture?",
    "Why do you think [lesson] is important?"
  ]
}

Rules:
- Generate exactly 6 panels
- Narrative arc: cultural setting (1–2) → challenge or discovery (3–4) → understanding & resolution (5–6)
- mood must be one of: tense | joyful | mysterious | triumphant | melancholic | haunting
- Include 2–3 discussion questions that encourage cultural comparison and critical thinking
- Dialogue should naturally teach cultural concepts without being preachy
- Scene descriptions should be rich with cultural details — food, clothing, architecture, landscape, customs
- Characters should model respect, curiosity, and cross-cultural understanding
- Captions can include mini "Did you know?" cultural facts
- Age-appropriate — avoid graphic violence but can include mild tension/conflict
- Honor the source culture with accuracy and reverence`;

function getSystemPrompt(mode: EduAgeMode): string {
  return mode === "young-learners" ? YOUNG_LEARNERS_PROMPT : EXPLORERS_PROMPT;
}

// Per-route rate limiter
const eduRequestLog = new Map<string, number[]>();
const EDU_RPM = 5;

function isEduRateLimited(ip: string): boolean {
  const now    = Date.now();
  const window = 60_000;
  const history = (eduRequestLog.get(ip) ?? []).filter((t) => now - t < window);
  history.push(now);
  eduRequestLog.set(ip, history);
  return history.length > EDU_RPM;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (isRateLimited(ip) || isEduRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit reached. Please wait before generating another comic." },
      { status: 429 }
    );
  }

  let body: EduComicRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { sourceText, region, culture, topic, ageMode, creatorAddress } = body;

  if (!sourceText || !ageMode) {
    return NextResponse.json(
      { error: "sourceText and ageMode are required." },
      { status: 400 }
    );
  }

  if (ageMode !== "young-learners" && ageMode !== "explorers") {
    return NextResponse.json(
      { error: "ageMode must be 'young-learners' or 'explorers'." },
      { status: 400 }
    );
  }

  const safeSource  = sourceText.trim().slice(0, 3000);
  const safeRegion  = (region ?? "").trim().slice(0, 100);
  const safeCulture = (culture ?? "").trim().slice(0, 100);
  const safeTopic   = (topic ?? "").trim().slice(0, 200);

  const allInputs = [safeSource, safeRegion, safeCulture, safeTopic];
  if (allInputs.some(hasInjection)) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const userPrompt = [
    `AGE MODE: ${ageMode === "young-learners" ? "Young Learners (ages 5–10)" : "Explorers (ages 8–14)"}`,
    safeRegion  ? `REGION: ${safeRegion}`   : null,
    safeCulture ? `CULTURE: ${safeCulture}` : null,
    safeTopic   ? `TOPIC: ${safeTopic}`     : null,
    creatorAddress ? `CREATOR: ${creatorAddress}` : null,
    `\nSOURCE LORE:\n${safeSource}`,
  ]
    .filter(Boolean)
    .join("\n");

  const maxTokens = ageMode === "young-learners" ? 1024 : 2048;

  try {
    const response = await client.chat.completions.create({
      model:      MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: getSystemPrompt(ageMode) },
        { role: "user",   content: userPrompt },
      ],
    });

    const raw   = response.choices[0]?.message?.content ?? "";
    const usage = response.usage;

    let parsed: Record<string, unknown>;
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "The story could not be created. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      title:      (parsed.title      as string)   ?? "Untitled Story",
      tagline:    (parsed.tagline    as string)   ?? "",
      theme:      (parsed.theme      as string)   ?? "",
      lesson:     (parsed.lesson     as string)   ?? "",
      panels:     (parsed.panels     as unknown[]) ?? [],
      characters: (parsed.characters as unknown[]) ?? [],
      discussion: (parsed.discussion as string[]) ?? [],
      tokensUsed: (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0),
    });
  } catch (err) {
    console.error("[Edu Comic API]", err);
    return NextResponse.json(
      { error: "The story could not be woven at this time. Please try again." },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
