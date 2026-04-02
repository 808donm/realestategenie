import { jsPDF } from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import type { CensusDetailedDemographics } from "@/lib/integrations/federal-data-client";
import {
  COLORS,
  pdfSafe,
  fmt$,
  fmtPct,
  drawPageHeader,
  applyFootersToAllPages,
  drawCoverPage,
  drawSectionTitle,
  drawValueCards,
  drawHorizontalBarChart,
  drawComparisonTable,
  drawMarketTypeIndicator,
  checkNewPage,
  type AgentBranding,
  type BarChartItem,
  type ComparisonTableRow,
  type ValueCard,
} from "./pdf-report-utils";

// Re-export AgentBranding for backward compatibility
export type { AgentBranding } from "./pdf-report-utils";

export interface ProfileData {
  neighborhoodName: string;
  address: string;
  city: string;
  stateProvince: string;
  zipCode?: string;
  countyName?: string;

  // AI-generated content (existing)
  lifestyleVibe: string;
  locationNarrative: string;
  amenitiesList: {
    parks: string[];
    shopping: string[];
    dining: string[];
    schools: string[];
  };

  // Market data (enhanced)
  marketData?: {
    medianPrice?: string | number;
    daysOnMarket?: number;
    activeInventory?: number;
    pricePerSqFt?: string | number;
    monthsOfInventory?: number;
    soldToListRatio?: number;
    marketType?: "sellers" | "balanced" | "buyers";
    medianSoldPrice?: number;
    totalListings?: number;
  };

  // Multi-geography Census data (new)
  demographics?: {
    zip?: CensusDetailedDemographics & { medianHomeValue?: number | null; medianHouseholdIncome?: number | null; totalPopulation?: number | null; medianAge?: number | null; ownerOccupied?: number | null; renterOccupied?: number | null; totalHousingUnits?: number | null; vacantUnits?: number | null };
    county?: CensusDetailedDemographics & { medianHomeValue?: number | null; medianHouseholdIncome?: number | null; totalPopulation?: number | null; medianAge?: number | null; ownerOccupied?: number | null; renterOccupied?: number | null; totalHousingUnits?: number | null; vacantUnits?: number | null };
    state?: CensusDetailedDemographics & { medianHomeValue?: number | null; medianHouseholdIncome?: number | null; totalPopulation?: number | null; medianAge?: number | null; ownerOccupied?: number | null; renterOccupied?: number | null; totalHousingUnits?: number | null; vacantUnits?: number | null };
    national?: CensusDetailedDemographics & { medianHomeValue?: number | null; medianHouseholdIncome?: number | null; totalPopulation?: number | null; medianAge?: number | null; ownerOccupied?: number | null; renterOccupied?: number | null; totalHousingUnits?: number | null; vacantUnits?: number | null };
  };

  // Schools detail
  schoolsDetail?: Array<{
    name: string;
    type: string;
    gradeRange?: string;
    enrollment?: number;
    studentTeacherRatio?: number;
  }>;

  // Cover map
  mapImageData?: string;

  // Walkability
  walkScore?: number;
}

// ── Helpers ──

