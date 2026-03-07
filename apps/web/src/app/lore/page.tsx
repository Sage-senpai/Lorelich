"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { AnimatePresence, motion } from "framer-motion";
import { useOwnerVaults, useVaultStories } from "@/hooks/useVault";
import { useVaultStore } from "@/store";
import { CharacterBuilder } from "@/components/CharacterBuilder";
import { LoreComicViewer } from "@/components/LoreComicViewer";
import { fetchStoryContent } from "@/lib/fetchStoryContent";
import type {
  LoreCharacter,
  LoreComic,
  LoreGenerateRequest,
  LoreGenerateResponse,
  LoreMergeRequest,
  EduAgeMode,
  EduComicRequest,
  EduComicResponse,
} from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const GENRES = ["Epic", "Mythic", "Mystery", "Horror", "Folklore", "War Chronicle", "Coming-of-Age", "Romance"];
const TONES  = ["Reverent", "Haunting", "Triumphant", "Melancholic", "Urgent", "Mystical"];
const TABS   = ["Generate", "Educate", "My Comics", "Collab"] as const;
type Tab = typeof TABS[number];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadComics(): LoreComic[] {
  try {
    const raw = localStorage.getItem("lorelich_comics");
    return raw ? (JSON.parse(raw) as LoreComic[]) : [];
  } catch { return []; }
}

