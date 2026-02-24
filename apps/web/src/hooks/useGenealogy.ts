"use client";

import { useCallback } from "react";
import { useTreeStore } from "@/store";
import type { GenealogyTree, Ancestor, AncestorLink, GenealogySuggestResponse } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// parseGedcom — pure client-side GEDCOM 5.5 parser (no external library)
//
// Handles:
//   INDI records: NAME, BIRT/DATE, BIRT/PLAC, DEAT/DATE
//   FAM  records: HUSB, WIFE, CHIL (for parent/child/spouse edges)
// ─────────────────────────────────────────────────────────────────────────────

export function parseGedcom(text: string): GenealogyTree {
  const lines = text.split(/\r?\n/);

  // Pass 1: collect all INDI and FAM records as raw tag→value maps
  const indiRecords: Record<string, Record<string, string>> = {};
  const famRecords:  Record<string, { husb?: string; wife?: string; children: string[] }> = {};

  let currentId   = "";
  let recordType  = "";     // "INDI" | "FAM" | ""
  let subContext  = "";     // "BIRT" | "DEAT" | ""

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    const level = parseInt(parts[0], 10);
    const tag   = parts[1] ?? "";
    const value = parts.slice(2).join(" ");

    if (level === 0) {
      // e.g. "0 @I001@ INDI"  or  "0 @F001@ FAM"
      subContext = "";
      if (tag.startsWith("@") && value === "INDI") {
        currentId  = tag;
        recordType = "INDI";
        indiRecords[currentId] = {};
      } else if (tag.startsWith("@") && value === "FAM") {
        currentId  = tag;
        recordType = "FAM";
        famRecords[currentId] = { children: [] };
      } else {
        currentId  = "";
        recordType = "";
      }
      continue;
    }

    if (!currentId) continue;

    if (recordType === "INDI") {
      if (level === 1 && (tag === "BIRT" || tag === "DEAT")) {
        subContext = tag;
      } else if (level === 1 && tag !== "BIRT" && tag !== "DEAT") {
        subContext = "";
      }

      if (level === 1 && tag === "NAME") {
        indiRecords[currentId]["NAME"] = value;
      } else if (level === 2 && tag === "DATE" && subContext === "BIRT") {
        indiRecords[currentId]["BIRT_DATE"] = value;
      } else if (level === 2 && tag === "PLAC" && subContext === "BIRT") {
        indiRecords[currentId]["BIRT_PLAC"] = value;
      } else if (level === 2 && tag === "DATE" && subContext === "DEAT") {
        indiRecords[currentId]["DEAT_DATE"] = value;
      }
    }

    if (recordType === "FAM") {
      if (level === 1 && tag === "HUSB") famRecords[currentId].husb = value;
      if (level === 1 && tag === "WIFE") famRecords[currentId].wife = value;
      if (level === 1 && tag === "CHIL") famRecords[currentId].children.push(value);
    }
  }

  // Pass 2: build parentIds / spouseIds / childIds from FAM records
  const parentIds:  Record<string, string[]> = {};
  const spouseIds:  Record<string, string[]> = {};
  const childIds:   Record<string, string[]> = {};

  for (const fam of Object.values(famRecords)) {
    const parents = [fam.husb, fam.wife].filter(Boolean) as string[];
    // Spouses of each other
    if (fam.husb && fam.wife) {
      (spouseIds[fam.husb] ??= []).push(fam.wife);
      (spouseIds[fam.wife] ??= []).push(fam.husb);
    }
    // Parents ← children
    for (const child of fam.children) {
      (parentIds[child] ??= []).push(...parents);
      for (const parent of parents) {
        (childIds[parent] ??= []).push(child);
      }
    }
  }

  // Pass 3: build Ancestor objects
  const ancestors: Ancestor[] = Object.entries(indiRecords).map(([id, fields]) => {
    const rawName   = fields["NAME"] ?? "";
    const nameParts = rawName.replace(/\//g, "").trim().split(/\s+/);
    // Surname is typically wrapped in // in GEDCOM, e.g. "John /Smith/"
    const surnameMatch = rawName.match(/\/(.+?)\//);
    const surname   = surnameMatch ? surnameMatch[1].trim() : nameParts[nameParts.length - 1] ?? "";
    const givenName = rawName.replace(/\/[^/]*\//g, "").trim() || (nameParts[0] ?? "");

    const birthYear = extractYear(fields["BIRT_DATE"]);
    const deathYear = extractYear(fields["DEAT_DATE"]);

    return {
      id,
      givenName,
      surname,
      birthYear,
      deathYear,
      birthPlace:    fields["BIRT_PLAC"],
      parentIds:     parentIds[id] ?? [],
      spouseIds:     spouseIds[id] ?? [],
      childIds:      childIds[id]  ?? [],
      linkedStoryIds: [],
    };
  });

  return { ancestors, importedAt: Date.now() };
}

function extractYear(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  const m = dateStr.match(/\b(\d{4})\b/);
  return m ? parseInt(m[1], 10) : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// useGenealogyTree — wraps store + parser + AI suggestion call
// ─────────────────────────────────────────────────────────────────────────────

export function useGenealogyTree() {
  const {
    tree, suggestedLinks, confirmedLinks,
    isImporting, isSuggesting,
    setTree, setSuggestedLinks, confirmLink, removeConfirmedLink, dismissLink,
    setImporting, setSuggesting,
    persistToStorage, loadFromStorage,
  } = useTreeStore();

  const importGedcom = useCallback((text: string) => {
    setImporting(true);
    try {
      const parsed = parseGedcom(text);
      // Store raw GEDCOM for potential re-parse
      parsed.rawGedcom = text;
      setTree(parsed);
      persistToStorage();
    } finally {
      setImporting(false);
    }
  }, [setImporting, setTree, persistToStorage]);

  const suggestLinks = useCallback(async (
    stories: Array<{ id: string; title: string; vaultName: string }>
  ) => {
    if (!tree || tree.ancestors.length === 0 || stories.length === 0) return;

    setSuggesting(true);
    try {
      const body = {
        ancestors: tree.ancestors.slice(0, 200).map((a) => ({
          id: a.id,
          givenName: a.givenName,
          surname: a.surname,
          birthYear: a.birthYear,
          birthPlace: a.birthPlace,
        })),
        stories: stories.slice(0, 500),
      };

      const res = await fetch("/api/genealogy/suggest", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      const data: GenealogySuggestResponse | { error: string } = await res.json();
      if ("error" in data) throw new Error(data.error);
      setSuggestedLinks(data.links);
    } catch (err) {
      console.error("[useGenealogyTree] suggest failed:", err);
    } finally {
      setSuggesting(false);
    }
  }, [tree, setSuggesting, setSuggestedLinks]);

  const confirmLinkAndPersist = useCallback((link: AncestorLink) => {
    confirmLink(link);
    // Also update the ancestor's linkedStoryIds in the tree
    useTreeStore.setState((s) => {
      if (!s.tree) return s;
      return {
        tree: {
          ...s.tree,
          ancestors: s.tree.ancestors.map((a) =>
            a.id === link.ancestorId && !a.linkedStoryIds.includes(link.storyId)
              ? { ...a, linkedStoryIds: [...a.linkedStoryIds, link.storyId] }
              : a
          ),
        },
      };
    });
    persistToStorage();
  }, [confirmLink, persistToStorage]);

  // removeConfirmedLink also persists — store action already updates tree.linkedStoryIds
  const removeConfirmedLinkAndPersist = useCallback((ancestorId: string, storyId: string) => {
    removeConfirmedLink(ancestorId, storyId);
    // persistToStorage reads store state after the synchronous set() above
    setTimeout(() => persistToStorage(), 0);
  }, [removeConfirmedLink, persistToStorage]);

  return {
    tree,
    suggestedLinks,
    confirmedLinks,
    isImporting,
    isSuggesting,
    importGedcom,
    suggestLinks,
    confirmLink:         confirmLinkAndPersist,
    removeConfirmedLink: removeConfirmedLinkAndPersist,
    dismissLink,
    loadFromStorage,
  };
}
