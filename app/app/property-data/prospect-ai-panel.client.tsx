"use client";

import { useState, useImperativeHandle, forwardRef } from "react";
import jsPDF from "jspdf";

// ── Types matching the API ────────────────────────────────────────────────────

interface ScoredProspect {
  address: string;
  ownerName?: string;
  score: number;
  tier: "hot" | "warm" | "long-term";
  reasoning: string;
  suggestedApproach: string;
  keyFactors: string[];
}

interface ProspectAnalysis {
  prospects: ScoredProspect[];
  marketSummary: string;
  topInsight: string;
  recommendedActions: string[];
}

interface OutreachDraft {
  address: string;
  ownerName?: string;
  letterBody: string;
  subject: string;
  smsMessage: string;
  talkingPoints: string[];
}

interface BatchOutreach {
  drafts: OutreachDraft[];
  campaignTheme: string;
  bestTimeToSend: string;
}

interface ProspectProperty {
  address: string;
  ownerName?: string;
  mailingAddress?: string;
  isAbsentee?: boolean;
  isCorporate?: boolean;
  avmValue?: number;
  assessedValue?: number;
  mortgageAmount?: number;
  ltvPct?: number;
  equityAmount?: number;
  equityPct?: number;
  saleAmount?: number;
  saleDate?: string;
  yearsOwned?: number;
  yearBuilt?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: string;
  taxAmount?: number;
  rentalValue?: number;
  isDistressed?: boolean;
  isUnderwater?: boolean;
  highLtv?: boolean;
  assessmentDrop?: boolean;
  negativeAppreciation?: boolean;
  propertyCount?: number;
  totalPortfolioValue?: number;
  totalEquity?: number;
  totalTaxBurden?: number;
}

interface MarketContext {
  zipCode: string;
  medianPrice?: number;
  avgDaysOnMarket?: number;
  priceChangeYoY?: number;
  salesCount?: number;
}

type ProspectMode = "absentee" | "equity" | "foreclosure" | "radius" | "investor";

interface ProspectAIPanelProps {
  mode: ProspectMode;
  properties: ProspectProperty[];
  market: MarketContext;
  isVisible: boolean;
}

