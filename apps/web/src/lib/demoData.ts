// ─────────────────────────────────────────────────────────────────────────────
// Demo / Sample Data
// DISCLAIMER: All content below is fictional and for demonstration purposes only.
// No real ancestral records are represented. Real data is stored on 0G Galileo Testnet.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Vault, StoryMetadata, LicensableStory, LicenseTerms,
  GenealogyTree, StoryProverb,
} from "@/types";

export const DEMO_UPLOADER = "0x0000000000000000000000000000000000000001" as `0x${string}`;

// Demo vault IDs occupy the 9900–9999 range — will never collide with real on-chain IDs
export const DEMO_VAULT_IDS = [9901n, 9902n, 9903n];

export function isDemoId(id: bigint | string): boolean {
  const n = typeof id === "bigint" ? id : BigInt(String(id));
  return n >= 9000n && n <= 9999n;
}

// ─── Vaults ───────────────────────────────────────────────────────────────────

export const DEMO_VAULTS: Vault[] = [
  {
    id:         9901n,
    owner:      DEMO_UPLOADER,
    name:       "Okafor Family Chronicles",
    isPrivate:  false,
    storyCount: 3n,
    createdAt:  1705276800n, // Jan 2024
  },
  {
    id:         9902n,
    owner:      DEMO_UPLOADER,
    name:       "Rivera Heritage Archive",
    isPrivate:  false,
    storyCount: 2n,
    createdAt:  1710979200n, // Mar 2024
  },
  {
    id:         9903n,
    owner:      DEMO_UPLOADER,
    name:       "Mensah Ancestral Records",
    isPrivate:  false,
    storyCount: 1n,
    createdAt:  1717200000n, // Jun 2024
  },
];

// ─── Stories ──────────────────────────────────────────────────────────────────

export const DEMO_STORIES: StoryMetadata[] = [
  {
    id:               9001n,
    uploader:         DEMO_UPLOADER,
    vaultId:          9901n,
    zgRootHash:       "0xdemo001",
    mediaType:        "audio",
    duration:         342n,
    isPrivate:        false,
    timestamp:        1707523200n, // Feb 2024
    title:            "The Night My Grandmother Crossed the River",
    encryptedKeyHash: "",
  },
  {
    id:               9002n,
    uploader:         DEMO_UPLOADER,
    vaultId:          9901n,
    zgRootHash:       "0xdemo002",
    mediaType:        "text",
    duration:         0n,
    isPrivate:        false,
    timestamp:        1708300800n,
    title:            "Okafor Clan — The Battle of Adansi, 1943",
    encryptedKeyHash: "",
  },
  {
    id:               9003n,
    uploader:         DEMO_UPLOADER,
    vaultId:          9901n,
    zgRootHash:       "0xdemo003",
    mediaType:        "image",
    duration:         0n,
    isPrivate:        false,
    timestamp:        1709596800n,
    title:            "Portrait of Great-Grandmother Adaeze, 1931",
    encryptedKeyHash: "",
  },
  {
    id:               9004n,
    uploader:         DEMO_UPLOADER,
    vaultId:          9902n,
    zgRootHash:       "0xdemo004",
    mediaType:        "audio",
    duration:         501n,
    isPrivate:        false,
    timestamp:        1712880000n, // Apr 2024
    title:            "My Father's Workshop Songs (Guadalajara, 1965)",
    encryptedKeyHash: "",
  },
  {
    id:               9005n,
    uploader:         DEMO_UPLOADER,
    vaultId:          9902n,
    zgRootHash:       "0xdemo005",
    mediaType:        "text",
    duration:         0n,
    isPrivate:        false,
    timestamp:        1714694400n, // May 2024
    title:            "The Lost Recipe of Abuela María",
    encryptedKeyHash: "",
  },
  {
    id:               9006n,
    uploader:         DEMO_UPLOADER,
    vaultId:          9903n,
    zgRootHash:       "0xdemo006",
    mediaType:        "video",
    duration:         187n,
    isPrivate:        false,
    timestamp:        1718409600n, // Jun 2024
    title:            "Tribal Dance of the Ndebele People",
    encryptedKeyHash: "",
  },
];

