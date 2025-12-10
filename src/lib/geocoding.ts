/**
 * Geocoding utilities using OpenStreetMap Nominatim API
 * Free tier, no API key required
 */

export type GeocodingResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

/**
 * Convert an address string to coordinates
 * Uses OpenStreetMap Nominatim (free, no API key required)
 *
 * Usage policy: Max 1 request per second
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodingResult | null> {
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
      console.error("Geocoding failed:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.length === 0) {
      console.warn("No geocoding results for address:", address);
      return null;
    }

    const result = data[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Reverse geocode: convert coordinates to address
 */
export async function reverseGeocode(
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
    console.error("Reverse geocoding error:", error);
    return null;
  }
}
