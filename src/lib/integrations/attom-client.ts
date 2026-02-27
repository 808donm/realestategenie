/**
 * ATTOM Data API Client
 *
 * Provides access to property ownership, tax assessments, sales history,
 * AVM valuations, foreclosure data, and more for 155M+ US properties.
 *
 * API Documentation: https://api.developer.attomdata.com/docs
 *
 * Authentication: API Key passed in request header
 * Base URL: https://api.gateway.attomdata.com/propertyapi/v1.0.0
 */

const DEFAULT_BASE_URL =
  "https://api.gateway.attomdata.com/propertyapi/v1.0.0";

// ── Response types ──────────────────────────────────────────────────────────

export interface AttomAddress {
  country?: string;
  countrySubd?: string;
  line1?: string;
  line2?: string;
  locality?: string;
  matchCode?: string;
  oneLine?: string;
  postal1?: string;
  postal2?: string;
  postal3?: string;
}

export interface AttomLocation {
  accuracy?: string;
  latitude?: string;
  longitude?: string;
  distance?: number;
  geoid?: string;
}

export interface AttomAreaInfo {
  blockNum?: string;
  locType?: string;
  countrySecSubd?: string;
  countyUse1?: string;
  munCode?: string;
  munName?: string;
  srvyRange?: string;
  srvySection?: string;
  srvyTownship?: string;
  taxCodeArea?: string;
  taxExemption?: string;
}

export interface AttomOwner {
  corporateIndicator?: string;
  owner1?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
  owner2?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
  owner3?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
  owner4?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
  absenteeOwnerStatus?: string;
  mailingAddressOneLine?: string;
  ownerRelationshipType?: string;
  ownerOccupied?: string;
  ownerRelationshipRights?: string;
}

export interface AttomBuilding {
  size?: {
    bldgSize?: number;
    grossSize?: number;
    grossSizeAdjusted?: number;
    groundFloorSize?: number;
    livingSize?: number;
    sizeInd?: string;
    universalSize?: number;
  };
  rooms?: {
    bathFixtures?: number;
    bathsFull?: number;
    bathsHalf?: number;
    bathsTotal?: number;
    beds?: number;
    roomsTotal?: number;
  };
  interior?: {
    bsmtSize?: number;
    bsmtType?: string;
    fplcCount?: number;
    fplcInd?: string;
    fplcType?: string;
  };
  construction?: {
    condition?: string;
    constructionType?: string;
    foundationType?: string;
    frameType?: string;
    roofCover?: string;
    roofShape?: string;
    wallType?: string;
  };
  parking?: {
    garageType?: string;
    prkgSize?: number;
    prkgSpaces?: string;
    prkgType?: string;
  };
  summary?: {
    archStyle?: string;
    bldgsNum?: number;
    bldgType?: string;
    imprType?: string;
    levels?: number;
    mobileHomeInd?: string;
    quality?: string;
    storyDesc?: string;
    unitsCount?: string;
    yearBuilt?: number;
    yearBuiltEffective?: number;
    view?: string;
    viewCode?: string;
  };
}

export interface AttomLot {
  lotNum?: string;
  lotSize1?: number;
  lotSize2?: number;
  poolInd?: string;
  poolType?: string;
  siteZoningIdent?: string;
}

export interface AttomAssessment {
  appraised?: {
    apprImprValue?: number;
    apprLandValue?: number;
    apprTtlValue?: number;
  };
  assessed?: {
    assdImprValue?: number;
    assdLandValue?: number;
    assdTtlValue?: number;
  };
  market?: {
    mktImprValue?: number;
    mktLandValue?: number;
    mktTtlValue?: number;
  };
  tax?: {
    taxAmt?: number;
    taxPerSizeUnit?: number;
    taxYear?: number;
  };
}

export interface AttomSale {
  amount?: {
    saleAmt?: number;
    saleCode?: string;
    saleRecDate?: string;
    saleDisclosureType?: string;
    saleDocNum?: string;
    saleDocType?: string;
    saleTransDate?: string;
    saleTransType?: string;
    salePrice?: number;
    pricePerBed?: number;
    pricePerSizeUnit?: number;
  };
  calculation?: {
    pricePerBed?: number;
    pricePerSizeUnit?: number;
  };
}

