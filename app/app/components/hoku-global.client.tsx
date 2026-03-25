"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Lazy-load the popup and property modal to avoid bundle bloat
const GenieCopilotPopup = dynamic(
  () => import("@/components/genie-copilot-popup.client"),
  { ssr: false }
);

const PropertyDetailModal = dynamic(
  () => import("@/app/app/property-data/property-detail-modal.client"),
  { ssr: false }
);

/**
 * Global Hoku floating button + copilot popup + property detail modal.
 * Mounted in the app layout so Hoku is available on every page.
 * Also handles opening property detail modals from Hoku search results.
 */
export default function HokuGlobal() {
  const [isOpen, setIsOpen] = useState(false);
  const [actionContext, setActionContext] = useState<string | undefined>(undefined);
  const [modalProperty, setModalProperty] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Listen for custom events from other components that want to open Hoku
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.actionContext) setActionContext(e.detail.actionContext);
      if (e.detail?.selectedProperty) {
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

  // Listen for property detail open requests from Hoku search results
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { property, address } = e.detail || {};
      if (property && property.address?.oneLine) {
        // Property already has full data from the search results
        setModalProperty(property);
      } else if (address) {
        // Need to fetch full property data by address
        setModalLoading(true);
        fetch(`/api/integrations/attom/property?endpoint=expanded&address1=${encodeURIComponent(address)}&pagesize=1`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.property?.[0]) {
              setModalProperty(data.property[0]);
            } else {
              // Fallback: use the raw property data from search results
              setModalProperty(property || { address: { oneLine: address } });
            }
          })
          .catch(() => {
            setModalProperty(property || { address: { oneLine: address } });
          })
          .finally(() => setModalLoading(false));
      }
    };
    window.addEventListener("open-property-detail" as any, handler);
    return () => window.removeEventListener("open-property-detail" as any, handler);
  }, []);

  // Listen for seller map navigation requests from Hoku
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { zip, tmk } = e.detail || {};
      if (zip) {
        router.push(`/app/seller-map?zip=${encodeURIComponent(zip)}`);
      } else if (tmk) {
        router.push(`/app/seller-map?tmk=${encodeURIComponent(tmk)}`);
      }
    };
    window.addEventListener("navigate-seller-map" as any, handler);
    return () => window.removeEventListener("navigate-seller-map" as any, handler);
  }, [router]);

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
      {!isOpen && !modalProperty && (
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

      {/* Property Detail Modal — opened from Hoku search results */}
      {modalLoading && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10000,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.4)",
        }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, fontSize: 14 }}>
            Loading property details...
          </div>
        </div>
      )}

      {modalProperty && !modalLoading && (
        <PropertyDetailModal
          property={modalProperty}
          onClose={() => setModalProperty(null)}
        />
      )}
    </>
  );
}
