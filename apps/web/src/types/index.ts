// ─────────────────────────────────────────────────────────────────────────────
// Core Domain Types for LoreRich Vault
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

export interface LoreRichMessage {
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
  | "stored_0g"      // 0G upload done — waiting for on-chain registration
  | "confirming_tx"
  | "minting"
  | "complete"
  | "error";

/** A story that has been stored on 0G but not yet registered on-chain. */
export interface PendingStory {
  localId:          string;   // crypto.randomUUID() — local temp ID
  vaultId:          string;   // bigint serialised as string
  zgRootHash:       string;
  title:            string;
  mediaType:        string;
  duration:         number;
  encryptedKeyHash: string;
  tokenURI:         string;   // pre-built, ready for contract call
  savedAt:          number;   // Date.now()
  uploaderAddress:  string;
}

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

export interface LoreRichQueryRequest {
  query: string;
  storyContext?: {
    title: string;
    mediaType: string;
    duration?: number;
    vaultName: string;
    storyContent?: string;
  };
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface LoreRichQueryResponse {
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

// ─────────────────────────────────────────────────────────────────────────────
// V2.2: Story Tags (0G KV Store / localStorage)
// ─────────────────────────────────────────────────────────────────────────────

export interface StoryTagsEntry {
  rootHash: string;
  tags:     string[];  // e.g. ["oral history", "1940s", "Nigeria"]
  updatedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// V2.2: Transcript (Groq Whisper)
// ─────────────────────────────────────────────────────────────────────────────

export interface TranscriptEntry {
  rootHash:      string;
  text:          string;
  language?:     string;
  generatedAt:   number;
}

export interface TranscriptRequest {
  rootHash: string;
  language?: string;
}

export interface TranscriptResponse {
  text:     string;
  language?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// V2.5: Lore Comic Universe
// ─────────────────────────────────────────────────────────────────────────────

export interface LoreCharacter {
  id:             string;           // crypto.randomUUID()
  name:           string;
  walletAddress?: string;           // optional wallet identity link
  traits:         string[];         // e.g. ["elder", "warrior", "healer"]
  description:    string;
  appearedIn:     string[];         // zgRootHash[] of comics this char appears in
  createdAt:      number;
}

export interface LoreDialogue {
  character: string;
  line:      string;
}

export interface LorePanel {
  number:     number;
  scene:      string;               // visual description for an artist
  characters: string[];             // character names present in this panel
  dialogue:   LoreDialogue[];
  mood:       string;               // tense | joyful | mysterious | triumphant | melancholic | haunting
  caption?:   string;               // narrator box (optional)
}

export interface LoreComic {
  id:            string;            // crypto.randomUUID() — local ID
  title:         string;
  tagline:       string;
  genre:         string;
  theme:         string;            // the moral/thematic core
  panels:        LorePanel[];
  characters:    LoreCharacter[];
  sourceText:    string;            // story text used as input
  prompt:        string;            // user's genre/direction prompt
  createdBy:     string;            // wallet address
  collaborators: string[];          // co-creator addresses (collab comics)
  createdAt:     number;
  zgRootHash?:   string;            // set after 0G upload; enables share URL
  nftTokenId?:   string;            // stringified bigint; set after mint
}

export interface LoreGenerateRequest {
  sourceText: string;               // max 3000 chars
  characters: Array<{
    name:           string;
    traits:         string[];
    description:    string;
    walletAddress?: string;
  }>;
  genre:           string;
  prompt:          string;
  creatorAddress?: string;
}

export interface LoreGenerateResponse {
  title:      string;
  tagline:    string;
  theme:      string;
  panels:     LorePanel[];
  characters: Array<{ name: string; expandedDescription: string; traits: string[] }>;
  tokensUsed: number;
}

export interface LoreMergeRequest {
  loreA: { sourceText: string; characters: LoreGenerateRequest["characters"]; ownerAddress: string };
  loreB: { sourceText: string; characters: LoreGenerateRequest["characters"]; ownerAddress: string };
  genre:         string;
  mergePrompt?:  string;
}

// ─────────────────────────────────────────────────────────────────────────────
// V2.5+: Educational Comics (UNICEF-inspired)
// ─────────────────────────────────────────────────────────────────────────────

export type EduAgeMode = "young-learners" | "explorers";

export interface EduComicRequest {
  sourceText:      string;   // max 3000 chars — story/lore to adapt
  region?:         string;   // e.g. "West Africa", "South Asia" — cultural focus
  culture?:        string;   // e.g. "Yoruba", "Tamil"
  topic?:          string;   // e.g. "respect for elders", "harvest traditions"
  ageMode:         EduAgeMode;
  creatorAddress?: string;
}

export interface EduComicResponse {
  title:       string;
  tagline:     string;
  theme:       string;
  lesson:      string;          // moral / learning outcome
  panels:      LorePanel[];
  characters:  Array<{ name: string; expandedDescription: string; traits: string[] }>;
  discussion?: string[];        // discussion questions (explorers mode only)
  tokensUsed:  number;
}

// ─────────────────────────────────────────────────────────────────────────────
// V2.5+: Public Lore (vault owner opts stories into public learning)
// ─────────────────────────────────────────────────────────────────────────────

export interface PublicLoreEntry {
  storyId:     string;
  title:       string;
  vaultName:   string;
  mediaType:   string;
  region?:     string;
  culture?:    string;
  isEducational: boolean;
  sharedAt:    number;
}
