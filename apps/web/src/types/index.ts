// ─────────────────────────────────────────────────────────────────────────────
// Core Domain Types for LoreLich Vault
// ─────────────────────────────────────────────────────────────────────────────

export type MediaType = "audio" | "video" | "text" | "image";

export interface Vault {
  id: bigint;
  owner: `0x${string}`;
  name: string;
  isPrivate: boolean;
  storyCount: bigint;
  createdAt: bigint;
}

export interface StoryMetadata {
  id: bigint;
  uploader: `0x${string}`;
  vaultId: bigint;
  zgRootHash: string;
  mediaType: string;
  duration: bigint;
  isPrivate: boolean;
  timestamp: bigint;
  title: string;
  encryptedKeyHash: string;
}

export interface StoryUploadParams {
  vaultId: bigint;
  file: File;
  title: string;
  mediaType: MediaType;
  duration: number;
  isPrivate: boolean;
  tokenURI: string;
}

export interface ZeroGUploadResult {
  rootHash: string;
  txHash: string;
}

export interface EncryptedBlob {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  salt: Uint8Array;
}

export interface LoreLichMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface VaultCard {
  vault: Vault;
  previewStory?: StoryMetadata;
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload State
// ─────────────────────────────────────────────────────────────────────────────

export type UploadStep =
  | "idle"
  | "encrypting"
  | "uploading_0g"
  | "confirming_tx"
  | "minting"
  | "complete"
  | "error";

export interface UploadState {
  step: UploadStep;
  progress: number; // 0–100
  error?: string;
  storyId?: bigint;
  zgRootHash?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LoreLichQueryRequest {
  query: string;
  storyContext?: {
    title: string;
    mediaType: string;
    duration?: number;
    vaultName: string;
  };
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface LoreLichQueryResponse {
  response: string;
  tokensUsed: number;
}
