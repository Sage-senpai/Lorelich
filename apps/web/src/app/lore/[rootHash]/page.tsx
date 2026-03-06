"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAccount, useSignMessage } from "wagmi";
import { LoreComicViewer } from "@/components/LoreComicViewer";
import type { LoreComic } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Character claim record
// ─────────────────────────────────────────────────────────────────────────────

interface CharacterClaim {
  name:    string;
  address: string;
  sig:     string;
}

function claimsKey(rootHash: string) {
  return `lorelich_character_claims_${rootHash}`;
}

function loadClaims(rootHash: string): CharacterClaim[] {
  try {
    const raw = localStorage.getItem(claimsKey(rootHash));
    return raw ? (JSON.parse(raw) as CharacterClaim[]) : [];
  } catch { return []; }
}

function saveClaim(rootHash: string, claim: CharacterClaim) {
  const claims = loadClaims(rootHash);
  if (!claims.some((c) => c.name === claim.name)) claims.push(claim);
  localStorage.setItem(claimsKey(rootHash), JSON.stringify(claims));
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function LoreSharePage() {
  const { rootHash }              = useParams<{ rootHash: string }>();
  const { address, isConnected }  = useAccount();
  const { signMessageAsync }      = useSignMessage();

  const [comic,    setComic]    = useState<LoreComic | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [claims,   setClaims]   = useState<CharacterClaim[]>([]);
  const [claiming, setClaiming] = useState<string>("");   // character name being claimed

  // ── Fetch comic from 0G ────────────────────────────────────────────────────

  useEffect(() => {
    if (!rootHash) return;
    setLoading(true);
    fetch(`/api/download?rootHash=${rootHash}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Not found");
        const text = await res.text();
        // Try to parse as JSON LoreComic
        const data = JSON.parse(text) as LoreComic;
        setComic(data);
        setClaims(loadClaims(rootHash));
      })
      .catch(() => setError("This comic could not be found or has not been uploaded to 0G yet."))
      .finally(() => setLoading(false));
  }, [rootHash]);

  // ── Claim a character role ─────────────────────────────────────────────────

  async function claimRole(charName: string) {
    if (!isConnected || !address) return;
    setClaiming(charName);
    try {
      const message = `I am ${charName} in lore ${rootHash}`;
      const sig     = await signMessageAsync({ message });
      const claim: CharacterClaim = { name: charName, address, sig };
      saveClaim(rootHash, claim);
      setClaims(loadClaims(rootHash));
    } catch {
      // user rejected or error — ignore
    } finally {
      setClaiming("");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-shadow text-smoke pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded bg-crypt/40 border border-brass/10" />
          ))}
        </div>
      </main>
    );
  }

  if (error || !comic) {
    return (
      <main className="min-h-screen bg-shadow text-smoke pt-24 pb-16 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="font-mono text-smoke/40">{error || "Comic not found."}</p>
          <a href="/lore" className="text-xs font-mono text-brass/60 hover:text-brass transition-colors">
            ← Create your own lore
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-shadow text-smoke pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
        {/* Comic viewer — read-only */}
        <LoreComicViewer comic={comic} readOnly />

        {/* Character claiming section */}
        <section className="border-t border-brass/15 pt-8 space-y-4">
          <div>
            <h2 className="font-serif text-xl text-parchment">Claim a Character Role</h2>
            <p className="font-mono text-xs text-smoke/40 mt-1">
              Connect your wallet and sign to claim your identity in this lore.
              Claims are stored locally — no on-chain transaction required.
            </p>
          </div>

          {comic.characters.length === 0 ? (
            <p className="text-sm text-smoke/40 font-mono">No named characters in this comic.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {comic.characters.map((char) => {
                const claim = claims.find((c) => c.name === char.name);
                const isMe  = claim?.address.toLowerCase() === address?.toLowerCase();

                return (
                  <div
                    key={char.id}
                    className="vault-glass border border-brass/15 rounded p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm text-parchment/90">{char.name}</p>
                        {char.traits.length > 0 && (
                          <p className="text-[10px] text-brass/50 font-mono">
                            {char.traits.join(" · ")}
                          </p>
                        )}
                      </div>
                      {claim ? (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${
                          isMe
                            ? "border-brass/40 text-brass/70"
                            : "border-smoke/20 text-smoke/40"
                        }`}>
                          {isMe ? "You" : `${claim.address.slice(0, 6)}…${claim.address.slice(-4)}`}
                        </span>
                      ) : (
                        isConnected ? (
                          <button
                            onClick={() => claimRole(char.name)}
                            disabled={claiming === char.name}
                            className="text-[10px] font-mono text-brass/60 border border-brass/25 rounded px-2 py-0.5 hover:border-brass/50 hover:text-brass transition-colors disabled:opacity-50 shrink-0"
                          >
                            {claiming === char.name ? "Signing…" : "Claim Role"}
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-smoke/30 shrink-0">
                            Connect wallet to claim
                          </span>
                        )
                      )}
                    </div>
                    {char.description && (
                      <p className="text-xs text-smoke/50 font-mono leading-relaxed">
                        {char.description.slice(0, 120)}{char.description.length > 120 ? "…" : ""}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!isConnected && (
            <p className="text-xs text-smoke/30 font-mono">
              Connect your wallet to claim a character role in this lore.
            </p>
          )}
        </section>

        {/* Back link */}
        <div className="border-t border-brass/10 pt-6">
          <a href="/lore" className="text-xs font-mono text-smoke/40 hover:text-smoke/70 transition-colors">
            ← Create your own lore
          </a>
        </div>
      </div>
    </main>
  );
}
