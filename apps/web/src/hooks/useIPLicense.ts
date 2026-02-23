"use client";

import { useReadContract, useReadContracts, useWriteContract, useAccount } from "wagmi";
import { useIPStore } from "@/store";
import { LORE_IP_MODULE_ADDRESS, LORE_IP_MODULE_ABI } from "@/lib/contracts";
import type { LicenseTerms, LicenseRequest, LicenseType } from "@/types";
import { useEffect } from "react";

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
