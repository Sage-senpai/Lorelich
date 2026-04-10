import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Academia Palette — tuned for readability
        crypt:    "#0D0B0E",        // Deepest background
        shadow:   "#1A1520",        // Card backgrounds
        dusk:     "#261E2E",        // Elevated surfaces
        brass:    "#C99A2E",        // Primary accent — warmer, more visible gold
        gold:     "#DAA520",        // Hover gold
        parchment:"#EDE0C8",        // Primary text — slightly brighter
        aged:     "#D4B896",        // Secondary text — bumped for readability
        smoke:    "#9A8CAA",        // Muted text — raised from #6B5D7A for contrast
        burgundy: "#8B3030",        // Danger / warning — visible on dark bg
        moss:     "#3D9B5A",        // Success / verified — readable green
        ember:    "#B86A3A",        // Warm accent — brighter
      },
      fontFamily: {
        serif:  ["'Playfair Display'", "Georgia", "serif"],
        mono:   ["'JetBrains Mono'", "monospace"],
        sans:   ["'Inter'", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "vault-gradient": "radial-gradient(ellipse at top, #1A1520 0%, #0D0B0E 70%)",
        "brass-glow":     "radial-gradient(circle, rgba(184,134,11,0.15) 0%, transparent 70%)",
        "smoke-layer":    "linear-gradient(180deg, rgba(13,11,14,0) 0%, rgba(13,11,14,0.8) 100%)",
      },
      boxShadow: {
        "vault":     "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(184,134,11,0.1)",
        "brass-glow":"0 0 30px rgba(184,134,11,0.3), 0 0 60px rgba(184,134,11,0.1)",
        "candle":    "0 0 20px rgba(218,165,32,0.4)",
      },
      animation: {
        "smoke-drift":  "smokeDrift 15s ease-in-out infinite",
        "smoke-rise":   "smokeRise 20s ease-in-out infinite",
        "candle-flicker":"candleFlicker 3s ease-in-out infinite",
        "fade-in":      "fadeIn 0.6s ease-out",
        "slide-up":     "slideUp 0.5s ease-out",
        "pulse-brass":  "pulseBrass 2s ease-in-out infinite",
      },
      keyframes: {
        smokeDrift: {
          "0%, 100%": { transform: "translateX(0) translateY(0) scale(1)", opacity: "0.15" },
          "33%":      { transform: "translateX(20px) translateY(-15px) scale(1.1)", opacity: "0.25" },
          "66%":      { transform: "translateX(-10px) translateY(-25px) scale(0.95)", opacity: "0.1" },
        },
        smokeRise: {
          "0%":    { transform: "translateY(100px) scale(0.8)", opacity: "0" },
          "20%":   { opacity: "0.2" },
          "80%":   { opacity: "0.1" },
          "100%":  { transform: "translateY(-200px) scale(1.3)", opacity: "0" },
        },
        candleFlicker: {
          "0%, 100%": { opacity: "1", transform: "scaleY(1)" },
          "50%":      { opacity: "0.85", transform: "scaleY(0.95)" },
          "75%":      { opacity: "0.95", transform: "scaleY(1.02)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseBrass: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(184,134,11,0.3)" },
          "50%":      { boxShadow: "0 0 30px rgba(184,134,11,0.6)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
