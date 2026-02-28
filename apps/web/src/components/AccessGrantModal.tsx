"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWriteContract, useAccount } from "wagmi";
import { isAddress } from "viem";
import { LORE_VAULT_ADDRESS, LORE_VAULT_ABI } from "@/lib/contracts";
import type { Vault } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// AccessGrantModal — manage read access for a private vault.
//
// Since the contract has no getter for "list of grantees", we maintain a
// locally persisted list of addresses that have been granted/revoked.
// The on-chain access check (hasAccess) is authoritative; this list is a
// UI convenience for the vault owner to track what they've granted.
//
// localStorage key: `lorelich_access_${vaultId}`
// ─────────────────────────────────────────────────────────────────────────────

interface AccessGrantModalProps {
  vault:    Vault;
  onClose:  () => void;
}

const LS_KEY = (vaultId: string) => `lorelich_access_${vaultId}`;

interface GrantEntry {
  address:   string;
  grantedAt: number;
  revoked?:  boolean;
}

export function AccessGrantModal({ vault, onClose }: AccessGrantModalProps) {
  const { address: owner }         = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [entries, setEntries] = useState<GrantEntry[]>([]);
  const [input,   setInput]   = useState("");
  const [error,   setError]   = useState<string | null>(null);
  const [txState, setTxState] = useState<{ action: "grant" | "revoke"; addr: string } | null>(null);

  const vaultIdStr = vault.id.toString();

  // Load persisted grants from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY(vaultIdStr));
    if (raw) {
      try { setEntries(JSON.parse(raw) as GrantEntry[]); }
      catch { /* ignore corrupt */ }
    }
  }, [vaultIdStr]);

  function persist(next: GrantEntry[]) {
    setEntries(next);
    localStorage.setItem(LS_KEY(vaultIdStr), JSON.stringify(next));
  }

  const activeGrants = entries.filter((e) => !e.revoked);

  async function handleGrant() {
    setError(null);
    const addr = input.trim();
    if (!isAddress(addr)) {
      setError("Invalid Ethereum address.");
      return;
    }
    if (addr.toLowerCase() === owner?.toLowerCase()) {
      setError("You already own this vault.");
      return;
    }
    if (activeGrants.some((e) => e.address.toLowerCase() === addr.toLowerCase())) {
      setError("This address already has access.");
      return;
    }

    setTxState({ action: "grant", addr });
    try {
      await writeContractAsync({
        address:      LORE_VAULT_ADDRESS,
        abi:          LORE_VAULT_ABI,
        functionName: "grantAccess",
        gas:          BigInt(200_000),
        args:         [vault.id, addr as `0x${string}`],
      });

      // Record locally after on-chain success
      persist([...entries, { address: addr, grantedAt: Date.now() }]);
      setInput("");
    } catch (err) {
      setError((err as Error).message?.slice(0, 120) ?? "Transaction failed.");
    } finally {
      setTxState(null);
    }
  }

  async function handleRevoke(addr: string) {
    setError(null);
    setTxState({ action: "revoke", addr });
    try {
      await writeContractAsync({
        address:      LORE_VAULT_ADDRESS,
        abi:          LORE_VAULT_ABI,
        functionName: "revokeAccess",
        gas:          BigInt(200_000),
        args:         [vault.id, addr as `0x${string}`],
      });

      persist(
        entries.map((e) =>
          e.address.toLowerCase() === addr.toLowerCase()
            ? { ...e, revoked: true }
            : e
        )
      );
    } catch (err) {
      setError((err as Error).message?.slice(0, 120) ?? "Transaction failed.");
    } finally {
      setTxState(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: "rgba(13,11,14,0.80)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="flex min-h-full items-center justify-center p-3 sm:p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md vault-glass rounded-sm p-4 sm:p-6 shadow-vault"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div>
            <h2 className="font-serif text-parchment text-lg sm:text-xl">Manage Access</h2>
            <p className="text-xs font-mono text-smoke/50 mt-0.5">
              🔒 {vault.name} · Private Vault
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-smoke hover:text-aged transition-colors text-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Grant address input */}
        <div className="mb-5">
          <label className="text-xs text-smoke font-mono block mb-1.5">
            Grant access to wallet address
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(null); }}
              placeholder="0x..."
              className="input-dark flex-1 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleGrant()}
            />
            <button
              onClick={handleGrant}
              disabled={isPending || !input.trim()}
              className="btn-brass text-xs px-3 py-1.5 whitespace-nowrap disabled:opacity-50"
            >
              {txState?.action === "grant" ? "Granting…" : "Grant"}
            </button>
          </div>
          {error && (
            <p className="text-xs font-mono text-burgundy/80 mt-1.5">{error}</p>
          )}
        </div>

        {/* Active grants list */}
        <div>
          <p className="text-xs font-mono text-smoke/50 mb-2">
            Active grants ({activeGrants.length})
          </p>
          {activeGrants.length === 0 ? (
            <p className="text-xs text-smoke/40 font-serif italic py-2">
              No addresses have been granted access yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <AnimatePresence>
                {activeGrants.map((entry) => (
                  <motion.div
                    key={entry.address}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="flex items-center justify-between gap-2
                      vault-glass rounded-sm px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-smoke/70 truncate">
                        {entry.address}
                      </p>
                      <p className="text-xs text-smoke/30 font-mono mt-0.5">
                        Granted {new Date(entry.grantedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevoke(entry.address)}
                      disabled={isPending && txState?.addr === entry.address}
                      className="text-xs font-mono text-burgundy/60 hover:text-burgundy
                        transition-colors shrink-0 disabled:opacity-40"
                    >
                      {txState?.action === "revoke" && txState.addr === entry.address
                        ? "Revoking…"
                        : "Revoke"}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <p className="text-xs text-smoke/30 font-mono mt-4">
          Access is enforced on-chain by the LoreVault contract. Grantees can
          download and decrypt stories stored in this private vault.
        </p>
      </motion.div>
      </div>
    </motion.div>
  );
}
