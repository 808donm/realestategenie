"use client";

import { useState, useEffect } from "react";
import type { FederalPropertySupplement } from "@/lib/integrations/federal-data-client";

interface AttomProperty {
  identifier?: { Id?: number; fips?: string; apn?: string; attomId?: number };
  address?: { oneLine?: string; line1?: string; line2?: string; locality?: string; countrySubd?: string; postal1?: string };
  location?: { latitude?: string; longitude?: string };
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

export default function PropertyDetailModal({
  property: p,
  onClose,
}: {
  property: AttomProperty;
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
    if (zip) params.set("postalcode", zip);
    if (p.location?.latitude) params.set("latitude", p.location.latitude);
    if (p.location?.longitude) params.set("longitude", p.location.longitude);

    fetch(`/api/integrations/attom/property?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setNeighborhoodData(data);
        }
      })
      .catch(() => {})
      .finally(() => setNeighborhoodLoading(false));
  }, [activeSection, neighborhoodData, neighborhoodLoading, p]);

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
                <Field label="Latitude" value={p.location?.latitude} />
                <Field label="Longitude" value={p.location?.longitude} />
              </Section>

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

          {activeSection === "financial" && (
            <>
              {p.avm && (
                <Section title="Automated Valuation (AVM)">
                  <Field label="Estimated Value" value={fmt(p.avm.amount?.value)} />
                  <Field label="Low Estimate" value={fmt(p.avm.amount?.low)} />
                  <Field label="High Estimate" value={fmt(p.avm.amount?.high)} />
                  <Field label="Confidence Score" value={p.avm.amount?.scr} />
                  <Field label="Valuation Date" value={p.avm.eventDate} />
                </Section>
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
            </>
          )}

          {activeSection === "ownership" && (() => {
            // Resolve TMK: prefer Hawaii statewide parcel data (12-digit QPublic-compatible format)
            // over ATTOM APN (which uses a different format with island prefix, no CPR suffix)
            const tmkValue = hawaiiData?.parcel?.tmk_txt || hawaiiData?.parcel?.tmk || hawaiiData?.parcel?.cty_tmk || (hawaiiData?.owners?.[0]?.tmk) || null;
            // ATTOM APN as fallback display — different format, not QPublic-compatible
            const attomApn = p.identifier?.apn || null;

            // Build QPublic direct report link from TMK + county-specific params
            const qpubLink = (() => {
              if (hawaiiData?.parcel?.qpub_link) return hawaiiData.parcel.qpub_link;
              const keyValue = tmkValue ? String(tmkValue).replace(/[-\s.]/g, "") : null;
              if (!keyValue) return null;
              const county = (hawaiiData?.parcel?.county || "").toUpperCase();
              // Each county has fixed AppID, LayerID, and PageID on qpublic.schneidercorp.com
              const countyParams: Record<string, string> = {
                HONOLULU: "AppID=1045&LayerID=23342&PageTypeID=4&PageID=9746",
                HAWAII: "AppID=1048&PageTypeID=4",
                MAUI: "AppID=1029&PageTypeID=4",
                KAUAI: "AppID=986&PageTypeID=4",
              };
              const params = countyParams[county] || countyParams.HONOLULU;
              return `https://qpublic.schneidercorp.com/Application.aspx?${params}&KeyValue=${keyValue}`;
            })();

            return (
            <>
              {/* TMK & QPublic Quick Access — always visible when TMK is known */}
              {(tmkValue || attomApn) && (
                <div style={{ marginBottom: 20, padding: "14px 18px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bfdbfe" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#3b82f6", textTransform: "uppercase", letterSpacing: 0.5 }}>TMK (Tax Map Key)</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#1e40af", fontFamily: "monospace", marginTop: 2 }}>{tmkValue || attomApn}</div>
                      {tmkValue && attomApn && tmkValue !== attomApn && (
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>APN: {attomApn}</div>
                      )}
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
              </Section>

              <Section title="Occupancy">
                <Field label="Owner Occupied" value={p.owner?.ownerOccupied} />
                <Field label="Absentee Status" value={p.owner?.absenteeOwnerStatus || (p.summary?.absenteeInd === "O" ? "Absentee Owner" : p.summary?.absenteeInd === "S" ? "Owner Occupied" : undefined)} />
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
                const community = neighborhoodData.community?.community?.[0] || neighborhoodData.community;
                const schools = neighborhoodData.schools?.school || neighborhoodData.schools || [];
                const schoolList = Array.isArray(schools) ? schools : [];

                return (
                  <>
                    {/* Walkability / Transportation Scores */}
                    {(community?.walkScore != null || community?.bikeScore != null || community?.transitScore != null || community?.commuteTime != null) && (
                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                          Walkability & Transportation
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                          {community.walkScore != null && (
                            <div style={{ padding: "12px 14px", background: community.walkScore >= 70 ? "#ecfdf5" : community.walkScore >= 50 ? "#fefce8" : "#fef2f2", borderRadius: 8, textAlign: "center" }}>
                              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: community.walkScore >= 70 ? "#059669" : community.walkScore >= 50 ? "#a16207" : "#dc2626" }}>Walk Score</div>
                              <div style={{ fontSize: 28, fontWeight: 800, color: community.walkScore >= 70 ? "#059669" : community.walkScore >= 50 ? "#a16207" : "#dc2626" }}>{community.walkScore}</div>
                              <div style={{ fontSize: 11, color: "#6b7280" }}>
                                {community.walkScore >= 90 ? "Walker's Paradise" : community.walkScore >= 70 ? "Very Walkable" : community.walkScore >= 50 ? "Somewhat Walkable" : community.walkScore >= 25 ? "Car-Dependent" : "Almost All Errands Require a Car"}
                              </div>
                            </div>
                          )}
                          {community.bikeScore != null && (
                            <div style={{ padding: "12px 14px", background: community.bikeScore >= 70 ? "#ecfdf5" : community.bikeScore >= 50 ? "#fefce8" : "#f0f9ff", borderRadius: 8, textAlign: "center" }}>
                              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: community.bikeScore >= 70 ? "#059669" : community.bikeScore >= 50 ? "#a16207" : "#3b82f6" }}>Bike Score</div>
                              <div style={{ fontSize: 28, fontWeight: 800, color: community.bikeScore >= 70 ? "#059669" : community.bikeScore >= 50 ? "#a16207" : "#3b82f6" }}>{community.bikeScore}</div>
                              <div style={{ fontSize: 11, color: "#6b7280" }}>
                                {community.bikeScore >= 90 ? "Biker's Paradise" : community.bikeScore >= 70 ? "Very Bikeable" : community.bikeScore >= 50 ? "Bikeable" : "Minimal Bike Infrastructure"}
                              </div>
                            </div>
                          )}
                          {community.transitScore != null && (
                            <div style={{ padding: "12px 14px", background: community.transitScore >= 70 ? "#ecfdf5" : community.transitScore >= 50 ? "#fefce8" : "#f5f3ff", borderRadius: 8, textAlign: "center" }}>
                              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: community.transitScore >= 70 ? "#059669" : community.transitScore >= 50 ? "#a16207" : "#7c3aed" }}>Transit Score</div>
                              <div style={{ fontSize: 28, fontWeight: 800, color: community.transitScore >= 70 ? "#059669" : community.transitScore >= 50 ? "#a16207" : "#7c3aed" }}>{community.transitScore}</div>
                              <div style={{ fontSize: 11, color: "#6b7280" }}>
                                {community.transitScore >= 90 ? "Excellent Transit" : community.transitScore >= 70 ? "Rider's Paradise" : community.transitScore >= 50 ? "Good Transit" : "Minimal Transit"}
                              </div>
                            </div>
                          )}
                          {community.commuteTime != null && (
                            <div style={{ padding: "12px 14px", background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>
                              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#6b7280" }}>Avg Commute</div>
                              <div style={{ fontSize: 28, fontWeight: 800, color: "#374151" }}>{community.commuteTime}</div>
                              <div style={{ fontSize: 11, color: "#6b7280" }}>minutes</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Crime & Safety */}
                    {(community?.crimeIndex != null || community?.crimeRisk) && (
                      <Section title="Crime & Safety">
                        <Field label="Crime Index" value={community.crimeIndex} />
                        <Field label="Crime Risk" value={community.crimeRisk} />
                      </Section>
                    )}

                    {/* Community Profile */}
                    {community && (
                      <Section title="Community Profile">
                        <Field label="Community" value={community.communityName} />
                        <Field label="Population" value={community.population != null ? Number(community.population).toLocaleString() : undefined} />
                        <Field label="Population Density" value={community.populationDensity != null ? `${Number(community.populationDensity).toLocaleString()} / sqmi` : undefined} />
                        <Field label="Median Age" value={community.medianAge} />
                        <Field label="Median Household Income" value={community.medianHouseholdIncome != null ? `$${Number(community.medianHouseholdIncome).toLocaleString()}` : undefined} />
                        <Field label="Median Home Price" value={community.medianHomePrice != null ? `$${Number(community.medianHomePrice).toLocaleString()}` : undefined} />
                        <Field label="Affordability Index" value={community.affordabilityIndex} />
                        <Field label="House Appreciation" value={community.houseAppreciationRate != null ? `${community.houseAppreciationRate}%` : undefined} />
                        <Field label="Owner Occupied" value={community.ownerOccupiedPct != null ? `${community.ownerOccupiedPct}%` : undefined} />
                        <Field label="Renter Occupied" value={community.renterOccupiedPct != null ? `${community.renterOccupiedPct}%` : undefined} />
                        <Field label="Employment Growth" value={community.employmentGrowthRate != null ? `${community.employmentGrowthRate}%` : undefined} />
                        <Field label="Population Growth" value={community.populationGrowth != null ? `${community.populationGrowth}%` : undefined} />
                        <Field label="Avg School Rating" value={community.avgSchoolRating != null ? `${community.avgSchoolRating}/10` : undefined} />
                      </Section>
                    )}

                    {/* Nearby Schools */}
                    {schoolList.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid #e5e7eb" }}>
                          Nearby Schools
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {schoolList.slice(0, 10).map((school: any, i: number) => (
                            <div key={i} style={{ padding: "10px 14px", background: "#f9fafb", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 180 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{school.schoolName || school.InstitutionName}</div>
                                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                                  {[
                                    school.schoolType || school.Type,
                                    school.gradeRange || school.Grades,
                                    school.distance != null ? `${Number(school.distance).toFixed(1)} mi` : null,
                                  ].filter(Boolean).join(" · ")}
                                </div>
                                {(school.enrollment || school.Enrollment) && (
                                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                                    Enrollment: {Number(school.enrollment || school.Enrollment).toLocaleString()}
                                    {(school.studentTeacherRatio || school.StudentTeacher) ? ` · ${school.studentTeacherRatio || school.StudentTeacher}:1 student-teacher` : ""}
                                  </div>
                                )}
                              </div>
                              {(school.rating != null || school.SchoolRating != null) && (
                                <div style={{
                                  width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                                  fontWeight: 800, fontSize: 16, color: "#fff", flexShrink: 0,
                                  background: (school.rating || school.SchoolRating) >= 8 ? "#059669" : (school.rating || school.SchoolRating) >= 5 ? "#d97706" : "#dc2626",
                                }}>
                                  {school.rating || school.SchoolRating}
                                </div>
                              )}
                            </div>
                          ))}
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
