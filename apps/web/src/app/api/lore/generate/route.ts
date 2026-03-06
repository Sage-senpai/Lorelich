import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { isRateLimited, hasInjection } from "@/lib/rateLimit";
import type { LoreGenerateRequest } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/lore/generate
// Transforms ancestral lore into a structured 6–8 panel comic narrative
// ─────────────────────────────────────────────────────────────────────────────

const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
const MODEL  = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const LORE_SYSTEM_PROMPT = `You are the LoreRich Comic Weaver, an ancient storyteller who transforms ancestral lore into mythic comic narratives. You weave stories with reverence for cultural truth and the weight of generational memory.

Return ONLY valid JSON — no preamble, no markdown fences, no explanation:
{
  "title": "evocative comic title (max 10 words)",
  "tagline": "one punchy line that captures the spirit (max 15 words)",
  "theme": "the moral or thematic core of this lore (1 sentence)",
  "characters": [
    {
      "name": "character name",
      "expandedDescription": "2–3 sentences expanding on their role and essence",
      "traits": ["trait1", "trait2", "trait3"]
    }
  ],
  "panels": [
    {
      "number": 1,
      "scene": "vivid visual description for an artist, 1–2 sentences. Set the physical scene.",
      "characters": ["character name"],
      "dialogue": [
        { "character": "name", "line": "spoken dialogue" }
      ],
      "mood": "tense",
      "caption": "optional narrator box text, or null"
    }
  ]
}

Rules:
- Generate exactly 6–8 panels
- Clear narrative arc: setup (panels 1–2) → tension/conflict (panels 3–5) → resolution (panels 6–8)
- mood must be one of: tense | joyful | mysterious | triumphant | melancholic | haunting
- caption is optional — use for narrator voice, time jumps, or thematic emphasis; set to null if not needed
- dialogue should feel authentic to the cultural context — not modern slang
- scene descriptions should be painterly and atmospheric
- Honor the cultural context of the source lore — do not invent facts not implied by the text
- Characters from the provided cast must appear in the narrative; you may name unnamed background figures`;

// Per-route rate limiter: 5 RPM (stricter than global)
const loreRequestLog = new Map<string, number[]>();
const LORE_RPM = 5;

function isLoreRateLimited(ip: string): boolean {
  const now     = Date.now();
  const window  = 60_000;
  const history = (loreRequestLog.get(ip) ?? []).filter((t) => now - t < window);
  history.push(now);
  loreRequestLog.set(ip, history);
  return history.length > LORE_RPM;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (isRateLimited(ip) || isLoreRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit reached. The Weaver needs a moment to rest." },
      { status: 429 }
    );
  }

  let body: LoreGenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { sourceText, characters, genre, prompt, creatorAddress } = body;

  if (!sourceText || !genre) {
    return NextResponse.json(
      { error: "sourceText and genre are required." },
      { status: 400 }
    );
  }

  // Constraints
  const safeSource = sourceText.trim().slice(0, 3000);
  const safeGenre  = genre.trim().slice(0, 50);
  const safePrompt = (prompt ?? "").trim().slice(0, 500);
  const safeChars  = (characters ?? []).slice(0, 5).map((c) => ({
    name:        c.name.trim().slice(0, 100),
    traits:      c.traits.slice(0, 5).map((t) => t.trim().slice(0, 50)),
    description: c.description.trim().slice(0, 200),
    walletAddress: c.walletAddress,
  }));

  // Injection checks
  const allInputs = [safeSource, safeGenre, safePrompt, ...safeChars.map((c) => c.description)];
  if (allInputs.some(hasInjection)) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const characterBlock = safeChars.length
    ? safeChars
        .map(
          (c) =>
            `- ${c.name}: ${c.description}${c.traits.length ? ` [${c.traits.join(", ")}]` : ""}`
        )
        .join("\n")
    : "No named characters provided — infer characters from the story text.";

  const userPrompt = [
    `GENRE: ${safeGenre}`,
    safePrompt ? `DIRECTION: ${safePrompt}` : null,
    creatorAddress ? `CREATOR: ${creatorAddress}` : null,
    `\nCHARACTERS:\n${characterBlock}`,
    `\nSOURCE LORE:\n${safeSource}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client.chat.completions.create({
      model:      MODEL,
      max_tokens: 2048,
      messages: [
        { role: "system", content: LORE_SYSTEM_PROMPT },
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
        { error: "The Weaver's vision could not be transcribed. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      title:      (parsed.title      as string)  ?? "Untitled Lore",
      tagline:    (parsed.tagline    as string)  ?? "",
      theme:      (parsed.theme      as string)  ?? "",
      panels:     (parsed.panels     as unknown[]) ?? [],
      characters: (parsed.characters as unknown[]) ?? [],
      tokensUsed: (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0),
    });
  } catch (err) {
    console.error("[Lore Generate API]", err);
    return NextResponse.json(
      { error: "The Weaver's loom is tangled. Please try again." },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
