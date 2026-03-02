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

const V4_BASE_URL = "https://api.gateway.attomdata.com/v4";

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
  geoIdV4?: string;
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
  geoid?: string;
  // ── v4 GeoCode identifiers ────────────────────────────────
  blockGeoIdV4?: string;
  blockGroupGeoIdV4?: string;
  tractGeoIdV4?: string;
  countyGeoIdV4?: string;
  placeGeoIdV4?: string;
  cbsaGeoIdV4?: string;
  schoolDistrictGeoIdV4?: string;
  neighborhoodGeoIdV4?: string;
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
  // Mortgagor (borrower) fields — the borrower IS the property owner
  borrower1?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
  borrower2?: { fullName?: string; lastName?: string; firstNameAndMi?: string };
  borrowerVesting?: string;
  borrowerMailFullStreetAddress?: string;
  borrowerMailUnitNumber?: string;
  borrowerMailCity?: string;
  borrowerMailState?: string;
  borrowerMailZip?: string;
  companyName?: string;
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
  // ── Identifiers ─────────────────────────────────────────────────────────
  attomId?: number;
  /** @deprecated alias kept for backwards-compat */
  attomid?: number;
  ID?: number;

  // ── Address search ──────────────────────────────────────────────────────
  address1?: string;
  address2?: string;
  address?: string;

  // ── APN + FIPS ──────────────────────────────────────────────────────────
  apn?: string;
  APN?: string;
  fips?: string;

  // ── Geographic ──────────────────────────────────────────────────────────
  postalcode?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;

  // ── Property Type ───────────────────────────────────────────────────────
  propertytype?: string;
  propertyType?: string;
  propertyIndicator?: number;

  // ── Beds / Baths ────────────────────────────────────────────────────────
  minBeds?: number;
  maxBeds?: number;
  minBathsTotal?: number;
  maxBathsTotal?: number;

  // ── Size ────────────────────────────────────────────────────────────────
  minUniversalSize?: number;
  maxUniversalSize?: number;
  minLotSize1?: number;
  maxLotSize1?: number;
  minLotSize2?: number;
  maxLotSize2?: number;
  minYearBuilt?: number;
  maxYearBuilt?: number;

  // ── Assessment filters ──────────────────────────────────────────────────
  minApprImprValue?: number;
  maxApprImprValue?: number;
  minApprLandValue?: number;
  maxApprLandValue?: number;
  minApprTtlValue?: number;
  maxApprTtlValue?: number;
  minAssdImprValue?: number;
  maxAssdImprValue?: number;
  minAssdLandValue?: number;
  maxAssdLandValue?: number;
  minAssdTtlValue?: number;
  maxAssdTtlValue?: number;
  minMktImprValue?: number;
  maxMktImprValue?: number;
  minMktLandValue?: number;
  maxMktLandValue?: number;
  minMktTtlValue?: number;
  maxMktTtlValue?: number;
  minTaxAmt?: number;
  maxTaxAmt?: number;

  // ── AVM filters ─────────────────────────────────────────────────────────
  minAVMValue?: number;
  maxAVMValue?: number;
  /** @deprecated alias */
  minavmvalue?: number;
  /** @deprecated alias */
  maxavmvalue?: number;

  // ── Sale filters ────────────────────────────────────────────────────────
  minSaleAmt?: number;
  maxSaleAmt?: number;
  startSaleSearchDate?: string;
  endSaleSearchDate?: string;
  startSaleTransDate?: string;
  endSaleTransDate?: string;

  // ── Date filters ────────────────────────────────────────────────────────
  startCalendarDate?: string;
  endCalendarDate?: string;
  startAddedDate?: string;
  endAddedDate?: string;

  // ── Owner filters ───────────────────────────────────────────────────────
  absenteeowner?: string;

  // ── Geography IDs ───────────────────────────────────────────────────────
  geoID?: string;
  geoIDV4?: string;
  /** @deprecated alias */
  geoidv4?: string;
  geoIdV4?: string;

  // ── Sales Trend filters ─────────────────────────────────────────────────
  interval?: string;
  startyear?: number;
  endyear?: number;
  startmonth?: string;
  endmonth?: string;
  startQuarter?: number;
  endQuarter?: number;
  /** Transaction type filter for sales trends (e.g. "FORECLOSURE", "ALL") */
  transactiontype?: string;

  // ── Pagination / Sorting ────────────────────────────────────────────────
  page?: number;
  pagesize?: number;
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
   * Make an authenticated GET request to the ATTOM v4 API
   * (neighborhood, community, POI, and location endpoints)
   */
  private async requestV4<T>(
    endpoint: string,
    params?: Record<string, string | number | undefined>
  ): Promise<T> {
    const url = new URL(`${V4_BASE_URL}${endpoint}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    console.log(`[ATTOM v4] API request: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        apikey: this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[ATTOM v4] API request FAILED (${response.status}) for ${url}:`,
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
   * Get property detail with mortgage information
   */
  async getPropertyDetailMortgage(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/property/detailmortgage", this.buildParams(params));
  }

  /**
   * Get property detail with schools in the attendance zone
   */
  async getPropertyDetailWithSchools(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request(
      "/property/detailwithschools",
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
   * Get assessment snapshot (supports area searches)
   */
  async getAssessmentSnapshot(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/assessment/snapshot", this.buildParams(params));
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
   * Get sales history detail for a property (single property per request)
   */
  async getSalesHistory(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/saleshistory/detail", this.buildParams(params));
  }

  /**
   * Get basic sales history for a property
   */
  async getSalesHistoryBasic(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request(
      "/saleshistory/basichistory",
      this.buildParams(params)
    );
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

  /**
   * Get sales history snapshot for a property
   */
  async getSalesHistorySnapshot(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request(
      "/saleshistory/snapshot",
      this.buildParams(params)
    );
  }

  // ── AVM Endpoints ───────────────────────────────────────────────────────

  /**
   * Get AVM snapshot for properties (supports area searches)
   */
  async getAvmSnapshot(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/avm/snapshot", this.buildParams(params));
  }

  /**
   * Get ATTOM AVM detail (the primary AVM endpoint with full condition data)
   */
  async getAttomAvmDetail(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/attomavm/detail", this.buildParams(params));
  }

  /**
   * Get AVM history for a specific property
   */
  async getAvmHistory(
    params: AttomSearchParams
  ): Promise<AttomApiResponse<AttomPropertyDetail>> {
    return this.request("/avmhistory/detail", this.buildParams(params));
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
   * Look up a location to obtain its geoIdV4 identifier.
   * Uses the ATTOM v4 /location/lookup endpoint.
   */
  async locationLookup(options: {
    name?: string;
    geoIdV4?: string;
    geographyTypeAbbreviation?: string;
  }): Promise<any> {
    const params: Record<string, string | number | undefined> = {};
    if (options.name) params.name = options.name;
    if (options.geoIdV4) params.geoIdV4 = options.geoIdV4;
    if (options.geographyTypeAbbreviation) params.geographyTypeAbbreviation = options.geographyTypeAbbreviation;

    return this.requestV4("/location/lookup", params);
  }

  /**
   * Deep-search any object for a geoIdV4 field value.
   */
  private extractGeoIdV4(obj: any, depth = 0): string | null {
    if (!obj || typeof obj !== "object" || depth > 6) return null;

    // Check common field name variants at current level
    for (const key of ["geoIdV4", "geoidv4", "geoIDV4", "GeoIdV4", "geo_id_v4"]) {
      if (obj[key] && typeof obj[key] === "string") return obj[key];
    }

    // Check arrays — pick the first valid match
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const found = this.extractGeoIdV4(item, depth + 1);
        if (found) return found;
      }
      return null;
    }

    // Recurse into nested objects
    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") {
        const found = this.extractGeoIdV4(value, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Get neighborhood community profile by GeoIdV4.
   * Returns demographics, affordability, appreciation, crime index, etc.
   *
   * ATTOM v4 endpoint: /neighborhood/community?geoIdV4=...
   * If no geoIdV4 is provided, attempts to resolve one via /location/lookup
   * using the city name or postal code.
   */
  async getCommunityProfile(
    params: AttomSearchParams
  ): Promise<any> {
    // Normalize geoIdV4 parameter casing — ATTOM expects "geoIdV4"
    const normalized = this.buildParams(params) || {};
    if (normalized.geoidv4 && !normalized.geoIdV4) {
      normalized.geoIdV4 = normalized.geoidv4;
      delete normalized.geoidv4;
    }
    if (normalized.geoIDV4 && !normalized.geoIdV4) {
      normalized.geoIdV4 = normalized.geoIDV4;
      delete normalized.geoIDV4;
    }

    // If we don't have a geoIdV4, try to look one up from the address/city
    if (!normalized.geoIdV4) {
      const cityState = String(normalized.address2 || "");
      const postalcode = String(normalized.postalcode || normalized.postalCode || "");
      const state = cityState.split(",")[1]?.trim() || "";

      // Extract just city name (ATTOM location lookup works best with city-only)
      const cityOnly = cityState.split(",")[0]?.trim();

      // Try multiple lookup strategies with appropriate geographyTypeAbbreviation:
      // CI = Postal City, PZ = Zip Code, N2 = Neighborhood, PL = Place
      const lookupAttempts: Array<{ name: string; geoType?: string }> = [];
      if (cityState) lookupAttempts.push({ name: cityState, geoType: "CI" }); // "Honolulu, HI" as Postal City
      if (cityOnly && state) lookupAttempts.push({ name: `${cityOnly}, ${state}`, geoType: "PL" }); // Place
      if (cityOnly) lookupAttempts.push({ name: cityOnly }); // Untyped — returns all matches
      if (postalcode) lookupAttempts.push({ name: postalcode, geoType: "PZ" }); // Zip code

      for (const attempt of lookupAttempts) {
        try {
          const lookupParams: Record<string, string> = { name: attempt.name };
          if (attempt.geoType) lookupParams.geographyTypeAbbreviation = attempt.geoType;

          console.log(`[ATTOM] Location lookup: name="${attempt.name}" geoType=${attempt.geoType || "any"}`);
          const lookupResult = await this.requestV4<any>("/location/lookup", lookupParams);

          // ATTOM v4 location lookup returns: { status: {...}, geographies: [{ geoIdV4, geographyName, ... }] }
          const geographies = lookupResult?.geographies;
          if (Array.isArray(geographies) && geographies.length > 0) {
            const geoId = geographies[0]?.geoIdV4;
            if (geoId) {
              console.log(`[ATTOM] Resolved geoIdV4: ${geoId} (${geographies[0].geographyName}, ${geographies[0].geographyTypeName})`);
              normalized.geoIdV4 = geoId;
              break;
            }
          }

          // Fallback: deep-search in case structure differs
          const fallbackGeoId = this.extractGeoIdV4(lookupResult);
          if (fallbackGeoId) {
            console.log(`[ATTOM] Resolved geoIdV4 via deep-search: ${fallbackGeoId}`);
            normalized.geoIdV4 = fallbackGeoId;
            break;
          }

          console.log(`[ATTOM] No geoIdV4 found for "${attempt.name}" (${attempt.geoType || "any"})`);
        } catch (e) {
          console.log(`[ATTOM] Location lookup failed for "${attempt.name}":`, (e as Error).message);
        }
      }
    }

    // Call the v4 /neighborhood/community endpoint
    if (normalized.geoIdV4) {
      try {
        console.log(`[ATTOM] Calling /neighborhood/community with geoIdV4=${normalized.geoIdV4}`);
        const result = await this.requestV4<any>("/neighborhood/community", {
          geoIdV4: String(normalized.geoIdV4),
        });
        console.log("[ATTOM] Community response keys:", result ? Object.keys(result) : "null");
        if (result && !result.error) return result;
      } catch (e) {
        console.log("[ATTOM] /neighborhood/community (v4) failed:", (e as Error).message);
      }
    }

    // Fallback: try the propertyapi community endpoint with postalcode
    const postalcode = normalized.postalcode || normalized.postalCode;
    if (postalcode) {
      try {
        console.log("[ATTOM] Trying /area/community/profile fallback with postalcode:", postalcode);
        return await this.request("/area/community/profile", { postalcode });
      } catch (e) {
        console.log("[ATTOM] /area/community/profile fallback also failed:", (e as Error).message);
      }
    }

    throw new Error("Unable to fetch community profile: no geoIdV4 resolved and no postalcode fallback available");
  }

  /**
   * Search for schools near a property.
   * Uses v4 endpoint: /v4/school/search (accepts geoIdV4, lat/lng+radius)
   * Falls back to v1: /propertyapi/v1.0.0/school/snapshot
   */
  async getSchoolSearch(
    params: AttomSearchParams
  ): Promise<any> {
    const built = this.buildParams(params) || {};
    const geoId = built.geoIdV4 || built.geoidv4 || built.geoIDV4;

    // Try v4 first with geoIdV4 or lat/lng
    if (geoId || (built.latitude && built.longitude)) {
      try {
        const v4Params: Record<string, string | number | undefined> = {};
        if (geoId) {
          v4Params.geoIdV4 = String(geoId);
        } else if (built.latitude && built.longitude) {
          v4Params.latitude = built.latitude;
          v4Params.longitude = built.longitude;
          if (built.radius) v4Params.radius = built.radius;
        }
        if (built.pagesize) v4Params.pagesize = built.pagesize;
        if (built.page) v4Params.page = built.page;
        return await this.requestV4("/school/search", v4Params);
      } catch (e) {
        console.log("[ATTOM] v4 /school/search failed, trying v1:", (e as Error).message);
      }
    }

    // Fall back to v1
    try {
      return await this.request("/school/snapshot", built);
    } catch (e) {
      console.log("[ATTOM] v1 /school/snapshot failed:", (e as Error).message);
      return this.request("/school/search", built);
    }
  }

  /**
   * Get school district details by geoIdV4.
   * Uses v4 endpoint: /v4/school/district
   * Falls back to v1: /propertyapi/v1.0.0/school/districtdetail
   */
  async getSchoolDistrict(
    params: AttomSearchParams
  ): Promise<any> {
    const built = this.buildParams(params) || {};
    const geoId = built.geoIdV4 || built.geoidv4 || built.geoIDV4;
    if (geoId) {
      try {
        return await this.requestV4("/school/district", { geoIdV4: String(geoId) });
      } catch (e) {
        console.log("[ATTOM] v4 /school/district failed, trying v1:", (e as Error).message);
      }
    }
    return this.request("/school/districtdetail", this.buildParams(params));
  }

  /**
   * Get detailed school profile by geoIdV4.
   * Uses v4 endpoint: /v4/school/profile (accepts geoIdV4)
   * Falls back to v1: /propertyapi/v1.0.0/school/detail
   */
  async getSchoolProfile(
    params: AttomSearchParams
  ): Promise<any> {
    const built = this.buildParams(params) || {};
    const geoId = built.geoIdV4 || built.geoidv4 || built.geoIDV4;

    if (geoId) {
      try {
        return await this.requestV4("/school/profile", { geoIdV4: String(geoId) });
      } catch (e) {
        console.log("[ATTOM] v4 /school/profile failed, trying v1:", (e as Error).message);
      }
    }
    return this.request("/school/detail", built);
  }

  /**
   * Get points of interest near a property.
   * Uses the ATTOM v4 endpoint: /v4/neighborhood/poi
   *
   * Accepts: geoIdV4, point (POINT(lng,lat)), address, zipCode, radius,
   *          categoryName, pagesize, page
   *
   * Priority: geoIdV4 > POINT(lng,lat) > address > zipCode
   */
  async getPOISearch(
    params: AttomSearchParams
  ): Promise<any> {
    const normalized = this.buildParams(params) || {};
    const v4Params: Record<string, string | number | undefined> = {};
    const geoId = normalized.geoIdV4 || normalized.geoidv4 || normalized.geoIDV4;

    // Use the most specific location identifier available:
    // geoIdV4 > POINT(lng,lat) > address > zipCode
    if (geoId) {
      v4Params.geoIdV4 = String(geoId);
    } else if (normalized.latitude && normalized.longitude) {
      v4Params.point = `POINT(${normalized.longitude},${normalized.latitude})`;
    } else if (normalized.address1 || normalized.address) {
      v4Params.address = String(normalized.address1 || normalized.address);
    } else if (normalized.postalcode || normalized.postalCode) {
      v4Params.zipCode = String(normalized.postalcode || normalized.postalCode);
    }

    // Pass through radius and pagination
    if (normalized.radius) v4Params.radius = normalized.radius;
    if (normalized.pagesize) v4Params.pagesize = normalized.pagesize;
    if (normalized.page) v4Params.page = normalized.page;

    // Pass through POI-specific filters
    if (normalized.categoryName) v4Params.categoryName = normalized.categoryName;
    if (normalized.LineOfBusinessName) v4Params.LineOfBusinessName = normalized.LineOfBusinessName;
    if (normalized.IndustryName) v4Params.IndustryName = normalized.IndustryName;
    if (normalized.categoryId) v4Params.categoryId = normalized.categoryId;

    console.log("[ATTOM] POI search params:", JSON.stringify(v4Params));
    const result = await this.requestV4("/neighborhood/poi", v4Params);
    console.log("[ATTOM] POI response keys:", result ? Object.keys(result) : "null");
    return result;
  }

  /**
   * Get POI category lookup — lists available business categories
   * Uses v4 endpoint: /v4/neighborhood/poi/categorylookup
   * Consolidates the former /poisearch/v2.0.0/business+category/lookup and
   * /poisearch/v2.0.0/lob/lookup into a single endpoint.
   */
  async getPOICategoryLookup(): Promise<any> {
    return this.requestV4("/neighborhood/poi/categorylookup", {});
  }

  /**
   * Convenience: fetch a full neighborhood profile for a given address
   * Combines community data (v4), school search (v4), POI (v4), and sales trends (v4) in parallel
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
    salesTrends: any;
  }> {
    console.log("[ATTOM] getNeighborhoodProfile called with:", JSON.stringify(options));

    // Community profile: uses v4 /neighborhood/community (requires geoIdV4).
    // getCommunityProfile will attempt to resolve geoIdV4 from address2/postalcode
    // via /location/lookup if not provided.
    const communityParams: AttomSearchParams = {
      postalcode: options.postalcode,
      geoIdV4: options.geoidv4,
      address1: options.address1,
      address2: options.address2,
      latitude: options.latitude,
      longitude: options.longitude,
    };

    // School search: v4 /school/search (accepts geoIdV4, lat/lng + radius)
    const schoolParams: AttomSearchParams = {
      latitude: options.latitude,
      longitude: options.longitude,
      postalcode: options.postalcode,
      geoIdV4: options.geoidv4,
      radius: options.radius || 3,
      pagesize: 15,
    };

    // POI search: v4 /neighborhood/poi (accepts geoIdV4, POINT, address, zipCode)
    const poiParams: AttomSearchParams = {
      geoIdV4: options.geoidv4,
      latitude: options.latitude,
      longitude: options.longitude,
      address1: options.address1,
      postalcode: options.postalcode,
      radius: options.radius || 5,
      pagesize: 25,
    };

    // Sales trends: uses v4 /transaction/salestrends (requires geoIdV4)
    // Fetch quarterly data for the last 3 years, for single-family residences (most relevant)
    const currentYear = new Date().getFullYear();
    const salesTrendParams: AttomSearchParams = {
      geoIdV4: options.geoidv4,
      postalcode: options.postalcode,
      interval: "quarterly",
      startyear: currentYear - 3,
      endyear: currentYear,
      propertytype: "SINGLE FAMILY RESIDENCE",
    };

    const [community, schools, poi, salesTrends] = await Promise.allSettled([
      this.getCommunityProfile(communityParams),
      this.getSchoolSearch(schoolParams),
      this.getPOISearch(poiParams),
      this.getSalesTrend(salesTrendParams),
    ]);

    console.log("[ATTOM] Neighborhood results - community:", community.status, "schools:", schools.status, "poi:", poi.status, "salesTrends:", salesTrends.status);
    if (community.status === "rejected") console.log("[ATTOM] Community rejection:", (community as PromiseRejectedResult).reason?.message);
    if (schools.status === "rejected") console.log("[ATTOM] Schools rejection:", (schools as PromiseRejectedResult).reason?.message);
    if (poi.status === "rejected") console.log("[ATTOM] POI rejection:", (poi as PromiseRejectedResult).reason?.message);
    if (salesTrends.status === "rejected") console.log("[ATTOM] Sales trends rejection:", (salesTrends as PromiseRejectedResult).reason?.message);

    return {
      community: community.status === "fulfilled" ? community.value : null,
      schools: schools.status === "fulfilled" ? schools.value : null,
      poi: poi.status === "fulfilled" ? poi.value : null,
      salesTrends: salesTrends.status === "fulfilled" ? salesTrends.value : null,
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
    return this.request("/property/buildingpermits", this.buildParams(params));
  }

  // ── Home Equity ───────────────────────────────────────────────────────

  /**
   * Get home equity calculation based on AVM and outstanding mortgage
   */
  async getHomeEquity(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/valuation/homeequity", this.buildParams(params));
  }

  // ── Hazard & Climate Risk ─────────────────────────────────────────────

  /**
   * Get natural hazard risk data for a property
   * Includes earthquake, flood, wildfire, wind, hail, tornado, hurricane, sinkhole
   */
  async getNaturalHazard(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/hazardrisk/detail", this.buildParams(params));
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
    return this.request("/valuation/rentalavm", this.buildParams(params));
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
   * Get sales trend data for an area.
   * Uses v4 endpoint: /v4/transaction/salestrends (supports geoIdV4, propertytype, transactiontype)
   * Falls back to v1: /propertyapi/v1.0.0/salestrend/snapshot
   */
  async getSalesTrend(
    params: AttomSearchParams
  ): Promise<any> {
    const built = this.buildParams(params) || {};
    // Build v4 params
    const v4Params: Record<string, string | number | undefined> = {};
    if (built.geoIdV4 || built.geoidv4 || built.geoIDV4)
      v4Params.geoIdV4 = String(built.geoIdV4 || built.geoidv4 || built.geoIDV4);
    if (built.interval) v4Params.interval = built.interval;
    if (built.startyear) v4Params.startyear = built.startyear;
    if (built.endyear) v4Params.endyear = built.endyear;
    if (built.startmonth) v4Params.startmonth = built.startmonth;
    if (built.endmonth) v4Params.endmonth = built.endmonth;
    if (built.startQuarter) v4Params.startquarter = built.startQuarter;
    if (built.endQuarter) v4Params.endquarter = built.endQuarter;
    if (built.propertytype || built.propertyType)
      v4Params.propertytype = String(built.propertytype || built.propertyType);
    if (built.transactiontype)
      v4Params.transactiontype = String(built.transactiontype);

    if (v4Params.geoIdV4) {
      try {
        return await this.requestV4("/transaction/salestrends", v4Params);
      } catch (e) {
        console.log("[ATTOM] v4 /transaction/salestrends failed, trying v1:", (e as Error).message);
      }
    }
    // Fallback to v1
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
   * Get transaction-level sales trend data (supports yearly/quarterly/monthly intervals)
   * Filters by geoIdV4, interval, year range, quarter range, month range,
   * property type, and transfer type
   */
  async getTransactionSalesTrend(
    params: AttomSearchParams
  ): Promise<any> {
    return this.request("/transaction/salestrend", this.buildParams(params));
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
