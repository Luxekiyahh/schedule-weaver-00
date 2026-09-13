/**
 * Best-effort IANA timezone detection from a free-text business address.
 *
 * Pure, offline and Worker-safe: no network calls, no geocoding service.
 * Covers US states + territories and Canadian provinces, which is where
 * every tenant currently operates. Returns null when nothing matches, so
 * callers can fall back to the browser-reported zone or leave the value
 * alone instead of guessing wrong.
 */

const STATE_TZ: Record<string, string> = {
  // Eastern
  CT: "America/New_York",
  DE: "America/New_York",
  DC: "America/New_York",
  GA: "America/New_York",
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  NH: "America/New_York",
  NJ: "America/New_York",
  NY: "America/New_York",
  NC: "America/New_York",
  OH: "America/New_York",
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  VT: "America/New_York",
  VA: "America/New_York",
  WV: "America/New_York",
  MI: "America/Detroit",
  IN: "America/Indiana/Indianapolis",
  KY: "America/New_York",
  FL: "America/New_York",
  // Central
  AL: "America/Chicago",
  AR: "America/Chicago",
  IL: "America/Chicago",
  IA: "America/Chicago",
  KS: "America/Chicago",
  LA: "America/Chicago",
  MN: "America/Chicago",
  MS: "America/Chicago",
  MO: "America/Chicago",
  NE: "America/Chicago",
  ND: "America/Chicago",
  OK: "America/Chicago",
  SD: "America/Chicago",
  TN: "America/Chicago",
  TX: "America/Chicago",
  WI: "America/Chicago",
  // Mountain
  CO: "America/Denver",
  ID: "America/Boise",
  MT: "America/Denver",
  NM: "America/Denver",
  UT: "America/Denver",
  WY: "America/Denver",
  AZ: "America/Phoenix", // no DST
  // Pacific / other
  CA: "America/Los_Angeles",
  NV: "America/Los_Angeles",
  OR: "America/Los_Angeles",
  WA: "America/Los_Angeles",
  AK: "America/Anchorage",
  HI: "Pacific/Honolulu",
  PR: "America/Puerto_Rico",
  VI: "America/St_Thomas",
  GU: "Pacific/Guam",
  // Canada
  BC: "America/Vancouver",
  AB: "America/Edmonton",
  SK: "America/Regina",
  MB: "America/Winnipeg",
  ON: "America/Toronto",
  QC: "America/Toronto",
  NB: "America/Halifax",
  NS: "America/Halifax",
  PE: "America/Halifax",
  NL: "America/St_Johns",
  YT: "America/Whitehorse",
  NT: "America/Yellowknife",
  NU: "America/Iqaluit",
};

/** ZIP prefix (first 3 digits) ranges -> state, used when no state abbrev is present. */
const ZIP_RANGES: Array<[number, number, string]> = [
  [5, 5, "NY"], [6, 9, "PR"], [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"],
  [39, 49, "ME"], [50, 59, "VT"], [60, 69, "CT"], [70, 89, "NJ"], [100, 149, "NY"],
  [150, 196, "PA"], [197, 199, "DE"], [200, 205, "DC"], [206, 219, "MD"],
  [220, 246, "VA"], [247, 268, "WV"], [270, 289, "NC"], [290, 299, "SC"],
  [300, 319, "GA"], [320, 349, "FL"], [350, 369, "AL"], [370, 385, "TN"],
  [386, 397, "MS"], [398, 399, "GA"], [400, 427, "KY"], [430, 459, "OH"],
  [460, 479, "IN"], [480, 499, "MI"], [500, 528, "IA"], [530, 549, "WI"],
  [550, 567, "MN"], [570, 577, "SD"], [580, 588, "ND"], [590, 599, "MT"],
  [600, 629, "IL"], [630, 658, "MO"], [660, 679, "KS"], [680, 693, "NE"],
  [700, 714, "LA"], [716, 729, "AR"], [730, 749, "OK"], [750, 799, "TX"],
  [800, 816, "CO"], [820, 831, "WY"], [832, 838, "ID"], [840, 847, "UT"],
  [850, 865, "AZ"], [870, 884, "NM"], [889, 898, "NV"], [900, 961, "CA"],
  [967, 968, "HI"], [970, 979, "OR"], [980, 994, "WA"], [995, 999, "AK"],
];

const CITY_TZ: Record<string, string> = {
  "new york": "America/New_York",
  atlanta: "America/New_York",
  miami: "America/New_York",
  orlando: "America/New_York",
  tampa: "America/New_York",
  chicago: "America/Chicago",
  houston: "America/Chicago",
  dallas: "America/Chicago",
  austin: "America/Chicago",
  denver: "America/Denver",
  phoenix: "America/Phoenix",
  "los angeles": "America/Los_Angeles",
  "san diego": "America/Los_Angeles",
  seattle: "America/Los_Angeles",
  portland: "America/Los_Angeles",
  toronto: "America/Toronto",
  london: "Europe/London",
};

function zipToState(zip: string): string | null {
  const prefix = Number(zip.slice(0, 3));
  if (!Number.isFinite(prefix)) return null;
  for (const [lo, hi, st] of ZIP_RANGES) {
    if (prefix >= lo && prefix <= hi) return st;
  }
  return null;
}

/**
 * Guess an IANA timezone from a business address string.
 * Priority: US/CA ZIP or postal code, then state abbreviation, then city name.
 */
export function guessTimezoneFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const text = address.trim();
  if (!text) return null;
  const upper = text.toUpperCase();

  // US ZIP (5 digits, optionally +4)
  const zip = /\b(\d{5})(?:-\d{4})?\b/.exec(upper);
  if (zip?.[1]) {
    const st = zipToState(zip[1]);
    if (st && STATE_TZ[st]) return STATE_TZ[st];
  }

  // Canadian postal code (A1A 1A1) - first letter maps to a province group
  const ca = /\b([A-Z])\d[A-Z]\s?\d[A-Z]\d\b/.exec(upper);
  if (ca?.[1]) {
    const CA_LETTER: Record<string, string> = {
      A: "NL", B: "NS", C: "PE", E: "NB", G: "QC", H: "QC", J: "QC",
      K: "ON", L: "ON", M: "ON", N: "ON", P: "ON", R: "MB", S: "SK",
      T: "AB", V: "BC", X: "NT", Y: "YT",
    };
    const prov = CA_LETTER[ca[1]];
    if (prov && STATE_TZ[prov]) return STATE_TZ[prov];
  }

  // State / province abbreviation as its own word
  for (const code of Object.keys(STATE_TZ)) {
    if (new RegExp(`(^|[^A-Z])${code}([^A-Z]|$)`).test(upper)) return STATE_TZ[code]!;
  }

  // City fallback
  const lower = text.toLowerCase();
  for (const [city, tz] of Object.entries(CITY_TZ)) {
    if (lower.includes(city)) return tz;
  }

  return null;
}

/** True when the string is a timezone this runtime understands. */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Human label like "Eastern Time - New York". */
export function timezoneLabel(tz: string): string {
  try {
    const name =
      new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "long" })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? tz;
    const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
    return `${name} - ${city}`;
  } catch {
    return tz;
  }
}

/** The browser's own timezone, or null on the server / when unavailable. */
export function browserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
