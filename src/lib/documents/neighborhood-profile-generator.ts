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

  // Market MoM trend indicators
  marketTrends?: {
    medianPriceMoM?: number;
    inventoryMoM?: number;
    domMoM?: number;
    soldToListMoM?: number;
    medianEstimatedValue?: number;
    estimatedValueMoM?: number;
    estimatedValue12Mo?: number;
  };

  // Sold home stats (distributions for bar charts)
  soldHomeStats?: {
    priceRanges?: Array<{ label: string; count: number }>;
    pricePerSqftRanges?: Array<{ label: string; count: number }>;
    sizeRanges?: Array<{ label: string; count: number }>;
    ageRanges?: Array<{ label: string; count: number }>;
    bedroomCounts?: Array<{ label: string; count: number }>;
  };

  // Households with children
  householdsWithChildren?: {
    marriedWithChildren?: number;
    marriedWithoutChildren?: number;
    singleWithChildren?: number;
  };

  // Transportation modes (how people get to work)
  transportationModes?: Array<{ label: string; count: number }>;

  // Quality of life
  qualityOfLife?: {
    elevation?: number;
    annualRainfall?: number;
    avgJanMin?: number;
    avgJanMax?: number;
    avgJulMin?: number;
    avgJulMax?: number;
    commuteMinutes?: number;
    superfundSites?: number;
    brownfieldSites?: boolean;
  };

  // Nearby neighborhoods
  nearbyNeighborhoods?: Array<{
    name: string;
    medianValue?: number;
    numberOfHomes?: number;
    population?: number;
  }>;

  // Population density & change
  populationDensity?: number;
  populationChange?: number;
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

    // Additional market data rows
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textDark);
    const medPrice = typeof md.medianPrice === "number" ? $(md.medianPrice) : md.medianPrice;
    if (medPrice) {
      ensureSpace(6);
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Median List Price:", margin, y);
      doc.setTextColor(...COLORS.textDark);
      doc.text(pdfSafe(String(medPrice)), margin + 40, y);
      y += 5;
    }
    if (md.activeInventory != null) {
      ensureSpace(6);
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Active Inventory:", margin, y);
      doc.setTextColor(...COLORS.textDark);
      doc.text(pdfSafe(`${md.activeInventory} listings`), margin + 40, y);
      y += 5;
    }
    const ppsf = typeof md.pricePerSqFt === "number" ? `$${md.pricePerSqFt.toLocaleString()}` : md.pricePerSqFt;
    if (ppsf) {
      ensureSpace(6);
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Price per Sqft:", margin, y);
      doc.setTextColor(...COLORS.textDark);
      doc.text(pdfSafe(String(ppsf)), margin + 40, y);
      y += 5;
    }

    // MoM trend indicators
    const mt = profileData.marketTrends;
    if (mt) {
      y += 2;
      const trend = (label: string, v?: number) => {
        if (v == null) return;
        ensureSpace(6);
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.textMuted);
        doc.text(pdfSafe(label), margin, y);
        const arrow = v > 0 ? "+" : "";
        const color = v > 0 ? COLORS.greenAccent : v < 0 ? COLORS.redAccent : COLORS.textMuted;
        doc.setTextColor(color[0], color[1], color[2]);
        doc.setFont("helvetica", "bold");
        doc.text(pdfSafe(`${arrow}${v.toFixed(1)}% MoM`), margin + 40, y);
        doc.setFont("helvetica", "normal");
        y += 5;
      };
      trend("Median Price", mt.medianPriceMoM);
      trend("Inventory", mt.inventoryMoM);
      trend("Days on Market", mt.domMoM);
      trend("Sold-to-List", mt.soldToListMoM);

      // Median Estimated Value summary
      if (mt.medianEstimatedValue != null) {
        ensureSpace(20);
        y += 4;
        doc.setFillColor(...COLORS.lightBlueBg);
        doc.roundedRect(margin - 2, y - 4, contentW + 4, 16, 2, 2, "F");
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.textMuted);
        doc.text("Median Estimated Value", margin, y);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.brandBlue);
        doc.text(pdfSafe($(mt.medianEstimatedValue)), margin + 50, y + 2);
        if (mt.estimatedValueMoM != null) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text(pdfSafe(`MoM: ${mt.estimatedValueMoM > 0 ? "+" : ""}${mt.estimatedValueMoM.toFixed(1)}%`), margin + 105, y);
        }
        if (mt.estimatedValue12Mo != null) {
          doc.text(pdfSafe(`12-Mo: ${mt.estimatedValue12Mo > 0 ? "+" : ""}${mt.estimatedValue12Mo.toFixed(1)}%`), margin + 105, y + 5);
        }
        y += 18;
      }
    }
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SOLD HOME STATS (bar chart distributions)
  // ═══════════════════════════════════════════════════════════════════════

  if (profileData.soldHomeStats) {
    const shs = profileData.soldHomeStats;

    const drawDistChart = (title: string, items: Array<{ label: string; count: number }>) => {
      if (!items || items.length === 0) return;
      ensureSpace(10 + items.length * 10);
      section(title);
      const chartData: BarChartItem[] = items.map((item) => ({
        label: item.label,
        value: item.count,
        displayValue: String(item.count),
      }));
      y = drawHorizontalBarChart(doc, chartData, {
        x: margin,
        y,
        width: contentW,
        labelWidth: 45,
        barHeight: 7,
        barGap: 3,
        maxValue: Math.max(...chartData.map((d) => d.value), 1),
        barColor: COLORS.brandBlue,
        showValues: true,
      });
      y += 6;
    };

    if (shs.priceRanges) drawDistChart("Price Range of Homes Sold", shs.priceRanges);
    if (shs.pricePerSqftRanges) drawDistChart("Price per Sqft of Homes Sold", shs.pricePerSqftRanges);
    if (shs.sizeRanges) drawDistChart("Size of Homes Sold", shs.sizeRanges);
    if (shs.ageRanges) drawDistChart("Age of Homes Sold", shs.ageRanges);
    if (shs.bedroomCounts) drawDistChart("Bedrooms in Homes Sold", shs.bedroomCounts);
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
    ];
    if (profileData.populationDensity != null) {
      peopleRows.push({ label: "Pop. Density / Sq Mi", values: [fmtK(profileData.populationDensity), "-", "-", "-"] });
    }
    if (profileData.populationChange != null) {
      peopleRows.push({ label: "Pop. Change since 2020", values: [`${profileData.populationChange > 0 ? "+" : ""}${profileData.populationChange.toFixed(1)}%`, "-", "-", "-"] });
    }

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
  // HOUSEHOLDS WITH CHILDREN
  // ═══════════════════════════════════════════════════════════════════════

  if (profileData.householdsWithChildren) {
    const hc = profileData.householdsWithChildren;
    if (hc.marriedWithChildren || hc.marriedWithoutChildren || hc.singleWithChildren) {
      ensureSpace(40);
      section("Households with Children");

      const hhData: BarChartItem[] = [];
      if (hc.marriedWithoutChildren) hhData.push({ label: "Married w/o Children", value: hc.marriedWithoutChildren, displayValue: fmtK(hc.marriedWithoutChildren) });
      if (hc.marriedWithChildren) hhData.push({ label: "Married with Children", value: hc.marriedWithChildren, displayValue: fmtK(hc.marriedWithChildren) });
      if (hc.singleWithChildren) hhData.push({ label: "Single with Children", value: hc.singleWithChildren, displayValue: fmtK(hc.singleWithChildren) });

      y = drawHorizontalBarChart(doc, hhData, {
        x: margin,
        y,
        width: contentW,
        labelWidth: 55,
        barHeight: 8,
        barGap: 4,
        maxValue: Math.max(...hhData.map((d) => d.value), 1),
        barColor: COLORS.brandBlue,
        showValues: true,
      });
      y += 6;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TRANSPORTATION MODES
  // ═══════════════════════════════════════════════════════════════════════

  if (profileData.transportationModes && profileData.transportationModes.length > 0) {
    ensureSpace(10 + profileData.transportationModes.length * 10);
    section("How People Get to Work");

    const transData: BarChartItem[] = profileData.transportationModes.map((t) => ({
      label: t.label,
      value: t.count,
      displayValue: fmtK(t.count),
    }));

    y = drawHorizontalBarChart(doc, transData, {
      x: margin,
      y,
      width: contentW,
      labelWidth: 55,
      barHeight: 8,
      barGap: 3,
      maxValue: Math.max(...transData.map((d) => d.value), 1),
      barColor: COLORS.brandBlue,
      showValues: true,
    });
    y += 6;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // QUALITY OF LIFE
  // ═══════════════════════════════════════════════════════════════════════

  if (profileData.qualityOfLife) {
    const qol = profileData.qualityOfLife;
    ensureSpace(60);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    doc.text("Quality of Life", margin, y + 4);
    y += 10;

    section("Quality of Life Facts");

    if (qol.elevation != null) {
      ensureSpace(6);
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Elevation (ft):", margin, y);
      doc.setTextColor(...COLORS.textDark);
      doc.text(String(qol.elevation), margin + 40, y);
      y += 5;
    }
    if (qol.annualRainfall != null) {
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Annual Rainfall (in):", margin, y);
      doc.setTextColor(...COLORS.textDark);
      doc.text(qol.annualRainfall.toFixed(1), margin + 40, y);
      y += 5;
    }
    if (qol.commuteMinutes != null) {
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Avg Commute (min):", margin, y);
      doc.setTextColor(...COLORS.textDark);
      doc.text(String(qol.commuteMinutes), margin + 40, y);
      y += 5;
    }
    if (qol.superfundSites != null) {
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Superfund Sites:", margin, y);
      doc.setTextColor(...COLORS.textDark);
      doc.text(String(qol.superfundSites), margin + 40, y);
      y += 5;
    }
    if (qol.brownfieldSites != null) {
      doc.setTextColor(...COLORS.textMuted);
      doc.text("Brownfield Sites:", margin, y);
      doc.setTextColor(...COLORS.textDark);
      doc.text(qol.brownfieldSites ? "Yes" : "No", margin + 40, y);
      y += 5;
    }

    // Temperature summary
    if (qol.avgJanMin != null && qol.avgJulMax != null) {
      y += 4;
      ensureSpace(16);
      section("Average Temperature");
      const tempCards: ValueCard[] = [];
      if (qol.avgJanMin != null) tempCards.push({ label: "JAN MIN", value: `${qol.avgJanMin}F` });
      if (qol.avgJanMax != null) tempCards.push({ label: "JAN MAX", value: `${qol.avgJanMax}F` });
      if (qol.avgJulMin != null) tempCards.push({ label: "JUL MIN", value: `${qol.avgJulMin}F` });
      if (qol.avgJulMax != null) tempCards.push({ label: "JUL MAX", value: `${qol.avgJulMax}F` });
      if (tempCards.length > 0) {
        ensureSpace(24);
        y = drawValueCards(doc, tempCards, y, margin);
      }
    }
    y += 6;
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
  // NEARBY NEIGHBORHOODS
  // ═══════════════════════════════════════════════════════════════════════

  if (profileData.nearbyNeighborhoods && profileData.nearbyNeighborhoods.length > 0) {
    ensureSpace(40);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textDark);
    doc.text("Nearby Neighborhoods", margin, y + 4);
    y += 12;

    // Render as a grid of neighborhood cards (2 columns)
    const nbrs = profileData.nearbyNeighborhoods.slice(0, 6);
    const colW = (contentW - 6) / 2;

    for (let i = 0; i < nbrs.length; i += 2) {
      ensureSpace(30);
      for (let col = 0; col < 2 && i + col < nbrs.length; col++) {
        const nb = nbrs[i + col];
        const x = margin + col * (colW + 6);

        doc.setFillColor(...COLORS.cardBg);
        doc.roundedRect(x, y - 2, colW, 22, 2, 2, "F");
        doc.setDrawColor(...COLORS.lightGray);
        doc.roundedRect(x, y - 2, colW, 22, 2, 2, "S");

        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...COLORS.brandBlue);
        doc.text(pdfSafe(nb.name.substring(0, 35)), x + 3, y + 3);

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.textDark);
        if (nb.medianValue != null) doc.text(pdfSafe(`Median Value: ${$(nb.medianValue)}`), x + 3, y + 9);
        if (nb.numberOfHomes != null) doc.text(pdfSafe(`Homes: ${fmtK(nb.numberOfHomes)}`), x + 3, y + 14);
        if (nb.population != null) doc.text(pdfSafe(`Population: ${fmtK(nb.population)}`), x + 3, y + 19);
      }
      y += 28;
    }
    y += 4;
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
