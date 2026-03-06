"use client";

const LOCALES: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  pt: "Português",
  ar: "العربية",
  sw: "Kiswahili",
  hi: "हिन्दी",
  yo: "Yorùbá",
  ig: "Igbo",
  ha: "Hausa",
};

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

function setCookie(name: string, value: string, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + days * 86400000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

export function LangSwitcher() {
  const current = getCookie("lingo-locale") ?? "en";

  return (
    <select
      value={current}
      onChange={(e) => {
        setCookie("lingo-locale", e.target.value);
        window.location.reload();
      }}
      className="bg-transparent border border-brass/20 rounded text-xs font-mono text-smoke/70 px-1.5 py-1 hover:border-brass/40 transition-colors focus:outline-none focus:border-brass/60 cursor-pointer"
    >
      {Object.entries(LOCALES).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
}
