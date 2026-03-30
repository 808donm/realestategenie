/**
 * Centralized AVM (Automated Valuation Model) Service
 *
 * Single source of truth for property valuations across the entire app.
 * Uses RentCast's /avm/value endpoint as the primary AVM source.
 * Results are cached by normalized address so every touchpoint gets
 * the same value for the same property.
 */

import type { RentcastComparable, RentcastSubjectProperty } from "./rentcast-client";
import { getConfiguredRentcastClient } from "./property-data-service";
import { normalizeAddress } from "./property-data-service";
import {
  buildPropertyCacheKey,
  propertyCacheGet,
  propertyCacheSet,
  propertyDbRead,
  propertyDbWrite,
} from "./property-data-cache";

export interface AvmResult {
  value: number;
  low: number;
  high: number;
}

export interface AvmWithComps extends AvmResult {
  comparables: RentcastComparable[];
  subjectProperty?: RentcastSubjectProperty;
}

export interface AvmParams {
  address: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  propertyType?: string;
  compCount?: number;
}

/**
 * Normalize an address into a stable cache key for AVM lookups.
 * Strips unit numbers, special chars, and lowercases so that
 * "94-1037 Kahuamoku St, Apt 5, Waipahu, HI 96797" and
 * "94-1037 Kahuamoku St Apt 5 Waipahu HI 96797" produce the same key.
 */
function avmCacheKey(address: string): string {
  return buildPropertyCacheKey("unified", "avm", { addr: normalizeAddress(address) });
}

/**
 * Get a property's AVM with comparables.
 *
 * Checks memory cache, then DB cache, then calls RentCast.
 * All callers across the app share the same cache, so the first
 * call for a given address fetches from RentCast and all subsequent
 * calls return the cached value.
 */
export async function getPropertyAvm(params: AvmParams): Promise<AvmWithComps | null> {
  if (!params.address) return null;

  const cacheKey = avmCacheKey(params.address);

  // Layer 1: Memory cache
  const memoryCached = propertyCacheGet(cacheKey);
  if (memoryCached?.data) {
    return memoryCached.data as AvmWithComps;
  }

  // Layer 2: DB cache
  const dbCached = await propertyDbRead(cacheKey, "avm");
  if (dbCached?.data) {
    propertyCacheSet(cacheKey, dbCached.data, "unified");
    return dbCached.data as AvmWithComps;
  }

  // Layer 3: Fetch from RentCast
  const client = await getConfiguredRentcastClient();
  if (!client) return null;

  try {
    const avmParams: Record<string, any> = {
      address: params.address,
      compCount: params.compCount ?? 15,
    };
    if (params.latitude) avmParams.latitude = params.latitude;
    if (params.longitude) avmParams.longitude = params.longitude;
    if (params.bedrooms) avmParams.bedrooms = params.bedrooms;
    if (params.bathrooms) avmParams.bathrooms = params.bathrooms;
    if (params.squareFootage) avmParams.squareFootage = params.squareFootage;
    if (params.propertyType) avmParams.propertyType = params.propertyType;

    const estimate = await client.getValueEstimate(avmParams);

    if (!estimate?.price) return null;

    const result: AvmWithComps = {
      value: estimate.price,
      low: estimate.priceRangeLow,
      high: estimate.priceRangeHigh,
      comparables: estimate.comparables || [],
      subjectProperty: estimate.subjectProperty,
    };

    // Cache the result
    console.log(`[AVM Service] Cached AVM for "${params.address}": $${result.value.toLocaleString()}`);
    propertyCacheSet(cacheKey, result, "unified");
    propertyDbWrite(cacheKey, "avm", result, "unified").catch(() => {});

    return result;
  } catch (err: any) {
    console.warn(`[AVM Service] RentCast AVM failed for "${params.address}": ${err.message}`);
    return null;
  }
}

/**
 * Simple AVM lookup -- returns just value/low/high without comparables.
 */
export async function getPropertyAvmSimple(params: AvmParams): Promise<AvmResult | null> {
  const result = await getPropertyAvm(params);
  if (!result) return null;
  return { value: result.value, low: result.low, high: result.high };
}
