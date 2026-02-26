"use client";

import { useState } from "react";

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
  const [activeSection, setActiveSection] = useState<"overview" | "building" | "financial" | "ownership">("overview");

  const addr = p.address?.oneLine || [p.address?.line1, p.address?.line2].filter(Boolean).join(", ") || "Property Detail";
  const sqft = p.building?.size?.livingSize || p.building?.size?.universalSize || p.building?.size?.bldgSize;
  const beds = p.building?.rooms?.beds;
  const baths = p.building?.rooms?.bathsFull ?? p.building?.rooms?.bathsTotal;
  const yearBuilt = p.building?.summary?.yearBuilt || p.summary?.yearBuilt;
  const avmVal = p.avm?.amount?.value;
  const lastSaleAmt = p.sale?.amount?.saleAmt || p.sale?.amount?.salePrice;
  const equity = avmVal && lastSaleAmt ? avmVal - lastSaleAmt : null;

  const sections = [
    { id: "overview" as const, label: "Overview" },
    { id: "building" as const, label: "Building" },
    { id: "financial" as const, label: "Financial" },
    { id: "ownership" as const, label: "Ownership" },
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
                <Field label="ATTOM ID" value={p.identifier?.attomId} />
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
            </>
          )}

          {activeSection === "ownership" && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
