"use client";

import { useState, useEffect, useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────

interface Media {
  MediaURL: string;
  MediaType: string;
  Order?: number;
  ShortDescription?: string;
}

interface Property {
  ListingKey: string;
  ListingId: string;
  StandardStatus: string;
  PropertyType: string;
  PropertySubType?: string;
  ListPrice: number;
  StreetNumber?: string;
  StreetName?: string;
  StreetSuffix?: string;
  City: string;
  StateOrProvince: string;
  PostalCode: string;
  BedroomsTotal?: number;
  BathroomsTotalInteger?: number;
  LivingArea?: number;
  LotSizeArea?: number;
  YearBuilt?: number;
  PublicRemarks?: string;
  ListAgentFullName?: string;
  ListOfficeName?: string;
  OnMarketDate?: string;
  ListingURL?: string;
  VirtualTourURLUnbranded?: string;
  TaxAnnualAmount?: number;
  AssociationFee?: number;
}

interface AgentInfo {
  fullName: string;
  phone?: string;
  email?: string;
}

interface MortgageInputs {
  purchasePrice: number;
  downPaymentPercent: number;
  downPaymentAmount: number;
  interestRate: number;
  loanTermYears: number;
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  hoaMonthly: number;
  pmiRate: number;
  includePmi: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtDec = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Inline Mortgage Calculator ───────────────────────────────

function ListingMortgageCalculator({
  property,
  agent,
}: {
  property: Property;
  agent: AgentInfo | null;
}) {
  const [inputs, setInputs] = useState<MortgageInputs>(() => {
    const price = property.ListPrice || 400000;
    const dpPercent = 20;
    return {
      purchasePrice: price,
      downPaymentPercent: dpPercent,
      downPaymentAmount: price * (dpPercent / 100),
      interestRate: 6.5,
      loanTermYears: 30,
      propertyTaxAnnual: property.TaxAnnualAmount || Math.round(price * 0.012),
      insuranceAnnual: Math.round(price * 0.005),
      hoaMonthly: property.AssociationFee || 0,
      pmiRate: 0.5,
      includePmi: false,
    };
  });

  const [usePercentDP, setUsePercentDP] = useState(true);

  const handleChange = (field: keyof MortgageInputs, value: number | boolean) => {
    setInputs((prev) => {
      const n = { ...prev, [field]: value };
      if (field === "purchasePrice") {
        if (usePercentDP) {
          n.downPaymentAmount = (value as number) * (prev.downPaymentPercent / 100);
        } else {
          n.downPaymentPercent = (prev.downPaymentAmount / (value as number)) * 100;
        }
      } else if (field === "downPaymentPercent") {
        n.downPaymentAmount = prev.purchasePrice * ((value as number) / 100);
      } else if (field === "downPaymentAmount") {
        n.downPaymentPercent = ((value as number) / prev.purchasePrice) * 100;
      }
      if (["downPaymentPercent", "downPaymentAmount", "purchasePrice"].includes(field as string)) {
        n.includePmi = n.downPaymentPercent < 20;
      }
      return n;
    });
  };

  const results = useMemo(() => {
    const loan = inputs.purchasePrice - inputs.downPaymentAmount;
    const r = inputs.interestRate / 100 / 12;
    const n = inputs.loanTermYears * 12;

    let pi = 0;
    if (r > 0 && n > 0) {
      pi = (loan * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
    } else if (n > 0) {
      pi = loan / n;
    }

    const tax = inputs.propertyTaxAnnual / 12;
    const ins = inputs.insuranceAnnual / 12;
    const pmi = inputs.includePmi ? (loan * (inputs.pmiRate / 100)) / 12 : 0;
    const total = pi + tax + ins + inputs.hoaMonthly + pmi;

    return { loan, pi, tax, ins, pmi, hoa: inputs.hoaMonthly, total };
  }, [inputs]);

  const breakdown = [
    { label: "Principal & Interest", amount: results.pi, color: "#3b82f6" },
    { label: "Property Tax", amount: results.tax, color: "#10b981" },
    { label: "Insurance", amount: results.ins, color: "#f59e0b" },
    ...(results.hoa > 0 ? [{ label: "HOA", amount: results.hoa, color: "#8b5cf6" }] : []),
    ...(results.pmi > 0 ? [{ label: "PMI", amount: results.pmi, color: "#ef4444" }] : []),
  ];

  const mlsBadges: string[] = [];
  if (property.TaxAnnualAmount) mlsBadges.push("Property tax");
  if (property.AssociationFee) mlsBadges.push("HOA fee");

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af, #3b82f6)",
          padding: "16px 20px",
          color: "white",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 500, opacity: 0.9 }}>
          Estimated Monthly Payment
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, marginTop: 2 }}>
          {fmt(results.total)}
          <span style={{ fontSize: 14, fontWeight: 400, opacity: 0.8 }}>/mo</span>
        </div>
        {mlsBadges.length > 0 && (
          <div style={{ fontSize: 11, marginTop: 6, opacity: 0.8 }}>
            Auto-filled from MLS: {mlsBadges.join(", ")}
          </div>
        )}
      </div>

      {/* PITI Breakdown */}
      <div style={{ padding: "16px 20px" }}>
        {/* Color bar */}
        <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
          {breakdown.map((b) => (
            <div key={b.label} style={{ width: `${(b.amount / results.total) * 100}%`, background: b.color }} />
          ))}
        </div>

        {breakdown.map((b) => (
          <div key={b.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: b.color }} />
              <span style={{ fontSize: 13, color: "#374151" }}>{b.label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtDec(b.amount)}</span>
          </div>
        ))}
      </div>

      {/* Editable Inputs */}
      <div style={{ padding: "0 20px 16px", borderTop: "1px solid #f3f4f6" }}>
        <div
          style={{ fontSize: 13, fontWeight: 600, color: "#374151", padding: "12px 0 8px" }}
        >
          Adjust Your Numbers
        </div>

        {/* Down Payment */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "#6b7280", width: 85, flexShrink: 0 }}>
            Down Payment
          </label>
          <input
            type="number"
            value={usePercentDP ? inputs.downPaymentPercent : inputs.downPaymentAmount}
            onChange={(e) =>
              handleChange(
                usePercentDP ? "downPaymentPercent" : "downPaymentAmount",
                parseFloat(e.target.value) || 0
              )
            }
            style={{
              flex: 1,
              padding: "6px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
          <button
            onClick={() => setUsePercentDP(!usePercentDP)}
            style={{
              padding: "6px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "white",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {usePercentDP ? "%" : "$"}
          </button>
        </div>

        {/* Interest Rate */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "#6b7280", width: 85, flexShrink: 0 }}>
            Rate
          </label>
          <input
            type="number"
            value={inputs.interestRate}
            onChange={(e) => handleChange("interestRate", parseFloat(e.target.value) || 0)}
            step={0.125}
            style={{
              flex: 1,
              padding: "6px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
          <span style={{ fontSize: 12, color: "#6b7280" }}>%</span>
        </div>

        {/* Loan Term */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "#6b7280", width: 85, flexShrink: 0 }}>
            Loan Term
          </label>
          <div style={{ display: "flex", gap: 4, flex: 1 }}>
            {[30, 20, 15].map((yr) => (
              <button
                key={yr}
                onClick={() => handleChange("loanTermYears", yr)}
                style={{
                  flex: 1,
                  padding: "6px",
                  border: inputs.loanTermYears === yr ? "2px solid #3b82f6" : "1px solid #d1d5db",
                  borderRadius: 6,
                  background: inputs.loanTermYears === yr ? "#eff6ff" : "white",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: inputs.loanTermYears === yr ? 600 : 400,
                }}
              >
                {yr}yr
              </button>
            ))}
          </div>
        </div>

        {/* Property Tax */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "#6b7280", width: 85, flexShrink: 0 }}>
            Tax (annual)
          </label>
          <input
            type="number"
            value={inputs.propertyTaxAnnual}
            onChange={(e) => handleChange("propertyTaxAnnual", parseFloat(e.target.value) || 0)}
            step={100}
            style={{
              flex: 1,
              padding: "6px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
        </div>

        {/* Insurance */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "#6b7280", width: 85, flexShrink: 0 }}>
            Insurance (yr)
          </label>
          <input
            type="number"
            value={inputs.insuranceAnnual}
            onChange={(e) => handleChange("insuranceAnnual", parseFloat(e.target.value) || 0)}
            step={100}
            style={{
              flex: 1,
              padding: "6px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
        </div>

        {/* HOA */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "#6b7280", width: 85, flexShrink: 0 }}>
            HOA (mo)
          </label>
          <input
            type="number"
            value={inputs.hoaMonthly}
            onChange={(e) => handleChange("hoaMonthly", parseFloat(e.target.value) || 0)}
            step={25}
            style={{
              flex: 1,
              padding: "6px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
        </div>

        {/* Loan Summary */}
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "#f9fafb",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "#6b7280" }}>Loan Amount</span>
            <span style={{ fontWeight: 600 }}>{fmt(results.loan)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "#6b7280" }}>Down Payment</span>
            <span style={{ fontWeight: 600 }}>
              {fmt(inputs.downPaymentAmount)} ({inputs.downPaymentPercent.toFixed(0)}%)
            </span>
          </div>
          {inputs.includePmi && (
            <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>
              PMI included — will be removed at 20% equity
            </div>
          )}
        </div>
      </div>

      {/* Agent CTA */}
      {agent && (
        <div
          style={{
            padding: "16px 20px",
            background: "#eff6ff",
            borderTop: "1px solid #dbeafe",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
            Ready to make an offer?
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {agent.phone && (
              <a
                href={`tel:${agent.phone}`}
                style={{
                  display: "inline-block",
                  padding: "8px 20px",
                  background: "#3b82f6",
                  color: "white",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Call {agent.fullName}
              </a>
            )}
            {agent.email && (
              <a
                href={`mailto:${agent.email}?subject=Interested in ${fmt(inputs.purchasePrice)} listing`}
                style={{
                  display: "inline-block",
                  padding: "8px 20px",
                  border: "1px solid #3b82f6",
                  color: "#3b82f6",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Email
              </a>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: "8px 20px 12px", fontSize: 10, color: "#9ca3af", textAlign: "center" }}>
        Estimates only. Contact a lender for accurate quotes.
      </div>
    </div>
  );
}

// ─── Main Listing View ────────────────────────────────────────

export default function ListingView({
  listingKey,
  agentId,
}: {
  listingKey: string;
  agentId: string;
}) {
  const [property, setProperty] = useState<Property | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPhoto, setCurrentPhoto] = useState(0);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await fetch(
          `/api/public/listing?key=${encodeURIComponent(listingKey)}&agentId=${encodeURIComponent(agentId)}`
        );
        const data = await res.json();

        if (!res.ok || !data.property) {
          setError("This listing is no longer available.");
          return;
        }

        setProperty(data.property);
        if (data.agent) setAgent(data.agent);
        if (data.media) {
          const photos = data.media
            .filter((m: Media) => m.MediaType === "image" || m.MediaURL?.match(/\.(jpg|jpeg|png|webp)/i))
            .sort((a: Media, b: Media) => (a.Order || 0) - (b.Order || 0));
          setMedia(photos);
        }
      } catch {
        setError("Unable to load listing. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [listingKey, agentId]);

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: "60px auto", padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 18, color: "#6b7280" }}>Loading listing...</div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div style={{ maxWidth: 800, margin: "60px auto", padding: 16, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Listing Not Available</h1>
        <p style={{ marginTop: 12, color: "#6b7280" }}>{error || "This listing could not be found."}</p>
      </div>
    );
  }

  const address = [property.StreetNumber, property.StreetName, property.StreetSuffix]
    .filter(Boolean)
    .join(" ");
  const fullAddress = [address, property.City, property.StateOrProvince, property.PostalCode]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 16px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Two-column layout: Listing on left, Calculator on right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 380px",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* ─── LEFT: Listing Details ────────────────────────────── */}
        <div>
          {/* Photo Gallery */}
          {media.length > 0 && (
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
              <img
                src={media[currentPhoto]?.MediaURL}
                alt={`Property photo ${currentPhoto + 1}`}
                style={{ width: "100%", height: 420, objectFit: "cover", display: "block" }}
              />
              {media.length > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", position: "absolute", top: "50%", left: 0, right: 0, transform: "translateY(-50%)", padding: "0 8px" }}>
                  <button
                    onClick={() => setCurrentPhoto((p) => (p === 0 ? media.length - 1 : p - 1))}
                    style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", fontSize: 20 }}
                  >
                    &lsaquo;
                  </button>
                  <button
                    onClick={() => setCurrentPhoto((p) => (p === media.length - 1 ? 0 : p + 1))}
                    style={{ background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", fontSize: 20 }}
                  >
                    &rsaquo;
                  </button>
                </div>
              )}
              <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 10px", borderRadius: 16, fontSize: 13 }}>
                {currentPhoto + 1} / {media.length}
              </div>
            </div>
          )}

          {/* Price & Status */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#059669" }}>
              ${property.ListPrice?.toLocaleString()}
            </div>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 16,
                fontSize: 13,
                fontWeight: 600,
                background: property.StandardStatus === "Active" ? "#d1fae5" : "#f3f4f6",
                color: property.StandardStatus === "Active" ? "#065f46" : "#374151",
              }}
            >
              {property.StandardStatus}
            </span>
          </div>

          {/* Address */}
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 16px" }}>{fullAddress}</h1>

          {/* Key Details */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24, fontSize: 15, color: "#374151" }}>
            {property.BedroomsTotal != null && (
              <span><strong>{property.BedroomsTotal}</strong> Beds</span>
            )}
            {property.BathroomsTotalInteger != null && (
              <span><strong>{property.BathroomsTotalInteger}</strong> Baths</span>
            )}
            {property.LivingArea != null && (
              <span><strong>{property.LivingArea.toLocaleString()}</strong> Sq Ft</span>
            )}
            {property.YearBuilt != null && (
              <span>Built <strong>{property.YearBuilt}</strong></span>
            )}
            {property.PropertyType && (
              <span>{property.PropertyType}{property.PropertySubType ? ` - ${property.PropertySubType}` : ""}</span>
            )}
          </div>

          {/* Description */}
          {property.PublicRemarks && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Description</h2>
              <p style={{ lineHeight: 1.6, color: "#4b5563", fontSize: 15 }}>{property.PublicRemarks}</p>
            </div>
          )}

          {/* Listing Details */}
          <div style={{ background: "#f9fafb", borderRadius: 8, padding: 16, fontSize: 14, color: "#6b7280" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>MLS #: <strong>{property.ListingId || property.ListingKey}</strong></div>
              {property.ListAgentFullName && <div>Agent: <strong>{property.ListAgentFullName}</strong></div>}
              {property.ListOfficeName && <div>Office: <strong>{property.ListOfficeName}</strong></div>}
              {property.OnMarketDate && <div>Listed: <strong>{new Date(property.OnMarketDate).toLocaleDateString()}</strong></div>}
              {property.TaxAnnualAmount != null && <div>Annual Tax: <strong>{fmt(property.TaxAnnualAmount)}</strong></div>}
              {property.AssociationFee != null && property.AssociationFee > 0 && <div>HOA Fee: <strong>{fmt(property.AssociationFee)}/mo</strong></div>}
            </div>
          </div>

          {/* Virtual Tour */}
          {property.VirtualTourURLUnbranded && (
            <div style={{ marginTop: 16 }}>
              <a
                href={property.VirtualTourURLUnbranded}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#3b82f6", fontSize: 15, fontWeight: 500 }}
              >
                View Virtual Tour &rarr;
              </a>
            </div>
          )}
        </div>

        {/* ─── RIGHT: Mortgage Calculator (sticky) ──────────────── */}
        <div style={{ position: "sticky", top: 24 }}>
          <ListingMortgageCalculator property={property} agent={agent} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #e5e7eb", fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
        Listing shared via Real Estate Genie
      </div>

      {/* Responsive: stack on mobile */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 380px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
