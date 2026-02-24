import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { isRateLimited, hasInjection } from "@/lib/rateLimit";
import type { ProverbExtractRequest } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/proverb/extract
// V2: Extract a proverb and cultural context from a story passage
// ─────────────────────────────────────────────────────────────────────────────

const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
const MODEL  = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are a cultural scholar and oral tradition archivist.
Your task is to extract or distill a single timeless proverb from an ancestral story passage.
The proverb should feel as if it could have been passed down through generations — concise, rhythmic, and wise.

Return ONLY valid JSON in this exact shape:
{
  "proverb": "A short, memorable proverb (one sentence, under 20 words)",
  "culturalContext": "2–3 sentences explaining the wisdom in the proverb and its cultural resonance",
  "culture": "Cultural tradition or region this seems to draw from (optional, omit if unclear)"
}

Rules:
- The proverb must be directly inspired by the story passage, not invented from thin air
- Do not fabricate specific historical claims
- Write in a timeless, oral-tradition voice
- Never include markdown, code fences, or explanatory text outside the JSON`;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  let body: ProverbExtractRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { storyId, storyText, title, vaultName } = body;

  if (!storyId || !storyText || !title) {
    return NextResponse.json({ error: "storyId, storyText, and title are required." }, { status: 400 });
  }

  const trimmedText = storyText.trim().slice(0, 2000);
  if (!trimmedText) {
    return NextResponse.json({ error: "storyText cannot be empty." }, { status: 400 });
  }

  if (hasInjection(trimmedText) || hasInjection(title)) {
    return NextResponse.json({ error: "Cannot process that request." }, { status: 400 });
  }

  const userMessage = `Story: "${title}" from vault "${vaultName ?? "Unknown Vault"}"

Passage:
${trimmedText}

Extract a proverb from this story.`;

  try {
    const response = await client.chat.completions.create({
      model:      MODEL,
      max_tokens: 512,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMessage },
      ],
    });

    const raw  = response.choices[0]?.message?.content ?? "";
    const clean = raw.replace(/```json|```/g, "").trim();

    let parsed: { proverb: string; culturalContext: string; culture?: string };
    try {
      parsed = JSON.parse(clean);
    } catch {
      // Fallback — use raw text as proverb
      parsed = {
        proverb:         raw.trim().split("\n")[0]?.slice(0, 150) ?? "Wisdom lives in the telling.",
        culturalContext: "This proverb was distilled from your ancestral story.",
      };
    }

    return NextResponse.json({
      proverb:         parsed.proverb,
      culturalContext: parsed.culturalContext,
      culture:         parsed.culture,
      tokensUsed:      (response.usage?.prompt_tokens ?? 0) + (response.usage?.completion_tokens ?? 0),
    });
  } catch (err) {
    console.error("[Proverb Extract API]", err);
    return NextResponse.json(
      { error: "The vault is silent. Please try again." },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
