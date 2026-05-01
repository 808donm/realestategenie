"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme, type ThemePreference } from "./theme-provider";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function ThemeToggle() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Toggle theme"
        title={`Theme: ${preference}`}
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-center rounded-md p-2 text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
      >
        <Icon size={18} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-40 rounded-md border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden z-50"
        >
          {OPTIONS.map((opt) => {
            const Active = opt.icon;
            const isActive = preference === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setPreference(opt.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted ${
                  isActive ? "text-foreground font-medium" : "text-foreground/70"
                }`}
              >
                <Active size={16} />
                <span>{opt.label}</span>
                {isActive && <span className="ml-auto text-xs text-muted-foreground">●</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
