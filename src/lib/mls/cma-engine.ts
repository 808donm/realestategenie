/**
 * CMA (Comparative Market Analysis) Engine
 *
 * Pulls comparable properties from Trestle and computes market analytics:
 * - Price per sqft (active, pending, sold)
 * - Median/average list price and close price
 * - Days on market statistics
 * - Suggested list price range
 */
import type { TrestleProperty, TrestleClient } from "@/lib/integrations/trestle-client";

export interface CMAComp {
  listingKey: string;
  listingId: string;
  address: string;
  city: string;
  postalCode: string;
  status: string;
  listPrice: number;
  closePrice: number | null;
  pricePerSqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  livingArea: number | null;
  yearBuilt: number | null;
  dom: number | null;
  onMarketDate: string | null;
  closeDate: string | null;
  photoUrl: string | null;
  distance?: string;
}

export interface CMAStats {
  totalComps: number;
  activeComps: number;
  pendingComps: number;
  soldComps: number;
  avgListPrice: number;
  medianListPrice: number;
  avgClosePrice: number;
  medianClosePrice: number;
  avgPricePerSqft: number;
  medianPricePerSqft: number;
  avgDOM: number;
  medianDOM: number;
  suggestedPriceLow: number;
  suggestedPriceHigh: number;
  listToSaleRatio: number;
}

