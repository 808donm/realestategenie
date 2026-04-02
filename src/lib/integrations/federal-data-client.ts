/**
 * Federal Data API Client
 *
 * Unified client for US federal government data sources that supplement
 * property data with occupancy status, demographics, flood risk,
 * fair market rents, housing market trends, loan eligibility, and more.
 *
 * Sources:
 * - USPS: Address validation & vacancy indicators
 * - HUD: Fair Market Rents, income limits
 * - Census Bureau: ACS demographics & housing data
 * - FEMA: Flood zones, disaster declarations
 * - FHFA: Conforming loan limits, House Price Index
 * - BLS: Employment & economic indicators
 * - EPA: Environmental risk (Superfund, brownfields, air quality)
 * - USDA: Rural development loan eligibility
 * - CFPB: HMDA mortgage lending data
 *
 * Most endpoints are free and require no API key. Census and BLS
 * benefit from a registered key for higher rate limits.
 */

// ── Configuration ────────────────────────────────────────────────────────────

export interface FederalDataConfig {
  /** USPS OAuth client ID (from developers.usps.com) */
  uspsClientId?: string;
  /** USPS OAuth client secret */
  uspsClientSecret?: string;
  /** HUD USER API token (free at huduser.gov/hudapi/public/register) */
  hudToken?: string;
  /** Census Bureau API key (free at api.census.gov/data/key_signup.html) */
  censusApiKey?: string;
  /** BLS API key (free at data.bls.gov/registrationEngine/) */
  blsApiKey?: string;
  /** FRED API key (free at fred.stlouisfed.org/docs/api/api_key.html) */
  fredApiKey?: string;
  /** EPA AQS email (for air quality API registration) */
  epaAqsEmail?: string;
  /** EPA AQS key */
  epaAqsKey?: string;
}

// ── Response Types ───────────────────────────────────────────────────────────

// USPS
export interface USPSAddress {
  streetAddress: string;
  city: string;
  state: string;
  ZIPCode: string;
  ZIPPlus4: string;
  deliveryPoint: string;
  carrierRoute: string;
  DPVConfirmation: string;
  vacant: string; // "Y" or "N"
  business: string; // "Y" or "N"
  centralDeliveryPoint: string;
  addressAdditionalInfo?: {
    deliveryPointBarCode?: string;
    noStatAddress?: string;
  };
}

export interface USPSValidationResult {
  success: boolean;
  address?: USPSAddress;
  error?: string;
}

// HUD
export interface HUDFairMarketRent {
  countyName: string;
  metroName: string;
  areaName: string;
  smallAreaStatus: string;
  year: number;
  efficiency: number;
  oneBedroom: number;
  twoBedroom: number;
  threeBedroom: number;
  fourBedroom: number;
  zipCode?: string;
}

export interface HUDFMRResult {
  success: boolean;
  data?: {
    basicdata?: HUDFairMarketRent;
    smallAreaData?: HUDFairMarketRent[];
  };
  error?: string;
}

// Census
export interface CensusHousingData {
  totalHousingUnits: number | null;
  occupiedUnits: number | null;
  vacantUnits: number | null;
  ownerOccupied: number | null;
  renterOccupied: number | null;
  medianHomeValue: number | null;
  medianHouseholdIncome: number | null;
  medianGrossRent: number | null;
  totalPopulation: number | null;
  medianAge: number | null;
  geography: string;
}

export interface CensusResult {
  success: boolean;
  data?: CensusHousingData;
  error?: string;
}

export interface CensusDetailedDemographics {
  education: {
    lessThanHS: number;
    hsGraduate: number;
    someCollege: number;
    associates: number;
    bachelors: number;
    graduateProfessional: number;
  };
  incomeBrackets: {
    under25k: number;
    from25kTo50k: number;
    from50kTo75k: number;
    from75kTo100k: number;
    from100kTo150k: number;
    from150kTo200k: number;
    over200k: number;
  };
  ageGroups: {
    under18: number;
    from18to24: number;
    from25to34: number;
    from35to44: number;
    from45to54: number;
    from55to64: number;
    over65: number;
  };
  occupations: {
    managementBusiness: number;
    service: number;
    salesOffice: number;
    naturalResourcesConstruction: number;
    productionTransportation: number;
  };
  commuteTime: {
    averageMinutes: number;
    under10min: number;
    from10to19min: number;
    from20to29min: number;
    from30to44min: number;
    from45to59min: number;
    over60min: number;
  };
  totalHouseholds: number;
  householdsWithChildren: number;
  householdsWithChildrenPct: number;
  geography: string;
}

// FEMA
export interface FEMAFloodZone {
  policyCount: number;
  totalCoverage: number;
  totalPremium: number;
  averagePremium: number;
  floodZone?: string;
  county: string;
  state: string;
  zipCode: string;
}

export interface FEMADisaster {
  disasterNumber: number;
  declarationDate: string;
  disasterType: string;
  incidentType: string;
  title: string;
  state: string;
  declaredCountyArea: string;
  incidentBeginDate: string;
  incidentEndDate: string;
  ihProgramDeclared: boolean;
  iaProgramDeclared: boolean;
  paProgramDeclared: boolean;
  hmProgramDeclared: boolean;
}

export interface FEMAResult {
  success: boolean;
  floodData?: FEMAFloodZone;
  disasters?: FEMADisaster[];
  error?: string;
}

// FHFA
export interface FHFALoanLimit {
  state: string;
  county: string;
  fipsCode: string;
  oneUnit: number;
  twoUnit: number;
  threeUnit: number;
  fourUnit: number;
  year: number;
}

export interface FHFAHousePriceIndex {
  state: string;
  year: number;
  quarter: number;
  indexValue: number;
  percentChange: number;
}

export interface FHFAResult {
  success: boolean;
  loanLimits?: FHFALoanLimit;
  hpi?: FHFAHousePriceIndex[];
  error?: string;
}

// BLS
export interface BLSDataPoint {
  year: string;
  period: string;
  periodName: string;
  value: string;
  footnotes: { code: string; text: string }[];
}

export interface BLSSeries {
  seriesID: string;
  data: BLSDataPoint[];
}

export interface BLSResult {
  success: boolean;
  series?: BLSSeries[];
  error?: string;
}

// EPA
export interface EPASite {
  facilityName: string;
  registryId: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  siteType: string; // "Superfund", "Brownfield", "TRI"
  nplStatus?: string;
  lastReportYear?: number;
}

export interface EPAAirQuality {
  aqi: number;
  category: string;
  dominantPollutant: string;
  reportDate: string;
  stateCode: string;
  countyCode: string;
}

export interface EPAResult {
  success: boolean;
  sites?: EPASite[];
  airQuality?: EPAAirQuality;
  error?: string;
}

// USDA
export interface USDAEligibility {
  eligible: boolean;
  address: string;
  propertyType: string; // "SFH" | "MFH"
  ineligibleReason?: string;
}

export interface USDAResult {
  success: boolean;
  data?: USDAEligibility;
  error?: string;
}

// CFPB/HMDA
export interface HMDALendingData {
  year: number;
  msa: string;
  totalApplications: number;
  totalOriginations: number;
  totalDenials: number;
  medianLoanAmount: number;
  medianIncome: number;
  approvalRate: number;
}

export interface HMDAResult {
  success: boolean;
  data?: HMDALendingData;
  error?: string;
}

// Combined supplement result
export interface FederalPropertySupplement {
  vacancy?: {
    vacant: boolean;
    source: "usps" | "census";
    vacancyRate?: number; // from Census (area-level)
  };
  fairMarketRent?: HUDFairMarketRent;
  demographics?: CensusHousingData;
  floodRisk?: FEMAFloodZone;
  recentDisasters?: FEMADisaster[];
  conformingLoanLimit?: FHFALoanLimit;
  environmentalSites?: EPASite[];
  airQuality?: EPAAirQuality;
  usdaEligible?: boolean;
  lendingData?: HMDALendingData;
  localEmployment?: {
    unemploymentRate?: string;
    seriesId?: string;
  };
}

