"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Flame, Thermometer, Snowflake, Ban } from "lucide-react";
import GenerateProfileModal from "../neighborhood-profiles/generate-modal";

interface Lead {
  id: string;
  event_id: string;
  created_at: string;
  payload: any;
  heat_score: number;
}

interface LeadsListProps {
  leads: Lead[];
  eventMap: Map<string, string>;
}

type Tab = "hot" | "warm" | "cold" | "dnc";

function getHeatLevel(score: number): "hot" | "warm" | "cold" {
  if (score >= 80) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}

function isDNC(lead: Lead): boolean {
  return lead.payload?.representation === "yes";
}

export default function LeadsList({ leads, eventMap }: LeadsListProps) {
  const [activeTab, setActiveTab] = useState<Tab>("hot");
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<{
    address: string;
    city: string;
    neighborhoods: string;
  } | null>(null);

  const handleGenerateProfile = (lead: Lead, address: string) => {
    const p = lead.payload ?? {};
    const addressParts = address.split(",");
    const city = addressParts.length > 1 ? addressParts[1].trim() : "";
    setSelectedLead({ address, city, neighborhoods: p.neighborhoods || "" });
    setGenerateModalOpen(true);
  };

  const handleGenerateSuccess = () => {
    alert("Neighborhood profile generated successfully! You can view it in the Neighborhood Profiles section.");
  };

  if (!leads || leads.length === 0) {
    return (
      <p style={{ opacity: 0.7, marginTop: 16 }}>
        No leads yet. Publish an open house and have an attendee check in via QR.
      </p>
    );
  }

  // Separate DNC leads (already have an agent) from scored leads
  const dncLeads = leads.filter(isDNC);
  const scoredLeads = leads.filter((l) => !isDNC(l));

  const hotLeads = scoredLeads.filter((l) => getHeatLevel(l.heat_score) === "hot");
  const warmLeads = scoredLeads.filter((l) => getHeatLevel(l.heat_score) === "warm");
  const coldLeads = scoredLeads.filter((l) => getHeatLevel(l.heat_score) === "cold");

  const tabs: { key: Tab; label: string; count: number; color: string; icon: React.ReactNode }[] = [
    { key: "hot", label: "Hot", count: hotLeads.length, color: "#ef4444", icon: <Flame className="w-4 h-4" /> },
    { key: "warm", label: "Warm", count: warmLeads.length, color: "#f59e0b", icon: <Thermometer className="w-4 h-4" /> },
    { key: "cold", label: "Cold", count: coldLeads.length, color: "#3b82f6", icon: <Snowflake className="w-4 h-4" /> },
    { key: "dnc", label: "Do Not Contact", count: dncLeads.length, color: "#6b7280", icon: <Ban className="w-4 h-4" /> },
  ];

  const currentLeads =
    activeTab === "hot" ? hotLeads :
    activeTab === "warm" ? warmLeads :
    activeTab === "cold" ? coldLeads :
    dncLeads;

  return (
    <>
      {/* Scoring Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: 16,
              background: activeTab === tab.key ? tab.color : "#fff",
              color: activeTab === tab.key ? "#fff" : tab.color,
              border: `2px solid ${tab.color}`,
              borderRadius: 12,
              cursor: "pointer",
              transition: "all 0.15s",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginBottom: 4 }}>
              {tab.icon}
              <span style={{ fontWeight: 700, fontSize: 14 }}>{tab.label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{tab.count}</div>
          </button>
        ))}
      </div>

      {/* Lead Table */}
      <div style={{ marginTop: 20 }}>
        {currentLeads.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", background: "#f9fafb", borderRadius: 12 }}>
            No {tabs.find((t) => t.key === activeTab)?.label.toLowerCase()} leads.
          </div>
        ) : (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            {/* Table Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: activeTab === "dnc" ? "2fr 1.5fr 2fr 1fr 1.5fr" : "2fr 1.5fr 2fr 1fr 1fr 1.5fr",
              padding: "10px 16px",
              background: "#f9fafb",
              fontWeight: 700,
              fontSize: 12,
              color: "#6b7280",
              borderBottom: "1px solid #e5e7eb",
            }}>
              <span>Name</span>
              <span>Contact</span>
              <span>Property</span>
              {activeTab === "dnc" ? (
                <span>Agent of Record</span>
              ) : (
                <>
                  <span>Score</span>
                  <span>Timeline</span>
                </>
              )}
              <span>Date</span>
            </div>

            {/* Table Rows */}
            {currentLeads.map((l) => {
              const p: any = l.payload ?? {};
              const address = eventMap.get(l.event_id) || l.event_id;
              const heatColor =
                activeTab === "dnc" ? "#6b7280" :
                getHeatLevel(l.heat_score) === "hot" ? "#ef4444" :
                getHeatLevel(l.heat_score) === "warm" ? "#f59e0b" : "#3b82f6";

              return (
                <div
                  key={l.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: activeTab === "dnc" ? "2fr 1.5fr 2fr 1fr 1.5fr" : "2fr 1.5fr 2fr 1fr 1fr 1.5fr",
                    padding: "12px 16px",
                    borderBottom: "1px solid #f3f4f6",
                    fontSize: 13,
                    alignItems: "center",
                    background: "#fff",
                    transition: "background 0.1s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                  onClick={() => handleGenerateProfile(l, address)}
                >
                  {/* Name */}
                  <div>
                    <div style={{ fontWeight: 600, color: "#111827" }}>{p.name || "Unknown"}</div>
                    {p.financing && (
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                        {p.financing}
                      </div>
                    )}
                  </div>

                  {/* Contact */}
                  <div style={{ color: "#6b7280" }}>
                    {p.email && <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.email}</div>}
                    {p.phone_e164 && <div style={{ fontSize: 12 }}>{p.phone_e164}</div>}
                  </div>

                  {/* Property */}
                  <div>
                    <Link
                      href={`/app/open-houses/${l.event_id}`}
                      style={{ color: "#3b82f6", fontSize: 12, textDecoration: "none" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {address}
                    </Link>
                  </div>

                  {activeTab === "dnc" ? (
                    /* Agent of Record */
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      {p.agent_name || p.representation_agent || "Has agent"}
                    </div>
                  ) : (
                    <>
                      {/* Score */}
                      <div>
                        <span style={{
                          display: "inline-block",
                          padding: "2px 10px",
                          borderRadius: 10,
                          fontSize: 12,
                          fontWeight: 700,
                          background: heatColor + "18",
                          color: heatColor,
                        }}>
                          {l.heat_score}
                        </span>
                      </div>

                      {/* Timeline */}
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {p.timeline || "—"}
                      </div>
                    </>
                  )}

                  {/* Date */}
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {new Date(l.created_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
