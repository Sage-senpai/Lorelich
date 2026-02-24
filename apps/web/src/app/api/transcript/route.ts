import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { toFile } from "groq-sdk/uploads";
import { Indexer } from "@0glabs/0g-ts-sdk";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as crypto from "crypto";
import { isRateLimited } from "@/lib/rateLimit";
import type { TranscriptRequest, TranscriptResponse } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/transcript
// Transcribes an audio story from 0G Storage using Groq Whisper.
//
// Flow:
//   1. Download audio bytes from 0G Storage via Indexer.download()
//   2. Wrap bytes in a toFile() uploadable for the Groq SDK
//   3. POST to Groq audio.transcriptions.create() → text
//   4. Return { text, language }
//
// The client caches the result in localStorage keyed by rootHash.
// Rate limit: shared 10 RPM per IP.
// ─────────────────────────────────────────────────────────────────────────────

const INDEXER_URL = process.env.NEXT_PUBLIC_0G_INDEXER_URL ?? "";
const ROOT_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

const client = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// 25 MB cap — Groq Whisper free tier limit
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit reached. Please wait a moment." },
      { status: 429 }
    );
  }

  let body: TranscriptRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { rootHash, language } = body;

  if (!rootHash || !ROOT_HASH_RE.test(rootHash)) {
    return NextResponse.json({ error: "Invalid rootHash." }, { status: 400 });
  }
  if (!INDEXER_URL) {
    return NextResponse.json(
      { error: "0G indexer not configured on this server." },
      { status: 503 }
    );
  }

  const tmpPath = path.join(os.tmpdir(), `lorelich-tx-${crypto.randomUUID()}.mp3`);

  try {
    // Step 1: Download audio from 0G Storage
    const indexer = new Indexer(INDEXER_URL);
    const dlErr = await indexer.download(rootHash, tmpPath, false);
    if (dlErr) throw dlErr;

    // Check file size before sending to Groq
    const stat = await fsPromises.stat(tmpPath);
    if (stat.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: `Audio file too large for transcription (${Math.round(stat.size / 1024 / 1024)} MB). Limit is 25 MB.` },
        { status: 413 }
      );
    }

    // Step 2: Wrap in an uploadable file for Groq
    // toFile() creates a File-like object with name+MIME type for multipart upload.
    // The .mp3 extension helps Whisper detect the format. Groq also uses magic bytes.
    const audioFile = await toFile(fs.createReadStream(tmpPath), "audio.mp3", {
      type: "audio/mpeg",
    });

    // Step 3: Transcribe via Groq Whisper
    const transcription = await client.audio.transcriptions.create({
      file:     audioFile,
      model:    "whisper-large-v3",
      language: language ?? undefined,
      response_format: "json",
    });

    const result: TranscriptResponse = {
      text:     transcription.text,
      language: language,
    };

    return NextResponse.json(result);
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    console.error("[Transcript API] failed:", msg);
    return NextResponse.json(
      { error: `Transcription failed: ${msg}` },
      { status: 502 }
    );
  } finally {
    fsPromises.unlink(tmpPath).catch(() => {});
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