export interface AttomMortgage {
  amount?: number;
  date?: string;
  dueDate?: string;
  lender?: { fullName?: string };
  loanType?: string;
  term?: string;
  interestRateType?: string;
}

export interface AttomAvm {
  amount?: {
    scr?: number;
    value?: number;
    high?: number;
    low?: number;
    valueRange?: number;
  };
  condition?: {
    avmCondition?: number;
    avmpoor?: number;
    avmgood?: number;
    avmexcellent?: number;
  };
  eventDate?: string;
}

export interface AttomForeclosure {
  actionType?: string;
  filingDate?: string;
  recordingDate?: string;
  documentType?: string;
  trusteeFullName?: string;
  defaultAmount?: number;
  originalLoanAmount?: number;
  penaltyInterest?: number;
  auctionDate?: string;
  auctionLocation?: string;
  startingBid?: number;
}

// ── Community / Neighborhood types ──────────────────────────────────────────

export interface AttomCommunity {
  affordabilityIndex?: number;
  medianHouseholdIncome?: number;
  medianHomePrice?: number;
  houseAppreciationRate?: number;
  avgSchoolRating?: number;
  crimeIndex?: number;
  crimeRisk?: string;
  employmentGrowthRate?: number;
  populationGrowth?: number;
  population?: number;
  populationDensity?: number;
  medianAge?: number;
  ownerOccupiedPct?: number;
  renterOccupiedPct?: number;
  walkScore?: number;
  bikeScore?: number;
  transitScore?: number;
  commuteTime?: number;
  communityName?: string;
  geoIdV4?: string;
}

export interface AttomSchool {
  schoolName?: string;
  schoolType?: string; // Public, Private, Charter
  gradeRange?: string;
  rating?: number;
  distance?: number;
  enrollment?: number;
  studentTeacherRatio?: number;
  address?: AttomAddress;
}

export interface AttomPOI {
  name?: string;
  type?: string;
  distance?: number;
  latitude?: number;
  longitude?: number;
}

// ── Building Permits types ──────────────────────────────────────────────────

export interface AttomBuildingPermit {
  effectiveDate?: string;
  permitNumber?: string;
  status?: string;
  type?: string;
  subType?: string;
  description?: string;
  jobValue?: number;
  homeOwnerName?: string;
  contractorName?: string;
  businessName?: string;
}

// ── Hazard & Climate Risk types ────────────────────────────────────────────

export interface AttomHazardRisk {
  earthquakeRisk?: { riskScore?: number; riskDescription?: string };
  floodRisk?: { riskScore?: number; riskDescription?: string; floodZone?: string; femaFloodZone?: string };
  wildfireRisk?: { riskScore?: number; riskDescription?: string };
  windRisk?: { riskScore?: number; riskDescription?: string };
  hailRisk?: { riskScore?: number; riskDescription?: string };
  tornadoRisk?: { riskScore?: number; riskDescription?: string };
  hurricaneRisk?: { riskScore?: number; riskDescription?: string };
  sinkHoleRisk?: { riskScore?: number; riskDescription?: string };
  noiseScore?: number;
  overallRisk?: { riskScore?: number; riskDescription?: string };
}

export interface AttomClimateRisk {
  droughtRisk?: { riskScore?: number; riskDescription?: string };
  heatRisk?: { riskScore?: number; riskDescription?: string };
  stormRisk?: { riskScore?: number; riskDescription?: string };
  floodRisk?: { riskScore?: number; riskDescription?: string };
  fireRisk?: { riskScore?: number; riskDescription?: string };
  overallClimateRisk?: { riskScore?: number; riskDescription?: string };
}

// ── Rental AVM types ───────────────────────────────────────────────────────

export interface AttomRentalAvm {
  rentAmount?: number;
  rentLow?: number;
  rentHigh?: number;
  rentRange?: number;
  fsd?: number;
  eventDate?: string;
}

