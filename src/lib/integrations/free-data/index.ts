/**
 * Free Data Sources — Drop-in replacements for ATTOM neighborhood/supplemental data
 *
 * All sources are free public APIs, most requiring no API key.
 * Optional keys (FRED) provide higher rate limits.
 */

export { searchSchoolsByLocation, searchSchoolsByZip } from "./nces-schools-client";
export type { SchoolResult, SchoolSearchResult } from "./nces-schools-client";

export { getCrimeIndicesByState, getCrimeIndicesByFips } from "./fbi-crime-client";
export type { CrimeIndices } from "./fbi-crime-client";

export { getHazardRiskProfile } from "./usgs-hazards-client";
export type { HazardRiskProfile } from "./usgs-hazards-client";

export { searchPOI } from "./osm-poi-client";
export type { POIResult, POISearchResult } from "./osm-poi-client";

export { getSalesTrends, getNationalSalesTrends, getStateSalesTrends } from "./fred-trends-client";
export type { SalesTrendData, SalesTrendsResult } from "./fred-trends-client";

export { getNeighborhoodProfile } from "./neighborhood-profile-service";
export type { NeighborhoodProfileResult } from "./neighborhood-profile-service";
