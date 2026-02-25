"use client";

import { useState } from "react";
import LocalPipelineClient from "./local-pipeline.client";
import PipelineClient from "./pipeline.client";

type Tab = "local" | "ghl";

export default function PipelineTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("local");

  const tabs: { key: Tab; label: string; description: string }[] = [
    {
      key: "local",
      label: "Lead Pipeline",
      description: "Track leads from open house check-ins through close",
    },
    {
      key: "ghl",
      label: "GHL CRM Pipeline",
      description: "View deals synced to GoHighLevel",
    },
  ];

  return (
    <div>
      {/* Tab Buttons */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          borderBottom: "1px solid #e5e7eb",
          paddingBottom: 0,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? "#111827" : "#6b7280",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab.key
                ? "2px solid #6366f1"
                : "2px solid transparent",
              cursor: "pointer",
              transition: "all 0.15s",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "local" ? <LocalPipelineClient /> : <PipelineClient />}
    </div>
  );
}
