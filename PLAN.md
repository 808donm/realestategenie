# Implementation Plan: Seller Opportunity Map + Predictive Seller Scoring

## Overview
Two tightly coupled features:
1. **Predictive Seller Scoring** — Rule-based algorithm that scores property owners on likelihood to sell (0-100)
2. **Seller Opportunity Map** — Mapbox GL JS map visualization showing scored properties with heat map, TMK overlay (Hawaii), and one-click lead creation

## Architecture Decisions
- **Map library**: Mapbox GL JS (`mapbox-gl` + `react-map-gl`) — replacing existing Leaflet deps
- **Scope**: National-ready with Hawaii TMK bonus layer
- **Scoring**: Deterministic rule-based (no AI per-property)
- **Data source**: Realie API (primary) — already has equity, ownership, LTV, foreclosure, absentee, transfer history, and geometry
- **Hawaii bonus**: Hawaii Statewide Parcels ArcGIS client (already built) for TMK parcel boundaries

---

## Step 1: Install Mapbox GL JS dependencies

**Files changed:**
- `package.json` — add `mapbox-gl`, `react-map-gl`, `@types/mapbox-gl`; remove `leaflet`, `react-leaflet`, `@types/leaflet`

**Actions:**
```bash
npm install mapbox-gl react-map-gl
npm install -D @types/mapbox-gl
npm uninstall leaflet react-leaflet @types/leaflet
```

**Env var needed:** `NEXT_PUBLIC_MAPBOX_TOKEN` — user must add their Mapbox access token to `.env.local`

---

## Step 2: Create Seller Motivation Scoring Engine

**New file:** `src/lib/scoring/seller-motivation-score.ts`

Rule-based scoring algorithm (0-100) using these weighted factors from Realie data:

| Factor | Weight | Data Field | Logic |
|--------|--------|------------|-------|
| High equity | 20 pts | `equityCurrentEstBal`, `LTVCurrentEstCombined` | LTV < 50% = 20pts, < 70% = 12pts, < 80% = 6pts |
| Long ownership | 20 pts | `ownershipStartDate` | >15yr = 20pts, >10yr = 15pts, >7yr = 10pts, >5yr = 5pts |
| Absentee owner | 15 pts | `ownerAddressFull` vs `address` | Owner address != property address = 15pts |
| Multiple properties | 10 pts | `ownerParcelCount` | >5 = 10pts, >2 = 7pts, >1 = 4pts |
| Distress signals | 15 pts | `forecloseCode`, `totalLienCount`, `totalLienBalance` | Active foreclosure = 15pts, high lien count = 10pts, high lien balance relative to value = 8pts |
| Transfer recency | 10 pts | `transferDate` | No transfer in 10+ years = 10pts, 7+ = 7pts, 5+ = 4pts |
| Tax delinquency | 10 pts | `taxValue` vs `totalAssessedValue` | Ratio anomalies or missing = 10pts |

**Exports:**
```typescript
type SellerScore = {
  score: number;           // 0-100
  level: 'very-likely' | 'likely' | 'possible' | 'unlikely';
  factors: SellerFactor[]; // Which factors contributed and how many points
}

type SellerFactor = {
  name: string;
  points: number;
  maxPoints: number;
  description: string;
}

function calculateSellerMotivationScore(property: RealieParcel): SellerScore
function getSellerLevel(score: number): SellerScore['level']
function getSellerColor(level: SellerScore['level']): string
```

---

## Step 3: Create Seller Opportunity Map API Route

**New file:** `app/api/seller-map/route.ts`

**GET** `/api/seller-map?lat=21.3&lng=-157.8&radius=2&filters=...`

Parameters:
- `lat`, `lng` — map center coordinates
- `radius` — search radius in miles (default 2, max 10)
- `minScore` — minimum seller motivation score to return (default 0)
- `propertyType` — filter by residential, condo, etc.
- `minEquity` — minimum equity percentage
- `absenteeOnly` — boolean
- `limit` — max results (default 100, max 500)

Response:
```json
{
  "properties": [
    {
      "id": "parcelId",
      "lat": 21.3,
      "lng": -157.8,
      "address": "123 Main St",
      "score": 85,
      "level": "very-likely",
      "factors": [...],
      "owner": "John Doe",
      "equity": 450000,
      "ltv": 35,
      "ownershipYears": 12,
      "absentee": true,
      "propertyType": "residential",
      "estimatedValue": 850000,
      "geometry": {...}  // parcel boundary if available
    }
  ],
  "total": 150,
  "center": { "lat": 21.3, "lng": -157.8 },
  "radiusMiles": 2
}
```

Flow:
1. Use Realie client `searchByRadius(lat, lng, radius)` or `searchByZip()` to fetch properties
2. Run `calculateSellerMotivationScore()` on each
3. Filter by `minScore` and other params
4. Sort by score descending
5. Return paginated results with scores and factors

---

## Step 4: Create Hawaii TMK Overlay API Route

**New file:** `app/api/seller-map/tmk-overlay/route.ts`

**GET** `/api/seller-map/tmk-overlay?county=HONOLULU&zone=1&section=2`

Uses existing `HawaiiStatewideParcelClient.getParcelsBySection()` with `returnGeometry: true` to return GeoJSON polygons for TMK parcel boundaries.

