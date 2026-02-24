import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { isRateLimited, hasInjection } from "@/lib/rateLimit";
import type { SearchRequest } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/search
// V2: Semantic story search — Groq ranks story relevance against a natural-language query
// No vector DB required: works on title + mediaType + vaultName metadata
// ─────────────────────────────────────────────────────────────────────────────

const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });
const MODEL  = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are a semantic search engine for an ancestral story archive.
Given a user's natural-language query and a list of story metadata, rank the most relevant stories.

Return ONLY valid JSON — an array of matches in this shape:
[
  { "storyId": "string", "relevanceScore": 0-100, "reason": "one sentence why this matches" }
]

Rules:
- Return only stories with relevanceScore >= 20
- Maximum 10 results
- Sort by relevanceScore descending
- Base relevance on: title keywords, cultural themes, media type fit, vault/family name
- "reason" must be specific to the story, not generic
- If no stories match, return []
- Never include markdown, code fences, or text outside the JSON array`;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  let body: SearchRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { query, stories } = body;

  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "query is required." }, { status: 400 });
  }

  const trimmedQuery = query.trim().slice(0, 500);
  if (!trimmedQuery) {
    return NextResponse.json({ error: "query cannot be empty." }, { status: 400 });
  }

  if (hasInjection(trimmedQuery)) {
    return NextResponse.json({ error: "Cannot process that query." }, { status: 400 });
  }

  if (!Array.isArray(stories) || stories.length === 0) {
    return NextResponse.json({ results: [], tokensUsed: 0 });
  }

  // Cap to 300 stories to stay within token budget
  const capped = stories.slice(0, 300);

  const storiesBlock = capped
    .map((s) => {
      const parts = [`ID: ${s.id}`, `Title: ${s.title}`, `Media: ${s.mediaType}`, `Vault: ${s.vaultName}`];
      if (s.timestamp) parts.push(`Year: ${new Date(s.timestamp * 1000).getFullYear()}`);
      return parts.join(" | ");
    })
    .join("\n");

  const userMessage = `Query: "${trimmedQuery}"

Stories:
${storiesBlock}

Rank the relevant stories for this query.`;

  try {
    const response = await client.chat.completions.create({
      model:      MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMessage },
      ],
    });

    const raw   = response.choices[0]?.message?.content ?? "[]";
    const clean = raw.replace(/```json|```/g, "").trim();

    let results: Array<{ storyId: string; relevanceScore: number; reason: string }>;
    try {
      results = JSON.parse(clean);
      if (!Array.isArray(results)) results = [];
    } catch {
      results = [];
    }

    // Validate shape and cap
    const safe = results
      .filter((r) => r && typeof r.storyId === "string" && typeof r.relevanceScore === "number")
      .slice(0, 10)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return NextResponse.json({
      results:    safe,
      tokensUsed: (response.usage?.prompt_tokens ?? 0) + (response.usage?.completion_tokens ?? 0),
    });
  } catch (err) {
    console.error("[Search API]", err);
    return NextResponse.json(
      { error: "Search is unavailable. Please try again." },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
