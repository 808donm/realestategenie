"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import PropertySearch from "./property-search.client";

const Prospecting = dynamic(() => import("./prospecting.client"), {
  loading: () => (
    <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
      Loading prospecting tools...
    </div>
  ),
});

const tabs = [
  { id: "search", label: "Property Search" },
  { id: "prospecting", label: "Prospecting" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function PropertyDataTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("search");

  return (
    <div>
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

      {activeTab === "search" && <PropertySearch />}
      {activeTab === "prospecting" && <Prospecting />}
    </div>
  );
}
