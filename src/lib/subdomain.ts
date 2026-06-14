/**
 * Tenant subdomain parsing for procschedule.com.
 *
 * Returns the tenant slug if the current hostname is a tenant subdomain of a
 * known tenant root domain (e.g. "dolliimarie.procschedule.com" ->
 * "dolliimarie"), otherwise null.
 *
 * IMPORTANT: Only real tenant root domains count. Lovable preview/sandbox
 * hosts (e.g. <uuid>.lovableproject.com, id-preview--xxx.lovable.app,
 * project--xxx.lovable.app) must NEVER be treated as tenant storefronts —
 * otherwise the public marketing pages (/, /pricing, ...) get replaced by a
 * "Storefront not found" view.
 */

// Root domains under which a first-label subdomain represents a tenant.
const TENANT_ROOT_DOMAINS = ["procschedule.com"];

// Canonical tenant root domain used when building shareable storefront URLs.
export const TENANT_ROOT_DOMAIN = "procschedule.com";

// Reserved first-labels and reserved top-level paths that can never be a tenant.
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "static",
  "assets",
  "cdn",
  "mail",
  "pricing",
  "login",
  "signup",
  "setup",
  "dashboard",
  "book",
  "booking",
  "onboarding",
  "home",
]);

export function getTenantSlugFromHost(host?: string | null): string | null {
  const hostname = host ?? (typeof window !== "undefined" ? window.location.hostname : "");
  if (!hostname) return null;

  const lower = hostname.toLowerCase();

  // Skip localhost / IPs
  if (lower === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(lower)) return null;

  // Only treat known tenant root domains as tenant hosts. Everything else
  // (lovableproject.com, lovable.app previews, etc.) renders the public site.
  const root = TENANT_ROOT_DOMAINS.find(
    (d) => lower === d || lower.endsWith(`.${d}`),
  );
  if (!root) return null;

  // Strip the root domain to get the subdomain portion.
  if (lower === root) return null; // apex (procschedule.com) -> public site
  const sub = lower.slice(0, lower.length - root.length - 1); // remove ".<root>"

  // Multi-level subdomains aren't valid tenant slugs.
  if (!sub || sub.includes(".")) return null;

  if (RESERVED_SUBDOMAINS.has(sub)) return null;

  // Slug sanity: only lowercase letters, digits, hyphens.
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(sub)) return null;

  return sub;
}
