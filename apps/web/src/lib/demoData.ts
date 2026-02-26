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

// ─── Demo Story Text Content ──────────────────────────────────────────────────
// Pre-written content for text-type demo stories — shown in StoryViewer
// when contentOverride is passed (no real 0G download needed).

export const DEMO_STORY_CONTENT: Record<string, string> = {
  // Story 9002: "Okafor Clan — The Battle of Adansi, 1943"
  "9002": `In the dry season of 1943, when the harmattan winds blew red dust across the hills of Enugu, my grandfather Chukwuemeka Okafor gathered every elder of the clan beneath the great iroko tree that stood at the centre of the compound. He was not a man who called meetings lightly. The last time he had done so, his youngest brother had died of fever. The time before that, there had been a dispute over land that took three seasons to resolve.

But this was different. A letter had arrived — not for him, for letters rarely came to our village in those days — but for the District Officer at the colonial post. Chukwuemeka had learned its contents from a kitchen servant who had overheard the reading. The British intended to conscript young men from the surrounding villages to serve in the war in Burma. Our young men, who had never left Enugu, who knew the cassava fields and the river crossings but not the oceans, were to be taken thousands of miles away.

"No son of the Okafor clan will die in a white man's war," my grandfather said. His voice was not angry. It was the quiet certainty of a man who had already decided.

What followed was not a battle in the way Europeans use that word. There were no weapons drawn, no blood spilled. It was a battle of stubbornness, of silence, of knowing where to place a man so that the District Officer could not find him, of making records wrong by accident, of a village that simply could not be counted. For six weeks, the colonial administrators attempted to conduct a census of able-bodied men between the ages of eighteen and thirty-five. For six weeks, the Okafor clan produced an endless succession of grandfathers, children, and men with remarkable ailments that resolved themselves the moment the census takers departed.

Not a single Okafor man was conscripted.

My grandfather never boasted of this. He said only: "We are not cowards. We simply had different battles to fight." He meant the fields, the families, the continuity of a people who had survived drought and flood and now this — men in uniforms who saw Africa as a resource rather than a home.

He lived to ninety-two. He outlasted the colonial post. He outlasted two District Officers and the entire administrative district they served. On the morning he died, the iroko tree — which had been there longer than anyone could remember — shed a ring of leaves in a perfect circle around its base, as if the earth itself was acknowledging his passing.

I do not know if that is true. My mother told me so. But in our family, we have learned that some truths are better held in story than in fact.`,

  // Story 9005: "The Lost Recipe of Abuela María"
  "9005": `The recipe was never written down. That was the first thing my grandmother told anyone who asked about it — not as a complaint, but as a matter of pride. "Writing a recipe," she would say, stirring the pot with the same wooden spoon her own mother had used, "is like writing down how to love someone. The words are never enough."

Abuela María de la Concepción Rivera was born in 1921 in a village forty kilometres east of Guadalajara, in the Mexican state of Jalisco. She learned to cook by standing beside her mother in a kitchen that smelled of chilli and woodsmoke and something else — something earthy and warm that I have spent my whole adult life trying to identify in other foods and have never quite found. I believe now that it was the smell of continuity. Of the same gestures repeated across generations.

The tamales were her signature. Not just any tamales — the Christmas tamales, the ones she made in the last week of December when the whole family gathered in her kitchen, which was really just a room off the main courtyard, open to the air on one side. She would begin the process three days before Christmas Eve. The chilli she used — a dried variety called pasilla negro — she would source from a specific vendor in the Mercado Corona who had been selling the same chillis, from the same farm in Oaxaca, for as long as anyone could remember. When that vendor died in 1987, Abuela María spent an entire year testing substitutes before she found a combination that satisfied her.

I am telling you this because when she died in 2008, we thought the recipe died with her.

My mother had watched her make the tamales every Christmas for sixty years. But watching and knowing are different things. She knew the colour the masa should be — a pale, almost golden yellow. She knew the consistency — "like damp clay, but lighter." She knew that the chilli sauce required exactly four dried chillis per kilo of pork, and that the pork should be shoulder, not leg, and that it should simmer for no less than three hours. What she did not know was the spice that gave the sauce its particular depth. There was something in there beyond cumin and oregano. Something smoky and slightly bitter that cut through the richness of the fat.

For fifteen years after Abuela María's death, my mother made the tamales every Christmas. They were good. They were not the same.

And then, in 2023, I was clearing out a box of my grandmother's things and I found it. Not a recipe — she would never have written a recipe. But a letter to her sister in Guadalajara, written in 1962, complaining about the price of a particular ingredient. "You cannot find cacao negro for a reasonable price anywhere in this city," she wrote. "The only way is to toast and grind it yourself, and who has time for that in December?"

Dark cacao. Toasted and ground. Not as flavour, but as depth.

I called my mother and read her the letter. She was silent for a long moment, and then she said: "That is what it was. I could never name it, but that is exactly what it was."

The tamales we made that Christmas were the closest we had come in fifteen years. They were not identical. I do not think they ever will be. A recipe, like a memory, changes slightly every time it passes from one person to another. But they were close enough that my mother cried, standing in her kitchen on Christmas Eve with a wooden spoon in her hand.

Close enough to be called the same recipe. Close enough to be called hers.`,
};

// ─── Search Corpus ─────────────────────────────────────────────────────────────

export const DEMO_SEARCH_CORPUS = DEMO_STORIES.map((s) => ({
  id:        s.id.toString(),
  title:     s.title,
  mediaType: s.mediaType,
  vaultName: DEMO_VAULT_NAME_MAP[s.vaultId.toString()] ?? "Demo Vault",
  timestamp: Number(s.timestamp),
  _demo:     true as const,
}));
