"use client";

import { LocaleSwitcher } from "lingo.dev/react/client";

const LOCALES = ["en", "es", "fr", "pt", "ar", "sw", "hi", "yo", "ig", "ha"];

export function LangSwitcher() {
  return (
    <LocaleSwitcher
      locales={LOCALES}
      className="bg-transparent border border-brass/20 rounded text-xs font-mono text-smoke/70 px-1.5 py-1 hover:border-brass/40 transition-colors focus:outline-none focus:border-brass/60 cursor-pointer"
    />
  );
}