Response: GeoJSON FeatureCollection that Mapbox can render as a layer.

---

## Step 5: Build Mapbox Map Component

**New file:** `app/app/seller-map/map-view.client.tsx`

A client component using `react-map-gl` with:

**Map Layers:**
1. **Property markers** — Colored circles by seller score (red = very likely, orange = likely, yellow = possible, blue = unlikely)
2. **Heat map layer** — Density-based heat visualization of high-score clusters
3. **TMK parcel boundaries** — GeoJSON polygon overlay (Hawaii only, toggleable)
4. **Satellite/street toggle** — Mapbox style switcher

**Map Controls:**
- Zoom/pan with bounding box search trigger
- Geocoder search (Mapbox Geocoding API for address-to-coordinates)
- Layer visibility toggles (heat map, markers, TMK parcels)
- Score range slider filter
- Property type filter dropdown

**Interactions:**
- Click marker → popup card with property summary, score breakdown, and actions
- Cluster zoom on dense areas
- Drag/zoom triggers new data fetch for visible bounds

---

## Step 6: Build Seller Map Sidebar Panel

**New file:** `app/app/seller-map/sidebar-panel.client.tsx`

Left sidebar showing:
- **Filter controls**: Score range, property type, equity min, absentee toggle, ownership years
- **Results list**: Sorted by score, showing address, score badge, key factors
- **Click a result** → map pans to that property and opens popup
- **Stats summary**: Total properties in view, average score, score distribution chart

---

## Step 7: Build Property Detail Card / Popup

**New file:** `app/app/seller-map/property-card.client.tsx`

When user clicks a map marker or list item:
- Property address and photo (if available)
- Seller Motivation Score with visual gauge (0-100)
- Factor breakdown: which factors contributed how many points
- Key data: equity, LTV, ownership years, owner name, absentee status
- **Action buttons:**
  - "Add to CRM" → creates GHL contact + opportunity via existing `ghl-client.ts`
  - "Generate Report" → links to existing property intelligence report
  - "Run CMA" → links to existing CMA builder
  - "View on QPublic" → uses existing `qpub_link` from Hawaii parcel data

---

## Step 8: Build the Seller Map Page

**New file:** `app/app/seller-map/page.tsx`

Server component that renders the page layout:
- Full-width map (right ~70%) + sidebar (left ~30%)
- Header with title "Seller Opportunity Map" and saved search management
- Breadcrumb navigation back to prospecting
- Responsive: on mobile, sidebar becomes a bottom sheet

---

## Step 9: Add Navigation and Feature Gating

**Files changed:**
- `app/app/layout.tsx` or sidebar navigation — add "Seller Map" nav item with map icon
- Link from existing prospecting page to seller map
- Ensure feature is gated by subscription plan (professional+ or enterprise)

---

## Step 10: Add Supabase Migration for Saved Searches

**New file:** `supabase/migrations/YYYYMMDDHHMMSS_seller_map_saved_searches.sql`

```sql
CREATE TABLE seller_map_saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  team_id UUID REFERENCES teams(id),
  name TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius_miles DOUBLE PRECISION DEFAULT 2,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE seller_map_saved_searches ENABLE ROW LEVEL SECURITY;
-- RLS: agents see own + team searches
```

---

## File Summary

### New Files (10)
1. `src/lib/scoring/seller-motivation-score.ts` — Scoring engine
2. `app/api/seller-map/route.ts` — Map data API
3. `app/api/seller-map/tmk-overlay/route.ts` — Hawaii TMK GeoJSON API
4. `app/app/seller-map/page.tsx` — Page (server component)
5. `app/app/seller-map/map-view.client.tsx` — Mapbox map component
6. `app/app/seller-map/sidebar-panel.client.tsx` — Filter sidebar
7. `app/app/seller-map/property-card.client.tsx` — Property detail popup
8. `app/app/seller-map/saved-searches.client.tsx` — Saved search management
9. `supabase/migrations/YYYYMMDDHHMMSS_seller_map_saved_searches.sql` — DB migration
10. `app/api/seller-map/saved-searches/route.ts` — CRUD API for saved searches

### Modified Files (2-3)
1. `package.json` — Swap Leaflet → Mapbox GL JS
2. Navigation component — Add seller map link
3. `.env.local.example` — Document NEXT_PUBLIC_MAPBOX_TOKEN

### Dependencies on Existing Code
- `src/lib/integrations/realie-client.ts` — Primary property data source
- `src/lib/integrations/hawaii-statewide-parcels-client.ts` — TMK overlay data
- `src/lib/integrations/honolulu-tax-client.ts` — Honolulu tax enrichment
- `src/lib/integrations/ghl-client.ts` — CRM lead creation from map
- Supabase auth — Agent/team context for saved searches

---

## Implementation Order
1. Scoring engine (Step 2) — no dependencies, can test immediately
2. Dependencies install (Step 1)
3. Map data API (Step 3) + TMK API (Step 4) — server-side, testable via curl
4. Map component (Step 5) + Sidebar (Step 6) + Property card (Step 7)
5. Page assembly (Step 8) + Navigation (Step 9)
6. Saved searches (Step 10) — enhancement, can ship without

Estimated: ~12-15 files, ~2000-2500 lines of new code.
