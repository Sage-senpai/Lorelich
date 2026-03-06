"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const NAV_LINKS = [
  { href: "/vault",       label: "Vaults"      },
  { href: "/upload",      label: "Upload"      },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/pitch",       label: "Pitch"       },
  { href: "/lore",        label: "Lore"        },
  { href: "/tree",        label: "Tree"        },
  { href: "/search",      label: "Search"      },
  { href: "/learn",       label: "Learn"       },
  { href: "/proverbs",    label: "Proverbs"    },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex flex-col justify-center gap-1.5 p-1.5 text-smoke hover:text-aged transition-colors"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        <span
          className={[
            "block w-5 h-px bg-current transition-all duration-200 origin-center",
            open ? "rotate-45 translate-y-[4px]" : "",
          ].join(" ")}
        />
        <span
          className={[
            "block w-5 h-px bg-current transition-all duration-200",
            open ? "opacity-0" : "",
          ].join(" ")}
        />
        <span
          className={[
            "block w-5 h-px bg-current transition-all duration-200 origin-center",
            open ? "-rotate-45 -translate-y-[7px]" : "",
          ].join(" ")}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-14 left-0 right-0 z-40 border-b border-brass/10 py-2"
            style={{ background: "rgba(13,11,14,0.97)", backdropFilter: "blur(8px)" }}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-5 py-2.5 font-mono text-sm text-smoke hover:text-aged hover:bg-brass/5 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
