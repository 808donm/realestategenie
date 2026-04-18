/**
 * Shared MLS types + provider-agnostic MLSClient interface.
 *
 * RMLS (RESO DD 1.7) and Trestle (RESO DD 2.0) both return RESO-standard
 * field names, so we can reuse the existing Trestle shapes. Re-exporting
 * here gives downstream code a provider-neutral import path.
 *
 * Routes that used to import TrestleProperty directly should be migrated
 * to import MlsProperty from this module.
 */

import type {
  TrestleProperty,
  TrestleMedia,
  TrestleMember,
  TrestleOffice,
  TrestleOpenHouse,
  TrestlePropertyUnitType,
  ODataResponse,
  TrestleQueryParams,
} from "../integrations/trestle-client";

// Re-export the shapes under provider-neutral names.
export type MlsProperty = TrestleProperty;
export type MlsMedia = TrestleMedia;
export type MlsMember = TrestleMember;
export type MlsOffice = TrestleOffice;
export type MlsOpenHouse = TrestleOpenHouse;
export type MlsPropertyUnitType = TrestlePropertyUnitType;
export type MlsQueryParams = TrestleQueryParams;
export type MlsODataResponse<T> = ODataResponse<T>;

export type MlsProvider = "trestle" | "rmls";

export type MlsSearchOptions = {
  status?: string[];
  city?: string;
  postalCode?: string;
  subdivisionName?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
  propertyType?: string;
  minDaysOnMarket?: number;
  modifiedSince?: Date;
  limit?: number;
  offset?: number;
  includeMedia?: boolean;
  skipCount?: boolean;
  includeRentals?: boolean;
};

export type MlsMemberSearchOptions = {
  name?: string;
  email?: string;
  officeKey?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

/**
 * Provider-neutral MLS client surface.
 *
 * Every method a route calls against a Trestle client must have an
 * equivalent here so the route can depend on the interface, not the
 * concrete provider. Both TrestleClient and RmlsClient implement it.
 */
export interface MLSClient {
  readonly provider: MlsProvider;

  // Raw queries
  getProperties(params?: MlsQueryParams): Promise<MlsODataResponse<MlsProperty>>;
  getProperty(listingKey: string): Promise<MlsProperty>;

  // High-level searches
  searchProperties(options: MlsSearchOptions): Promise<MlsODataResponse<MlsProperty>>;
  searchByListingId(listingId: string): Promise<MlsProperty | null>;

  // Media
  getPropertyMedia(listingKey: string): Promise<MlsODataResponse<MlsMedia>>;

  // Members / Offices
  getMembers(params?: MlsQueryParams): Promise<MlsODataResponse<MlsMember>>;
  getMember(memberKey: string): Promise<MlsMember>;
  searchMembers(options: MlsMemberSearchOptions): Promise<MlsODataResponse<MlsMember>>;
  getOffices(params?: MlsQueryParams): Promise<MlsODataResponse<MlsOffice>>;
  getOffice(officeKey: string): Promise<MlsOffice>;

  // Open houses
  getOpenHouses(params?: MlsQueryParams): Promise<MlsODataResponse<MlsOpenHouse>>;
  getUpcomingOpenHouses(options: { listingKey?: string; daysAhead?: number; limit?: number }): Promise<MlsODataResponse<MlsOpenHouse>>;

  // Sales history (closed transactions for a specific address). The existing
  // Trestle implementation splits results into unit-level vs building-level
  // matches for condo addresses. RMLS doesn't have the same address parser —
  // it returns everything in `unit` with an empty `building` array.
  getSalesHistory(
    address: string,
    options?: { city?: string; postalCode?: string; limit?: number },
  ): Promise<{ unit: MlsProperty[]; building: MlsProperty[]; unitNumber?: string }>;

  // Multi-family unit types
  getPropertyUnits(listingKey: string): Promise<MlsODataResponse<MlsPropertyUnitType>>;

  // Health. Return shape tolerates both { ok } and { success } for backwards
  // compatibility with the existing TrestleClient.testConnection response.
  testConnection(): Promise<{ ok?: boolean; success?: boolean; message?: string; totalListings?: number; data?: unknown }>;
  getMetadata(): Promise<string>;
}

/** True if either `ok` or `success` is set in the test-connection result. */
export function isConnectionOk(r: { ok?: boolean; success?: boolean }): boolean {
  return r.ok === true || r.success === true;
}
