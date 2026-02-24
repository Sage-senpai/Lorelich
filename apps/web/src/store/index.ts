import { create } from "zustand";
import type {
  Vault, StoryMetadata, UploadState, LoreLichMessage,
  LicenseTerms, LicenseRequest, LicensableStory,
  GenealogyTree, AncestorLink,
} from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Vault Store
// ─────────────────────────────────────────────────────────────────────────────

interface VaultStore {
  vaults:          Vault[];
  selectedVaultId: bigint | null;
  stories:         Record<string, StoryMetadata[]>; // vaultId → stories

  setVaults:          (vaults: Vault[]) => void;
  selectVault:        (id: bigint | null) => void;
  setVaultStories:    (vaultId: bigint, stories: StoryMetadata[]) => void;
  clearVaultData:     () => void;
}

export const useVaultStore = create<VaultStore>((set) => ({
  vaults:          [],
  selectedVaultId: null,
  stories:         {},

  setVaults:       (vaults) => set({ vaults }),
  selectVault:     (id)     => set({ selectedVaultId: id }),
  setVaultStories: (vaultId, stories) =>
    set((s) => ({ stories: { ...s.stories, [vaultId.toString()]: stories } })),
  clearVaultData:  () => set({ vaults: [], selectedVaultId: null, stories: {} }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Upload Store
// ─────────────────────────────────────────────────────────────────────────────

interface UploadStore {
  uploadState: UploadState;
  setUploadState: (state: Partial<UploadState>) => void;
  resetUpload:    () => void;
}

const DEFAULT_UPLOAD: UploadState = { step: "idle", progress: 0 };

export const useUploadStore = create<UploadStore>((set) => ({
  uploadState: DEFAULT_UPLOAD,
  setUploadState: (partial) =>
    set((s) => ({ uploadState: { ...s.uploadState, ...partial } })),
  resetUpload: () => set({ uploadState: DEFAULT_UPLOAD }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// LoreLich AI Store
// ─────────────────────────────────────────────────────────────────────────────

interface LoreLichStore {
  messages:     LoreLichMessage[];
  isLoading:    boolean;
  contextStory: StoryMetadata | null;

  addMessage:      (msg: LoreLichMessage) => void;
  setLoading:      (loading: boolean) => void;
  setContextStory: (story: StoryMetadata | null) => void;
  clearMessages:   () => void;
}

export const useLoreLichStore = create<LoreLichStore>((set) => ({
  messages:     [],
  isLoading:    false,
  contextStory: null,

  addMessage:      (msg)   => set((s) => ({ messages: [...s.messages, msg] })),
  setLoading:      (loading) => set({ isLoading: loading }),
  setContextStory: (story)   => set({ contextStory: story }),
  clearMessages:   ()        => set({ messages: [] }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// IP Store — Feature A: IP Licensing
// ─────────────────────────────────────────────────────────────────────────────

interface IPStore {
  termsCache:         Record<string, LicenseTerms>;     // storyId → terms
  requestsCache:      Record<string, LicenseRequest[]>; // storyId → requests
  marketplaceStories: LicensableStory[];
  incomingRequests:   LicenseRequest[];                 // user's stories ← requests

  setTermsCache:         (storyId: string, terms: LicenseTerms) => void;
  setRequestsCache:      (storyId: string, reqs: LicenseRequest[]) => void;
  setMarketplaceStories: (stories: LicensableStory[]) => void;
  setIncomingRequests:   (reqs: LicenseRequest[]) => void;
  clearIPData:           () => void;
}

export const useIPStore = create<IPStore>((set) => ({
  termsCache:         {},
  requestsCache:      {},
  marketplaceStories: [],
  incomingRequests:   [],

  setTermsCache: (storyId, terms) =>
    set((s) => ({ termsCache: { ...s.termsCache, [storyId]: terms } })),
  setRequestsCache: (storyId, reqs) =>
    set((s) => ({ requestsCache: { ...s.requestsCache, [storyId]: reqs } })),
  setMarketplaceStories: (stories) => set({ marketplaceStories: stories }),
  setIncomingRequests:   (reqs)    => set({ incomingRequests: reqs }),
  clearIPData: () => set({ termsCache: {}, requestsCache: {}, marketplaceStories: [], incomingRequests: [] }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Tree Store — Feature D: Genealogy Tree
// ─────────────────────────────────────────────────────────────────────────────

const TREE_STORAGE_KEY = "lorelich_tree";

interface TreeStore {
  tree:           GenealogyTree | null;
  suggestedLinks: AncestorLink[];
  confirmedLinks: AncestorLink[];
  isImporting:    boolean;
  isSuggesting:   boolean;

  setTree:             (tree: GenealogyTree | null) => void;
  setSuggestedLinks:   (links: AncestorLink[]) => void;
  confirmLink:         (link: AncestorLink) => void;
  removeConfirmedLink: (ancestorId: string, storyId: string) => void;
  dismissLink:         (ancestorId: string, storyId: string) => void;
  setImporting:        (v: boolean) => void;
  setSuggesting:       (v: boolean) => void;
  persistToStorage:    () => void;
  loadFromStorage:     () => void;
}

export const useTreeStore = create<TreeStore>((set, get) => ({
  tree:           null,
  suggestedLinks: [],
  confirmedLinks: [],
  isImporting:    false,
  isSuggesting:   false,

  setTree: (tree) => set({ tree }),
  setSuggestedLinks: (links) => set({ suggestedLinks: links }),
  confirmLink: (link) =>
    set((s) => ({
      confirmedLinks: [...s.confirmedLinks, link],
      suggestedLinks: s.suggestedLinks.filter(
        (l) => !(l.ancestorId === link.ancestorId && l.storyId === link.storyId)
      ),
    })),
  removeConfirmedLink: (ancestorId, storyId) =>
    set((s) => ({
      confirmedLinks: s.confirmedLinks.filter(
        (l) => !(l.ancestorId === ancestorId && l.storyId === storyId)
      ),
      // Also remove storyId from tree ancestor's linkedStoryIds
      tree: s.tree
        ? {
            ...s.tree,
            ancestors: s.tree.ancestors.map((a) =>
              a.id === ancestorId
                ? { ...a, linkedStoryIds: a.linkedStoryIds.filter((id) => id !== storyId) }
                : a
            ),
          }
        : null,
    })),
  dismissLink: (ancestorId, storyId) =>
    set((s) => ({
      suggestedLinks: s.suggestedLinks.filter(
        (l) => !(l.ancestorId === ancestorId && l.storyId === storyId)
      ),
    })),
  setImporting:  (v) => set({ isImporting: v }),
  setSuggesting: (v) => set({ isSuggesting: v }),

  // Manual localStorage persistence — avoids zustand/persist bigint issues
  persistToStorage: () => {
    if (typeof window === "undefined") return;
    const { tree, confirmedLinks } = get();
    localStorage.setItem(TREE_STORAGE_KEY, JSON.stringify({ tree, confirmedLinks }));
  },
  loadFromStorage: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(TREE_STORAGE_KEY);
    if (!raw) return;
    try {
      const { tree, confirmedLinks } = JSON.parse(raw) as {
        tree: GenealogyTree;
        confirmedLinks: AncestorLink[];
      };
      set({ tree, confirmedLinks });
    } catch { /* ignore corrupt data */ }
  },
}));
