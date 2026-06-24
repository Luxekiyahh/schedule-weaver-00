# Fix tenant subdomain HTTPS via Cloudflare wildcard SSL

## Root cause (confirmed by live test)
- `*.procschedule.com` DNS already resolves to Lovable (`185.158.133.1`) — even random subdomains answer.
- There is **no wildcard SSL certificate**. The TLS handshake to `alluringdolls.procschedule.com` fails (`ssl/tls alert handshake failure`). Lovable issued certs only for `procschedule.com` and `www`.
- Result: browsers show "can't establish a secure connection" on every tenant subdomain.

Lovable-managed custom domains do not auto-issue wildcard certs. The fix is to terminate `*.procschedule.com` SSL at Cloudflare in front of Lovable, then turn the subdomain URL form back on in the app.

## Part 1 — Cloudflare infrastructure (done by you in Cloudflare, not in code)

1. **Add `procschedule.com` to Cloudflare** as a zone and switch the registrar's nameservers to the Cloudflare-assigned ones (skip if already on Cloudflare).
2. **DNS records** (Proxied / orange cloud ON for all):
   - `A  @  185.158.133.1` (Proxied)
   - `A  www  185.158.133.1` (Proxied)
   - `A  *  185.158.133.1` (Proxied)  ← the wildcard that covers every tenant
3. **SSL/TLS mode:** set to **Full** (not Flexible) so Cloudflare↔Lovable stays HTTPS.
4. **Edge certificate:** Cloudflare Universal SSL covers `*.procschedule.com` automatically once the wildcard record is proxied. Confirm the edge cert lists `*.procschedule.com` as a SAN (Advanced Certificate or Total TLS may be needed for the wildcard SAN — enable **Total TLS** if the wildcard host isn't covered by Universal SSL).
5. **Reconnect the domain in Lovable in proxy mode:** Project Settings → Domains → Connect Domain → Advanced → check "Domain uses Cloudflare or a similar proxy" (switches Lovable to CNAME-based verification compatible with the proxy). Do this for `procschedule.com` and `www`.

### Verification before touching code
Run from any machine:
```text
curl -I https://alluringdolls.procschedule.com
```
Must return a valid TLS handshake and a 200/redirect (not a handshake failure). Also test a second tenant slug. Only proceed to Part 2 once HTTPS succeeds for an arbitrary subdomain.

## Part 2 — Flip the app to subdomain URLs (one-line code change)

File: `src/lib/subdomain.ts`
- Change `export const WILDCARD_SUBDOMAINS_LIVE = false;` → `true`.

This single flag is already wired through `getTenantUrl()`. Flipping it makes every shareable link, post-signup redirect, and post-payment redirect emit `https://<slug>.procschedule.com` on production/SSR, while preview/sandbox/localhost keep the path form so they still resolve.

## Part 3 — Canonical redirect + audit
- Verify `src/routes/$slug.tsx` canonical-redirect effect uses `getTenantUrl()` (so a tenant hit via the path form on prod redirects to its subdomain once the flag is live). Confirm it does not hard-fail when the flag was false.
- Update `src/lib/subdomain.test.ts` so the production-host assertions expect the subdomain form again (the suite was previously flipped to expect the path form). Keep the preview/localhost cases on the path form.
- Grep for any hardcoded `procschedule.com/${slug}` or `https://${slug}.procschedule.com` strings outside `subdomain.ts` and route them through `getTenantUrl()`.

## Part 4 — Validate
- `bunx vitest run src/lib/subdomain.test.ts` passes.
- Manually load a tenant subdomain in the browser: valid padlock, storefront renders, owner admin overlay still works.
- Confirm a fresh signup's generated booking link and the post-payment redirect both land on `https://<slug>.procschedule.com` with valid HTTPS.

## Notes / trade-offs
- Until Part 1's verification passes, do **not** flip the flag — doing so re-breaks every client link. Order matters: Cloudflare first, code second.
- Cloudflare proxy mode means cookie/compliance scanners may report the Cloudflare edge region rather than origin (cosmetic; noted for awareness).
- No database or business-logic changes are required.
