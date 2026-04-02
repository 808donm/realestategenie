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
  MarketTypeIndicator,
  ComparisonTable,
  PhotoGallery,
  HorizontalBarChart,
  fmt$,
  fmtPct,
  fmtK,
  REPORT_COLORS,
} from "./report-components";
import type { CensusDetailedDemographics } from "@/lib/integrations/federal-data-client";

interface AgentBranding {
  displayName: string;
  email: string;
  phone?: string | null;
  licenseNumber?: string | null;
  brokerageName?: string;
}

interface BuyerReportProps {
  property: PropertyReportData;
  branding: AgentBranding;
  personalNote?: string;
  photos?: string[];
  date?: string;
  // Multi-geography demographics (optional, for neighborhood comparison)
  demographics?: {
    zip?: CensusDetailedDemographics & Record<string, any>;
    county?: CensusDetailedDemographics & Record<string, any>;
    state?: CensusDetailedDemographics & Record<string, any>;
    national?: CensusDetailedDemographics & Record<string, any>;
  };
  // Walkability
  walkScore?: number;
  amenityScore?: number;
  leisureScore?: number;
}

export default function BuyerReportView({
  property: d,
  branding: b,
  personalNote,
  photos,
  date,
  demographics: demo,
  walkScore,
  amenityScore,
  leisureScore,
}: BuyerReportProps) {
  const cityLine = [d.city, d.state, d.zip].filter(Boolean).join(", ");
  const dateStr = date || d.generatedAt;

  // Mortgage calculation
  const price = d.listPrice || d.avmValue;
  let monthlyPI = 0;
  let monthlyTax = 0;
  let monthlyHOA = 0;
  let monthlyTotal = 0;
  let downPayment = 0;
  let loanAmt = 0;
  if (price && price > 0) {
    downPayment = price * 0.2;
    loanAmt = price - downPayment;
    const monthlyRate = 6.75 / 100 / 12;
    monthlyPI =
      monthlyRate > 0
        ? (loanAmt * (monthlyRate * Math.pow(1 + monthlyRate, 360))) / (Math.pow(1 + monthlyRate, 360) - 1)
        : loanAmt / 360;
    monthlyTax = (d.taxAmount || d.taxAnnualAmount || 0) / 12;
    monthlyHOA = (d.associationFee || 0) / 12;
    monthlyTotal = monthlyPI + monthlyTax + monthlyHOA;
  }

  const geoHeaders = ["", d.zip || "ZIP", d.county || "County", d.state || "State", "USA"];

  const geoVal = (field: string, format: "dollar" | "number" | "pct" | "compact" = "number"): string[] => {
    const levels = [demo?.zip, demo?.county, demo?.state, demo?.national];
    return levels.map((level) => {
      if (!level) return "-";
      const val = (level as any)[field];
      if (val == null) return "-";
      if (format === "dollar") return fmt$(val) || "-";
      if (format === "pct") return `${val}%`;
      if (format === "compact") return fmtK(val) || "-";
      return String(val);
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <ReportHeader
        reportType="Buyer Report"
        title={d.address}
        subtitle={cityLine}
        agentName={b.displayName}
        licenseNumber={b.licenseNumber || undefined}
        date={dateStr}
      />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 60px" }}>
        {/* ═══ Personal Note + Photo ═══ */}
        {personalNote && (
          <div
            style={{
              marginBottom: 28,
              padding: "20px 24px",
              background: "#fff",
              border: `1px solid ${REPORT_COLORS.lightGray}`,
              borderRadius: 10,
              display: "flex",
              gap: 20,
            }}
          >
            {photos && photos[0] && (
              <div style={{ flexShrink: 0, width: 280, borderRadius: 8, overflow: "hidden" }}>
                <img src={photos[0]} alt="Property" style={{ width: "100%", height: "auto" }} />
              </div>
            )}
            <div>
              <div
                style={{
                  fontSize: 14,
                  color: "#374151",
                  lineHeight: 1.7,
                  fontStyle: "italic",
                  whiteSpace: "pre-wrap",
                }}
              >
                {personalNote}
              </div>
              <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: REPORT_COLORS.textDark }}>
                {b.displayName}
              </div>
              {b.brokerageName && (
                <div style={{ fontSize: 12, color: REPORT_COLORS.textMuted }}>{b.brokerageName}</div>
              )}
            </div>
          </div>
        )}

        {/* ═══ Valuation Overview ═══ */}
        <div style={{ display: "flex", gap: 20, marginBottom: 28, flexWrap: "wrap" }}>
          {/* Left: Price + AVM */}
          <div style={{ flex: "1 1 300px" }}>
            {price != null && (
              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: REPORT_COLORS.textMuted,
                    textTransform: "uppercase",
                  }}
                >
                  {d.listingStatus === "Closed" ? "Closed Price" : "List Price"}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: REPORT_COLORS.textDark }}>{fmt$(price)}</div>
                {d.lastSaleDate && (
                  <div style={{ fontSize: 11, color: REPORT_COLORS.textMuted }}>
                    {d.listingStatus === "Closed" ? `Closed ${d.lastSaleDate}` : `Listed`}
                  </div>
                )}
              </div>
            )}
            {d.avmValue != null && (
              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: REPORT_COLORS.textMuted,
                    textTransform: "uppercase",
                  }}
                >
                  AVM
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: REPORT_COLORS.textDark }}>
                  {fmt$(d.avmValue)}
                </div>
                {d.avmDate && (
                  <div style={{ fontSize: 11, color: REPORT_COLORS.textMuted }}>Updated {d.avmDate}</div>
                )}
              </div>
            )}
            {d.avmLow != null && d.avmHigh != null && d.avmValue != null && (
              <AvmRangeBar low={d.avmLow} estimate={d.avmValue} high={d.avmHigh} />
            )}
          </div>

          {/* Right: Basic Facts */}
          <div style={{ flex: "1 1 280px" }}>
            <div
              style={{
                padding: "16px 20px",
                background: "#fff",
                border: `1px solid ${REPORT_COLORS.lightGray}`,
                borderRadius: 10,
              }}
            >
              <h4
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: REPORT_COLORS.textDark,
                  marginBottom: 10,
                }}
              >
                Basic Facts
              </h4>
              <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 13, color: REPORT_COLORS.textMuted }}>
                {d.beds != null && (
                  <span>
                    <strong style={{ color: REPORT_COLORS.textDark }}>{d.beds}</strong> beds
                  </span>
                )}
                {d.baths != null && (
                  <span>
                    <strong style={{ color: REPORT_COLORS.textDark }}>{d.baths}</strong> baths
                  </span>
                )}
                {d.sqft != null && (
                  <span>
                    <strong style={{ color: REPORT_COLORS.textDark }}>{d.sqft.toLocaleString()}</strong> sqft
                  </span>
                )}
              </div>
              <ReportRow label="Type" value={d.propertyType} />
              <ReportRow label="Year Built" value={d.yearBuilt} />
              <ReportRow label="Lot Size" value={d.lotSizeSqft ? `${d.lotSizeSqft.toLocaleString()} sqft` : null} />
              <ReportRow
                label="Price per Sqft"
                value={price && d.sqft ? `$${Math.round(price / d.sqft).toLocaleString()}` : null}
              />
              <ReportRow label="Land Tenure" value={d.ownershipType} />
              <ReportRow label="HOA" value={d.associationFee ? `$${d.associationFee}/mo` : null} />
            </div>
          </div>
        </div>

        {/* ═══ Mortgage Payment Estimate ═══ */}
        {monthlyTotal > 0 && price && (
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
              <ReportRow
                label="Principal & Interest"
                value={`$${Math.round(monthlyPI).toLocaleString()}/mo`}
              />
              {monthlyTax > 0 && (
                <ReportRow label="Property Tax" value={`$${Math.round(monthlyTax).toLocaleString()}/mo`} />
              )}
              {monthlyHOA > 0 && (
                <ReportRow label="HOA" value={`$${Math.round(monthlyHOA).toLocaleString()}/mo`} />
              )}
              <ReportRow
                label="Total Interest (30yr)"
                value={fmt$(Math.round(monthlyPI * 360 - loanAmt))}
              />
            </TwoColumnGrid>
          </ReportSection>
        )}

        {/* ═══ Property Facts ═══ */}
        <ReportSection title="Property Information">
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
              <ReportRow label="Roof" value={d.roofType} />
              <ReportRow label="Foundation" value={d.foundationType} />
              <ReportRow label="Heating" value={d.heatingType} />
              <ReportRow label="Cooling" value={d.coolingType} />
              <ReportRow label="Fireplaces" value={d.fireplaceCount} />
              <ReportRow label="Condition" value={d.condition} />
              <ReportRow
                label="Basement"
                value={
                  d.basementType
                    ? `${d.basementType}${d.basementSize ? ` (${d.basementSize.toLocaleString()} sqft)` : ""}`
                    : null
                }
              />
            </TwoColumnGrid>
          </ReportSection>
        )}

        {/* ═══ MLS Description ═══ */}
        {d.listingDescription && (
          <ReportSection title="Description">
            <div
              style={{
                fontSize: 14,
                color: "#374151",
                lineHeight: 1.7,
                padding: "12px 16px",
                background: "#f9fafb",
                borderRadius: 8,
              }}
            >
              {d.listingDescription.substring(0, 800)}
            </div>
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

        {/* ═══ Location Details ═══ */}
        {d.federalData?.floodZone && (
          <ReportSection title="Location Details">
            <TwoColumnGrid>
              <ReportRow label="Flood Zone" value={d.federalData.floodZone} />
              <ReportRow label="Flood Risk" value={d.federalData.floodRisk} />
            </TwoColumnGrid>
          </ReportSection>
        )}

        {/* ═══ Photos ═══ */}
        {photos && photos.length > 0 && (
          <ReportSection title="Photos">
            <PhotoGallery photos={photos.slice(0, 12)} columns={3} />
          </ReportSection>
        )}

        {/* ═══ Market Trends ═══ */}
        {(d.marketStats || d.marketType) && (
          <ReportSection title="Market Trends">
            {d.marketType && <MarketTypeIndicator marketType={d.marketType} />}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              {d.monthsOfInventory != null && (
                <ValueCard label="Months Inventory" value={d.monthsOfInventory.toFixed(1)} />
              )}
              {d.soldToListRatio != null && (
                <ValueCard label="Sold-to-List %" value={`${d.soldToListRatio.toFixed(1)}%`} />
              )}
              {d.marketStats?.avgDOM != null && (
                <ValueCard label="Median DOM" value={String(d.marketStats.avgDOM)} />
              )}
              {d.marketStats?.medianPrice != null && (
                <ValueCard label="Median Sold Price" value={fmt$(d.marketStats.medianPrice)!} />
              )}
            </div>
          </ReportSection>
        )}

        {/* ═══ Neighborhood Demographics ═══ */}
        {demo && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginTop: 32, marginBottom: 16 }}>
              Neighborhood
            </h2>

            <ReportSection title="Housing Stats & Facts">
              <ComparisonTable
                headers={geoHeaders}
                rows={[
                  { label: "Median Home Value", values: geoVal("medianHomeValue", "dollar") },
                  { label: "Median List Price", values: geoVal("medianHouseholdIncome", "dollar") },
                  { label: "Median Age", values: geoVal("medianAge") },
                  {
                    label: "Own %",
                    values: [demo.zip, demo.county, demo.state, demo.national].map((l) => {
                      if (!l?.ownerOccupied || !l?.totalHousingUnits) return "-";
                      return `${Math.round((l.ownerOccupied / l.totalHousingUnits) * 100)}%`;
                    }),
                  },
                  {
                    label: "Rent %",
                    values: [demo.zip, demo.county, demo.state, demo.national].map((l) => {
                      if (!l?.renterOccupied || !l?.totalHousingUnits) return "-";
                      return `${Math.round((l.renterOccupied / l.totalHousingUnits) * 100)}%`;
                    }),
                  },
                ]}
              />
            </ReportSection>

            {/* People Stats */}
            <ReportSection title="People Stats & Facts">
              <ComparisonTable
                headers={geoHeaders}
                rows={[
                  { label: "Population", values: geoVal("totalPopulation", "compact") },
                  { label: "Median Age", values: geoVal("medianAge") },
                  {
                    label: "Households w/ Children",
                    values: geoVal("householdsWithChildrenPct", "pct"),
                  },
                ]}
              />
            </ReportSection>

            {/* Age Distribution */}
            {demo.zip?.ageGroups && (
              <ReportSection title="Population by Age Group">
                <HorizontalBarChart
                  data={[
                    {
                      label: "Under 18",
                      value: demo.zip.ageGroups.under18,
                      displayValue: `${demo.zip.ageGroups.under18}%`,
                    },
                    {
                      label: "18-24",
                      value: demo.zip.ageGroups.from18to24,
                      displayValue: `${demo.zip.ageGroups.from18to24}%`,
                    },
                    {
                      label: "25-34",
                      value: demo.zip.ageGroups.from25to34,
                      displayValue: `${demo.zip.ageGroups.from25to34}%`,
                    },
                    {
                      label: "35-44",
                      value: demo.zip.ageGroups.from35to44,
                      displayValue: `${demo.zip.ageGroups.from35to44}%`,
                    },
                    {
                      label: "45-54",
                      value: demo.zip.ageGroups.from45to54,
                      displayValue: `${demo.zip.ageGroups.from45to54}%`,
                    },
                    {
                      label: "55-64",
                      value: demo.zip.ageGroups.from55to64,
                      displayValue: `${demo.zip.ageGroups.from55to64}%`,
                    },
                    {
                      label: "65+",
                      value: demo.zip.ageGroups.over65,
                      displayValue: `${demo.zip.ageGroups.over65}%`,
                    },
                  ]}
                  labelWidth={80}
                />
              </ReportSection>
            )}

            {/* Income */}
            {demo.zip?.incomeBrackets && (
              <ReportSection title="Household Income Brackets">
                <HorizontalBarChart
                  data={[
                    {
                      label: ">$200K",
                      value: demo.zip.incomeBrackets.over200k,
                      displayValue: `${demo.zip.incomeBrackets.over200k}%`,
                    },
                    {
                      label: "$150K-$200K",
                      value: demo.zip.incomeBrackets.from150kTo200k,
                      displayValue: `${demo.zip.incomeBrackets.from150kTo200k}%`,
                    },
                    {
                      label: "$100K-$150K",
                      value: demo.zip.incomeBrackets.from100kTo150k,
                      displayValue: `${demo.zip.incomeBrackets.from100kTo150k}%`,
                    },
                    {
                      label: "$75K-$100K",
                      value: demo.zip.incomeBrackets.from75kTo100k,
                      displayValue: `${demo.zip.incomeBrackets.from75kTo100k}%`,
                    },
                    {
                      label: "$50K-$75K",
                      value: demo.zip.incomeBrackets.from50kTo75k,
                      displayValue: `${demo.zip.incomeBrackets.from50kTo75k}%`,
                    },
                    {
                      label: "$25K-$50K",
                      value: demo.zip.incomeBrackets.from25kTo50k,
                      displayValue: `${demo.zip.incomeBrackets.from25kTo50k}%`,
                    },
                    {
                      label: "<$25K",
                      value: demo.zip.incomeBrackets.under25k,
                      displayValue: `${demo.zip.incomeBrackets.under25k}%`,
                    },
                  ]}
                  labelWidth={100}
                />
              </ReportSection>
            )}
          </>
        )}

        {/* ═══ Walkability Scores ═══ */}
        {(walkScore != null || amenityScore != null || leisureScore != null) && (
          <ReportSection title="Walkability Scores">
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
              {[
                { label: "Overall Score", value: walkScore },
                { label: "Amenity Score", value: amenityScore },
                { label: "Leisure Score", value: leisureScore },
              ]
                .filter((s) => s.value != null)
                .map((score, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: "50%",
                        border: `4px solid ${REPORT_COLORS.brandBlue}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 8px",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: REPORT_COLORS.textDark }}>
                          {score.value}
                        </div>
                        <div style={{ fontSize: 8, color: REPORT_COLORS.textMuted }}>out of 5</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: REPORT_COLORS.textDark }}>
                      {score.label}
                    </div>
                  </div>
                ))}
            </div>
            <div
              style={{
                marginTop: 16,
                fontSize: 12,
                color: REPORT_COLORS.textMuted,
                lineHeight: 1.6,
                maxWidth: 500,
              }}
            >
              This neighborhood or ZIP code is rated for walking access to general points of interest,
              reflected in the overall score, plus amenities (such as retail stores) and leisure (such as
              restaurants and parks). Other factors considered include street types, weather, public
              transportation and population density.
            </div>
          </ReportSection>
        )}

        {/* ═══ Hazards ═══ */}
        {d.hazards && d.hazards.length > 0 && (
          <ReportSection title="Environmental & Hazard Zones">
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
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>
                    {h.label}
                  </div>
                  <div style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>{h.value}</div>
                </div>
              ))}
            </div>
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
                  c.correlation != null
                    ? `${Math.round(c.correlation <= 1 ? c.correlation * 100 : c.correlation)}%`
                    : "-",
                ],
              }))}
            />
          </ReportSection>
        )}

        <ReportFooter agentName={b.displayName} email={b.email} phone={b.phone || undefined} />
      </div>
    </div>
  );
}