export const DEMO_STORY_MAP: Record<string, StoryMetadata[]> = {
  "9901": DEMO_STORIES.filter((s) => s.vaultId === 9901n),
  "9902": DEMO_STORIES.filter((s) => s.vaultId === 9902n),
  "9903": DEMO_STORIES.filter((s) => s.vaultId === 9903n),
};

// ─── License Terms ─────────────────────────────────────────────────────────────

const FREE_TERMS: LicenseTerms = {
  isLicensable:        true,
  commercialUse:       false,
  exclusiveAvailable:  false,
  royaltyWei:          0n,
  exclusiveRoyaltyWei: 0n,
  maxLicenses:         10n,
  jurisdictionNote:    "Nigeria",
  setAt:               1707523200n,
};

const COMMERCIAL_TERMS: LicenseTerms = {
  isLicensable:        true,
  commercialUse:       true,
  exclusiveAvailable:  true,
  royaltyWei:          500000000000000000n,  // 0.5 OG
  exclusiveRoyaltyWei: 2000000000000000000n, // 2.0 OG
  maxLicenses:         5n,
  jurisdictionNote:    "Mexico / International",
  setAt:               1712880000n,
};

const DOCUMENTARY_TERMS: LicenseTerms = {
  isLicensable:        true,
  commercialUse:       true,
  exclusiveAvailable:  false,
  royaltyWei:          200000000000000000n, // 0.2 OG
  exclusiveRoyaltyWei: 0n,
  maxLicenses:         3n,
  jurisdictionNote:    "Zimbabwe / South Africa",
  setAt:               1718409600n,
};

// ─── Marketplace Items ─────────────────────────────────────────────────────────

export type DemoLicensableStory = LicensableStory & { _demo: true; vaultName: string };

export const DEMO_MARKETPLACE_ITEMS: DemoLicensableStory[] = [
  { story: DEMO_STORIES[0], terms: FREE_TERMS,        _demo: true, vaultName: "Okafor Family Chronicles" },
  { story: DEMO_STORIES[1], terms: FREE_TERMS,        _demo: true, vaultName: "Okafor Family Chronicles" },
  { story: DEMO_STORIES[2], terms: FREE_TERMS,        _demo: true, vaultName: "Okafor Family Chronicles" },
  { story: DEMO_STORIES[3], terms: COMMERCIAL_TERMS,  _demo: true, vaultName: "Rivera Heritage Archive" },
  { story: DEMO_STORIES[4], terms: COMMERCIAL_TERMS,  _demo: true, vaultName: "Rivera Heritage Archive" },
  { story: DEMO_STORIES[5], terms: DOCUMENTARY_TERMS, _demo: true, vaultName: "Mensah Ancestral Records" },
];

// Vault name lookup for demo items (keyed by vaultId)
export const DEMO_VAULT_NAME_MAP: Record<string, string> = {
  "9901": "Okafor Family Chronicles",
  "9902": "Rivera Heritage Archive",
  "9903": "Mensah Ancestral Records",
};

// ─── Genealogy Tree ────────────────────────────────────────────────────────────

