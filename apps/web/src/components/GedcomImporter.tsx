"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { parseGedcom } from "@/hooks/useGenealogy";
import { useGenealogyTree } from "@/hooks/useGenealogy";

// ─────────────────────────────────────────────────────────────────────────────
// GedcomImporter — file drop zone for .ged files with preview and confirm
// ─────────────────────────────────────────────────────────────────────────────

export function GedcomImporter() {
  const { importGedcom, isImporting } = useGenealogyTree();
  const fileInputRef  = useRef<HTMLInputElement>(null);

  const [dragging,    setDragging]    = useState(false);
  const [preview,     setPreview]     = useState<{ count: number; text: string } | null>(null);
  const [error,       setError]       = useState("");

  const processFile = (file: File) => {
    setError("");
    if (!file.name.endsWith(".ged") && !file.name.endsWith(".gedcom")) {
      setError("Only .ged or .gedcom files are supported.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = parseGedcom(text);
        setPreview({ count: parsed.ancestors.length, text });
      } catch {
        setError("Could not parse GEDCOM file. Please ensure it's a valid GEDCOM 5.5 file.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirm = () => {
    if (!preview) return;
    importGedcom(preview.text);
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* Drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={[
          "relative border-2 border-dashed rounded-sm p-10 text-center cursor-pointer transition-all duration-300",
          dragging
            ? "border-brass bg-brass/8"
            : preview
            ? "border-moss/50 bg-moss/5"
            : "border-brass/25 hover:border-brass/50 hover:bg-brass/5",
        ].join(" ")}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !preview && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".ged,.gedcom"
          onChange={handleFileChange}
          className="hidden"
        />

        {preview ? (
          <div className="space-y-2">
            <div className="text-4xl">🌳</div>
            <p className="font-serif text-parchment text-lg">
              Found <span className="text-brass">{preview.count}</span> ancestor{preview.count !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-smoke font-mono">GEDCOM file ready to import</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-4xl opacity-40">🗂</div>
            <p className="font-serif text-aged text-lg">
              {dragging ? "Drop to import" : "Drop your GEDCOM file here"}
            </p>
            <p className="text-xs text-smoke font-mono">
              .ged or .gedcom · GEDCOM 5.5 format
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="text-xs font-mono text-aged/70 underline hover:text-aged transition-colors"
            >
              or click to browse
            </button>
          </div>
        )}
      </motion.div>

      {/* Error */}
      {error && (
        <p className="text-xs font-mono text-red-400 text-center">{error}</p>
      )}

      {/* Confirm / Reset */}
      {preview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-3"
        >
          <button
            onClick={handleConfirm}
            disabled={isImporting}
            className="btn-brass flex-1 py-2.5"
          >
            {isImporting ? "Importing…" : `Import ${preview.count} Ancestor${preview.count !== 1 ? "s" : ""}`}
          </button>
          <button
            onClick={() => { setPreview(null); setError(""); }}
            className="px-4 py-2.5 text-xs font-mono rounded-sm border border-smoke/30 text-smoke hover:text-aged transition-colors"
          >
            Cancel
          </button>
        </motion.div>
      )}

      {/* Format hint */}
      <div className="border border-brass/10 rounded-sm p-4 space-y-1.5">
        <p className="text-xs font-mono text-smoke/60 uppercase tracking-widest">About GEDCOM</p>
        <p className="text-xs text-smoke/70 font-serif">
          GEDCOM (Genealogical Data Communications) is the standard format for genealogy software.
          Export from <span className="text-aged">Ancestry</span>, <span className="text-aged">MyHeritage</span>,
          <span className="text-aged"> FamilySearch</span>, or <span className="text-aged">Gramps</span>.
        </p>
      </div>
    </div>
  );
}
