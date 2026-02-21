import { create } from "zustand";
import type { Vault, StoryMetadata, UploadState, LoreLichMessage } from "@/types";

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
