import { guessTimezoneFromAddress, isValidTimezone } from "./timezone-from-address";

/** The same timezone must be displayed, accepted and submitted by setup. */
export function resolveBookingTimezone(picked: string, address: string, browserZone?: string | null): string {
  const selected = picked.trim();
  if (selected && isValidTimezone(selected)) return selected;
  return guessTimezoneFromAddress(address) ?? browserZone ?? "UTC";
}

/** Contact edits never change scheduling settings. */
export function businessContactUpdate(data: {
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessWebsite: string;
}) {
  return {
    business_address: data.businessAddress || null,
    business_phone: data.businessPhone || null,
    business_email: data.businessEmail || null,
    business_website: data.businessWebsite || null,
  };
}