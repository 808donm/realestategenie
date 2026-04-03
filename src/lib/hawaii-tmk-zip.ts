/**
 * Hawaii TMK Section to ZIP Code Mapping
 *
 * Maps TMK zone-section identifiers to the primary ZIP code(s) for that area.
 * Format: "zone-section" -> zip code(s)
 *
 * TMK format: Island(1) - Zone(1) - Section(1) - Plat(3) - Parcel(3) - Unit(4)
 * For Oahu (Island 1): Zone 1-9, Section 1-9
 *
 * Source: Cross-referenced from Hawaii GIS TMK boundaries and USPS ZIP assignments.
 */

/** Oahu (Island 1) TMK Zone-Section to ZIP code mapping */
const OAHU_TMK_ZIPS: Record<string, string[]> = {
  // Zone 1 -- Ewa / Kapolei / Waipahu area
  "1-1": ["96707"], // Kapolei
  "1-2": ["96707"], // Kapolei
  "1-3": ["96706"], // Ewa Beach
  "1-4": ["96706"], // Ewa Beach
  "1-5": ["96797"], // Waipahu
  "1-6": ["96797"], // Waipahu
  "1-7": ["96782"], // Pearl City
  "1-8": ["96782"], // Pearl City
  "1-9": ["96701"], // Aiea

  // Zone 2 -- Honolulu / Manoa / Kaimuki
  "2-1": ["96813", "96814"], // Downtown / Ala Moana
  "2-2": ["96814", "96826"], // Ala Moana / McCully / Moiliili
  "2-3": ["96815"], // Waikiki
  "2-4": ["96816"], // Kaimuki / Palolo
  "2-5": ["96817"], // Kalihi / Liliha
  "2-6": ["96817", "96819"], // Kalihi / Salt Lake
  "2-7": ["96826", "96822"], // Moiliili / Lower Manoa
  "2-8": ["96822", "96826", "96814"], // Lower Manoa / Makiki / Moiliili
  "2-9": ["96822"], // Upper Manoa / Woodlawn

  // Zone 3 -- Kailua / Kaneohe / Windward
  "3-1": ["96734"], // Kailua
  "3-2": ["96734"], // Kailua
  "3-3": ["96734"], // Enchanted Lake / Kailua
  "3-4": ["96744"], // Kaneohe
  "3-5": ["96744"], // Kaneohe
  "3-6": ["96744"], // Kaneohe
  "3-7": ["96744"], // Kaneohe / Ahuimanu
  "3-8": ["96744"], // Kaneohe
  "3-9": ["96795"], // Waimanalo

  // Zone 4 -- Hawaii Kai / East Honolulu
  "4-1": ["96821", "96825"], // Hawaii Kai
  "4-2": ["96821"], // Hawaii Kai
  "4-3": ["96825"], // Hawaii Kai
  "4-4": ["96816"], // Kahala / Waialae
  "4-5": ["96816"], // Kaimuki
  "4-6": ["96816"], // Wilhelmina Rise
  "4-7": ["96818"], // Hickam / Pearl Harbor
  "4-8": ["96818"], // Hickam
  "4-9": ["96818", "96819"], // Pearl Harbor / Salt Lake

  // Zone 5 -- North Shore / Windward
  "5-1": ["96717"], // Hauula
  "5-2": ["96762"], // Laie
  "5-3": ["96731"], // Kahuku
  "5-4": ["96712"], // Haleiwa
  "5-5": ["96712"], // Haleiwa / Waialua
  "5-6": ["96791"], // Waialua
  "5-7": ["96786"], // Wahiawa
  "5-8": ["96786"], // Wahiawa
  "5-9": ["96789"], // Mililani

  // Zone 6 -- Leeward / Waianae
  "6-1": ["96792"], // Waianae / Makaha
  "6-2": ["96792"], // Nanakuli / Maili
  "6-3": ["96792"], // Waianae
  "6-4": ["96707"], // Ko Olina / Kapolei West
  "6-5": ["96706"], // Ewa
  "6-6": ["96706"], // Ewa
  "6-7": ["96797"], // Waipahu
  "6-8": ["96782"], // Pearl City
  "6-9": ["96789"], // Mililani
};

/**
 * Get ZIP code(s) for a TMK zone-section identifier.
 * @param zone TMK zone digit (1-9)
 * @param section TMK section digit (1-9)
 * @returns Array of ZIP codes for that TMK section, or null if not mapped
 */
export function getZipsForTMKSection(zone: string, section: string): string[] | null {
  const key = `${zone}-${section}`;
  return OAHU_TMK_ZIPS[key] || null;
}

/**
 * Parse a TMK input string and extract zone/section.
 * Handles formats: "1-2-9", "129", "1-2-9-001-001"
 */
export function parseTMKInput(input: string): { island?: string; zone?: string; section?: string; plat?: string } {
  const parts = input.replace(/[.:() ]/g, "-").split("-").filter(Boolean);
  if (parts.length === 1 && /^\d{3,}$/.test(parts[0])) {
    // Digits only: "129" -> island=1, zone=2, section=9
    const digits = parts[0];
    return {
      island: digits[0],
      zone: digits[1],
      section: digits[2],
      plat: digits.length > 3 ? digits.slice(3, 6) : undefined,
    };
  }
  return {
    island: parts[0],
    zone: parts[1],
    section: parts[2],
    plat: parts[3],
  };
}