const $ = (n?: number | null) => fmt$(n);
const pct = (n?: number | null) => fmtPct(n);
const fmtK = (n?: number | null) => {
  if (n == null) return "-";
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

/**
 * Generate a multi-page Neighborhood Profile PDF with demographic data,
 * market statistics, bar charts, and agent branding.
 */
export function generatePDF(profileData: ProfileData, agentBranding: AgentBranding): Blob {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  const reportType = "Neighborhood Report";
  const subtitle = `${profileData.neighborhoodName} in ${profileData.city}, ${profileData.stateProvince}`;
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const newPageWithHeader = (): number => {
    doc.addPage();
    return drawPageHeader(doc, reportType, pdfSafe(subtitle));
  };

  const ensureSpace = (needed: number): void => {
    y = checkNewPage(doc, y, needed, newPageWithHeader);
  };

  const section = (title: string): void => {
    ensureSpace(30);
    y = drawSectionTitle(doc, title, y, margin);
  };

  const demo = profileData.demographics;
  const geoHeaders = ["", profileData.zipCode || "ZIP", profileData.countyName || "County", profileData.stateProvince || "State", "USA"];

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 1: COVER PAGE
  // ═══════════════════════════════════════════════════════════════════════

  drawCoverPage(doc, {
    reportType,
    title: profileData.neighborhoodName,
    subtitle: `${profileData.city}, ${profileData.stateProvince}`,
    date: dateStr,
    branding: agentBranding,
    mapImageData: profileData.mapImageData || null,
  });

  // ═══════════════════════════════════════════════════════════════════════
  // PAGE 2: HOUSING FACTS & STATS
  // ═══════════════════════════════════════════════════════════════════════

  if (demo) {
    y = newPageWithHeader();

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    doc.text("Housing", margin, y + 4);
    y += 10;

    section("Housing Facts & Stats");

    const geoVal = (field: string): string[] => {
      const levels = [demo.zip, demo.county, demo.state, demo.national];
      return levels.map((level) => {
        if (!level) return "-";
        const val = (level as any)[field];
        if (val == null) return "-";
        if (typeof val === "number") {
          if (field.includes("median") || field.includes("Home") || field.includes("Income") || field.includes("Rent")) return $(val);
          if (field.includes("Pct") || field.includes("pct")) return `${val}%`;
          return fmtK(val);
        }
        return String(val);
      });
    };

    const housingRows: ComparisonTableRow[] = [
      { label: "Median Home Value", values: geoVal("medianHomeValue") },
      { label: "Median Household Income", values: geoVal("medianHouseholdIncome") },
      { label: "Total Population", values: geoVal("totalPopulation") },
      { label: "Median Age", values: geoVal("medianAge") },
      { label: "Total Housing Units", values: geoVal("totalHousingUnits") },
    ];

    // Compute own/rent percentages
    const ownPctRow: string[] = [demo.zip, demo.county, demo.state, demo.national].map((level) => {
      if (!level || !level.ownerOccupied || !level.totalHousingUnits) return "-";
      return `${Math.round(((level.ownerOccupied as number) / (level.totalHousingUnits as number)) * 100)}%`;
    });
    const rentPctRow: string[] = [demo.zip, demo.county, demo.state, demo.national].map((level) => {
      if (!level || !level.renterOccupied || !level.totalHousingUnits) return "-";
      return `${Math.round(((level.renterOccupied as number) / (level.totalHousingUnits as number)) * 100)}%`;
    });

    housingRows.push({ label: "Own %", values: ownPctRow });
    housingRows.push({ label: "Rent %", values: rentPctRow });

    y = drawComparisonTable(doc, geoHeaders, housingRows, margin, y, contentW);
    y += 6;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MARKET TRENDS
  // ═══════════════════════════════════════════════════════════════════════

  if (profileData.marketData) {
    ensureSpace(60);
    section("Market Trends");

    const md = profileData.marketData;

    // Market type indicator
    if (md.marketType) {
      y = drawMarketTypeIndicator(doc, md.marketType, y, margin);
    }

    // Key stats cards
    const marketCards: ValueCard[] = [];
    if (md.monthsOfInventory != null) marketCards.push({ label: "MONTHS INVENTORY", value: md.monthsOfInventory.toFixed(1) });
    if (md.soldToListRatio != null) marketCards.push({ label: "SOLD-TO-LIST", value: `${md.soldToListRatio.toFixed(1)}%` });
    if (md.daysOnMarket != null) marketCards.push({ label: "MEDIAN DOM", value: String(md.daysOnMarket) });
    if (md.medianSoldPrice != null) marketCards.push({ label: "MEDIAN SOLD", value: $(md.medianSoldPrice) });

    if (marketCards.length > 0) {
      ensureSpace(24);
      y = drawValueCards(doc, marketCards, y, margin);
    }

    // Additional market data
    const medPrice = typeof md.medianPrice === "number" ? $(md.medianPrice) : md.medianPrice;
    if (medPrice) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.textMuted);
      doc.text(pdfSafe(`Median List Price: ${medPrice}`), margin, y);
      y += 5;
    }
    if (md.activeInventory != null) {
      doc.text(pdfSafe(`Active Inventory: ${md.activeInventory} listings`), margin, y);
      y += 5;
    }
    const ppsf = typeof md.pricePerSqFt === "number" ? `$${md.pricePerSqFt.toLocaleString()}` : md.pricePerSqFt;
    if (ppsf) {
      doc.text(pdfSafe(`Price per Sqft: ${ppsf}`), margin, y);
      y += 5;
    }
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PEOPLE FACTS & DEMOGRAPHICS
  // ═══════════════════════════════════════════════════════════════════════

  if (demo) {
    y = newPageWithHeader();

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    doc.text("People", margin, y + 4);
    y += 10;

    // People Facts table
    section("People Facts & Stats");

    const peopleRows: ComparisonTableRow[] = [
      { label: "Population", values: [demo.zip, demo.county, demo.state, demo.national].map((l) => l?.totalPopulation != null ? fmtK(l.totalPopulation as number) : "-") },
      { label: "Median Age", values: [demo.zip, demo.county, demo.state, demo.national].map((l) => l?.medianAge != null ? String(l.medianAge) : "-") },
      { label: "Households with Children", values: [demo.zip, demo.county, demo.state, demo.national].map((l) => l?.householdsWithChildrenPct != null ? `${l.householdsWithChildrenPct}%` : "-") },
    ];

    y = drawComparisonTable(doc, geoHeaders, peopleRows, margin, y, contentW);
    y += 8;

    // Education Breakdown (bar charts)
    if (demo.zip?.education) {
      ensureSpace(60);
      section("Education Levels");

      const eduData: BarChartItem[] = [
        { label: "Graduate/Professional", value: demo.zip.education.graduateProfessional, displayValue: `${demo.zip.education.graduateProfessional}%` },
        { label: "Bachelor's Degree", value: demo.zip.education.bachelors, displayValue: `${demo.zip.education.bachelors}%` },
        { label: "Some College", value: demo.zip.education.someCollege, displayValue: `${demo.zip.education.someCollege}%` },
        { label: "Associate's Degree", value: demo.zip.education.associates, displayValue: `${demo.zip.education.associates}%` },
        { label: "High School Graduate", value: demo.zip.education.hsGraduate, displayValue: `${demo.zip.education.hsGraduate}%` },
        { label: "Less than High School", value: demo.zip.education.lessThanHS, displayValue: `${demo.zip.education.lessThanHS}%` },
      ];

      y = drawHorizontalBarChart(doc, eduData, {
        x: margin,
        y,
        width: contentW,
        labelWidth: 55,
        barHeight: 7,
        barGap: 3,
        maxValue: Math.max(...eduData.map((d) => d.value), 1),
        barColor: COLORS.brandBlue,
      });
      y += 6;
    }

    // Age Distribution
    if (demo.zip?.ageGroups) {
      ensureSpace(60);
      section("Age Distribution");

      const ageData: BarChartItem[] = [
        { label: "Under 18", value: demo.zip.ageGroups.under18, displayValue: `${demo.zip.ageGroups.under18}%` },
        { label: "18-24", value: demo.zip.ageGroups.from18to24, displayValue: `${demo.zip.ageGroups.from18to24}%` },
        { label: "25-34", value: demo.zip.ageGroups.from25to34, displayValue: `${demo.zip.ageGroups.from25to34}%` },
        { label: "35-44", value: demo.zip.ageGroups.from35to44, displayValue: `${demo.zip.ageGroups.from35to44}%` },
        { label: "45-54", value: demo.zip.ageGroups.from45to54, displayValue: `${demo.zip.ageGroups.from45to54}%` },
        { label: "55-64", value: demo.zip.ageGroups.from55to64, displayValue: `${demo.zip.ageGroups.from55to64}%` },
        { label: "65+", value: demo.zip.ageGroups.over65, displayValue: `${demo.zip.ageGroups.over65}%` },
      ];

      y = drawHorizontalBarChart(doc, ageData, {
        x: margin,
        y,
        width: contentW,
        labelWidth: 35,
        barHeight: 7,
        barGap: 3,
        maxValue: Math.max(...ageData.map((d) => d.value), 1),
        barColor: COLORS.brandBlue,
      });
      y += 6;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // INCOME & OCCUPATIONS
  // ═══════════════════════════════════════════════════════════════════════

  if (demo?.zip?.incomeBrackets) {
    y = newPageWithHeader();

    section("Household Income Brackets");

    const incomeData: BarChartItem[] = [
      { label: ">$200K", value: demo.zip.incomeBrackets.over200k, displayValue: `${demo.zip.incomeBrackets.over200k}%` },
      { label: "$150K-$200K", value: demo.zip.incomeBrackets.from150kTo200k, displayValue: `${demo.zip.incomeBrackets.from150kTo200k}%` },
      { label: "$100K-$150K", value: demo.zip.incomeBrackets.from100kTo150k, displayValue: `${demo.zip.incomeBrackets.from100kTo150k}%` },
      { label: "$75K-$100K", value: demo.zip.incomeBrackets.from75kTo100k, displayValue: `${demo.zip.incomeBrackets.from75kTo100k}%` },
      { label: "$50K-$75K", value: demo.zip.incomeBrackets.from50kTo75k, displayValue: `${demo.zip.incomeBrackets.from50kTo75k}%` },
      { label: "$25K-$50K", value: demo.zip.incomeBrackets.from25kTo50k, displayValue: `${demo.zip.incomeBrackets.from25kTo50k}%` },
      { label: "<$25K", value: demo.zip.incomeBrackets.under25k, displayValue: `${demo.zip.incomeBrackets.under25k}%` },
    ];

    y = drawHorizontalBarChart(doc, incomeData, {
      x: margin,
      y,
      width: contentW,
      labelWidth: 40,
      barHeight: 7,
      barGap: 3,
      maxValue: Math.max(...incomeData.map((d) => d.value), 1),
      barColor: COLORS.brandBlue,
    });
    y += 10;

    // Occupations
    if (demo.zip.occupations) {
      section("Occupational Categories");

      const occData: BarChartItem[] = [
        { label: "Management/Business", value: demo.zip.occupations.managementBusiness, displayValue: `${demo.zip.occupations.managementBusiness}%` },
        { label: "Service", value: demo.zip.occupations.service, displayValue: `${demo.zip.occupations.service}%` },
        { label: "Sales/Office", value: demo.zip.occupations.salesOffice, displayValue: `${demo.zip.occupations.salesOffice}%` },
        { label: "Construction/Resources", value: demo.zip.occupations.naturalResourcesConstruction, displayValue: `${demo.zip.occupations.naturalResourcesConstruction}%` },
        { label: "Production/Transport", value: demo.zip.occupations.productionTransportation, displayValue: `${demo.zip.occupations.productionTransportation}%` },
      ];

      y = drawHorizontalBarChart(doc, occData, {
        x: margin,
        y,
        width: contentW,
        labelWidth: 55,
        barHeight: 8,
        barGap: 3,
        maxValue: Math.max(...occData.map((d) => d.value), 1),
        barColor: COLORS.brandBlue,
      });
      y += 6;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ECONOMY
  // ═══════════════════════════════════════════════════════════════════════

  if (demo) {
    ensureSpace(60);
    section("Economy");

    const econRows: ComparisonTableRow[] = [
      { label: "Median Household Income", values: [demo.zip, demo.county, demo.state, demo.national].map((l) => l?.medianHouseholdIncome != null ? $(l.medianHouseholdIncome as number) : "-") },
    ];

    // Commute time
    if (demo.zip?.commuteTime?.averageMinutes) {
      econRows.push({
        label: "Avg Commute (minutes)",
        values: [demo.zip, demo.county, demo.state, demo.national].map((l) => l?.commuteTime?.averageMinutes ? String(l.commuteTime.averageMinutes) : "-"),
      });
    }

    y = drawComparisonTable(doc, geoHeaders, econRows, margin, y, contentW);
    y += 6;

    // Commute time distribution
    if (demo.zip?.commuteTime) {
      ensureSpace(55);
      section("Commute Time Distribution");

      const ct = demo.zip.commuteTime;
      const commuteData: BarChartItem[] = [
        { label: "60+ min", value: ct.over60min, displayValue: `${ct.over60min}%` },
        { label: "45-59 min", value: ct.from45to59min, displayValue: `${ct.from45to59min}%` },
        { label: "30-44 min", value: ct.from30to44min, displayValue: `${ct.from30to44min}%` },
        { label: "20-29 min", value: ct.from20to29min, displayValue: `${ct.from20to29min}%` },
        { label: "10-19 min", value: ct.from10to19min, displayValue: `${ct.from10to19min}%` },
        { label: "<10 min", value: ct.under10min, displayValue: `${ct.under10min}%` },
      ];

      y = drawHorizontalBarChart(doc, commuteData, {
        x: margin,
        y,
        width: contentW,
        labelWidth: 35,
        barHeight: 7,
        barGap: 3,
        maxValue: Math.max(...commuteData.map((d) => d.value), 1),
        barColor: COLORS.brandBlue,
      });
      y += 6;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCHOOLS
  // ═══════════════════════════════════════════════════════════════════════

  if (profileData.schoolsDetail && profileData.schoolsDetail.length > 0) {
    ensureSpace(40);
    section("Schools");

    const schoolHeaders = ["School Name", "Type", "Grades", "Enrollment", "S/T Ratio"];
    const schoolRows = profileData.schoolsDetail.slice(0, 15).map((s) => ({
      label: pdfSafe(s.name).substring(0, 30),
      values: [
        s.type || "-",
        s.gradeRange || "-",
        s.enrollment != null ? String(s.enrollment) : "-",
        s.studentTeacherRatio != null ? `${s.studentTeacherRatio.toFixed(1)}:1` : "-",
      ],
    }));

    y = drawComparisonTable(doc, schoolHeaders, schoolRows, margin, y, contentW);
    y += 6;
  } else if (profileData.amenitiesList.schools.length > 0) {
    ensureSpace(30);
    section("Schools & Education");
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textDark);
    profileData.amenitiesList.schools.slice(0, 10).forEach((school) => {
      ensureSpace(6);
      doc.text(pdfSafe(`- ${school}`), margin + 2, y);
      y += 5;
    });
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // WALKABILITY
  // ═══════════════════════════════════════════════════════════════════════

  if (profileData.walkScore != null) {
    ensureSpace(30);
    section("Walkability");

    // Walk Score circle
    const scoreLabel = profileData.walkScore >= 70 ? "Very Walkable" : profileData.walkScore >= 50 ? "Somewhat Walkable" : "Car-Dependent";
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textMuted);
    doc.text(pdfSafe("Walk Score measures pedestrian-friendliness based on nearby amenities, transit access, and walkability infrastructure."), margin, y, { maxWidth: contentW * 0.6 });

    // Score display
    const cx = margin + contentW * 0.8;
    const cy = y + 8;
    const r = 12;
    doc.setDrawColor(...COLORS.brandBlue);
    doc.setLineWidth(1.5);
    doc.circle(cx, cy, r, "S");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.brandBlue);
    doc.text(String(profileData.walkScore), cx, cy + 2, { align: "center" });
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(pdfSafe(scoreLabel), cx, cy + 7, { align: "center" });

    y += 30;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LIFESTYLE & COMMUNITY (AI-generated content)
  // ═══════════════════════════════════════════════════════════════════════

  y = newPageWithHeader();

  section("Lifestyle & Vibe");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.textDark);
  const vibeLines = doc.splitTextToSize(pdfSafe(profileData.lifestyleVibe), contentW);
  vibeLines.slice(0, 20).forEach((line: string) => {
    ensureSpace(5);
    doc.text(line, margin, y);
    y += 4;
  });
  y += 6;

  section("Location Intelligence");
  const locLines = doc.splitTextToSize(pdfSafe(profileData.locationNarrative), contentW);
  locLines.slice(0, 20).forEach((line: string) => {
    ensureSpace(5);
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textDark);
    doc.text(line, margin, y);
    y += 4;
  });
  y += 6;

  // ═══════════════════════════════════════════════════════════════════════
  // LOCAL AMENITIES
  // ═══════════════════════════════════════════════════════════════════════

  const hasAmenities = profileData.amenitiesList.parks.length > 0 || profileData.amenitiesList.shopping.length > 0 || profileData.amenitiesList.dining.length > 0;

  if (hasAmenities) {
    ensureSpace(40);
    section("Local Amenities");

    const renderList = (title: string, items: string[]) => {
      if (items.length === 0) return;
      ensureSpace(10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.brandBlue);
      doc.text(pdfSafe(title), margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.textDark);
      items.slice(0, 8).forEach((item) => {
        ensureSpace(5);
        doc.setFontSize(8);
        doc.text(pdfSafe(`- ${item}`), margin + 4, y);
        y += 4;
      });
      y += 3;
    };

    renderList("Parks & Recreation", profileData.amenitiesList.parks);
    renderList("Shopping", profileData.amenitiesList.shopping);
    renderList("Dining", profileData.amenitiesList.dining);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // APPLY FOOTERS TO ALL PAGES
  // ═══════════════════════════════════════════════════════════════════════

  applyFootersToAllPages(doc, dateStr, agentBranding.displayName);

  return doc.output("blob");
}

/**
 * Generate a Word (.docx) neighborhood profile (basic format, retained from original)
 */
export async function generateDOCX(profileData: ProfileData, agentBranding: AgentBranding): Promise<Blob> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "Neighborhood Profile",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: profileData.neighborhoodName,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `${profileData.city}, ${profileData.stateProvince}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Prepared by: ${agentBranding.displayName}`, break: 1 }),
              ...(agentBranding.licenseNumber ? [new TextRun({ text: `License #: ${agentBranding.licenseNumber}`, break: 1 })] : []),
              new TextRun({ text: `Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, break: 1 }),
            ],
            spacing: { after: 300 },
          }),
          new Paragraph({ text: "1. The Lifestyle & Vibe", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
          new Paragraph({ text: profileData.lifestyleVibe, spacing: { after: 300 } }),
          new Paragraph({ text: "2. Location Intelligence", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
          new Paragraph({ text: profileData.locationNarrative, spacing: { after: 300 } }),
          ...(profileData.marketData
            ? [
                new Paragraph({ text: "3. Market Pulse", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
                new Paragraph({
                  children: [
                    ...(profileData.marketData.medianPrice ? [new TextRun({ text: `Median List Price: ${profileData.marketData.medianPrice}`, break: 1 })] : []),
                    ...(profileData.marketData.daysOnMarket ? [new TextRun({ text: `Avg. Days on Market: ${profileData.marketData.daysOnMarket}`, break: 1 })] : []),
                    ...(profileData.marketData.activeInventory ? [new TextRun({ text: `Active Inventory: ${profileData.marketData.activeInventory} units`, break: 1 })] : []),
                    ...(profileData.marketData.pricePerSqFt ? [new TextRun({ text: `Price per Sq. Ft.: ${profileData.marketData.pricePerSqFt}`, break: 1 })] : []),
                  ],
                  spacing: { after: 300 },
                }),
              ]
            : []),
          new Paragraph({ text: "4. Community Resources", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
          ...profileData.amenitiesList.schools.map((school) => new Paragraph({ text: `- ${school}`, spacing: { after: 50 } })),
          new Paragraph({ text: "5. Local Amenities", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
          ...(profileData.amenitiesList.parks.length > 0
            ? [
                new Paragraph({ children: [new TextRun({ text: "Parks:", bold: true })], spacing: { before: 100, after: 50 } }),
                ...profileData.amenitiesList.parks.map((p) => new Paragraph({ text: `- ${p}`, spacing: { after: 50 } })),
              ]
            : []),
          ...(profileData.amenitiesList.shopping.length > 0
            ? [
                new Paragraph({ children: [new TextRun({ text: "Shopping:", bold: true })], spacing: { before: 100, after: 50 } }),
                ...profileData.amenitiesList.shopping.map((s) => new Paragraph({ text: `- ${s}`, spacing: { after: 50 } })),
              ]
            : []),
          ...(profileData.amenitiesList.dining.length > 0
            ? [
                new Paragraph({ children: [new TextRun({ text: "Dining:", bold: true })], spacing: { before: 100, after: 50 } }),
                ...profileData.amenitiesList.dining.map((d) => new Paragraph({ text: `- ${d}`, spacing: { after: 50 } })),
              ]
            : []),
          new Paragraph({
            text: "DISCLAIMER: Information obtained from third-party sources has not been verified. Complies with Fair Housing Act principles.",
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            text: `${agentBranding.displayName} | ${agentBranding.email}${agentBranding.licenseNumber ? ` | License #: ${agentBranding.licenseNumber}` : ""}`,
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 },
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
