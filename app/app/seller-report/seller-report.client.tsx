"use client";

import { useState, useCallback } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

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
  estimatedEquity?: number;
  loanBalance?: number;
  // Enrichment status
  enriched?: boolean;
  mlsFound?: boolean;
  mlsPhotos?: string[];
  mlsListPrice?: number;
  mlsStatus?: string;
  mlsDaysOnMarket?: number;
  mlsDescription?: string;
  // Raw data for report generation
  _rawPropertyData?: any;
  _rawReapiData?: any;
  _rawMlsData?: any;
}

export default function SellerReportClient() {
  const [searchAddress, setSearchAddress] = useState("");
  const [searching, setSearching] = useState(false);
  const [property, setProperty] = useState<PropertyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [personalNote, setPersonalNote] = useState("");
  const [enriching, setEnriching] = useState(false);

  // ── Step 1: Search property by address ──
  const handleSearch = useCallback(async () => {
    if (!searchAddress.trim()) return;
    setSearching(true);
    setError(null);
    setProperty(null);

    try {
      // Search via expanded property endpoint
      const res = await fetch(`/api/integrations/attom/property?endpoint=expanded&address=${encodeURIComponent(searchAddress.trim())}&pagesize=1`);
      if (!res.ok) throw new Error("Property not found");
      const data = await res.json();

      const p = data.property?.[0] || data;
      if (!p?.address?.oneLine && !p?.address?.line1) {
        throw new Error("No property found at this address. Try a more specific address.");
      }

      const addr = p.address?.oneLine || `${p.address?.line1}, ${p.address?.locality}, ${p.address?.countrySubd} ${p.address?.postal1}`;
      const sale = p.sale?.amount;
      const he = p.homeEquity || {};

      const propResult: PropertyResult = {
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
        estimatedEquity: he.equity,
        loanBalance: he.outstandingBalance || he.loanBalance,
        _rawPropertyData: p,
      };

      setProperty(propResult);

      // ── Step 2: Enrich with REAPI + MLS in parallel ──
      setEnriching(true);
      const reapiParams = new URLSearchParams({ endpoint: "property-detail", address: addr });
      if (p.address?.locality) reapiParams.set("city", p.address.locality);
      if (p.address?.countrySubd) reapiParams.set("state", p.address.countrySubd);
      if (p.address?.postal1) reapiParams.set("zip", p.address.postal1);

      const [reapiRes, mlsRes] = await Promise.allSettled([
        fetch(`/api/integrations/reapi?${reapiParams.toString()}`, { signal: AbortSignal.timeout(15000) })
          .then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch(`/api/mls/sales-history?address=${encodeURIComponent(addr)}`)
          .then((r) => r.ok ? r.json() : null).catch(() => null),
      ]);

      const reapiData = reapiRes.status === "fulfilled" ? reapiRes.value?.property : null;
      const mlsData = mlsRes.status === "fulfilled" ? mlsRes.value : null;

      // Also try to find an active MLS listing for photos
      let mlsListing: any = null;
      try {
        const line1 = p.address?.line1 || addr.split(",")[0].trim();
        const mlsSearchRes = await fetch(`/api/mls/search?address=${encodeURIComponent(line1)}&status=Active,Pending,Closed&limit=1`);
        if (mlsSearchRes.ok) {
          const mlsSearchData = await mlsSearchRes.json();
          mlsListing = mlsSearchData.listings?.[0] || mlsSearchData.results?.[0] || null;
        }
      } catch {}

      // Update property with enriched data
      setProperty((prev) => {
        if (!prev) return prev;
        const rd = reapiData || {};
        return {
          ...prev,
          enriched: true,
          // REAPI enrichment overrides
          avmValue: rd.avm?.amount?.value || prev.avmValue,
          beds: rd.building?.rooms?.beds || prev.beds,
          baths: rd.building?.rooms?.bathsFull || rd.building?.rooms?.bathsTotal || prev.baths,
          sqft: rd.building?.size?.livingSize || rd.building?.size?.universalSize || prev.sqft,
          estimatedEquity: rd.homeEquity?.equity || prev.estimatedEquity,
          loanBalance: rd.homeEquity?.outstandingBalance || rd.homeEquity?.loanBalance || prev.loanBalance,
          // MLS data
          mlsFound: !!mlsListing,
          mlsPhotos: (mlsListing?.Media || []).filter((m: any) => m.MediaURL && (m.MediaType || "").startsWith("image")).slice(0, 20).map((m: any) => m.MediaURL),
          mlsListPrice: mlsListing?.ListPrice,
          mlsStatus: mlsListing?.StandardStatus,
          mlsDaysOnMarket: mlsListing?.DaysOnMarket,
          mlsDescription: mlsListing?.PublicRemarks,
          _rawReapiData: reapiData,
          _rawMlsData: { salesHistory: mlsData, listing: mlsListing },
        };
      });
      setEnriching(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Search failed";
      setError(msg);
      setEnriching(false);
    } finally {
      setSearching(false);
    }
  }, [searchAddress]);

  // ── Generate comprehensive Seller Report PDF ──
  const handleGenerateSellerReport = useCallback(async () => {
    if (!property) return;
    setGenerating(true);
    try {
      const p = property._rawPropertyData || {};
      const rd = property._rawReapiData || {};
      const mlsListing = property._rawMlsData?.listing || {};
      const mlsSalesHistory = property._rawMlsData?.salesHistory || {};

      // Merge property data (REAPI overrides basic property data)
      const sale = rd.sale?.amount || p.sale?.amount || {};
      const he = rd.homeEquity || p.homeEquity || {};
      const mortgage = rd.mortgage || p.mortgage || {};
      const mortgageAmt = mortgage.amount || {};
      const lender = mortgage.lender || {};
      const assessment = rd.assessment || p.assessment || {};
      const assessed = assessment.assessed || {};
      const market = assessment.market || {};
      const tax = assessment.tax || {};
      const avm = rd.avm || p.avm || {};
      const avmAmount = avm.amount || {};
      const lot = rd.lot || p.lot || {};
      const building = rd.building || p.building || {};
      const bldgSize = building.size || {};
      const bldgRooms = building.rooms || {};
      const bldgSummary = building.summary || {};
      const bldgConstruction = building.construction || {};
      const bldgFeatures = building.features || {};
      const owner = rd.owner || p.owner || {};
      const owner1Obj = owner.owner1 || {};
      const owner2Obj = owner.owner2 || {};
      const addr = rd.address || p.address || {};
      const summary = rd.summary || p.summary || {};
      const identifier = rd.identifier || p.identifier || {};
      const rRaw = rd._raw?.propertyInfo || {};
      const rl = rd.lot || {};

      // Interior features
      const interiorFeatures: Array<{ label: string; value: string }> = [];
      if (mlsListing.InteriorFeatures) interiorFeatures.push({ label: "Interior", value: String(mlsListing.InteriorFeatures).substring(0, 100) });
      if (mlsListing.Flooring) interiorFeatures.push({ label: "Floor", value: String(mlsListing.Flooring) });
      if (rRaw.plumbingFixturesCount) interiorFeatures.push({ label: "Plumbing Fixtures", value: String(rRaw.plumbingFixturesCount) });
      if (rRaw.interiorStructure) interiorFeatures.push({ label: "Interior Structure", value: String(rRaw.interiorStructure) });
      if (bldgFeatures.fireplace) interiorFeatures.push({ label: "Fireplace", value: "Yes" });
      if (building.interior?.bsmtSize) interiorFeatures.push({ label: "Basement Finished", value: `${building.interior.bsmtSize} sq ft` });
      if (building.parking?.prkgSize) interiorFeatures.push({ label: "Garage", value: `${building.parking.prkgSize} sq ft` });
      if (rRaw.floorCover) interiorFeatures.push({ label: "Floor Cover", value: String(rRaw.floorCover) });
      if (rRaw.interiorWalls) interiorFeatures.push({ label: "Interior Walls", value: String(rRaw.interiorWalls) });

      // Exterior features
      const exteriorFeatures: Array<{ label: string; value: string }> = [];
      if (mlsListing.ConstructionMaterials) exteriorFeatures.push({ label: "Construction", value: String(mlsListing.ConstructionMaterials) });
      if (mlsListing.Roof) exteriorFeatures.push({ label: "Roof", value: String(mlsListing.Roof) });
      if (mlsListing.SecurityFeatures) exteriorFeatures.push({ label: "Security", value: String(mlsListing.SecurityFeatures) });
      if (mlsListing.PoolFeatures || mlsListing.PoolPrivateYN) exteriorFeatures.push({ label: "Pool", value: mlsListing.PoolFeatures || (mlsListing.PoolPrivateYN === true ? "Yes" : "None") });
      if (mlsListing.ParkingFeatures) exteriorFeatures.push({ label: "Parking", value: String(mlsListing.ParkingFeatures) });
      if (mlsListing.ParkingTotal) exteriorFeatures.push({ label: "Parking Spaces", value: String(mlsListing.ParkingTotal) });
      if (mlsListing.Utilities) exteriorFeatures.push({ label: "Utilities", value: String(mlsListing.Utilities).substring(0, 100) });
      if (mlsListing.View) exteriorFeatures.push({ label: "View", value: String(mlsListing.View) });
      if (mlsListing.LotFeatures) exteriorFeatures.push({ label: "Lot Features", value: String(mlsListing.LotFeatures) });
      if (rRaw.buildingCondition) exteriorFeatures.push({ label: "Building Condition", value: String(rRaw.buildingCondition) });
      if (rRaw.buildingQuality) exteriorFeatures.push({ label: "Building Quality", value: String(rRaw.buildingQuality) });
      if (rRaw.roofType) exteriorFeatures.push({ label: "Roof Type (Public)", value: String(rRaw.roofType) });
      if (rRaw.neighborhoodCode) exteriorFeatures.push({ label: "Neighborhood Code", value: String(rRaw.neighborhoodCode) });
      if (rRaw.effectiveYearBuilt) exteriorFeatures.push({ label: "Effective Year Built", value: String(rRaw.effectiveYearBuilt) });
      const lotAcres = lot.lotSize2 || (lot.lotSize1 ? (lot.lotSize1 / 43560).toFixed(2) : null);
      if (lot.lotSize1) exteriorFeatures.push({ label: "Lot Size", value: `${Number(lot.lotSize1).toLocaleString()} sq ft${lotAcres ? ` (${lotAcres} acres)` : ""}` });

      // Tax history from REAPI
      const taxHistory = (rd.assessment_history || []).map((t: any) => ({
        year: t.year,
        assessedLand: t.land,
        assessedImpr: t.improvement,
        assessedTotal: t.total,
      }));

      // Sales history (merge MLS + public records)
      const publicSalesHistory = (rd.saleHistory || p.saleHistory || []).map((s: any) => {
        const saleAmt = s.amount || {};
        return {
          date: s.date || saleAmt.saleTransDate,
          recordingDate: s.recordingDate || saleAmt.saleRecDate,
          amount: typeof s.amount === "object" ? saleAmt.saleAmt : s.amount,
          buyer: s.buyerName || s.buyerNames,
          seller: s.sellerName || s.sellerNames,
          docType: s.deedType || s.documentType,
        };
      });
      const mlsSales = (mlsSalesHistory.unitHistory || mlsSalesHistory.buildingHistory || []).map((s: any) => ({
        date: s.CloseDate || s.closeDate,
        amount: s.ClosePrice || s.closePrice,
        buyer: s.BuyerAgentFullName,
        seller: s.ListAgentFullName,
      }));
      const allSalesHistory = [...mlsSales, ...publicSalesHistory];

      // MLS photos
      const photos = (property.mlsPhotos || []).slice(0, 20);

      // Build the comprehensive report data
      const reportData: any = {
        address: property.address,
        city: addr.locality || property.city,
        state: addr.countrySubd || property.state,
        zip: addr.postal1 || property.zip,
        county: property.county,
        apn: identifier.apn || property.apn,
        propertyType: summary.propType || summary.propertyType || property.propertyType,
        yearBuilt: bldgSummary.yearBuilt || summary.yearBuilt || property.yearBuilt,
        beds: bldgRooms.beds || property.beds,
        baths: bldgRooms.bathsFull || bldgRooms.bathsTotal || property.baths,
        sqft: bldgSize.livingSize || bldgSize.universalSize || property.sqft,
        lotSizeSqft: lot.lotSize1 || property.lotSizeSqft,
        lotSizeAcres: lot.lotSize2,
        stories: bldgSummary.levels || bldgSummary.storyCount,
        garageSpaces: building.parking?.prkgSpaces,
        pool: lot.poolInd === "Y" ? true : lot.poolInd === "N" ? false : undefined,
        // Valuation
        avmValue: avmAmount.value || property.avmValue,
        avmLow: avmAmount.low,
        avmHigh: avmAmount.high,
        avmConfidence: avmAmount.scr,
        avmDate: avm.eventDate,
        listPrice: property.mlsListPrice,
        // MLS listing info
        mlsNumber: mlsListing.ListingId,
        listingStatus: property.mlsStatus || mlsListing.StandardStatus,
        daysOnMarket: property.mlsDaysOnMarket || mlsListing.DaysOnMarket,
        listingAgentName: mlsListing.ListAgentFullName,
        listingOfficeName: mlsListing.ListOfficeName,
        listingDescription: property.mlsDescription || mlsListing.PublicRemarks,
        ownershipType: mlsListing.OwnershipType,
        // Tax
        assessedTotal: assessed.assdTtlValue || property.assessedTotal,
        assessedLand: assessed.assdLandValue,
        assessedImpr: assessed.assdImprValue,
        marketTotal: market.mktTtlValue,
        taxAmount: tax.taxAmt,
        taxYear: tax.taxYear,
        taxHistory,
        // Sale
        lastSalePrice: sale.saleAmt || sale.salePrice || property.lastSalePrice,
        lastSaleDate: sale.saleTransDate || property.lastSaleDate,
        // Equity & Mortgage
        estimatedEquity: he.equity || property.estimatedEquity,
        loanBalance: he.outstandingBalance || he.loanBalance || property.loanBalance,
        ltv: he.ltv || he.loanToValue,
        loanCount: he.loanCount || mortgage.lienCount,
        lender: lender.fullName || lender.name,
        loanAmount: typeof mortgageAmt === "object" ? mortgageAmt.firstAmt : mortgage.amount,
        loanType: mortgage.loanType,
        // Ownership
        owner1: owner1Obj.fullName || property.owner1,
        owner2: owner2Obj.fullName || property.owner2,
        ownerOccupied: owner.ownerOccupied || property.ownerOccupied,
        absenteeOwner: owner.absenteeOwnerStatus,
        mailingAddress: owner.mailingAddressOneLine,
        corporateOwner: owner.corporateIndicator,
        // Building
        constructionType: bldgConstruction.constructionType || mlsListing.ConstructionMaterials,
        roofType: bldgConstruction.roofCover || mlsListing.Roof,
        foundationType: bldgConstruction.foundationType,
        heatingType: mlsListing.Heating || (p.utilities || {}).heatingType,
        coolingType: mlsListing.Cooling || (p.utilities || {}).coolingType,
        fireplaceCount: building.interior?.fplcCount,
        basementType: building.interior?.bsmtType || mlsListing.Basement,
        basementSize: building.interior?.bsmtSize,
        architectureStyle: bldgSummary.archStyle,
        condition: bldgConstruction.condition || rRaw.buildingCondition,
        parkingType: building.parking?.garageType || building.parking?.prkgType,
        parkingSpaces: building.parking?.prkgSpaces,
        // Features
        interiorFeatures: interiorFeatures.length > 0 ? interiorFeatures : undefined,
        exteriorFeatures: exteriorFeatures.length > 0 ? exteriorFeatures : undefined,
        // Legal
        legal: (rl.zoning || rl.censusTract || rl.legalDescription || rl.subdivision || lot.siteZoningIdent || summary.legal1) ? {
          zoning: lot.siteZoningIdent || rl.zoning,
          censusTract: rl.censusTract,
          legalDescription: summary.legal1 || rl.legalDescription,
          subdivision: rl.subdivision || mlsListing.SubdivisionName,
        } : undefined,
        // Deed
        deed: sale.saleTransDate ? {
          contractDate: sale.saleTransDate,
          recordingDate: sale.saleRecDate,
          documentType: (rd.sale || p.sale || {}).documentType,
          sellerName: (rd.sale || p.sale || {}).sellerNames,
          buyerName: (rd.sale || p.sale || {}).buyerNames,
          buyerVesting: (rd.sale || p.sale || {}).buyerVesting,
          transferTax: (rd.sale || p.sale || {}).transferTax,
        } : undefined,
        // History
        salesHistory: allSalesHistory,
        // Photos
        photos,
        // Personal note
        personalNote: personalNote || undefined,
        generatedAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      };

      // Fetch comps and market stats in parallel
      const lat = (rd.location || p.location || {}).latitude;
      const lng = (rd.location || p.location || {}).longitude;
      const zip = property.zip;

      const [compsRes, marketRes] = await Promise.allSettled([
        fetch(`/api/comps?address=${encodeURIComponent(property.address)}&latitude=${lat || ""}&longitude=${lng || ""}&compCount=10&nocache=1`)
          .then((r) => r.ok ? r.json() : null).catch(() => null),
        zip ? fetch(`/api/rentcast/market-stats?zipCode=${zip}`)
          .then((r) => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
      ]);

      // Comps
      const compsData = compsRes.status === "fulfilled" ? compsRes.value : null;
      if (compsData?.comparables?.length) {
        reportData.comps = compsData.comparables
          .filter((c: any) => ((c.closePrice || c.listPrice || 0) >= 10000))
          .slice(0, 10)
          .map((c: any) => ({
            address: c.address || c.formattedAddress || "Unknown",
            price: c.closePrice || c.listPrice || c.price,
            beds: c.bedrooms || c.beds,
            baths: c.bathrooms || c.baths,
            sqft: c.squareFootage || c.sqft,
            closeDate: c.closeDate,
            correlation: c.correlation,
          }));
      }

      // Market stats
      const marketData = marketRes.status === "fulfilled" ? marketRes.value : null;
      if (marketData?.saleData || marketData?.sale) {
        const saleStats = marketData.saleData || marketData.sale || {};
        const rptPropType = summary.propType || summary.propertyType;
        const typeMap: Record<string, string> = { sfr: "Single Family", "single family": "Single Family", condo: "Condo", townhouse: "Townhouse" };
        const rcType = rptPropType ? typeMap[(rptPropType || "").toLowerCase()] : undefined;
        const typeMatch = rcType && saleStats.dataByPropertyType?.find((d: any) => d.propertyType === rcType);
        const rptSale = typeMatch || saleStats;

        reportData.marketStats = {
          medianPrice: rptSale.medianPrice || rptSale.averagePrice,
          avgDOM: rptSale.averageDaysOnMarket || rptSale.medianDaysOnMarket,
          totalListings: rptSale.totalListings,
          pricePerSqft: rptSale.averagePricePerSquareFoot || rptSale.medianPricePerSquareFoot,
        };

        // Compute market type
        const totalListings = reportData.marketStats.totalListings;
        const avgDOM = reportData.marketStats.avgDOM;
        if (totalListings && avgDOM && avgDOM > 0) {
          const monthlySales = totalListings / (avgDOM / 30);
          if (monthlySales > 0) {
            const moi = totalListings / monthlySales;
            reportData.monthsOfInventory = Math.round(moi * 10) / 10;
            reportData.marketType = moi <= 4 ? "sellers" : moi <= 6 ? "balanced" : "buyers";
          }
        }
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
          style={{ flex: 1, padding: "12px 16px", fontSize: 14, borderRadius: 8, border: "1px solid #d1d5db", outline: "none" }}
        />
        <button
          onClick={handleSearch}
          disabled={searching || !searchAddress.trim()}
          style={{ padding: "12px 24px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: "none", background: "#1e40af", color: "#fff", cursor: searching ? "not-allowed" : "pointer", opacity: searching ? 0.6 : 1, whiteSpace: "nowrap" }}
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
          {/* Header with photo if MLS found */}
          <div style={{ display: "flex" }}>
            {property.mlsPhotos && property.mlsPhotos[0] && (
              <div style={{ width: 200, height: 160, flexShrink: 0, overflow: "hidden" }}>
                <img src={property.mlsPhotos[0]} alt="Property" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <div style={{ flex: 1, padding: "20px 24px", background: "#1e40af", color: "#fff", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{property.address}</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
                {[property.city, property.state, property.zip].filter(Boolean).join(", ")}
              </div>
              {enriching && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>Enriching with additional data sources...</div>}
              {property.enriched && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.2)" }}>Public Records</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.2)" }}>Property Data</span>
                  {property.mlsFound && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(16,185,129,0.3)" }}>MLS Found</span>}
                </div>
              )}
            </div>
          </div>

          {/* Property details grid */}
          <div style={{ padding: "20px 24px" }}>
            {/* Value cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
              {property.avmValue != null && (
                <div style={{ padding: "12px 16px", background: "#eff6ff", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>AVM Value</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#1e40af" }}>{fmt$(property.avmValue)}</div>
                </div>
              )}
              {property.mlsListPrice != null && (
                <div style={{ padding: "12px 16px", background: "#fefce8", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>List Price</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#b45309" }}>{fmt$(property.mlsListPrice)}</div>
                  {property.mlsStatus && <div style={{ fontSize: 10, color: "#6b7280" }}>{property.mlsStatus}</div>}
                </div>
              )}
              {property.lastSalePrice != null && (
                <div style={{ padding: "12px 16px", background: "#f0fdf4", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Last Sale</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#15803d" }}>{fmt$(property.lastSalePrice)}</div>
                  {property.lastSaleDate && <div style={{ fontSize: 10, color: "#6b7280" }}>{property.lastSaleDate}</div>}
                </div>
              )}
              {property.estimatedEquity != null && (
                <div style={{ padding: "12px 16px", background: property.estimatedEquity >= 0 ? "#ecfdf5" : "#fef2f2", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>Est. Equity</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: property.estimatedEquity >= 0 ? "#15803d" : "#dc2626" }}>{property.estimatedEquity >= 0 ? "+" : ""}{fmt$(property.estimatedEquity)}</div>
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
                { label: "Co-Owner", value: property.owner2 },
                { label: "Owner Occupied", value: property.ownerOccupied === "Y" ? "Yes" : property.ownerOccupied === "N" ? "No" : property.ownerOccupied },
              ].filter((r) => r.value != null && r.value !== undefined).map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>{r.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{String(r.value)}</span>
                </div>
              ))}
            </div>

            {/* MLS photos preview */}
            {property.mlsPhotos && property.mlsPhotos.length > 1 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>{property.mlsPhotos.length} MLS Photos Available</div>
                <div style={{ display: "flex", gap: 4, overflow: "hidden" }}>
                  {property.mlsPhotos.slice(0, 5).map((url, i) => (
                    <div key={i} style={{ width: 80, height: 60, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                  {property.mlsPhotos.length > 5 && (
                    <div style={{ width: 80, height: 60, borderRadius: 4, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#6b7280", flexShrink: 0 }}>
                      +{property.mlsPhotos.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Personal note */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Personal Note (optional)
              </label>
              <textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="Add a personal message to the seller..."
                rows={3}
                style={{ width: "100%", padding: "10px 14px", fontSize: 13, borderRadius: 8, border: "1px solid #d1d5db", outline: "none", resize: "vertical", fontFamily: "inherit" }}
              />
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerateSellerReport}
              disabled={generating || enriching}
              style={{
                width: "100%",
                padding: "14px 20px",
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 8,
                border: "none",
                background: generating ? "#9ca3af" : enriching ? "#d97706" : "#b45309",
                color: "#fff",
                cursor: generating || enriching ? "not-allowed" : "pointer",
              }}
            >
              {generating ? "Generating Seller Report..." : enriching ? "Enriching Data..." : "Generate Seller Report PDF"}
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
            Enter a property address above to pull public records data, MLS listing info, and generate a professional Seller Report PDF with valuation, equity analysis, market trends, and pricing strategy.
          </div>
        </div>
      )}
    </div>
  );
}
