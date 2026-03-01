/**
 * Hawaii Zip Code → County Mapping & QPublic URL Builder
 *
 * Maps every Hawaii zip code to one of the 4 counties so we can build
 * the correct QPublic link (each county has its own AppID).
 *
 * Counties & their QPublic AppIDs:
 *   Honolulu (City & County of Honolulu / Oahu)  → AppID 1045
 *   Hawaii   (Big Island)                         → AppID 1048
 *   Maui     (Maui, Molokai, Lanai, Kahoolawe)   → AppID 1029
 *   Kauai    (Kauai, Niihau)                      → AppID 986
 */

export type HawaiiCounty = "HONOLULU" | "HAWAII" | "MAUI" | "KAUAI";

/**
 * Every Hawaii zip code mapped to its county.
 *
 * Sources:
 *   - USPS ZIP Code assignments for Hawaii
 *   - Hawaii State GIS parcel county boundaries
 */
const ZIP_TO_COUNTY: Record<string, HawaiiCounty> = {
  // ── Honolulu County (Oahu) ────────────────────────────────────────────
  "96701": "HONOLULU", // Aiea
  "96706": "HONOLULU", // Ewa Beach
  "96707": "HONOLULU", // Kapolei
  "96709": "HONOLULU", // Kapolei (PO Box)
  "96712": "HONOLULU", // Haleiwa
  "96717": "HONOLULU", // Hauula
  "96730": "HONOLULU", // Kaaawa
  "96731": "HONOLULU", // Kahuku
  "96734": "HONOLULU", // Kailua (Oahu)
  "96744": "HONOLULU", // Kaneohe
  "96759": "HONOLULU", // Kunia
  "96762": "HONOLULU", // Laie
  "96782": "HONOLULU", // Pearl City
  "96786": "HONOLULU", // Wahiawa
  "96789": "HONOLULU", // Mililani
  "96791": "HONOLULU", // Waialua
  "96792": "HONOLULU", // Waianae
  "96795": "HONOLULU", // Waimanalo
  "96797": "HONOLULU", // Waipahu
  // Honolulu metro / downtown / university / military
  "96801": "HONOLULU",
  "96802": "HONOLULU",
  "96803": "HONOLULU",
  "96804": "HONOLULU",
  "96805": "HONOLULU",
  "96806": "HONOLULU",
  "96807": "HONOLULU",
  "96808": "HONOLULU",
  "96809": "HONOLULU",
  "96810": "HONOLULU",
  "96811": "HONOLULU",
  "96812": "HONOLULU",
  "96813": "HONOLULU", // Downtown Honolulu
  "96814": "HONOLULU", // Ala Moana
  "96815": "HONOLULU", // Waikiki
  "96816": "HONOLULU", // Kaimuki
  "96817": "HONOLULU", // Kalihi
  "96818": "HONOLULU", // Hickam / Pearl Harbor
  "96819": "HONOLULU", // Salt Lake / Moanalua
  "96820": "HONOLULU", // Pearl Harbor
  "96821": "HONOLULU", // Hawaii Kai
  "96822": "HONOLULU", // Manoa / UH
  "96823": "HONOLULU",
  "96824": "HONOLULU",
  "96825": "HONOLULU", // Hawaii Kai
  "96826": "HONOLULU", // McCully / Moiliili
  "96828": "HONOLULU",
  "96830": "HONOLULU",
  "96836": "HONOLULU",
  "96837": "HONOLULU",
  "96838": "HONOLULU",
  "96839": "HONOLULU",
  "96840": "HONOLULU",
  "96841": "HONOLULU",
  "96843": "HONOLULU", // Tripler AMC
  "96844": "HONOLULU",
  "96846": "HONOLULU",
  "96847": "HONOLULU",
  "96848": "HONOLULU",
  "96849": "HONOLULU", // Schofield Barracks (PO)
  "96850": "HONOLULU",
  "96853": "HONOLULU", // MCBH Kaneohe Bay
  "96854": "HONOLULU", // Wheeler AAF
  "96857": "HONOLULU", // Schofield Barracks
  "96858": "HONOLULU", // Fort Shafter
  "96859": "HONOLULU", // Tripler AMC
  "96860": "HONOLULU", // Pearl Harbor
  "96861": "HONOLULU", // Camp H.M. Smith
  "96863": "HONOLULU", // MCBH Kaneohe Bay

  // ── Hawaii County (Big Island) ────────────────────────────────────────
  "96704": "HAWAII", // Captain Cook
  "96710": "HAWAII", // Hakalau
  "96718": "HAWAII", // Hawaii National Park
  "96719": "HAWAII", // Hawi
  "96720": "HAWAII", // Hilo
  "96721": "HAWAII", // Hilo
  "96725": "HAWAII", // Holualoa
  "96726": "HAWAII", // Honaunau
  "96727": "HAWAII", // Honokaa
  "96728": "HAWAII", // Honomu
  "96737": "HAWAII", // Ocean View
  "96738": "HAWAII", // Waikoloa
  "96739": "HAWAII", // Keaau
  "96740": "HAWAII", // Kailua-Kona
  "96743": "HAWAII", // Kamuela / Waimea
  "96745": "HAWAII", // Kailua-Kona
  "96749": "HAWAII", // Keaau
  "96750": "HAWAII", // Kealakekua
  "96755": "HAWAII", // Kapaau
  "96760": "HAWAII", // Kurtistown
  "96764": "HAWAII", // Laupahoehoe
  "96771": "HAWAII", // Mountain View
  "96772": "HAWAII", // Naalehu
  "96773": "HAWAII", // Ninole
  "96774": "HAWAII", // Ookala
  "96776": "HAWAII", // Paauilo
  "96777": "HAWAII", // Pahala
  "96778": "HAWAII", // Pahoa
  "96780": "HAWAII", // Papaaloa
  "96781": "HAWAII", // Papaikou
  "96783": "HAWAII", // Pepeekeo
  "96785": "HAWAII", // Volcano

  // ── Maui County (Maui, Molokai, Lanai) ────────────────────────────────
  "96708": "MAUI", // Haiku
  "96713": "MAUI", // Hana
  "96729": "MAUI", // Hoolehua (Molokai)
  "96732": "MAUI", // Kahului
  "96733": "MAUI", // Kahului
  "96742": "MAUI", // Kalaupapa (Molokai)
  "96748": "MAUI", // Kaunakakai (Molokai)
  "96753": "MAUI", // Kihei
  "96757": "MAUI", // Kualapuu (Molokai)
  "96761": "MAUI", // Lahaina
  "96763": "MAUI", // Lanai City
  "96767": "MAUI", // Lahaina (PO Box)
  "96768": "MAUI", // Makawao
  "96770": "MAUI", // Maunaloa (Molokai)
  "96779": "MAUI", // Paia
  "96784": "MAUI", // Pukalani
  "96788": "MAUI", // Pukalani (PO Box)
  "96790": "MAUI", // Kula
  "96793": "MAUI", // Wailuku

  // ── Kauai County (Kauai, Niihau) ──────────────────────────────────────
  "96703": "KAUAI", // Anahola
  "96705": "KAUAI", // Eleele
  "96714": "KAUAI", // Hanalei
  "96715": "KAUAI", // Hanalei (PO Box)
  "96716": "KAUAI", // Hanapepe
  "96722": "KAUAI", // Princeville
  "96741": "KAUAI", // Kalaheo
  "96746": "KAUAI", // Kapaa
  "96747": "KAUAI", // Kaumakani
  "96751": "KAUAI", // Kealia
  "96752": "KAUAI", // Kekaha
  "96754": "KAUAI", // Kilauea
  "96756": "KAUAI", // Koloa
  "96765": "KAUAI", // Lawai
  "96766": "KAUAI", // Lihue
  "96769": "KAUAI", // Makaweli
  "96796": "KAUAI", // Waimea
};

