/**
 * Hawaii School Complex Area Mapping
 *
 * Hawaii DOE organizes schools into Complex Areas, each anchored by a
 * high school with feeder elementary and middle schools. This mapping
 * lets us determine which schools serve a property based on its zip code.
 *
 * Source: Hawaii DOE Geographic Exception (GE) boundaries
 * https://www.hawaiipublicschools.org/ParentsStudents/EnrollingInSchool/SchoolFinder
 *
 * Note: Some zip codes span multiple complex areas. In those cases,
 * all relevant complexes are listed and the closest school by distance
 * should be preferred.
 */

export interface SchoolComplex {
  highSchool: string;
  middleSchools: string[];
  elementarySchools: string[];
}

export interface ComplexArea {
  name: string;
  complex: SchoolComplex;
  zips: string[];
}

// Hawaii DOE Complex Areas with zip code mappings
export const HAWAII_COMPLEX_AREAS: ComplexArea[] = [
  // ── Honolulu District ──
  {
    name: "Kailua",
    complex: {
      highSchool: "Kailua High School",
      middleSchools: ["Kailua Intermediate School"],
      elementarySchools: [
        "Kailua Elementary School",
        "Keolu Elementary School",
        "Maunawili Elementary School",
        "Enchanted Lake Elementary School",
      ],
    },
    zips: ["96734"],
  },
  {
    name: "Kalaheo",
    complex: {
      highSchool: "Kalaheo High School",
      middleSchools: ["Kailua Intermediate School"],
      elementarySchools: [
        "Aikahi Elementary School",
        "Mokapu Elementary School",
        "Kainalu Elementary School",
      ],
    },
    zips: ["96734"],
  },
  {
    name: "Castle",
    complex: {
      highSchool: "James B. Castle High School",
      middleSchools: ["Kaneohe Elementary School"],
      elementarySchools: [
        "Kaneohe Elementary School",
        "Parker Elementary School",
        "Heeia Elementary School",
        "Ahuimanu Elementary School",
        "Kapunahala Elementary School",
      ],
    },
    zips: ["96744"],
  },
  {
    name: "Kahuku",
    complex: {
      highSchool: "Kahuku High & Intermediate School",
      middleSchools: [],
      elementarySchools: [
        "Laie Elementary School",
        "Hauula Elementary School",
        "Kahuku Elementary School",
        "Sunset Beach Elementary School",
      ],
    },
    zips: ["96762", "96717", "96730", "96731"],
  },
  {
    name: "Waimanalo",
    complex: {
      highSchool: "Kailua High School",
      middleSchools: ["Waimanalo Elementary & Intermediate School"],
      elementarySchools: [
        "Waimanalo Elementary & Intermediate School",
        "Blanche Pope Elementary School",
      ],
    },
    zips: ["96795"],
  },
  {
    name: "Kaiser",
    complex: {
      highSchool: "Henry J. Kaiser High School",
      middleSchools: ["Niu Valley Middle School"],
      elementarySchools: [
        "Koko Head Elementary School",
        "Kamiloiki Elementary School",
        "Hahaione Elementary School",
        "Aina Haina Elementary School",
      ],
    },
    zips: ["96825", "96821"],
  },
  {
    name: "Kalani",
    complex: {
      highSchool: "Kalani High School",
      middleSchools: ["Niu Valley Middle School"],
      elementarySchools: [
        "Niu Valley Middle School",
        "Wilson Elementary School",
        "Kahala Elementary School",
      ],
    },
    zips: ["96816", "96821"],
  },
  {
    name: "Roosevelt",
    complex: {
      highSchool: "Theodore Roosevelt High School",
      middleSchools: ["Washington Middle School"],
      elementarySchools: [
        "Manoa Elementary School",
        "Noelani Elementary School",
        "Punahou Circle Apartments",
      ],
    },
    zips: ["96822", "96826"],
  },
  {
    name: "McKinley",
    complex: {
      highSchool: "McKinley High School",
      middleSchools: ["Washington Middle School", "Central Middle School"],
      elementarySchools: [
        "Royal Elementary School",
        "Kaiulani Elementary School",
        "Liholiho Elementary School",
      ],
    },
    zips: ["96813", "96814", "96817"],
  },
  {
    name: "Farrington",
    complex: {
      highSchool: "Farrington High School",
      middleSchools: ["Dole Middle School", "Kalakaua Middle School"],
      elementarySchools: [
        "Fern Elementary School",
        "Kalihi Elementary School",
        "Kalihi Waena Elementary School",
        "Kalihi Uka Elementary School",
        "Kapalama Elementary School",
        "Puuhale Elementary School",
      ],
    },
    zips: ["96819", "96817"],
  },
  {
    name: "Moanalua",
    complex: {
      highSchool: "Moanalua High School",
      middleSchools: ["Moanalua Middle School"],
      elementarySchools: [
        "Moanalua Elementary School",
        "Salt Lake Elementary School",
        "Aliamanu Elementary School",
        "Red Hill Elementary School",
        "Shafter Elementary School",
      ],
    },
    zips: ["96818", "96819"],
  },
  {
    name: "Radford",
    complex: {
      highSchool: "Radford High School",
      middleSchools: ["Aliamanu Middle School"],
      elementarySchools: [
        "Nimitz Elementary School",
        "Makalapa Elementary School",
        "Scott Elementary School",
        "Pearl Harbor Elementary School",
      ],
    },
    zips: ["96818"],
  },
  {
    name: "Aiea",
    complex: {
      highSchool: "Aiea High School",
      middleSchools: ["Aiea Intermediate School"],
      elementarySchools: [
        "Aiea Elementary School",
        "Pearl Ridge Elementary School",
        "Waimalu Elementary School",
        "Alvah A. Scott Elementary School",
      ],
    },
    zips: ["96701"],
  },
  {
    name: "Pearl City",
    complex: {
      highSchool: "Pearl City High School",
      middleSchools: ["Highlands Intermediate School"],
      elementarySchools: [
        "Pearl City Elementary School",
        "Pearl City Highlands Elementary School",
        "Manana Elementary School",
        "Waiau Elementary School",
        "Momilani Elementary School",
        "Lehua Elementary School",
      ],
    },
    zips: ["96782"],
  },
  {
    name: "Mililani",
    complex: {
      highSchool: "Mililani High School",
      middleSchools: ["Mililani Middle School"],
      elementarySchools: [
        "Mililani Mauka Elementary School",
        "Mililani Uka Elementary School",
        "Mililani Waena Elementary School",
        "Kipapa Elementary School",
      ],
    },
    zips: ["96789"],
  },
  {
    name: "Leilehua",
    complex: {
      highSchool: "Leilehua High School",
      middleSchools: ["Wahiawa Middle School"],
      elementarySchools: [
        "Wahiawa Elementary School",
        "Helemano Elementary School",
        "Iliahi Elementary School",
        "Wheeler Elementary School",
        "Solomon Elementary School",
      ],
    },
    zips: ["96786"],
  },
  {
    name: "Waialua",
    complex: {
      highSchool: "Waialua High & Intermediate School",
      middleSchools: [],
      elementarySchools: [
        "Waialua Elementary School",
        "Haleiwa Elementary School",
      ],
    },
    zips: ["96791"],
  },
  {
    name: "Waipahu",
    complex: {
      highSchool: "Waipahu High School",
      middleSchools: ["Waipahu Intermediate School"],
      elementarySchools: [
        "Waipahu Elementary School",
        "August Ahrens Elementary School",
        "Honowai Elementary School",
        "Kaleiopuu Elementary School",
      ],
    },
    zips: ["96797"],
  },
  {
    name: "Campbell",
    complex: {
      highSchool: "James Campbell High School",
      middleSchools: ["Ilima Intermediate School", "Holomua Elementary School"],
      elementarySchools: [
        "Ewa Elementary School",
        "Ewa Beach Elementary School",
        "Iroquois Point Elementary School",
        "Holomua Elementary School",
        "Kaimiloa Elementary School",
      ],
    },
    zips: ["96706"],
  },
  {
    name: "Kapolei",
    complex: {
      highSchool: "Kapolei High School",
      middleSchools: ["Kapolei Middle School"],
      elementarySchools: [
        "Kapolei Elementary School",
        "Makakilo Elementary School",
        "Hookele Elementary School",
        "Barbers Point Elementary School",
        "Mauka Lani Elementary School",
      ],
    },
    zips: ["96707"],
  },
  {
    name: "Nanakuli",
    complex: {
      highSchool: "Nanakuli High & Intermediate School",
      middleSchools: [],
      elementarySchools: [
        "Nanakuli Elementary School",
        "Nanaikapono Elementary School",
      ],
    },
    zips: ["96792"],
  },
  {
    name: "Waianae",
    complex: {
      highSchool: "Waianae High School",
      middleSchools: ["Waianae Intermediate School"],
      elementarySchools: [
        "Waianae Elementary School",
        "Makaha Elementary School",
        "Leihoku Elementary School",
        "Maili Elementary School",
      ],
    },
    zips: ["96792"],
  },

  // ── Maui District ──
  {
    name: "Maui High",
    complex: {
      highSchool: "Maui High School",
      middleSchools: ["Maui Waena Intermediate School"],
      elementarySchools: [
        "Lihikai Elementary School",
        "Kahului Elementary School",
        "Pomaikai Elementary School",
      ],
    },
    zips: ["96732", "96733"],
  },
  {
    name: "Baldwin",
    complex: {
      highSchool: "Baldwin High School",
      middleSchools: ["Iao Intermediate School"],
      elementarySchools: [
        "Iao Elementary School",
        "Wailuku Elementary School",
        "Paia Elementary School",
        "Haiku Elementary School",
        "Makawao Elementary School",
      ],
    },
    zips: ["96793", "96768", "96779", "96708"],
  },
  {
    name: "Lahainaluna",
    complex: {
      highSchool: "Lahainaluna High School",
      middleSchools: ["Lahaina Intermediate School"],
      elementarySchools: [
        "Lahaina Elementary School",
        "Princess Nahienaena Elementary School",
        "Kamehameha III Elementary School",
      ],
    },
    zips: ["96761"],
  },
  {
    name: "Molokai",
    complex: {
      highSchool: "Molokai High School",
      middleSchools: ["Molokai Middle School"],
      elementarySchools: [
        "Kaunakakai Elementary School",
        "Kilohana Elementary School",
        "Maunaloa Elementary School",
      ],
    },
    zips: ["96748", "96729", "96742", "96757"],
  },
  {
    name: "Lanai",
    complex: {
      highSchool: "Lanai High & Elementary School",
      middleSchools: [],
      elementarySchools: ["Lanai High & Elementary School"],
    },
    zips: ["96763"],
  },

  // ── Hawaii (Big Island) District ──
  {
    name: "Hilo",
    complex: {
      highSchool: "Hilo High School",
      middleSchools: ["Hilo Intermediate School"],
      elementarySchools: [
        "Hilo Union Elementary School",
        "Kapiolani Elementary School",
        "Waiakea Elementary School",
        "Keaukaha Elementary School",
        "Haaheo Elementary School",
      ],
    },
    zips: ["96720", "96721"],
  },
  {
    name: "Waiakea",
    complex: {
      highSchool: "Waiakea High School",
      middleSchools: ["Waiakea Intermediate School"],
      elementarySchools: [
        "Waiakea Elementary School",
        "Waiakeawaena Elementary School",
        "De Silva Elementary School",
      ],
    },
    zips: ["96720"],
  },
  {
    name: "Kealakehe",
    complex: {
      highSchool: "Kealakehe High School",
      middleSchools: ["Kealakehe Intermediate School"],
      elementarySchools: [
        "Kealakehe Elementary School",
        "Kahakai Elementary School",
        "Innovations Public Charter School",
      ],
    },
    zips: ["96740"],
  },
  {
    name: "Konawaena",
    complex: {
      highSchool: "Konawaena High School",
      middleSchools: ["Konawaena Middle School"],
      elementarySchools: [
        "Konawaena Elementary School",
        "Honaunau Elementary School",
        "Hookena Elementary School",
      ],
    },
    zips: ["96750", "96726"],
  },

  // ── Kauai District ──
  {
    name: "Kauai",
    complex: {
      highSchool: "Kauai High School",
      middleSchools: ["Chiefess Kamakahelei Middle School"],
      elementarySchools: [
        "Koloa Elementary School",
        "Kalaheo Elementary School",
        "Wilcox Elementary School",
        "Kaumualii Elementary School",
        "Eleele Elementary School",
      ],
    },
    zips: ["96766", "96756", "96741", "96765", "96705"],
  },
  {
    name: "Kapaa",
    complex: {
      highSchool: "Kapaa High School",
      middleSchools: ["Kapaa Middle School"],
      elementarySchools: [
        "Kapaa Elementary School",
        "Anahola Elementary School",
        "Kilauea Elementary School",
        "Hanalei Elementary School",
      ],
    },
    zips: ["96746", "96703", "96714", "96722", "96754"],
  },
  {
    name: "Waimea",
    complex: {
      highSchool: "Waimea High School",
      middleSchools: ["Waimea Canyon Middle School"],
      elementarySchools: [
        "Waimea Canyon Elementary School",
        "Kekaha Elementary School",
      ],
    },
    zips: ["96752", "96796"],
  },
];

