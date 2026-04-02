"use client";

import React from "react";
import type { ProfileData } from "@/lib/documents/neighborhood-profile-generator";
import {
  ReportHeader,
  ReportSection,
  ReportRow,
  ReportFooter,
  ValueCard,
  TwoColumnGrid,
  MarketTypeIndicator,
  ComparisonTable,
  HorizontalBarChart,
  PageBreak,
  fmt$,
  fmtPct,
  fmtK,
} from "./report-components";

interface AgentBranding {
  displayName: string;
  email: string;
  phone?: string | null;
  licenseNumber?: string | null;
}

interface Props {
  data: ProfileData;
  branding: AgentBranding;
  date?: string;
}

export default function NeighborhoodReportView({ data: d, branding: b, date }: Props) {
  const dateStr = date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const demo = d.demographics;

  const geoHeaders = ["", d.zipCode || "ZIP", d.countyName || "County", d.stateProvince || "State", "USA"];

  // Helper to extract a field from all 4 geographic levels
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
        reportType="Neighborhood Report"
        title={d.neighborhoodName}
        subtitle={`${d.city}, ${d.stateProvince}`}
        agentName={b.displayName}
        licenseNumber={b.licenseNumber || undefined}
        date={dateStr}
      />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 60px" }}>

        {/* ═══ Map ═══ */}
        {d.mapImageData && (
          <div style={{ marginBottom: 24, borderRadius: 10, overflow: "hidden" }}>
            <img src={d.mapImageData} alt="Neighborhood map" style={{ width: "100%", height: "auto" }} />
          </div>
        )}

        {/* ═══ Housing Facts & Stats ═══ */}
        {demo && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 16 }}>Housing</h2>
            <ReportSection title="Housing Facts & Stats">
              <ComparisonTable
                headers={geoHeaders}
                rows={[
                  { label: "Median Home Value", values: geoVal("medianHomeValue", "dollar") },
                  { label: "Median Household Income", values: geoVal("medianHouseholdIncome", "dollar") },
                  { label: "Total Population", values: geoVal("totalPopulation", "compact") },
                  { label: "Median Age", values: geoVal("medianAge") },
                  { label: "Total Housing Units", values: geoVal("totalHousingUnits", "compact") },
                  {
                    label: "Own %",
                    values: [demo.zip, demo.county, demo.state, demo.national].map((l) => {
                      if (!l || !(l as any).ownerOccupied || !(l as any).totalHousingUnits) return "-";
                      return `${Math.round(((l as any).ownerOccupied / (l as any).totalHousingUnits) * 100)}%`;
                    }),
                  },
                  {
                    label: "Rent %",
                    values: [demo.zip, demo.county, demo.state, demo.national].map((l) => {
                      if (!l || !(l as any).renterOccupied || !(l as any).totalHousingUnits) return "-";
                      return `${Math.round(((l as any).renterOccupied / (l as any).totalHousingUnits) * 100)}%`;
                    }),
                  },
                ]}
              />
            </ReportSection>
          </>
        )}

        {/* ═══ Market Trends ═══ */}
        {d.marketData && (
          <ReportSection title="Market Trends">
            {d.marketData.marketType && <MarketTypeIndicator marketType={d.marketData.marketType} />}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              {d.marketData.monthsOfInventory != null && <ValueCard label="Months Inventory" value={d.marketData.monthsOfInventory.toFixed(1)} />}
              {d.marketData.soldToListRatio != null && <ValueCard label="Sold-to-List" value={`${d.marketData.soldToListRatio.toFixed(1)}%`} />}
              {d.marketData.daysOnMarket != null && <ValueCard label="Median DOM" value={String(d.marketData.daysOnMarket)} />}
              {d.marketData.medianSoldPrice != null && <ValueCard label="Median Sold" value={fmt$(d.marketData.medianSoldPrice)!} />}
            </div>
            <TwoColumnGrid>
              <ReportRow label="Median List Price" value={typeof d.marketData.medianPrice === "number" ? fmt$(d.marketData.medianPrice) : d.marketData.medianPrice} />
              <ReportRow label="Active Inventory" value={d.marketData.activeInventory != null ? `${d.marketData.activeInventory} listings` : null} />
              <ReportRow label="Price per Sqft" value={typeof d.marketData.pricePerSqFt === "number" ? `$${d.marketData.pricePerSqFt.toLocaleString()}` : d.marketData.pricePerSqFt} />
            </TwoColumnGrid>
          </ReportSection>
        )}

        {/* ═══ People ═══ */}
        {demo && (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginTop: 32, marginBottom: 16 }}>People</h2>

            <ReportSection title="People Facts & Stats">
              <ComparisonTable
                headers={geoHeaders}
                rows={[
                  { label: "Population", values: geoVal("totalPopulation", "compact") },
                  { label: "Median Age", values: geoVal("medianAge") },
                  { label: "Households w/ Children", values: geoVal("householdsWithChildrenPct", "pct") },
                ]}
              />
            </ReportSection>

            {/* Education */}
            {demo.zip?.education && (
              <ReportSection title="Education Levels">
                <HorizontalBarChart
                  data={[
                    { label: "Graduate/Professional", value: demo.zip.education.graduateProfessional, displayValue: `${demo.zip.education.graduateProfessional}%` },
                    { label: "Bachelor's Degree", value: demo.zip.education.bachelors, displayValue: `${demo.zip.education.bachelors}%` },
                    { label: "Some College", value: demo.zip.education.someCollege, displayValue: `${demo.zip.education.someCollege}%` },
                    { label: "Associate's Degree", value: demo.zip.education.associates, displayValue: `${demo.zip.education.associates}%` },
                    { label: "High School Graduate", value: demo.zip.education.hsGraduate, displayValue: `${demo.zip.education.hsGraduate}%` },
                    { label: "Less than High School", value: demo.zip.education.lessThanHS, displayValue: `${demo.zip.education.lessThanHS}%` },
                  ]}
                  labelWidth={160}
                />
              </ReportSection>
            )}

            {/* Age Distribution */}
            {demo.zip?.ageGroups && (
              <ReportSection title="Age Distribution">
                <HorizontalBarChart
                  data={[
                    { label: "Under 18", value: demo.zip.ageGroups.under18, displayValue: `${demo.zip.ageGroups.under18}%` },
                    { label: "18-24", value: demo.zip.ageGroups.from18to24, displayValue: `${demo.zip.ageGroups.from18to24}%` },
                    { label: "25-34", value: demo.zip.ageGroups.from25to34, displayValue: `${demo.zip.ageGroups.from25to34}%` },
                    { label: "35-44", value: demo.zip.ageGroups.from35to44, displayValue: `${demo.zip.ageGroups.from35to44}%` },
                    { label: "45-54", value: demo.zip.ageGroups.from45to54, displayValue: `${demo.zip.ageGroups.from45to54}%` },
                    { label: "55-64", value: demo.zip.ageGroups.from55to64, displayValue: `${demo.zip.ageGroups.from55to64}%` },
                    { label: "65+", value: demo.zip.ageGroups.over65, displayValue: `${demo.zip.ageGroups.over65}%` },
                  ]}
                  labelWidth={80}
                />
              </ReportSection>
            )}
          </>
        )}

        {/* ═══ Income & Occupations ═══ */}
        {demo?.zip?.incomeBrackets && (
          <>
            <ReportSection title="Household Income Brackets">
              <HorizontalBarChart
                data={[
                  { label: ">$200K", value: demo.zip.incomeBrackets.over200k, displayValue: `${demo.zip.incomeBrackets.over200k}%` },
                  { label: "$150K-$200K", value: demo.zip.incomeBrackets.from150kTo200k, displayValue: `${demo.zip.incomeBrackets.from150kTo200k}%` },
                  { label: "$100K-$150K", value: demo.zip.incomeBrackets.from100kTo150k, displayValue: `${demo.zip.incomeBrackets.from100kTo150k}%` },
                  { label: "$75K-$100K", value: demo.zip.incomeBrackets.from75kTo100k, displayValue: `${demo.zip.incomeBrackets.from75kTo100k}%` },
                  { label: "$50K-$75K", value: demo.zip.incomeBrackets.from50kTo75k, displayValue: `${demo.zip.incomeBrackets.from50kTo75k}%` },
                  { label: "$25K-$50K", value: demo.zip.incomeBrackets.from25kTo50k, displayValue: `${demo.zip.incomeBrackets.from25kTo50k}%` },
                  { label: "<$25K", value: demo.zip.incomeBrackets.under25k, displayValue: `${demo.zip.incomeBrackets.under25k}%` },
                ]}
                labelWidth={100}
              />
            </ReportSection>

            {demo.zip.occupations && (
              <ReportSection title="Occupational Categories">
                <HorizontalBarChart
                  data={[
                    { label: "Management/Business", value: demo.zip.occupations.managementBusiness, displayValue: `${demo.zip.occupations.managementBusiness}%` },
                    { label: "Service", value: demo.zip.occupations.service, displayValue: `${demo.zip.occupations.service}%` },
                    { label: "Sales/Office", value: demo.zip.occupations.salesOffice, displayValue: `${demo.zip.occupations.salesOffice}%` },
                    { label: "Construction/Resources", value: demo.zip.occupations.naturalResourcesConstruction, displayValue: `${demo.zip.occupations.naturalResourcesConstruction}%` },
                    { label: "Production/Transport", value: demo.zip.occupations.productionTransportation, displayValue: `${demo.zip.occupations.productionTransportation}%` },
                  ]}
                  labelWidth={160}
                />
              </ReportSection>
            )}
          </>
        )}

        {/* ═══ Economy ═══ */}
        {demo && (
          <ReportSection title="Economy">
            <ComparisonTable
              headers={geoHeaders}
              rows={[
                { label: "Median Household Income", values: geoVal("medianHouseholdIncome", "dollar") },
                ...(demo.zip?.commuteTime?.averageMinutes
                  ? [{
                      label: "Avg Commute (minutes)",
                      values: [demo.zip, demo.county, demo.state, demo.national].map((l) =>
                        (l as any)?.commuteTime?.averageMinutes ? String((l as any).commuteTime.averageMinutes) : "-"
                      ),
                    }]
                  : []),
              ]}
            />

            {/* Commute Distribution */}
            {demo.zip?.commuteTime && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Commute Time Distribution</h4>
                <HorizontalBarChart
                  data={[
                    { label: "60+ min", value: demo.zip.commuteTime.over60min, displayValue: `${demo.zip.commuteTime.over60min}%` },
                    { label: "45-59 min", value: demo.zip.commuteTime.from45to59min, displayValue: `${demo.zip.commuteTime.from45to59min}%` },
                    { label: "30-44 min", value: demo.zip.commuteTime.from30to44min, displayValue: `${demo.zip.commuteTime.from30to44min}%` },
                    { label: "20-29 min", value: demo.zip.commuteTime.from20to29min, displayValue: `${demo.zip.commuteTime.from20to29min}%` },
                    { label: "10-19 min", value: demo.zip.commuteTime.from10to19min, displayValue: `${demo.zip.commuteTime.from10to19min}%` },
                    { label: "<10 min", value: demo.zip.commuteTime.under10min, displayValue: `${demo.zip.commuteTime.under10min}%` },
                  ]}
                  labelWidth={80}
                />
              </div>
            )}
          </ReportSection>
        )}

        {/* ═══ Schools ═══ */}
        {d.schoolsDetail && d.schoolsDetail.length > 0 && (
          <ReportSection title="Schools">
            <ComparisonTable
              headers={["School Name", "Type", "Grades", "Enrollment", "S/T Ratio"]}
              rows={d.schoolsDetail.slice(0, 15).map((s) => ({
                label: s.name.substring(0, 30),
                values: [
                  s.type || "-",
                  s.gradeRange || "-",
                  s.enrollment != null ? String(s.enrollment) : "-",
                  s.studentTeacherRatio != null ? `${s.studentTeacherRatio.toFixed(1)}:1` : "-",
                ],
              }))}
            />
          </ReportSection>
        )}

        {/* ═══ Walkability ═══ */}
        {d.walkScore != null && (
          <ReportSection title="Walkability">
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ fontSize: 13, color: "#6b7280", maxWidth: 400, lineHeight: 1.6 }}>
                Walk Score measures pedestrian-friendliness based on nearby amenities, transit access, and walkability infrastructure.
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    border: `4px solid ${d.walkScore >= 70 ? "#15803d" : d.walkScore >= 50 ? "#eab308" : "#dc2626"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>{d.walkScore}</div>
                  <div style={{ fontSize: 9, color: "#6b7280" }}>out of 100</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginTop: 4 }}>
                  {d.walkScore >= 70 ? "Very Walkable" : d.walkScore >= 50 ? "Somewhat Walkable" : "Car-Dependent"}
                </div>
              </div>
            </div>
          </ReportSection>
        )}

        {/* ═══ Lifestyle & Vibe ═══ */}
        <ReportSection title="Lifestyle & Vibe">
          <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>{d.lifestyleVibe}</div>
        </ReportSection>

        {/* ═══ Location Intelligence ═══ */}
        <ReportSection title="Location Intelligence">
          <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>{d.locationNarrative}</div>
        </ReportSection>

        {/* ═══ Local Amenities ═══ */}
        {(d.amenitiesList.parks.length > 0 || d.amenitiesList.shopping.length > 0 || d.amenitiesList.dining.length > 0) && (
          <ReportSection title="Local Amenities">
            {d.amenitiesList.parks.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 6 }}>Parks & Recreation</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {d.amenitiesList.parks.slice(0, 10).map((p, i) => (
                    <span key={i} style={{ padding: "4px 10px", background: "#ecfdf5", borderRadius: 6, fontSize: 12, color: "#15803d" }}>{p}</span>
                  ))}
                </div>
              </div>
            )}
            {d.amenitiesList.shopping.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 6 }}>Shopping</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {d.amenitiesList.shopping.slice(0, 10).map((s, i) => (
                    <span key={i} style={{ padding: "4px 10px", background: "#eff6ff", borderRadius: 6, fontSize: 12, color: "#1e40af" }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            {d.amenitiesList.dining.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 6 }}>Dining</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {d.amenitiesList.dining.slice(0, 10).map((r, i) => (
                    <span key={i} style={{ padding: "4px 10px", background: "#fef3c7", borderRadius: 6, fontSize: 12, color: "#92400e" }}>{r}</span>
                  ))}
                </div>
              </div>
            )}
          </ReportSection>
        )}

        {/* Schools from AI content (fallback if no schoolsDetail) */}
        {(!d.schoolsDetail || d.schoolsDetail.length === 0) && d.amenitiesList.schools.length > 0 && (
          <ReportSection title="Schools & Education">
            {d.amenitiesList.schools.slice(0, 10).map((s, i) => (
              <div key={i} style={{ padding: "4px 0", fontSize: 13, color: "#374151" }}>- {s}</div>
            ))}
          </ReportSection>
        )}

        <ReportFooter agentName={b.displayName} email={b.email} phone={b.phone || undefined} />
      </div>
    </div>
  );
}
