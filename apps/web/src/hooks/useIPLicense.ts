"use client";

import { useReadContract, useReadContracts, useWriteContract, useAccount } from "wagmi";
import { useIPStore } from "@/store";
import { LORE_IP_MODULE_ADDRESS, LORE_IP_MODULE_ABI, LORE_VAULT_ADDRESS, LORE_VAULT_ABI } from "@/lib/contracts";
import type { LicenseTerms, LicenseRequest, LicenseType, LicensableStory, StoryMetadata } from "@/types";
import { useEffect, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Enum maps — contract uint8 ↔ TypeScript union
// ─────────────────────────────────────────────────────────────────────────────

const LICENSE_TYPES: LicenseType[] = ["PERSONAL", "DOCUMENTARY", "COMMERCIAL", "EXCLUSIVE"];
const LICENSE_STATUSES             = ["PENDING", "APPROVED", "REJECTED", "REVOKED"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// useStoryTerms — reads and caches license terms for one story
// ─────────────────────────────────────────────────────────────────────────────

export function useStoryTerms(storyId: bigint | null) {
  const setTermsCache = useIPStore((s) => s.setTermsCache);
  const cached = useIPStore((s) =>
    storyId !== null ? s.termsCache[storyId.toString()] : undefined
  );

  const { data, isLoading, refetch } = useReadContract({
    address:      LORE_IP_MODULE_ADDRESS,
    abi:          LORE_IP_MODULE_ABI,
    functionName: "terms",
    args:         storyId !== null ? [storyId] : undefined,
    query:        { enabled: storyId !== null },
  });

  useEffect(() => {
    if (!data || storyId === null) return;
    const [
      isLicensable, commercialUse, exclusiveAvailable,
      royaltyWei, exclusiveRoyaltyWei, maxLicenses, jurisdictionNote, setAt,
    ] = data as [boolean, boolean, boolean, bigint, bigint, bigint, string, bigint];

    setTermsCache(storyId.toString(), {
      isLicensable, commercialUse, exclusiveAvailable,
      royaltyWei, exclusiveRoyaltyWei, maxLicenses, jurisdictionNote, setAt,
    });
  }, [data, storyId, setTermsCache]);

  return { terms: cached, isLoading, refetch };
}

// ─────────────────────────────────────────────────────────────────────────────
// useStoryRequests — fetches all request IDs for a story, then batch-fetches details
// ─────────────────────────────────────────────────────────────────────────────

export function useStoryRequests(storyId: bigint | null) {
  const setRequestsCache = useIPStore((s) => s.setRequestsCache);

  const { data: requestIds, isLoading: idsLoading } = useReadContract({
    address:      LORE_IP_MODULE_ADDRESS,
    abi:          LORE_IP_MODULE_ABI,
    functionName: "getStoryRequests",
    args:         storyId !== null ? [storyId] : undefined,
    query:        { enabled: storyId !== null },
  });

  const requestCalls = (requestIds ?? []).map((id) => ({
    address:      LORE_IP_MODULE_ADDRESS,
    abi:          LORE_IP_MODULE_ABI,
    functionName: "requests" as const,
    args:         [id] as const,
  }));

  const { data: requestData, isLoading: detailsLoading } = useReadContracts({
    contracts: requestCalls,
    query:     { enabled: requestCalls.length > 0 },
  });

  useEffect(() => {
    if (!requestIds || !requestData || storyId === null) return;

    const reqs: LicenseRequest[] = requestIds
      .map((id, i) => {
        const result = requestData[i];
        if (result.status !== "success") return null;
        const [
          sid, licensee, licenseTypeIdx, statusIdx,
          requestedAt, respondedAt, expiresAt, purposeNote, amountPaid,
        ] = result.result as [
          bigint, `0x${string}`, number, number,
          bigint, bigint, bigint, string, bigint,
        ];
        return {
          requestId: id,
          storyId: sid,
          licensee,
          licenseType: LICENSE_TYPES[licenseTypeIdx],
          status: LICENSE_STATUSES[statusIdx],
          requestedAt, respondedAt, expiresAt, purposeNote, amountPaid,
        };
      })
      .filter(Boolean) as LicenseRequest[];

    setRequestsCache(storyId.toString(), reqs);
  }, [requestIds, requestData, storyId, setRequestsCache]);

  return { requestIds: requestIds ?? [], isLoading: idsLoading || detailsLoading };
}

// ─────────────────────────────────────────────────────────────────────────────
// useHasActiveLicense — check if connected wallet has a license for a story
// ─────────────────────────────────────────────────────────────────────────────

export function useHasActiveLicense(storyId: bigint | null) {
  const { address } = useAccount();
  return useReadContract({
    address:      LORE_IP_MODULE_ADDRESS,
    abi:          LORE_IP_MODULE_ABI,
    functionName: "hasActiveLicense",
    args:         storyId !== null && address ? [storyId, address] : undefined,
    query:        { enabled: storyId !== null && !!address },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// usePendingWithdrawal — royalties/refunds available to withdraw
// ─────────────────────────────────────────────────────────────────────────────

export function usePendingWithdrawal() {
  const { address } = useAccount();
  return useReadContract({
    address:      LORE_IP_MODULE_ADDRESS,
    abi:          LORE_IP_MODULE_ABI,
    functionName: "pendingWithdrawal",
    args:         address ? [address] : undefined,
    query:        { enabled: !!address },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// useSetTerms — story owner sets/updates license terms
// ─────────────────────────────────────────────────────────────────────────────

export function useSetTerms() {
  const { writeContractAsync, isPending } = useWriteContract();

  const setTerms = async (storyId: bigint, params: Omit<LicenseTerms, "setAt">) => {
    return writeContractAsync({
      address:      LORE_IP_MODULE_ADDRESS,
      abi:          LORE_IP_MODULE_ABI,
      functionName: "setTerms",
      gas:          BigInt(200_000),
      args: [
        storyId,
        params.isLicensable,
        params.commercialUse,
        params.exclusiveAvailable,
        params.royaltyWei,
        params.exclusiveRoyaltyWei,
        params.maxLicenses,
        params.jurisdictionNote,
      ],
    });
  };

  return { setTerms, isPending };
}

// ─────────────────────────────────────────────────────────────────────────────
// useRequestLicense — licensee submits a request with payment
// ─────────────────────────────────────────────────────────────────────────────

export function useRequestLicense() {
  const { writeContractAsync, isPending } = useWriteContract();

  const requestLicense = async (
    storyId: bigint,
    licenseType: LicenseType,
    purposeNote: string,
    valueWei: bigint
  ) => {
    const typeIndex = LICENSE_TYPES.indexOf(licenseType);
    return writeContractAsync({
      address:      LORE_IP_MODULE_ADDRESS,
      abi:          LORE_IP_MODULE_ABI,
      functionName: "requestLicense",
      gas:          BigInt(250_000),
      value:        valueWei,
      args:         [storyId, typeIndex, purposeNote],
    });
  };

  return { requestLicense, isPending };
}

// ─────────────────────────────────────────────────────────────────────────────
// useApproveRequest — story owner approves a pending request
// ─────────────────────────────────────────────────────────────────────────────

export function useApproveRequest() {
  const { writeContractAsync, isPending } = useWriteContract();

  const approve = (requestId: bigint, expirySeconds: bigint) =>
    writeContractAsync({
      address:      LORE_IP_MODULE_ADDRESS,
      abi:          LORE_IP_MODULE_ABI,
      functionName: "approveRequest",
      gas:          BigInt(150_000),
      args:         [requestId, expirySeconds],
    });

  return { approve, isPending };
}

// ─────────────────────────────────────────────────────────────────────────────
// useRejectRequest — story owner rejects a pending request (refunds licensee)
// ─────────────────────────────────────────────────────────────────────────────

export function useRejectRequest() {
  const { writeContractAsync, isPending } = useWriteContract();

  const reject = (requestId: bigint) =>
    writeContractAsync({
      address:      LORE_IP_MODULE_ADDRESS,
      abi:          LORE_IP_MODULE_ABI,
      functionName: "rejectRequest",
      gas:          BigInt(100_000),
      args:         [requestId],
    });

  return { reject, isPending };
}

// ─────────────────────────────────────────────────────────────────────────────
// useWithdrawRoyalties — pull accumulated royalties or refunds
// ─────────────────────────────────────────────────────────────────────────────

export function useWithdrawRoyalties() {
  const { writeContractAsync, isPending } = useWriteContract();

  const withdraw = () =>
    writeContractAsync({
      address:      LORE_IP_MODULE_ADDRESS,
      abi:          LORE_IP_MODULE_ABI,
      functionName: "withdraw",
      gas:          BigInt(80_000),
      args:         [],
    });

  return { withdraw, isPending };
}

// ─────────────────────────────────────────────────────────────────────────────
// useMarketplaceStories — all public licensable stories with terms + vault names
// ─────────────────────────────────────────────────────────────────────────────

export function useMarketplaceStories() {
  const { data: total } = useReadContract({
    address:      LORE_VAULT_ADDRESS,
    abi:          LORE_VAULT_ABI,
    functionName: "totalStories",
  });

  // IDs 1..total, capped at 200 for testnet
  const storyIds = useMemo(
    () => total
      ? Array.from({ length: Math.min(Number(total), 200) }, (_, i) => BigInt(i + 1))
      : [],
    [total],
  );

  const storyCalls = useMemo(() => storyIds.map((id) => ({
    address:      LORE_VAULT_ADDRESS as `0x${string}`,
    abi:          LORE_VAULT_ABI,
    functionName: "stories" as const,
    args:         [id] as const,
  })), [storyIds]);

  const { data: storyData, isLoading: storiesLoading } = useReadContracts({
    contracts: storyCalls,
    query:     { enabled: storyCalls.length > 0 },
  });

  const publicStories = useMemo<StoryMetadata[]>(() => {
    if (!storyData) return [];
    return storyIds.flatMap((id, i) => {
      const r = storyData[i];
      if (r?.status !== "success") return [];
      const [
        uploader, vaultId, zgRootHash, mediaType,
        duration, isPrivate, timestamp, title, encryptedKeyHash,
      ] = r.result as [`0x${string}`, bigint, string, string, bigint, boolean, bigint, string, string];
      if (isPrivate) return [];
      return [{ id, uploader, vaultId, zgRootHash, mediaType, duration, isPrivate, timestamp, title, encryptedKeyHash }];
    });
  }, [storyData, storyIds]);

  const publicIds = useMemo(() => publicStories.map((s) => s.id), [publicStories]);

  const { data: flags, isLoading: flagsLoading } = useReadContract({
    address:      LORE_IP_MODULE_ADDRESS,
    abi:          LORE_IP_MODULE_ABI,
    functionName: "getLicensableFlags",
    args:         publicIds.length > 0 ? [publicIds] : undefined,
    query:        { enabled: publicIds.length > 0 },
  });

  const licensableStories = useMemo(
    () => publicStories.filter((_, i) => (flags as readonly boolean[] | undefined)?.[i]),
    [publicStories, flags],
  );

  const termsCalls = useMemo(() => licensableStories.map((s) => ({
    address:      LORE_IP_MODULE_ADDRESS as `0x${string}`,
    abi:          LORE_IP_MODULE_ABI,
    functionName: "terms" as const,
    args:         [s.id] as const,
  })), [licensableStories]);

  const { data: termsData, isLoading: termsLoading } = useReadContracts({
    contracts: termsCalls,
    query:     { enabled: termsCalls.length > 0 },
  });

  // Unique vault IDs for name lookup
  const uniqueVaultIds = useMemo(
    () => [...new Set(licensableStories.map((s) => s.vaultId.toString()))].map(BigInt),
    [licensableStories],
  );

  const vaultCalls = useMemo(() => uniqueVaultIds.map((id) => ({
    address:      LORE_VAULT_ADDRESS as `0x${string}`,
    abi:          LORE_VAULT_ABI,
    functionName: "vaults" as const,
    args:         [id] as const,
  })), [uniqueVaultIds]);

  const { data: vaultData, isLoading: vaultsLoading } = useReadContracts({
    contracts: vaultCalls,
    query:     { enabled: vaultCalls.length > 0 },
  });

  const vaultNameMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    uniqueVaultIds.forEach((id, i) => {
      const r = vaultData?.[i];
      if (r?.status === "success") {
        const [, name] = r.result as [`0x${string}`, string, boolean, bigint, bigint];
        map[id.toString()] = name;
      }
    });
    return map;
  }, [uniqueVaultIds, vaultData]);

  const items = useMemo<LicensableStory[]>(() => {
    if (!termsData) return [];
    return licensableStories.flatMap((story, i) => {
      const r = termsData[i];
      if (r?.status !== "success") return [];
      const [
        isLicensable, commercialUse, exclusiveAvailable,
        royaltyWei, exclusiveRoyaltyWei, maxLicenses,
        jurisdictionNote, setAt,
      ] = r.result as [boolean, boolean, boolean, bigint, bigint, bigint, string, bigint];
      return [{ story, terms: { isLicensable, commercialUse, exclusiveAvailable, royaltyWei, exclusiveRoyaltyWei, maxLicenses, jurisdictionNote, setAt } }];
    });
  }, [termsData, licensableStories]);

  return {
    items,
    vaultNameMap,
    isLoading: storiesLoading || flagsLoading || termsLoading || vaultsLoading,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// useVaultIncomingRequests — all license requests for a set of story IDs
// ─────────────────────────────────────────────────────────────────────────────

export function useVaultIncomingRequests(storyIds: bigint[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableIds = useMemo(() => storyIds, [storyIds.map((id) => id.toString()).join(",")]);

  const requestIdCalls = useMemo(() => stableIds.map((id) => ({
    address:      LORE_IP_MODULE_ADDRESS as `0x${string}`,
    abi:          LORE_IP_MODULE_ABI,
    functionName: "getStoryRequests" as const,
    args:         [id] as const,
  })), [stableIds]);

  const { data: requestIdArrays, isLoading: idsLoading } = useReadContracts({
    contracts: requestIdCalls,
    query:     { enabled: requestIdCalls.length > 0 },
  });

  const allRequestIds = useMemo(() => {
    if (!requestIdArrays) return [];
    return requestIdArrays.flatMap((r) =>
      r.status === "success" ? (r.result as bigint[]) : []
    );
  }, [requestIdArrays]);

  const requestCalls = useMemo(() => allRequestIds.map((id) => ({
    address:      LORE_IP_MODULE_ADDRESS as `0x${string}`,
    abi:          LORE_IP_MODULE_ABI,
    functionName: "requests" as const,
    args:         [id] as const,
  })), [allRequestIds]);

  const { data: requestData, isLoading: detailsLoading } = useReadContracts({
    contracts: requestCalls,
    query:     { enabled: requestCalls.length > 0 },
  });

  const requests = useMemo<LicenseRequest[]>(() => {
    if (!requestData) return [];
    return allRequestIds.flatMap((id, i) => {
      const r = requestData[i];
      if (r?.status !== "success") return [];
      const [
        sid, licensee, licenseTypeIdx, statusIdx,
        requestedAt, respondedAt, expiresAt, purposeNote, amountPaid,
      ] = r.result as [bigint, `0x${string}`, number, number, bigint, bigint, bigint, string, bigint];
      return [{
        requestId:   id,
        storyId:     sid,
        licensee,
        licenseType: LICENSE_TYPES[licenseTypeIdx],
        status:      LICENSE_STATUSES[statusIdx],
        requestedAt, respondedAt, expiresAt, purposeNote, amountPaid,
      }];
    });
  }, [requestData, allRequestIds]);

  return { requests, isLoading: idsLoading || detailsLoading };
}
