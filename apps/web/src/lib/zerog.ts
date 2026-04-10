// ─────────────────────────────────────────────────────────────────────────────
// 0G Storage — client-side wrapper
// Calls /api/upload (server-side) which uses @0gfoundation/0g-ts-sdk.
// The SDK is Node-only (uses fs, node:crypto), so it cannot run in-browser.
// ─────────────────────────────────────────────────────────────────────────────

import type { ZeroGUploadResult } from "@/types";

// File size limits (bytes)
const MAX_SIZE: Record<string, number> = {
  audio: 200 * 1024 * 1024,  // 200 MB
  video: 500 * 1024 * 1024,  // 500 MB
  text:   10 * 1024 * 1024,  //  10 MB
  image:  50 * 1024 * 1024,  //  50 MB
};

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  audio: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/ogg", "audio/flac"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  text:  [
    "text/plain",
    "text/markdown",
    "text/html",
    "application/json",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/rtf",
    "text/rtf",
    // Some browsers report DOCX/RTF as generic types — included so
    // extension-based validation below can accept them
    "application/zip",          // DOCX on Chrome/Safari
    "application/octet-stream", // Generic binary fallback
  ],
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
};

// Known-safe text file extensions — used as fallback when browser reports a
// generic MIME type (application/zip, application/octet-stream, etc.)
const TEXT_EXTENSIONS = new Set([
  "txt", "md", "html", "htm", "json", "pdf", "docx", "doc", "rtf", "csv",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Validation (client-side, before upload)
// ─────────────────────────────────────────────────────────────────────────────

export function validateFile(file: File, mediaType: string): void {
  const maxSize = MAX_SIZE[mediaType];
  if (!maxSize) throw new Error(`Unsupported media type: ${mediaType}`);
  if (file.size > maxSize) {
    throw new Error(
      `File too large. Max ${maxSize / (1024 * 1024)}MB for ${mediaType}.`
    );
  }

  const allowed = ALLOWED_MIME_TYPES[mediaType];
  if (allowed && !allowed.includes(file.type)) {
    // Extension-based fallback: some browsers report DOCX/RTF/PDF as
    // application/zip or application/octet-stream. If the extension is
    // a known text format and mediaType is "text", let it through.
    if (mediaType === "text") {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      if (TEXT_EXTENSIONS.has(ext)) return;
    }
    throw new Error(`File type "${file.type}" not supported. Please use a supported format.`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload — POSTs file to /api/upload (server handles 0G SDK)
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadToZeroG(
  fileData: Uint8Array,
  fileName: string,
  onProgress?: (pct: number) => void
): Promise<ZeroGUploadResult> {
  onProgress?.(10);

  // Copy to fresh ArrayBuffer to satisfy TS 5.7+ strict BlobPart types
  const buf = new ArrayBuffer(fileData.byteLength);
  new Uint8Array(buf).set(fileData);
  const blob     = new Blob([buf]);
  const formData = new FormData();
  formData.append("file", blob, fileName);

  onProgress?.(25);

  const res = await fetch("/api/upload", {
    method: "POST",
    body:   formData,
  });

  onProgress?.(80);

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "0G upload failed.");
  }

  const { rootHash, txHash } = await res.json();
  onProgress?.(100);

  return { rootHash, txHash };
}
