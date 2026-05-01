/**
 * Resolve a US state abbreviation from a ZIP code (or its first 3 digits).
 *
 * Used by routes that need to send a state filter to providers but only have
 * a ZIP from the user. Coverage is all 50 states + DC + PR.
 */

export function resolveStateFromZip(zip: string): string | null {
  if (!zip) return null;
  const trimmed = zip.trim();
  if (trimmed.length < 3) return null;
  const prefix = parseInt(trimmed.slice(0, 3), 10);
  if (isNaN(prefix)) return null;
  return resolveStateFromZipPrefix(prefix);
}

export function resolveStateFromZipPrefix(prefix: number): string | null {
  if (prefix >= 995 && prefix <= 999) return "AK";
  if (prefix >= 967 && prefix <= 968) return "HI";
  if (prefix >= 970 && prefix <= 979) return "OR";
  if (prefix >= 980 && prefix <= 994) return "WA";
  if (prefix >= 900 && prefix <= 966) return "CA";
  if (prefix >= 889 && prefix <= 898) return "NV";
  if (prefix >= 840 && prefix <= 847) return "UT";
  if (prefix >= 832 && prefix <= 838) return "ID";
  if (prefix >= 820 && prefix <= 831) return "WY";
  if (prefix >= 800 && prefix <= 816) return "CO";
  if (prefix >= 870 && prefix <= 884) return "NM";
  if (prefix >= 850 && prefix <= 865) return "AZ";
  if (prefix >= 590 && prefix <= 599) return "MT";
  if (prefix >= 570 && prefix <= 577) return "SD";
  if (prefix >= 580 && prefix <= 588) return "ND";
  if (prefix >= 680 && prefix <= 693) return "NE";
  if (prefix >= 660 && prefix <= 679) return "KS";
  if (prefix >= 730 && prefix <= 749) return "OK";
  if (prefix >= 750 && prefix <= 799) return "TX";
  if (prefix >= 700 && prefix <= 714) return "LA";
  if (prefix === 715) return "LA";
  if (prefix >= 716 && prefix <= 729) return "LA";
  if (prefix >= 386 && prefix <= 397) return "MS";
  if (prefix >= 350 && prefix <= 369) return "AL";
  if (prefix >= 370 && prefix <= 385) return "TN";
  if (prefix >= 400 && prefix <= 427) return "KY";
  if (prefix >= 430 && prefix <= 459) return "OH";
  if (prefix >= 460 && prefix <= 479) return "IN";
  if (prefix >= 480 && prefix <= 499) return "MI";
  if (prefix >= 500 && prefix <= 528) return "IA";
  if (prefix >= 530 && prefix <= 549) return "WI";
  if (prefix >= 550 && prefix <= 567) return "MN";
  if (prefix >= 600 && prefix <= 629) return "IL";
  if (prefix >= 630 && prefix <= 658) return "MO";
  if (prefix >= 300 && prefix <= 319) return "GA";
  if (prefix >= 320 && prefix <= 349) return "FL";
  if (prefix >= 247 && prefix <= 268) return "WV";
  if (prefix >= 220 && prefix <= 246) return "VA";
  if (prefix >= 270 && prefix <= 289) return "NC";
  if (prefix >= 290 && prefix <= 299) return "SC";
  if (prefix >= 200 && prefix <= 205) return "DC";
  if (prefix >= 206 && prefix <= 219) return "MD";
  if (prefix >= 197 && prefix <= 199) return "DE";
  if (prefix >= 150 && prefix <= 196) return "PA";
  if (prefix >= 70 && prefix <= 89) return "NJ";
  if (prefix >= 100 && prefix <= 149) return "NY";
  if (prefix >= 60 && prefix <= 69) return "CT";
  if (prefix >= 28 && prefix <= 29) return "RI";
  if (prefix >= 10 && prefix <= 27) return "MA";
  if (prefix >= 30 && prefix <= 38) return "NH";
  if (prefix >= 39 && prefix <= 49) return "ME";
  if (prefix >= 50 && prefix <= 59) return "VT";
  if (prefix >= 6 && prefix <= 9) return "PR";
  return null;
}
