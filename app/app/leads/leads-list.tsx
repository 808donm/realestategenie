"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import GenerateProfileModal from "../neighborhood-profiles/generate-modal";

interface Lead {
  id: string;
  event_id: string;
  created_at: string;
  payload: any;
}

interface LeadsListProps {
  leads: Lead[];
  eventMap: Map<string, string>;
}

export default function LeadsList({ leads, eventMap }: LeadsListProps) {
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<{
    address: string;
    city: string;
    neighborhoods: string;
  } | null>(null);

  const handleGenerateProfile = (lead: Lead, address: string) => {
    const p = lead.payload ?? {};

    // Try to extract city from address (simple heuristic)
    const addressParts = address.split(",");
    const city = addressParts.length > 1 ? addressParts[1].trim() : "";

    setSelectedLead({
      address: address,
      city: city,
      neighborhoods: p.neighborhoods || "",
    });
    setGenerateModalOpen(true);
  };

  const handleGenerateSuccess = (profileId: string) => {
    alert("Neighborhood profile generated successfully! You can view it in the Neighborhood Profiles section.");
  };

  if (!leads || leads.length === 0) {
    return (
      <p style={{ opacity: 0.7 }}>
        No leads yet. Publish an open house and have an attendee check in via QR.
      </p>
    );
  }

  return (
    <>
      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {leads.map((l) => {
          const p: any = l.payload ?? {};
          const address = eventMap.get(l.event_id) || l.event_id;

          return (
            <div key={l.id} style={{ padding: 12, border: "1px solid #e6e6e6", borderRadius: 14, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 900 }}>
                  {p.name || "Lead"}{" "}
                  <span style={{ fontWeight: 600, opacity: 0.7, fontSize: 12 }}>
                    • {new Date(l.created_at).toLocaleString()}
                  </span>
                </div>
                <Link href={`/app/open-houses/${l.event_id}`} style={{ fontSize: 12 }}>
                  {address}
                </Link>
              </div>

              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                {p.email ? <>Email: <code>{p.email}</code></> : null}
                {p.phone_e164 ? <> &nbsp; Phone: <code>{p.phone_e164}</code></> : null}
              </div>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                Rep: <strong>{p.representation ?? "n/a"}</strong> • Timeline: <strong>{p.timeline ?? "n/a"}</strong> • Financing: <strong>{p.financing ?? "n/a"}</strong>
              </div>

              {(p.neighborhoods || p.must_haves) && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                  {p.neighborhoods ? <>Neighborhoods: {p.neighborhoods}</> : null}
                  {p.must_haves ? <> • Must-haves: {p.must_haves}</> : null}
                </div>
              )}

              {/* Generate Neighborhood Profile Button */}
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleGenerateProfile(l, address)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Neighborhood Profile
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Generate Profile Modal */}
      {selectedLead && (
        <GenerateProfileModal
          isOpen={generateModalOpen}
          onClose={() => {
            setGenerateModalOpen(false);
            setSelectedLead(null);
          }}
          onSuccess={handleGenerateSuccess}
          defaultAddress={selectedLead.address}
          defaultCity={selectedLead.city}
          defaultNeighborhood={selectedLead.neighborhoods}
        />
      )}
    </>
  );
}