export interface ProspectAIPanelHandle {
  triggerAnalyze: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ProspectAIPanel = forwardRef<ProspectAIPanelHandle, ProspectAIPanelProps>(function ProspectAIPanel({ mode, properties, market, isVisible }, ref) {
  const [analysis, setAnalysis] = useState<ProspectAnalysis | null>(null);
  const [outreach, setOutreach] = useState<BatchOutreach | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"analysis" | "outreach">("analysis");
  const [expandedProspect, setExpandedProspect] = useState<number | null>(null);
  const [expandedOutreach, setExpandedOutreach] = useState<number | null>(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError("");
    setAnalysis(null);
    try {
      const res = await fetch("/api/prospecting-ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, properties: properties.slice(0, 25), market }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setAnalysis(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Allow parent to trigger analysis via ref
  useImperativeHandle(ref, () => ({
    triggerAnalyze: () => {
      if (!isAnalyzing && properties.length > 0) handleAnalyze();
    },
  }));

  if (!isVisible || properties.length === 0) return null;

  const handleGenerateOutreach = async () => {
    setIsGeneratingOutreach(true);
    setError("");
    setOutreach(null);
    const topProps = analysis
      ? properties.filter((p) => analysis.prospects.some((sp) => sp.address === p.address && sp.tier !== "long-term")).slice(0, 10)
      : properties.slice(0, 10);
    try {
      const res = await fetch("/api/prospecting-ai/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          properties: topProps,
          market,
          agentName: "Agent", // Will be replaced by user profile
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Outreach generation failed");
      setOutreach(data);
      setActiveTab("outreach");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Outreach generation failed");
    } finally {
      setIsGeneratingOutreach(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const exportData = analysis
        ? analysis.prospects.map((sp) => {
            const prop = properties.find((p) => p.address === sp.address);
            return { ...sp, avmValue: prop?.avmValue, equityAmount: prop?.equityAmount, mortgageAmount: prop?.mortgageAmount, yearsOwned: prop?.yearsOwned, mailingAddress: prop?.mailingAddress };
          })
        : properties.map((p, i) => ({
            address: p.address, ownerName: p.ownerName, score: null, tier: null,
            reasoning: null, suggestedApproach: null, avmValue: p.avmValue,
            equityAmount: p.equityAmount, mortgageAmount: p.mortgageAmount,
            yearsOwned: p.yearsOwned, mailingAddress: p.mailingAddress,
          }));

      const res = await fetch("/api/prospecting-ai/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospects: exportData, mode, zipCode: market.zipCode }),
      });

      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `REG_Prospects_${mode}_${market.zipCode}_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    if (!analysis) return;
    const doc = new jsPDF();
    const modeLabels: Record<ProspectMode, string> = {
      absentee: "Absentee Owners",
      equity: "High Equity / Likely Sellers",
      foreclosure: "Distressed / Pre-Foreclosure",
      radius: "Just Sold Farming",
      investor: "Investor Portfolios",
    };

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Real Estate Genie", 20, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("AI Prospect Analysis Report", 20, 28);
    doc.setFontSize(10);
    doc.text(`${modeLabels[mode]} | ZIP: ${market.zipCode} | ${new Date().toLocaleDateString()}`, 20, 35);

    // Market Summary
    doc.setDrawColor(200);
    doc.line(20, 40, 190, 40);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Market Summary", 20, 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const marketLines = doc.splitTextToSize(analysis.marketSummary, 170);
    doc.text(marketLines, 20, 55);

    // Top Insight
    let y = 55 + marketLines.length * 5 + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Key Insight", 20, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const insightLines = doc.splitTextToSize(analysis.topInsight, 170);
    y += 7;
    doc.text(insightLines, 20, y);
    y += insightLines.length * 5 + 5;

    // Recommended Actions
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Recommended Actions", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    analysis.recommendedActions.forEach((action, i) => {
      const actionLines = doc.splitTextToSize(`${i + 1}. ${action}`, 170);
      doc.text(actionLines, 20, y);
      y += actionLines.length * 5 + 2;
    });
    y += 3;

    // Prospects
    doc.line(20, y, 190, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Ranked Prospects", 20, y);
    y += 8;

    analysis.prospects.forEach((p, i) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      const tierColor = p.tier === "hot" ? "#dc2626" : p.tier === "warm" ? "#f59e0b" : "#6b7280";
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`#${i + 1} ${p.address}`, 20, y);
      doc.setFontSize(8);
      doc.setTextColor(tierColor);
      doc.text(`Score: ${p.score} | ${p.tier.toUpperCase()}`, 160, y);
      doc.setTextColor("#000000");
      y += 5;
      if (p.ownerName) {
        doc.setFont("helvetica", "normal");
        doc.text(`Owner: ${p.ownerName}`, 24, y);
        y += 4;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const reasonLines = doc.splitTextToSize(p.reasoning, 165);
      doc.text(reasonLines, 24, y);
      y += reasonLines.length * 4 + 2;
      const approachLines = doc.splitTextToSize(`Approach: ${p.suggestedApproach}`, 165);
      doc.setFont("helvetica", "italic");
      doc.text(approachLines, 24, y);
      y += approachLines.length * 4 + 6;
    });

    doc.save(`REG_AI_Prospects_${mode}_${market.zipCode}.pdf`);
  };

  const tierColor = (tier: string) => {
    switch (tier) {
      case "hot": return { bg: "#fef2f2", border: "#fecaca", text: "#dc2626" };
      case "warm": return { bg: "#fffbeb", border: "#fde68a", text: "#d97706" };
      default: return { bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280" };
    }
  };

  const tierLabel = (tier: string) => {
    switch (tier) {
      case "hot": return "HOT";
      case "warm": return "WARM";
      default: return "LONG-TERM";
    }
  };

  return (
    <div style={{
      marginTop: 16,
      border: "2px solid #6366f1",
      borderRadius: 12,
      background: "linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px",
        background: "linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{"\u2728"}</span>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>AI Prospecting Copilot</span>
          <span style={{ color: "#c7d2fe", fontSize: 12 }}>powered by Claude Opus</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {!analysis && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              style={{
                padding: "6px 14px", borderRadius: 6, border: "none",
                background: "#fff", color: "#6366f1", fontWeight: 600,
                fontSize: 13, cursor: isAnalyzing ? "wait" : "pointer",
                opacity: isAnalyzing ? 0.7 : 1,
              }}
            >
              {isAnalyzing ? "Analyzing..." : `Analyze ${properties.length} Prospects`}
            </button>
          )}
          {analysis && (
            <>
              <button
                onClick={handleGenerateOutreach}
                disabled={isGeneratingOutreach}
                style={{
                  padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600,
                  fontSize: 13, cursor: isGeneratingOutreach ? "wait" : "pointer",
                  opacity: isGeneratingOutreach ? 0.7 : 1,
                }}
              >
                {isGeneratingOutreach ? "Generating..." : "Draft Outreach"}
              </button>
              <button
                onClick={handleExportPDF}
                style={{
                  padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600,
                  fontSize: 13, cursor: "pointer",
                }}
              >
                Export PDF
              </button>
              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                style={{
                  padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 600,
                  fontSize: 13, cursor: isExporting ? "wait" : "pointer",
                  opacity: isExporting ? 0.7 : 1,
                }}
              >
                {isExporting ? "..." : "Export CSV"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "10px 16px", background: "#fef2f2", color: "#dc2626", fontSize: 13, borderBottom: "1px solid #fecaca" }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {isAnalyzing && (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{"\uD83E\uDDE0"}</div>
          <div style={{ fontWeight: 600, color: "#6366f1", marginBottom: 4 }}>Claude is analyzing your prospects...</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Scoring {properties.length} properties across {market.zipCode} — this takes 10-20 seconds</div>
        </div>
      )}

      {/* Tabs */}
      {analysis && !isAnalyzing && (
        <div style={{ borderBottom: "1px solid #e5e7eb", display: "flex", padding: "0 16px" }}>
          <button
            onClick={() => setActiveTab("analysis")}
            style={{
              padding: "10px 16px", border: "none", background: "transparent",
              fontWeight: activeTab === "analysis" ? 700 : 400,
              color: activeTab === "analysis" ? "#6366f1" : "#6b7280",
              borderBottom: activeTab === "analysis" ? "2px solid #6366f1" : "2px solid transparent",
              cursor: "pointer", fontSize: 13,
            }}
          >
            AI Analysis
          </button>
          <button
            onClick={() => setActiveTab("outreach")}
            style={{
              padding: "10px 16px", border: "none", background: "transparent",
              fontWeight: activeTab === "outreach" ? 700 : 400,
              color: activeTab === "outreach" ? "#6366f1" : "#6b7280",
              borderBottom: activeTab === "outreach" ? "2px solid #6366f1" : "2px solid transparent",
              cursor: "pointer", fontSize: 13,
            }}
          >
            Outreach Drafts {outreach ? `(${outreach.drafts.length})` : ""}
          </button>
        </div>
      )}

      {/* Analysis Tab */}
      {analysis && !isAnalyzing && activeTab === "analysis" && (
        <div style={{ padding: 16 }}>
          {/* Market Summary & Top Insight */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 12, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#6366f1", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Market Context</div>
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{analysis.marketSummary}</div>
            </div>
            <div style={{ padding: 12, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: "#059669", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Top Insight</div>
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{analysis.topInsight}</div>
            </div>
          </div>

          {/* Recommended Actions */}
          <div style={{ padding: 12, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#b45309", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Recommended Actions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {analysis.recommendedActions.map((action, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "#374151" }}>
                  <span style={{ fontWeight: 700, color: "#b45309", minWidth: 20 }}>{i + 1}.</span>
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tier Summary */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {(["hot", "warm", "long-term"] as const).map((tier) => {
              const count = analysis.prospects.filter((p) => p.tier === tier).length;
              const tc = tierColor(tier);
              return (
                <div key={tier} style={{
                  flex: 1, padding: "10px 12px", borderRadius: 8,
                  background: tc.bg, border: `1px solid ${tc.border}`,
                  textAlign: "center",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 20, color: tc.text }}>{count}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: tc.text, textTransform: "uppercase" }}>{tierLabel(tier)}</div>
                </div>
              );
            })}
          </div>

          {/* Prospect Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {analysis.prospects.map((prospect, idx) => {
              const tc = tierColor(prospect.tier);
              const isExpanded = expandedProspect === idx;
              return (
                <div
                  key={idx}
                  style={{
                    background: "#fff",
                    border: `1px solid ${tc.border}`,
                    borderLeft: `4px solid ${tc.text}`,
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    onClick={() => setExpandedProspect(isExpanded ? null : idx)}
                    style={{
                      padding: "10px 14px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>#{idx + 1} {prospect.address}</span>
                        <span style={{
                          padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                          background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`,
                        }}>
                          {tierLabel(prospect.tier)}
                        </span>
                      </div>
                      {prospect.ownerName && (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>Owner: {prospect.ownerName}</div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: tc.text }}>{prospect.score}</div>
                        <div style={{ fontSize: 10, color: "#9ca3af" }}>AI Score</div>
                      </div>
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>{isExpanded ? "\u25B2" : "\u25BC"}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: "0 14px 14px", borderTop: "1px solid #f3f4f6" }}>
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "#6366f1", marginBottom: 4 }}>Why This Prospect</div>
                        <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{prospect.reasoning}</div>
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "#059669", marginBottom: 4 }}>Suggested Approach</div>
                        <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{prospect.suggestedApproach}</div>
                      </div>
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "#b45309", marginBottom: 4 }}>Key Factors</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {prospect.keyFactors.map((f, fi) => (
                            <span key={fi} style={{
                              padding: "2px 8px", borderRadius: 10, fontSize: 11,
                              background: "#f3f4f6", color: "#374151",
                            }}>
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outreach Tab */}
      {activeTab === "outreach" && !isGeneratingOutreach && (
        <div style={{ padding: 16 }}>
          {!outreach && (
            <div style={{ textAlign: "center", padding: 30, color: "#6b7280" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{"\u2709\uFE0F"}</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No outreach drafts yet</div>
              <div style={{ fontSize: 13, marginBottom: 12 }}>Click "Draft Outreach" to generate personalized letters, SMS messages, and talking points for your top prospects.</div>
              <button
                onClick={handleGenerateOutreach}
                style={{
                  padding: "8px 20px", borderRadius: 6, border: "none",
                  background: "#6366f1", color: "#fff", fontWeight: 600,
                  fontSize: 13, cursor: "pointer",
                }}
              >
                Generate Outreach
              </button>
            </div>
          )}

          {outreach && (
            <>
              {/* Campaign Theme */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ padding: 12, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#6366f1", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Campaign Theme</div>
                  <div style={{ fontSize: 13, color: "#374151" }}>{outreach.campaignTheme}</div>
                </div>
                <div style={{ padding: 12, background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: "#059669", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Best Time to Send</div>
                  <div style={{ fontSize: 13, color: "#374151" }}>{outreach.bestTimeToSend}</div>
                </div>
              </div>

              {/* Outreach Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {outreach.drafts.map((draft, idx) => {
                  const isExpanded = expandedOutreach === idx;
                  return (
                    <div key={idx} style={{
                      background: "#fff", border: "1px solid #e5e7eb",
                      borderLeft: "4px solid #6366f1", borderRadius: 8, overflow: "hidden",
                    }}>
                      <div
                        onClick={() => setExpandedOutreach(isExpanded ? null : idx)}
                        style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{draft.address}</div>
                          {draft.ownerName && <div style={{ fontSize: 12, color: "#6b7280" }}>To: {draft.ownerName}</div>}
                        </div>
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>{isExpanded ? "\u25B2" : "\u25BC"}</span>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: "0 14px 14px", borderTop: "1px solid #f3f4f6" }}>
                          {/* Subject */}
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontWeight: 600, fontSize: 12, color: "#6366f1", marginBottom: 4 }}>Subject Line</div>
                            <div style={{ fontSize: 13, color: "#374151", fontStyle: "italic" }}>{draft.subject}</div>
                          </div>
                          {/* Letter */}
                          <div style={{ marginTop: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: 12, color: "#059669" }}>Letter / Email</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(draft.letterBody); }}
                                style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #d1d5db", background: "#f9fafb", fontSize: 11, cursor: "pointer", color: "#6b7280" }}
                              >
                                Copy
                              </button>
                            </div>
                            <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap", background: "#f9fafb", padding: 10, borderRadius: 6 }}>
                              {draft.letterBody}
                            </div>
                          </div>
                          {/* SMS */}
                          <div style={{ marginTop: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: 12, color: "#b45309" }}>SMS Message</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(draft.smsMessage); }}
                                style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid #d1d5db", background: "#f9fafb", fontSize: 11, cursor: "pointer", color: "#6b7280" }}
                              >
                                Copy
                              </button>
                            </div>
                            <div style={{ fontSize: 13, color: "#374151", background: "#fffbeb", padding: 8, borderRadius: 6, border: "1px solid #fde68a" }}>
                              {draft.smsMessage}
                            </div>
                          </div>
                          {/* Talking Points */}
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontWeight: 600, fontSize: 12, color: "#dc2626", marginBottom: 4 }}>Phone Talking Points</div>
                            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                              {draft.talkingPoints.map((tp, tpi) => (
                                <li key={tpi}>{tp}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {isGeneratingOutreach && (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{"\u270D\uFE0F"}</div>
          <div style={{ fontWeight: 600, color: "#6366f1", marginBottom: 4 }}>Drafting personalized outreach...</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Claude is writing letters, SMS messages, and talking points — about 15 seconds</div>
        </div>
      )}
    </div>
  );
});

export default ProspectAIPanel;
