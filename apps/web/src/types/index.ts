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

// ─────────────────────────────────────────────────────────────────────────────
// Feature A: IP Licensing
// ─────────────────────────────────────────────────────────────────────────────

export type LicenseType   = "PERSONAL" | "DOCUMENTARY" | "COMMERCIAL" | "EXCLUSIVE";
export type LicenseStatus = "PENDING"  | "APPROVED"   | "REJECTED"   | "REVOKED";

export interface LicenseTerms {
  isLicensable:        boolean;
  commercialUse:       boolean;
  exclusiveAvailable:  boolean;
  royaltyWei:          bigint;
  exclusiveRoyaltyWei: bigint;
  maxLicenses:         bigint;
  jurisdictionNote:    string;
  setAt:               bigint;
}

export interface LicenseRequest {
  requestId:   bigint;
  storyId:     bigint;
  licensee:    `0x${string}`;
  licenseType: LicenseType;
  status:      LicenseStatus;
  requestedAt: bigint;
  respondedAt: bigint;
  expiresAt:   bigint;
  purposeNote: string;
  amountPaid:  bigint;
}

export interface LicensableStory {
  story: StoryMetadata;
  terms: LicenseTerms;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature C: Documentary Pitch Portal
// ─────────────────────────────────────────────────────────────────────────────

export interface FilmPitchBrief {
  storyId:        string;
  logline:        string;
  synopsis:       string;
  themes:         string[];
  visualApproach: string;
  comparables:    string[];
  targetAudience: string;
  generatedAt:    number;
}

export interface PitchGenerateRequest {
  storyId:   string;
  title:     string;
  mediaType: string;
  vaultName: string;
  themes?:   string[];
}

export interface PitchGenerateResponse {
  brief:      FilmPitchBrief;
  tokensUsed: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature D: Genealogy Tree
// ─────────────────────────────────────────────────────────────────────────────

export interface Ancestor {
  id:              string;   // GEDCOM xref id, e.g. "@I001@"
  givenName:       string;
  surname:         string;
  birthYear?:      number;
  deathYear?:      number;
  birthPlace?:     string;
  parentIds:       string[];
  spouseIds:       string[];
  childIds:        string[];
  linkedStoryIds:  string[]; // user-confirmed story links (stringified bigints)
}

export interface AncestorLink {
  ancestorId:  string;
  storyId:     string;
  confidence:  "high" | "medium" | "low";
  reason:      string;
}

export interface GenealogyTree {
  ancestors:   Ancestor[];
  rawGedcom?:  string;
  importedAt:  number;
}

export interface GenealogySuggestRequest {
  ancestors: Array<{
    id:         string;
    givenName:  string;
    surname:    string;
    birthYear?: number;
    birthPlace?: string;
  }>;
  stories: Array<{
    id:        string;
    title:     string;
    vaultName: string;
  }>;
}

export interface GenealogySuggestResponse {
  links:      AncestorLink[];
  tokensUsed: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// V2: Proverb Engine
// ─────────────────────────────────────────────────────────────────────────────

export interface StoryProverb {
  id:              string;   // crypto.randomUUID()
  storyId:         string;
  storyTitle:      string;
  vaultName:       string;
  proverb:         string;
  culturalContext: string;
  culture?:        string;
  extractedAt:     number;
}

export interface ProverbExtractRequest {
  storyId:   string;
  storyText: string;  // plaintext passage (max 2000 chars)
  title:     string;
  vaultName: string;
}

export interface ProverbExtractResponse {
  proverb:         string;
  culturalContext: string;
  culture?:        string;
  tokensUsed:      number;
}

// ─────────────────────────────────────────────────────────────────────────────
// V2: Semantic Search
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchStoryInput {
  id:         string;
  title:      string;
  mediaType:  string;
  vaultName:  string;
  timestamp?: number;
}

export interface SearchRequest {
  query:   string;
  stories: SearchStoryInput[];
}

export interface SearchResult {
  storyId:        string;
  relevanceScore: number; // 0–100
  reason:         string;
}

export interface SearchResponse {
  results:    SearchResult[];
  tokensUsed: number;
}
