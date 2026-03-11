"use client";

import type { ScoredProperty, SellerFactor } from "@/lib/scoring/seller-motivation-score";
import { getSellerColor, getSellerLabel } from "@/lib/scoring/seller-motivation-score";
import { fmtPrice } from "@/lib/utils";

type Props = {
  property: ScoredProperty;
  compact?: boolean;
  onAddToCRM?: (property: ScoredProperty) => void;
  onGenerateReport?: (property: ScoredProperty) => void;
  onDraftOutreach?: (property: ScoredProperty) => void;
};

export function PropertyCard({ property, compact, onAddToCRM, onGenerateReport, onDraftOutreach }: Props) {
  const p = property;

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
            <span className="text-gray-400">Equity:</span>{" "}
            <span className="font-medium">{fmtPrice(p.equity)}</span>
          </div>
        )}
        {p.ltv != null && (
          <div>
            <span className="text-gray-400">LTV:</span>{" "}
            <span className="font-medium">{p.ltv}%</span>
          </div>
        )}
        {p.ownershipYears != null && (
          <div>
            <span className="text-gray-400">Owned:</span>{" "}
            <span className="font-medium">{p.ownershipYears}yr</span>
          </div>
        )}
        {p.owner && (
          <div className="col-span-2">
            <span className="text-gray-400">Owner:</span>{" "}
            <span className="font-medium truncate">{p.owner}</span>
          </div>
        )}
        {p.absentee && (
          <div className="col-span-2">
            <span className="inline-block bg-amber-100 text-amber-700 text-[10px] font-medium px-1.5 py-0.5 rounded">
              Absentee Owner
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
          {onDraftOutreach && (
            <button
              onClick={() => onDraftOutreach(p)}
              className="flex-1 text-xs border border-indigo-300 text-indigo-600 py-1.5 px-3 rounded hover:bg-indigo-50 transition-colors"
            >
              Draft Outreach
            </button>
          )}
          <a
            href={`/app/property-data?address=${encodeURIComponent(p.address)}`}
            className="flex-1 text-xs text-center border border-gray-300 py-1.5 px-3 rounded hover:bg-gray-50 transition-colors"
          >
            Full Details
          </a>
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
      <span
        className="text-[10px] font-medium mt-0.5"
        style={{ color: getSellerColor(level) }}
      >
        {getSellerLabel(level)}
      </span>
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
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
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
