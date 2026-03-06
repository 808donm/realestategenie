/**
 * OpenStreetMap POI Client — Free points of interest from Overpass API
 *
 * Source: Overpass API (https://overpass-api.de/) — free, no key required
 * Uses OpenStreetMap data for nearby businesses, parks, hospitals, etc.
 */

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export interface POIResult {
  name: string;
  category: string;
  subcategory?: string;
  latitude: number;
  longitude: number;
  distanceMiles?: number;
  address?: string;
  phone?: string;
}

export interface POISearchResult {
  pois: POIResult[];
  totalCount: number;
  categories: string[];
}

/**
 * Calculate distance in miles (Haversine)
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Map OSM amenity/shop/leisure tags to human-readable categories
const CATEGORY_MAP: Record<string, string> = {
  // Amenities
  restaurant: "Restaurant",
  fast_food: "Fast Food",
  cafe: "Cafe",
  bar: "Bar",
  pub: "Pub",
  hospital: "Hospital",
  clinic: "Medical",
  doctors: "Medical",
  dentist: "Dentist",
  pharmacy: "Pharmacy",
  bank: "Bank",
  atm: "ATM",
  post_office: "Post Office",
  police: "Police",
  fire_station: "Fire Station",
  library: "Library",
  school: "School",
  kindergarten: "School",
  college: "College",
  university: "University",
  place_of_worship: "Place of Worship",
  fuel: "Gas Station",
  parking: "Parking",
  cinema: "Entertainment",
  theatre: "Entertainment",
  community_centre: "Community Center",
  childcare: "Childcare",
  // Shops
  supermarket: "Grocery",
  convenience: "Convenience Store",
  department_store: "Department Store",
  mall: "Shopping Mall",
  clothes: "Clothing Store",
  hardware: "Hardware Store",
  electronics: "Electronics",
  furniture: "Furniture",
  bakery: "Bakery",
  butcher: "Butcher",
  // Leisure
  park: "Park",
  playground: "Playground",
  sports_centre: "Sports Center",
  swimming_pool: "Swimming Pool",
  fitness_centre: "Fitness Center",
  golf_course: "Golf Course",
  garden: "Garden",
  // Tourism
  hotel: "Hotel",
  motel: "Motel",
  museum: "Museum",
};

/**
 * Search for points of interest near a location using Overpass API.
 */
export async function searchPOI(
  latitude: number,
  longitude: number,
  radiusMeters: number = 3000, // ~1.8 miles
  maxResults: number = 50,
): Promise<POISearchResult> {
  try {
    // Build Overpass query for common POI types
    const query = `
[out:json][timeout:15];
(
  node["amenity"~"restaurant|fast_food|cafe|hospital|clinic|pharmacy|bank|school|library|police|fire_station|fuel|place_of_worship"](around:${radiusMeters},${latitude},${longitude});
  node["shop"~"supermarket|convenience|mall|department_store"](around:${radiusMeters},${latitude},${longitude});
  node["leisure"~"park|playground|fitness_centre|sports_centre"](around:${radiusMeters},${latitude},${longitude});
  node["tourism"~"hotel|museum"](around:${radiusMeters},${latitude},${longitude});
  way["leisure"="park"](around:${radiusMeters},${latitude},${longitude});
);
out center ${maxResults * 2};
`;

    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      console.warn(`[OSM] Overpass API returned ${response.status}`);
      return { pois: [], totalCount: 0, categories: [] };
    }

    const data = await response.json();
    const elements = data.elements || [];

    const categorySet = new Set<string>();
    const pois: POIResult[] = elements
      .filter((el: any) => el.tags?.name)
      .map((el: any) => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        const tags = el.tags || {};

        // Determine category from tags
        const amenity = tags.amenity;
        const shop = tags.shop;
        const leisure = tags.leisure;
        const tourism = tags.tourism;
        const tagKey = amenity || shop || leisure || tourism || "";
        const category = CATEGORY_MAP[tagKey] || tagKey || "Other";

        categorySet.add(category);

        return {
          name: tags.name,
          category,
          subcategory: tags.cuisine || tags.denomination || tags.sport || undefined,
          latitude: lat,
          longitude: lon,
          distanceMiles: lat && lon ? Math.round(haversineDistance(latitude, longitude, lat, lon) * 100) / 100 : undefined,
          address: [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean).join(" ") || undefined,
          phone: tags.phone || tags["contact:phone"] || undefined,
        };
      })
      .sort((a: POIResult, b: POIResult) => (a.distanceMiles || 0) - (b.distanceMiles || 0))
      .slice(0, maxResults);

    return {
      pois,
      totalCount: pois.length,
      categories: Array.from(categorySet).sort(),
    };
  } catch (err) {
    console.error("[OSM] POI search failed:", err);
    return { pois: [], totalCount: 0, categories: [] };
  }
}
