"use client";

import { useState, useEffect } from "react";
import type { FederalPropertySupplement } from "@/lib/integrations/federal-data-client";
import { buildQPublicUrl } from "@/lib/hawaii-zip-county";

interface AttomProperty {
  identifier?: { Id?: number; fips?: string; apn?: string; attomId?: number };
  address?: { oneLine?: string; line1?: string; line2?: string; locality?: string; countrySubd?: string; postal1?: string };
  location?: { latitude?: string; longitude?: string; geoid?: string; geoIdV4?: string };
  area?: {
    munName?: string; countrySecSubd?: string; geoid?: string;
    blockGeoIdV4?: string; blockGroupGeoIdV4?: string; tractGeoIdV4?: string;
    countyGeoIdV4?: string; placeGeoIdV4?: string; cbsaGeoIdV4?: string;
    schoolDistrictGeoIdV4?: string; neighborhoodGeoIdV4?: string;
  };
  summary?: { propType?: string; propertyType?: string; propSubType?: string; yearBuilt?: number; propLandUse?: string; absenteeInd?: string; legal1?: string; propIndicator?: string };
  building?: {
    size?: { bldgSize?: number; livingSize?: number; universalSize?: number; grossSize?: number; groundFloorSize?: number };
    rooms?: { beds?: number; bathsFull?: number; bathsHalf?: number; bathsTotal?: number; roomsTotal?: number };
    summary?: { yearBuilt?: number; yearBuiltEffective?: number; levels?: number; bldgType?: string; archStyle?: string; quality?: string; storyDesc?: string; unitsCount?: string; view?: string };
    construction?: { condition?: string; constructionType?: string; foundationType?: string; frameType?: string; roofCover?: string; roofShape?: string; wallType?: string };
    interior?: { bsmtSize?: number; bsmtType?: string; fplcCount?: number; fplcType?: string };
    parking?: { garageType?: string; prkgSize?: number; prkgSpaces?: string; prkgType?: string };
  };
  lot?: { lotSize1?: number; lotSize2?: number; lotNum?: string; poolInd?: string; poolType?: string; siteZoningIdent?: string };
  owner?: {
    owner1?: { fullName?: string }; owner2?: { fullName?: string }; owner3?: { fullName?: string }; owner4?: { fullName?: string };
    corporateIndicator?: string; absenteeOwnerStatus?: string; mailingAddressOneLine?: string; ownerOccupied?: string;
    ownerRelationshipType?: string; ownerRelationshipRights?: string;
  };
  assessment?: {
    appraised?: { apprTtlValue?: number; apprImprValue?: number; apprLandValue?: number };
    assessed?: { assdTtlValue?: number; assdImprValue?: number; assdLandValue?: number };
    market?: { mktTtlValue?: number; mktImprValue?: number; mktLandValue?: number };
    tax?: { taxAmt?: number; taxPerSizeUnit?: number; taxYear?: number };
  };
  sale?: { amount?: { saleAmt?: number; saleTransDate?: string; saleRecDate?: string; saleDocType?: string; salePrice?: number; saleCode?: string; pricePerBed?: number; pricePerSizeUnit?: number } };
  avm?: { amount?: { value?: number; high?: number; low?: number; scr?: number; valueRange?: number }; eventDate?: string };
  mortgage?: { amount?: number; lender?: { fullName?: string }; term?: string; date?: string; dueDate?: string; loanType?: string; interestRateType?: string };
  foreclosure?: { actionType?: string; filingDate?: string; recordingDate?: string; auctionDate?: string; auctionLocation?: string; defaultAmount?: number; startingBid?: number; originalLoanAmount?: number; trusteeFullName?: string };
  utilities?: { coolingType?: string; heatingType?: string; heatingFuel?: string; energyType?: string; sewerType?: string; waterType?: string };
}

const fmt = (n?: number) => (n != null ? `$${n.toLocaleString()}` : null);
const fmtNum = (n?: number) => (n != null ? n.toLocaleString() : null);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
        {title}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px 20px" }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#111827", fontWeight: 500 }}>{value}</div>
    </div>
  );
}

/**
 * Deep-search a property object for any geoIdV4 value.
 * ATTOM v4 property responses embed geoIdV4 in various locations
 * (area, identifier, location, etc.).
 */
