# Federal Government Data Sources & APIs for Real Estate

## Table of Contents
1. [USPS API / Address Management (includes Vacancy Data)](#1-usps-api--address-management)
2. [HUD (Housing and Urban Development)](#2-hud-housing-and-urban-development)
3. [Census Bureau](#3-census-bureau)
4. [FEMA](#4-fema)
5. [EPA](#5-epa)
6. [USDA](#6-usda)
7. [FHA/VA Loan Eligibility](#7-fhava-loan-eligibility)
8. [IRS](#8-irs)
9. [BLS (Bureau of Labor Statistics)](#9-bls-bureau-of-labor-statistics)
10. [CFPB (Consumer Financial Protection Bureau)](#10-cfpb-consumer-financial-protection-bureau)
11. [Freddie Mac / Fannie Mae / FHFA](#11-freddie-mac--fannie-mae--fhfa)
12. [Priority Ranking for Real Estate Agents](#12-priority-ranking-for-real-estate-agents)

---

## 1. USPS API / Address Management

### CRITICAL: OCCUPANCY/VACANCY STATUS

This is the primary federal source for occupancy/vacancy data at the individual address level.

### What Data Is Available
- **Address Validation & Standardization** - Validates and corrects USPS domestic addresses, city/state names, ZIP Codes (including ZIP+4)
- **City/State Lookup** - Returns city and state for a given ZIP Code
- **ZIP Code Lookup** - Returns ZIP Code for a given city and state
- **Vacancy Indicator** (Y/N) - Whether an address is currently receiving mail (determined by local letter carriers)
- **Residential Delivery Indicator (RDI)** (Y/N) - Whether the address is classified as residential or commercial
- **Delivery Point Validation (DPV)** - Confirms an address is a valid delivery point
- **Change of Address (COA)** data - Available through USPS NCOALink (restricted access)

### How Vacancy Is Determined
Letter carriers identify addresses that are valid but not currently collecting mail. This is recorded as a "Vacant Flag." Important distinctions:
- **Vacant (Y)** = Address could receive mail but is not currently receiving it
- **No-Stat** = Address is not expected to receive mail (demolitions, new construction not yet occupied, severely dilapidated)
- USPS does NOT capture the reason for vacancy

### API Endpoints & Access

#### New USPS Platform (developers.usps.com) - Active as of January 25, 2026
- **Base Portal**: https://developers.usps.com/
- **API Catalog**: https://developers.usps.com/apis
- **Addresses API v3**: https://developers.usps.com/addressesv3
- **Authentication**: OAuth 2.0 (Bearer Token in Authorization header)
- **Getting Started**: https://developers.usps.com/getting-started
- **GitHub Examples**: https://github.com/USPS/api-examples

**IMPORTANT**: The legacy Web Tools APIs were retired on January 25, 2026. All users must use the new platform.

#### Current Addresses v3 API Capabilities
- Address standardization and validation
- City/State lookup
- ZIP Code lookup
- Does NOT yet include vacancy indicators

#### Planned Enhanced Address API (Not Yet Released)
The Enhanced Address API will deliver DSF2 and DPV indicators including:
- Address status
- Delivery mode
- Business/residential type
- CMRA (Commercial Mail Receiving Agency)
- **Occupancy status** (this is the vacancy flag)
- Seasonal indicators
- Latitude/longitude
- Non-delivery days

### Cost
- **Free** to register and use
- Rate limit: **60 requests per hour** (can request higher limits, but approval process is opaque)
- Higher volume requires contacting USPS for upgraded access

### Rate Limits & Restrictions
- 60 requests/hour for standard access (as of January 2026)
- Higher limits available by request (no documented thresholds)
- API Access Control initiative launching April 2026

### Alternative Sources for USPS Vacancy Data

#### HUD Aggregated USPS Vacancy Data
- **URL**: https://www.huduser.gov/portal/datasets/usps.html
- **Data**: Quarterly aggregate counts of vacant/no-stat addresses by Census Tract
- **Access**: Restricted to governmental entities and non-profit organizations
- **Format**: Aggregated counts (NOT individual address lists)
- **Coverage**: Universe of all addresses in the US, updated quarterly
- **API**: https://www.huduser.gov/portal/dataset/uspszip-api.html

#### USPS Occupancy Trends (PostalPro)
- **URL**: https://postalpro.usps.com/ot
- **Data**: Aggregate vacant address counts by ZIP Code, carrier route, county, congressional district, census tract/block
- **Target Users**: Real estate, construction, marketing industries

#### Third-Party Providers (Parcel-Level Vacancy)
- **Regrid**: https://regrid.com/vacancy - Parcel-level vacancy data via API (paid, Pro/Enterprise)
- **Smarty**: https://www.smarty.com - CASS-certified address validation with vacancy flags
- These providers license USPS data and make it available at higher volumes and with parcel integration

### Caveats
- If mail goes to a P.O. Box, the physical address may be flagged as vacant incorrectly
- Multi-unit buildings may show incorrect vacancy for individual units
- Rural P.O. Box users often show as "no-stat" at their street address

### Value for Real Estate
- **THE most direct federal indicator of property occupancy** at the individual address level
- Identify potentially vacant/abandoned properties for investor clients
- Validate addresses before mailings or marketing campaigns
- Identify neighborhoods with high vacancy rates (via HUD aggregated data)
- Track occupancy trends over time for market analysis

---

## 2. HUD (Housing and Urban Development)

### What Data Is Available
- **Fair Market Rents (FMR)** - Estimated rental costs by area, bedroom count, used for Section 8 payment standards
- **Small Area Fair Market Rents (SAFMR)** - ZIP Code-level FMRs within metro areas
- **Income Limits** - HUD-defined income limits for assisted housing program eligibility
- **Housing Counseling Agencies** - Searchable database of HUD-approved housing counselors
- **USPS Vacancy Data (Aggregated)** - Quarterly vacancy counts by Census Tract
- **Comprehensive Housing Affordability Strategy (CHAS)** - Custom tabulations of ACS data on housing needs
- **Section 8 / Multifamily Assistance** - Contract data on subsidized housing
- **HOME Rent Limits** - Maximum rents for HOME Investment Partnerships program
- **HOPWA Income Limits** - Housing Opportunities for Persons with AIDS
- **Multifamily Tax Subsidy Income Limits**
- **GIS/Geospatial Data** - Public housing locations, community development areas

### API Endpoints & Access

#### HUD USER APIs (Require Free Access Token)
- **Registration**: https://www.huduser.gov/hudapi/public/register
- **Rate Limit**: 1,200 queries per minute

| API | Base URL | Description |
|-----|----------|-------------|
| Fair Market Rents | `https://www.huduser.gov/hudapi/public/fmr` | FMR data by entity/state/county/metro |
| Income Limits | `https://www.huduser.gov/hudapi/public/il` | Income limits for assisted housing |
| USPS Crosswalk | `https://www.huduser.gov/hudapi/public/usps` | ZIP-to-Tract, ZIP-to-County, etc. |
| CHAS | `https://www.huduser.gov/hudapi/public/chas` | Housing affordability data |

**FMR Endpoints:**
- `GET /fmr/data/{entityid}` - FMR for specific entity
- `GET /fmr/statedata/{state}` - FMR for a state
- `GET /fmr/listStates` - List all states
- `GET /fmr/listCounties/{state}` - List counties in a state
- `GET /fmr/listMetroAreas` - List metro areas

**Example Request:**
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://www.huduser.gov/hudapi/public/fmr/data/0801499999
```

#### Housing Counselor API (No Key Required)
- **URL**: `https://data.hud.gov/Housing_Counselor/search`
- Returns JSON, no API key needed
- Search by name, city, state, or location

#### HUD GIS Open Data (ArcGIS REST APIs)
- **URL**: https://hudgis-hud.opendata.arcgis.com/
- Geospatial datasets including public housing, FMR maps, community development areas
- Standard ArcGIS REST API format

#### Section 8 / Multifamily Data
- **URL**: https://www.hud.gov/hud-partners/multifamily-assist-section8-database
- Primarily downloadable Excel files (not a live API)
- Also available via Data.gov: https://catalog.data.gov/dataset/?tags=section-8

### Cost
- **Free** for all APIs
- Registration required for HUD USER APIs

### Value for Real Estate
- Determine fair rental prices in any area (essential for investment property analysis)
- Identify Section 8 payment standards for landlord clients
- Track vacancy trends at the Census Tract level (via USPS vacancy data)
- Find HUD-approved housing counseling agencies for buyer referrals
- Assess housing affordability in target markets

---

## 3. Census Bureau

### What Data Is Available
- **American Community Survey (ACS)** 1-Year and 5-Year estimates
- **Housing characteristics** - Vacancy rates, tenure (own/rent), median home values, housing age, units in structure
- **Demographics** - Population, age, race, ethnicity, household size
- **Economic data** - Median household income, poverty rates, employment
- **Migration flows** - Where people are moving from/to
- **Geographic granularity** - Nation, state, county, metro area, place, ZIP Code Tabulation Area (ZCTA), census tract, block group

### Key Housing Variables
| Variable Prefix | Description |
|----------------|-------------|
| B25001 | Total Housing Units |
| B25002 | Occupancy Status (Occupied vs. Vacant) |
| B25003 | Tenure (Owner-Occupied vs. Renter-Occupied) |
| B25004 | Vacancy Status (For Rent, For Sale, Seasonal, Other) |
| B25024 | Units in Structure |
| B25035 | Median Year Structure Built |
| B25064 | Median Gross Rent |
| B25077 | Median Value (Owner-Occupied) |
| B25088 | Median Monthly Housing Costs |
| DP04 | Selected Housing Characteristics (Data Profile) |
| CP04 | Housing Comparison Profile |

### API Endpoints & Access

- **API Base URL**: `https://api.census.gov/data/`
- **API Key Registration**: https://api.census.gov/data/key_signup.html
- **API Discovery**: https://api.census.gov/data.html (lists all 1,748+ dataset endpoints)
- **Developer Portal**: https://www.census.gov/developers/

**Example API Call (5-Year ACS, Housing Occupancy by State):**
```
https://api.census.gov/data/2024/acs/acs5?get=B25002_001E,B25002_002E,B25002_003E&for=state:*&key=YOUR_KEY
```
This returns total housing units, occupied units, and vacant units for all states.

**Key Dataset Endpoints:**
- `/data/2024/acs/acs5` - ACS 5-Year Estimates (down to block group)
- `/data/2024/acs/acs1` - ACS 1-Year Estimates (areas 65,000+ pop)
- `/data/2024/acs/acs5/profile` - Data Profiles (DP tables)
- `/data/2024/acs/acs5/subject` - Subject Tables

### Cost
- **Free** with API key
- API key obtained by providing email address (instant)

### Rate Limits
- 500 requests per day without key
- Higher limits with API key (generally generous)

### Value for Real Estate
- **Vacancy rates by Census tract** (B25002, B25004) - Critical for market analysis
- Median home values and rents for comparable market analysis
- Demographic profiles for understanding buyer/renter populations
- Migration data to identify growing/declining markets
- Income data for loan qualification analysis
- Housing stock age for renovation/investment targeting

---

## 4. FEMA

### What Data Is Available
- **Disaster Declarations** - All federally declared disasters with dates, types, locations
- **National Flood Hazard Layer (NFHL)** - Flood zone maps for entire US
- **Flood Insurance Rate Maps (FIRM)** - Official maps for flood insurance
- **NFIP Claims Data** - Historical flood insurance claims (redacted)
- **NFIP Policy Data** - Active flood insurance policies (redacted)
- **Individual Assistance** - Disaster aid to individuals/households
- **Public Assistance** - Grants for community recovery
- **Hazard Mitigation** - Mitigation grant data

### API Endpoints & Access

#### OpenFEMA API (No Key Required, Free)
- **Base URL**: `https://www.fema.gov/api/open/v2/`
- **Documentation**: https://www.fema.gov/about/openfema/api
- **All Datasets**: https://www.fema.gov/about/openfema/data-sets
- **Developer Resources**: https://www.fema.gov/about/openfema/developer-resources
- **GitHub Samples**: https://github.com/FEMA/openfema-samples

**Key Endpoints:**

| Endpoint | Description |
|----------|-------------|
| `/v2/DisasterDeclarationsSummaries` | All disaster declarations |
| `/v2/FemaWebDisasterSummaries` | Disaster summaries |
| `/v2/HousingAssistanceOwners` | IA housing assistance for owners |
| `/v2/HousingAssistanceRenters` | IA housing assistance for renters |
| `/v2/FimaNfipClaims` | NFIP flood insurance claims |
| `/v2/FimaNfipPolicies` | NFIP flood insurance policies |
| `/v2/HazardMitigationAssistanceProjects` | Mitigation projects |
| `/v2/PublicAssistanceFundedProjectsDetails` | PA project details |

**Example Request:**
```bash
# Get disaster declarations for a specific state
curl "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=state eq 'TX'"

# Get flood insurance claims for a county
curl "https://www.fema.gov/api/open/v2/FimaNfipClaims?$filter=countyCode eq '12086'"
```

#### National Flood Hazard Layer (GIS Services)
- **NFHL Viewer**: https://www.fema.gov/flood-maps/national-flood-hazard-layer
- **Flood Map Service Center**: https://msc.fema.gov/
- **ArcGIS Viewer**: Available for embedding in applications
- **GIS Web Services**: Dedicated REST services for incorporating NFHL into applications

#### Third-Party Flood Data API
- **National Flood Data**: https://docs.nationalflooddata.com/dataservice/v3/index.html
- Requires API key (paid service)
- Used by insurance companies, appraisers, real estate investors

### Cost
- **OpenFEMA API**: Completely free, no key required
- **NFHL GIS Services**: Free
- **Third-party flood APIs**: Paid

### Rate Limits
- Default return: 1,000 records per request
- Use `$skip` parameter for pagination
- `$allrecords` parameter (BETA) to force all records

### Value for Real Estate
- **Flood zone determination** is critical for every property transaction
- Historical disaster data reveals risk patterns by area
- Flood insurance claims history indicates problem areas
- Required disclosure in many states
- Affects insurance costs and property values significantly
- Hazard mitigation data shows community resilience efforts

---

## 5. EPA

### What Data Is Available
- **Superfund Sites (NPL)** - National Priorities List contaminated sites
- **Brownfields** - Former industrial sites being cleaned up
- **Air Quality (AQS)** - Ambient air monitoring data from thousands of stations
- **Toxic Release Inventory (TRI)** - Toxic chemical releases by facility
- **Safe Drinking Water (SDWIS)** - Drinking water system compliance
- **RCRA (Hazardous Waste)** - Hazardous waste handler information
- **Lead Paint Risk** - Via EJScreen (based on housing age, pre-1960)
- **Environmental Justice Indicators** - Demographic + environmental burden mapping
- **Facility Registry (FRS)** - All EPA-regulated facilities

### API Endpoints & Access

#### Envirofacts Data Service API
- **URL**: https://www.epa.gov/enviro/envirofacts-data-service-api
- **No key required, free**
- Covers: Superfund (SEMS), RCRA, TRI, SDWIS, Air (ICIS-AIR), FRS, and more

**Example Query Format:**
```
https://enviro.epa.gov/enviro/efservice/{table_name}/{column}/{operator}/{value}/JSON
```

#### Air Quality System (AQS) Data Mart API
- **Base URL**: `https://aqs.epa.gov/data/api/`
- **Documentation**: https://aqs.epa.gov/aqsweb/documents/data_api.html
- **Requires registration** (free, email validation)
- **Output**: JSON only
- **Data volume**: ~3.4 billion rows

**Key AQS Endpoints:**
- `list/states` - List all states
- `monitors/byState` - Monitor info by state
- `sampleData/byCounty` - Sample data by county
- `dailyData/byState` - Daily aggregated data
- `annualData/byState` - Annual aggregated data

**Data aggregation levels**: site, county, state, bounding box, CBSA, monitoring agency, PQAO

#### EJScreen (Environmental Justice)
- **Original EPA tool discontinued February 2025**
- **Third-party mirror**: https://screening-tools.com/epa-ejscreen
- Includes lead paint indicator based on pre-1960 housing stock
- Block-group level data

#### Additional EPA Tools
- **ECHO (Enforcement & Compliance)**: Inspection, violation, and enforcement data
- **MyProperty**: Search across multiple EPA databases for a specific property
- **EnviroMapper**: Map environmental information by location

### Cost
- **Free** for all EPA APIs
- AQS requires email registration

### Client Libraries
- **R**: `RAQSAPI` package, `epair` package
- **Python**: `pyaqsapi` module

### Value for Real Estate
- **Superfund/brownfield proximity** dramatically affects property values
- Environmental contamination is a required disclosure in many jurisdictions
- Air quality data for quality-of-life assessments
- Lead paint risk indicators for older properties
- TRI data shows proximity to polluting facilities
- Critical for commercial real estate due diligence

---

## 6. USDA

### What Data Is Available
- **Rural Development Property Eligibility** - Whether a property qualifies for USDA loan programs
- **Income Eligibility** - Household income limits for USDA loans by area
- **Rural area classifications** - Population-based rural/non-rural designations
- **Multifamily Housing data** - USDA Rural Development housing assistance

### API Endpoints & Access

#### USDA Eligibility Map (Interactive Tool)
- **URL**: https://eligibility.sc.egov.usda.gov/eligibility/welcomeAction.do?pageAction=sfp
- Interactive map tool for individual property lookups
- Color-coded: eligible areas in green

#### Data.gov API Access
- **URL**: https://catalog.data.gov/dataset/usda-rural-development-property-eligibility-sfh-mfh
- USDA Rural Development Property Eligibility (SFH/MFH) dataset
- Available via Data.gov API

### Eligibility Criteria
- **Tier 1**: Areas with no more than 10,000 residents
- **Tier 2**: 10,001-20,000 residents, not in an MSA
- **Tier 3**: 20,001-35,000 residents, previously classified as rural
- ~97% of US land area falls within USDA-eligible boundaries
- 2026 income limits: $119,850 (1-4 person household), $158,250 (5-8 person)

### Cost
- **Free** for eligibility lookups and data access

### Map Updates
- Updated annually following new Census data release
- Areas can gain or lose eligibility year to year

### Value for Real Estate
- Identify properties eligible for **zero-down-payment USDA loans**
- Significant competitive advantage in rural/suburban markets
- Covers surprisingly large areas (many suburban properties qualify)
- Income eligibility data helps pre-qualify buyers
- USDA loans have competitive interest rates and no PMI

---

## 7. FHA/VA Loan Eligibility

### FHA (Federal Housing Administration)

#### What Data Is Available
- FHA loan limits by county (floor: $524,225, ceiling: $1,209,750 in 2025)
- FHA Single-Family Portfolio Snapshots
- FHA HECM (reverse mortgage) data
- FHA Multifamily data (insured mortgages)

#### Access
- FHA data is primarily available through **HUD** (see Section 2)
- FHA loan limits: https://www.hud.gov/fha
- No dedicated FHA-specific REST API; data distributed through HUD datasets and downloadable files

### VA (Department of Veterans Affairs)

#### What Data Is Available
- Certificate of Eligibility (COE) verification
- VA loan guaranty data
- Property appraisal data
- Funding fee calculations

#### VA Developer API Platform
- **URL**: https://developer.va.gov/explore
- **Modern API platform** with multiple loan-related endpoints

**Key VA APIs:**

| API | Description | Access |
|-----|-------------|--------|
| Eligibility API | Obtain COE and early loan feedback | Business Partner |
| Guaranty Remittance API | Submit closed loans for guaranty | Business Partner |
| Loan Review API | Transmit Full File Loan Review documents | Business Partner (Required since Nov 2024) |
| Loan Lookup | Verify VA loan ownership | Business Partner |

#### Access Requirements
- Public APIs: Register for free account at developer.va.gov
- Business Partner APIs: Must be an approved VA business partner (typically lenders)
- Uses OAuth 2.0 authentication

### Cost
- **Free** for registered users/partners
- Business partner APIs require approval relationship with VA

### Value for Real Estate
- Pre-qualify veteran buyers by checking COE eligibility
- Understand VA loan limits and funding fee structure
- Streamline the loan process for veteran clients
- VA loans offer zero down payment, no PMI
- Identify VA-eligible properties (occupancy requirements apply)

---

## 8. IRS

### What Data Is Available
The IRS Statistics of Income (SOI) Division provides:
- **ZIP Code-level income data** - Adjusted gross income, deductions, credits (Tax Years 1998, 2001, 2004-2022)
- **County-level income data** - Income data by county (Tax Years 1989-2022)
- **Migration data** - County-to-county migration flows based on tax return address changes
- **Individual tax statistics** - High income returns, income tax rates, geographic breakdowns
- **Foreign person property sales** - Form 8288-A data on foreign sales of US real property

### Access Method
- **No REST API** - IRS distributes data as downloadable CSV and Excel files
- **URL**: https://www.irs.gov/statistics
- **ZIP Code Data**: https://www.irs.gov/statistics/soi-tax-stats-individual-income-tax-statistics-zip-code-data-soi
- **County Data**: https://www.irs.gov/statistics/soi-tax-stats-county-data
- **Third-party**: NBER mirrors the data; some GitHub repos provide consolidated datasets

### Cost
- **Free** downloads

### Limitations
- Data has a ~2-year lag (most recent is typically Tax Year 2022)
- No real-time API access
- Individual taxpayer data is never disclosed

### Value for Real Estate
- **ZIP Code income data** reveals purchasing power and affluence patterns
- **Migration data** shows where people are moving (demand indicators)
- County-level economic health assessment
- Target marketing based on income demographics
- Foreign investment patterns in US real estate

---

## 9. BLS (Bureau of Labor Statistics)

### What Data Is Available
- **Employment/Unemployment** - National, state, metro, and county level
- **Local Area Unemployment Statistics (LAUS)** - Monthly unemployment by area
- **Consumer Price Index (CPI)** - Inflation and cost of living
- **Job Openings (JOLTS)** - Labor market tightness
- **Wages and Earnings** - Average wages by occupation, area, industry
- **Quarterly Census of Employment and Wages (QCEW)** - Employer-level data
- **Industry Productivity** - Output per hour worked
- **Employment Projections** - Future job growth by occupation

### API Endpoints & Access

- **API Features**: https://www.bls.gov/bls/api_features.htm
- **Developer Home**: https://www.bls.gov/developers/home.htm
- **Base URL**: `https://api.bls.gov/publicAPI/v2/timeseries/data/`

**Two Versions:**

| Feature | v1.0 (No Key) | v2.0 (Key Required) |
|---------|---------------|---------------------|
| Daily query limit | 25 | 500 |
| Series per query | 25 | 50 |
| Years per query | 10 | 20 |
| Net/percent changes | No | Yes |
| Series descriptions | No | Yes |
| Registration | No | Yes (free, via email) |

**Example Request:**
```bash
# Get unemployment rate (series LNS14000000)
curl -X POST "https://api.bls.gov/publicAPI/v2/timeseries/data/" \
  -H "Content-Type: application/json" \
  -d '{"seriesid":["LNS14000000"],"startyear":"2024","endyear":"2026","registrationkey":"YOUR_KEY"}'
```

### Cost
- **Free** (both versions)
- API key obtained by providing email address

### Key Series for Real Estate
- `LAUS` series - Local unemployment rates
- `CPI` series - Cost of living / inflation
- `OEWS` series - Occupational wages by area
- `QCEW` series - Employment by county

### Client Libraries
- **R**: `blsAPI` package
- **Python**: Various community packages

### Value for Real Estate
- **Local unemployment rates** directly correlate with housing demand
- Wage data indicates purchasing power in target markets
- CPI data for rental escalation and cost-of-living comparisons
- Job growth data predicts future housing demand
- Employment concentration reveals economic diversification (risk assessment)

---

## 10. CFPB (Consumer Financial Protection Bureau)

### HMDA (Home Mortgage Disclosure Act) Data

#### What Data Is Available
- Loan-level mortgage origination and denial data
- Borrower demographics (race, ethnicity, sex, income)
- Property information (type, location by census tract)
- Loan characteristics (amount, type, purpose, rate spread)
- Lender information (institution name, type)
- Action taken (originated, denied, withdrawn, etc.)
- ~4,898 HMDA filers report annually

#### API Endpoints

**Data Browser API (No Auth Required)**
- **Base URL**: `https://ffiec.cfpb.gov/v2/data-browser-api/`
- **Documentation**: https://ffiec.cfpb.gov/documentation/api/data-browser/
- **Interactive Tool**: https://ffiec.cfpb.gov/data-browser/

**Key Endpoints:**

| Endpoint | Description |
|----------|-------------|
| `GET /view/aggregations?years={year}` | Nationwide aggregated data (JSON) |
| `GET /view/csv?years={year}` | Nationwide raw data (CSV, streamed) |
| `GET /view/aggregations?states={state}&years={year}` | State-level aggregations |
| `GET /view/csv?counties={fips}&years={year}` | County-level raw data |

**Filter Parameters:**
- Geographic: `states`, `msamds`, `counties`
- HMDA Data: `actions_taken`, `races`, `sexes`, `ethnicities`, `loan_types`, `loan_purposes`, `lien_statuses`, `construction_methods`, `dwelling_categories`, `loan_products`, `total_units`
- Financial Institution: LEI (Legal Entity Identifier)

**Example Request:**
```bash
curl "https://ffiec.cfpb.gov/v2/data-browser-api/view/aggregations?states=MD&years=2024&actions_taken=1&loan_types=1"
```

### Consumer Complaint Database

#### What Data Is Available
- Consumer complaints about financial products/services
- Company responses
- Product categories (mortgages, credit cards, etc.)
- Issue descriptions
- Geographic data (state, ZIP)
- Updated daily

#### API Endpoints
- **Documentation**: https://cfpb.github.io/api/ccdb/
- **Search API**: https://cfpb.github.io/ccdb5-api/
- **GitHub**: https://github.com/cfpb/ccdb5-api
- **Output formats**: JSON, CSV, XLS, XLSX
- **No API key required**

### Cost
- **Free**, no authentication required for Data Browser API
- HMDA Filing API requires Login.gov authentication

### Value for Real Estate
- **Lending pattern analysis** reveals which lenders are active in an area
- Denial rate data by demographics and geography
- Identify underserved markets for lending
- Track complaint trends against mortgage servicers
- Monitor lending discrimination patterns
- Understand loan product mix in target markets

---

## 11. Freddie Mac / Fannie Mae / FHFA

### Freddie Mac

#### What Data Is Available
- **Primary Mortgage Market Survey (PMMS)** - Weekly average mortgage rates since 1971
- **House Price Index (FMHPI)** - Monthly repeat-transactions home price index
- **Single-Family Loan Performance Data** - Loan-level credit performance on ~55 million mortgages (1999-2025)
- **Income Limits API** - Conforming loan limits by county

#### Access Methods

**Freddie Mac Developer Portal:**
- Income Limits API (updated December 2025): Submit a property address, receive conforming loan limit for the county
- Access via Freddie Mac Developer Portal

**PMMS Data:**
- **Website**: https://www.freddiemac.com/pmms
- **Archives**: https://www.freddiemac.com/pmms/pmms_archives
- **FRED API** (recommended for programmatic access): Available through Federal Reserve Economic Data API
- Weekly data released every Thursday

**House Price Index:**
- **URL**: https://www.freddiemac.com/research/indices/house-price-index
- Monthly release, ~1 month lag
- Single-family detached and townhomes only (excludes condos, co-ops)

**Loan Performance Dataset:**
- **URL**: https://www.freddiemac.com/research/datasets/sf-loanlevel-dataset
- Free for non-commercial/academic use
- Available via Clarity Data Intelligence portal
- 108 fields per loan record

### Fannie Mae

#### What Data Is Available
- **Loan Lookup** - Determine if a loan is owned by Fannie Mae
- **Mission Score API** - Loan-level mission scores (0-3)
- **Property Data API** - Property data and images
- **Single-Family Loan Performance Data** - Similar to Freddie Mac
- **Data Dynamics** - MBS, CRT, historical loan performance, housing & economic data

#### Developer Portal
- **URL**: https://singlefamily.fanniemae.com/applications-technology/application-programming-interfaces-apis-developer-portal
- **Public APIs**: Open to anyone with free registration
- **Business Partner APIs**: Require approved Fannie Mae business partner status

### FHFA (Federal Housing Finance Agency)

#### What Data Is Available
- **Conforming Loan Limits (CLL)** - Annual limits by county
  - 2026: $832,750 (baseline one-unit), higher in high-cost areas
  - 2025: $806,500
- **House Price Index (HPI)** - Used to set conforming loan limits
- **Public Use Database** - Loan-level data on Fannie/Freddie acquisitions

#### Access
- **CLL Data**: https://www.fhfa.gov/data/conforming-loan-limit
- **HPI Data**: Available for download and via FRED API

### Cost
- **Freddie Mac**: Free for public data; loan-level data free for non-commercial use
- **Fannie Mae**: Public APIs free; business partner APIs require approval
- **FHFA**: Free

### Value for Real Estate
- **Current mortgage rates** (PMMS) for buyer consultation
- **Conforming loan limits** determine conventional vs. jumbo loan thresholds
- **House price indices** for market trend analysis
- Loan performance data for understanding credit risk patterns
- Property data APIs for automated property analysis

---

## 12. Priority Ranking for Real Estate Agents

### Tier 1: Essential (Integrate First)
| Source | Key Data | Why Essential |
|--------|----------|---------------|
| **USPS (via HUD or Enhanced API)** | Vacancy/occupancy status | **Direct occupancy indicator** - the primary federal source |
| **Census Bureau** | Demographics, income, housing characteristics, vacancy rates | Foundation for all market analysis |
| **FHFA / Freddie Mac** | Conforming loan limits, mortgage rates | Every transaction involves financing |
| **FEMA** | Flood zones | Required for virtually every transaction |

### Tier 2: High Value (Integrate Next)
| Source | Key Data | Why High Value |
|--------|----------|---------------|
| **HUD** | Fair market rents, income limits, Section 8 data | Essential for rental/investment analysis |
| **CFPB HMDA** | Mortgage lending patterns | Understand lending landscape |
| **BLS** | Employment, wages, unemployment | Economic health of target markets |
| **USDA** | Rural loan eligibility | Zero-down financing for qualifying properties |

### Tier 3: Valuable (Enhance Over Time)
| Source | Key Data | Why Valuable |
|--------|----------|--------------|
| **EPA** | Superfund, brownfields, air quality, lead paint | Environmental due diligence |
| **IRS SOI** | ZIP code income, migration | Demand prediction, targeting |
| **VA** | Veteran eligibility | Serve veteran buyer segment |
| **Fannie Mae** | Loan lookup, property data | Transaction processing |
| **CFPB Complaints** | Complaint data | Lender/servicer reputation |

### Occupancy Status: Summary of All Federal Sources

| Source | Granularity | Update Frequency | Access |
|--------|-------------|------------------|--------|
| **USPS Enhanced Address API** (planned) | Individual address | Real-time | Free (rate-limited) |
| **USPS Occupancy Trends** | ZIP/carrier route/tract | Quarterly | Via PostalPro |
| **HUD Aggregated USPS** | Census Tract | Quarterly | Free (govt/nonprofit only) |
| **Census ACS (B25002, B25004)** | Block group | Annual (5-yr) | Free API |
| **Regrid (third-party USPS)** | Individual parcel | Monthly | Paid |
| **Smarty (third-party USPS)** | Individual address | Real-time | Paid |

---

## Quick Reference: All API Base URLs

```
USPS Addresses v3:     https://developers.usps.com/addressesv3
HUD FMR API:           https://www.huduser.gov/hudapi/public/fmr
HUD IL API:            https://www.huduser.gov/hudapi/public/il
HUD USPS Crosswalk:    https://www.huduser.gov/hudapi/public/usps
HUD CHAS API:          https://www.huduser.gov/hudapi/public/chas
HUD Counseling:        https://data.hud.gov/Housing_Counselor/search
Census API:            https://api.census.gov/data/
OpenFEMA:              https://www.fema.gov/api/open/v2/
EPA Envirofacts:       https://enviro.epa.gov/enviro/efservice/
EPA AQS:               https://aqs.epa.gov/data/api/
BLS API:               https://api.bls.gov/publicAPI/v2/timeseries/data/
HMDA Data Browser:     https://ffiec.cfpb.gov/v2/data-browser-api/
CFPB Complaints:       https://cfpb.github.io/api/ccdb/
USDA Eligibility:      https://eligibility.sc.egov.usda.gov/
VA Developer Portal:   https://developer.va.gov/explore
Fannie Mae Portal:     https://singlefamily.fanniemae.com/.../developer-portal
FHFA CLL Data:         https://www.fhfa.gov/data/conforming-loan-limit
```

## Authentication Requirements Summary

| Source | Auth Type | Key Required | Registration |
|--------|-----------|-------------|--------------|
| USPS | OAuth 2.0 Bearer Token | Yes | developers.usps.com |
| HUD USER APIs | Bearer Token | Yes | huduser.gov (free) |
| HUD Counseling | None | No | None |
| Census | API Key (query param) | Recommended | census.gov (free, instant) |
| OpenFEMA | None | No | None |
| EPA Envirofacts | None | No | None |
| EPA AQS | Email + Key | Yes | Email registration |
| BLS v1 | None | No | None |
| BLS v2 | Registration Key | Yes | Email registration |
| HMDA Browser | None | No | None |
| CFPB Complaints | None | No | None |
| VA APIs | OAuth 2.0 | Yes | developer.va.gov |
| Fannie Mae | Registration | Yes | Developer portal |
| Freddie Mac | Registration | Yes | Developer portal |