export interface CMAReport {
  subjectAddress: string;
  subjectCity: string;
  subjectPostalCode: string;
  subjectListPrice: number | null;
  subjectBeds: number | null;
  subjectBaths: number | null;
  subjectSqft: number | null;
  subjectYearBuilt: number | null;
  subjectPropertyType: string | null;
  comps: CMAComp[];
  stats: CMAStats;
  generatedAt: string;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function getAddress(p: TrestleProperty): string {
  if (p.UnparsedAddress) return p.UnparsedAddress;
  return [p.StreetNumber, p.StreetName, p.StreetSuffix].filter(Boolean).join(" ") || "Unknown";
}

function getPhotoUrl(p: TrestleProperty): string | null {
  if (p.Media && p.Media.length > 0) {
    const sorted = [...p.Media].sort((a, b) => (a.Order || 0) - (b.Order || 0));
    return sorted[0].MediaURL;
  }
  return null;
}

function calculateDOM(p: TrestleProperty): number | null {
  if (!p.OnMarketDate) return null;
  const onMarket = new Date(p.OnMarketDate).getTime();
  const endDate = p.CloseDate ? new Date(p.CloseDate).getTime() : Date.now();
  return Math.max(0, Math.floor((endDate - onMarket) / 86400000));
}

/**
 * Generate a CMA report for a subject property.
 *
 * Pulls Active, Pending, and Closed comps from the same postal code
 * (or city if postal code yields too few results).
 */
export async function generateCMA(
  client: TrestleClient,
  options: {
    postalCode: string;
    city?: string;
    subjectListPrice?: number;
    subjectBeds?: number;
    subjectBaths?: number;
    subjectSqft?: number;
    subjectYearBuilt?: number;
    subjectPropertyType?: string;
    subjectAddress?: string;
    maxComps?: number;
  }
): Promise<CMAReport> {
  const maxComps = options.maxComps || 25;

  // Pull recently sold (Closed) comps - last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [activeResult, pendingResult, soldResult] = await Promise.all([
    client.searchProperties({
      status: ["Active"],
      postalCode: options.postalCode,
      propertyType: options.subjectPropertyType,
      limit: maxComps,
      includeMedia: true,
      skipCount: true,
    }),
    client.searchProperties({
      status: ["Pending"],
      postalCode: options.postalCode,
      propertyType: options.subjectPropertyType,
      limit: maxComps,
      includeMedia: true,
      skipCount: true,
    }),
    client.searchProperties({
      status: ["Closed"],
      postalCode: options.postalCode,
      propertyType: options.subjectPropertyType,
      modifiedSince: sixMonthsAgo,
      limit: maxComps,
      includeMedia: true,
      skipCount: true,
    }),
  ]);

  const allProperties = [
    ...activeResult.value,
    ...pendingResult.value,
    ...soldResult.value,
  ];

  // Convert to CMAComp format
  const comps: CMAComp[] = allProperties.map((p) => {
    const sqft = p.LivingArea || null;
    const price = p.ClosePrice || p.ListPrice;
    return {
      listingKey: p.ListingKey,
      listingId: p.ListingId,
      address: getAddress(p),
      city: p.City,
      postalCode: p.PostalCode,
      status: p.StandardStatus,
      listPrice: p.ListPrice,
      closePrice: p.ClosePrice || null,
      pricePerSqft: sqft && sqft > 0 ? Math.round(price / sqft) : null,
      bedrooms: p.BedroomsTotal || null,
      bathrooms: p.BathroomsTotalInteger || null,
      livingArea: sqft,
      yearBuilt: p.YearBuilt || null,
      dom: calculateDOM(p),
      onMarketDate: p.OnMarketDate || null,
      closeDate: p.CloseDate || null,
      photoUrl: getPhotoUrl(p),
    };
  });

  // Calculate stats
  const listPrices = comps.map((c) => c.listPrice).filter((p) => p > 0);
  const closePrices = comps.filter((c) => c.closePrice).map((c) => c.closePrice!);
  const pricesPerSqft = comps.filter((c) => c.pricePerSqft).map((c) => c.pricePerSqft!);
  const domValues = comps.filter((c) => c.dom !== null).map((c) => c.dom!);

  const avgClosePrice = average(closePrices);
  const medianClosePrice = median(closePrices);
  const avgPricePerSqft = average(pricesPerSqft);
  const medianPricePerSqft = median(pricesPerSqft);

  // Suggested price range based on comps
  let suggestedPriceLow = 0;
  let suggestedPriceHigh = 0;

  if (options.subjectSqft && medianPricePerSqft > 0) {
    // Price per sqft method
    const lowPsf = pricesPerSqft.length > 0 ? pricesPerSqft.sort((a, b) => a - b)[Math.floor(pricesPerSqft.length * 0.25)] : medianPricePerSqft * 0.9;
    const highPsf = pricesPerSqft.length > 0 ? pricesPerSqft.sort((a, b) => a - b)[Math.floor(pricesPerSqft.length * 0.75)] : medianPricePerSqft * 1.1;
    suggestedPriceLow = Math.round(lowPsf * options.subjectSqft);
    suggestedPriceHigh = Math.round(highPsf * options.subjectSqft);
  } else if (closePrices.length > 0) {
    // Close price method
    const sorted = [...closePrices].sort((a, b) => a - b);
    suggestedPriceLow = sorted[Math.floor(sorted.length * 0.25)];
    suggestedPriceHigh = sorted[Math.floor(sorted.length * 0.75)];
  }

  // List-to-sale ratio
  let listToSaleRatio = 0;
  const soldComps = comps.filter((c) => c.status === "Closed" && c.closePrice && c.listPrice > 0);
  if (soldComps.length > 0) {
    const ratios = soldComps.map((c) => c.closePrice! / c.listPrice);
    listToSaleRatio = Math.round(average(ratios) * 1000) / 10; // e.g., 97.5%
  }

  const stats: CMAStats = {
    totalComps: comps.length,
    activeComps: comps.filter((c) => c.status === "Active").length,
    pendingComps: comps.filter((c) => c.status === "Pending").length,
    soldComps: soldComps.length,
    avgListPrice: Math.round(average(listPrices)),
    medianListPrice: Math.round(median(listPrices)),
    avgClosePrice: Math.round(avgClosePrice),
    medianClosePrice: Math.round(medianClosePrice),
    avgPricePerSqft: Math.round(avgPricePerSqft),
    medianPricePerSqft: Math.round(medianPricePerSqft),
    avgDOM: Math.round(average(domValues)),
    medianDOM: Math.round(median(domValues)),
    suggestedPriceLow,
    suggestedPriceHigh,
    listToSaleRatio,
  };

  return {
    subjectAddress: options.subjectAddress || "",
    subjectCity: options.city || "",
    subjectPostalCode: options.postalCode,
    subjectListPrice: options.subjectListPrice || null,
    subjectBeds: options.subjectBeds || null,
    subjectBaths: options.subjectBaths || null,
    subjectSqft: options.subjectSqft || null,
    subjectYearBuilt: options.subjectYearBuilt || null,
    subjectPropertyType: options.subjectPropertyType || null,
    comps,
    stats,
    generatedAt: new Date().toISOString(),
  };
}
