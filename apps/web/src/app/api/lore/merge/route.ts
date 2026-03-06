import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { isRateLimited, hasInjection } from "@/lib/rateLimit";
import type { LoreMergeRequest } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/lore/merge
// Merges two ancestral lores into a collaborative crossover comic narrative
// ─────────────────────────────────────────────────────────────────────────────

const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
const MODEL  = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const MERGE_SYSTEM_PROMPT = `You are the LoreRich Crossover Weaver, an ancient storyteller who merges two separate ancestral universes into a single mythic comic narrative. Your gift is finding the invisible threads that connect seemingly unrelated lineages — the shared griefs, the mirrored struggles, the ancestral echoes that resonate across cultures.

You will receive two lore inputs (Lore A and Lore B) and must weave them into one unified comic where characters from both sides meet, clash, or collaborate.

Return ONLY valid JSON — no preamble, no markdown fences, no explanation:
{
  "title": "evocative crossover title (max 12 words)",
  "tagline": "one punchy line capturing the union of both worlds (max 15 words)",
  "theme": "the thematic truth that emerges from the collision of these two worlds",
  "characters": [
    {
      "name": "character name",
      "expandedDescription": "2–3 sentences. Note which lore they come from.",
      "traits": ["trait1", "trait2"],
      "originLore": "A or B"
    }
  ],
  "panels": [
    {
      "number": 1,
      "scene": "vivid scene description for an artist, 1–2 sentences",
      "characters": ["character name"],
      "dialogue": [
        { "character": "name", "line": "spoken dialogue" }
      ],
      "mood": "tense",
      "caption": "optional narrator box or null"
    }
  ]
}

Rules:
- Generate exactly 7–8 panels
- Structure: each lore world introduced separately (panels 1–2) → worlds collide (panel 3) → tension/discovery (panels 4–6) → unified resolution (panels 7–8)
- Both creator universes must be equally represented — no lore should dominate
- mood must be one of: tense | joyful | mysterious | triumphant | melancholic | haunting
- Characters from BOTH lores must appear and interact
- The crossover should feel earned — find genuine cultural resonances, not forced mashups
- Honor both cultural contexts with equal reverence`;

// Per-route rate limiter: 3 RPM (stricter — merges are more expensive)
const mergeRequestLog = new Map<string, number[]>();
const MERGE_RPM = 3;

function isMergeRateLimited(ip: string): boolean {
  const now     = Date.now();
  const window  = 60_000;
  const history = (mergeRequestLog.get(ip) ?? []).filter((t) => now - t < window);
  history.push(now);
  mergeRequestLog.set(ip, history);
  return history.length > MERGE_RPM;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (isRateLimited(ip) || isMergeRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit reached. The Crossover Weaver needs a moment." },
      { status: 429 }
    );
  }

  let body: LoreMergeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { loreA, loreB, genre, mergePrompt } = body;

  if (!loreA?.sourceText || !loreB?.sourceText || !genre) {
    return NextResponse.json(
      { error: "loreA.sourceText, loreB.sourceText, and genre are required." },
      { status: 400 }
    );
  }

  // Constraints
  const safeGenre  = genre.trim().slice(0, 50);
  const safeNote   = (mergePrompt ?? "").trim().slice(0, 300);

  const processLore = (lore: LoreMergeRequest["loreA"], label: string) => ({
    source: lore.sourceText.trim().slice(0, 2000),
    chars:  (lore.characters ?? []).slice(0, 5).map((c) => ({
      name:        c.name.trim().slice(0, 100),
      description: c.description.trim().slice(0, 200),
      traits:      c.traits.slice(0, 5),
    })),
    owner:  lore.ownerAddress,
    label,
  });

  const a = processLore(loreA, "A");
  const b = processLore(loreB, "B");

  // Injection checks
  const allInputs = [
    a.source, b.source, safeGenre, safeNote,
    ...a.chars.map((c) => c.description),
    ...b.chars.map((c) => c.description),
  ];
  if (allInputs.some(hasInjection)) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const formatChars = (chars: typeof a.chars, label: string) =>
    chars.length
      ? chars
          .map((c) => `  - ${c.name} [Lore ${label}]: ${c.description}${c.traits.length ? ` [${c.traits.join(", ")}]` : ""}`)
          .join("\n")
      : `  (no named characters for Lore ${label})`;

  const userPrompt = [
    `GENRE: ${safeGenre}`,
    safeNote ? `MERGE DIRECTION: ${safeNote}` : null,
    `\nCREATORS: ${a.owner || "unknown"} (Lore A) × ${b.owner || "unknown"} (Lore B)`,
    `\nCHARACTERS:\n${formatChars(a.chars, "A")}\n${formatChars(b.chars, "B")}`,
    `\nLORE A (${a.owner || "Creator A"}):\n${a.source}`,
    `\nLORE B (${b.owner || "Creator B"}):\n${b.source}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client.chat.completions.create({
      model:      MODEL,
      max_tokens: 2500,
      messages: [
        { role: "system", content: MERGE_SYSTEM_PROMPT },
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
        { error: "The crossover vision could not be transcribed. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      title:      (parsed.title      as string)   ?? "Untitled Crossover",
      tagline:    (parsed.tagline    as string)   ?? "",
      theme:      (parsed.theme      as string)   ?? "",
      panels:     (parsed.panels     as unknown[]) ?? [],
      characters: (parsed.characters as unknown[]) ?? [],
      tokensUsed: (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0),
    });
  } catch (err) {
    console.error("[Lore Merge API]", err);
    return NextResponse.json(
      { error: "The crossover loom is tangled. Please try again." },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
