"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLoreLichStore } from "@/store";
import type { LoreLichMessage } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// LoreLichChat — AI guardian chat interface
// Communicates with /api/lorelich route (server-side Claude API)
// ─────────────────────────────────────────────────────────────────────────────

// Prompt injection patterns to reject client-side
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|prior)/i,
  /<\|im_start\|>/i,
  /system:/i,
  /\[INST\]/i,
  /###\s*instruction/i,
];

function sanitizeInput(input: string): string {
  let clean = input.trim().slice(0, 1000); // hard cap
  for (const pat of INJECTION_PATTERNS) {
    if (pat.test(clean)) {
      throw new Error("Query contains disallowed patterns.");
    }
  }
  return clean;
}

export function LoreLichChat() {
  const { messages, isLoading, contextStory, addMessage, setLoading, clearMessages } =
    useLoreLichStore();

  const [input,   setInput]   = useState("");
  const [error,   setError]   = useState<string | null>(null);
  const bottomRef             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let sanitized: string;
    try {
      sanitized = sanitizeInput(input);
    } catch (err) {
      setError((err as Error).message);
      return;
    }

    if (!sanitized) return;
    setInput("");

    const userMsg: LoreLichMessage = {
      role:      "user",
      content:   sanitized,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setLoading(true);

    try {
      const res = await fetch("/api/lorelich", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          query: sanitized,
          storyContext: contextStory
            ? {
                title:     contextStory.title,
                mediaType: contextStory.mediaType,
                duration:  Number(contextStory.duration),
                vaultName: "Ancestral Vault",
              }
            : undefined,
          conversationHistory: messages.slice(-10).map((m) => ({
            role:    m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "The Vault did not respond.");
      }

      const { response } = await res.json();
      addMessage({ role: "assistant", content: response, timestamp: Date.now() });
    } catch (err) {
      setError((err as Error).message);
      addMessage({
        role:      "assistant",
        content:   "The ancestral winds are silent for now. Please try again.",
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full border border-brass/20 rounded-sm bg-shadow/60 backdrop-blur-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-brass/20 bg-dusk/50">
        <div className="flex items-center gap-2">
          <span className="text-lg animate-candle-flicker">🕯</span>
          <div>
            <p className="font-serif text-parchment text-sm">LoreLich</p>
            <p className="text-xs text-smoke font-mono">Guardian of Ancestral Stories</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="text-xs text-smoke hover:text-aged transition-colors font-mono"
            aria-label="Clear conversation"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <p className="font-serif text-aged text-sm leading-relaxed italic">
              "I am the LoreLich — keeper of what was spoken<br />
              before it could be written.<br />
              Ask me of the stories in your vault."
            </p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}
        </AnimatePresence>

        {isLoading && <TypingIndicator />}
        {error && (
          <p className="text-xs text-burgundy/80 font-mono text-center">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-brass/20 bg-dusk/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the guardian..."
            maxLength={1000}
            disabled={isLoading}
            className={[
              "flex-1 bg-crypt/80 border border-brass/20 rounded-sm",
              "px-3 py-2 text-sm text-parchment placeholder-smoke",
              "font-mono focus:outline-none focus:border-brass/50",
              "disabled:opacity-50 transition-colors duration-200",
            ].join(" ")}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={[
              "px-4 py-2 rounded-sm text-sm font-mono",
              "border border-brass/40 hover:border-brass",
              "bg-dusk hover:bg-brass/10 text-brass",
              "transition-all duration-200",
              "disabled:opacity-30 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────────────────────────────────────

function ChatMessage({ message }: { message: LoreLichMessage }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={[
          "max-w-[85%] rounded-sm px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-dusk border border-brass/20 text-parchment font-mono"
            : "bg-shadow border border-brass/10 text-aged font-serif italic",
        ].join(" ")}
      >
        {!isUser && (
          <span className="text-brass/60 text-xs font-mono not-italic block mb-1">
            LoreLich
          </span>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-start"
    >
      <div className="bg-shadow border border-brass/10 rounded-sm px-3 py-2 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-brass/50 animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </motion.div>
  );
}
