import { describe, it, expect } from "vitest";
import { getTenantUrl, getTenantSlugFromHost } from "./subdomain";

/**
 * End-to-end redirect guarantees:
 *  - New signups always land on `<slug>.procschedule.com`.
 *  - Completed payments / dashboard links never revert to the apex domain.
 *
 * These assertions lock in the production behaviour so a future change can't
 * silently reintroduce the apex path form (`procschedule.com/<slug>`).
 */
describe("getTenantUrl — production never reverts to apex path form", () => {
  const slug = "dolliimarie";
  const expected = `https://${slug}.procschedule.com`;

  it("apex host (post-payment dashboard) -> subdomain", () => {
    expect(getTenantUrl(slug, "procschedule.com")).toBe(expected);
  });

  it("www host -> subdomain", () => {
    expect(getTenantUrl(slug, "www.procschedule.com")).toBe(expected);
  });

  it("an already-subdomain host stays on the subdomain", () => {
    expect(getTenantUrl(slug, "dolliimarie.procschedule.com")).toBe(expected);
  });

  it("SSR / no host info (assume prod) -> subdomain", () => {
    expect(getTenantUrl(slug, "")).toBe(expected);
  });

  it("ignores domain_status entirely — pending still gets the subdomain", () => {
    expect(getTenantUrl(slug, "procschedule.com", "pending")).toBe(expected);
    expect(getTenantUrl(slug, "procschedule.com", "active")).toBe(expected);
  });

  it("never produces the apex path form on production hosts", () => {
    for (const host of ["procschedule.com", "www.procschedule.com", ""]) {
      const url = getTenantUrl(slug, host, "pending");
      expect(url).not.toBe(`https://procschedule.com/${slug}`);
      expect(url.startsWith(`https://${slug}.procschedule.com`)).toBe(true);
    }
  });

  it("preview/sandbox hosts use path form (no wildcard cert there)", () => {
    const url = getTenantUrl(slug, "id-preview--abc.lovable.app");
    expect(url).toBe(`https://id-preview--abc.lovable.app/${slug}`);
  });
});

describe("getTenantSlugFromHost — subdomain detection", () => {
  it("resolves a tenant subdomain", () => {
    expect(getTenantSlugFromHost("dolliimarie.procschedule.com")).toBe("dolliimarie");
  });

  it("returns null for apex and reserved subdomains", () => {
    expect(getTenantSlugFromHost("procschedule.com")).toBeNull();
    expect(getTenantSlugFromHost("www.procschedule.com")).toBeNull();
    expect(getTenantSlugFromHost("app.procschedule.com")).toBeNull();
  });

  it("returns null for preview hosts", () => {
    expect(getTenantSlugFromHost("id-preview--abc.lovable.app")).toBeNull();
  });
});
