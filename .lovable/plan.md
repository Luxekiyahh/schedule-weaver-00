## Goal

You've confirmed wildcard DNS works (`*.procschedule.com` → `185.158.133.1`), but Lovable only issues **per-hostname SSL certificates**. So each tenant subdomain must be explicitly connected as a custom domain in Lovable before its HTTPS storefront works. This plan builds the supporting workflow so that registering each subdomain is clear, tracked, and degrades gracefully until the cert exists.

## What only you can do (manual, per tenant)

For every tenant subdomain (e.g. `acme.procschedule.com`):
1. Open **Project Settings → Project → Domains** (or **Publish dialog → Add custom domain**).
2. Click **Connect Domain**, enter the full subdomain `acme.procschedule.com`.
3. DNS is already covered by the wildcard, so verification + SSL provisioning proceeds automatically (status: Verifying → Setting up → Active).

No code can automate this — Lovable exposes no domain-add API to the app. The code below exists to make this manual step trackable and to keep storefronts usable in the meantime.

## Code changes (support workflow)

### 1. Track per-tenant domain status
- Add an optional `domain_status` field concept on the workspace (values: `pending`, `active`) so the platform knows whether a tenant's subdomain cert has been connected yet. Default `pending` on signup.
- Note: this is a manual flag you flip (or an admin toggles) once you've connected the domain in Lovable settings — Lovable doesn't push cert status back to the app.

### 2. Admin "Domains to register" checklist
- Add an admin-only view that lists every workspace with its `<slug>.procschedule.com` URL and current `domain_status`, with a copy button and a "Mark as connected" action.
- This becomes your operational queue: new signup → appears in list as `pending` → you connect it in Lovable settings → mark active.

### 3. Graceful URL fallback until cert is live
- Update `getTenantUrl()` so that when a workspace's `domain_status` is `pending`, shareable/"View live site" links use the path form `https://procschedule.com/<slug>` (which already has valid HTTPS via the apex cert) instead of the not-yet-certified subdomain.
- Once marked `active`, links switch to `https://<slug>.procschedule.com`.
- The existing apex `/<slug>` → subdomain redirect in `src/routes/$slug.tsx` only fires when the domain is `active`, so pending tenants don't get redirected to a broken-cert URL.

### 4. Onboarding messaging
- In `src/routes/onboarding.tsx`, set expectation that the custom subdomain activates shortly after signup (while it's pending, the path-based link works immediately).

## Technical notes

- Files touched: `src/lib/subdomain.ts` (status-aware `getTenantUrl`), `src/routes/$slug.tsx` (gate redirect on `active`), `src/routes/dashboard.home.tsx` & `dashboard.customize.tsx` (use status-aware URL), `src/routes/onboarding.tsx` (copy), plus a new admin route for the registration checklist.
- DB: one migration adding `domain_status` (text, default `'pending'`) to `public.workspaces`, with appropriate GRANTs preserved. Server reads continue via `supabaseAdmin` per existing storefront pattern.
- No change to scheduling/calendar logic or the theme-mapping engine.

## Out of scope / alternative

If per-tenant manual registration becomes too much operational overhead later, the only way to get true wildcard HTTPS is a Cloudflare proxy in front of Lovable with a `*.procschedule.com` edge cert (proxy mode). Not part of this plan since you chose manual registration.