export const DEMO_TREE: GenealogyTree = {
  importedAt: 1705276800000,
  ancestors: [
    {
      id:            "@I001@",
      givenName:     "Chukwuemeka",
      surname:       "Okafor",
      birthYear:     1890,
      deathYear:     1972,
      birthPlace:    "Enugu, Nigeria",
      parentIds:     [],
      spouseIds:     ["@I002@"],
      childIds:      ["@I003@", "@I004@"],
      linkedStoryIds: ["9002"],
    },
    {
      id:            "@I002@",
      givenName:     "Adaeze",
      surname:       "Okafor",
      birthYear:     1895,
      deathYear:     1978,
      birthPlace:    "Awka, Nigeria",
      parentIds:     [],
      spouseIds:     ["@I001@"],
      childIds:      ["@I003@", "@I004@"],
      linkedStoryIds: ["9003"],
    },
    {
      id:            "@I003@",
      givenName:     "Nnamdi",
      surname:       "Okafor",
      birthYear:     1922,
      deathYear:     1989,
      birthPlace:    "Enugu, Nigeria",
      parentIds:     ["@I001@", "@I002@"],
      spouseIds:     ["@I005@"],
      childIds:      ["@I006@"],
      linkedStoryIds: [],
    },
    {
      id:            "@I004@",
      givenName:     "Chinwe",
      surname:       "Okafor",
      birthYear:     1925,
      deathYear:     2003,
      birthPlace:    "Enugu, Nigeria",
      parentIds:     ["@I001@", "@I002@"],
      spouseIds:     [],
      childIds:      [],
      linkedStoryIds: ["9001"],
    },
    {
      id:            "@I005@",
      givenName:     "Ngozi",
      surname:       "Eze",
      birthYear:     1928,
      deathYear:     1995,
      birthPlace:    "Onitsha, Nigeria",
      parentIds:     [],
      spouseIds:     ["@I003@"],
      childIds:      ["@I006@"],
      linkedStoryIds: [],
    },
    {
      id:            "@I006@",
      givenName:     "Emeka",
      surname:       "Okafor",
      birthYear:     1955,
      birthPlace:    "Lagos, Nigeria",
      parentIds:     ["@I003@", "@I005@"],
      spouseIds:     [],
      childIds:      [],
      linkedStoryIds: [],
    },
  ],
};

// ─── Proverbs ──────────────────────────────────────────────────────────────────

export const DEMO_PROVERBS: StoryProverb[] = [
  {
    id:              "demo-proverb-1",
    storyId:         "9001",
    storyTitle:      "The Night My Grandmother Crossed the River",
    vaultName:       "Okafor Family Chronicles",
    proverb:         "When the river speaks at night, only the brave listen — and only the wise remember.",
    culturalContext: "Igbo oral tradition teaches that rivers are liminal spaces between worlds. Crossing one at night symbolises the threshold between old and new life — survival through courage, not just strength.",
    culture:         "Igbo (Nigeria)",
    extractedAt:     Date.now() - 86400000 * 5,
  },
  {
    id:              "demo-proverb-2",
    storyId:         "9002",
    storyTitle:      "Okafor Clan — The Battle of Adansi, 1943",
    vaultName:       "Okafor Family Chronicles",
    proverb:         "A man who fights for land loses soil. A man who fights for memory inherits the earth.",
    culturalContext: "West African proverbs around conflict distinguish between material and spiritual victory. The elders preserved not the battle details but the lesson it encoded about unity across clan lines.",
    culture:         "Akan / Igbo (Ghana, Nigeria)",
    extractedAt:     Date.now() - 86400000 * 3,
  },
  {
    id:              "demo-proverb-3",
    storyId:         "9005",
    storyTitle:      "The Lost Recipe of Abuela María",
    vaultName:       "Rivera Heritage Archive",
    proverb:         "What the hands remembered, the heart never forgot. Cook with memory, and you feed more than the body.",
    culturalContext: "Mexican culinary tradition is deeply tied to family identity. Recipes passed orally carry not just ingredients but ritual — the specific order, the season, the person who first taught the gesture.",
    culture:         "Mexican (Jalisco)",
    extractedAt:     Date.now() - 86400000 * 1,
  },
  {
    id:              "demo-proverb-4",
    storyId:         "9006",
    storyTitle:      "Tribal Dance of the Ndebele People",
    vaultName:       "Mensah Ancestral Records",
    proverb:         "The drum does not ask who is listening. It speaks anyway — and the ancestors answer.",
    culturalContext: "Among the Ndebele, communal dance is understood as a conversation with the spiritual world. The rhythm is the language; the body is the messenger. Silence is never the response — the past always speaks back.",
    culture:         "Ndebele (Zimbabwe / South Africa)",
    extractedAt:     Date.now() - 3600000 * 2,
  },
];

// ─── Search Corpus ─────────────────────────────────────────────────────────────

export const DEMO_SEARCH_CORPUS = DEMO_STORIES.map((s) => ({
  id:        s.id.toString(),
  title:     s.title,
  mediaType: s.mediaType,
  vaultName: DEMO_VAULT_NAME_MAP[s.vaultId.toString()] ?? "Demo Vault",
  timestamp: Number(s.timestamp),
  _demo:     true as const,
}));
