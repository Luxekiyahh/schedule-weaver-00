import { describe, expect, it } from "vitest";
import { luxeLocationNote } from "./luxe-booking-locations";
import { resolveAppointmentLocation } from "./booking-location";

describe("Luxe Allure booking locations", () => {
  it("keeps Lakeland, FL 33813 on confirmations even when the workspace address is Kissimmee", () => {
    const notes = luxeLocationNote("lakeland", "");
    expect(resolveAppointmentLocation(notes, "Kissimmee, FL 34758").location).toBe("Lakeland, FL 33813");
  });

  it("keeps Kissimmee, FL 34758 for studio bookings even without a workspace address", () => {
    expect(resolveAppointmentLocation(luxeLocationNote("studio", ""), null).location).toBe("Kissimmee, FL 34758");
  });

  it("keeps a travel client's supplied address", () => {
    expect(resolveAppointmentLocation(luxeLocationNote("travel", "123 Test St, Orlando, FL 32801"), "Kissimmee, FL 34758").location).toBe("123 Test St, Orlando, FL 32801");
  });

  it("preserves other appointment notes while removing the location line", () => {
    expect(resolveAppointmentLocation(`${luxeLocationNote("lakeland", "")}\nSensitive skin`, null).notes).toBe("Sensitive skin");
  });

  it("uses the saved studio address for legacy bookings", () => {
    expect(resolveAppointmentLocation("Location: at the studio", "Kissimmee, FL 34758").location).toBe("Kissimmee, FL 34758");
  });
});