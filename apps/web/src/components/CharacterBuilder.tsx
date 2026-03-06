"use client";

import { useState, useRef } from "react";
import { isAddress } from "viem";
import type { LoreCharacter } from "@/types";

interface Props {
  value:    LoreCharacter[];
  onChange: (chars: LoreCharacter[]) => void;
  maxChars?: number;
}

const MAX_CHARS    = 5;
const MAX_TRAITS   = 5;

interface DraftChar {
  name:          string;
  description:   string;
  walletAddress: string;
  traits:        string[];
}

const emptyDraft = (): DraftChar => ({
  name:          "",
  description:   "",
  walletAddress: "",
  traits:        [],
});

export function CharacterBuilder({ value, onChange, maxChars = MAX_CHARS }: Props) {
  const [isOpen,    setIsOpen]    = useState(false);
  const [draft,     setDraft]     = useState<DraftChar>(emptyDraft());
  const [traitInput, setTraitInput] = useState("");
  const [showRegistry, setShowRegistry] = useState(false);
  const [registryChars, setRegistryChars] = useState<LoreCharacter[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);

  // ── Registry ────────────────────────────────────────────────────────────────

  function openRegistry() {
    try {
      const raw = localStorage.getItem("lorelich_characters");
      setRegistryChars(raw ? (JSON.parse(raw) as LoreCharacter[]) : []);
    } catch {
      setRegistryChars([]);
    }
    setShowRegistry(true);
  }

  function loadFromRegistry(char: LoreCharacter) {
    if (value.some((c) => c.id === char.id)) return;
    onChange([...value, char]);
    setShowRegistry(false);
  }

  // ── Trait chip input ─────────────────────────────────────────────────────────

  function handleTraitKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && traitInput.trim()) {
      e.preventDefault();
      const t = traitInput.trim().slice(0, 40).replace(/,/g, "");
      if (draft.traits.length < MAX_TRAITS && !draft.traits.includes(t)) {
        setDraft((d) => ({ ...d, traits: [...d.traits, t] }));
      }
      setTraitInput("");
    }
    if (e.key === "Backspace" && !traitInput && draft.traits.length) {
      setDraft((d) => ({ ...d, traits: d.traits.slice(0, -1) }));
    }
  }

  // ── Save character ───────────────────────────────────────────────────────────

  function saveCharacter() {
    if (!draft.name.trim()) return;
    if (draft.walletAddress && !isAddress(draft.walletAddress)) return;

    const char: LoreCharacter = {
      id:            crypto.randomUUID(),
      name:          draft.name.trim().slice(0, 100),
      description:   draft.description.trim().slice(0, 200),
      walletAddress: draft.walletAddress || undefined,
      traits:        draft.traits,
      appearedIn:    [],
      createdAt:     Date.now(),
    };

    const updated = [...value, char];
    onChange(updated);

    // Persist to registry
    try {
      const raw      = localStorage.getItem("lorelich_characters");
      const registry = raw ? (JSON.parse(raw) as LoreCharacter[]) : [];
      registry.push(char);
      localStorage.setItem("lorelich_characters", JSON.stringify(registry));
    } catch { /* ignore */ }

    setDraft(emptyDraft());
    setTraitInput("");
    setIsOpen(false);
  }

  // ── Remove character ─────────────────────────────────────────────────────────

  function removeChar(id: string) {
    onChange(value.filter((c) => c.id !== id));
  }

  const walletValid =
    !draft.walletAddress || isAddress(draft.walletAddress);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Character chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((char) => (
            <div
              key={char.id}
              className="group flex items-center gap-1.5 bg-crypt/60 border border-brass/20 rounded px-2.5 py-1 text-xs"
            >
              <span className="font-mono text-parchment/80">{char.name}</span>
              {char.traits.slice(0, 2).map((t) => (
                <span key={t} className="text-brass/50 text-[10px]">·{t}</span>
              ))}
              <button
                onClick={() => removeChar(char.id)}
                className="ml-1 text-smoke/40 hover:text-burgundy/70 transition-colors"
                aria-label={`Remove ${char.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {value.length < maxChars && !isOpen && (
          <button
            onClick={() => { setIsOpen(true); setTimeout(() => nameRef.current?.focus(), 50); }}
            className="text-xs font-mono text-brass/70 border border-brass/25 rounded px-3 py-1.5 hover:border-brass/50 hover:text-brass transition-colors"
          >
            + Add Character
          </button>
        )}
        <button
          onClick={openRegistry}
          className="text-xs font-mono text-smoke/50 border border-smoke/15 rounded px-3 py-1.5 hover:border-smoke/30 hover:text-smoke/70 transition-colors"
        >
          Load from Registry
        </button>
      </div>

      {/* Inline form */}
      {isOpen && (
        <div className="vault-glass rounded border border-brass/20 p-4 space-y-3">
          <p className="font-mono text-xs text-brass/60 uppercase tracking-widest">New Character</p>

          <div>
            <label className="block font-mono text-xs text-smoke/60 mb-1">Name *</label>
            <input
              ref={nameRef}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Character name"
              maxLength={100}
              className="input-dark w-full text-sm"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-smoke/60 mb-1">
              Description <span className="text-smoke/40">({draft.description.length}/200)</span>
            </label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value.slice(0, 200) }))}
              placeholder="Who is this character? Their role, essence, backstory…"
              rows={2}
              className="input-dark w-full text-sm resize-none"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-smoke/60 mb-1">
              Traits <span className="text-smoke/40">(Enter or comma · max 5)</span>
            </label>
            <div className="input-dark flex flex-wrap gap-1.5 min-h-[36px] p-2">
              {draft.traits.map((t) => (
                <span key={t} className="bg-brass/15 text-brass/80 rounded px-2 py-0.5 text-xs font-mono">
                  {t}
                </span>
              ))}
              {draft.traits.length < MAX_TRAITS && (
                <input
                  value={traitInput}
                  onChange={(e) => setTraitInput(e.target.value)}
                  onKeyDown={handleTraitKey}
                  placeholder={draft.traits.length === 0 ? "warrior, elder, healer…" : ""}
                  className="flex-1 min-w-[100px] bg-transparent outline-none text-xs font-mono text-parchment/80 placeholder-smoke/30"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs text-smoke/60 mb-1">
              Wallet Address <span className="text-smoke/40">(optional)</span>
            </label>
            <input
              value={draft.walletAddress}
              onChange={(e) => setDraft((d) => ({ ...d, walletAddress: e.target.value.trim() }))}
              placeholder="0x…"
              className={`input-dark w-full text-sm font-mono ${!walletValid ? "border-burgundy/50" : ""}`}
            />
            {!walletValid && (
              <p className="text-xs text-burgundy/70 mt-1 font-mono">Invalid Ethereum address</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={saveCharacter}
              disabled={!draft.name.trim() || !walletValid}
              className="btn-brass text-xs px-4 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add to Cast
            </button>
            <button
              onClick={() => { setIsOpen(false); setDraft(emptyDraft()); setTraitInput(""); }}
              className="text-xs font-mono text-smoke/50 hover:text-smoke/80 transition-colors px-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Registry popover */}
      {showRegistry && (
        <div className="vault-glass rounded border border-brass/20 p-4 space-y-2 max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-xs text-brass/60 uppercase tracking-widest">Character Registry</p>
            <button
              onClick={() => setShowRegistry(false)}
              className="text-smoke/40 hover:text-smoke/70 text-sm"
            >
              ×
            </button>
          </div>
          {registryChars.length === 0 ? (
            <p className="text-xs text-smoke/40 font-mono">No characters saved yet.</p>
          ) : (
            registryChars.map((char) => {
              const alreadyAdded = value.some((c) => c.id === char.id);
              return (
                <div
                  key={char.id}
                  className="flex items-center justify-between py-1.5 border-b border-brass/10 last:border-0"
                >
                  <div>
                    <span className="font-mono text-xs text-parchment/80">{char.name}</span>
                    {char.traits.length > 0 && (
                      <span className="text-smoke/40 text-[10px] ml-2">{char.traits.join(", ")}</span>
                    )}
                  </div>
                  <button
                    onClick={() => loadFromRegistry(char)}
                    disabled={alreadyAdded || value.length >= maxChars}
                    className="text-xs font-mono text-brass/60 hover:text-brass disabled:text-smoke/30 disabled:cursor-not-allowed transition-colors"
                  >
                    {alreadyAdded ? "Added" : "Use"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
