/**
 * Tenant subdomain parsing for procschedule.com (and preview hosts).
 *
 * Returns the tenant slug if the current hostname has a tenant subdomain
 * (e.g. "dolliimarie.procschedule.com" -> "dolliimarie"), otherwise null.
 *
 * Reserved/non-tenant subdomains: www, app, api, admin, id-preview*, project*,
 * and any *.lovable.app preview host whose first label isn't a real tenant.
 */
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "static",
  "assets",
  "cdn",
  "mail",
]);

export function getTenantSlugFromHost(host?: string | null): string | null {
  const hostname = host ?? (typeof window !== "undefined" ? window.location.hostname : "");
  if (!hostname) return null;

  // Skip localhost / IPs
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;

  const parts = hostname.toLowerCase().split(".");
  // Need at least sub.domain.tld
  if (parts.length < 3) return null;

  const sub = parts[0];

  // Lovable preview / project hosts: id-preview--xxxx.lovable.app, project--xxxx.lovable.app
  if (sub.startsWith("id-preview") || sub.startsWith("project--")) return null;

  if (RESERVED_SUBDOMAINS.has(sub)) return null;

  // Slug sanity: only lowercase letters, digits, hyphens
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(sub)) return null;

  return sub;
}
