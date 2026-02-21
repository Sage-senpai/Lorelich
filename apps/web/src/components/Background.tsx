"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Smoky Animated Background — dark academia crypt atmosphere
// Three independently drifting smoke layers + a brass candle glow
// ─────────────────────────────────────────────────────────────────────────────

export function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-crypt" aria-hidden>

      {/* Base radial gradient */}
      <div className="absolute inset-0 bg-vault-gradient" />

      {/* Smoke layer 1 — slow horizontal drift */}
      <div
        className="absolute inset-0 animate-smoke-drift"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% 60%, rgba(107,93,122,0.18) 0%, transparent 70%)",
          animationDuration: "18s",
          animationDelay:    "0s",
        }}
      />

      {/* Smoke layer 2 — medium drift, offset timing */}
      <div
        className="absolute inset-0 animate-smoke-drift"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 75% 40%, rgba(74,14,14,0.12) 0%, transparent 65%)",
          animationDuration: "24s",
          animationDelay:    "6s",
        }}
      />

      {/* Smoke layer 3 — subtle top mist */}
      <div
        className="absolute inset-0 animate-smoke-drift"
        style={{
          background:
            "radial-gradient(ellipse 100% 30% at 50% 10%, rgba(38,30,46,0.4) 0%, transparent 80%)",
          animationDuration: "30s",
          animationDelay:    "12s",
        }}
      />

      {/* Rising smoke particles */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-smoke-rise"
          style={{
            left:              `${15 + i * 18}%`,
            bottom:            "-20px",
            width:             `${80 + i * 30}px`,
            height:            `${120 + i * 40}px`,
            background:        "radial-gradient(ellipse, rgba(107,93,122,0.15) 0%, transparent 70%)",
            animationDuration: `${16 + i * 5}s`,
            animationDelay:    `${i * 3}s`,
            borderRadius:      "50%",
            filter:            "blur(8px)",
          }}
        />
      ))}

      {/* Brass candle glow — top center */}
      <div
        className="absolute top-[-100px] left-1/2 -translate-x-1/2 animate-candle-flicker"
        style={{
          width:      "600px",
          height:     "400px",
          background: "radial-gradient(ellipse, rgba(184,134,11,0.12) 0%, rgba(218,165,32,0.05) 40%, transparent 70%)",
          filter:     "blur(20px)",
        }}
      />

      {/* Bottom vignette */}
      <div
        className="absolute bottom-0 left-0 right-0 h-64"
        style={{
          background: "linear-gradient(0deg, rgba(13,11,14,1) 0%, transparent 100%)",
        }}
      />

      {/* Subtle grain texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize:   "256px",
        }}
      />
    </div>
  );
}
