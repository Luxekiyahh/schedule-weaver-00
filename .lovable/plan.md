# Make `company-name.procschedule.com` the Canonical Client URL

## Current state
Subdomain routing is already half-built. `src/lib/subdomain.ts` parses a tenant slug from the hostname, and `src/routes/index.tsx` already detects a tenant subdomain and renders that workspace's storefront at the apex path (`company.procschedule.com/` → storefront). So the subdomain *display* works the moment DNS resolves.

What's still path-based:
- The dashboard shows/copies `procschedule.com/<slug>` as "your public booking link" (`dashboard.home.tsx`).
- "View Live Site" links to `/<slug>` (path form).
- `dashboard.customize.tsx` shows `/booking/<slug>` as the address.
- No redirect sends `procschedule.com/<slug>` → `<slug>.procschedule.com`.
- DNS has no wildcard for `*.procschedule.com`.

## Prerequisite: DNS wildcard (user action, outside code)
For `anything.procschedule.com` to load, a wildcard subdomain must point at Lovable. In **Project Settings → Domains**, the wildcard host `*.procschedule.com` needs an A record to `185.158.133.1` (same target as the apex). Wildcard subdomain support may require enabling via Lovable support if the Domains UI doesn't accept `*`. The apex `procschedule.com` / `www` stay as they are. I'll call this out; the code changes below assume the wildcard resolves.

## Code changes

### 1. Central URL helper — `src/lib/subdomain.ts`
Add a helper so every surface builds tenant URLs the same way:

```ts
export const TENANT_ROOT_DOMAIN = "procschedule.com";

// Subdomain storefront URL. On real procschedule hosts -> https://slug.procschedule.com
// On preview/sandbox/localhost (no wildcard) -> fall back to path form so links still work.
export function getTenantUrl(slug: string, host?: string): string { ... }
```

Logic: if running on a `procschedule.com` host (or no host info, assume production), return `https://${slug}.procschedule.com`; otherwise (lovableproject.com / lovable.app / localhost previews where wildcard subdomains don't exist) return `${origin}/${slug}` so the preview keeps working.

### 2. Dashboard public link — `src/routes/dashboard.home.tsx`
- Replace `bookingUrl = \`${origin}/${slug}\`` with `getTenantUrl(slug)`.
- "View Live Site" `href` uses the same `getTenantUrl(slug)` value instead of `/<slug>`.
- Copy-to-clipboard then copies the subdomain URL.

### 3. Customize preview text — `src/routes/dashboard.customize.tsx`
- Update the displayed address (lines ~113, ~197) from `/booking/<slug>` / `/<slug>` to the subdomain form `<slug>.procschedule.com` via the helper, so owners see the real client URL.

### 4. Redirect path form → subdomain — `src/routes/$slug.tsx`
- In the `/$slug` storefront component, add a client-side effect: if the current host is the apex `procschedule.com` (not a subdomain, not a preview host), `window.location.replace(getTenantUrl(slug))`. This makes old `procschedule.com/<slug>` links resolve to the canonical subdomain. Previews and subdomain hosts skip the redirect (no loop).

### 5. Onboarding "your site is live" messaging (if present)
- Any place onboarding surfaces the finished storefront URL gets switched to the subdomain form via the helper.

## What is NOT changing
- The booking flow route stays `/booking/$slug` — on a subdomain it simply renders at `<slug>.procschedule.com/booking/<slug>`; internal `<Link>`s already pass `params`, so they keep working. No scheduling logic touched.
- `src/lib/subdomain.ts` parsing rules, reserved subdomains, and preview-host guards stay intact.
- Apex marketing site (`procschedule.com/`, `/pricing`, etc.) is unaffected.

## Verification
- Preview (lovable host): links fall back to path form and still load the storefront.
- After DNS wildcard resolves: `company.procschedule.com` shows the storefront; dashboard copy link yields `https://company.procschedule.com`; visiting `procschedule.com/company` redirects to the subdomain.

## Notes
- One ambiguity: whether the shared link should be the storefront root (`company.procschedule.com`) or the booking step page. Plan uses the storefront root (current behavior), which already has a "book" CTA.