/**
 * Look up the Hawaii county for a given zip code.
 * Returns null if the zip code is not in Hawaii.
 */
export function getCountyByZip(zip: string | undefined | null): HawaiiCounty | null {
  if (!zip) return null;
  const clean = zip.trim().slice(0, 5); // handle zip+4
  return ZIP_TO_COUNTY[clean] ?? null;
}

// ── QPublic URL Builder ────────────────────────────────────────────────────

/**
 * County-specific QPublic AppIDs.
 * URL pattern: https://qpublic.schneidercorp.com/Application.aspx?AppID={ID}&PageTypeID=4&KeyValue={TMK}
 */
const QPUBLIC_APP_IDS: Record<HawaiiCounty, number> = {
  HONOLULU: 1045,
  HAWAII:   1048,
  MAUI:     1029,
  KAUAI:    986,
};

/**
 * Build a QPublic direct-report URL for a Hawaii parcel.
 *
 * Resolution order for county:
 *   1. Explicit county name (from Hawaii statewide parcel data)
 *   2. Zip code lookup (from ATTOM address data)
 *   3. TMK division digit (first digit of TMK: 1=Honolulu, 2=Maui, 3=Hawaii, 4=Kauai)
 *
 * @param tmkOrApn  - TMK (12-digit) or ATTOM APN (13-digit with island prefix)
 * @param county    - County name if already known (from Hawaii statewide parcel data)
 * @param zip       - Zip code to derive county when county name is not available
 * @returns QPublic URL string, or null if county cannot be determined
 */
export function buildQPublicUrl(
  tmkOrApn: string,
  county?: string | null,
  zip?: string | null,
): string | null {
  if (!tmkOrApn) return null;

  // Clean the key — strip dashes, spaces, dots
  let keyValue = tmkOrApn.replace(/[-\s.]/g, "");

  // If this looks like an ATTOM APN (13+ digits with island prefix), convert to 12-digit TMK
  if (keyValue.length > 12) {
    keyValue = keyValue.slice(1).padEnd(12, "0");
  }

  // Resolve county: explicit county name → zip lookup → TMK division digit
  let resolvedCounty: HawaiiCounty | null = null;

  if (county) {
    const upper = county.toUpperCase().trim() as HawaiiCounty;
    if (upper in QPUBLIC_APP_IDS) {
      resolvedCounty = upper;
    }
  }

  if (!resolvedCounty && zip) {
    resolvedCounty = getCountyByZip(zip);
  }

  // Fallback: derive county from TMK division digit
  // TMK format: D-Z-S-P-P-P-C where D = division (island)
  if (!resolvedCounty && keyValue.length >= 1) {
    const divisionMap: Record<string, HawaiiCounty> = {
      "1": "HONOLULU",
      "2": "MAUI",
      "3": "HAWAII",
      "4": "KAUAI",
    };
    resolvedCounty = divisionMap[keyValue[0]] ?? null;
  }

  if (!resolvedCounty) return null;

  const appId = QPUBLIC_APP_IDS[resolvedCounty];
  return `https://qpublic.schneidercorp.com/Application.aspx?AppID=${appId}&PageTypeID=4&KeyValue=${keyValue}`;
}
