import { describe, expect, it } from "vitest";
import { businessContactUpdate, resolveBookingTimezone } from "./booking-settings";

describe("onboarding timezone", () => {
  it("accepts the displayed browser timezone for mobile businesses without an address", () => {
    expect(resolveBookingTimezone("", "", "America/New_York")).toBe("America/New_York");
  });
  it("accepts the browser timezone for an unrecognized address", () => {
    expect(resolveBookingTimezone("", "Unlisted village", "America/Chicago")).toBe("America/Chicago");
  });
  it("keeps a selected timezone even when the address suggests another", () => {
    expect(resolveBookingTimezone("America/Chicago", "Kissimmee, FL 34758", "America/New_York")).toBe("America/Chicago");
  });
  it("prefers the address timezone when no choice was made", () => {
    expect(resolveBookingTimezone("", "Kissimmee, FL 34758", "America/Los_Angeles")).toBe("America/New_York");
  });
});

describe("business info edits", () => {
  it("updates contact details without overwriting the existing booking timezone", () => {
    const saved = {
      timezone: "America/Chicago",
      ...businessContactUpdate({
        businessAddress: "Kissimmee, FL 34758",
        businessPhone: "+19542035851",
        businessEmail: "admin@procschedule.com",
        businessWebsite: "",
      }),
    };
    expect(saved.timezone).toBe("America/Chicago");
    expect(saved.business_phone).toBe("+19542035851");
    expect(saved.business_address).toBe("Kissimmee, FL 34758");
  });
});