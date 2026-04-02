"use client";

import React from "react";
import type { PropertyReportData } from "@/lib/documents/property-intelligence-report";
import {
  ReportHeader,
  ReportSection,
  ReportRow,
  ReportFooter,
  ValueCard,
  TwoColumnGrid,
  AvmRangeBar,
  EquityBar,
  MarketTypeIndicator,
  ComparisonTable,
  PhotoGallery,
  PageBreak,
  fmt$,
  fmtPct,
} from "./report-components";

interface AgentBranding {
  displayName: string;
  email: string;
  phone?: string | null;
  licenseNumber?: string | null;
}

interface Props {
  data: PropertyReportData;
  branding: AgentBranding;
  createdAt?: string;
}

export default function PropertyReportView({ data: d, branding: b, createdAt }: Props) {
  const cityLine = [d.city, d.state, d.zip].filter(Boolean).join(", ");
  const dateStr =
    createdAt
      ? new Date(createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : d.generatedAt;

  // Mortgage estimate calculation
  const price = d.listPrice || d.avmValue;
  let monthlyTotal: number | null = null;
  let monthlyPI = 0;
  let monthlyTax = 0;
  let monthlyHOA = 0;
  let downPayment = 0;
  let loanAmt = 0;
  if (price && price > 0) {
    downPayment = price * 0.2;
    loanAmt = price - downPayment;
    const monthlyRate = 6.75 / 100 / 12;
    const numPayments = 360;
    monthlyPI = monthlyRate > 0
      ? (loanAmt * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) / (Math.pow(1 + monthlyRate, numPayments) - 1)
      : loanAmt / numPayments;
    monthlyTax = (d.taxAmount || d.taxAnnualAmount || 0) / 12;
    monthlyHOA = (d.associationFee || 0) / 12;
    monthlyTotal = monthlyPI + monthlyTax + monthlyHOA;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <ReportHeader
        reportType="Property Report"
        title={d.address}
        subtitle={cityLine}
        agentName={b.displayName}
        licenseNumber={b.licenseNumber || undefined}
        date={dateStr}
      />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 60px" }}>

        {/* ═══ Value Cards ═══ */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
          {d.avmValue != null && (
            <ValueCard label="AVM Value" value={fmt$(d.avmValue)!} sub={d.avmDate ? `As of ${d.avmDate}` : undefined} />
          )}
          {d.lastSalePrice != null && (
            <ValueCard label="Last Sale" value={fmt$(d.lastSalePrice)!} sub={d.lastSaleDate || undefined} color="#eff6ff" />
          )}
          {d.estimatedEquity != null && (
            <ValueCard
              label="Est. Equity"
              value={`${d.estimatedEquity >= 0 ? "+" : ""}${fmt$(d.estimatedEquity)}`}
              color={d.estimatedEquity >= 0 ? "#ecfdf5" : "#fef2f2"}
            />
          )}
          {d.ltv != null && <ValueCard label="LTV" value={fmtPct(d.ltv)!} color={d.ltv > 80 ? "#fef2f2" : "#f0fdf4"} />}
          {d.rentalEstimate != null && (
            <ValueCard
              label="Rent Estimate"
              value={`${fmt$(d.rentalEstimate)}/mo`}
              sub={d.grossYield != null ? `${d.grossYield.toFixed(1)}% gross yield` : undefined}
              color="#f5f3ff"
            />
          )}
        </div>

        {/* AVM Range Bar */}
        {d.avmLow != null && d.avmHigh != null && d.avmValue != null && (
          <AvmRangeBar low={d.avmLow} estimate={d.avmValue} high={d.avmHigh} />
        )}

        {/* ═══ Property Details ═══ */}
        <ReportSection title="Property Details">
          <TwoColumnGrid>
            <ReportRow label="Property Type" value={d.propertyType} />
            <ReportRow label="Year Built" value={d.yearBuilt} />
            <ReportRow label="Bedrooms" value={d.beds} />
            <ReportRow label="Bathrooms" value={d.baths} />
            <ReportRow label="Living Area" value={d.sqft ? `${d.sqft.toLocaleString()} sqft` : null} />
            <ReportRow label="Lot Size" value={d.lotSizeSqft ? `${d.lotSizeSqft.toLocaleString()} sqft` : null} />
            <ReportRow label="Stories" value={d.stories} />
            <ReportRow label="Parking" value={d.garageSpaces} />
            <ReportRow label="Pool" value={d.pool != null ? (d.pool ? "Yes" : "No") : null} />
            <ReportRow label="APN / TMK" value={d.apn} />
            <ReportRow label="County" value={d.county} />
            <ReportRow label="Land Tenure" value={d.ownershipType} />
          </TwoColumnGrid>
        </ReportSection>

        {/* ═══ Building Details ═══ */}
        {(d.constructionType || d.roofType || d.heatingType || d.coolingType || d.architectureStyle) && (
          <ReportSection title="Building Details">
            <TwoColumnGrid>
              <ReportRow label="Architecture" value={d.architectureStyle} />
              <ReportRow label="Construction" value={d.constructionType} />
              <ReportRow label="Condition" value={d.condition} />
              <ReportRow label="Roof" value={d.roofType} />
              <ReportRow label="Foundation" value={d.foundationType} />
              <ReportRow label="Heating" value={d.heatingType} />
              <ReportRow label="Cooling" value={d.coolingType} />
              <ReportRow label="Fireplaces" value={d.fireplaceCount} />
              <ReportRow label="Basement" value={d.basementType ? `${d.basementType}${d.basementSize ? ` (${d.basementSize.toLocaleString()} sqft)` : ""}` : null} />
              <ReportRow label="Parking" value={d.parkingType ? `${d.parkingType}${d.parkingSpaces ? ` (${d.parkingSpaces} spaces)` : ""}` : d.parkingSpaces || null} />
            </TwoColumnGrid>
          </ReportSection>
        )}

        {/* ═══ MLS Listing ═══ */}
        {(d.mlsNumber || d.listingAgentName || d.listingStatus) && (
          <ReportSection title="MLS Listing">
            <TwoColumnGrid>
              <ReportRow label="MLS #" value={d.mlsNumber} />
              <ReportRow label="Status" value={d.listingStatus} />
              <ReportRow label="Days on Market" value={d.daysOnMarket} />
              <ReportRow label="Listing Agent" value={d.listingAgentName} />
              <ReportRow label="Office" value={d.listingOfficeName} />
            </TwoColumnGrid>
            {d.listingDescription && (
              <div style={{ marginTop: 12, padding: "12px 16px", background: "#f9fafb", borderRadius: 8, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                {d.listingDescription.substring(0, 600)}
              </div>
            )}
          </ReportSection>
        )}

        {/* ═══ Tax Assessment ═══ */}
        {(d.assessedTotal != null || d.taxAmount != null) && (
          <ReportSection title="Tax Assessment">
            <TwoColumnGrid>
              <ReportRow label="Assessed Total" value={fmt$(d.assessedTotal)} />
              <ReportRow label="Land Value" value={fmt$(d.assessedLand)} />
              <ReportRow label="Improvement Value" value={fmt$(d.assessedImpr)} />
              <ReportRow label="Market Value" value={fmt$(d.marketTotal)} />
              <ReportRow label="Annual Tax" value={fmt$(d.taxAmount)} />
              <ReportRow label="Tax Year" value={d.taxYear} />
            </TwoColumnGrid>
          </ReportSection>
        )}

        {/* ═══ Mortgage & Equity ═══ */}
        {(d.loanBalance != null || d.loanAmount != null || d.lender) && (
          <ReportSection title="Mortgage & Equity">
            <TwoColumnGrid>
              <ReportRow label="Loan Balance" value={fmt$(d.loanBalance)} />
              <ReportRow label="Original Loan" value={fmt$(d.loanAmount)} />
              <ReportRow label="Lender" value={d.lender} />
              <ReportRow label="Loan Type" value={d.loanType} />
              <ReportRow label="Active Loans" value={d.loanCount} />
              <ReportRow label="LTV Ratio" value={fmtPct(d.ltv)} />
              <ReportRow label="Est. Equity" value={d.estimatedEquity != null ? fmt$(d.estimatedEquity) : null} />
            </TwoColumnGrid>
            {d.avmValue && d.loanBalance && d.avmValue > 0 && (
              <div style={{ marginTop: 12 }}>
                <EquityBar propertyValue={d.avmValue} loanBalance={d.loanBalance} />
              </div>
            )}
          </ReportSection>
        )}

        {/* ═══ Mortgage Payment Estimate ═══ */}
        {monthlyTotal != null && price && (
          <ReportSection title="Mortgage Payment Estimate">
            <div
              style={{
                padding: "16px 20px",
                background: "#f0fdf4",
                borderRadius: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 14, color: "#6b7280" }}>Estimated Monthly Payment</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#15803d" }}>
                ${Math.round(monthlyTotal).toLocaleString()}/mo
              </span>
            </div>
            <TwoColumnGrid>
              <ReportRow label="Home Price" value={fmt$(price)} />
              <ReportRow label="Down Payment (20%)" value={fmt$(Math.round(downPayment))} />
              <ReportRow label="Loan Amount" value={fmt$(Math.round(loanAmt))} />
              <ReportRow label="Interest Rate" value="6.75% (30-year fixed)" />
              <ReportRow label="Principal & Interest" value={`$${Math.round(monthlyPI).toLocaleString()}/mo`} />
              {monthlyTax > 0 && <ReportRow label="Property Tax" value={`$${Math.round(monthlyTax).toLocaleString()}/mo`} />}
              {monthlyHOA > 0 && <ReportRow label="HOA" value={`$${Math.round(monthlyHOA).toLocaleString()}/mo`} />}
              <ReportRow label="Total Interest (30yr)" value={fmt$(Math.round(monthlyPI * 360 - loanAmt))} />
            </TwoColumnGrid>
          </ReportSection>
        )}

        {/* ═══ Sales History ═══ */}
        {d.salesHistory && d.salesHistory.length > 0 && (
          <ReportSection title="Sales History">
            <ComparisonTable
              headers={["Date", "Amount", "Buyer", "Seller"]}
              rows={d.salesHistory.slice(0, 10).map((s) => ({
                label: s.date || "-",
                values: [
                  s.amount != null ? fmt$(s.amount) || "-" : "-",
                  (s.buyer || "-").substring(0, 25),
                  (s.seller || "-").substring(0, 25),
                ],
              }))}
            />
          </ReportSection>
        )}

        {/* ═══ Ownership ═══ */}
        {(d.owner1 || d.owner2 || d.mailingAddress) && (
          <ReportSection title="Ownership">
            <TwoColumnGrid>
              <ReportRow label="Owner" value={d.owner1} />
              <ReportRow label="Co-Owner" value={d.owner2} />
              <ReportRow label="Owner Occupied" value={d.ownerOccupied === "Y" ? "Yes" : d.ownerOccupied === "N" ? "No" : d.ownerOccupied} />
              <ReportRow label="Absentee Owner" value={d.absenteeOwner === "A" ? "Yes" : d.absenteeOwner} />
              <ReportRow label="Corporate Owner" value={d.corporateOwner === "Y" ? "Yes" : d.corporateOwner === "N" ? "No" : d.corporateOwner} />
              <ReportRow label="Mailing Address" value={d.mailingAddress} />
            </TwoColumnGrid>
          </ReportSection>
        )}

        {/* ═══ Comparable Sales ═══ */}
        {d.comps && d.comps.length > 0 && (
          <ReportSection title="Comparable Sales">
            <ComparisonTable
              headers={["Address", "Price", "Bd/Ba", "Sqft", "Closed", "Match"]}
              rows={d.comps.slice(0, 10).map((c) => ({
                label: (c.address || "-").substring(0, 30),
                values: [
                  c.price != null ? fmt$(c.price) || "-" : "-",
                  `${c.beds || "?"}/${c.baths || "?"}`,
                  c.sqft != null ? c.sqft.toLocaleString() : "-",
                  c.closeDate || "-",
                  c.correlation != null ? `${Math.round(c.correlation <= 1 ? c.correlation * 100 : c.correlation)}%` : "-",
                ],
              }))}
            />
          </ReportSection>
        )}

        {/* ═══ Market Trends ═══ */}
        {(d.marketStats || d.marketType) && (
          <ReportSection title="Area Market Statistics">
            {d.marketType && <MarketTypeIndicator marketType={d.marketType} />}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              {d.monthsOfInventory != null && <ValueCard label="Months Inventory" value={d.monthsOfInventory.toFixed(1)} />}
              {d.soldToListRatio != null && <ValueCard label="Sold-to-List" value={`${d.soldToListRatio.toFixed(1)}%`} />}
              {d.marketStats?.avgDOM != null && <ValueCard label="Avg DOM" value={String(d.marketStats.avgDOM)} />}
              {d.marketStats?.medianPrice != null && <ValueCard label="Median Price" value={fmt$(d.marketStats.medianPrice)!} />}
            </div>
            <TwoColumnGrid>
              <ReportRow label="Active Listings" value={d.marketStats?.totalListings} />
              <ReportRow label="Price per Sqft" value={d.marketStats?.pricePerSqft != null ? `$${d.marketStats.pricePerSqft.toLocaleString()}` : null} />
            </TwoColumnGrid>
          </ReportSection>
        )}

        {/* ═══ Hazard & Environmental ═══ */}
        {d.hazards && d.hazards.length > 0 && (
          <ReportSection title="Hazard & Environmental Zones">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {d.hazards.map((h, i) => (
                <div
                  key={i}
                  style={{
                    padding: "8px 12px",
                    background: "#fef2f2",
                    borderRadius: 8,
                    borderLeft: "4px solid #dc2626",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>{h.label}</div>
                  <div style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{h.value}</div>
                </div>
              ))}
            </div>
            {d.federalData?.floodZone && <div style={{ marginTop: 10 }}><ReportRow label="FEMA Flood Zone" value={d.federalData.floodZone} /></div>}
            {d.federalData?.floodRisk && <ReportRow label="Flood Risk" value={d.federalData.floodRisk} />}
          </ReportSection>
        )}

        {/* ═══ Neighborhood & Economic ═══ */}
        {d.federalData && (d.federalData.medianIncome != null || d.federalData.medianAge != null || d.federalData.unemploymentRate != null) && (
          <ReportSection title="Neighborhood & Economic Context">
            <TwoColumnGrid>
              <ReportRow label="Median Household Income" value={fmt$(d.federalData.medianIncome)} />
              <ReportRow label="Median Home Value (Area)" value={fmt$(d.federalData.medianHomeValue)} />
              <ReportRow label="Median Age" value={d.federalData.medianAge != null ? String(d.federalData.medianAge) : null} />
              <ReportRow label="Population Density" value={d.federalData.populationDensity != null ? `${d.federalData.populationDensity.toLocaleString()} /sq mi` : null} />
              <ReportRow label="Unemployment Rate" value={fmtPct(d.federalData.unemploymentRate)} />
              <ReportRow label="Poverty Rate" value={fmtPct(d.federalData.povertyRate)} />
              <ReportRow label="Owner-Occupied" value={fmtPct(d.federalData.ownerOccupiedPct)} />
              <ReportRow label="Renter-Occupied" value={fmtPct(d.federalData.renterOccupiedPct)} />
              <ReportRow label="30-yr Mortgage Rate" value={fmtPct(d.federalData.mortgageRate30yr)} />
            </TwoColumnGrid>
          </ReportSection>
        )}

        {/* ═══ Photo Gallery ═══ */}
        {d.photos && d.photos.length > 0 && (
          <ReportSection title="Photos">
            <PhotoGallery photos={d.photos.slice(0, 9)} columns={3} />
          </ReportSection>
        )}

        {/* ═══ Footer ═══ */}
        <ReportFooter agentName={b.displayName} email={b.email} phone={b.phone || undefined} />
      </div>
    </div>
  );
}