// ── Boundary types ─────────────────────────────────────────────────────────

export interface AttomBoundary {
  type?: string;
  name?: string;
  geoIdV4?: string;
  wktGeometry?: string;
  geoJson?: Record<string, any>;
  centroid?: { latitude?: number; longitude?: number };
}

// ── Sales Trend / Analytics types ──────────────────────────────────────────

export interface AttomSalesTrend {
  dateRange?: { startDate?: string; endDate?: string };
  medianSalePrice?: number;
  avgSalePrice?: number;
  salesCount?: number;
  medianDaysOnMarket?: number;
  avgPricePerSqFt?: number;
  priceChangePercent?: number;
  inventoryCount?: number;
  monthsOfSupply?: number;
  newListingsCount?: number;
}

export interface AttomIBuyerTrend {
  dateRange?: { startDate?: string; endDate?: string };
  iBuyerSalesCount?: number;
  iBuyerSalesPercent?: number;
  iBuyerMedianPrice?: number;
  iBuyerAvgDiscount?: number;
  topIBuyers?: Array<{ name?: string; salesCount?: number; marketShare?: number }>;
}

export interface AttomPropertyDetail {
  identifier?: {
    Id?: number;
    fips?: string;
    apn?: string;
    attomId?: number;
  };
  lot?: AttomLot;
  area?: AttomAreaInfo;
  address?: AttomAddress;
  location?: AttomLocation;
  summary?: {
    absenteeInd?: string;
    propClass?: string;
    propSubType?: string;
    propType?: string;
    propertyType?: string;
    yearBuilt?: number;
    propLandUse?: string;
    propIndicator?: string;
    legal1?: string;
  };
  utilities?: {
    coolingType?: string;
    energyType?: string;
    heatingFuel?: string;
    heatingType?: string;
    sewerType?: string;
    waterType?: string;
  };
  building?: AttomBuilding;
  owner?: AttomOwner;
  assessment?: AttomAssessment;
  sale?: AttomSale;
  mortgage?: AttomMortgage;
  avm?: AttomAvm;
  foreclosure?: AttomForeclosure;
}

export interface AttomApiResponse<T> {
  status: {
    version: string;
    code: number;
    msg: string;
    total: number;
    page: number;
    pagesize: number;
    responseDateTime?: string;
  };
  property?: T[];
  // Some endpoints nest under different keys
  [key: string]: any;
}

export interface AttomSearchParams {
  // Address search (two-part)
  address1?: string;
  address2?: string;
  // Single-line address
  address?: string;
  // APN + FIPS
  apn?: string;
  fips?: string;
  // ATTOM ID
  attomid?: number;
  // Geographic
  postalcode?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  // Filters
  propertytype?: string;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minBuildingSize?: number;
  maxBuildingSize?: number;
  minLotSize1?: number;
  maxLotSize1?: number;
  minYearBuilt?: number;
  maxYearBuilt?: number;
  // Assessment filters
  minAssdTtlValue?: number;
  maxAssdTtlValue?: number;
  // AVM filters
  minavmvalue?: number;
  maxavmvalue?: number;
  // Owner filters
  absenteeowner?: string;
  // Sale filters
  startSaleSearchDate?: string;
  endSaleSearchDate?: string;
  startSaleAmountSearchDate?: string;
  endSaleAmountSearchDate?: string;
  // Pagination
  page?: number;
  pagesize?: number;
  // Geo ID (v4)
  geoidv4?: string;
  // Sorting
  orderby?: string;
}

// ── Client ──────────────────────────────────────────────────────────────────

