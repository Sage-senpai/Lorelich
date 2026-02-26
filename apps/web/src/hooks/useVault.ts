import { useReadContract, useReadContracts, useAccount } from "wagmi";
import { useVaultStore } from "@/store";
import { LORE_VAULT_ADDRESS, LORE_VAULT_ABI } from "@/lib/contracts";
import type { Vault, StoryMetadata } from "@/types";
import { useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// useOwnerVaults — fetch all vault IDs owned by connected wallet
// ─────────────────────────────────────────────────────────────────────────────

export function useOwnerVaults() {
  const { address } = useAccount();
  const setVaults   = useVaultStore((s) => s.setVaults);

  const { data: vaultIds, isLoading, error, refetch } = useReadContract({
    address:      LORE_VAULT_ADDRESS,
    abi:          LORE_VAULT_ABI,
    functionName: "getOwnerVaults",
    args:         address ? [address] : undefined,
    query:        { enabled: !!address },
  });

  // Fetch metadata for each vault ID
  const vaultCalls = (vaultIds ?? []).map((id) => ({
    address:      LORE_VAULT_ADDRESS,
    abi:          LORE_VAULT_ABI,
    functionName: "vaults" as const,
    args:         [id] as const,
  }));

  const { data: vaultData } = useReadContracts({
    contracts: vaultCalls,
    query:     { enabled: vaultCalls.length > 0 },
  });

  useEffect(() => {
    if (!vaultIds || !vaultData) return;

    const vaults: Vault[] = vaultIds
      .map((id, i) => {
        const result = vaultData[i];
        if (result.status !== "success") return null;
        const [owner, name, isPrivate, storyCount, createdAt] = result.result as [
          `0x${string}`, string, boolean, bigint, bigint
        ];
        return { id, owner, name, isPrivate, storyCount, createdAt };
      })
      .filter(Boolean) as Vault[];

    setVaults(vaults);
  }, [vaultIds, vaultData, setVaults]);

  return { vaultIds: vaultIds ?? [], isLoading, error, refetch };
}

// ─────────────────────────────────────────────────────────────────────────────
// useVaultStories — fetch all stories for a given vault
// ─────────────────────────────────────────────────────────────────────────────

export function useVaultStories(vaultId: bigint | null) {
  const setVaultStories = useVaultStore((s) => s.setVaultStories);

  const { data: storyIds, isLoading, refetch } = useReadContract({
    address:      LORE_VAULT_ADDRESS,
    abi:          LORE_VAULT_ABI,
    functionName: "getVaultStories",
    args:         vaultId !== null ? [vaultId] : undefined,
    query:        { enabled: vaultId !== null },
  });

  const storyCalls = (storyIds ?? []).map((id) => ({
    address:      LORE_VAULT_ADDRESS,
    abi:          LORE_VAULT_ABI,
    functionName: "stories" as const,
    args:         [id] as const,
  }));

  const { data: storyData } = useReadContracts({
    contracts: storyCalls,
    query:     { enabled: storyCalls.length > 0 },
  });

  useEffect(() => {
    if (!storyIds || !storyData || vaultId === null) return;

    const stories: StoryMetadata[] = storyIds
      .map((id, i) => {
        const result = storyData[i];
        if (result.status !== "success") return null;
        const [
          uploader, vid, zgRootHash, mediaType,
          duration, isPrivate, timestamp, title, encryptedKeyHash,
        ] = result.result as [
          `0x${string}`, bigint, string, string,
          bigint, boolean, bigint, string, string
        ];
        return {
          id, uploader, vaultId: vid, zgRootHash, mediaType,
          duration, isPrivate, timestamp, title, encryptedKeyHash,
        };
      })
      .filter(Boolean) as StoryMetadata[];

    setVaultStories(vaultId, stories);
  }, [storyIds, storyData, vaultId, setVaultStories]);

  return { storyIds: storyIds ?? [], isLoading, refetch };
}

// ─────────────────────────────────────────────────────────────────────────────
// useVaultAccess — check if connected wallet has access to a private vault
// ─────────────────────────────────────────────────────────────────────────────

export function useVaultAccess(vaultId: bigint | null) {
  const { address } = useAccount();

  return useReadContract({
    address:      LORE_VAULT_ADDRESS,
    abi:          LORE_VAULT_ABI,
    functionName: "hasAccess",
    args:         vaultId !== null && address ? [vaultId, address] : undefined,
    query:        { enabled: vaultId !== null && !!address },
  });
}
