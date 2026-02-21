"use client";

import { useEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// WaveformPreview — WaveSurfer.js audio visualization
// Shows a placeholder skeleton until audio is loaded
// ─────────────────────────────────────────────────────────────────────────────

interface WaveformPreviewProps {
  audioUrl?: string;   // If undefined, renders a placeholder waveform
  duration?: number;   // seconds
  title?:    string;
}

export function WaveformPreview({ audioUrl, duration, title }: WaveformPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef        = useRef<import("wavesurfer.js").default | null>(null);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [isReady,    setIsReady]    = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!audioUrl || !containerRef.current) return;

    let destroyed = false;

    (async () => {
      const WaveSurfer = (await import("wavesurfer.js")).default;
      if (destroyed) return;

      wsRef.current = WaveSurfer.create({
        container:   containerRef.current!,
        waveColor:   "#6B5D7A",
        progressColor:"#B8860B",
        cursorColor: "#DAA520",
        barWidth:    2,
        barGap:      1,
        barRadius:   2,
        height:      64,
        normalize:   true,
        backend:     "WebAudio",
      });

      wsRef.current.on("ready",   () => { if (!destroyed) setIsReady(true); });
      wsRef.current.on("play",    () => { if (!destroyed) setIsPlaying(true); });
      wsRef.current.on("pause",   () => { if (!destroyed) setIsPlaying(false); });
      wsRef.current.on("finish",  () => { if (!destroyed) setIsPlaying(false); });
      wsRef.current.on("timeupdate", (t: number) => {
        if (!destroyed) setCurrentTime(t);
      });

      wsRef.current.load(audioUrl);
    })();

    return () => {
      destroyed = true;
      wsRef.current?.destroy();
      wsRef.current = null;
      setIsReady(false);
      setIsPlaying(false);
    };
  }, [audioUrl]);

  const togglePlay = () => wsRef.current?.playPause();

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="rounded-sm border border-brass/20 bg-shadow/60 backdrop-blur-sm p-4">
      {/* Title */}
      {title && (
        <p className="font-serif text-parchment text-sm mb-3 truncate">{title}</p>
      )}

      {/* Waveform or placeholder */}
      <div className="relative">
        {!isReady && (
          <WaveformSkeleton />
        )}
        <div
          ref={containerRef}
          className={!isReady ? "opacity-0 absolute inset-0" : "opacity-100"}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={togglePlay}
          disabled={!isReady && !!audioUrl}
          className={[
            "h-8 w-8 rounded-full flex items-center justify-center",
            "border border-brass/40 hover:border-brass",
            "bg-dusk hover:bg-brass/10",
            "text-brass transition-all duration-200",
            "disabled:opacity-30 disabled:cursor-not-allowed",
          ].join(" ")}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6"  y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <span className="text-xs font-mono text-smoke">
          {isReady ? fmtTime(currentTime) : "0:00"}
          {duration ? ` / ${fmtTime(duration)}` : ""}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder skeleton waveform (no audio loaded yet)
// ─────────────────────────────────────────────────────────────────────────────

function WaveformSkeleton() {
  const bars = Array.from({ length: 60 }, (_, i) => {
    const heights = [20, 35, 55, 45, 30, 60, 40, 25, 50, 38];
    return heights[i % heights.length];
  });

  return (
    <div className="flex items-center gap-[2px] h-16 px-1" aria-hidden>
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-smoke/30 animate-pulse"
          style={{
            height:          `${h}%`,
            animationDelay:  `${(i % 10) * 0.1}s`,
            animationDuration:"2s",
          }}
        />
      ))}
    </div>
  );
}
