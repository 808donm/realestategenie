"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  type: "lead" | "contact" | "listing";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  meta: string;
}

const TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  lead: { bg: "#fef2f2", color: "#ef4444", label: "Lead" },
  contact: { bg: "#eff6ff", color: "#3b82f6", label: "Contact" },
  listing: { bg: "#ecfdf5", color: "#059669", label: "Listing" },
};

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcut: Ctrl+K or Cmd+K to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    router.push(result.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0 && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  return (
    <div ref={containerRef} className="noprint" style={{ position: "relative", width: "100%", maxWidth: 480 }}>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); setSelectedIndex(-1); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search leads, contacts, listings... (Ctrl+K)"
          style={{
            width: "100%",
            padding: "8px 12px 8px 36px",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            fontSize: 13,
            background: "#f9fafb",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <svg
          style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>

      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 50,
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {isSearching && (
            <div style={{ padding: "12px 16px", fontSize: 13, color: "#9ca3af" }}>Searching...</div>
          )}
          {!isSearching && results.length === 0 && query.length >= 2 && (
            <div style={{ padding: "12px 16px", fontSize: 13, color: "#9ca3af" }}>No results found</div>
          )}
          {results.map((r, i) => {
            const style = TYPE_STYLES[r.type];
            return (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => handleSelect(r)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "10px 14px",
                  border: "none",
                  borderBottom: "1px solid #f3f4f6",
                  background: i === selectedIndex ? "#f3f4f6" : "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                }}
              >
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: style.bg, color: style.color, whiteSpace: "nowrap" }}>
                  {style.label}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                  {r.subtitle && <div style={{ fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.subtitle}</div>}
                </div>
                {r.meta && <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>{r.meta}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
