// ─────────────────────────────────────────────────────────────────────────────
// Contract Addresses — Update after deployment
// See docs/smart-contracts.md for deployment instructions
// ─────────────────────────────────────────────────────────────────────────────

export const LORE_VAULT_ADDRESS =
  (process.env.NEXT_PUBLIC_LORE_VAULT_ADDRESS as `0x${string}`) ?? "0x";

export const SOULBOUND_ADDRESS =
  (process.env.NEXT_PUBLIC_SOULBOUND_ADDRESS as `0x${string}`) ?? "0x";

export const LORE_IP_MODULE_ADDRESS =
  (process.env.NEXT_PUBLIC_LORE_IP_MODULE_ADDRESS as `0x${string}`) ?? "0x";

// ─────────────────────────────────────────────────────────────────────────────
// ABIs — minimal, only what the frontend calls
// ─────────────────────────────────────────────────────────────────────────────

export const LORE_VAULT_ABI = [
  // Write
  {
    name: "createVault",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name",      type: "string" },
      { name: "isPrivate", type: "bool"   },
    ],
    outputs: [{ name: "vaultId", type: "uint256" }],
  },
  {
    name: "uploadStory",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "p",
        type: "tuple",
        components: [
          { name: "vaultId",          type: "uint256" },
          { name: "zgRootHash",       type: "string"  },
          { name: "title",            type: "string"  },
          { name: "mediaType",        type: "string"  },
          { name: "duration",         type: "uint256" },
          { name: "encryptedKeyHash", type: "string"  },
          { name: "tokenURI",         type: "string"  },
        ],
      },
    ],
    outputs: [{ name: "storyId", type: "uint256" }],
  },
  {
    name: "grantAccess",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vaultId", type: "uint256"  },
      { name: "grantee", type: "address"  },
    ],
    outputs: [],
  },
  {
    name: "revokeAccess",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vaultId", type: "uint256"  },
      { name: "grantee", type: "address"  },
    ],
    outputs: [],
  },
  // Read
  {
    name: "vaults",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "vaultId", type: "uint256" }],
    outputs: [
      { name: "owner",      type: "address" },
      { name: "name",       type: "string"  },
      { name: "isPrivate",  type: "bool"    },
      { name: "storyCount", type: "uint256" },
      { name: "createdAt",  type: "uint256" },
    ],
  },
  {
    name: "stories",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "storyId", type: "uint256" }],
    outputs: [
      { name: "uploader",         type: "address" },
      { name: "vaultId",          type: "uint256" },
      { name: "zgRootHash",       type: "string"  },
      { name: "mediaType",        type: "string"  },
      { name: "duration",         type: "uint256" },
      { name: "isPrivate",        type: "bool"    },
      { name: "timestamp",        type: "uint256" },
      { name: "title",            type: "string"  },
      { name: "encryptedKeyHash", type: "string"  },
    ],
  },
  {
    name: "getVaultStories",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "vaultId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getOwnerVaults",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "hasAccess",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "vaultId", type: "uint256" },
      { name: "user",    type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "totalVaults",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalStories",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Custom errors — needed so viem decodes reverts instead of showing "Transaction failed"
  { name: "NotVaultOwner",    type: "error", inputs: [{ name: "vaultId", type: "uint256" }, { name: "caller",  type: "address" }] },
  { name: "VaultNotFound",    type: "error", inputs: [{ name: "vaultId", type: "uint256" }] },
  { name: "StoryNotFound",    type: "error", inputs: [{ name: "storyId", type: "uint256" }] },
  { name: "AccessDenied",     type: "error", inputs: [{ name: "vaultId", type: "uint256" }, { name: "caller",  type: "address" }] },
  { name: "MaxStoriesReached",type: "error", inputs: [{ name: "vaultId", type: "uint256" }] },
  { name: "MaxVaultsReached", type: "error", inputs: [{ name: "owner",   type: "address" }] },
  { name: "EmptyString",      type: "error", inputs: [{ name: "field",   type: "string"  }] },
  { name: "InvalidDuration",  type: "error", inputs: [] },
  // Events
  {
    name: "VaultCreated",
    type: "event",
    inputs: [
      { name: "vaultId",   type: "uint256", indexed: true  },
      { name: "owner",     type: "address", indexed: true  },
      { name: "name",      type: "string",  indexed: false },
      { name: "isPrivate", type: "bool",    indexed: false },
    ],
  },
  {
    name: "StoryUploaded",
    type: "event",
    inputs: [
      { name: "storyId",    type: "uint256", indexed: true  },
      { name: "vaultId",    type: "uint256", indexed: true  },
      { name: "uploader",   type: "address", indexed: true  },
      { name: "zgRootHash", type: "string",  indexed: false },
    ],
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// LoreIPModule ABI
// ─────────────────────────────────────────────────────────────────────────────

export const LORE_IP_MODULE_ABI = [
  // ── Write ──────────────────────────────────────────────────────────────────
  {
    name: "setTerms",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "storyId",             type: "uint256" },
      { name: "isLicensable",        type: "bool"    },
      { name: "commercialUse",       type: "bool"    },
      { name: "exclusiveAvailable",  type: "bool"    },
      { name: "royaltyWei",          type: "uint256" },
      { name: "exclusiveRoyaltyWei", type: "uint256" },
      { name: "maxLicenses",         type: "uint256" },
      { name: "jurisdictionNote",    type: "string"  },
    ],
    outputs: [],
  },
  {
    name: "requestLicense",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "storyId",     type: "uint256" },
      { name: "licenseType", type: "uint8"   },
      { name: "purposeNote", type: "string"  },
    ],
    outputs: [{ name: "requestId", type: "uint256" }],
  },
  {
    name: "approveRequest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "requestId",     type: "uint256" },
      { name: "expirySeconds", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "rejectRequest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "revokeRequest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // ── Read ───────────────────────────────────────────────────────────────────
  {
    name: "terms",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "storyId", type: "uint256" }],
    outputs: [
      { name: "isLicensable",        type: "bool"    },
      { name: "commercialUse",       type: "bool"    },
      { name: "exclusiveAvailable",  type: "bool"    },
      { name: "royaltyWei",          type: "uint256" },
      { name: "exclusiveRoyaltyWei", type: "uint256" },
      { name: "maxLicenses",         type: "uint256" },
      { name: "jurisdictionNote",    type: "string"  },
      { name: "setAt",               type: "uint256" },
    ],
  },
  {
    name: "requests",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "requestId", type: "uint256" }],
    outputs: [
      { name: "storyId",     type: "uint256" },
      { name: "licensee",    type: "address" },
      { name: "licenseType", type: "uint8"   },
      { name: "status",      type: "uint8"   },
      { name: "requestedAt", type: "uint256" },
      { name: "respondedAt", type: "uint256" },
      { name: "expiresAt",   type: "uint256" },
      { name: "purposeNote", type: "string"  },
      { name: "amountPaid",  type: "uint256" },
    ],
  },
  {
    name: "getStoryRequests",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "storyId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "hasActiveLicense",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "storyId",  type: "uint256" },
      { name: "licensee", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "pendingWithdrawal",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getLicensableFlags",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "storyIds", type: "uint256[]" }],
    outputs: [{ name: "flags", type: "bool[]" }],
  },
  // ── Events ─────────────────────────────────────────────────────────────────
  {
    name: "TermsSet",
    type: "event",
    inputs: [
      { name: "storyId",      type: "uint256", indexed: true  },
      { name: "uploader",     type: "address", indexed: true  },
      { name: "isLicensable", type: "bool",    indexed: false },
      { name: "commercialUse",type: "bool",    indexed: false },
      { name: "royaltyWei",   type: "uint256", indexed: false },
    ],
  },
  {
    name: "LicenseRequested",
    type: "event",
    inputs: [
      { name: "requestId",   type: "uint256", indexed: true  },
      { name: "storyId",     type: "uint256", indexed: true  },
      { name: "licensee",    type: "address", indexed: true  },
      { name: "licenseType", type: "uint8",   indexed: false },
    ],
  },
  {
    name: "LicenseApproved",
    type: "event",
    inputs: [
      { name: "requestId",  type: "uint256", indexed: true  },
      { name: "storyId",    type: "uint256", indexed: true  },
      { name: "licensee",   type: "address", indexed: true  },
      { name: "expiresAt",  type: "uint256", indexed: false },
      { name: "amountPaid", type: "uint256", indexed: false },
    ],
  },
  {
    name: "LicenseRejected",
    type: "event",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true },
      { name: "storyId",   type: "uint256", indexed: true },
      { name: "licensee",  type: "address", indexed: true },
    ],
  },
  {
    name: "RoyaltyWithdrawn",
    type: "event",
    inputs: [
      { name: "account", type: "address", indexed: true  },
      { name: "amount",  type: "uint256", indexed: false },
    ],
  },
] as const;
