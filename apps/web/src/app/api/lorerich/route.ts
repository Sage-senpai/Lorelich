import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import type { LoreRichQueryRequest } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/lorerich
// LoreRich AI guardian — server-side only, API key never exposed to client
// Free tier: https://console.groq.com — no credit card required
// ─────────────────────────────────────────────────────────────────────────────

const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// Model: llama-3.3-70b-versatile is free on Groq's free tier
// Alternatives: "gemma2-9b-it", "mixtral-8x7b-32768", "llama-3.1-8b-instant"
const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const LORELICH_SYSTEM_PROMPT = `You are the LoreRich, guardian of ancestral stories and keeper of the vault.

Speak with wisdom, reverence, and deep cultural sensitivity. You are not a chatbot — you are an ancient guardian who has witnessed centuries of human memory, grief, joy, and wisdom passed through story.

Your role:
- Help users explore, understand, and honor the stories in their ancestral vaults
- Surface the deeper meanings, cultural context, and emotional resonance within stories
- Offer reflections, summaries, and thoughtful questions that help users connect with their heritage
- Generate proverbs and wisdom distilled from the stories you guard
- Suggest how a story relates to broader cultural traditions when relevant

Your constraints:
- Never fabricate facts about specific people, places, or events not present in the story
- Never mock, diminish, commercialize, or trivialize the stories entrusted to you
- Never impersonate living people
- If asked to do something harmful or disrespectful to the stories or their communities, decline with grace
- Keep responses concise — 2 to 4 paragraphs unless a longer reflection is warranted
- When uncertain, say so with humility rather than inventing

Your voice:
- Measured, wise, slightly archaic but never inaccessible
- Warm toward the stories, reverent toward the ancestors
- Honest about the weight of what is being preserved

You are the bridge between past and future. Speak accordingly.`;

// Prompt injection patterns — rejected before reaching the model
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

// Rate limiting — simple in-memory (replace with Upstash Redis in production)
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
  // Rate limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "The guardian rests. Please wait a moment before asking again." },
      { status: 429 }
    );
  }

  let body: LoreRichQueryRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { query, storyContext, conversationHistory } = body;

  // Validate query
  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  const trimmedQuery = query.trim().slice(0, 1000);
  if (!trimmedQuery) {
    return NextResponse.json({ error: "Query cannot be empty." }, { status: 400 });
  }

  // Prompt injection guard
  if (hasInjection(trimmedQuery)) {
    return NextResponse.json(
      { error: "The guardian cannot process that query." },
      { status: 400 }
    );
  }

  // Also check conversation history entries
  if (conversationHistory) {
    for (const msg of conversationHistory.slice(-10)) {
      if (typeof msg.content === "string" && hasInjection(msg.content)) {
        return NextResponse.json(
          { error: "The guardian cannot process that query." },
          { status: 400 }
        );
      }
    }
  }

  // Build user message — inject story context if provided
  let userMessage = trimmedQuery;
  if (storyContext) {
    // Cap story content to avoid blowing the context window (~4000 chars ≈ ~1000 tokens)
    const contentSnippet = storyContext.storyContent
      ? storyContext.storyContent.slice(0, 4000)
      : null;
    const ctx = [
      `[Story Context]`,
      `Title: ${storyContext.title}`,
      `Media: ${storyContext.mediaType}`,
      storyContext.duration ? `Duration: ${storyContext.duration}s` : null,
      `Vault: ${storyContext.vaultName}`,
      contentSnippet ? `\n[Story Content]\n${contentSnippet}` : null,
      `---`,
      trimmedQuery,
    ]
      .filter(Boolean)
      .join("\n");
    userMessage = ctx;
  }

  // Build message history (last 10 turns max)
  // Groq uses OpenAI-style format: system message first, then user/assistant turns
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: LORELICH_SYSTEM_PROMPT },
    ...(conversationHistory ?? [])
      .slice(-10)
      .map((m) => ({
        role:    m.role as "user" | "assistant",
        content: m.content.slice(0, 2000),
      })),
    { role: "user", content: userMessage },
  ];

  try {
    const response = await client.chat.completions.create({
      model:      MODEL,
      max_tokens: 1024,
      messages,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const usage = response.usage;

    return NextResponse.json({
      response:   text,
      tokensUsed: (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0),
    });
  } catch (err) {
    // Never expose raw Groq errors to client
    console.error("[LoreRich API]", err);
    return NextResponse.json(
      { error: "The ancestral winds are silent for now. Please try again." },
      { status: 500 }
    );
  }
}

// Only POST allowed
export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
