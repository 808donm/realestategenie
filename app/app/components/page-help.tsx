"use client";

import { useState, useRef, useEffect } from "react";

interface PageHelpProps {
  title: string;
  description: string;
  tips?: string[];
}

export default function PageHelp({ title, description, tips }: PageHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="What's this page?"
        style={{
          padding: "4px 10px",
          fontSize: 12,
          fontWeight: 600,
          border: "1px solid hsl(var(--border))",
          borderRadius: 6,
          background: isOpen ? "#f3f4f6" : "#fff",
          color: "hsl(var(--muted-foreground))",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span style={{ fontSize: 14 }}>?</span> Help
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            padding: 16,
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            zIndex: 40,
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: "hsl(var(--foreground))" }}>{title}</div>
          <p style={{ color: "#4b5563", lineHeight: 1.6, margin: "0 0 12px" }}>{description}</p>
          {tips && tips.length > 0 && (
            <>
              <div style={{ fontWeight: 600, fontSize: 12, color: "hsl(var(--muted-foreground))", marginBottom: 6 }}>Tips:</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {tips.map((tip, i) => (
                  <li key={i} style={{ color: "#4b5563", lineHeight: 1.6, marginBottom: 4, fontSize: 12 }}>
                    {tip}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
