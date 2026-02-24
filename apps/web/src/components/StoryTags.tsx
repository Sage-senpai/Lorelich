"use client";

import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// StoryTags — inline tag editor for a story.
//
// Tags are stored in localStorage keyed by rootHash for immediate, offline-
// first UX. On mount, the component also checks the 0G KV Store (via the API
// route) and merges any tags found there.
//
// Usage:
//   <StoryTags rootHash={story.zgRootHash} />
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEY = (rootHash: string) => `lorelich_tags_${rootHash}`;
const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 30;

interface StoryTagsProps {
  rootHash: string;
}

export function StoryTags({ rootHash }: StoryTagsProps) {
  const [tags,     setTags]     = useState<string[]>([]);
  const [editing,  setEditing]  = useState(false);
  const [input,    setInput]    = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount; optionally merge from 0G KV
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY(rootHash));
    const local: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    setTags(local);

    // Background check against 0G KV (no await — just a best-effort merge)
    if (rootHash.startsWith("0x") && rootHash.length === 66) {
      fetch(`/api/kv/tag?rootHash=${encodeURIComponent(rootHash)}`)
        .then((r) => r.json())
        .then((data: { tags?: string[] }) => {
          if (!data.tags || data.tags.length === 0) return;
          // Merge: union of local + remote, deduped
          setTags((prev) => {
            const merged = Array.from(new Set([...prev, ...data.tags!]));
            localStorage.setItem(LS_KEY(rootHash), JSON.stringify(merged));
            return merged;
          });
        })
        .catch(() => {/* KV unavailable — silently ignore */});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootHash]);

  // Persist to localStorage whenever tags change
  function persist(next: string[]) {
    setTags(next);
    localStorage.setItem(LS_KEY(rootHash), JSON.stringify(next));
  }

  function addTag() {
    const tag = input.trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
    if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return;
    persist([...tags, tag]);
    setInput("");
  }

  function removeTag(tag: string) {
    persist(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Escape") {
      setEditing(false);
    }
    if (e.key === "Backspace" && input === "" && tags.length > 0) {
      persist(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      {/* Existing tag pills */}
      {tags.map((tag) => (
        <span
          key={tag}
          className="group inline-flex items-center gap-1 text-xs font-mono
            px-2 py-0.5 rounded-full border border-brass/20 text-smoke/60
            bg-brass/5 hover:border-brass/40 transition-colors"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            aria-label={`Remove tag ${tag}`}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-smoke
              leading-none transition-opacity"
          >
            ×
          </button>
        </span>
      ))}

      {/* Inline input when editing */}
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { addTag(); setEditing(false); }}
          placeholder="add tag…"
          maxLength={MAX_TAG_LENGTH}
          className="text-xs font-mono bg-transparent border-b border-brass/30 text-smoke/70
            placeholder-smoke/30 outline-none w-24 focus:border-brass/60 transition-colors"
          autoFocus
        />
      ) : (
        tags.length < MAX_TAGS && (
          <button
            onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="text-xs font-mono text-smoke/30 hover:text-smoke/60
              border border-dashed border-smoke/20 hover:border-smoke/40
              px-2 py-0.5 rounded-full transition-colors"
          >
            + tag
          </button>
        )
      )}
    </div>
  );
}
