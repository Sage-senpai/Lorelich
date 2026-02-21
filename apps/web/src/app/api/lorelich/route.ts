import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { LoreLichQueryRequest } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/lorelich
// LoreLich AI guardian — server-side only, API key never exposed to client
// ─────────────────────────────────────────────────────────────────────────────

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const LORELICH_SYSTEM_PROMPT = `You are the LoreLich, guardian of ancestral stories and keeper of the vault.

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

// Prompt injection patterns — rejected before reaching Claude
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

  let body: LoreLichQueryRequest;
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
    const ctx = [
      `[Story Context]`,
      `Title: ${storyContext.title}`,
      `Media: ${storyContext.mediaType}`,
      storyContext.duration ? `Duration: ${storyContext.duration}s` : null,
      `Vault: ${storyContext.vaultName}`,
      `---`,
      trimmedQuery,
    ]
      .filter(Boolean)
      .join("\n");
    userMessage = ctx;
  }

  // Build message history (last 10 turns max)
  const history: Anthropic.MessageParam[] = [
    ...(conversationHistory ?? [])
      .slice(-10)
      .map((m) => ({
        role:    m.role as "user" | "assistant",
        content: m.content.slice(0, 2000), // truncate history entries
      })),
    { role: "user", content: userMessage },
  ];

  try {
    const response = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 1024,
      system:     LORELICH_SYSTEM_PROMPT,
      messages:   history,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({
      response:   text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    });
  } catch (err) {
    // Never expose raw Anthropic errors to client
    console.error("[LoreLich API]", err);
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