function saveComic(comic: LoreComic) {
  try {
    const comics = loadComics();
    const idx    = comics.findIndex((c) => c.id === comic.id);
    if (idx >= 0) comics[idx] = comic; else comics.unshift(comic);
    localStorage.setItem("lorelich_comics", JSON.stringify(comics));
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function LorePage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<Tab>("Generate");

  return (
    <main className="min-h-screen bg-shadow text-smoke pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-parchment">Lore Studio</h1>
          <p className="text-smoke/50 text-sm mt-1 font-mono">
            Transform ancestral stories into mythic comic narratives
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-brass/15 mb-8">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-mono transition-colors ${
                activeTab === tab
                  ? "text-parchment border-b-2 border-brass/60 -mb-px"
                  : "text-smoke/50 hover:text-smoke/80"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "Generate" && (
              <GenerateTab address={address} />
            )}
            {activeTab === "Educate" && (
              <EducateTab address={address} />
            )}
            {activeTab === "My Comics" && (
              <MyComicsTab />
            )}
            {activeTab === "Collab" && (
              <CollabTab address={address} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate Tab
// ─────────────────────────────────────────────────────────────────────────────

function GenerateTab({ address }: { address?: `0x${string}` }) {
  useOwnerVaults();
  const vaults          = useVaultStore((s) => s.vaults);
  const selectedVaultId = useVaultStore((s) => s.selectedVaultId);
  const selectVault     = useVaultStore((s) => s.selectVault);
  const storiesMap      = useVaultStore((s) => s.stories);
  useVaultStories(selectedVaultId);
  const selectedVault   = vaults.find((v) => v.id === selectedVaultId) ?? null;
  const stories         = selectedVaultId !== null ? (storiesMap[selectedVaultId.toString()] ?? []) : [];

  const [sourceMode,   setSourceMode]   = useState<"vault" | "paste">("paste");
  const [selectedStory, setSelectedStory] = useState<string>("");
  const [pastedText,   setPastedText]   = useState("");
  const [vaultText,    setVaultText]    = useState("");
  const [vaultFetch,   setVaultFetch]   = useState<"idle" | "loading" | "done" | "error">("idle");
  const [characters,   setCharacters]   = useState<LoreCharacter[]>([]);
  const [genre,        setGenre]        = useState("");
  const [tone,         setTone]         = useState("");
  const [prompt,       setPrompt]       = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [result,       setResult]       = useState<LoreComic | null>(null);

  const selectedStoryMeta = stories.find((s) => s.id.toString() === selectedStory);

  // Fetch story content from 0G when a vault story is selected
  const loadVaultContent = useCallback(async () => {
    if (!selectedStoryMeta) return;
    if (selectedStoryMeta.mediaType !== "text") {
      setVaultText("");
      setVaultFetch("error");
      setError("Only text stories can be used as source lore.");
      return;
    }
    setVaultFetch("loading");
    setError("");
    try {
      const text = await fetchStoryContent(
        selectedStoryMeta.zgRootHash,
        selectedStoryMeta.isPrivate,
        address,
      );
      setVaultText(text.slice(0, 3000));
      setVaultFetch("done");
    } catch (e) {
      setVaultFetch("error");
      setError(e instanceof Error ? e.message : "Failed to load story content.");
    }
  }, [selectedStoryMeta, address]);

  // Auto-fetch when story selection changes
  useEffect(() => {
    if (sourceMode === "vault" && selectedStory) {
      setVaultText("");
      setVaultFetch("idle");
      loadVaultContent();
    }
  }, [sourceMode, selectedStory, loadVaultContent]);

  const sourceText = sourceMode === "vault" ? vaultText : pastedText;

  async function generate() {
    if (!sourceText.trim() || !genre) return;
    setLoading(true);
    setError("");
    setResult(null);

    const req: LoreGenerateRequest = {
      sourceText:     sourceText.slice(0, 3000),
      characters:     characters.map((c) => ({
        name:          c.name,
        traits:        c.traits,
        description:   c.description,
        walletAddress: c.walletAddress,
      })),
      genre:          `${genre}${tone ? ` · ${tone}` : ""}`,
      prompt:         prompt,
      creatorAddress: address,
    };

    try {
      const res = await fetch("/api/lore/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(req),
      });
      const data = (await res.json()) as LoreGenerateResponse & { error?: string };
      if (!res.ok || data.error) { setError(data.error ?? "Generation failed."); return; }

      const comic: LoreComic = {
        id:            crypto.randomUUID(),
        title:         data.title,
        tagline:       data.tagline,
        genre:         `${genre}${tone ? ` · ${tone}` : ""}`,
        theme:         data.theme,
        panels:        data.panels,
        characters:    characters.length
          ? characters
          : data.characters.map((c) => ({
              id:          crypto.randomUUID(),
              name:        c.name,
              description: c.expandedDescription,
              traits:      c.traits,
              appearedIn:  [],
              createdAt:   Date.now(),
            })),
        sourceText:    sourceText.slice(0, 3000),
        prompt:        prompt,
        createdBy:     address ?? "",
        collaborators: [],
        createdAt:     Date.now(),
      };
      setResult(comic);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(): Promise<string | null> {
    if (!result) return null;
    try {
      const blob = new Blob([JSON.stringify(result)], { type: "application/json" });
      const file = new File([blob], `lore-${result.id}.json`, { type: "application/json" });
      const form = new FormData();
      form.append("file", file);
      form.append("isPrivate", "false");
      const res  = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json() as { rootHash?: string; error?: string };
      if (!data.rootHash) return null;
      const updated = { ...result, zgRootHash: data.rootHash };
      setResult(updated);
      saveComic(updated);
      return data.rootHash;
    } catch { return null; }
  }

  return (
    <div className="space-y-8">
      {/* Step 1: Source */}
      <section className="space-y-3">
        <StepLabel n={1} title="Source Story" />
        <div className="flex gap-2 mb-3">
          {(["paste", "vault"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setSourceMode(m)}
              className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
                sourceMode === m
                  ? "border-brass/50 text-brass"
                  : "border-smoke/20 text-smoke/50 hover:border-smoke/40"
              }`}
            >
              {m === "paste" ? "Paste story text" : "Select from vault"}
            </button>
          ))}
        </div>

        {sourceMode === "paste" ? (
          <div>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value.slice(0, 3000))}
              placeholder="Paste or write your ancestral story here…"
              rows={6}
              className="input-dark w-full text-sm resize-none"
            />
            <p className="text-xs text-smoke/30 font-mono mt-1 text-right">
              {pastedText.length}/3000
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {vaults.length === 0 ? (
              <p className="text-sm text-smoke/40 font-mono">Connect wallet to load your vaults.</p>
            ) : (
              <>
                <select
                  value={selectedVaultId?.toString() ?? ""}
                  onChange={(e) => {
                    const v = vaults.find((v) => v.id.toString() === e.target.value);
                    if (v) selectVault(v.id);
                    setSelectedStory("");
                    setVaultText("");
                    setVaultFetch("idle");
                  }}
                  className="input-dark w-full text-sm"
                >
                  <option value="">Select vault…</option>
                  {vaults.map((v) => (
                    <option key={v.id.toString()} value={v.id.toString()}>{v.name}</option>
                  ))}
                </select>
                {selectedVault && (
                  <select
                    value={selectedStory}
                    onChange={(e) => setSelectedStory(e.target.value)}
                    className="input-dark w-full text-sm"
                  >
                    <option value="">Select story…</option>
                    {stories.filter((s) => s.mediaType === "text").map((s) => (
                      <option key={s.id.toString()} value={s.id.toString()}>{s.title}</option>
                    ))}
                  </select>
                )}
                {vaultFetch === "loading" && (
                  <p className="text-xs font-mono text-smoke/50 animate-pulse">Loading story content from 0G...</p>
                )}
                {vaultFetch === "done" && vaultText && (
                  <div className="vault-glass border border-moss/20 rounded p-3">
                    <p className="text-xs font-mono text-moss/60 mb-1">Story content loaded ({vaultText.length} chars)</p>
                    <p className="text-xs text-smoke/50 font-mono line-clamp-3">{vaultText.slice(0, 200)}...</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* Step 2: Characters */}
      <section className="space-y-3">
        <StepLabel n={2} title="Characters" subtitle="optional · max 5" />
        <CharacterBuilder value={characters} onChange={setCharacters} />
      </section>

      {/* Step 3: Genre + Tone */}
      <section className="space-y-4">
        <StepLabel n={3} title="Genre + Tone" />
        <div>
          <p className="font-mono text-xs text-smoke/50 mb-2">Genre</p>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g === genre ? "" : g)}
                className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
                  genre === g
                    ? "border-brass/60 text-brass bg-brass/10"
                    : "border-smoke/20 text-smoke/50 hover:border-smoke/40"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-xs text-smoke/50 mb-2">Tone</p>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t}
                onClick={() => setTone(t === tone ? "" : t)}
                className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
                  tone === t
                    ? "border-dusk/60 text-dusk bg-dusk/10"
                    : "border-smoke/20 text-smoke/50 hover:border-smoke/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-xs text-smoke/50 mb-2">Additional direction <span className="text-smoke/30">(optional)</span></p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
            placeholder="Anything specific you want the Weaver to focus on…"
            rows={2}
            className="input-dark w-full text-sm resize-none"
          />
        </div>
      </section>

      {/* Generate button */}
      <div>
        <button
          onClick={generate}
          disabled={loading || !sourceText.trim() || !genre}
          className="btn-brass w-full sm:w-auto px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Weaving Lore…" : "Generate Lore"}
        </button>
        {error && (
          <p className="text-xs text-burgundy/70 font-mono mt-2">{error}</p>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded bg-crypt/40 border border-brass/10" />
          ))}
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-brass/15 pt-8"
          >
            <LoreComicViewer
              comic={result}
              onSave={() => saveComic(result)}
              onUpload={handleUpload}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// My Comics Tab
// ─────────────────────────────────────────────────────────────────────────────

function MyComicsTab() {
  const [comics,       setComics]       = useState<LoreComic[]>([]);
  const [viewingComic, setViewingComic] = useState<LoreComic | null>(null);

  useEffect(() => {
    setComics(loadComics());
  }, []);

  if (comics.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-mono text-smoke/40 text-sm">No comics yet — generate your first lore above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {viewingComic ? (
        <div>
          <button
            onClick={() => setViewingComic(null)}
            className="text-xs font-mono text-smoke/50 hover:text-smoke/80 mb-6 flex items-center gap-1"
          >
            ← Back to My Comics
          </button>
          <LoreComicViewer
            comic={viewingComic}
            onSave={() => {
              saveComic(viewingComic);
              setComics(loadComics());
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {comics.map((comic) => (
            <div
              key={comic.id}
              className="vault-glass border border-brass/15 rounded p-4 space-y-2 hover:border-brass/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-serif text-parchment/90 text-sm leading-snug">{comic.title}</h3>
                <span className="text-[10px] font-mono text-brass/50 border border-brass/20 rounded px-1.5 py-0.5 shrink-0">
                  {comic.genre}
                </span>
              </div>
              {comic.tagline && (
                <p className="font-serif italic text-smoke/50 text-xs">{comic.tagline}</p>
              )}
              <p className="text-xs text-smoke/40 font-mono">
                {comic.panels.length} panels · {comic.characters.length} characters
              </p>
              <p className="text-[10px] text-smoke/30 font-mono">
                {new Date(comic.createdAt).toLocaleDateString()}
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setViewingComic(comic)}
                  className="text-xs font-mono text-brass/60 hover:text-brass transition-colors"
                >
                  View
                </button>
                {comic.zgRootHash ? (
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/lore/${comic.zgRootHash}`;
                      navigator.clipboard.writeText(url);
                    }}
                    className="text-xs font-mono text-moss/60 hover:text-moss transition-colors"
                  >
                    Copy Share Link
                  </button>
                ) : (
                  <span className="text-xs font-mono text-smoke/30">Upload first to share</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Collab Tab
// ─────────────────────────────────────────────────────────────────────────────

function CollabTab({ address }: { address?: `0x${string}` }) {
  const [mySource,     setMySource]     = useState("");
  const [myCharacters, setMyCharacters] = useState<LoreCharacter[]>([]);
  const [theirSeed,    setTheirSeed]    = useState("");
  const [theirParsed,  setTheirParsed]  = useState<{ sourceText: string; characters: LoreCharacter[] } | null>(null);
  const [genre,        setGenre]        = useState("");
  const [mergeNote,    setMergeNote]    = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [result,       setResult]       = useState<LoreComic | null>(null);
  const [seedCopied,   setSeedCopied]   = useState(false);

  function getSeed() {
    if (!mySource.trim()) return;
    const seed = JSON.stringify({
      sourceText:   mySource.slice(0, 2000),
      characters:   myCharacters.map((c) => ({
        name: c.name, traits: c.traits, description: c.description, walletAddress: c.walletAddress,
      })),
      ownerAddress: address ?? "",
    });
    navigator.clipboard.writeText(seed);
    setSeedCopied(true);
    setTimeout(() => setSeedCopied(false), 2500);
  }

  function importSeed() {
    try {
      const parsed = JSON.parse(theirSeed) as {
        sourceText: string;
        characters: LoreCharacter[];
        ownerAddress?: string;
      };
      if (!parsed.sourceText) { setError("Invalid seed — missing sourceText."); return; }
      setTheirParsed({ sourceText: parsed.sourceText, characters: parsed.characters ?? [] });
      setError("");
    } catch {
      setError("Could not parse seed JSON. Make sure it is valid.");
    }
  }

  async function generateMerge() {
    if (!mySource.trim() || !theirParsed || !genre) return;
    setLoading(true);
    setError("");
    setResult(null);

    const req: LoreMergeRequest = {
      loreA: {
        sourceText:   mySource.slice(0, 2000),
        characters:   myCharacters.map((c) => ({
          name: c.name, traits: c.traits, description: c.description, walletAddress: c.walletAddress,
        })),
        ownerAddress: address ?? "",
      },
      loreB: {
        sourceText:   theirParsed.sourceText.slice(0, 2000),
        characters:   (theirParsed.characters ?? []).map((c) => ({
          name: c.name, traits: c.traits, description: c.description ?? "", walletAddress: c.walletAddress,
        })),
        ownerAddress: "",
      },
      genre,
      mergePrompt: mergeNote,
    };

    try {
      const res  = await fetch("/api/lore/merge", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(req),
      });
      const data = await res.json() as { title?: string; tagline?: string; theme?: string; panels?: unknown[]; characters?: unknown[]; error?: string };
      if (!res.ok || data.error) { setError(data.error ?? "Merge failed."); return; }

      const comic: LoreComic = {
        id:            crypto.randomUUID(),
        title:         data.title ?? "Untitled Crossover",
        tagline:       data.tagline ?? "",
        genre,
        theme:         data.theme ?? "",
        panels:        (data.panels as LoreComic["panels"]) ?? [],
        characters:    [
          ...myCharacters,
          ...(theirParsed.characters ?? []).filter(
            (c) => !myCharacters.some((m) => m.name === c.name)
          ),
        ],
        sourceText:    `${mySource} | ${theirParsed.sourceText}`,
        prompt:        mergeNote,
        createdBy:     address ?? "",
        collaborators: [],
        createdAt:     Date.now(),
      };
      setResult(comic);
      saveComic(comic);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* My Lore */}
        <div className="space-y-4">
          <h3 className="font-mono text-xs text-brass/60 uppercase tracking-widest">Your Lore</h3>
          <div>
            <textarea
              value={mySource}
              onChange={(e) => setMySource(e.target.value.slice(0, 2000))}
              placeholder="Your ancestral story…"
              rows={5}
              className="input-dark w-full text-sm resize-none"
            />
            <p className="text-xs text-smoke/30 font-mono mt-1 text-right">{mySource.length}/2000</p>
          </div>
          <CharacterBuilder value={myCharacters} onChange={setMyCharacters} />
          <button
            onClick={getSeed}
            disabled={!mySource.trim()}
            className="text-xs font-mono text-smoke/60 border border-smoke/20 rounded px-3 py-1.5 hover:border-smoke/40 transition-colors disabled:opacity-40"
          >
            {seedCopied ? "Copied!" : "Get My Seed"}
          </button>
          <p className="text-xs text-smoke/30 font-mono">
            Share this seed with a collaborator so they can import your lore.
          </p>
        </div>

        {/* Their Lore */}
        <div className="space-y-4">
          <h3 className="font-mono text-xs text-dusk/60 uppercase tracking-widest">Their Lore</h3>
          <textarea
            value={theirSeed}
            onChange={(e) => setTheirSeed(e.target.value)}
            placeholder="Paste collaborator seed JSON here…"
            rows={5}
            className="input-dark w-full text-sm resize-none"
          />
          <button
            onClick={importSeed}
            disabled={!theirSeed.trim()}
            className="text-xs font-mono text-dusk/60 border border-dusk/25 rounded px-3 py-1.5 hover:border-dusk/50 transition-colors disabled:opacity-40"
          >
            Import Seed
          </button>
          {theirParsed && (
            <div className="vault-glass border border-dusk/20 rounded p-3 space-y-1">
              <p className="text-xs font-mono text-dusk/60">✓ Seed imported</p>
              <p className="text-xs font-mono text-smoke/50 truncate">
                {theirParsed.sourceText.slice(0, 80)}…
              </p>
              {theirParsed.characters.length > 0 && (
                <p className="text-xs text-smoke/40 font-mono">
                  Characters: {theirParsed.characters.map((c) => c.name).join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Genre + note */}
      <div className="space-y-3">
        <p className="font-mono text-xs text-smoke/50">Genre</p>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g === genre ? "" : g)}
              className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
                genre === g
                  ? "border-brass/60 text-brass bg-brass/10"
                  : "border-smoke/20 text-smoke/50 hover:border-smoke/40"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <div>
          <p className="font-mono text-xs text-smoke/50 mb-2">Merge note <span className="text-smoke/30">(optional)</span></p>
          <input
            value={mergeNote}
            onChange={(e) => setMergeNote(e.target.value.slice(0, 300))}
            placeholder="How should these two worlds connect?"
            className="input-dark w-full text-sm"
          />
        </div>
      </div>

      <button
        onClick={generateMerge}
        disabled={loading || !mySource.trim() || !theirParsed || !genre}
        className="btn-brass w-full sm:w-auto px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Weaving Crossover…" : "Generate Merged Lore"}
      </button>
      {error && <p className="text-xs text-burgundy/70 font-mono">{error}</p>}

      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-brass/15 pt-8"
          >
            <LoreComicViewer comic={result} onSave={() => saveComic(result)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Educate Tab — UNICEF-inspired educational comics
// ─────────────────────────────────────────────────────────────────────────────

const REGIONS = ["West Africa", "East Africa", "South Asia", "East Asia", "Middle East", "Caribbean", "Latin America", "Pacific Islands"];

function EducateTab({ address }: { address?: `0x${string}` }) {
  const [sourceText,   setSourceText]   = useState("");
  const [ageMode,      setAgeMode]      = useState<EduAgeMode>("young-learners");
  const [region,       setRegion]       = useState("");
  const [culture,      setCulture]      = useState("");
  const [topic,        setTopic]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [result,       setResult]       = useState<LoreComic | null>(null);

  async function generate() {
    if (!sourceText.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    const req: EduComicRequest = {
      sourceText:     sourceText.slice(0, 3000),
      region:         region || undefined,
      culture:        culture || undefined,
      topic:          topic || undefined,
      ageMode,
      creatorAddress: address,
    };

    try {
      const res = await fetch("/api/lore/educate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(req),
      });
      const data = (await res.json()) as EduComicResponse & { error?: string };
      if (!res.ok || data.error) { setError(data.error ?? "Generation failed."); return; }

      const comic: LoreComic = {
        id:            crypto.randomUUID(),
        title:         data.title,
        tagline:       data.tagline,
        genre:         `Educational · ${ageMode === "young-learners" ? "Ages 5–10" : "Ages 8–14"}`,
        theme:         data.theme,
        panels:        data.panels,
        characters:    data.characters.map((c) => ({
          id:          crypto.randomUUID(),
          name:        c.name,
          description: c.expandedDescription,
          traits:      c.traits,
          appearedIn:  [],
          createdAt:   Date.now(),
        })),
        sourceText:    sourceText.slice(0, 3000),
        prompt:        `[EDU:${ageMode}] ${topic || "general"}`,
        createdBy:     address ?? "",
        collaborators: [],
        createdAt:     Date.now(),
      };
      setResult(comic);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="vault-glass border border-moss/20 rounded p-4">
        <p className="font-serif text-parchment/90 text-sm">
          Create age-appropriate educational comics from cultural stories.
          Designed for children to learn about heritage, traditions, and history
          from around the world.
        </p>
      </div>

      {/* Age mode selector */}
      <section className="space-y-3">
        <StepLabel n={1} title="Age Group" />
        <div className="flex gap-3">
          {([
            { mode: "young-learners" as const, label: "Young Learners", desc: "Ages 5–10 · 4 panels · simple vocabulary" },
            { mode: "explorers" as const,      label: "Explorers",      desc: "Ages 8–14 · 6 panels · cultural depth + discussion" },
          ]).map(({ mode, label, desc }) => (
            <button
              key={mode}
              onClick={() => setAgeMode(mode)}
              className={`flex-1 text-left p-3 rounded border transition-colors ${
                ageMode === mode
                  ? "border-moss/50 bg-moss/10"
                  : "border-smoke/20 hover:border-smoke/40"
              }`}
            >
              <p className={`font-mono text-xs ${ageMode === mode ? "text-moss" : "text-smoke/60"}`}>{label}</p>
              <p className="text-[10px] text-smoke/40 font-mono mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Source story */}
      <section className="space-y-3">
        <StepLabel n={2} title="Cultural Story" />
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value.slice(0, 3000))}
          placeholder="Paste or write a cultural story, folktale, or historical narrative…"
          rows={6}
          className="input-dark w-full text-sm resize-none"
        />
        <p className="text-xs text-smoke/30 font-mono text-right">{sourceText.length}/3000</p>
      </section>

      {/* Cultural context */}
      <section className="space-y-4">
        <StepLabel n={3} title="Cultural Context" subtitle="optional — helps the AI" />
        <div>
          <p className="font-mono text-xs text-smoke/50 mb-2">Region</p>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r === region ? "" : r)}
                className={`text-xs font-mono px-3 py-1.5 rounded border transition-colors ${
                  region === r
                    ? "border-moss/60 text-moss bg-moss/10"
                    : "border-smoke/20 text-smoke/50 hover:border-smoke/40"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="font-mono text-xs text-smoke/50 mb-1">Culture</p>
            <input
              value={culture}
              onChange={(e) => setCulture(e.target.value.slice(0, 100))}
              placeholder="e.g. Yoruba, Tamil, Quechua…"
              className="input-dark w-full text-sm"
            />
          </div>
          <div>
            <p className="font-mono text-xs text-smoke/50 mb-1">Topic / Lesson</p>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 200))}
              placeholder="e.g. respect for elders, harvest traditions…"
              className="input-dark w-full text-sm"
            />
          </div>
        </div>
      </section>

      {/* Generate */}
      <div>
        <button
          onClick={generate}
          disabled={loading || !sourceText.trim()}
          className="btn-brass w-full sm:w-auto px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating Story…" : "Create Educational Comic"}
        </button>
        {error && <p className="text-xs text-burgundy/70 font-mono mt-2">{error}</p>}
      </div>

      {loading && (
        <div className="space-y-3 animate-pulse">
          {[...Array(ageMode === "young-learners" ? 2 : 3)].map((_, i) => (
            <div key={i} className="h-24 rounded bg-crypt/40 border border-moss/10" />
          ))}
        </div>
      )}

      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-moss/15 pt-8"
          >
            <LoreComicViewer
              comic={result}
              onSave={() => saveComic(result)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step label
// ─────────────────────────────────────────────────────────────────────────────

function StepLabel({ n, title, subtitle }: { n: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-xs text-smoke/40">Step {n}</span>
      <span className="font-serif text-parchment/80 text-base">{title}</span>
      {subtitle && <span className="font-mono text-xs text-smoke/30">{subtitle}</span>}
    </div>
  );
}