export class AttomClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  /**
   * Make an authenticated GET request to the ATTOM API
   */
  private async request<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    console.log(`[ATTOM] API request: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        apikey: this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[ATTOM] API request FAILED (${response.status}) for ${url}:`,
        errorText
      );
      throw new Error(
        `ATTOM API error: ${response.status} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Build params from AttomSearchParams, filtering out undefined values
   */
  private buildParams(
    params?: AttomSearchParams
  ): Record<string, string | number | undefined> | undefined {
    if (!params) return undefined;
    const result: Record<string, string | number | undefined> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }

  // ── Property Endpoints ──────────────────────────────────────────────────

  /**
   * Get detailed property information by address or ID
   */
  async getPropertyDetail(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/property/detail", this.buildParams(params));
  }

  /**
   * Get detailed property information WITH owner data (names, mailing address, corporate indicator).
   * This is the correct endpoint for owner-enriched area searches — /property/detail
   * does NOT include owner information for postal code queries.
   */
  async getPropertyDetailOwner(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/property/detailowner", this.buildParams(params));
  }

  /**
   * Get property details with BOTH mortgage AND owner information in a single response.
   * Returns owner names, mailing addresses, corporate indicators, plus mortgage lender,
   * amount, term, and due date. More comprehensive than detailowner alone.
   * Supports postal code area searches.
   */
  async getPropertyDetailMortgageOwner(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request(
      "/property/detailmortgageowner",
      this.buildParams(params)
    );
  }

  /**
   * Get basic property profile (property info + most recent sale + tax)
   */
  async getPropertyBasicProfile(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/property/basicprofile", this.buildParams(params));
  }

  /**
   * Get expanded property profile (full detail + sale + assessment + mortgage + owner)
   */
  async getPropertyExpandedProfile(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request(
      "/property/expandedprofile",
      this.buildParams(params)
    );
  }

  /**
   * Search properties by geography (lat/long radius, zip code, etc.)
   */
  async getPropertySnapshot(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/property/snapshot", this.buildParams(params));
  }

  // ── Assessment Endpoints ────────────────────────────────────────────────

  /**
   * Get assessment/tax details for properties
   */
  async getAssessmentDetail(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/assessment/detail", this.buildParams(params));
  }

  /**
   * Get assessment history for a specific property
   */
  async getAssessmentHistory(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request(
      "/assessmenthistory/detail",
      this.buildParams(params)
    );
  }

  // ── Sale Endpoints ──────────────────────────────────────────────────────

  /**
   * Get sale details for a property
   */
  async getSaleDetail(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/sale/detail", this.buildParams(params));
  }

  /**
   * Get recent sales within an area
   */
  async getSaleSnapshot(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/sale/snapshot", this.buildParams(params));
  }

  /**
   * Get sales history for a property
   */
  async getSalesHistory(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/saleshistory/detail", this.buildParams(params));
  }

  /**
   * Get expanded sales history (includes foreclosure info, deed types, mortgage details)
   */
  async getSalesHistoryExpanded(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request(
      "/saleshistory/expandedhistory",
      this.buildParams(params)
    );
  }

  // ── AVM Endpoints ───────────────────────────────────────────────────────

  /**
   * Get Automated Valuation Model (AVM) for a property
   */
  async getAvmDetail(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/avm/detail", this.buildParams(params));
  }

  /**
   * Get ATTOM-ized AVM (requires attomid from a previous property lookup)
   */
  async getAttomAvmDetail(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/attomavm/detail", this.buildParams(params));
  }

  // ── All Events ──────────────────────────────────────────────────────────

  /**
   * Get all events for a property (assessments, AVM, sales)
   * Single property per request
   */
  async getAllEvents(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/allevents/detail", this.buildParams(params));
  }

  // ── High-Value Prospecting Methods ────────────────────────────────────

  /**
   * Find absentee owners in a zip code (out-of-state / non-owner-occupied)
   * Great for investor outreach and listing leads
   */
  async findAbsenteeOwners(options: {
    postalcode: string;
    propertytype?: string;
    pagesize?: number;
    page?: number;
  }): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.getPropertyExpandedProfile({
      postalcode: options.postalcode,
      propertytype: options.propertytype || "SFR",
      pagesize: options.pagesize || 50,
      page: options.page || 1,
    });
  }

  /**
   * Find high-equity properties (long-term owners likely sitting on equity)
   * Filters by year built to approximate ownership length
   */
  async findHighEquityProperties(options: {
    postalcode: string;
    maxYearBuilt?: number;
    minAvmValue?: number;
    propertytype?: string;
    pagesize?: number;
    page?: number;
  }): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.getPropertyExpandedProfile({
      postalcode: options.postalcode,
      propertytype: options.propertytype || "SFR",
      maxYearBuilt: options.maxYearBuilt,
      minavmvalue: options.minAvmValue,
      pagesize: options.pagesize || 50,
      page: options.page || 1,
    });
  }

  /**
   * Find recent sales in an area (for market analysis / comps)
   */
  async findRecentSales(options: {
    postalcode?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    startDate: string;
    endDate: string;
    propertytype?: string;
    pagesize?: number;
    page?: number;
  }): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.getSaleSnapshot({
      postalcode: options.postalcode,
      latitude: options.latitude,
      longitude: options.longitude,
      radius: options.radius,
      startSaleSearchDate: options.startDate,
      endSaleSearchDate: options.endDate,
      propertytype: options.propertytype || "SFR",
      pagesize: options.pagesize || 50,
      page: options.page || 1,
    });
  }

  // ── Community / Neighborhood Endpoints ──────────────────────────────────

  /**
   * Get community profile by GeoID or lat/long
   * Returns demographics, affordability, appreciation, crime index, etc.
   */
  async getCommunityProfile(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/area/community/profile", this.buildParams(params));
  }

  /**
   * Get schools near a property by address, lat/long, or GeoID
   */
  async getSchoolSearch(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/school/search", this.buildParams(params));
  }

  /**
   * Get points of interest near a property
   */
  async getPOISearch(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/poi/search", this.buildParams(params));
  }

  /**
   * Convenience: fetch a full neighborhood profile for a given address
   * Combines community data, school search, and POI in parallel
   */
  async getNeighborhoodProfile(options: {
    address1?: string;
    address2?: string;
    latitude?: number;
    longitude?: number;
    postalcode?: string;
    geoidv4?: string;
    radius?: number;
  }): Promise<{
    community: any;
    schools: any;
    poi: any;
  }> {
    const params: AttomSearchParams = {
      address1: options.address1,
      address2: options.address2,
      latitude: options.latitude,
      longitude: options.longitude,
      postalcode: options.postalcode,
      geoidv4: options.geoidv4,
      radius: options.radius || 1,
      pagesize: 10,
    };

    const [community, schools, poi] = await Promise.allSettled([
      this.getCommunityProfile(params),
      this.getSchoolSearch(params),
      this.getPOISearch(params),
    ]);

    return {
      community: community.status === "fulfilled" ? community.value : null,
      schools: schools.status === "fulfilled" ? schools.value : null,
      poi: poi.status === "fulfilled" ? poi.value : null,
    };
  }

  // ── Building Permits ───────────────────────────────────────────────────

  /**
   * Get building permit history for a property
   * Shows recent renovations, additions, and development activity
   */
  async getBuildingPermits(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/buildingpermits/detail", this.buildParams(params));
  }

  // ── Hazard & Climate Risk ─────────────────────────────────────────────

  /**
   * Get natural hazard risk data for a property
   * Includes earthquake, flood, wildfire, wind, hail, tornado, hurricane, sinkhole
   */
  async getNaturalHazard(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/property/detailwithschools", this.buildParams(params));
  }

  /**
   * Get comprehensive hazard risk scores
   * Returns risk scores for multiple hazard types
   */
  async getHazardRisk(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/hazardrisk/detail", this.buildParams(params));
  }

  /**
   * Get climate change risk assessment for a property
   * Returns drought, heat, storm, flood, fire risk projections
   */
  async getClimateRisk(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/climaterisk/detail", this.buildParams(params));
  }

  // ── Rental AVM ────────────────────────────────────────────────────────

  /**
   * Get rental AVM (Automated Valuation Model) for a property
   * Returns estimated rental value with high/low range
   */
  async getRentalAvm(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/avm/rental/detail", this.buildParams(params));
  }

  // ── Recorder / Deed Endpoints ─────────────────────────────────────────

  /**
   * Get recorder deed details for a property
   * Includes grantor/grantee, deed type, document number
   */
  async getRecorderDeed(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/recorder/deed", this.buildParams(params));
  }

  // ── Boundary Endpoints ────────────────────────────────────────────────

  /**
   * Get parcel boundary data for a property
   * Returns polygon/geometry data for property parcel
   */
  async getParcelBoundary(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/boundary/parcel", this.buildParams(params));
  }

  /**
   * Get school district boundaries
   * Returns geometry for school district zones
   */
  async getSchoolBoundary(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/boundary/school", this.buildParams(params));
  }

  /**
   * Get neighborhood boundaries
   * Returns geometry for neighborhood/subdivision zones
   */
  async getNeighborhoodBoundary(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/boundary/neighborhood", this.buildParams(params));
  }

  // ── Sales Trends & Analytics ──────────────────────────────────────────

  /**
   * Get sales trend data for an area
   * Returns median price, volume, days on market, price/sqft trends
   */
  async getSalesTrend(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/salestrend/snapshot", this.buildParams(params));
  }

  /**
   * Get iBuyer activity trends for an area
   * Shows iBuyer market share, volume, and top players
   */
  async getIBuyerTrends(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/salestrend/ibuyer", this.buildParams(params));
  }

  /**
   * Convenience: fetch comprehensive risk profile for a property
   * Combines hazard risk, climate risk, and flood zone data in parallel
   */
  async getRiskProfile(options: {
    address1?: string;
    address2?: string;
    attomid?: number;
    postalcode?: string;
  }): Promise<{
    hazard: any;
    climate: any;
  }> {
    const params: AttomSearchParams = {
      address1: options.address1,
      address2: options.address2,
      attomid: options.attomid,
      postalcode: options.postalcode,
    };

    const [hazard, climate] = await Promise.allSettled([
      this.getHazardRisk(params),
      this.getClimateRisk(params),
    ]);

    return {
      hazard: hazard.status === "fulfilled" ? hazard.value : null,
      climate: climate.status === "fulfilled" ? climate.value : null,
    };
  }

  /**
   * Convenience: fetch full market analytics for an area
   * Combines sales trends and iBuyer data in parallel
   */
  async getMarketAnalytics(options: {
    postalcode?: string;
    geoidv4?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
  }): Promise<{
    salesTrend: any;
    iBuyer: any;
  }> {
    const params: AttomSearchParams = {
      postalcode: options.postalcode,
      geoidv4: options.geoidv4,
      latitude: options.latitude,
      longitude: options.longitude,
      radius: options.radius,
    };

    const [salesTrend, iBuyer] = await Promise.allSettled([
      this.getSalesTrend(params),
      this.getIBuyerTrends(params),
    ]);

    return {
      salesTrend: salesTrend.status === "fulfilled" ? salesTrend.value : null,
      iBuyer: iBuyer.status === "fulfilled" ? iBuyer.value : null,
    };
  }

  // ── Connection Test ─────────────────────────────────────────────────────

  /**
   * Test API connection with a simple property lookup
   */
  async testConnection(): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      console.log("[ATTOM] Testing connection...");

      // Use a well-known address for the test call
      const result = await this.getPropertyDetail({
        address1: "4529 Winona Court",
        address2: "Denver, CO",
      });

      if (result.status?.code === 0 && result.property?.length) {
        return {
          success: true,
          message: "Successfully connected to ATTOM Data API",
        };
      }

      return {
        success: true,
        message: `Connected (status: ${result.status?.msg || "OK"})`,
      };
    } catch (error) {
      console.error("[ATTOM] Connection test failed:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Connection failed",
      };
    }
  }
}

/**
 * Create an ATTOM client from the system-wide API key (env var)
 * ATTOM is a platform-level integration, not per-agent
 */
export function createAttomClient(apiKey?: string): AttomClient {
  const key = apiKey || process.env.ATTOM_API_KEY;
  if (!key) {
    throw new Error("ATTOM API key not configured");
  }

  return new AttomClient({
    apiKey: key,
    baseUrl: process.env.ATTOM_BASE_URL || DEFAULT_BASE_URL,
  });
}
