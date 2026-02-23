"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGenealogyTree } from "@/hooks/useGenealogy";
import { useVaultStore } from "@/store";
import type { Ancestor, AncestorLink } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// AncestorStoryLinker — right slide-in panel for linking stories to an ancestor
// ─────────────────────────────────────────────────────────────────────────────

interface AncestorStoryLinkerProps {
  ancestor:   Ancestor | null;
  onClose:    () => void;
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high:   "text-moss border-moss/40 bg-moss/10",
  medium: "text-aged border-aged/40 bg-aged/10",
  low:    "text-smoke/60 border-smoke/30 bg-smoke/5",
};

export function AncestorStoryLinker({ ancestor, onClose }: AncestorStoryLinkerProps) {
  const {
    tree, suggestedLinks, confirmedLinks,
    isSuggesting, suggestLinks,
    confirmLink, dismissLink,
  } = useGenealogyTree();

  const allStories = useVaultStore((s) => {
    return Object.values(s.stories).flat();
  });

  // Stories already linked to this ancestor
  const linkedIds = new Set(ancestor?.linkedStoryIds ?? []);

  // Suggestions for this ancestor
  const mySuggestions = useMemo(
    () => ancestor
      ? suggestedLinks.filter((l) => l.ancestorId === ancestor.id)
      : [],
    [suggestedLinks, ancestor],
  );

  // Confirmed links for this ancestor
  const myConfirmed = useMemo(
    () => ancestor
      ? confirmedLinks.filter((l) => l.ancestorId === ancestor.id)
      : [],
    [confirmedLinks, ancestor],
  );

  const handleSuggest = () => {
    if (!tree) return;
    suggestLinks(
      allStories.map((s) => ({
        id:        s.id.toString(),
        title:     s.title,
        vaultName: "", // vault name not critical for suggestion matching
      }))
    );
  };

  const handleLink = (storyId: string, link?: AncestorLink) => {
    if (!ancestor) return;
    confirmLink(link ?? {
      ancestorId:  ancestor.id,
      storyId,
      confidence:  "high",
      reason:      "Manually linked",
    });
  };

  const handleUnlink = (storyId: string) => {
    if (!ancestor) return;
    dismissLink(ancestor.id, storyId);
  };

  return (
    <AnimatePresence>
      {ancestor && (
        <motion.aside
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed right-0 top-0 bottom-0 z-30 w-80 flex flex-col
            border-l border-brass/15 overflow-hidden"
          style={{ background: "rgba(13,11,14,0.95)", backdropFilter: "blur(8px)" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-brass/10">
            <div>
              <p className="font-serif text-parchment text-base">
                {ancestor.givenName} {ancestor.surname}
              </p>
              <p className="text-xs font-mono text-smoke/60 mt-0.5">
                {[ancestor.birthYear, ancestor.deathYear].filter(Boolean).join("–")}
                {ancestor.birthPlace && ` · ${ancestor.birthPlace}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-smoke hover:text-aged transition-colors text-lg ml-2 mt-0.5"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">

            {/* Confirmed / manually linked */}
            {myConfirmed.length > 0 && (
              <section>
                <p className="text-xs font-mono text-smoke/50 uppercase tracking-widest mb-2">
                  Linked Stories
                </p>
                <div className="space-y-2">
                  {myConfirmed.map((link) => {
                    const story = allStories.find((s) => s.id.toString() === link.storyId);
                    return (
                      <div
                        key={link.storyId}
                        className="flex items-start justify-between gap-2 vault-glass rounded-sm p-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-parchment font-serif truncate">
                            {story?.title ?? `Story ${link.storyId}`}
                          </p>
                          {story && (
                            <p className="text-xs text-smoke/60 font-mono">{story.mediaType}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleUnlink(link.storyId)}
                          className="text-xs font-mono text-smoke/50 hover:text-red-400 transition-colors shrink-0"
                        >
                          Unlink
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* AI suggestions */}
            {mySuggestions.length > 0 && (
              <section>
                <p className="text-xs font-mono text-smoke/50 uppercase tracking-widest mb-2">
                  AI Suggestions
                </p>
                <div className="space-y-2">
                  {mySuggestions.map((link) => {
                    const story = allStories.find((s) => s.id.toString() === link.storyId);
                    return (
                      <div
                        key={link.storyId}
                        className="vault-glass rounded-sm p-2.5 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-parchment font-serif truncate min-w-0">
                            {story?.title ?? `Story ${link.storyId}`}
                          </p>
                          <span className={[
                            "text-[10px] font-mono px-1.5 py-0.5 rounded-sm border shrink-0",
                            CONFIDENCE_STYLES[link.confidence],
                          ].join(" ")}>
                            {link.confidence}
                          </span>
                        </div>
                        <p className="text-xs text-smoke/60 font-serif italic">{link.reason}</p>
                        <div className="flex gap-2 pt-0.5">
                          <button
                            onClick={() => handleLink(link.storyId, link)}
                            className="flex-1 text-xs font-mono py-1 rounded-sm border border-moss/40 text-moss hover:bg-moss/10 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleUnlink(link.storyId)}
                            className="flex-1 text-xs font-mono py-1 rounded-sm border border-smoke/30 text-smoke hover:bg-smoke/10 transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* All vault stories — manual linking */}
            <section>
              <p className="text-xs font-mono text-smoke/50 uppercase tracking-widest mb-2">
                All Stories
              </p>
              {allStories.length === 0 ? (
                <p className="text-xs text-smoke/50 font-serif italic">
                  Connect your wallet and open your vault to see stories.
                </p>
              ) : (
                <div className="space-y-2">
                  {allStories.map((story) => {
                    const isLinked = linkedIds.has(story.id.toString());
                    return (
                      <div
                        key={story.id.toString()}
                        className="flex items-center justify-between gap-2 vault-glass rounded-sm p-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-parchment font-serif truncate">{story.title}</p>
                          <p className="text-xs text-smoke/60 font-mono">{story.mediaType}</p>
                        </div>
                        <button
                          onClick={() => isLinked ? handleUnlink(story.id.toString()) : handleLink(story.id.toString())}
                          className={[
                            "text-xs font-mono shrink-0 transition-colors",
                            isLinked
                              ? "text-moss hover:text-red-400"
                              : "text-smoke/50 hover:text-aged",
                          ].join(" ")}
                        >
                          {isLinked ? "Linked ✓" : "Link"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Footer — AI suggest button */}
          <div className="p-4 border-t border-brass/10">
            <button
              onClick={handleSuggest}
              disabled={isSuggesting || allStories.length === 0}
              className="btn-brass w-full py-2 disabled:opacity-50"
            >
              {isSuggesting ? "Suggesting…" : "Suggest Links with AI"}
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