/**
 * Find the school complex area(s) for a given zip code.
 * Returns all matching complexes (some zips span multiple).
 */
export function getSchoolComplexByZip(zip: string): ComplexArea[] {
  return HAWAII_COMPLEX_AREAS.filter((ca) => ca.zips.includes(zip));
}

/**
 * Get the designated high school for a zip code.
 * If multiple complexes serve the zip, returns all high schools.
 */
export function getHighSchoolByZip(zip: string): string[] {
  const complexes = getSchoolComplexByZip(zip);
  return [...new Set(complexes.map((c) => c.complex.highSchool))];
}

/**
 * Get all feeder schools (elementary + middle + high) for a zip code.
 */
export function getFeederSchoolsByZip(zip: string): SchoolComplex | null {
  const complexes = getSchoolComplexByZip(zip);
  if (complexes.length === 0) return null;

  // Merge all complexes for this zip
  const highSchools = [...new Set(complexes.map((c) => c.complex.highSchool))];
  const middleSchools = [...new Set(complexes.flatMap((c) => c.complex.middleSchools))];
  const elementarySchools = [...new Set(complexes.flatMap((c) => c.complex.elementarySchools))];

  return {
    highSchool: highSchools.join(" / "),
    middleSchools,
    elementarySchools,
  };
}
