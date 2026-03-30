"use client";

import { useState, useCallback, useEffect } from "react";
import type { ScoredProperty, SellerFactor } from "@/lib/scoring/seller-motivation-score";
import { getSellerColor, getSellerLabel } from "@/lib/scoring/seller-motivation-score";
import { fmtPrice } from "@/lib/utils";

interface OutreachDraft {
  address: string;
  ownerName: string | null;
  letterBody: string;
  subject: string;
  smsMessage: string;
  talkingPoints: string[];
}

type Props = {
  property: ScoredProperty;
  compact?: boolean;
  onAddToCRM?: (property: ScoredProperty) => void;
  onGenerateReport?: (property: ScoredProperty) => void;
  onDraftOutreach?: (property: ScoredProperty) => void;
  agentName?: string;
  agentPhone?: string;
};

export function PropertyCard({ property, compact, onAddToCRM, onGenerateReport, onDraftOutreach, agentName, agentPhone }: Props) {
  const p = property;
  // Fetch agent info for outreach generation
  const [resolvedAgentName, setResolvedAgentName] = useState(agentName || "");
  const [resolvedAgentPhone, setResolvedAgentPhone] = useState(agentPhone || "");
  useEffect(() => {
    if (agentName) return;
    fetch("/api/profile").then(r => r.json()).then(data => {
      if (data.display_name) setResolvedAgentName(data.display_name);
      if (data.phone) setResolvedAgentPhone(data.phone);
    }).catch(() => {});
  }, [agentName]);

  const [outreach, setOutreach] = useState<OutreachDraft | null>(null);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [outreachError, setOutreachError] = useState("");
  const [outreachTab, setOutreachTab] = useState<"letter" | "sms" | "talking">("letter");
  const [copied, setCopied] = useState(false);

  const handleGenerateOutreach = useCallback(async () => {
    setOutreachLoading(true);
    setOutreachError("");
    setOutreach(null);
    try {
      // Determine prospect mode from top scoring factors
      const topFactor = p.factors.sort((a, b) => b.points - a.points)[0]?.name?.toLowerCase() || "";
      let mode = "equity";
      if (topFactor.includes("absentee")) mode = "absentee";
      else if (topFactor.includes("distress")) mode = "foreclosure";
      else if (topFactor.includes("portfolio") || topFactor.includes("multi")) mode = "investor";

      const res = await fetch("/api/prospecting-ai/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          properties: [{
            address: p.address,
            ownerName: p.owner || null,
            isAbsentee: p.absentee,
            isCorporate: false,
            avmValue: p.estimatedValue,
            mortgageAmount: p.estimatedValue && p.ltv ? Math.round(p.estimatedValue * (p.ltv / 100)) : null,
            equityAmount: p.equity,
            lastSalePrice: p.lastSalePrice,
            lastSaleDate: p.lastSaleDate,
            ownershipYears: p.ownershipYears,
            beds: p.beds,
            baths: p.baths,
            sqft: p.sqft,
            yearBuilt: p.yearBuilt,
            propertyType: p.propertyType,
          }],
          market: { zipCode: p.zip || "unknown" },
          agentName: resolvedAgentName || "Agent",
          agentPhone: resolvedAgentPhone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate outreach");
      if (data.drafts?.length > 0) {
        setOutreach(data.drafts[0]);
      } else {
        setOutreachError("No outreach generated");
      }
    } catch (err: any) {
      setOutreachError(err.message || "Outreach generation failed");
    } finally {
      setOutreachLoading(false);
    }
  }, [p]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className={compact ? "min-w-[280px]" : "bg-white rounded-lg border p-4"}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h4 className="font-semibold text-sm truncate">{p.address}</h4>
          {p.city && (
            <p className="text-xs text-gray-500">
              {p.city}, {p.state} {p.zip}
            </p>
          )}
        </div>
        <ScoreBadge score={p.score} level={p.level} />
      </div>

      {/* Key Facts */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 mb-3">
        {p.estimatedValue && (
          <div>
            <span className="text-gray-400">Value:</span>{" "}
            <span className="font-medium">{fmtPrice(p.estimatedValue)}</span>
          </div>
        )}
        {p.equity != null && (
          <div>
            <span className="text-gray-400">Equity:</span> <span className="font-medium">{fmtPrice(p.equity)}</span>
          </div>
        )}
        {p.ltv != null && (
          <div>
            <span className="text-gray-400">LTV:</span> <span className="font-medium">{p.ltv}%</span>
          </div>
        )}
        {p.ownershipYears != null && (
          <div>
            <span className="text-gray-400">Owned:</span> <span className="font-medium">{p.ownershipYears}yr</span>
          </div>
        )}
        {p.lastSaleDate && (
          <div>
            <span className="text-gray-400">Last Sale:</span>{" "}
            <span className="font-medium">{new Date(p.lastSaleDate).toLocaleDateString()}</span>
          </div>
        )}
        {!p.lastSaleDate && !p.ownershipYears && (
          <div className="col-span-2">
            <span className="text-orange-500 text-xs font-medium">No sale date available (non-disclosure)</span>
          </div>
        )}
        {p.ownerParcelCount != null && p.ownerParcelCount > 1 && (
          <div>
            <span className="text-gray-400">Properties:</span> <span className="font-medium">{p.ownerParcelCount}</span>
          </div>
        )}
        {p.owner && (
          <div className="col-span-2">
            <span className="text-gray-400">Owner:</span> <span className="font-medium truncate">{p.owner}</span>
          </div>
        )}
        {p.absentee && (
          <div className="col-span-2">
            <span className="inline-block bg-amber-100 text-amber-700 text-[10px] font-medium px-1.5 py-0.5 rounded">
              Absentee Owner
            </span>
          </div>
        )}
        {p.ownerParcelCount != null && p.ownerParcelCount > 2 && (
          <div className="col-span-2">
            <span className="inline-block bg-purple-100 text-purple-700 text-[10px] font-medium px-1.5 py-0.5 rounded">
              Investor ({p.ownerParcelCount} properties)
            </span>
          </div>
        )}
      </div>

      {/* Property Details */}
      {(p.beds || p.baths || p.sqft) && (
        <div className="flex gap-3 text-xs text-gray-500 mb-3">
          {p.beds && <span>{p.beds} bd</span>}
          {p.baths && <span>{p.baths} ba</span>}
          {p.sqft && <span>{p.sqft.toLocaleString()} sqft</span>}
          {p.yearBuilt && <span>Built {p.yearBuilt}</span>}
        </div>
      )}

      {/* AI Insight — why this property is a prime opportunity */}
      {!compact && <OpportunityInsight property={p} />}

      {/* Score Factor Breakdown */}
      {!compact && (
        <div className="mb-3">
          <h5 className="text-xs font-medium text-gray-700 mb-1.5">Score Breakdown</h5>
          <div className="space-y-1">
            {p.factors
              .filter((f) => f.points > 0)
              .sort((a, b) => b.points - a.points)
              .map((f) => (
                <FactorBar key={f.name} factor={f} />
              ))}
          </div>
        </div>
      )}

      {/* Compact factor summary */}
      {compact && p.factors.filter((f) => f.points > 0).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {p.factors
            .filter((f) => f.points > 0)
            .sort((a, b) => b.points - a.points)
            .slice(0, 3)
            .map((f) => (
              <span
                key={f.name}
                className="inline-block bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded"
                title={f.description}
              >
                {f.name} +{f.points}
              </span>
            ))}
        </div>
      )}

      {/* Action Buttons */}
      {!compact && (
        <div className="flex gap-2 mt-3 pt-3 border-t">
          {onAddToCRM && (
            <button
              onClick={() => onAddToCRM(p)}
              className="flex-1 text-xs bg-blue-600 text-white py-1.5 px-3 rounded hover:bg-blue-700 transition-colors"
            >
              Add to CRM
            </button>
          )}
          {onGenerateReport && (
            <button
              onClick={() => onGenerateReport(p)}
              className="flex-1 text-xs border border-gray-300 py-1.5 px-3 rounded hover:bg-gray-50 transition-colors"
            >
              Property Report
            </button>
          )}
          <button
            onClick={handleGenerateOutreach}
            disabled={outreachLoading}
            className="flex-1 text-xs border border-indigo-300 text-indigo-600 py-1.5 px-3 rounded hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            {outreachLoading ? "Generating..." : outreach ? "Regenerate" : "Draft Outreach"}
          </button>
          <a
            href={`/app/property-data?address=${encodeURIComponent(p.address)}`}
            className="flex-1 text-xs text-center border border-gray-300 py-1.5 px-3 rounded hover:bg-gray-50 transition-colors"
          >
            Full Details
          </a>
        </div>
      )}

      {/* Outreach Error */}
      {outreachError && !compact && (
        <div className="text-xs text-red-600 mt-2 px-1">{outreachError}</div>
      )}

      {/* Generated Outreach */}
      {outreach && !compact && (
        <div className="mt-3 border border-indigo-200 rounded-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-indigo-200 bg-indigo-50">
            {(["letter", "sms", "talking"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setOutreachTab(tab)}
                className="flex-1 text-[11px] font-semibold py-2 transition-colors"
                style={{
                  color: outreachTab === tab ? "#4338ca" : "#6b7280",
                  borderBottom: outreachTab === tab ? "2px solid #4338ca" : "2px solid transparent",
                  background: outreachTab === tab ? "#fff" : "transparent",
                }}
              >
                {tab === "letter" ? "Email / Letter" : tab === "sms" ? "SMS" : "Talking Points"}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-3 bg-white">
            {outreachTab === "letter" && (
              <div>
                <div className="text-[10px] font-semibold text-gray-400 mb-1">SUBJECT</div>
                <div className="text-xs font-medium text-gray-800 mb-3 pb-2 border-b border-gray-100">
                  {outreach.subject}
                </div>
                <div className="text-[10px] font-semibold text-gray-400 mb-1">BODY</div>
                <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                  {outreach.letterBody}
                </div>
              </div>
            )}
            {outreachTab === "sms" && (
              <div>
                <div className="text-[10px] font-semibold text-gray-400 mb-1">SMS MESSAGE</div>
                <div className="text-xs text-gray-700 leading-relaxed p-2 bg-green-50 rounded border border-green-200">
                  {outreach.smsMessage}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">{outreach.smsMessage.length}/160 chars</div>
              </div>
            )}
            {outreachTab === "talking" && (
              <div>
                <div className="text-[10px] font-semibold text-gray-400 mb-1">PHONE TALKING POINTS</div>
                <ul className="space-y-2">
                  {outreach.talkingPoints.map((point, i) => (
                    <li key={i} className="text-xs text-gray-700 flex gap-2">
                      <span className="text-indigo-500 font-bold shrink-0">{i + 1}.</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Copy button */}
            <button
              onClick={() => {
                const text = outreachTab === "letter"
                  ? `Subject: ${outreach.subject}\n\n${outreach.letterBody}`
                  : outreachTab === "sms"
                    ? outreach.smsMessage
                    : outreach.talkingPoints.map((p, i) => `${i + 1}. ${p}`).join("\n");
                copyToClipboard(text);
              }}
              className="mt-3 w-full text-xs py-1.5 rounded border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors font-medium"
            >
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score, level }: { score: number; level: ScoredProperty["level"] }) {
  return (
    <div className="flex flex-col items-center shrink-0">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
        style={{ backgroundColor: getSellerColor(level) }}
      >
        {score}
      </div>
      <span className="text-[10px] font-medium mt-0.5" style={{ color: getSellerColor(level) }}>
        {getSellerLabel(level)}
      </span>
    </div>
  );
}

function OpportunityInsight({ property: p }: { property: ScoredProperty }) {
  const topFactors = p.factors
    .filter((f) => f.points > 0)
    .sort((a, b) => b.points / b.maxPoints - a.points / a.maxPoints);

  if (topFactors.length === 0) return null;

  // Build a natural-language insight from the top scoring factors
  const insights: string[] = [];
  const approaches: string[] = [];

  for (const f of topFactors.slice(0, 3)) {
    const ratio = f.points / f.maxPoints;
    const name = f.name.toLowerCase();

    if (name.includes("absentee") && ratio >= 0.5) {
      insights.push("This is an absentee-owned property, suggesting the owner manages it remotely");
      approaches.push("a personalized letter highlighting local market conditions they may be missing");
    } else if (name.includes("equity") && ratio >= 0.5) {
      insights.push(`the owner has built significant equity${p.equity ? ` (est. ${fmtPrice(p.equity)})` : ""}`);
      approaches.push("an equity unlock strategy showing what their money could do");
    } else if (name.includes("ownership") && ratio >= 0.5) {
      insights.push(`the property has been held for ${p.ownershipYears || "many"} years, signaling possible life transition`);
      approaches.push("a conversation about estate planning or downsizing");
    } else if (name.includes("tax") && name.includes("gap") && ratio >= 0.5) {
      insights.push("the tax assessment is significantly below market value, indicating untapped equity");
    } else if (name.includes("tax") && name.includes("trend") && ratio >= 0.5) {
      insights.push("rapidly rising tax assessments may be creating financial pressure");
      approaches.push("a discussion about whether selling could reduce their tax burden");
    } else if (name.includes("distress") && ratio >= 0.5) {
      insights.push("there are signs of financial distress on this property");
      approaches.push("a sensitive outreach offering options before the situation worsens");
    } else if (name.includes("portfolio") || name.includes("multi-property")) {
      insights.push(`the owner holds ${p.ownerParcelCount || "multiple"} properties, indicating an investor`);
      approaches.push("a portfolio review showing current market valuations");
    } else if (name.includes("owner type") && ratio >= 0.5) {
      insights.push("the property is held in a trust or corporate entity");
    } else if (name.includes("appreciation") && ratio >= 0.5) {
      insights.push("the property has appreciated significantly since purchase");
    } else if (name.includes("market") && ratio >= 0.5) {
      insights.push(f.description.toLowerCase());
    }
  }

  if (insights.length === 0) return null;

  const insightText =
    p.score >= 70
      ? `This is a strong opportunity because ${insights.join(", and ")}.`
      : p.score >= 50
        ? `This property shows potential because ${insights.join(", and ")}.`
        : `Worth monitoring: ${insights.join(", and ")}.`;

  const approachText =
    approaches.length > 0
      ? ` Consider ${approaches[0]}.`
      : "";

  return (
    <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="text-[11px] font-semibold text-blue-700 mb-1">WHY THIS PROPERTY</div>
      <p className="text-[11px] text-blue-900 leading-relaxed">
        {insightText}{approachText}
      </p>
    </div>
  );
}

function FactorBar({ factor }: { factor: SellerFactor }) {
  const pct = (factor.points / factor.maxPoints) * 100;

  return (
    <div className="group relative">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500 w-28 truncate">{factor.name}</span>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] text-gray-400 w-8 text-right">
          {factor.points}/{factor.maxPoints}
        </span>
      </div>
      <div className="hidden group-hover:block absolute z-10 bottom-full left-0 mb-1 bg-gray-800 text-white text-[10px] px-2 py-1 rounded max-w-xs">
        {factor.description}
      </div>
    </div>
  );
}
