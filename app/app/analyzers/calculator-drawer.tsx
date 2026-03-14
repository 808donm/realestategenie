"use client";

import { useEffect } from "react";

interface CalculatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  href: string;
  title: string;
}

export default function CalculatorDrawer({ isOpen, onClose, href, title }: CalculatorDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: "relative",
          width: "min(90vw, 900px)",
          height: "100%",
          background: "#fff",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.25s ease-out",
        }}
      >
        {/* Drawer header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>{title}</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a
              href={href}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid #d1d5db",
                borderRadius: 6,
                background: "#fff",
                color: "#374151",
                textDecoration: "none",
              }}
            >
              Open Full Page
            </a>
            <button
              onClick={onClose}
              style={{
                padding: "6px 10px",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                background: "#fff",
                cursor: "pointer",
                fontSize: 16,
                color: "#6b7280",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Calculator content via iframe */}
        <iframe
          src={href}
          style={{
            flex: 1,
            width: "100%",
            border: "none",
          }}
          title={title}
        />
      </div>
    </div>
  );
}
