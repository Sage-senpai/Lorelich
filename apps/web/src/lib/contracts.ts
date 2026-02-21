// ─────────────────────────────────────────────────────────────────────────────
// Contract Addresses — Update after deployment
// See docs/smart-contracts.md for deployment instructions
// ─────────────────────────────────────────────────────────────────────────────

export const LORE_VAULT_ADDRESS =
  (process.env.NEXT_PUBLIC_LORE_VAULT_ADDRESS as `0x${string}`) ?? "0x";

export const SOULBOUND_ADDRESS =
  (process.env.NEXT_PUBLIC_SOULBOUND_ADDRESS as `0x${string}`) ?? "0x";

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
      { name: "vaultId",          type: "uint256" },
      { name: "zgRootHash",       type: "string"  },
      { name: "title",            type: "string"  },
      { name: "mediaTypeStr",     type: "string"  },
      { name: "duration",         type: "uint256" },
      { name: "encryptedKeyHash", type: "string"  },
      { name: "tokenURI",         type: "string"  },
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
