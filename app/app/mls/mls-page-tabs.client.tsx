"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import MLSClient from "./mls.client";

const MLSFeaturesClient = dynamic(() => import("./mls-features.client"), {
  loading: () => (
    <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
      Loading MLS tools...
    </div>
  ),
});

const tabs = [
  { id: "search", label: "Search & Listings" },
  { id: "cma", label: "CMA" },
  { id: "matches", label: "Lead Matches" },
  { id: "sync", label: "OH Sync" },
  { id: "investment", label: "Investment" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function MLSPageTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("search");

  return (
    <div>
      {/* Tab Bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid #e5e7eb",
          marginBottom: 24,
          overflowX: "auto",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              color: activeTab === tab.id ? "#3b82f6" : "#6b7280",
              background: "transparent",
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid #3b82f6"
                  : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "search" && <MLSClient />}
      {activeTab !== "search" && (
        <MLSFeaturesClient initialTab={activeTab} />
      )}
    </div>
  );
}
