/**
 * Shared phone normalization — safe in both browser and server bundles.
 *
 * Customer numbers are stored in E.164 (e.g. +15619057383) so Twilio SMS
 * delivery never fails on formatting like "(561) 905-7383" or "561-905-7383".
 * Numbers entered without a country code are assumed US/CA (+1) when they
 * are 10 digits, or 11 digits with a leading 1.
 */

// E.164: "+" then 8–15 digits, first digit non-zero.
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

/**
 * Normalize a user-entered phone number to E.164.
 * Returns null when the input cannot form a valid E.164 number.
 */
export function normalizePhoneToE164(raw: string): string | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;

  let candidate: string;
  if (trimmed.startsWith("+")) {
    candidate = "+" + trimmed.slice(1).replace(/\D/g, "");
  } else {
    let digits = trimmed.replace(/\D/g, "");
    // "00" is the international dial prefix in many countries.
    if (digits.startsWith("00")) digits = digits.slice(2);
    // Assume US/CA when no country code is provided.
    if (digits.length === 10) digits = "1" + digits;
    candidate = "+" + digits;
  }

  return E164_REGEX.test(candidate) ? candidate : null;
}

/** True when the input normalizes to a valid E.164 number. */
export function isValidPhoneNumber(raw: string): boolean {
  return normalizePhoneToE164(raw) !== null;
}
