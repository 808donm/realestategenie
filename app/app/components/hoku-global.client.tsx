"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// Lazy-load the popup to avoid bundle bloat on every page
const GenieCopilotPopup = dynamic(
  () => import("@/components/genie-copilot-popup.client"),
  { ssr: false }
);

/**
 * Global Hoku floating button + copilot popup.
 * Mounted in the app layout so Hoku is available on every page.
 * Passes the current page path to the copilot for context awareness.
 */
export default function HokuGlobal() {
  const [isOpen, setIsOpen] = useState(false);
  const [actionContext, setActionContext] = useState<string | undefined>(undefined);
  const pathname = usePathname();

  // Listen for custom events from other components that want to open Hoku
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.actionContext) setActionContext(e.detail.actionContext);
      if (e.detail?.selectedProperty) {
        // Store in sessionStorage for the popup to pick up
        sessionStorage.setItem("hoku_selected_property", JSON.stringify(e.detail.selectedProperty));
      }
      if (e.detail?.selectedLead) {
        sessionStorage.setItem("hoku_selected_lead", JSON.stringify(e.detail.selectedLead));
      }
      setIsOpen(true);
    };
    window.addEventListener("open-hoku" as any, handler);
    return () => window.removeEventListener("open-hoku" as any, handler);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setActionContext(undefined);
    sessionStorage.removeItem("hoku_selected_property");
    sessionStorage.removeItem("hoku_selected_lead");
  }, []);

  const handleOpen = useCallback(() => {
    setActionContext(undefined);
    setIsOpen(true);
  }, []);

  return (
    <>
      {/* Floating Hoku button — bottom-right, always visible */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          aria-label="Open Hoku assistant"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            zIndex: 9998,
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.boxShadow = "0 6px 24px rgba(99, 102, 241, 0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(99, 102, 241, 0.4)";
          }}
        >
          ✦
        </button>
      )}

      {/* Copilot popup */}
      {isOpen && (
        <GenieCopilotPopup
          isOpen={isOpen}
          onClose={handleClose}
          actionContext={actionContext}
          currentPage={pathname}
        />
      )}
    </>
  );
}
