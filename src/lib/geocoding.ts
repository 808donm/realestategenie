/**
 * Geocoding utilities using Google Maps Geocoding API with OpenStreetMap fallback
 *
 * Primary: Google Maps Geocoding API (requires GOOGLE_MAPS_API_KEY)
 * Fallback: OpenStreetMap Nominatim (free, no API key required)
 */

export type GeocodingResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

/**
 * Geocode using Google Maps Geocoding API
 * More reliable and accurate than OpenStreetMap
 * Requires GOOGLE_MAPS_API_KEY in environment variables
 */
async function geocodeWithGoogle(address: string): Promise<GeocodingResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.log("Google Maps API key not found, skipping Google geocoding");
    return null;
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error("Google geocoding failed:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      console.warn("Google geocoding: No results for address:", address, "Status:", data.status);
      return null;
    }

    const result = data.results[0];
    const location = result.geometry.location;

    return {
      latitude: location.lat,
      longitude: location.lng,
      displayName: result.formatted_address,
    };
  } catch (error) {
    console.error("Google geocoding error:", error);
    return null;
  }
}

/**
 * Geocode using OpenStreetMap Nominatim (fallback)
 * Free tier, no API key required
 * Usage policy: Max 1 request per second
 * https://operations.osmfoundation.org/policies/nominatim/
 */
async function geocodeWithOSM(address: string): Promise<GeocodingResult | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "RealEstateGenie/1.0",
      },
    });

    if (!response.ok) {
      console.error("OSM geocoding failed:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.length === 0) {
      console.warn("OSM geocoding: No results for address:", address);
      return null;
    }

    const result = data[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error("OSM geocoding error:", error);
    return null;
  }
}

/**
 * Convert an address string to coordinates
 * Tries Google Maps API first, falls back to OpenStreetMap
 *
 * @param address - Full address string (e.g., "123 Main St, Honolulu, HI 96813")
 * @returns GeocodingResult or null if geocoding fails
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodingResult | null> {
  if (!address || address.trim().length === 0) {
    console.error("Cannot geocode empty address");
    return null;
  }

  console.log("Geocoding address:", address);

  // Try Google Maps first (more reliable)
  const googleResult = await geocodeWithGoogle(address);
  if (googleResult) {
    console.log("✓ Geocoded with Google Maps:", googleResult);
    return googleResult;
  }

  // Fallback to OpenStreetMap
  console.log("Falling back to OpenStreetMap...");
  const osmResult = await geocodeWithOSM(address);
  if (osmResult) {
    console.log("✓ Geocoded with OpenStreetMap:", osmResult);
    return osmResult;
  }

  console.error("❌ All geocoding services failed for address:", address);
  return null;
}

/**
 * Reverse geocode using Google Maps API
 */
async function reverseGeocodeWithGoogle(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("latlng", `${latitude},${longitude}`);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return null;
    }

    return data.results[0].formatted_address;
  } catch (error) {
    console.error("Google reverse geocoding error:", error);
    return null;
  }
}

/**
 * Reverse geocode using OpenStreetMap
 */
async function reverseGeocodeWithOSM(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", latitude.toString());
    url.searchParams.set("lon", longitude.toString());
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "RealEstateGenie/1.0",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.display_name || null;
  } catch (error) {
    console.error("OSM reverse geocoding error:", error);
    return null;
  }
}

/**
 * Reverse geocode: convert coordinates to address
 * Tries Google Maps API first, falls back to OpenStreetMap
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  // Try Google first
  const googleResult = await reverseGeocodeWithGoogle(latitude, longitude);
  if (googleResult) {
    return googleResult;
  }

  // Fallback to OSM
  return await reverseGeocodeWithOSM(latitude, longitude);
}
