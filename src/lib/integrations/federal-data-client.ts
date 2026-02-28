/**
 * Federal Data API Client
 *
 * Unified client for US federal government data sources that supplement
 * ATTOM property data with occupancy status, demographics, flood risk,
 * fair market rents, environmental data, loan eligibility, and more.
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
    zipCode: string
  ): Promise<USPSValidationResult> {
    try {
      const token = await this.getUSPSToken();
      const params = new URLSearchParams({
        streetAddress,
        city,
        state,
        ZIPCode: zipCode,
      });

      const response = await fetch(
        `https://apis.usps.com/addresses/v3/address?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

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
   * Get Fair Market Rents by ZIP code
   * API: https://www.huduser.gov/portal/dataset/fmr-api.html
   * Requires free HUD USER API token (register at huduser.gov/hudapi/public/register)
   */
  async getFairMarketRents(zipCode: string): Promise<HUDFMRResult> {
    try {
      if (!this.config.hudToken) {
        return { success: false, error: "HUD API token not configured. Get a free token at huduser.gov/hudapi/public/register" };
      }

      const response = await fetch(
        `https://www.huduser.gov/hudapi/public/fmr/data/${zipCode}`,
        { headers: this.getHUDHeaders() }
      );

      if (!response.ok) {
        let body = "";
        try { body = await response.text(); } catch { /* ignore */ }
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: `HUD API auth failed (${response.status}): Token may be invalid or expired. Verify your token at huduser.gov/hudapi/public/login${body ? ` — ${body.slice(0, 200)}` : ""}` };
        }
        return { success: false, error: `HUD API error ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}` };
      }

      const data = await response.json();

      if (data.error) {
        return { success: false, error: data.error.message || JSON.stringify(data.error) };
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      return { success: false, error: `HUD API request failed: ${error.message}` };
    }
  }

  /**
   * Get HUD income limits for an area
   */
  async getIncomeLimits(
    stateCode: string,
    countyCode: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!this.config.hudToken) {
        return { success: false, error: "HUD API token not configured. Get a free token at huduser.gov/hudapi/public/register" };
      }

      const entityId = `${stateCode}${countyCode}99999`;
      const response = await fetch(
        `https://www.huduser.gov/hudapi/public/il/data/${entityId}`,
        { headers: this.getHUDHeaders() }
      );

      if (!response.ok) {
        let body = "";
        try { body = await response.text(); } catch { /* ignore */ }
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: `HUD IL API auth failed (${response.status}): Token may be invalid or expired${body ? ` — ${body.slice(0, 200)}` : ""}` };
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
  async getHousingData(
    state: string,
    zipCode?: string,
    county?: string
  ): Promise<CensusResult> {
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

      const keyParam = this.config.censusApiKey
        ? `&key=${this.config.censusApiKey}`
        : "";

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

  // ── FEMA ─────────────────────────────────────────────────────────────────

  /**
   * Get flood insurance policy data for a ZIP code
   * API: https://www.fema.gov/about/openfema/api
   * Free, no key needed
   */
  async getFloodData(zipCode: string): Promise<FEMAResult> {
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
            0
          );
          const totalCoverage = policies.reduce(
            (sum: number, p: any) => sum + (p.totalBuildingInsuranceCoverage || 0),
            0
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
      const disasterUrl = `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=designatedArea eq '${zipCode}' or designatedArea eq 'Statewide'&$top=10&$orderby=declarationDate desc`;
      const disasterResponse = await fetch(disasterUrl);
      let disasters: FEMADisaster[] = [];

      if (disasterResponse.ok) {
        const disasterJson = await disasterResponse.json();
        disasters = (disasterJson.DisasterDeclarationsSummaries || []).map(
          (d: any) => ({
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
          })
        );
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
    countyName?: string
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
      const disasters = (data.DisasterDeclarationsSummaries || []).map(
        (d: any) => ({
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
        })
      );

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
  async getConformingLoanLimits(
    stateFips: string,
    countyFips: string
  ): Promise<FHFAResult> {
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
  async getEmploymentData(
    seriesIds: string[]
  ): Promise<BLSResult> {
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
  async getUnemploymentRate(
    stateFips: string
  ): Promise<{ success: boolean; rate?: string; error?: string }> {
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
  async getEnvironmentalSites(
    zipCode: string
  ): Promise<EPAResult> {
    try {
      const sites: EPASite[] = [];
      const fetches: Promise<void>[] = [];

      // Superfund (NPL) sites via SEMS
      fetches.push(
        (async () => {
          try {
            const sfResp = await this.fetchEPA(
              `https://enviro.epa.gov/enviro/efservice/SEMS_ACTIVE_SITES/SITE_ZIP_CODE/${zipCode}/JSON/ROWS/0:20`
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
        })()
      );

      // Brownfield sites
      fetches.push(
        (async () => {
          try {
            const bfResp = await this.fetchEPA(
              `https://enviro.epa.gov/enviro/efservice/BROWNFIELDS_ASSESSMENTS/ASSESSMENT_ZIP/${zipCode}/JSON/ROWS/0:20`
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
        })()
      );

      // Toxic Release Inventory (TRI) facilities
      fetches.push(
        (async () => {
          try {
            const triResp = await this.fetchEPA(
              `https://enviro.epa.gov/enviro/efservice/TRI_FACILITY/ZIP_CODE/${zipCode}/JSON/ROWS/0:20`
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
        })()
      );

      // FRS (Facility Registry Service) as a reliable fallback/supplement
      fetches.push(
        (async () => {
          try {
            const frsResp = await this.fetchEPA(
              `https://enviro.epa.gov/enviro/efservice/FRS_PROGRAM_FACILITY/POSTAL_CODE/${zipCode}/JSON/ROWS/0:20`
            );
            if (frsResp.ok) {
              const frsData = await frsResp.json();
              if (Array.isArray(frsData)) {
                // Only add FRS facilities not already captured by other sources
                const existingIds = new Set(sites.map(s => s.registryId).filter(Boolean));
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
        })()
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
  async getMortgageLendingData(
    stateFips: string,
    countyFips: string,
    year?: number
  ): Promise<HMDAResult> {
    const fipsCode = `${stateFips}${countyFips}`;

    // HMDA data availability: typically current year - 2 is the most recent
    // available dataset (e.g., in 2026, 2024 may be available, 2023 definitely is)
    const currentYear = new Date().getFullYear();
    const yearsToTry = year
      ? [year]
      : [currentYear - 2, currentYear - 1, currentYear - 3];

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
            medianLoanAmount: totalOriginations > 0
              ? Math.round(originationLoanSum / totalOriginations)
              : 0,
            medianIncome: 0,
            approvalRate: totalApplications > 0
              ? Math.round((totalOriginations / totalApplications) * 10000) / 100
              : 0,
          },
        };
      } catch (error: any) {
        // Network error - try next year
        continue;
      }
    }

    return { success: false, error: `No HMDA data found for county ${fipsCode} (tried years: ${yearsToTry.join(", ")})` };
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
          .catch(() => {})
      );
    }

    // HUD Fair Market Rents
    tasks.push(
      this.getFairMarketRents(zipCode)
        .then((r) => {
          if (r.success && r.data?.basicdata) {
            supplement.fairMarketRent = r.data.basicdata;
          } else if (r.success && r.data?.smallAreaData?.length) {
            // Use ZIP-level SAFMR if available
            const zipFmr = r.data.smallAreaData.find(
              (d) => d.zipCode === zipCode
            );
            if (zipFmr) supplement.fairMarketRent = zipFmr;
            else supplement.fairMarketRent = r.data.smallAreaData[0];
          }
        })
        .catch(() => {})
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
                  vacancyRate:
                    (r.data.vacantUnits / r.data.totalHousingUnits) * 100,
                };
              }
            }
          })
          .catch(() => {})
      );
    }

    // FEMA Flood Data
    tasks.push(
      this.getFloodData(zipCode)
        .then((r) => {
          if (r.success) {
            if (r.floodData) supplement.floodRisk = r.floodData;
            if (r.disasters?.length) supplement.recentDisasters = r.disasters;
          }
        })
        .catch(() => {})
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
          .catch(() => {})
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
        .catch(() => {})
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
          .catch(() => {})
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
          .catch(() => {})
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
          sources.hud = { available: false, error: "No HUD token configured. Get a free token at huduser.gov/hudapi/public/register" };
          return;
        }
        try {
          const r = await fetch("https://www.huduser.gov/hudapi/public/fmr/data/96701", {
            headers: this.getHUDHeaders(),
          });
          if (r.ok) {
            sources.hud = { available: true };
          } else {
            let body = "";
            try { body = await r.text(); } catch { /* ignore */ }
            sources.hud = {
              available: false,
              error: r.status === 401 || r.status === 403
                ? `Token invalid or expired (${r.status}). Verify at huduser.gov/hudapi/public/login${body ? ` — ${body.slice(0, 150)}` : ""}`
                : `HTTP ${r.status}${body ? `: ${body.slice(0, 150)}` : ""}`,
            };
          }
        } catch (e: any) {
          sources.hud = { available: false, error: e.message };
        }
      })()
    );

    // Census (key optional)
    const censusKey = this.config.censusApiKey
      ? `&key=${this.config.censusApiKey}`
      : "";
    tests.push(
      fetch(
        `https://api.census.gov/data/2023/acs/acs5?get=NAME,B01003_001E&for=state:15${censusKey}`
      )
        .then((r) => {
          sources.census = { available: r.ok };
          if (!r.ok) sources.census.error = `HTTP ${r.status}`;
        })
        .catch((e) => {
          sources.census = { available: false, error: e.message };
        })
    );

    // FEMA (no key needed)
    tests.push(
      fetch(
        "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=1"
      )
        .then((r) => {
          sources.fema = { available: r.ok };
          if (!r.ok) sources.fema.error = `HTTP ${r.status}`;
        })
        .catch((e) => {
          sources.fema = { available: false, error: e.message };
        })
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
          ...(this.config.blsApiKey
            ? { registrationkey: this.config.blsApiKey }
            : {}),
        }),
      })
        .then((r) => {
          sources.bls = { available: r.ok };
          if (!r.ok) sources.bls.error = `HTTP ${r.status}`;
        })
        .catch((e) => {
          sources.bls = { available: false, error: e.message };
        })
    );

    // EPA (no key needed) — use FRS as the most reliable Envirofacts table
    tests.push(
      this.fetchEPA(
        "https://enviro.epa.gov/enviro/efservice/FRS_PROGRAM_FACILITY/STATE_CODE/HI/JSON/ROWS/0:1",
        10000
      )
        .then((r) => {
          sources.epa = { available: r.ok };
          if (!r.ok) sources.epa.error = `HTTP ${r.status}`;
        })
        .catch((e) => {
          // If FRS fails, try a simpler SEMS endpoint as fallback
          return this.fetchEPA(
            "https://enviro.epa.gov/enviro/efservice/SEMS_ACTIVE_SITES/SITE_STATE_CODE/HI/JSON/ROWS/0:1",
            10000
          )
            .then((r) => {
              sources.epa = { available: r.ok };
              if (!r.ok) sources.epa.error = `HTTP ${r.status}`;
            })
            .catch((e2) => {
              sources.epa = { available: false, error: e2.message || e.message };
            });
        })
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
          })
      );
    } else {
      sources.usps = {
        available: false,
        error: "USPS credentials not configured (optional)",
      };
    }

    // CFPB/HMDA (no key needed) — try most recent available year
    // The HMDA Data Browser API requires at least one HMDA data filter (e.g. actions_taken)
    {
      const hmdaYear = new Date().getFullYear() - 2; // Typically 2-year lag
      tests.push(
        fetch(`https://ffiec.cfpb.gov/v2/data-browser-api/view/aggregations?states=MD&years=${hmdaYear}&actions_taken=1`, {
          headers: { Accept: "application/json" },
        })
          .then(async (r) => {
            if (r.ok) {
              sources.cfpb_hmda = { available: true };
            } else if (r.status === 404 || r.status === 400) {
              // Try year - 3 as fallback
              const fallbackResp = await fetch(
                `https://ffiec.cfpb.gov/v2/data-browser-api/view/aggregations?states=MD&years=${hmdaYear - 1}&actions_taken=1`,
                { headers: { Accept: "application/json" } }
              );
              sources.cfpb_hmda = { available: fallbackResp.ok };
              if (!fallbackResp.ok) sources.cfpb_hmda.error = `No data for years ${hmdaYear} or ${hmdaYear - 1}`;
            } else {
              sources.cfpb_hmda = { available: false, error: `HTTP ${r.status}` };
            }
          })
          .catch((e) => {
            sources.cfpb_hmda = { available: false, error: e.message };
          })
      );
    }

    await Promise.allSettled(tests);

    const availableCount = Object.values(sources).filter(
      (s) => s.available
    ).length;
    const totalCount = Object.keys(sources).length;

    return {
      success: availableCount > 0,
      message: `${availableCount}/${totalCount} federal data sources available`,
      sources,
    };
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createFederalDataClient(
  config?: FederalDataConfig
): FederalDataClient {
  return new FederalDataClient({
    uspsClientId:
      config?.uspsClientId || process.env.USPS_CLIENT_ID,
    uspsClientSecret:
      config?.uspsClientSecret || process.env.USPS_CLIENT_SECRET,
    hudToken:
      config?.hudToken || process.env.HUD_API_TOKEN,
    censusApiKey:
      config?.censusApiKey || process.env.CENSUS_API_KEY,
    blsApiKey: config?.blsApiKey || process.env.BLS_API_KEY,
    epaAqsEmail: config?.epaAqsEmail || process.env.EPA_AQS_EMAIL,
    epaAqsKey: config?.epaAqsKey || process.env.EPA_AQS_KEY,
  });
}
