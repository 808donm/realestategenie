"use client";

import { useState, useCallback } from "react";

interface PropertyResult {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  propertyType?: string;
  yearBuilt?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSizeSqft?: number;
  owner1?: string;
  owner2?: string;
  ownerOccupied?: string;
  avmValue?: number;
  assessedTotal?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  apn?: string;
  // Raw data for report generation
  _rawReapiData?: Record<string, unknown>;
  _rawPropertyData?: Record<string, unknown>;
}

export default function SellerReportClient() {
  const [searchAddress, setSearchAddress] = useState("");
  const [searching, setSearching] = useState(false);
  const [property, setProperty] = useState<PropertyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [personalNote, setPersonalNote] = useState("");

  const handleSearch = useCallback(async () => {
    if (!searchAddress.trim()) return;
    setSearching(true);
    setError(null);
    setProperty(null);

    try {
      // Search REAPI for property data by address
      const res = await fetch(`/api/integrations/attom/property?endpoint=expanded&address=${encodeURIComponent(searchAddress.trim())}&pagesize=1`);
      if (!res.ok) throw new Error("Property not found");
      const data = await res.json();

      const p = data.property?.[0] || data;
      if (!p?.address?.oneLine && !p?.address?.line1) {
        throw new Error("No property found at this address. Try a more specific address.");
      }

      const addr = p.address?.oneLine || `${p.address?.line1}, ${p.address?.locality}, ${p.address?.countrySubd} ${p.address?.postal1}`;
      const sale = p.sale?.amount;

      setProperty({
        address: addr,
        city: p.address?.locality,
        state: p.address?.countrySubd,
        zip: p.address?.postal1,
        county: p.area?.munName || p.area?.countrySecSubd,
        propertyType: p.summary?.propType || p.summary?.propertyType,
        yearBuilt: p.building?.summary?.yearBuilt || p.summary?.yearBuilt,
        beds: p.building?.rooms?.beds,
        baths: p.building?.rooms?.bathsFull || p.building?.rooms?.bathsTotal,
        sqft: p.building?.size?.livingSize || p.building?.size?.universalSize,
        lotSizeSqft: p.lot?.lotSize1,
        owner1: p.owner?.owner1?.fullName,
        owner2: p.owner?.owner2?.fullName,
        ownerOccupied: p.owner?.ownerOccupied,
        avmValue: p.avm?.amount?.value,
        assessedTotal: p.assessment?.assessed?.assdTtlValue || p.assessment?.market?.mktTtlValue,
        lastSalePrice: sale?.saleAmt || sale?.salePrice,
        lastSaleDate: sale?.saleTransDate,
        apn: p.identifier?.apn,
        _rawPropertyData: p,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Search failed";
      setError(msg);
    } finally {
      setSearching(false);
    }
  }, [searchAddress]);

  const handleGenerateSellerReport = useCallback(async () => {
    if (!property) return;
    setGenerating(true);
    try {
      const p = property._rawPropertyData as Record<string, unknown> || {};
      const sale = (p.sale as Record<string, unknown>)?.amount as Record<string, unknown> || {};
      const he = (p as Record<string, unknown>).homeEquity as Record<string, unknown> || {};
      const mortgage = (p as Record<string, unknown>).mortgage as Record<string, unknown> || {};
      const mortgageAmt = mortgage.amount as Record<string, unknown> || {};
      const lender = mortgage.lender as Record<string, unknown> || {};
      const assessment = (p as Record<string, unknown>).assessment as Record<string, unknown> || {};
      const assessed = assessment.assessed as Record<string, unknown> || {};
      const market = assessment.market as Record<string, unknown> || {};
      const tax = assessment.tax as Record<string, unknown> || {};
      const avm = (p as Record<string, unknown>).avm as Record<string, unknown> || {};
      const avmAmount = avm.amount as Record<string, unknown> || {};
      const lot = (p as Record<string, unknown>).lot as Record<string, unknown> || {};
      const building = (p as Record<string, unknown>).building as Record<string, unknown> || {};
      const bldgSize = building.size as Record<string, unknown> || {};
      const bldgRooms = building.rooms as Record<string, unknown> || {};
      const bldgSummary = building.summary as Record<string, unknown> || {};
      const bldgConstruction = building.construction as Record<string, unknown> || {};
      const owner = (p as Record<string, unknown>).owner as Record<string, unknown> || {};
      const owner1 = owner.owner1 as Record<string, unknown> || {};
      const owner2 = owner.owner2 as Record<string, unknown> || {};
      const addr = (p as Record<string, unknown>).address as Record<string, unknown> || {};
      const summary = (p as Record<string, unknown>).summary as Record<string, unknown> || {};
      const identifier = (p as Record<string, unknown>).identifier as Record<string, unknown> || {};

      // Build report data from raw REAPI property
      const reportData = {
        address: property.address,
        city: addr.locality as string || property.city,
        state: addr.countrySubd as string || property.state,
        zip: addr.postal1 as string || property.zip,
        county: property.county,
        apn: identifier.apn as string || property.apn,
        propertyType: summary.propType as string || summary.propertyType as string || property.propertyType,
        yearBuilt: (bldgSummary.yearBuilt as number) || (summary.yearBuilt as number) || property.yearBuilt,
        beds: bldgRooms.beds as number || property.beds,
        baths: (bldgRooms.bathsFull as number) || (bldgRooms.bathsTotal as number) || property.baths,
        sqft: (bldgSize.livingSize as number) || (bldgSize.universalSize as number) || property.sqft,
        lotSizeSqft: (lot.lotSize1 as number) || property.lotSizeSqft,
        lotSizeAcres: lot.lotSize2 as number,
        avmValue: (avmAmount.value as number) || property.avmValue,
        avmLow: avmAmount.low as number,
        avmHigh: avmAmount.high as number,
        avmConfidence: avmAmount.scr as number,
        avmDate: avm.eventDate as string,
        assessedTotal: (assessed.assdTtlValue as number) || property.assessedTotal,
        assessedLand: assessed.assdLandValue as number,
        assessedImpr: assessed.assdImprValue as number,
        marketTotal: market.mktTtlValue as number,
        taxAmount: tax.taxAmt as number,
        taxYear: tax.taxYear as number,
        lastSalePrice: (sale.saleAmt as number) || (sale.salePrice as number) || property.lastSalePrice,
        lastSaleDate: (sale.saleTransDate as string) || property.lastSaleDate,
        estimatedEquity: (he.equity as number) || undefined,
        loanBalance: (he.outstandingBalance as number) || (he.loanBalance as number) || undefined,
        ltv: (he.ltv as number) || (he.loanToValue as number) || undefined,
        lender: (lender.fullName as string) || (lender.name as string) || undefined,
        loanAmount: typeof mortgageAmt === "object" ? (mortgageAmt.firstAmt as number) : (mortgage.amount as number),
        loanType: mortgage.loanType as string,
        owner1: owner1.fullName as string || property.owner1,
        owner2: owner2.fullName as string || property.owner2,
        ownerOccupied: owner.ownerOccupied as string || property.ownerOccupied,
        absenteeOwner: owner.absenteeOwnerStatus as string,
        mailingAddress: owner.mailingAddressOneLine as string,
        corporateOwner: owner.corporateIndicator as string,
        constructionType: bldgConstruction.constructionType as string,
        roofType: bldgConstruction.roofCover as string,
        foundationType: bldgConstruction.foundationType as string,
        condition: bldgConstruction.condition as string,
        architectureStyle: bldgSummary.archStyle as string,
        stories: bldgSummary.levels as number,
        // Sales history
        salesHistory: ((p as Record<string, unknown>).saleHistory as Array<Record<string, unknown>> || []).map((s) => {
          const saleAmt = s.amount as Record<string, unknown> || {};
          return {
            date: (s.date as string) || (saleAmt.saleTransDate as string),
            recordingDate: (s.recordingDate as string) || (saleAmt.saleRecDate as string),
            amount: typeof s.amount === "object" ? (saleAmt.saleAmt as number) : (s.amount as number),
            buyer: (s.buyerName as string) || (s.buyerNames as string),
            seller: (s.sellerName as string) || (s.sellerNames as string),
            docType: (s.deedType as string) || (s.documentType as string),
          };
        }),
        // Legal
        legal: (lot.zoning || lot.censusTract || lot.legalDescription || lot.subdivision) ? {
          zoning: (lot.siteZoningIdent as string) || (lot.zoning as string),
          censusTract: lot.censusTract as string,
          legalDescription: (summary.legal1 as string) || (lot.legalDescription as string),
          subdivision: lot.subdivision as string,
        } : undefined,
        // Deed details
        deed: sale.saleTransDate ? {
          contractDate: sale.saleTransDate as string,
          recordingDate: sale.saleRecDate as string,
          documentType: (p as Record<string, unknown>).sale && ((p as Record<string, unknown>).sale as Record<string, unknown>).documentType as string,
          sellerName: ((p as Record<string, unknown>).sale as Record<string, unknown>)?.sellerNames as string,
          buyerName: ((p as Record<string, unknown>).sale as Record<string, unknown>)?.buyerNames as string,
        } : undefined,
        personalNote: personalNote || undefined,
        generatedAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      };

      // Also fetch comps and market stats for the report
      const lat = ((p as Record<string, unknown>).location as Record<string, unknown>)?.latitude;
      const lng = ((p as Record<string, unknown>).location as Record<string, unknown>)?.longitude;
      const zip = property.zip;

      const [compsRes, marketRes] = await Promise.allSettled([
        fetch(`/api/comps?address=${encodeURIComponent(property.address)}&latitude=${lat || ""}&longitude=${lng || ""}&compCount=10&nocache=1`)
          .then((r) => r.ok ? r.json() : null).catch(() => null),
        zip ? fetch(`/api/rentcast/market-stats?zipCode=${zip}`)
          .then((r) => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
      ]);

      const compsData = compsRes.status === "fulfilled" ? compsRes.value : null;
      if (compsData?.comparables?.length) {
        (reportData as Record<string, unknown>).comps = compsData.comparables
          .filter((c: Record<string, unknown>) => ((c.closePrice as number) || (c.listPrice as number) || 0) >= 10000)
          .slice(0, 10)
          .map((c: Record<string, unknown>) => ({
            address: c.address || c.formattedAddress || "Unknown",
            price: c.closePrice || c.listPrice || c.price,
            beds: c.bedrooms || c.beds,
            baths: c.bathrooms || c.baths,
            sqft: c.squareFootage || c.sqft,
            closeDate: c.closeDate,
            correlation: c.correlation,
          }));
      }

      const marketData = marketRes.status === "fulfilled" ? marketRes.value : null;
      if (marketData?.saleData || marketData?.sale) {
        const saleStats = marketData.saleData || marketData.sale || {};
        (reportData as Record<string, unknown>).marketStats = {
          medianPrice: saleStats.medianPrice || saleStats.averagePrice,
          avgDOM: saleStats.averageDaysOnMarket || saleStats.medianDaysOnMarket,
          totalListings: saleStats.totalListings,
          pricePerSqft: saleStats.averagePricePerSquareFoot,
        };
      }

      // Generate PDF via API
      const res = await fetch("/api/property-intelligence/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property: reportData, reportType: "seller" }),
      });

      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Seller_Report_${property.address.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_").substring(0, 40)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error("[SellerReport] Generation failed:", err);
      alert("Failed to generate Seller Report. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [property, personalNote]);

  const fmt$ = (n?: number | null) => n != null ? `$${n.toLocaleString()}` : "-";

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Search bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Enter property address (e.g., 2947 Manoa Rd, Honolulu, HI 96822)"
          value={searchAddress}
          onChange={(e) => setSearchAddress(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          style={{
            flex: 1,
            padding: "12px 16px",
            fontSize: 14,
            borderRadius: 8,
            border: "1px solid #d1d5db",
            outline: "none",
          }}
        />
        <button
          onClick={handleSearch}
          disabled={searching || !searchAddress.trim()}
          style={{
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 8,
            border: "none",
            background: "#1e40af",
            color: "#fff",
            cursor: searching ? "not-allowed" : "pointer",
            opacity: searching ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {searching ? "Searching..." : "Search Property"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626", marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Property preview card */}
      {property && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
          {/* Header */}
          <div style={{ padding: "20px 24px", background: "#1e40af", color: "#fff" }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{property.address}</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
              {[property.city, property.state, property.zip].filter(Boolean).join(", ")}
            </div>
          </div>

          {/* Property details grid */}
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
              {/* Value cards */}
              {property.avmValue != null && (
                <div style={{ padding: "12px 16px", background: "#eff6ff", borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>AVM Value</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#1e40af" }}>{fmt$(property.avmValue)}</div>
                </div>
              )}
              {property.lastSalePrice != null && (
                <div style={{ padding: "12px 16px", background: "#f0fdf4", borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Last Sale</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#15803d" }}>{fmt$(property.lastSalePrice)}</div>
                  {property.lastSaleDate && <div style={{ fontSize: 11, color: "#6b7280" }}>{property.lastSaleDate}</div>}
                </div>
              )}
              {property.assessedTotal != null && (
                <div style={{ padding: "12px 16px", background: "#faf5ff", borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Assessed Value</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#7c3aed" }}>{fmt$(property.assessedTotal)}</div>
                </div>
              )}
            </div>

            {/* Property facts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              {[
                { label: "Type", value: property.propertyType },
                { label: "Year Built", value: property.yearBuilt },
                { label: "Beds", value: property.beds },
                { label: "Baths", value: property.baths },
                { label: "Sqft", value: property.sqft?.toLocaleString() },
                { label: "Lot", value: property.lotSizeSqft?.toLocaleString() },
                { label: "APN", value: property.apn },
                { label: "County", value: property.county },
                { label: "Owner", value: property.owner1 },
                { label: "Owner Occupied", value: property.ownerOccupied === "Y" ? "Yes" : property.ownerOccupied === "N" ? "No" : property.ownerOccupied },
              ].filter((r) => r.value != null && r.value !== undefined).map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>{r.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{String(r.value)}</span>
                </div>
              ))}
            </div>

            {/* Personal note */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Personal Note (optional)
              </label>
              <textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="Add a personal message to the seller (e.g., 'I noticed your home has been in the family for 20+ years. Here is a market analysis...')"
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerateSellerReport}
              disabled={generating}
              style={{
                width: "100%",
                padding: "14px 20px",
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 8,
                border: "none",
                background: generating ? "#9ca3af" : "#b45309",
                color: "#fff",
                cursor: generating ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {generating ? "Generating Seller Report..." : "Generate Seller Report PDF"}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!property && !searching && !error && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#x1F3E0;</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>Search for a property to get started</div>
          <div style={{ fontSize: 13, maxWidth: 400, margin: "0 auto", lineHeight: 1.6 }}>
            Enter a property address above to pull public records data and generate a professional Seller Report PDF with valuation, equity analysis, market trends, and pricing strategy.
          </div>
        </div>
      )}
    </div>
  );
}