function findGeoIdV4(obj: any, depth = 0): string | null {
  if (!obj || typeof obj !== "object" || depth > 6) return null;
  // Check common field name variants at current level
  for (const key of ["geoIdV4", "geoidv4", "geoIDV4", "GeoIdV4", "geo_id_v4"]) {
    if (obj[key] && typeof obj[key] === "string") return obj[key];
  }
  // Recurse into nested objects (skip arrays of primitives)
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = findGeoIdV4(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

export default function PropertyDetailModal({
  property: p,
  searchContext,
  onClose,
}: {
  property: AttomProperty;
  searchContext?: { absenteeowner?: string };
  onClose: () => void;
}) {
  const [activeSection, setActiveSection] = useState<"overview" | "building" | "financial" | "ownership" | "neighborhood" | "federal">("overview");
  const [federalData, setFederalData] = useState<FederalPropertySupplement | null>(null);
  const [federalLoading, setFederalLoading] = useState(false);
  const [hawaiiData, setHawaiiData] = useState<any>(null);
  const [hawaiiLoading, setHawaiiLoading] = useState(false);
  const [neighborhoodData, setNeighborhoodData] = useState<any>(null);
  const [neighborhoodLoading, setNeighborhoodLoading] = useState(false);
  const [hazardData, setHazardData] = useState<any>(null);
  const [hazardLoading, setHazardLoading] = useState(false);
  const [avmData, setAvmData] = useState<any>(null);
  const [avmLoading, setAvmLoading] = useState(false);
  const [enrichedFinancial, setEnrichedFinancial] = useState<any>(null);
  const [enrichedFinancialLoading, setEnrichedFinancialLoading] = useState(false);
  const [enrichedOwner, setEnrichedOwner] = useState<any>(null);
  const [enrichedOwnerLoading, setEnrichedOwnerLoading] = useState(false);

  const addr = p.address?.oneLine || [p.address?.line1, p.address?.line2].filter(Boolean).join(", ") || "Property Detail";
  const sqft = p.building?.size?.livingSize || p.building?.size?.universalSize || p.building?.size?.bldgSize;
  const beds = p.building?.rooms?.beds;
  const baths = p.building?.rooms?.bathsFull ?? p.building?.rooms?.bathsTotal;
  const yearBuilt = p.building?.summary?.yearBuilt || p.summary?.yearBuilt;
  const avmVal = p.avm?.amount?.value;
  const lastSaleAmt = p.sale?.amount?.saleAmt || p.sale?.amount?.salePrice;
  const equity = avmVal && lastSaleAmt ? avmVal - lastSaleAmt : null;

  // Fetch Hawaii hazard/environmental zone data on mount (for HI properties with lat/lng)
  useEffect(() => {
    if (hazardData || hazardLoading) return;
    const state = p.address?.countrySubd?.toUpperCase();
    const isHawaii = state === "HI" || state === "HAWAII";
    const lat = p.location?.latitude;
    const lng = p.location?.longitude;
    if (!isHawaii || !lat || !lng) return;

    setHazardLoading(true);
    fetch(`/api/integrations/hawaii-hazards?endpoint=profile&lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setHazardData(data);
        }
      })
      .catch(() => {})
      .finally(() => setHazardLoading(false));
  }, [hazardData, hazardLoading, p]);

  // Fetch AVM data when the Financial tab is selected and property doesn't already have AVM
  useEffect(() => {
    if (activeSection !== "financial" || avmData || avmLoading) return;
    if (p.avm?.amount?.value) return; // Already have AVM from search results

    const attomId = p.identifier?.attomId;
    const addr1 = p.address?.line1;
    const addr2 = p.address?.locality && p.address?.countrySubd
      ? `${p.address.locality}, ${p.address.countrySubd}`
      : undefined;

    if (!attomId && !addr1) return;

    setAvmLoading(true);

    const params = new URLSearchParams({ endpoint: "attomavm" });
    if (attomId) {
      params.set("attomid", String(attomId));
    } else {
      if (addr1) params.set("address1", addr1);
      if (addr2) params.set("address2", addr2);
    }

    fetch(`/api/integrations/attom/property?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          // Extract AVM from the response property data
          const prop = data.property?.[0] || data;
          if (prop.avm || prop.assessment) {
            setAvmData(prop);
          }
        }
      })
      .catch(() => {})
      .finally(() => setAvmLoading(false));
  }, [activeSection, avmData, avmLoading, p]);

  // Fetch federal data when the Federal tab is selected
  useEffect(() => {
    if (activeSection !== "federal" || federalData || federalLoading) return;
    const zipCode = p.address?.postal1;
    if (!zipCode) return;

    setFederalLoading(true);
    const params = new URLSearchParams({
      endpoint: "supplement",
      zipCode,
      ...(p.address?.countrySubd ? { state: p.address.countrySubd } : {}),
      ...(p.identifier?.fips ? { stateFips: p.identifier.fips.substring(0, 2), countyFips: p.identifier.fips.substring(2, 5) } : {}),
      ...(p.address?.line1 ? { address: p.address.line1 } : {}),
      ...(p.address?.locality ? { city: p.address.locality } : {}),
    });

    fetch(`/api/integrations/federal-data/query?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success !== false) {
          setFederalData(data);
        }
      })
      .catch(() => {})
      .finally(() => setFederalLoading(false));
  }, [activeSection, federalData, federalLoading, p]);

  // Fetch Hawaii statewide parcel + owner data when Ownership or Financial tab is selected
  // Combines State ArcGIS (all counties) with Honolulu OWNALL (deed owners)
  useEffect(() => {
    if ((activeSection !== "ownership" && activeSection !== "financial") || hawaiiData || hawaiiLoading) return;

    const state = p.address?.countrySubd?.toUpperCase();
    const isHawaii = state === "HI" || state === "HAWAII";
    const tmk = p.identifier?.apn;

    if (!isHawaii || !tmk) return;

    setHawaiiLoading(true);

    const params = new URLSearchParams({ endpoint: "enriched", tmk });
    fetch(`/api/integrations/hawaii-parcels?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setHawaiiData(data);
        }
      })
      .catch(() => {})
      .finally(() => setHawaiiLoading(false));
  }, [activeSection, hawaiiData, hawaiiLoading, p]);

  // Fetch neighborhood profile (community data, schools) when Neighborhood tab is selected
  useEffect(() => {
    if (activeSection !== "neighborhood" || neighborhoodData || neighborhoodLoading) return;

    const addr1 = p.address?.line1;
    const city = p.address?.locality;
    const state = p.address?.countrySubd;
    const zip = p.address?.postal1;
    if (!addr1 && !zip) return;

    setNeighborhoodLoading(true);

    const params = new URLSearchParams({ endpoint: "neighborhood" });
    if (addr1) params.set("address1", addr1);
    if (city && state) params.set("address2", `${city}, ${state}`);
    else if (city) params.set("address2", city);
    if (zip) params.set("postalcode", zip);
    if (p.location?.latitude) params.set("latitude", p.location.latitude);
    if (p.location?.longitude) params.set("longitude", p.location.longitude);

    // Extract geoIdV4 from property data if available (ATTOM v4 embeds it in responses)
    const geoId = findGeoIdV4(p);
    if (geoId) params.set("geoidv4", geoId);

    console.log("[Neighborhood] Fetching with params:", Object.fromEntries(params));

    fetch(`/api/integrations/attom/property?${params}`)
      .then((r) => r.json())
      .then((data) => {
        console.log("[Neighborhood] Raw API response keys:", data ? Object.keys(data) : "null");
        if (data && !data.error) {
          setNeighborhoodData(data);
        } else {
          console.warn("[Neighborhood] API returned error:", data?.error);
        }
      })
      .catch((err) => console.warn("[Neighborhood] fetch failed:", err))
      .finally(() => setNeighborhoodLoading(false));
  }, [activeSection, neighborhoodData, neighborhoodLoading, p]);

  // Fetch enriched financial data (AVM history, rental AVM, sales history, mortgage detail, home equity)
  // when Financial tab is selected — makes parallel calls for each additional endpoint
  useEffect(() => {
    if (activeSection !== "financial" || enrichedFinancial || enrichedFinancialLoading) return;

    const attomId = p.identifier?.attomId;
    const addr1 = p.address?.line1;
    const addr2 = p.address?.locality && p.address?.countrySubd
      ? `${p.address.locality}, ${p.address.countrySubd}`
      : undefined;
    if (!attomId && !addr1) return;

    setEnrichedFinancialLoading(true);

    const buildParams = (endpoint: string) => {
      const params = new URLSearchParams({ endpoint });
      if (attomId) params.set("attomid", String(attomId));
      else {
        if (addr1) params.set("address1", addr1);
        if (addr2) params.set("address2", addr2);
      }
      return params;
    };

    // Also build sales trend params using geoIdV4 from property data
    const geoId = findGeoIdV4(p);
    const salesTrendParams = new URLSearchParams({ endpoint: "salestrend" });
    if (geoId) salesTrendParams.set("geoIdV4", geoId);
    else if (p.address?.postal1) salesTrendParams.set("postalcode", p.address.postal1);
    const currentYear = new Date().getFullYear();
    salesTrendParams.set("interval", "quarterly");
    salesTrendParams.set("startyear", String(currentYear - 3));
    salesTrendParams.set("endyear", String(currentYear));
    salesTrendParams.set("propertytype", "SINGLE FAMILY RESIDENCE");

    Promise.allSettled([
      fetch(`/api/integrations/attom/property?${buildParams("avmhistory")}`).then(r => r.json()),
      fetch(`/api/integrations/attom/property?${buildParams("rentalavm")}`).then(r => r.json()),
      fetch(`/api/integrations/attom/property?${buildParams("saleshistory")}`).then(r => r.json()),
      fetch(`/api/integrations/attom/property?${buildParams("detailmortgage")}`).then(r => r.json()),
      fetch(`/api/integrations/attom/property?${buildParams("homeequity")}`).then(r => r.json()),
      fetch(`/api/integrations/attom/property?${salesTrendParams}`).then(r => r.json()),
    ]).then(([avmHistory, rentalAvm, salesHistory, mortgageDetail, homeEquity, salesTrends]) => {
      setEnrichedFinancial({
        avmHistory: avmHistory.status === "fulfilled" && !avmHistory.value?.error ? avmHistory.value : null,
        rentalAvm: rentalAvm.status === "fulfilled" && !rentalAvm.value?.error ? rentalAvm.value : null,
        salesHistory: salesHistory.status === "fulfilled" && !salesHistory.value?.error ? salesHistory.value : null,
        mortgageDetail: mortgageDetail.status === "fulfilled" && !mortgageDetail.value?.error ? mortgageDetail.value : null,
        homeEquity: homeEquity.status === "fulfilled" && !homeEquity.value?.error ? homeEquity.value : null,
        salesTrends: salesTrends.status === "fulfilled" && !salesTrends.value?.error ? salesTrends.value : null,
      });
    }).finally(() => setEnrichedFinancialLoading(false));
  }, [activeSection, enrichedFinancial, enrichedFinancialLoading, p]);

  // Fetch enriched owner data (detail owner with mortgage owner info) when Ownership tab is selected
  useEffect(() => {
    if (activeSection !== "ownership" || enrichedOwner || enrichedOwnerLoading) return;

    const attomId = p.identifier?.attomId;
    const addr1 = p.address?.line1;
    const addr2 = p.address?.locality && p.address?.countrySubd
      ? `${p.address.locality}, ${p.address.countrySubd}`
      : undefined;
    if (!attomId && !addr1) return;

    setEnrichedOwnerLoading(true);

    const params = new URLSearchParams({ endpoint: "detailmortgageowner" });
    if (attomId) params.set("attomid", String(attomId));
    else {
      if (addr1) params.set("address1", addr1);
      if (addr2) params.set("address2", addr2);
    }

    fetch(`/api/integrations/attom/property?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          const prop = data.property?.[0] || data;
          setEnrichedOwner(prop);
        }
      })
      .catch(() => {})
      .finally(() => setEnrichedOwnerLoading(false));
  }, [activeSection, enrichedOwner, enrichedOwnerLoading, p]);

  const sections = [
    { id: "overview" as const, label: "Overview" },
    { id: "building" as const, label: "Building" },
    { id: "financial" as const, label: "Financial" },
    { id: "ownership" as const, label: "Ownership" },
    { id: "neighborhood" as const, label: "Neighborhood" },
    { id: "federal" as const, label: "Area Intel" },
  ];

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)",
        zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 16px", overflowY: "auto",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 720, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{addr}</h2>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                {[
                  beds != null ? `${beds} bed` : null,
                  baths != null ? `${baths} bath` : null,
                  sqft ? `${fmtNum(sqft)} sqft` : null,
                  yearBuilt ? `Built ${yearBuilt}` : null,
                ].filter(Boolean).join(" · ")}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af", lineHeight: 1, padding: 4 }}
            >
              ✕
            </button>
          </div>

          {/* Value Summary Cards */}
          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            {avmVal != null && (
              <div style={{ flex: 1, minWidth: 130, padding: "10px 14px", background: "#ecfdf5", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>AVM Value</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#059669" }}>{fmt(avmVal)}</div>
                {p.avm?.amount?.low != null && p.avm?.amount?.high != null && (
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Range: {fmt(p.avm.amount.low)} – {fmt(p.avm.amount.high)}</div>
                )}
                {p.avm?.amount?.scr != null && (
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Confidence: {p.avm.amount.scr}</div>
                )}
              </div>
            )}
            {lastSaleAmt != null && (
              <div style={{ flex: 1, minWidth: 130, padding: "10px 14px", background: "#eff6ff", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Last Sale</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#3b82f6" }}>{fmt(lastSaleAmt)}</div>
                {p.sale?.amount?.saleTransDate && (
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{p.sale.amount.saleTransDate}</div>
                )}
              </div>
            )}
            {equity != null && (
              <div style={{ flex: 1, minWidth: 130, padding: "10px 14px", background: equity > 0 ? "#fefce8" : "#fef2f2", borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: equity > 0 ? "#a16207" : "#dc2626", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Est. Equity
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: equity > 0 ? "#a16207" : "#dc2626" }}>
                  {equity > 0 ? "+" : ""}{fmt(equity)}
                </div>
              </div>
            )}
          </div>

          {/* Section Tabs */}
          <div style={{ display: "flex", gap: 0, marginTop: 16, borderBottom: "1px solid #e5e7eb" }}>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  padding: "8px 16px", fontSize: 13, fontWeight: 600, border: "none", background: "transparent", cursor: "pointer",
                  color: activeSection === s.id ? "#3b82f6" : "#6b7280",
                  borderBottom: activeSection === s.id ? "2px solid #3b82f6" : "2px solid transparent",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {activeSection === "overview" && (
            <>
              <Section title="Property Summary">
                <Field label="Property Type" value={p.summary?.propertyType || p.summary?.propType} />
                <Field label="Sub Type" value={p.summary?.propSubType} />
                <Field label="Land Use" value={p.summary?.propLandUse} />
                <Field label="Year Built" value={yearBuilt} />
                <Field label="APN" value={p.identifier?.apn} />
                <Field label="FIPS" value={p.identifier?.fips} />
                <Field label="Record ID" value={p.identifier?.attomId} />
                <Field label="Zoning" value={p.lot?.siteZoningIdent} />
                <Field label="Legal" value={p.summary?.legal1} />
              </Section>

              <Section title="Location">
                <Field label="Address" value={p.address?.oneLine} />
                <Field label="City" value={p.address?.locality} />
                <Field label="State" value={p.address?.countrySubd} />
                <Field label="Zip" value={p.address?.postal1} />
                <Field label="County" value={p.area?.munName || p.area?.countrySecSubd} />
                <Field label="Latitude" value={p.location?.latitude} />
                <Field label="Longitude" value={p.location?.longitude} />
              </Section>

              {/* GeoCode Identifiers (v4) — used to query community, school, POI, and sales trend data */}
              {(() => {
                const geoId = findGeoIdV4(p);
                const legacyGeoId = p.location?.geoid || p.area?.geoid;
                // Also look for area-level geocodes embedded in property responses
                const blockGeoId = p.area?.blockGeoIdV4;
                const blockGroupGeoId = p.area?.blockGroupGeoIdV4;
                const tractGeoId = p.area?.tractGeoIdV4;
                const countyGeoId = p.area?.countyGeoIdV4;
                const placeGeoId = p.area?.placeGeoIdV4;
                const cbsaGeoId = p.area?.cbsaGeoIdV4;
                // Additional geocodes from identifier or nested objects
                const schoolDistGeoId = p.area?.schoolDistrictGeoIdV4;
                const neighborhoodGeoId = p.area?.neighborhoodGeoIdV4;

                const hasAnyGeo = geoId || legacyGeoId || blockGeoId || tractGeoId || countyGeoId;
                if (!hasAnyGeo) return null;

                return (
                  <Section title="GeoCodes">
                    <Field label="GeoID v4" value={geoId} />
                    {legacyGeoId && <Field label="Legacy GeoID" value={legacyGeoId} />}
                    <Field label="Census Block" value={blockGeoId} />
                    <Field label="Block Group" value={blockGroupGeoId} />
                    <Field label="Census Tract" value={tractGeoId} />
                    <Field label="County" value={countyGeoId} />
                    <Field label="Place" value={placeGeoId} />
                    <Field label="CBSA" value={cbsaGeoId} />
                    <Field label="School District" value={schoolDistGeoId} />
                    <Field label="Neighborhood" value={neighborhoodGeoId} />
                  </Section>
                );
              })()}

              <Section title="Utilities">
                <Field label="Heating" value={p.utilities?.heatingType} />
                <Field label="Cooling" value={p.utilities?.coolingType} />
                <Field label="Sewer" value={p.utilities?.sewerType} />
                <Field label="Water" value={p.utilities?.waterType} />
                <Field label="Energy" value={p.utilities?.energyType} />
                <Field label="Heating Fuel" value={p.utilities?.heatingFuel} />
              </Section>

              {/* Hawaii Hazard & Environmental Zones */}
              {hazardLoading && (
                <div style={{ textAlign: "center", padding: 16, color: "#6b7280", fontSize: 13 }}>
                  Loading Hawaii environmental data...
                </div>
              )}

              {hazardData && (() => {
                const zones: Array<{ label: string; value: string; color: string; bg: string }> = [];

                if (hazardData.tsunami?.found) {
                  const a = hazardData.tsunami.attributes;
                  const zone = a.evaczone || a.zone || a.type || "Yes";
                  zones.push({ label: "Tsunami Evacuation Zone", value: String(zone), color: "#dc2626", bg: "#fef2f2" });
                }
                if (hazardData.seaLevelRise?.found) {
                  zones.push({ label: "Sea Level Rise Exposure", value: "In 3.2ft SLR coastal flood zone", color: "#0369a1", bg: "#e0f2fe" });
                }
                if (hazardData.lavaFlow?.found) {
                  const a = hazardData.lavaFlow.attributes;
                  const zone = a.hazard || a.zone || a.lavazone || "Yes";
                  zones.push({ label: "Lava Flow Hazard Zone", value: `Zone ${zone}`, color: "#ea580c", bg: "#fff7ed" });
                }
                if (hazardData.cesspoolPriority?.found) {
                  const a = hazardData.cesspoolPriority.attributes;
                  const score = a.priorityscore || a.priority || a.score;
                  zones.push({ label: "Cesspool Priority Area", value: score ? `Priority Score: ${score}` : "In cesspool priority area", color: "#92400e", bg: "#fef3c7" });
                }
                if (hazardData.dhhl?.found) {
                  zones.push({ label: "Hawaiian Home Lands (DHHL)", value: "Property is on DHHL land", color: "#7c3aed", bg: "#f5f3ff" });
                }
                if (hazardData.sma?.found) {
                  zones.push({ label: "Special Management Area (SMA)", value: "Coastal zone — SMA permits may be required", color: "#0891b2", bg: "#ecfeff" });
                }
                if (hazardData.stateLandUse?.found) {
                  const a = hazardData.stateLandUse.attributes;
                  const district = a.district || a.landuse || a.type || a.slu;
                  if (district) {
                    zones.push({ label: "State Land Use District", value: String(district), color: "#374151", bg: "#f3f4f6" });
                  }
                }

                if (zones.length === 0) return null;

                return (
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                      Hawaii Environmental & Hazard Zones
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {zones.map((z, i) => (
                        <div key={i} style={{ padding: "8px 12px", background: z.bg, borderRadius: 8, borderLeft: `4px solid ${z.color}` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: z.color, textTransform: "uppercase", letterSpacing: 0.5 }}>{z.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginTop: 2 }}>{z.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                      Source: State of Hawaii Statewide GIS Program. Data updated periodically. Verify with county for official determinations.
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {activeSection === "building" && (
            <>
              <Section title="Rooms &amp; Size">
                <Field label="Bedrooms" value={beds} />
                <Field label="Full Baths" value={p.building?.rooms?.bathsFull} />
                <Field label="Half Baths" value={p.building?.rooms?.bathsHalf} />
                <Field label="Total Rooms" value={p.building?.rooms?.roomsTotal} />
                <Field label="Living Area" value={sqft ? `${fmtNum(sqft)} sqft` : undefined} />
                <Field label="Gross Size" value={p.building?.size?.grossSize ? `${fmtNum(p.building.size.grossSize)} sqft` : undefined} />
                <Field label="Ground Floor" value={p.building?.size?.groundFloorSize ? `${fmtNum(p.building.size.groundFloorSize)} sqft` : undefined} />
                <Field label="Stories" value={p.building?.summary?.storyDesc || p.building?.summary?.levels} />
                <Field label="Units" value={p.building?.summary?.unitsCount} />
              </Section>

              <Section title="Construction">
                <Field label="Construction Type" value={p.building?.construction?.constructionType} />
                <Field label="Condition" value={p.building?.construction?.condition} />
                <Field label="Foundation" value={p.building?.construction?.foundationType} />
                <Field label="Frame" value={p.building?.construction?.frameType} />
                <Field label="Roof Cover" value={p.building?.construction?.roofCover} />
                <Field label="Roof Shape" value={p.building?.construction?.roofShape} />
                <Field label="Wall Type" value={p.building?.construction?.wallType} />
                <Field label="Quality" value={p.building?.summary?.quality} />
                <Field label="Arch Style" value={p.building?.summary?.archStyle} />
                <Field label="Building Type" value={p.building?.summary?.bldgType} />
              </Section>

              <Section title="Interior &amp; Extras">
                <Field label="Fireplace Count" value={p.building?.interior?.fplcCount} />
                <Field label="Fireplace Type" value={p.building?.interior?.fplcType} />
                <Field label="Basement Size" value={p.building?.interior?.bsmtSize ? `${fmtNum(p.building.interior.bsmtSize)} sqft` : undefined} />
                <Field label="Basement Type" value={p.building?.interior?.bsmtType} />
                <Field label="Garage Type" value={p.building?.parking?.garageType} />
                <Field label="Parking Size" value={p.building?.parking?.prkgSize ? `${fmtNum(p.building.parking.prkgSize)} sqft` : undefined} />
                <Field label="Parking Spaces" value={p.building?.parking?.prkgSpaces} />
                <Field label="View" value={p.building?.summary?.view} />
              </Section>

              <Section title="Lot">
                <Field label="Lot Size (sqft)" value={p.lot?.lotSize1 ? fmtNum(p.lot.lotSize1) : undefined} />
                <Field label="Lot Size (acres)" value={p.lot?.lotSize2 ? `${p.lot.lotSize2.toFixed(2)} acres` : undefined} />
                <Field label="Lot Number" value={p.lot?.lotNum} />
                <Field label="Pool" value={p.lot?.poolInd === "Y" ? (p.lot.poolType || "Yes") : p.lot?.poolInd === "N" ? "No" : undefined} />
              </Section>
            </>
          )}

          {activeSection === "financial" && (() => {
            // Use inline AVM data, or fall back to separately fetched AVM data
            const avm = p.avm || avmData?.avm;
            return (
            <>
              {avmLoading && !avm && (
                <div style={{ textAlign: "center", padding: 20, color: "#6b7280", fontSize: 13 }}>
                  Loading AVM valuation data...
                </div>
              )}

              {avm && (
                <Section title="Automated Valuation (AVM)">
                  <Field label="Estimated Value" value={fmt(avm.amount?.value)} />
                  <Field label="Low Estimate" value={fmt(avm.amount?.low)} />
                  <Field label="High Estimate" value={fmt(avm.amount?.high)} />
                  <Field label="Confidence Score" value={avm.amount?.scr} />
                  <Field label="Value Range" value={fmt(avm.amount?.valueRange)} />
                  <Field label="Valuation Date" value={avm.eventDate} />
                </Section>
              )}

              {!avmLoading && !avm && (
                <div style={{ padding: "12px 16px", background: "#f9fafb", borderRadius: 8, fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                  AVM data not available for this property.
                </div>
              )}

              {p.assessment && (
                <Section title="Tax Assessment">
                  <Field label="Assessed Total" value={fmt(p.assessment.assessed?.assdTtlValue)} />
                  <Field label="Assessed Land" value={fmt(p.assessment.assessed?.assdLandValue)} />
                  <Field label="Assessed Improvements" value={fmt(p.assessment.assessed?.assdImprValue)} />
                  <Field label="Appraised Total" value={fmt(p.assessment.appraised?.apprTtlValue)} />
                  <Field label="Market Total" value={fmt(p.assessment.market?.mktTtlValue)} />
                  <Field label="Annual Tax" value={fmt(p.assessment.tax?.taxAmt)} />
                  <Field label="Tax Year" value={p.assessment.tax?.taxYear} />
                  <Field label="Tax / Sqft" value={p.assessment.tax?.taxPerSizeUnit ? `$${p.assessment.tax.taxPerSizeUnit.toFixed(2)}` : undefined} />
                </Section>
              )}

              {p.sale && (
                <Section title="Last Sale">
                  <Field label="Sale Amount" value={fmt(lastSaleAmt)} />
                  <Field label="Sale Date" value={p.sale.amount?.saleTransDate} />
                  <Field label="Recording Date" value={p.sale.amount?.saleRecDate} />
                  <Field label="Document Type" value={p.sale.amount?.saleDocType} />
                  <Field label="Sale Code" value={p.sale.amount?.saleCode} />
                  <Field label="Price / Bed" value={fmt(p.sale.amount?.pricePerBed)} />
                  <Field label="Price / Sqft" value={p.sale.amount?.pricePerSizeUnit ? `$${p.sale.amount.pricePerSizeUnit.toFixed(2)}` : undefined} />
                </Section>
              )}

              {p.mortgage && (
                <Section title="Mortgage">
                  <Field label="Loan Amount" value={fmt(p.mortgage.amount)} />
                  <Field label="Lender" value={p.mortgage.lender?.fullName} />
                  <Field label="Loan Type" value={p.mortgage.loanType} />
                  <Field label="Term" value={p.mortgage.term} />
                  <Field label="Rate Type" value={p.mortgage.interestRateType} />
                  <Field label="Origination Date" value={p.mortgage.date} />
                  <Field label="Due Date" value={p.mortgage.dueDate} />
                </Section>
              )}

              {p.foreclosure?.actionType && (
                <Section title="Foreclosure">
                  <Field label="Action Type" value={p.foreclosure.actionType} />
                  <Field label="Filing Date" value={p.foreclosure.filingDate} />
                  <Field label="Auction Date" value={p.foreclosure.auctionDate} />
                  <Field label="Auction Location" value={p.foreclosure.auctionLocation} />
                  <Field label="Default Amount" value={fmt(p.foreclosure.defaultAmount)} />
                  <Field label="Starting Bid" value={fmt(p.foreclosure.startingBid)} />
                  <Field label="Original Loan" value={fmt(p.foreclosure.originalLoanAmount)} />
                  <Field label="Trustee" value={p.foreclosure.trusteeFullName} />
                </Section>
              )}

              {/* Hawaii county-level tax assessment (from Honolulu CCHNL ArcGIS) */}
              {hawaiiLoading && !hawaiiData && (
                <div style={{ textAlign: "center", padding: 20, color: "#6b7280", fontSize: 13 }}>
                  Loading Hawaii tax records...
                </div>
              )}

              {hawaiiData?.honoluluParcel && (
                <>
                  <Section title="Honolulu County Tax Assessment">
                    <Field label="Land Value" value={hawaiiData.honoluluParcel.landvalue != null ? `$${Number(hawaiiData.honoluluParcel.landvalue).toLocaleString()}` : undefined} />
                    <Field label="Building Value" value={hawaiiData.honoluluParcel.bldgvalue != null ? `$${Number(hawaiiData.honoluluParcel.bldgvalue).toLocaleString()}` : undefined} />
                    <Field label="Total Value" value={hawaiiData.honoluluParcel.totalvalue != null ? `$${Number(hawaiiData.honoluluParcel.totalvalue).toLocaleString()}` : undefined} />
                    <Field label="Exemption" value={hawaiiData.honoluluParcel.exemption != null ? `$${Number(hawaiiData.honoluluParcel.exemption).toLocaleString()}` : undefined} />
                    <Field label="Taxable Value" value={hawaiiData.honoluluParcel.taxable != null ? `$${Number(hawaiiData.honoluluParcel.taxable).toLocaleString()}` : undefined} />
                    <Field label="Tax Amount" value={hawaiiData.honoluluParcel.taxamount != null ? `$${Number(hawaiiData.honoluluParcel.taxamount).toLocaleString()}` : undefined} />
                    <Field label="Tax Year" value={hawaiiData.honoluluParcel.taxyear} />
                  </Section>

                  <Section title="Honolulu Parcel Details">
                    <Field label="Parcel Type" value={hawaiiData.honoluluParcel.type} />
                    <Field label="Zoning" value={hawaiiData.honoluluParcel.zoning} />
                    <Field label="Land Area" value={hawaiiData.honoluluParcel.landarea != null ? `${Number(hawaiiData.honoluluParcel.landarea).toLocaleString()} sqft` : undefined} />
                    <Field label="Land Area (sf)" value={hawaiiData.honoluluParcel.landareasf != null ? `${Number(hawaiiData.honoluluParcel.landareasf).toLocaleString()} sqft` : undefined} />
                  </Section>
                </>
              )}

              {/* ── Enriched Financial Data (loaded on tab open) ── */}
              {enrichedFinancialLoading && (
                <div style={{ textAlign: "center", padding: 20, color: "#6b7280", fontSize: 13 }}>
                  Loading additional financial data...
                </div>
              )}

              {/* Rental AVM — rental value estimate */}
              {enrichedFinancial?.rentalAvm && (() => {
                const resp = enrichedFinancial.rentalAvm;
                const prop = resp.property?.[0] || resp;
                // ATTOM returns rental data under various paths depending on endpoint version
                const rental = prop?.rentalAVM || prop?.rentalAvm || prop?.rentalavm || prop?.avm;
                if (!rental) return null;
                // The amount object may be nested under .amount, .rentalAmount, or directly on the rental object
                const rentAmt = rental.rentalAmount || rental.amount || rental;
                if (rentAmt.value == null && rentAmt.low == null && rentAmt.high == null) return null;
                const eventDate = rental.eventDate || rental.calculatedDate;
                return (
                  <div style={{ marginBottom: 20, padding: "14px 18px", background: "#fef3c7", borderRadius: 10, border: "1px solid #fcd34d" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#a16207", textTransform: "uppercase", letterSpacing: 0.5 }}>Rental Value Estimate (Rental AVM)</div>
                    <div style={{ display: "flex", gap: 20, marginTop: 6, flexWrap: "wrap" }}>
                      {rentAmt.value != null && (
                        <div>
                          <div style={{ fontSize: 22, fontWeight: 700, color: "#92400e" }}>${Number(rentAmt.value).toLocaleString()}<span style={{ fontSize: 13, fontWeight: 500 }}>/mo</span></div>
                        </div>
                      )}
                      {(rentAmt.low != null || rentAmt.high != null) && (
                        <div style={{ fontSize: 13, color: "#92400e", alignSelf: "flex-end" }}>
                          Range: {rentAmt.low != null ? `$${Number(rentAmt.low).toLocaleString()}` : "?"} – {rentAmt.high != null ? `$${Number(rentAmt.high).toLocaleString()}` : "?"}
                        </div>
                      )}
                      {rentAmt.scr != null && (
                        <div style={{ fontSize: 12, color: "#92400e", alignSelf: "flex-end" }}>
                          Confidence: {rentAmt.scr}
                        </div>
                      )}
                    </div>
                    {eventDate && <div style={{ fontSize: 11, color: "#a16207", marginTop: 4 }}>As of {eventDate}</div>}
                  </div>
                );
              })()}

              {/* Mortgage Detail — enriched from detailmortgage endpoint */}
              {enrichedFinancial?.mortgageDetail && (() => {
                const resp = enrichedFinancial.mortgageDetail;
                const prop = resp.property?.[0] || resp;
                // ATTOM can return multiple mortgages (first, second, equity line)
                const mortgageRoot = prop?.mortgage;
                const m1 = mortgageRoot?.firstConcurrent || mortgageRoot;
                const m2 = mortgageRoot?.secondConcurrent;
                const m3 = mortgageRoot?.thirdConcurrent || mortgageRoot?.equityLine;
                // Borrower info may be at mortgage root level
                const borrower1 = mortgageRoot?.borrower1 || m1?.borrower1;
                const borrower2 = mortgageRoot?.borrower2 || m1?.borrower2;
                if (!m1 && !m2) return null;

                const renderMortgage = (m: any, title: string) => {
                  if (!m) return null;
                  const amt = m.amount ?? m.loanAmount ?? m.loanAmt;
                  const hasData = amt != null || m.lender?.fullName || m.companyName || m.loanType;
                  if (!hasData) return null;
                  return (
                    <Section title={title}>
                      <Field label="Loan Amount" value={amt != null ? fmt(Number(amt)) : undefined} />
                      <Field label="Lender" value={m.lender?.fullName || m.companyName || m.lenderName} />
                      <Field label="Loan Type" value={m.loanType || m.loanTypeCode} />
                      <Field label="Interest Rate" value={m.interestRate != null ? `${m.interestRate}%` : undefined} />
                      <Field label="Rate Type" value={m.interestRateType} />
                      <Field label="Term" value={m.term} />
                      <Field label="Due Date" value={m.dueDate} />
                      <Field label="Origination Date" value={m.date || m.recordingDate} />
                      <Field label="Document Number" value={m.documentNumber || m.docNumber} />
                      <Field label="Deed Type" value={m.deedType} />
                      <Field label="Title Company" value={m.titleCompanyName || m.titleCompany} />
                    </Section>
                  );
                };

                return (
                  <>
                    {renderMortgage(m1, "First Mortgage (Detailed)")}
                    {renderMortgage(m2, "Second Mortgage / Equity Line")}
                    {renderMortgage(m3, "Third Mortgage / Equity Line")}
                    {(borrower1?.fullName || borrower2?.fullName) && (
                      <Section title="Mortgage Borrower">
                        <Field label="Borrower 1" value={borrower1?.fullName || [borrower1?.firstNameAndMi, borrower1?.lastName].filter(Boolean).join(" ")} />
                        <Field label="Borrower 2" value={borrower2?.fullName || [borrower2?.firstNameAndMi, borrower2?.lastName].filter(Boolean).join(" ")} />
                        <Field label="Vesting" value={mortgageRoot?.borrowerVesting} />
                      </Section>
                    )}
                  </>
                );
              })()}

              {/* AVM History — value trend over time */}
              {enrichedFinancial?.avmHistory && (() => {
                const props = enrichedFinancial.avmHistory.property || [];
                // Each property entry may have an avm with eventDate
                const history = props
                  .map((pp: any) => ({
                    date: pp.avm?.eventDate || pp.avm?.calculatedDate,
                    value: pp.avm?.amount?.value,
                    low: pp.avm?.amount?.low,
                    high: pp.avm?.amount?.high,
                    scr: pp.avm?.amount?.scr,
                  }))
                  .filter((h: any) => h.value != null)
                  .sort((a: any, b: any) => (a.date || "").localeCompare(b.date || ""));

                if (history.length === 0) return null;

                // Compute overall value change
                const firstVal = history[0].value;
                const lastVal = history[history.length - 1].value;
                const change = firstVal && lastVal ? ((lastVal - firstVal) / firstVal * 100) : null;

                return (
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 4, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                      AVM Value History
                    </h3>
                    {change != null && (
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, color: change >= 0 ? "#059669" : "#dc2626" }}>
                          {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                        </span> change over {history.length} data points
                      </div>
                    )}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Date</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Value</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Range</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((h: any, i: number) => (
                            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                              <td style={{ padding: "6px 8px", fontWeight: 500 }}>{h.date || "—"}</td>
                              <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{fmt(h.value)}</td>
                              <td style={{ padding: "6px 8px", textAlign: "right", fontSize: 11, color: "#6b7280" }}>
                                {h.low != null && h.high != null ? `${fmt(h.low)} – ${fmt(h.high)}` : "—"}
                              </td>
                              <td style={{ padding: "6px 8px", textAlign: "right" }}>{h.scr ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Sales History — all past transactions for this property */}
              {enrichedFinancial?.salesHistory && (() => {
                const props = enrichedFinancial.salesHistory.property || [];
                // Each property may have nested sale data
                const sales = props
                  .map((pp: any) => ({
                    date: pp.sale?.amount?.saleTransDate || pp.sale?.amount?.saleRecDate,
                    amount: pp.sale?.amount?.saleAmt || pp.sale?.amount?.salePrice,
                    docType: pp.sale?.amount?.saleDocType,
                    code: pp.sale?.amount?.saleCode,
                    buyer: pp.sale?.amount?.buyerName || pp.sale?.buyer?.fullName,
                    seller: pp.sale?.amount?.sellerName || pp.sale?.seller?.fullName,
                    pricePerSqft: pp.sale?.amount?.pricePerSizeUnit,
                  }))
                  .filter((s: any) => s.date || s.amount)
                  .sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""));

                if (sales.length === 0) return null;

                return (
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                      Sales History ({sales.length} transaction{sales.length !== 1 ? "s" : ""})
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {sales.map((s: any, i: number) => (
                        <div key={i} style={{ padding: "10px 14px", background: i === 0 ? "#eff6ff" : "#f9fafb", borderRadius: 8, borderLeft: i === 0 ? "4px solid #3b82f6" : "none" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                                {s.amount != null ? fmt(s.amount) : "Price Not Disclosed"}
                              </div>
                              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>
                                {[s.date, s.docType, s.code].filter(Boolean).join(" · ")}
                              </div>
                            </div>
                            {s.pricePerSqft != null && (
                              <div style={{ fontSize: 12, color: "#6b7280" }}>${Number(s.pricePerSqft).toFixed(0)}/sqft</div>
                            )}
                          </div>
                          {(s.buyer || s.seller) && (
                            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                              {s.seller && <span>Seller: {s.seller}</span>}
                              {s.seller && s.buyer && <span> → </span>}
                              {s.buyer && <span>Buyer: {s.buyer}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Home Equity — estimated equity position */}
              {enrichedFinancial?.homeEquity && (() => {
                const resp = enrichedFinancial.homeEquity;
                const prop = resp.property?.[0] || resp;
                const he = prop?.homeEquity || prop?.valuation || prop;
                const avmValue = he?.avmValue ?? he?.avm?.amount?.value ?? he?.estimatedValue;
                const loanBalance = he?.outstandingBalance ?? he?.loanBalance ?? he?.mortgageBalance ?? he?.estimatedBalance;
                const equityAmount = he?.equity ?? he?.equityAmount ?? (avmValue != null && loanBalance != null ? avmValue - loanBalance : null);
                const ltv = he?.loanToValue ?? he?.ltv ?? (avmValue && loanBalance ? (loanBalance / avmValue * 100) : null);

                if (avmValue == null && loanBalance == null && equityAmount == null) return null;

                const isPositive = equityAmount != null ? equityAmount >= 0 : true;

                return (
                  <div style={{ marginBottom: 20, padding: "14px 18px", background: isPositive ? "#ecfdf5" : "#fef2f2", borderRadius: 10, border: `1px solid ${isPositive ? "#a7f3d0" : "#fecaca"}` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: isPositive ? "#059669" : "#dc2626", textTransform: "uppercase", letterSpacing: 0.5 }}>Home Equity Analysis</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 8 }}>
                      {avmValue != null && (
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Estimated Value</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{fmt(avmValue)}</div>
                        </div>
                      )}
                      {loanBalance != null && (
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Est. Loan Balance</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{fmt(loanBalance)}</div>
                        </div>
                      )}
                      {equityAmount != null && (
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Est. Equity</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: isPositive ? "#059669" : "#dc2626" }}>
                            {equityAmount >= 0 ? "+" : ""}{fmt(equityAmount)}
                          </div>
                        </div>
                      )}
                      {ltv != null && (
                        <div>
                          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>Loan-to-Value</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: ltv > 80 ? "#dc2626" : "#059669" }}>
                            {Number(ltv).toFixed(1)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Market Sales Trends — from v4 transaction/salestrends */}
              {enrichedFinancial?.salesTrends && (() => {
                const resp = enrichedFinancial.salesTrends;
                const trendsList: any[] = resp.salesTrends || resp.salestrend || [];
                if (trendsList.length === 0) return null;

                const areaName = trendsList[0]?.location?.geographyName;
                const recent = trendsList.slice(-12);
                const firstMed = recent[0]?.salesTrend?.medSalePrice;
                const lastMed = recent[recent.length - 1]?.salesTrend?.medSalePrice;
                const priceChange = (firstMed && lastMed) ? ((lastMed - firstMed) / firstMed * 100) : null;

                return (
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 4, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                      Area Market Trends
                    </h3>
                    {areaName && (
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                        Area: {areaName}
                        {priceChange != null && (
                          <span style={{ marginLeft: 12, fontWeight: 600, color: priceChange >= 0 ? "#059669" : "#dc2626" }}>
                            {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(1)}% median price change
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                            <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Period</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Median Price</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Avg Price</th>
                            <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Sales</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recent.map((t: any, i: number) => {
                            const period = t.dateRange?.start || t.dateRange?.interval || "";
                            const st = t.salesTrend || t;
                            return (
                              <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                                <td style={{ padding: "6px 8px", fontWeight: 500 }}>{period}</td>
                                <td style={{ padding: "6px 8px", textAlign: "right" }}>{st.medSalePrice != null ? `$${Number(st.medSalePrice).toLocaleString()}` : "—"}</td>
                                <td style={{ padding: "6px 8px", textAlign: "right" }}>{st.avgSalePrice != null ? `$${Number(st.avgSalePrice).toLocaleString()}` : "—"}</td>
                                <td style={{ padding: "6px 8px", textAlign: "right" }}>{st.homeSaleCount ?? "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {trendsList[0]?.vintage?.pubDate && (
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                        Data published: {trendsList[0].vintage.pubDate}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
            );
          })()}

          {activeSection === "ownership" && (() => {
            // Resolve TMK: prefer Hawaii statewide parcel data (12-digit QPublic-compatible format)
            // over ATTOM APN (which uses a different format with island prefix, no CPR suffix)
            const tmkValue = hawaiiData?.parcel?.tmk_txt || hawaiiData?.parcel?.tmk || hawaiiData?.parcel?.cty_tmk || (hawaiiData?.owners?.[0]?.tmk) || null;
            // ATTOM APN as fallback display — different format, not QPublic-compatible
            const attomApn = p.identifier?.apn || null;

            // Build QPublic direct report link from TMK + county-specific AppID
            // Falls back to converting ATTOM APN if Hawaii statewide data is unavailable
            const qpubLink = (() => {
              if (hawaiiData?.parcel?.qpub_link) return hawaiiData.parcel.qpub_link;

              const keySource = tmkValue ? String(tmkValue) : attomApn;
              if (!keySource) return null;

              return buildQPublicUrl(
                keySource,
                hawaiiData?.parcel?.county,
                p.address?.postal1,
              );
            })();
            // Display TMK: prefer Hawaii source, fall back to converted ATTOM APN
            const displayTmk = tmkValue || (attomApn ? attomApn.replace(/[-\s.]/g, "").slice(1).padEnd(12, "0") : null);

            return (
            <>
              {/* TMK & QPublic Quick Access — always visible when TMK is known */}
              {(displayTmk || attomApn) && (
                <div style={{ marginBottom: 20, padding: "14px 18px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bfdbfe" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#3b82f6", textTransform: "uppercase", letterSpacing: 0.5 }}>TMK (Tax Map Key)</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#1e40af", fontFamily: "monospace", marginTop: 2 }}>{displayTmk || attomApn}</div>
                    </div>
                    {qpubLink && (
                      <a
                        href={qpubLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "8px 16px", background: "#3b82f6", color: "#fff",
                          borderRadius: 8, fontSize: 13, fontWeight: 600,
                          textDecoration: "none", whiteSpace: "nowrap",
                        }}
                      >
                        View on QPublic
                        <span style={{ fontSize: 11 }}>&#8599;</span>
                      </a>
                    )}
                  </div>
                  {qpubLink && (
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                      Opens the county tax records page with full owner details, tax history, and assessment data.
                    </div>
                  )}
                  {!qpubLink && hawaiiLoading && (
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                      Loading Hawaii public records...
                    </div>
                  )}
                </div>
              )}

              <Section title="Current Owner">
                <Field label="Owner 1" value={p.owner?.owner1?.fullName} />
                <Field label="Owner 2" value={p.owner?.owner2?.fullName} />
                <Field label="Owner 3" value={p.owner?.owner3?.fullName} />
                <Field label="Owner 4" value={p.owner?.owner4?.fullName} />
                <Field label="Corporate" value={p.owner?.corporateIndicator === "Y" ? "Yes" : p.owner?.corporateIndicator === "N" ? "No" : undefined} />
                <Field label="Relationship" value={p.owner?.ownerRelationshipType} />
                <Field label="Rights" value={p.owner?.ownerRelationshipRights} />
                {qpubLink && (
                  <div style={{ marginTop: 10 }}>
                    <a
                      href={qpubLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "6px 14px", background: "#1e40af", color: "#fff",
                        borderRadius: 6, fontSize: 12, fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      View TMK Ownership Records
                      <span style={{ fontSize: 11 }}>&#8599;</span>
                    </a>
                  </div>
                )}
              </Section>

              {/* Enriched owner data from detailmortgageowner endpoint */}
              {enrichedOwnerLoading && (
                <div style={{ textAlign: "center", padding: 12, color: "#6b7280", fontSize: 13 }}>
                  Loading detailed ownership records...
                </div>
              )}

              {enrichedOwner && (() => {
                // The detailmortgageowner response wraps data in { property: [{ owner, mortgage, ... }] }
                // or the prop-level fields may already be extracted
                const ownerProp = enrichedOwner.property?.[0] || enrichedOwner;
                const eo = ownerProp?.owner || enrichedOwner.owner || enrichedOwner;
                const anyOwner = eo?.owner1?.fullName || eo?.owner1?.lastName || eo?.owner2?.fullName
                  || eo?.mailingAddressOneLine || eo?.absenteeOwnerStatus || eo?.corporateIndicator;
                if (!anyOwner) return null;
                return (
                  <Section title="Detailed Owner Information">
                    {[1, 2, 3, 4].map((n) => {
                      const o = eo?.[`owner${n}`];
                      if (!o?.fullName && !o?.lastName) return null;
                      return (
                        <div key={n} style={{ gridColumn: "1 / -1" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>
                            Owner {n}: {o.fullName || [o.firstNameAndMi, o.lastName].filter(Boolean).join(" ")}
                          </div>
                        </div>
                      );
                    })}
                    <Field label="Corporate Owner" value={eo?.corporateIndicator === "Y" ? "Yes" : eo?.corporateIndicator === "N" ? "No" : undefined} />
                    <Field label="Relationship Type" value={eo?.ownerRelationshipType} />
                    <Field label="Rights" value={eo?.ownerRelationshipRights} />
                    <Field label="Mailing Address" value={eo?.mailingAddressOneLine} />
                    <Field label="Owner Occupied" value={eo?.ownerOccupied === "Y" ? "Yes" : eo?.ownerOccupied === "N" ? "No" : undefined} />
                    <Field label="Absentee Status" value={eo?.absenteeOwnerStatus} />
                  </Section>
                );
              })()}

              {/* Mortgage lender info from enriched owner (detailmortgageowner) */}
              {enrichedOwner && (() => {
                // Handle both property[0].mortgage and direct .mortgage paths
                const ownerProp = enrichedOwner.property?.[0] || enrichedOwner;
                const m = ownerProp?.mortgage || enrichedOwner?.mortgage;
                if (!m) return null;
                const m1 = m.firstConcurrent || m;
                const m2 = m.secondConcurrent;
                const hasData = m1?.lender?.fullName || m1?.companyName || m1?.lenderName || m1?.amount || m2;
                if (!hasData) return null;

                return (
                  <>
                    {m1 && (m1.lender?.fullName || m1.companyName || m1.lenderName || m1.amount) && (
                      <Section title="Current Mortgage Holder">
                        <Field label="Lender" value={m1.lender?.fullName || m1.companyName || m1.lenderName} />
                        <Field label="Loan Amount" value={m1.amount != null ? fmt(Number(m1.amount)) : undefined} />
                        <Field label="Loan Type" value={m1.loanType || m1.loanTypeCode} />
                        <Field label="Interest Rate" value={m1.interestRate != null ? `${m1.interestRate}%` : undefined} />
                        <Field label="Rate Type" value={m1.interestRateType} />
                        <Field label="Term" value={m1.term} />
                        <Field label="Origination" value={m1.date || m1.recordingDate} />
                        <Field label="Due Date" value={m1.dueDate} />
                        <Field label="Document Number" value={m1.documentNumber || m1.docNumber} />
                      </Section>
                    )}
                    {m2 && (m2.lender?.fullName || m2.companyName || m2.lenderName || m2.amount) && (
                      <Section title="Second Mortgage / Equity Line">
                        <Field label="Lender" value={m2.lender?.fullName || m2.companyName || m2.lenderName} />
                        <Field label="Loan Amount" value={m2.amount != null ? fmt(Number(m2.amount)) : undefined} />
                        <Field label="Loan Type" value={m2.loanType || m2.loanTypeCode} />
                        <Field label="Interest Rate" value={m2.interestRate != null ? `${m2.interestRate}%` : undefined} />
                        <Field label="Origination" value={m2.date || m2.recordingDate} />
                      </Section>
                    )}
                  </>
                );
              })()}

              <Section title="Occupancy">
                <Field label="Owner Occupied" value={(() => {
                  const val = (p.owner?.ownerOccupied || "").toUpperCase();
                  if (val === "Y" || val === "1" || val === "YES" || val === "TRUE") return "Yes";
                  if (val === "N" || val === "0" || val === "NO" || val === "FALSE") return "No";
                  return p.owner?.ownerOccupied || undefined;
                })()} />
                <Field label="Absentee Status" value={(() => {
                  // Check owner.absenteeOwnerStatus first (human-readable from ATTOM)
                  const ownerStatus = (p.owner?.absenteeOwnerStatus || "").toUpperCase();
                  if (ownerStatus.includes("ABSENTEE")) return "Absentee Owner";
                  if (ownerStatus.includes("OWNER") && ownerStatus.includes("OCC")) return "Owner Occupied";
                  if (ownerStatus === "A") return "Absentee Owner";
                  if (ownerStatus === "O" || ownerStatus === "S") return "Owner Occupied";

                  // Check summary.absenteeInd — ATTOM uses: "A"/"ABSENTEE" = absentee, "O"/"OWNER OCCUPIED" = occupied
                  const ind = (p.summary?.absenteeInd || "").toUpperCase();
                  if (ind.includes("ABSENTEE") || ind === "A") return "Absentee Owner";
                  if (ind === "O" || ind === "S" || ind.includes("OWNER OCC")) return "Owner Occupied";

                  // Derive from ownerOccupied flag (case-insensitive to match isAbsenteeOwner logic)
                  const occupied = (p.owner?.ownerOccupied || "").toUpperCase();
                  if (occupied === "N" || occupied === "0" || occupied === "NO" || occupied === "FALSE") return "Absentee Owner";
                  if (occupied === "Y" || occupied === "1" || occupied === "YES" || occupied === "TRUE") return "Owner Occupied";

                  // Fallback to search context (e.g. when prospecting for absentee owners)
                  if (searchContext?.absenteeowner === "absentee") return "Absentee Owner";
                  if (searchContext?.absenteeowner === "occupied") return "Owner Occupied";

                  return undefined;
                })()} />
                <Field label="Mailing Address" value={p.owner?.mailingAddressOneLine} />
              </Section>

              {/* Hawaii State Data — deed owners from Honolulu OWNALL + statewide parcel */}
              {hawaiiLoading && (
                <div style={{ textAlign: "center", padding: 20, color: "#6b7280", fontSize: 13 }}>
                  Loading Hawaii public records...
                </div>
              )}

              {hawaiiData?.owners?.length > 0 && (
                <Section title="Deed Owners (Hawaii Public Records)">
                  {hawaiiData.owners.map((owner: any, i: number) => (
                    <Field
                      key={i}
                      label={`Owner ${owner.ownseq || i + 1}${owner.owntype ? ` (${owner.owntype})` : ""}`}
                      value={owner.owner}
                    />
                  ))}
                </Section>
              )}

              {hawaiiData?.parcel && (
                <Section title="State Parcel Record">
                  <Field label="TMK" value={hawaiiData.parcel.tmk_txt || hawaiiData.parcel.tmk} />
                  <Field label="County" value={hawaiiData.parcel.county} />
                  <Field label="Island" value={hawaiiData.parcel.island} />
                  <Field label="Zone" value={hawaiiData.parcel.zone} />
                  <Field label="Section" value={hawaiiData.parcel.section} />
                  <Field label="Plat" value={hawaiiData.parcel.plat} />
                  <Field label="Parcel" value={hawaiiData.parcel.parcel} />
                  <Field label="GIS Acres" value={hawaiiData.parcel.gisacres != null ? `${Number(hawaiiData.parcel.gisacres).toFixed(2)} acres` : undefined} />
                </Section>
              )}

              {hawaiiData && (
                <div style={{ marginTop: 8, padding: 10, background: "#f0f9ff", borderRadius: 8, fontSize: 11, color: "#6b7280" }}>
                  Source: State of Hawaii Statewide GIS Program &amp; City &amp; County of Honolulu OWNALL.
                  Public data updated periodically. Parcel boundaries are for visual reference only.
                </div>
              )}
            </>
            );
          })()}

          {activeSection === "neighborhood" && (
            <>
              {neighborhoodLoading && (
                <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                  Loading neighborhood data...
                </div>
              )}

              {!neighborhoodLoading && !neighborhoodData && (
                <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                  Neighborhood data not available. Connect the property data integration to access community intelligence.
                </div>
              )}

              {neighborhoodData && (() => {
                // ── Extract v4 community data ──
                // v4 response: { community: { geography: {...}, demographics: {...}, crime: {...}, climate: {...}, airQuality: {...}, naturalDisasters: {...} } }
                const communityRaw = neighborhoodData.community;
                const communityObj = communityRaw?.community || communityRaw?.response?.result?.community;
                const geo = communityObj?.geography;
                const demo = communityObj?.demographics;
                const crime = communityObj?.crime;
                const climate = communityObj?.climate;
                const airQuality = communityObj?.airQuality;
                const naturalDisasters = communityObj?.naturalDisasters;
                const hasCommunity = !!(demo || crime || climate);

                // Helper: get a field by exact v4 snake_Case_Name from demographics
                const d = (key: string) => demo?.[key];
                const pct = (key: string) => { const v = d(key); return v != null ? `${v}%` : undefined; };

                // Extract school data — v4 returns { school: [...] } or v1 format
                const schoolsRaw = neighborhoodData.schools;
                const schools = schoolsRaw?.school
                  || schoolsRaw?.response?.result?.package?.item
                  || schoolsRaw?.result?.package?.item
                  || schoolsRaw?.property?.[0]?.school
                  || (Array.isArray(schoolsRaw) ? schoolsRaw : []);
                const schoolList = Array.isArray(schools) ? schools : schools ? [schools] : [];

                // Extract school district data (if embedded in the response)
                const districtRaw = schoolsRaw?.district || null;

                // Extract POI data — v4 returns { poi: [...] }
                const poiRaw = neighborhoodData.poi;
                const poiItems = poiRaw?.poi
                  || poiRaw?.response?.result?.package?.item
                  || poiRaw?.result?.package?.item
                  || poiRaw?.package?.item
                  || poiRaw?.item
                  || (Array.isArray(poiRaw) ? poiRaw : []);
                const poiList = Array.isArray(poiItems) ? poiItems : poiItems ? [poiItems] : [];

                // Extract sales trends
                const trendsRaw = neighborhoodData.salesTrends;
                const trendsList: any[] = trendsRaw?.salesTrends || trendsRaw?.salestrend || [];

                if (!hasCommunity && schoolList.length === 0 && poiList.length === 0 && trendsList.length === 0) {
                  return (
                    <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                      No neighborhood data found for this property. This may occur if the area is not covered by the community data provider.
                    </div>
                  );
                }

                // Index color helper for 100-base indexes
                const idxColor = (v: number) => v >= 150 ? "#dc2626" : v >= 120 ? "#d97706" : v >= 80 ? "#059669" : "#3b82f6";
                const idxLabel = (v: number) => v >= 150 ? "High" : v >= 120 ? "Above Avg" : v >= 80 ? "Average" : "Below Avg";

                return (
                  <>
                    {/* Geography Name */}
                    {geo?.geographyName && (
                      <div style={{ marginBottom: 16, padding: "10px 14px", background: "#f0f9ff", borderRadius: 8, borderLeft: "4px solid #3b82f6" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e40af" }}>{geo.geographyName}</div>
                        {geo.geographyTypeName && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{geo.geographyTypeName}</div>}
                      </div>
                    )}

                    {/* Demographics Overview */}
                    {demo && (
                      <Section title="Demographics">
                        <Field label="Population" value={d("population") != null ? Number(d("population")).toLocaleString() : undefined} />
                        <Field label="5-Yr Projection" value={d("population_5_Yr_Projection") != null ? Number(d("population_5_Yr_Projection")).toLocaleString() : undefined} />
                        <Field label="Pop Density" value={d("population_Density_Sq_Mi") != null ? `${Number(d("population_Density_Sq_Mi")).toLocaleString()}/sqmi` : undefined} />
                        <Field label="Pop Growth (10yr)" value={pct("population_Chg_Pct_2010")} />
                        <Field label="Median Age" value={d("median_Age")} />
                        <Field label="Households" value={d("households") != null ? Number(d("households")).toLocaleString() : undefined} />
                        <Field label="Avg Household Size" value={d("household_Size_Avg")} />
                        <Field label="Family Households" value={pct("households_Family_Pct")} />
                        <Field label="Owner Occupied" value={pct("housing_Units_Owner_Occupied_Pct")} />
                        <Field label="Renter Occupied" value={pct("housing_Units_Renter_Occupied_Pct")} />
                        <Field label="Vacant Units" value={pct("housing_Units_Vacant_Pct")} />
                        <Field label="Urban" value={pct("population_Urban_Pct")} />
                      </Section>
                    )}

                    {/* Income & Economy */}
                    {demo && (d("median_Household_Income") || d("household_Income_Per_Capita") || d("population_In_Poverty_Pct")) && (
                      <Section title="Income & Economy">
                        <Field label="Median HH Income" value={d("median_Household_Income") != null ? `$${Number(d("median_Household_Income")).toLocaleString()}` : undefined} />
                        <Field label="Avg HH Income" value={d("avg_Household_Income") != null ? `$${Number(d("avg_Household_Income")).toLocaleString()}` : undefined} />
                        <Field label="Per Capita Income" value={d("household_Income_Per_Capita") != null ? `$${Number(d("household_Income_Per_Capita")).toLocaleString()}` : undefined} />
                        <Field label="Family Median Income" value={d("family_Median_Income") != null ? `$${Number(d("family_Median_Income")).toLocaleString()}` : undefined} />
                        <Field label="Poverty Rate" value={pct("population_In_Poverty_Pct")} />
                        <Field label="White Collar" value={pct("occupation_White_Collar_Pct")} />
                        <Field label="Blue Collar" value={pct("occupation_Blue_Collar_Pct")} />
                        <Field label="Work From Home" value={pct("transportation_Work_From_Home_Pct")} />
                      </Section>
                    )}

                    {/* Housing Market */}
                    {demo && (d("housing_Owner_Households_Median_Value") || d("housing_Median_Rent")) && (
                      <Section title="Housing Market">
                        <Field label="Median Home Value" value={d("housing_Owner_Households_Median_Value") != null ? `$${Number(d("housing_Owner_Households_Median_Value")).toLocaleString()}` : undefined} />
                        <Field label="Median Rent" value={d("housing_Median_Rent") != null ? `$${Number(d("housing_Median_Rent")).toLocaleString()}/mo` : undefined} />
                        <Field label="With Mortgage" value={pct("housing_Owner_Households_With_Mortgage_Pct")} />
                        <Field label="Median Year Built" value={d("housing_Median_Built_Yr")} />
                        <Field label="Med Length of Residence" value={d("median_Length_Of_Residence_Yr") != null ? `${d("median_Length_Of_Residence_Yr")} yrs` : undefined} />
                        <Field label="Single Family" value={pct("housing_Occupied_Structure_1_Unit_Detached_Pct")} />
                        <Field label="Median Vehicles" value={d("households_Median_Vehicles")} />
                      </Section>
                    )}

                    {/* Transportation & Commute */}
                    {demo && d("median_Travel_Time_To_Work_Mi") && (
                      <Section title="Transportation & Commute">
                        <Field label="Median Commute" value={d("median_Travel_Time_To_Work_Mi") != null ? `${d("median_Travel_Time_To_Work_Mi")} min` : undefined} />
                        <Field label="Drive Alone" value={pct("transportation_Car_Alone_Pct")} />
                        <Field label="Carpool" value={pct("transportation_Car_Carpool_Pct")} />
                        <Field label="Public Transit" value={pct("transportation_Public_Pct")} />
                        <Field label="Walk" value={pct("transportation_Walk_Pct")} />
                        <Field label="Work From Home" value={pct("transportation_Work_From_Home_Pct")} />
                      </Section>
                    )}

                    {/* Education */}
                    {demo && d("education_Bach_Degree_Pct") && (
                      <Section title="Education">
                        <Field label="Bachelor's Degree" value={pct("education_Bach_Degree_Pct")} />
                        <Field label="Graduate Degree" value={pct("education_Grad_Degree_Pct")} />
                        <Field label="Some College" value={pct("education_Some_College_Pct")} />
                        <Field label="High School" value={pct("education_Hs_Pct")} />
                        <Field label="Associate Degree" value={pct("education_Assoc_Degree_Pct")} />
                      </Section>
                    )}

                    {/* Crime & Safety */}
                    {crime && (
                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                          Crime & Safety (Index: 100 = National Avg)
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                          {[
                            { label: "Overall Crime", val: crime.crime_Index },
                            { label: "Burglary", val: crime.burglary_Index },
                            { label: "Larceny", val: crime.larceny_Index },
                            { label: "Vehicle Theft", val: crime.motor_Vehicle_Theft_Index },
                            { label: "Assault", val: crime.aggravated_Assault_Index },
                            { label: "Robbery", val: crime.forcible_Robbery_Index },
                          ].filter((c) => c.val != null).map((c) => (
                            <div key={c.label} style={{ padding: "10px 12px", background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>
                              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#6b7280", letterSpacing: 0.5 }}>{c.label}</div>
                              <div style={{ fontSize: 22, fontWeight: 800, color: idxColor(c.val!) }}>{c.val}</div>
                              <div style={{ fontSize: 10, color: idxColor(c.val!) }}>{idxLabel(c.val!)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Climate */}
                    {climate && (
                      <Section title="Climate">
                        <Field label="Avg Annual Temp" value={climate.annual_Avg_Temp != null ? `${climate.annual_Avg_Temp}°F` : undefined} />
                        <Field label="Summer High" value={climate.avg_Jul_High_Temp != null ? `${climate.avg_Jul_High_Temp}°F` : undefined} />
                        <Field label="Winter Low" value={climate.avg_Jan_Low_Temp != null ? `${climate.avg_Jan_Low_Temp}°F` : undefined} />
                        <Field label="Annual Rainfall" value={climate.annual_Precip_In != null ? `${climate.annual_Precip_In}"` : undefined} />
                        <Field label="Annual Snowfall" value={climate.annual_Snowfall_In != null ? `${climate.annual_Snowfall_In}"` : undefined} />
                        <Field label="Clear Days/Yr" value={climate.clear_Day_Mean} />
                        <Field label="Rainy Days/Yr" value={climate.rainy_Day_Mean} />
                        <Field label="Sunshine" value={climate.possible_Sunshine_Pct != null ? `${climate.possible_Sunshine_Pct}%` : undefined} />
                      </Section>
                    )}

                    {/* Air Quality */}
                    {airQuality && (
                      <Section title="Air Quality (Index: 100 = National Avg)">
                        <Field label="Air Pollution" value={airQuality.air_Pollution_Index} />
                        <Field label="Ozone" value={airQuality.ozone_Index} />
                        <Field label="Particulate Matter" value={airQuality.particulate_Matter_Index} />
                        <Field label="Carbon Monoxide" value={airQuality.carbon_Monoxide_Index} />
                        <Field label="Nitrogen Dioxide" value={airQuality.nitrogen_Dioxide_Index} />
                      </Section>
                    )}

                    {/* Natural Disasters */}
                    {naturalDisasters && (
                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                          Natural Disaster Risk (Index: 100 = National Avg)
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
                          {[
                            { label: "Earthquake", val: naturalDisasters.earthquake_Index },
                            { label: "Hurricane", val: naturalDisasters.hurricane_Index },
                            { label: "Tornado", val: naturalDisasters.tornado_Index },
                            { label: "Hail", val: naturalDisasters.hail_Index },
                            { label: "Wind", val: naturalDisasters.wind_Index },
                            { label: "Weather", val: naturalDisasters.weather_Index },
                          ].filter((c) => c.val != null).map((c) => (
                            <div key={c.label} style={{ padding: "10px 12px", background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>
                              <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#6b7280", letterSpacing: 0.5 }}>{c.label}</div>
                              <div style={{ fontSize: 22, fontWeight: 800, color: idxColor(c.val!) }}>{c.val}</div>
                              <div style={{ fontSize: 10, color: idxColor(c.val!) }}>{idxLabel(c.val!)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sales Trends */}
                    {trendsList.length > 0 && (() => {
                      // v4 response: salesTrends[].location.geographyName, .dateRange.start/.end, .salesTrend.{homeSaleCount, avgSalePrice, medSalePrice}
                      const areaName = trendsList[0]?.location?.geographyName;
                      // Show the most recent 12 quarters (3 years)
                      const recent = trendsList.slice(-12);
                      // Compute price change from first to last for trend indicator
                      const firstMed = recent[0]?.salesTrend?.medSalePrice;
                      const lastMed = recent[recent.length - 1]?.salesTrend?.medSalePrice;
                      const priceChange = (firstMed && lastMed) ? ((lastMed - firstMed) / firstMed * 100) : null;

                      return (
                        <div style={{ marginBottom: 20 }}>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 4, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                            Market Trends — Single Family Residential
                          </h3>
                          {areaName && (
                            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                              Area: {areaName}
                              {priceChange != null && (
                                <span style={{ marginLeft: 12, fontWeight: 600, color: priceChange >= 0 ? "#059669" : "#dc2626" }}>
                                  {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(1)}% median price change over period
                                </span>
                              )}
                            </div>
                          )}
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                                  <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Period</th>
                                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Median Price</th>
                                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Avg Price</th>
                                  <th style={{ textAlign: "right", padding: "6px 8px", color: "#6b7280", fontWeight: 600 }}>Sales</th>
                                </tr>
                              </thead>
                              <tbody>
                                {recent.map((t: any, i: number) => {
                                  const period = t.dateRange?.start || t.dateRange?.interval || "";
                                  const st = t.salesTrend || t;
                                  return (
                                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                                      <td style={{ padding: "6px 8px", fontWeight: 500 }}>{period}</td>
                                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{st.medSalePrice != null ? `$${Number(st.medSalePrice).toLocaleString()}` : "—"}</td>
                                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{st.avgSalePrice != null ? `$${Number(st.avgSalePrice).toLocaleString()}` : "—"}</td>
                                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{st.homeSaleCount ?? "—"}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {trendsList[0]?.vintage?.pubDate && (
                            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                              Data published: {trendsList[0].vintage.pubDate}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Nearby Schools */}
                    {schoolList.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                          Nearby Schools
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {schoolList.slice(0, 15).map((school: any, i: number) => {
                            // v4 fields: schoolName, schoolType, institutionType, gradeSpanLow, gradeSpanHigh,
                            //            studentCnt, schoolRating, urbanCentricCommunityType, apInd
                            // v4 nested: school.detail.schoolName, school.location, school.district
                            const detail = school.detail || school;
                            const loc = school.location || {};
                            const name = detail.schoolName || detail.InstitutionName || school.schoolName || school.InstitutionName;
                            const type = detail.institutionType || detail.schoolType || school.schoolType || school.Type;
                            const gradeSpan = (detail.gradeSpanLow && detail.gradeSpanHigh)
                              ? `${detail.gradeSpanLow}–${detail.gradeSpanHigh}`
                              : school.gradeRange || school.Grades;
                            const level = [detail.elementarySchoolInd === "Y" && "Elementary", detail.middleSchoolInd === "Y" && "Middle", detail.highSchoolInd === "Y" && "High"].filter(Boolean).join("/") || detail.instructionalLevel;
                            const students = detail.studentCnt || school.enrollment || school.Enrollment;
                            const rating = detail.schoolRating || school.rating || school.SchoolRating;
                            const dist = loc.distance ?? school.distance;
                            const community = detail.urbanCentricCommunityType;
                            const hasAP = detail.apInd === "Y";
                            const charter = detail.charterInd === "Y";

                            // Rating color for letter grades (A+, A, A-, B+, B, B-, etc.)
                            const ratingBg = typeof rating === "string"
                              ? rating.startsWith("A") ? "#059669" : rating.startsWith("B") ? "#3b82f6" : rating.startsWith("C") ? "#d97706" : "#dc2626"
                              : rating >= 8 ? "#059669" : rating >= 5 ? "#d97706" : "#dc2626";

                            return (
                              <div key={i} style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                                <div style={{ flex: 1, minWidth: 180 }}>
                                  <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{name}</div>
                                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                                    {[
                                      type,
                                      level,
                                      gradeSpan ? `Grades ${gradeSpan}` : null,
                                      dist != null ? `${Number(dist).toFixed(1)} mi` : null,
                                    ].filter(Boolean).join(" · ")}
                                  </div>
                                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1, display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {students != null && <span>Enrollment: {Number(students).toLocaleString()}</span>}
                                    {community && <span>{community}</span>}
                                    {hasAP && <span style={{ color: "#059669", fontWeight: 600 }}>AP Classes</span>}
                                    {charter && <span style={{ color: "#7c3aed", fontWeight: 600 }}>Charter</span>}
                                  </div>
                                  {/* District info if nested in v4 */}
                                  {school.district?.schoolDistrictName && (
                                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                                      District: {school.district.schoolDistrictName}
                                    </div>
                                  )}
                                </div>
                                {rating != null && (
                                  <div style={{
                                    minWidth: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                                    fontWeight: 800, fontSize: typeof rating === "string" ? 14 : 16, color: "#fff", flexShrink: 0,
                                    padding: "0 8px", background: ratingBg,
                                  }}>
                                    {rating}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Points of Interest */}
                    {poiList.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                          Points of Interest
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {poiList.slice(0, 25).map((poi: any, i: number) => {
                            // v4 fields: name, businessCategory, address, city, stateCode, zipCode,
                            //            phone, facebookUrl, yelpUrl, operatingHours, industryCode,
                            //            naicsCode, sicCode, franchiseInd, distance
                            const poiName = poi.name || poi.Name || poi.businessName;
                            const category = poi.businessCategory || poi.business_category || poi.categoryName || poi.lob || poi.industry;
                            const address = poi.address || poi.addressLine1;
                            const phone = poi.phone || poi.contactPhone;
                            const facebook = poi.facebookUrl;
                            const yelp = poi.yelpUrl;
                            const hours = poi.operatingHours;
                            const franchise = poi.franchiseInd === "Y" || poi.franchise;
                            const dist = poi.distance;

                            return (
                              <div key={i} style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                  <div style={{ flex: 1, minWidth: 180 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{poiName}</div>
                                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                                      {[
                                        category,
                                        poi.city,
                                        dist != null ? `${Number(dist).toFixed(1)} mi` : null,
                                      ].filter(Boolean).join(" · ")}
                                    </div>
                                    {address && (
                                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                                        {[address, poi.city, poi.stateCode, poi.zipCode].filter(Boolean).join(", ")}
                                      </div>
                                    )}
                                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1, display: "flex", flexWrap: "wrap", gap: 8 }}>
                                      {phone && <span>Tel: {phone}</span>}
                                      {franchise && <span style={{ color: "#7c3aed", fontWeight: 600 }}>Franchise</span>}
                                      {hours && <span>Hours: {hours}</span>}
                                    </div>
                                    {(facebook || yelp) && (
                                      <div style={{ fontSize: 11, marginTop: 2, display: "flex", gap: 10 }}>
                                        {facebook && <a href={facebook} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", textDecoration: "none" }}>Facebook</a>}
                                        {yelp && <a href={yelp} target="_blank" rel="noopener noreferrer" style={{ color: "#dc2626", textDecoration: "none" }}>Yelp</a>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}

          {activeSection === "federal" && (
            <>
              {federalLoading && (
                <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                  Loading federal data sources...
                </div>
              )}

              {!federalLoading && !federalData && (
                <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
                  Federal data not available. Connect the Federal Data integration to access government property intelligence.
                </div>
              )}

              {federalData && (
                <>
                  {/* Vacancy / Occupancy */}
                  {federalData.vacancy && (
                    <Section title="Vacancy Status">
                      {federalData.vacancy.source === "usps" && (
                        <Field label="USPS Vacancy" value={federalData.vacancy.vacant ? "Vacant" : "Active Mail Delivery"} />
                      )}
                      {federalData.vacancy.vacancyRate != null && (
                        <Field label="Area Vacancy Rate" value={`${federalData.vacancy.vacancyRate.toFixed(1)}%`} />
                      )}
                      <Field label="Data Source" value={federalData.vacancy.source === "usps" ? "USPS" : "Census Bureau ACS"} />
                    </Section>
                  )}

                  {/* Fair Market Rents */}
                  {federalData.fairMarketRent && (
                    <Section title="HUD Fair Market Rents">
                      <Field label="Area" value={federalData.fairMarketRent.areaName || federalData.fairMarketRent.countyName} />
                      <Field label="Studio/Efficiency" value={fmt(federalData.fairMarketRent.efficiency)} />
                      <Field label="1 Bedroom" value={fmt(federalData.fairMarketRent.oneBedroom)} />
                      <Field label="2 Bedroom" value={fmt(federalData.fairMarketRent.twoBedroom)} />
                      <Field label="3 Bedroom" value={fmt(federalData.fairMarketRent.threeBedroom)} />
                      <Field label="4 Bedroom" value={fmt(federalData.fairMarketRent.fourBedroom)} />
                      <Field label="Year" value={federalData.fairMarketRent.year} />
                    </Section>
                  )}

                  {/* Demographics */}
                  {federalData.demographics && (
                    <Section title="Census Demographics">
                      <Field label="Total Population" value={fmtNum(federalData.demographics.totalPopulation ?? undefined)} />
                      <Field label="Median Age" value={federalData.demographics.medianAge ?? undefined} />
                      <Field label="Median Household Income" value={fmt(federalData.demographics.medianHouseholdIncome ?? undefined)} />
                      <Field label="Median Home Value" value={fmt(federalData.demographics.medianHomeValue ?? undefined)} />
                      <Field label="Median Gross Rent" value={fmt(federalData.demographics.medianGrossRent ?? undefined)} />
                      <Field label="Total Housing Units" value={fmtNum(federalData.demographics.totalHousingUnits ?? undefined)} />
                      <Field label="Owner Occupied" value={fmtNum(federalData.demographics.ownerOccupied ?? undefined)} />
                      <Field label="Renter Occupied" value={fmtNum(federalData.demographics.renterOccupied ?? undefined)} />
                      <Field label="Vacant Units" value={fmtNum(federalData.demographics.vacantUnits ?? undefined)} />
                    </Section>
                  )}

                  {/* Flood Risk */}
                  {federalData.floodRisk && (
                    <Section title="FEMA Flood Insurance">
                      <Field label="Flood Zone" value={federalData.floodRisk.floodZone} />
                      <Field label="NFIP Policies" value={fmtNum(federalData.floodRisk.policyCount)} />
                      <Field label="Avg Premium" value={fmt(Math.round(federalData.floodRisk.averagePremium))} />
                      <Field label="Total Coverage" value={fmt(federalData.floodRisk.totalCoverage)} />
                    </Section>
                  )}

                  {/* Conforming Loan Limits */}
                  {federalData.conformingLoanLimit && (
                    <Section title="FHFA Conforming Loan Limits">
                      <Field label="1 Unit" value={fmt(federalData.conformingLoanLimit.oneUnit)} />
                      <Field label="2 Units" value={fmt(federalData.conformingLoanLimit.twoUnit)} />
                      <Field label="3 Units" value={fmt(federalData.conformingLoanLimit.threeUnit)} />
                      <Field label="4 Units" value={fmt(federalData.conformingLoanLimit.fourUnit)} />
                      <Field label="Year" value={federalData.conformingLoanLimit.year} />
                      <Field label="County" value={federalData.conformingLoanLimit.county} />
                    </Section>
                  )}

                  {/* Employment */}
                  {federalData.localEmployment?.unemploymentRate && (
                    <Section title="BLS Employment Data">
                      <Field label="State Unemployment Rate" value={`${federalData.localEmployment.unemploymentRate}%`} />
                    </Section>
                  )}

                  {/* Lending Data */}
                  {federalData.lendingData && (
                    <Section title="HMDA Mortgage Lending">
                      <Field label="Total Applications" value={fmtNum(federalData.lendingData.totalApplications)} />
                      <Field label="Total Originations" value={fmtNum(federalData.lendingData.totalOriginations)} />
                      <Field label="Total Denials" value={fmtNum(federalData.lendingData.totalDenials)} />
                      <Field label="Approval Rate" value={federalData.lendingData.approvalRate ? `${federalData.lendingData.approvalRate.toFixed(1)}%` : undefined} />
                      <Field label="Median Loan Amount" value={fmt(federalData.lendingData.medianLoanAmount)} />
                      <Field label="Year" value={federalData.lendingData.year} />
                    </Section>
                  )}

                  {/* Environmental Sites */}
                  {federalData.environmentalSites && federalData.environmentalSites.length > 0 && (
                    <Section title="EPA Environmental Sites">
                      {federalData.environmentalSites.slice(0, 10).map((site, i) => (
                        <Field key={i} label={site.siteType} value={site.facilityName} />
                      ))}
                      {federalData.environmentalSites.length > 10 && (
                        <Field label="More Sites" value={`${federalData.environmentalSites.length - 10} additional`} />
                      )}
                    </Section>
                  )}

                  {/* Recent Disasters */}
                  {federalData.recentDisasters && federalData.recentDisasters.length > 0 && (
                    <Section title="Recent FEMA Disaster Declarations">
                      {federalData.recentDisasters.slice(0, 5).map((d, i) => (
                        <Field key={i} label={d.incidentType} value={`${d.title} (${d.declarationDate?.substring(0, 10)})`} />
                      ))}
                    </Section>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
