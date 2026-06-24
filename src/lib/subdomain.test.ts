import { describe, it, expect } from "vitest";
import { getTenantUrl, getTenantSlugFromHost, WILDCARD_SUBDOMAINS_LIVE } from "./subdomain";

/**
 * Interim redirect guarantees (wildcard *.procschedule.com NOT yet live):
 *  - Tenant links resolve via the working apex path form
 *    (`procschedule.com/<slug>`), since arbitrary subdomains 404 until the
 *    wildcard DNS + SSL is configured.
 *  - Once `WILDCARD_SUBDOMAINS_LIVE` is flipped to true, production hosts emit
 *    the subdomain form instead. The assertions adapt to the flag so they stay
 *    valid through the cutover.
 */
describe("getTenantUrl — production canonical URL", () => {
  const slug = "dolliimarie";
  const expected = WILDCARD_SUBDOMAINS_LIVE
    ? `https://${slug}.procschedule.com`
    : `https://procschedule.com/${slug}`;

  it("apex host (post-payment dashboard)", () => {
    expect(getTenantUrl(slug, "procschedule.com")).toBe(expected);
  });

  it("www host", () => {
    expect(getTenantUrl(slug, "www.procschedule.com")).toBe(expected);
  });

  it("SSR / no host info (assume prod)", () => {
    expect(getTenantUrl(slug, "")).toBe(expected);
  });

  it("ignores domain_status entirely", () => {
    expect(getTenantUrl(slug, "procschedule.com", "pending")).toBe(expected);
    expect(getTenantUrl(slug, "procschedule.com", "active")).toBe(expected);
  });

  it("production hosts use the canonical form consistently", () => {
    for (const host of ["procschedule.com", "www.procschedule.com", ""]) {
      expect(getTenantUrl(slug, host, "pending")).toBe(expected);
    }
  });

  it("preview/sandbox hosts always use path form (no wildcard cert there)", () => {
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