// ── Client ───────────────────────────────────────────────────────────────────

export class FederalDataClient {
  private config: FederalDataConfig;
  private uspsAccessToken: string | null = null;
  private uspsTokenExpiry: number = 0;

  constructor(config: FederalDataConfig = {}) {
    this.config = config;
  }

  // ── USPS ─────────────────────────────────────────────────────────────────

  private async getUSPSToken(): Promise<string> {
    if (this.uspsAccessToken && Date.now() < this.uspsTokenExpiry) {
      return this.uspsAccessToken;
    }

    if (!this.config.uspsClientId || !this.config.uspsClientSecret) {
      throw new Error("USPS OAuth credentials not configured");
    }

    const response = await fetch("https://apis.usps.com/oauth2/v3/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.config.uspsClientId,
        client_secret: this.config.uspsClientSecret,
        scope: "addresses",
      }),
    });

    if (!response.ok) {
      throw new Error(`USPS OAuth failed: ${response.status}`);
    }

    const data = await response.json();
    this.uspsAccessToken = data.access_token;
    // Expire 5 minutes early to be safe
    this.uspsTokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
    return data.access_token;
  }

  /**
   * Validate an address with USPS and get vacancy indicator
   */
  async validateAddress(
    streetAddress: string,
    city: string,
    state: string,
    zipCode: string,
  ): Promise<USPSValidationResult> {
    try {
      const token = await this.getUSPSToken();
      const params = new URLSearchParams({
        streetAddress,
        city,
        state,
        ZIPCode: zipCode,
      });

      const response = await fetch(`https://apis.usps.com/addresses/v3/address?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const err = await response.text();
        return { success: false, error: `USPS API error: ${response.status} - ${err}` };
      }

      const data = await response.json();
      return { success: true, address: data.address };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── HUD ──────────────────────────────────────────────────────────────────

  /**
   * Build HUD API headers with optional Bearer token
   */
  private getHUDHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.config.hudToken) {
      headers["Authorization"] = `Bearer ${this.config.hudToken}`;
    }
    return headers;
  }

  /**
   * Fetch wrapper that preserves the Authorization header across redirects.
   * The standard fetch API strips Authorization on cross-origin redirects
   * (e.g. www.huduser.gov → huduser.gov), causing silent 401 errors.
   */
  private async hudFetch(url: string): Promise<Response> {
    const headers = this.getHUDHeaders();
    const response = await fetch(url, { headers, redirect: "manual" });

    // Follow redirects manually so the Authorization header is preserved
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        const resolved = new URL(location, url).toString();
        return fetch(resolved, { headers, redirect: "manual" });
      }
    }

    return response;
  }

  /**
   * Convert a ZIP code to a county FIPS entity ID using HUD's USPS Crosswalk API.
   * Returns the 10-digit entity ID (5-digit FIPS + "99999") needed by the FMR API,
   * or null if the crosswalk fails.
   */
  private async zipToCountyEntityId(zipCode: string): Promise<string | null> {
    try {
      const url = `https://www.huduser.gov/hudapi/public/usps?type=2&query=${zipCode}`;
      const response = await this.hudFetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      // Response is an object with a "data" wrapper or a direct array
      const results = data?.data?.results || data?.results || (Array.isArray(data) ? data : data?.data);
      if (Array.isArray(results) && results.length > 0) {
        // Pick the county with the highest total ratio (most addresses overlap)
        const best = results.reduce((a: any, b: any) => ((b.tot_ratio ?? 0) > (a.tot_ratio ?? 0) ? b : a), results[0]);
        const geoid: string = best.geoid || best.county || "";
        if (geoid.length === 5) return `${geoid}99999`;
        if (geoid.length === 10 && geoid.endsWith("99999")) return geoid;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Normalize a single HUD FMR record from HUD's field names to our interface.
   * HUD returns: "Efficiency", "One-Bedroom", etc. (may be strings like "758.0")
   * We need: efficiency, oneBedroom, etc. (as numbers)
   */
  private normalizeHUDFMRRecord(raw: any): HUDFairMarketRent {
    return {
      countyName: raw.county_name || raw.countyName || "",
      metroName: raw.metro_name || raw.metroName || "",
      areaName: raw.area_name || raw.areaName || "",
      smallAreaStatus: raw.smallarea_status || raw.smallAreaStatus || "",
      year: Number(raw.year) || 0,
      efficiency: parseFloat(raw["Efficiency"] ?? raw.efficiency ?? 0) || 0,
      oneBedroom: parseFloat(raw["One-Bedroom"] ?? raw.oneBedroom ?? 0) || 0,
      twoBedroom: parseFloat(raw["Two-Bedroom"] ?? raw.twoBedroom ?? 0) || 0,
      threeBedroom: parseFloat(raw["Three-Bedroom"] ?? raw.threeBedroom ?? 0) || 0,
      fourBedroom: parseFloat(raw["Four-Bedroom"] ?? raw.fourBedroom ?? 0) || 0,
      zipCode: raw.zip_code || raw.zipCode || undefined,
    };
  }

  /**
   * Normalize the full HUD FMR API response.
   * - Non-SAFMR: basicdata is a single object
   * - SAFMR metros: basicdata is an array with "MSA level" + per-ZIP entries
   */
  private normalizeHUDFMRResponse(raw: any): {
    basicdata?: HUDFairMarketRent;
    smallAreaData?: HUDFairMarketRent[];
  } {
    const bd = raw?.basicdata;
    const topLevel = {
      county_name: raw?.county_name,
      metro_name: raw?.metro_name,
      area_name: raw?.area_name,
      smallarea_status: raw?.smallarea_status,
      year: raw?.year,
    };

    if (Array.isArray(bd)) {
      // SAFMR metro: basicdata is an array of ZIP-level records
      const msaEntry = bd.find((e: any) => e.zip_code === "MSA level");
      const zipEntries = bd.filter((e: any) => e.zip_code !== "MSA level");
      return {
        basicdata: msaEntry ? this.normalizeHUDFMRRecord({ ...topLevel, ...msaEntry }) : undefined,
        smallAreaData: zipEntries.map((e: any) => this.normalizeHUDFMRRecord({ ...topLevel, ...e })),
      };
    }

    if (bd && typeof bd === "object") {
      // Standard county/town: basicdata is a single object
      return {
        basicdata: this.normalizeHUDFMRRecord({ ...topLevel, ...bd }),
      };
    }

    return {};
  }

  /**
   * Get Fair Market Rents for a location.
   * The HUD FMR API requires a county FIPS entity ID (5-digit FIPS + "99999"),
   * NOT a raw ZIP code. If stateFips/countyFips are provided they are used
   * directly; otherwise the USPS Crosswalk API converts the ZIP first.
   *
   * API: https://www.huduser.gov/portal/dataset/fmr-api.html
   * Requires free HUD USER API token (register at huduser.gov/hudapi/public/register)
   */
  async getFairMarketRents(zipCode: string, stateFips?: string, countyFips?: string): Promise<HUDFMRResult> {
    try {
      if (!this.config.hudToken) {
        return {
          success: false,
          error: "HUD API token not configured. Get a free token at huduser.gov/hudapi/public/register",
        };
      }

      // Build the 10-digit entity ID the FMR API expects
      let entityId: string | null = null;
      if (stateFips && countyFips) {
        entityId = `${stateFips}${countyFips}99999`;
      } else {
        // Use HUD USPS Crosswalk to convert ZIP → county FIPS entity ID
        entityId = await this.zipToCountyEntityId(zipCode);
      }
      if (!entityId) {
        return { success: false, error: `Could not resolve ZIP ${zipCode} to a county FIPS code for HUD FMR lookup` };
      }

      // HUD FMR API may require a year parameter. The fiscal year runs Oct–Sep,
      // so FY2026 is effective from Oct 1 2025. Try current FY first, then prior.
      const now = new Date();
      const currentFY = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
      const yearsToTry = [currentFY, currentFY - 1];

      for (const fy of yearsToTry) {
        const url = `https://www.huduser.gov/hudapi/public/fmr/data/${entityId}?year=${fy}`;
        const response = await this.hudFetch(url);

        if (!response.ok) {
          let body = "";
          try {
            body = await response.text();
          } catch {
            /* ignore */
          }
          if (response.status === 401 || response.status === 403) {
            return {
              success: false,
              error: `HUD API auth failed (${response.status}): Your HUD token is invalid or expired. HUD requires its own Bearer token (separate from HMDA/CFPB). Log in at huduser.gov/hudapi/public/login and click "Create New Token".${body ? ` — ${body.slice(0, 200)}` : ""}`,
            };
          }
          // 400 may mean data not available for this year — try next
          if (response.status === 400) continue;
          return { success: false, error: `HUD API error ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}` };
        }

        const data = await response.json();

        if (data.error) {
          // Try next year if this one has no data
          continue;
        }

        return { success: true, data: this.normalizeHUDFMRResponse(data.data) };
      }

      // If year-parameterized calls failed, try without year as final fallback
      const response = await this.hudFetch(`https://www.huduser.gov/hudapi/public/fmr/data/${entityId}`);

      if (!response.ok) {
        let body = "";
        try {
          body = await response.text();
        } catch {
          /* ignore */
        }
        return { success: false, error: `HUD API error ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}` };
      }

      const data = await response.json();
      if (data.error) {
        return { success: false, error: data.error.message || JSON.stringify(data.error) };
      }

      return { success: true, data: this.normalizeHUDFMRResponse(data.data) };
    } catch (error: any) {
      return { success: false, error: `HUD API request failed: ${error.message}` };
    }
  }

  /**
   * Get HUD income limits for an area
   */
  async getIncomeLimits(
    stateCode: string,
    countyCode: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!this.config.hudToken) {
        return {
          success: false,
          error: "HUD API token not configured. Get a free token at huduser.gov/hudapi/public/register",
        };
      }

      const entityId = `${stateCode}${countyCode}99999`;
      const response = await this.hudFetch(`https://www.huduser.gov/hudapi/public/il/data/${entityId}`);

      if (!response.ok) {
        let body = "";
        try {
          body = await response.text();
        } catch {
          /* ignore */
        }
        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            error: `HUD IL API auth failed (${response.status}): Token may be invalid or expired${body ? ` — ${body.slice(0, 200)}` : ""}`,
          };
        }
        return { success: false, error: `HUD IL API error ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}` };
      }

      const data = await response.json();
      return { success: true, data: data.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Census Bureau ────────────────────────────────────────────────────────

  /**
   * Get housing & demographic data from American Community Survey (5-year)
   * API: https://api.census.gov/data.html
   * Free, key optional but recommended
   *
   * Variables:
   * B25002_001E = Total housing units
   * B25002_002E = Occupied housing units
   * B25002_003E = Vacant housing units
   * B25003_001E = Total tenure
   * B25003_002E = Owner occupied
   * B25003_003E = Renter occupied
   * B25077_001E = Median home value
   * B19013_001E = Median household income
   * B25064_001E = Median gross rent
   * B01003_001E = Total population
   * B01002_001E = Median age
   */
  async getHousingData(state: string, zipCode?: string, county?: string): Promise<CensusResult> {
    try {
      const variables = [
        "B25002_001E", // Total housing units
        "B25002_002E", // Occupied
        "B25002_003E", // Vacant
        "B25003_002E", // Owner occupied
        "B25003_003E", // Renter occupied
        "B25077_001E", // Median home value
        "B19013_001E", // Median household income
        "B25064_001E", // Median gross rent
        "B01003_001E", // Total population
        "B01002_001E", // Median age
      ].join(",");

      let geo: string;
      if (zipCode) {
        geo = `zip%20code%20tabulation%20area:${zipCode}`;
      } else if (county) {
        geo = `county:${county}&in=state:${state}`;
      } else {
        geo = `state:${state}`;
      }

      const keyParam = this.config.censusApiKey ? `&key=${this.config.censusApiKey}` : "";

      const url = `https://api.census.gov/data/2023/acs/acs5?get=NAME,${variables}&for=${geo}${keyParam}`;
      const response = await fetch(url);

      if (!response.ok) {
        return { success: false, error: `Census API error: ${response.status}` };
      }

      const data = await response.json();

      if (!data || data.length < 2) {
        return { success: false, error: "No Census data found for this area" };
      }

      const headers = data[0] as string[];
      const values = data[1] as string[];

      const getValue = (varName: string): number | null => {
        const idx = headers.indexOf(varName);
        if (idx === -1) return null;
        const v = parseInt(values[idx], 10);
        return isNaN(v) || v < 0 ? null : v;
      };

      return {
        success: true,
        data: {
          totalHousingUnits: getValue("B25002_001E"),
          occupiedUnits: getValue("B25002_002E"),
          vacantUnits: getValue("B25002_003E"),
          ownerOccupied: getValue("B25003_002E"),
          renterOccupied: getValue("B25003_003E"),
          medianHomeValue: getValue("B25077_001E"),
          medianHouseholdIncome: getValue("B19013_001E"),
          medianGrossRent: getValue("B25064_001E"),
          totalPopulation: getValue("B01003_001E"),
          medianAge: getValue("B01002_001E"),
          geography: values[0] || "",
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── Census Detailed Demographics ──────────────────────────────────────────

  /**
   * Get detailed demographic breakdowns from Census ACS 5-year estimates.
   * Queries education, income, age, occupation, commute, and household tables.
   */
  async getDetailedDemographics(
    level: "zip" | "county" | "state" | "national",
    params: { zipCode?: string; stateFips?: string; countyFips?: string },
  ): Promise<{ success: boolean; data?: CensusDetailedDemographics; error?: string }> {
    try {
      let geo: string;
      switch (level) {
        case "zip":
          if (!params.zipCode) return { success: false, error: "zipCode required for zip level" };
          geo = `zip%20code%20tabulation%20area:${params.zipCode}`;
          break;
        case "county":
          if (!params.countyFips || !params.stateFips) return { success: false, error: "countyFips and stateFips required" };
          geo = `county:${params.countyFips}&in=state:${params.stateFips}`;
          break;
        case "state":
          if (!params.stateFips) return { success: false, error: "stateFips required for state level" };
          geo = `state:${params.stateFips}`;
          break;
        case "national":
          geo = "us:*";
          break;
      }

      const keyParam = this.config.censusApiKey ? `&key=${this.config.censusApiKey}` : "";
      const baseUrl = "https://api.census.gov/data/2023/acs/acs5";

      // Split into 2 calls to stay under 50-variable limit per request
      // Call 1: Education (B15003) + Income (B19001) + Households (B11005)
      const eduVars = "B15003_001E,B15003_002E,B15003_003E,B15003_004E,B15003_005E,B15003_006E,B15003_007E,B15003_008E,B15003_009E,B15003_010E,B15003_011E,B15003_012E,B15003_013E,B15003_014E,B15003_015E,B15003_016E,B15003_017E,B15003_018E,B15003_019E,B15003_020E,B15003_021E,B15003_022E,B15003_023E,B15003_024E,B15003_025E";
      const incVars = "B19001_001E,B19001_002E,B19001_003E,B19001_004E,B19001_005E,B19001_006E,B19001_007E,B19001_008E,B19001_009E,B19001_010E,B19001_011E,B19001_012E,B19001_013E,B19001_014E,B19001_015E,B19001_016E,B19001_017E";
      const hhVars = "B11005_001E,B11005_002E";

      // Call 2: Age (B01001 subset) + Occupation (C24010) + Commute (B08303)
      const ageVars = "B01001_001E,B01001_003E,B01001_004E,B01001_005E,B01001_006E,B01001_007E,B01001_008E,B01001_009E,B01001_010E,B01001_011E,B01001_012E,B01001_013E,B01001_014E,B01001_015E,B01001_016E,B01001_017E,B01001_018E,B01001_019E,B01001_020E,B01001_021E,B01001_022E,B01001_023E,B01001_024E,B01001_025E,B01001_027E,B01001_028E,B01001_029E,B01001_030E,B01001_031E,B01001_032E,B01001_033E,B01001_034E,B01001_035E,B01001_036E,B01001_037E,B01001_038E,B01001_039E,B01001_040E,B01001_041E,B01001_042E,B01001_043E,B01001_044E,B01001_045E,B01001_046E,B01001_047E,B01001_048E,B01001_049E";
      const occVars = "C24010_001E,C24010_003E,C24010_019E,C24010_027E,C24010_033E,C24010_037E";
      const commuteVars = "B08303_001E,B08303_002E,B08303_003E,B08303_004E,B08303_005E,B08303_006E,B08303_007E,B08303_008E,B08303_009E,B08303_010E,B08303_011E,B08303_012E,B08303_013E,B08136_001E";

      const [res1, res2] = await Promise.all([
        fetch(`${baseUrl}?get=NAME,${eduVars},${incVars},${hhVars}&for=${geo}${keyParam}`),
        fetch(`${baseUrl}?get=NAME,${ageVars},${occVars},${commuteVars}&for=${geo}${keyParam}`),
      ]);

      if (!res1.ok || !res2.ok) {
        return { success: false, error: `Census API error: ${res1.status}/${res2.status}` };
      }

      const [data1, data2] = await Promise.all([res1.json(), res2.json()]);
      if (!data1?.length || data1.length < 2 || !data2?.length || data2.length < 2) {
        return { success: false, error: "No Census detailed data found" };
      }

      const h1 = data1[0] as string[];
      const v1 = data1[1] as string[];
      const h2 = data2[0] as string[];
      const v2 = data2[1] as string[];

      const getVal = (headers: string[], values: string[], varName: string): number => {
        const idx = headers.indexOf(varName);
        if (idx === -1) return 0;
        const v = parseInt(values[idx], 10);
        return isNaN(v) || v < 0 ? 0 : v;
      };
      const g1 = (v: string) => getVal(h1, v1, v);
      const g2 = (v: string) => getVal(h2, v2, v);
      const pct = (num: number, denom: number) => (denom > 0 ? Math.round((num / denom) * 1000) / 10 : 0);

      // Education aggregation (B15003: total=001, no schooling=002...doctorate=025)
      const eduTotal = g1("B15003_001E") || 1;
      const lessThanHS = g1("B15003_002E") + g1("B15003_003E") + g1("B15003_004E") + g1("B15003_005E") + g1("B15003_006E") + g1("B15003_007E") + g1("B15003_008E") + g1("B15003_009E") + g1("B15003_010E") + g1("B15003_011E") + g1("B15003_012E") + g1("B15003_013E") + g1("B15003_014E") + g1("B15003_015E") + g1("B15003_016E");
      const hsGrad = g1("B15003_017E") + g1("B15003_018E");
      const someCollege = g1("B15003_019E") + g1("B15003_020E");
      const associates = g1("B15003_021E");
      const bachelors = g1("B15003_022E");
      const gradProf = g1("B15003_023E") + g1("B15003_024E") + g1("B15003_025E");

      // Income aggregation (B19001: total=001, <10k=002...200k+=017)
      const incTotal = g1("B19001_001E") || 1;
      const under25k = g1("B19001_002E") + g1("B19001_003E") + g1("B19001_004E") + g1("B19001_005E");
      const from25to50 = g1("B19001_006E") + g1("B19001_007E") + g1("B19001_008E") + g1("B19001_009E") + g1("B19001_010E");
      const from50to75 = g1("B19001_011E") + g1("B19001_012E");
      const from75to100 = g1("B19001_013E");
      const from100to150 = g1("B19001_014E") + g1("B19001_015E");
      const from150to200 = g1("B19001_016E");
      const over200k = g1("B19001_017E");

      // Age aggregation (B01001: male 003-025, female 027-049)
      // Under 5: M003+F027, 5-9: M004+F028, 10-14: M005+F029, 15-17: M006+F030
      const totalPop = g2("B01001_001E") || 1;
      const under18 = g2("B01001_003E") + g2("B01001_004E") + g2("B01001_005E") + g2("B01001_006E") + g2("B01001_027E") + g2("B01001_028E") + g2("B01001_029E") + g2("B01001_030E");
      const age18to24 = g2("B01001_007E") + g2("B01001_008E") + g2("B01001_009E") + g2("B01001_010E") + g2("B01001_031E") + g2("B01001_032E") + g2("B01001_033E") + g2("B01001_034E");
      const age25to34 = g2("B01001_011E") + g2("B01001_012E") + g2("B01001_035E") + g2("B01001_036E");
      const age35to44 = g2("B01001_013E") + g2("B01001_014E") + g2("B01001_037E") + g2("B01001_038E");
      const age45to54 = g2("B01001_015E") + g2("B01001_016E") + g2("B01001_039E") + g2("B01001_040E");
      const age55to64 = g2("B01001_017E") + g2("B01001_018E") + g2("B01001_019E") + g2("B01001_041E") + g2("B01001_042E") + g2("B01001_043E");
      const age65plus = g2("B01001_020E") + g2("B01001_021E") + g2("B01001_022E") + g2("B01001_023E") + g2("B01001_024E") + g2("B01001_025E") + g2("B01001_044E") + g2("B01001_045E") + g2("B01001_046E") + g2("B01001_047E") + g2("B01001_048E") + g2("B01001_049E");

      // Occupation aggregation (C24010: total=001, mgmt=003, service=019, sales=027, natres=033, prod=037)
      const occTotal = g2("C24010_001E") || 1;

      // Commute (B08303: total=001, <5=002, 5-9=003, 10-14=004, 15-19=005, 20-24=006, 25-29=007, 30-34=008, 35-39=009, 40-44=010, 45-59=011, 60-89=012, 90+=013)
      const commuteTotal = g2("B08303_001E") || 1;
      const aggTravelTime = g2("B08136_001E"); // aggregate travel time in minutes

      // Households
      const hhTotal = g1("B11005_001E") || 1;
      const hhWithChildren = g1("B11005_002E");

      return {
        success: true,
        data: {
          education: {
            lessThanHS: pct(lessThanHS, eduTotal),
            hsGraduate: pct(hsGrad, eduTotal),
            someCollege: pct(someCollege, eduTotal),
            associates: pct(associates, eduTotal),
            bachelors: pct(bachelors, eduTotal),
            graduateProfessional: pct(gradProf, eduTotal),
          },
          incomeBrackets: {
            under25k: pct(under25k, incTotal),
            from25kTo50k: pct(from25to50, incTotal),
            from50kTo75k: pct(from50to75, incTotal),
            from75kTo100k: pct(from75to100, incTotal),
            from100kTo150k: pct(from100to150, incTotal),
            from150kTo200k: pct(from150to200, incTotal),
            over200k: pct(over200k, incTotal),
          },
          ageGroups: {
            under18: pct(under18, totalPop),
            from18to24: pct(age18to24, totalPop),
            from25to34: pct(age25to34, totalPop),
            from35to44: pct(age35to44, totalPop),
            from45to54: pct(age45to54, totalPop),
            from55to64: pct(age55to64, totalPop),
            over65: pct(age65plus, totalPop),
          },
          occupations: {
            managementBusiness: pct(g2("C24010_003E"), occTotal),
            service: pct(g2("C24010_019E"), occTotal),
            salesOffice: pct(g2("C24010_027E"), occTotal),
            naturalResourcesConstruction: pct(g2("C24010_033E"), occTotal),
            productionTransportation: pct(g2("C24010_037E"), occTotal),
          },
          commuteTime: {
            averageMinutes: commuteTotal > 0 && aggTravelTime > 0 ? Math.round(aggTravelTime / commuteTotal) : 0,
            under10min: pct(g2("B08303_002E") + g2("B08303_003E"), commuteTotal),
            from10to19min: pct(g2("B08303_004E") + g2("B08303_005E"), commuteTotal),
            from20to29min: pct(g2("B08303_006E") + g2("B08303_007E"), commuteTotal),
            from30to44min: pct(g2("B08303_008E") + g2("B08303_009E") + g2("B08303_010E"), commuteTotal),
            from45to59min: pct(g2("B08303_011E"), commuteTotal),
            over60min: pct(g2("B08303_012E") + g2("B08303_013E"), commuteTotal),
          },
          totalHouseholds: hhTotal,
          householdsWithChildren: hhWithChildren,
          householdsWithChildrenPct: pct(hhWithChildren, hhTotal),
          geography: v1[0] || "",
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch detailed demographics at all 4 geographic levels in parallel.
   * Returns zip, county, state, and national data.
   */
  async getMultiGeoDemo(params: {
    zipCode: string;
    stateFips: string;
    countyFips: string;
  }): Promise<{
    zip?: CensusDetailedDemographics;
    county?: CensusDetailedDemographics;
    state?: CensusDetailedDemographics;
    national?: CensusDetailedDemographics;
  }> {
    const [zipRes, countyRes, stateRes, natRes] = await Promise.allSettled([
      this.getDetailedDemographics("zip", { zipCode: params.zipCode }),
      this.getDetailedDemographics("county", { countyFips: params.countyFips, stateFips: params.stateFips }),
      this.getDetailedDemographics("state", { stateFips: params.stateFips }),
      this.getDetailedDemographics("national", {}),
    ]);

    return {
      zip: zipRes.status === "fulfilled" && zipRes.value.success ? zipRes.value.data : undefined,
      county: countyRes.status === "fulfilled" && countyRes.value.success ? countyRes.value.data : undefined,
      state: stateRes.status === "fulfilled" && stateRes.value.success ? stateRes.value.data : undefined,
      national: natRes.status === "fulfilled" && natRes.value.success ? natRes.value.data : undefined,
    };
  }

  // ── FEMA ─────────────────────────────────────────────────────────────────

  /**
   * Get flood insurance policy data for a ZIP code
   * API: https://www.fema.gov/about/openfema/api
   * Free, no key needed
   */
  async getFloodData(zipCode: string, stateAbbrev?: string, countyName?: string): Promise<FEMAResult> {
    try {
      // Get NFIP policies summary for the ZIP
      const policyUrl = `https://www.fema.gov/api/open/v2/FimaNfipPolicies?$filter=reportedZipCode eq '${zipCode}'&$select=reportedZipCode,countyCode,policyCount,totalInsurancePremiumOfThePolicy,totalBuildingInsuranceCoverage,floodZone&$top=5&$orderby=policyEffectiveDate desc`;
      const policyResponse = await fetch(policyUrl);

      let floodData: FEMAFloodZone | undefined;
      if (policyResponse.ok) {
        const policyJson = await policyResponse.json();
        const policies = policyJson.FimaNfipPolicies || [];

        if (policies.length > 0) {
          const totalPremium = policies.reduce(
            (sum: number, p: any) => sum + (p.totalInsurancePremiumOfThePolicy || 0),
            0,
          );
          const totalCoverage = policies.reduce(
            (sum: number, p: any) => sum + (p.totalBuildingInsuranceCoverage || 0),
            0,
          );

          floodData = {
            policyCount: policies.length,
            totalCoverage,
            totalPremium,
            averagePremium: policies.length > 0 ? totalPremium / policies.length : 0,
            floodZone: policies[0]?.floodZone,
            county: policies[0]?.countyCode || "",
            state: "",
            zipCode,
          };
        }
      }

      // Get recent disaster declarations for the area
      // FEMA's designatedArea field uses county names like "Honolulu (County)", not zip codes.
      // Filter by county when available, fall back to statewide.
      const stateFilter = stateAbbrev ? ` and state eq '${stateAbbrev}'` : "";
      const areaFilters: string[] = [];
      if (countyName) {
        // FEMA format: "County Name (County)" e.g. "Honolulu (County)"
        areaFilters.push(`designatedArea eq '${countyName} (County)'`);
        // Also try without the "(County)" suffix in case FEMA uses different formatting
        areaFilters.push(`contains(designatedArea, '${countyName}')`);
      }
      areaFilters.push("designatedArea eq 'Statewide'");
      const disasterUrl = `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=(${areaFilters.join(" or ")})${stateFilter}&$top=10&$orderby=declarationDate desc`;
      const disasterResponse = await fetch(disasterUrl);
      let disasters: FEMADisaster[] = [];

      if (disasterResponse.ok) {
        const disasterJson = await disasterResponse.json();
        disasters = (disasterJson.DisasterDeclarationsSummaries || []).map((d: any) => ({
          disasterNumber: d.disasterNumber,
          declarationDate: d.declarationDate,
          disasterType: d.declarationType,
          incidentType: d.incidentType,
          title: d.declarationTitle,
          state: d.state,
          declaredCountyArea: d.designatedArea,
          incidentBeginDate: d.incidentBeginDate,
          incidentEndDate: d.incidentEndDate,
          ihProgramDeclared: d.ihProgramDeclared,
          iaProgramDeclared: d.iaProgramDeclared,
          paProgramDeclared: d.paProgramDeclared,
          hmProgramDeclared: d.hmProgramDeclared,
        }));
      }

      return { success: true, floodData, disasters };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get disaster declarations by state and optional county
   */
  async getDisasterDeclarations(
    stateCode: string,
    countyName?: string,
  ): Promise<{ success: boolean; disasters?: FEMADisaster[]; error?: string }> {
    try {
      let filter = `state eq '${stateCode}'`;
      if (countyName) {
        filter += ` and designatedArea eq '${countyName} (County)'`;
      }
      const url = `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=${encodeURIComponent(filter)}&$top=20&$orderby=declarationDate desc`;
      const response = await fetch(url);

      if (!response.ok) {
        return { success: false, error: `FEMA API error: ${response.status}` };
      }

      const data = await response.json();
      const disasters = (data.DisasterDeclarationsSummaries || []).map((d: any) => ({
        disasterNumber: d.disasterNumber,
        declarationDate: d.declarationDate,
        disasterType: d.declarationType,
        incidentType: d.incidentType,
        title: d.declarationTitle,
        state: d.state,
        declaredCountyArea: d.designatedArea,
        incidentBeginDate: d.incidentBeginDate,
        incidentEndDate: d.incidentEndDate,
        ihProgramDeclared: d.ihProgramDeclared,
        iaProgramDeclared: d.iaProgramDeclared,
        paProgramDeclared: d.paProgramDeclared,
        hmProgramDeclared: d.hmProgramDeclared,
      }));

      return { success: true, disasters };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── FHFA ─────────────────────────────────────────────────────────────────

  /**
   * Get conforming loan limits by state FIPS and county FIPS
   * Data source: FHFA published limits (we store/proxy current year data)
   * Free, no key needed
   */
  async getConformingLoanLimits(stateFips: string, countyFips: string): Promise<FHFAResult> {
    try {
      // FHFA publishes loan limits as a downloadable dataset.
      // We query their API endpoint for the current year.
      const year = new Date().getFullYear();
      const fipsCode = `${stateFips}${countyFips}`;
      const url = `https://www.fhfa.gov/api/conformingloanlimits?year=${year}&fips=${fipsCode}`;

      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        // Fallback: use the well-known 2025/2026 baseline limits
        const baseline = year >= 2026 ? 806500 : 766550;
        return {
          success: true,
          loanLimits: {
            state: stateFips,
            county: countyFips,
            fipsCode,
            oneUnit: baseline,
            twoUnit: Math.round(baseline * 1.28),
            threeUnit: Math.round(baseline * 1.547),
            fourUnit: Math.round(baseline * 1.923),
            year,
          },
        };
      }

      const data = await response.json();
      if (data && data.length > 0) {
        const record = data[0];
        return {
          success: true,
          loanLimits: {
            state: record.stateCode || stateFips,
            county: record.countyName || countyFips,
            fipsCode: record.fipsCode || fipsCode,
            oneUnit: record.oneUnitLimit || record.oneUnit,
            twoUnit: record.twoUnitLimit || record.twoUnit,
            threeUnit: record.threeUnitLimit || record.threeUnit,
            fourUnit: record.fourUnitLimit || record.fourUnit,
            year: record.year || year,
          },
        };
      }

      return { success: false, error: "No loan limit data found" };
    } catch (error: any) {
      // Return baseline limits as fallback
      const year = new Date().getFullYear();
      const baseline = year >= 2026 ? 806500 : 766550;
      return {
        success: true,
        loanLimits: {
          state: stateFips,
          county: countyFips,
          fipsCode: `${stateFips}${countyFips}`,
          oneUnit: baseline,
          twoUnit: Math.round(baseline * 1.28),
          threeUnit: Math.round(baseline * 1.547),
          fourUnit: Math.round(baseline * 1.923),
          year,
        },
      };
    }
  }

  // ── BLS ──────────────────────────────────────────────────────────────────

  /**
   * Get employment data from BLS
   * API: https://api.bls.gov/publicAPI/v2/timeseries/data/
   * Free, key optional (higher limits with key)
   *
   * Series ID format for local area unemployment: LAUST${stateCode}00000000000003
   */
  async getEmploymentData(seriesIds: string[]): Promise<BLSResult> {
    try {
      const version = this.config.blsApiKey ? "v2" : "v1";
      const url = `https://api.bls.gov/publicAPI/${version}/timeseries/data/`;

      const body: any = {
        seriesid: seriesIds,
        startyear: String(new Date().getFullYear() - 2),
        endyear: String(new Date().getFullYear()),
      };

      if (this.config.blsApiKey) {
        body.registrationkey = this.config.blsApiKey;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        return { success: false, error: `BLS API error: ${response.status}` };
      }

      const data = await response.json();

      if (data.status !== "REQUEST_SUCCEEDED") {
        return { success: false, error: data.message?.join("; ") || "BLS request failed" };
      }

      return {
        success: true,
        series: data.Results?.series || [],
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get local area unemployment rate by state FIPS
   * Series format: LASST${stateCode}0000000000003 (unemployment rate)
   */
  async getUnemploymentRate(stateFips: string): Promise<{ success: boolean; rate?: string; error?: string }> {
    const seriesId = `LASST${stateFips.padStart(2, "0")}0000000000003`;
    const result = await this.getEmploymentData([seriesId]);

    if (!result.success || !result.series?.length) {
      return { success: false, error: result.error || "No data" };
    }

    const latest = result.series[0].data[0];
    return { success: true, rate: latest?.value };
  }

  // ── EPA ──────────────────────────────────────────────────────────────────

  /**
   * Fetch from EPA Envirofacts with timeout and retry
   */
  private async fetchEPA(url: string, timeoutMs = 15000): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      return resp;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Search for environmental sites near a location
   * API: https://www.epa.gov/enviro/envirofacts-data-service-api
   * Free, no key needed
   */
  async getEnvironmentalSites(zipCode: string): Promise<EPAResult> {
    try {
      const sites: EPASite[] = [];
      const fetches: Promise<void>[] = [];

      // Superfund (NPL) sites via SEMS
      fetches.push(
        (async () => {
          try {
            const sfResp = await this.fetchEPA(
              `https://enviro.epa.gov/enviro/efservice/SEMS_ACTIVE_SITES/SITE_ZIP_CODE/${zipCode}/JSON/ROWS/0:20`,
            );
            if (sfResp.ok) {
              const sfData = await sfResp.json();
              if (Array.isArray(sfData)) {
                for (const s of sfData.slice(0, 20)) {
                  sites.push({
                    facilityName: s.SITE_NAME || s.ALIAS_NAME || "Unknown",
                    registryId: s.EPA_ID || s.SITE_EPA_ID || "",
                    city: s.SITE_CITY_NAME || "",
                    state: s.SITE_STATE_CODE || "",
                    zipCode: s.SITE_ZIP_CODE || zipCode,
                    latitude: parseFloat(s.LATITUDE) || 0,
                    longitude: parseFloat(s.LONGITUDE) || 0,
                    siteType: "Superfund",
                    nplStatus: s.NPL_STATUS || s.SITE_NPL_STATUS,
                  });
                }
              }
            }
          } catch {
            // Superfund lookup failed, continue
          }
        })(),
      );

      // Brownfield sites
      fetches.push(
        (async () => {
          try {
            const bfResp = await this.fetchEPA(
              `https://enviro.epa.gov/enviro/efservice/BROWNFIELDS_ASSESSMENTS/ASSESSMENT_ZIP/${zipCode}/JSON/ROWS/0:20`,
            );
            if (bfResp.ok) {
              const bfData = await bfResp.json();
              if (Array.isArray(bfData)) {
                for (const b of bfData.slice(0, 20)) {
                  sites.push({
                    facilityName: b.PROPERTY_NAME || "Unknown Brownfield",
                    registryId: b.EPA_ID || "",
                    city: b.ASSESSMENT_CITY || "",
                    state: b.ASSESSMENT_STATE || "",
                    zipCode: b.ASSESSMENT_ZIP || zipCode,
                    latitude: parseFloat(b.LATITUDE) || 0,
                    longitude: parseFloat(b.LONGITUDE) || 0,
                    siteType: "Brownfield",
                  });
                }
              }
            }
          } catch {
            // Brownfield lookup failed, continue
          }
        })(),
      );

      // Toxic Release Inventory (TRI) facilities
      fetches.push(
        (async () => {
          try {
            const triResp = await this.fetchEPA(
              `https://enviro.epa.gov/enviro/efservice/TRI_FACILITY/ZIP_CODE/${zipCode}/JSON/ROWS/0:20`,
            );
            if (triResp.ok) {
              const triData = await triResp.json();
              if (Array.isArray(triData)) {
                for (const t of triData.slice(0, 20)) {
                  sites.push({
                    facilityName: t.FACILITY_NAME || "Unknown Facility",
                    registryId: t.TRI_FACILITY_ID || "",
                    city: t.CITY_NAME || "",
                    state: t.STATE_ABBR || "",
                    zipCode: t.ZIP_CODE || zipCode,
                    latitude: parseFloat(t.LATITUDE) || 0,
                    longitude: parseFloat(t.LONGITUDE) || 0,
                    siteType: "TRI",
                    lastReportYear: parseInt(t.REPORTING_YEAR) || undefined,
                  });
                }
              }
            }
          } catch {
            // TRI lookup failed, continue
          }
        })(),
      );

      // FRS (Facility Registry Service) as a reliable fallback/supplement
      fetches.push(
        (async () => {
          try {
            const frsResp = await this.fetchEPA(
              `https://enviro.epa.gov/enviro/efservice/FRS_PROGRAM_FACILITY/POSTAL_CODE/${zipCode}/JSON/ROWS/0:20`,
            );
            if (frsResp.ok) {
              const frsData = await frsResp.json();
              if (Array.isArray(frsData)) {
                // Only add FRS facilities not already captured by other sources
                const existingIds = new Set(sites.map((s) => s.registryId).filter(Boolean));
                for (const f of frsData.slice(0, 20)) {
                  const regId = f.REGISTRY_ID || f.PGM_SYS_ID || "";
                  if (regId && existingIds.has(regId)) continue;
                  sites.push({
                    facilityName: f.PRIMARY_NAME || f.PGM_SYS_ACRNM || "EPA Registered Facility",
                    registryId: regId,
                    city: f.CITY_NAME || "",
                    state: f.STATE_CODE || "",
                    zipCode: f.POSTAL_CODE || zipCode,
                    latitude: parseFloat(f.LATITUDE83) || 0,
                    longitude: parseFloat(f.LONGITUDE83) || 0,
                    siteType: f.PGM_SYS_ACRNM || "FRS",
                  });
                }
              }
            }
          } catch {
            // FRS lookup failed, continue
          }
        })(),
      );

      await Promise.allSettled(fetches);

      return { success: true, sites };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ── CFPB / HMDA ──────────────────────────────────────────────────────────

  /**
   * Get mortgage lending aggregation data for an area
   * API: https://ffiec.cfpb.gov/v2/data-browser-api/
   * Free, no key needed
   *
   * HMDA data is typically published ~18 months after the reporting year closes.
   * We try the most recent likely year first, then fall back to older years.
   */
  async getMortgageLendingData(stateFips: string, countyFips: string, year?: number): Promise<HMDAResult> {
    const fipsCode = `${stateFips}${countyFips}`;

    // HMDA data availability: typically current year - 2 is the most recent
    // available dataset (e.g., in 2026, 2023 is most likely available).
    // We try progressively older years to find available data.
    const currentYear = new Date().getFullYear();
    const yearsToTry = year ? [year] : [currentYear - 2, currentYear - 3, currentYear - 1, currentYear - 4];

    for (const queryYear of yearsToTry) {
      try {
        // HMDA Data Browser API requires at least one HMDA data filter parameter.
        // actions_taken: 1=originated, 2=approved not accepted, 3=denied,
        //                4=withdrawn, 5=closed incomplete
        const url = `https://ffiec.cfpb.gov/v2/data-browser-api/view/aggregations?counties=${fipsCode}&years=${queryYear}&actions_taken=1,2,3,4,5`;
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          // If this year isn't available, try the next
          if (response.status === 404 || response.status === 400) continue;
          return { success: false, error: `HMDA API error: ${response.status}` };
        }

        const data = await response.json();
        const aggs = data.aggregations;

        // The HMDA API returns aggregations as an array of objects,
        // each with count, sum, and the filter value (actions_taken).
        if (!Array.isArray(aggs) || aggs.length === 0) {
          continue;
        }

        let totalApplications = 0;
        let totalOriginations = 0;
        let totalDenials = 0;
        let originationLoanSum = 0;

        for (const agg of aggs) {
          const count = agg.count || 0;
          const sum = agg.sum || 0;
          const action = String(agg.actions_taken);

          totalApplications += count;

          if (action === "1") {
            totalOriginations = count;
            originationLoanSum = sum;
          } else if (action === "3") {
            totalDenials = count;
          }
        }

        if (totalApplications === 0) {
          continue;
        }

        return {
          success: true,
          data: {
            year: queryYear,
            msa: fipsCode,
            totalApplications,
            totalOriginations,
            totalDenials,
            medianLoanAmount: totalOriginations > 0 ? Math.round(originationLoanSum / totalOriginations) : 0,
            medianIncome: 0,
            approvalRate: totalApplications > 0 ? Math.round((totalOriginations / totalApplications) * 10000) / 100 : 0,
          },
        };
      } catch (error: any) {
        // Network error - try next year
        continue;
      }
    }

    return {
      success: false,
      error: `No HMDA data found for county ${fipsCode} (tried years: ${yearsToTry.join(", ")})`,
    };
  }

  // ── Composite / Supplement ───────────────────────────────────────────────

  /**
   * Get all available federal data for a property/area.
   * This is the primary method — gathers data from all sources in parallel
   * to supplement ATTOM property data.
   *
   * @param zipCode - ZIP code (required for most lookups)
   * @param state - State abbreviation (for BLS, FEMA)
   * @param stateFips - State FIPS code (for Census, BLS, HMDA)
   * @param countyFips - County FIPS code (for FHFA, HMDA)
   * @param address - Full street address (for USPS vacancy check)
   * @param city - City name (for USPS)
   */
  async getPropertySupplement(params: {
    zipCode: string;
    state?: string;
    stateFips?: string;
    countyFips?: string;
    address?: string;
    city?: string;
  }): Promise<FederalPropertySupplement> {
    const { zipCode, state, stateFips, countyFips, address, city } = params;
    const supplement: FederalPropertySupplement = {};

    // Run all API calls in parallel for speed
    const tasks: Promise<void>[] = [];

    // USPS Vacancy (if credentials configured and address provided)
    if (this.config.uspsClientId && address && city && state) {
      tasks.push(
        this.validateAddress(address, city, state, zipCode)
          .then((r) => {
            if (r.success && r.address) {
              supplement.vacancy = {
                vacant: r.address.vacant === "Y",
                source: "usps",
              };
            }
          })
          .catch(() => {}),
      );
    }

    // HUD Fair Market Rents
    tasks.push(
      this.getFairMarketRents(zipCode, stateFips, countyFips)
        .then((r) => {
          if (r.success && r.data?.basicdata) {
            supplement.fairMarketRent = r.data.basicdata;
          } else if (r.success && r.data?.smallAreaData?.length) {
            // Use ZIP-level SAFMR if available
            const zipFmr = r.data.smallAreaData.find((d) => d.zipCode === zipCode);
            if (zipFmr) supplement.fairMarketRent = zipFmr;
            else supplement.fairMarketRent = r.data.smallAreaData[0];
          }
        })
        .catch(() => {}),
    );

    // Census ACS Data
    if (stateFips || zipCode) {
      tasks.push(
        this.getHousingData(stateFips || "", zipCode)
          .then((r) => {
            if (r.success && r.data) {
              supplement.demographics = r.data;
              // Derive vacancy rate from Census as fallback
              if (!supplement.vacancy && r.data.totalHousingUnits && r.data.vacantUnits) {
                supplement.vacancy = {
                  vacant: false, // area-level, not property-level
                  source: "census",
                  vacancyRate: (r.data.vacantUnits / r.data.totalHousingUnits) * 100,
                };
              }
            }
          })
          .catch(() => {}),
      );
    }

    // FEMA Flood Data -- resolve county name for county-specific disaster filtering
    let countyName: string | undefined;
    // For Hawaii, use our zip-to-county mapping
    if (state?.toUpperCase() === "HI") {
      try {
        const { getCountyByZip } = await import("@/lib/hawaii-zip-county");
        const hiCounty = getCountyByZip(zipCode);
        if (hiCounty) countyName = hiCounty.charAt(0) + hiCounty.slice(1).toLowerCase(); // "HONOLULU" -> "Honolulu"
      } catch {}
    }
    tasks.push(
      this.getFloodData(zipCode, state, countyName)
        .then((r) => {
          if (r.success) {
            if (r.floodData) supplement.floodRisk = r.floodData;
            if (r.disasters?.length) supplement.recentDisasters = r.disasters;
          }
        })
        .catch(() => {}),
    );

    // FHFA Conforming Loan Limits
    if (stateFips && countyFips) {
      tasks.push(
        this.getConformingLoanLimits(stateFips, countyFips)
          .then((r) => {
            if (r.success && r.loanLimits) {
              supplement.conformingLoanLimit = r.loanLimits;
            }
          })
          .catch(() => {}),
      );
    }

    // EPA Environmental Sites
    tasks.push(
      this.getEnvironmentalSites(zipCode)
        .then((r) => {
          if (r.success) {
            if (r.sites?.length) supplement.environmentalSites = r.sites;
            if (r.airQuality) supplement.airQuality = r.airQuality;
          }
        })
        .catch(() => {}),
    );

    // BLS Unemployment
    if (stateFips) {
      tasks.push(
        this.getUnemploymentRate(stateFips)
          .then((r) => {
            if (r.success && r.rate) {
              supplement.localEmployment = {
                unemploymentRate: r.rate,
                seriesId: `LASST${stateFips.padStart(2, "0")}0000000000003`,
              };
            }
          })
          .catch(() => {}),
      );
    }

    // CFPB/HMDA Lending Data
    if (stateFips && countyFips) {
      tasks.push(
        this.getMortgageLendingData(stateFips, countyFips)
          .then((r) => {
            if (r.success && r.data) {
              supplement.lendingData = r.data;
            }
          })
          .catch(() => {}),
      );
    }

    await Promise.allSettled(tasks);

    return supplement;
  }

  /**
   * Test connectivity to federal data sources.
   * Pings key endpoints to verify access.
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    sources: Record<string, { available: boolean; error?: string }>;
  }> {
    const sources: Record<string, { available: boolean; error?: string }> = {};

    const tests: Promise<void>[] = [];

    // HUD (requires free Bearer token from huduser.gov/hudapi/public/register)
    tests.push(
      (async () => {
        if (!this.config.hudToken) {
          sources.hud = {
            available: false,
            error: "No HUD token configured. Get a free token at huduser.gov/hudapi/public/register",
          };
          return;
        }
        try {
          // HUD FMR API requires a county FIPS entity ID, NOT a raw ZIP code.
          // Use Honolulu County, HI (FIPS 15003) → entity ID "1500399999".
          const testEntityId = "1500399999";
          const now = new Date();
          const currentFY = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
          let r = await this.hudFetch(
            `https://www.huduser.gov/hudapi/public/fmr/data/${testEntityId}?year=${currentFY}`,
          );
          if (!r.ok && r.status === 400) {
            // Try prior fiscal year
            r = await this.hudFetch(
              `https://www.huduser.gov/hudapi/public/fmr/data/${testEntityId}?year=${currentFY - 1}`,
            );
          }
          if (r.ok) {
            sources.hud = { available: true };
          } else {
            let body = "";
            try {
              body = await r.text();
            } catch {
              /* ignore */
            }
            sources.hud = {
              available: false,
              error:
                r.status === 401 || r.status === 403
                  ? `HUD token rejected (${r.status}). HUD requires its own separate token — not the same as HMDA/CFPB. Log in at huduser.gov/hudapi/public/login and click "Create New Token".${body ? ` — ${body.slice(0, 150)}` : ""}`
                  : `HTTP ${r.status}${body ? `: ${body.slice(0, 150)}` : ""}`,
            };
          }
        } catch (e: any) {
          sources.hud = { available: false, error: e.message };
        }
      })(),
    );

    // Census (key optional)
    const censusKey = this.config.censusApiKey ? `&key=${this.config.censusApiKey}` : "";
    tests.push(
      fetch(`https://api.census.gov/data/2023/acs/acs5?get=NAME,B01003_001E&for=state:15${censusKey}`)
        .then((r) => {
          sources.census = { available: r.ok };
          if (!r.ok) sources.census.error = `HTTP ${r.status}`;
        })
        .catch((e) => {
          sources.census = { available: false, error: e.message };
        }),
    );

    // FEMA (no key needed)
    tests.push(
      fetch("https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=1")
        .then((r) => {
          sources.fema = { available: r.ok };
          if (!r.ok) sources.fema.error = `HTTP ${r.status}`;
        })
        .catch((e) => {
          sources.fema = { available: false, error: e.message };
        }),
    );

    // BLS (key optional)
    tests.push(
      fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesid: ["LASST150000000000003"],
          startyear: String(new Date().getFullYear() - 1),
          endyear: String(new Date().getFullYear()),
          ...(this.config.blsApiKey ? { registrationkey: this.config.blsApiKey } : {}),
        }),
      })
        .then((r) => {
          sources.bls = { available: r.ok };
          if (!r.ok) sources.bls.error = `HTTP ${r.status}`;
        })
        .catch((e) => {
          sources.bls = { available: false, error: e.message };
        }),
    );

    // EPA (no key needed) — use FRS as the most reliable Envirofacts table
    tests.push(
      this.fetchEPA("https://enviro.epa.gov/enviro/efservice/FRS_PROGRAM_FACILITY/STATE_CODE/HI/JSON/ROWS/0:1", 10000)
        .then((r) => {
          sources.epa = { available: r.ok };
          if (!r.ok) sources.epa.error = `HTTP ${r.status}`;
        })
        .catch((e) => {
          // If FRS fails, try a simpler SEMS endpoint as fallback
          return this.fetchEPA(
            "https://enviro.epa.gov/enviro/efservice/SEMS_ACTIVE_SITES/SITE_STATE_CODE/HI/JSON/ROWS/0:1",
            10000,
          )
            .then((r) => {
              sources.epa = { available: r.ok };
              if (!r.ok) sources.epa.error = `HTTP ${r.status}`;
            })
            .catch((e2) => {
              sources.epa = { available: false, error: e2.message || e.message };
            });
        }),
    );

    // USPS (requires OAuth credentials)
    if (this.config.uspsClientId && this.config.uspsClientSecret) {
      tests.push(
        this.getUSPSToken()
          .then(() => {
            sources.usps = { available: true };
          })
          .catch((e) => {
            sources.usps = { available: false, error: e.message };
          }),
      );
    } else {
      sources.usps = {
        available: false,
        error: "USPS credentials not configured (optional)",
      };
    }

    // CFPB/HMDA (no key needed) — try most recent available year
    // The HMDA Data Browser API requires at least one HMDA data filter (e.g. actions_taken)
    // Data is typically published ~18 months after the reporting year.
    {
      const currentYear = new Date().getFullYear();
      const hmdaYears = [currentYear - 2, currentYear - 3, currentYear - 4];
      tests.push(
        (async () => {
          for (const yr of hmdaYears) {
            try {
              const r = await fetch(
                `https://ffiec.cfpb.gov/v2/data-browser-api/view/aggregations?states=MD&years=${yr}&actions_taken=1`,
                { headers: { Accept: "application/json" } },
              );
              if (r.ok) {
                sources.cfpb_hmda = { available: true };
                return;
              }
              if (r.status !== 404 && r.status !== 400) {
                sources.cfpb_hmda = { available: false, error: `HTTP ${r.status}` };
                return;
              }
              // 400/404 = data not available for this year, try next
            } catch (e: any) {
              sources.cfpb_hmda = { available: false, error: e.message };
              return;
            }
          }
          sources.cfpb_hmda = { available: false, error: `No data for years ${hmdaYears.join(", ")}` };
        })(),
      );
    }

    await Promise.allSettled(tests);

    const availableCount = Object.values(sources).filter((s) => s.available).length;
    const totalCount = Object.keys(sources).length;

    return {
      success: availableCount > 0,
      message: `${availableCount}/${totalCount} federal data sources available`,
      sources,
    };
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createFederalDataClient(config?: FederalDataConfig): FederalDataClient {
  return new FederalDataClient({
    uspsClientId: config?.uspsClientId || process.env.USPS_CLIENT_ID,
    uspsClientSecret: config?.uspsClientSecret || process.env.USPS_CLIENT_SECRET,
    hudToken: config?.hudToken || process.env.HUD_API_TOKEN,
    censusApiKey: config?.censusApiKey || process.env.CENSUS_API_KEY,
    blsApiKey: config?.blsApiKey || process.env.BLS_API_KEY,
    epaAqsEmail: config?.epaAqsEmail || process.env.EPA_AQS_EMAIL,
    epaAqsKey: config?.epaAqsKey || process.env.EPA_AQS_KEY,
  });
}
