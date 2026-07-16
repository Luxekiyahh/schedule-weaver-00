## 1. Lock the paywall bypass to takiyah472@gmail.com only

Right now `isPlatformAdmin` returns true for anyone in the `platform_admins` table, and `dashboard.tsx` uses that flag to skip the paywall. That's broader than intended — any future admin (or an admin row added by mistake) would also bypass billing.

**Change:** make the bypass a hard-coded email allowlist that is separate from platform-admin authority.

- `src/lib/platform-admin.functions.ts` — add a new server fn `isBillingBypassed` (guarded by `requireSupabaseAuth`) that returns `{ bypassed: context.claims?.email?.toLowerCase() === "takiyah472@gmail.com" }`. Leave `isPlatformAdmin` alone so the /admin console still works for anyone in `platform_admins`.
- `src/routes/dashboard.tsx` — replace the `isPlatformAdmin` call used for the paywall gate with `isBillingBypassed`. Rename local state `isAdmin`/`adminChecked` → `isBypassed`/`bypassChecked` so the flag can't accidentally be reused elsewhere. All other admin UI keeps using `isPlatformAdmin`.

Result: only the signed-in session whose Supabase JWT email is `takiyah472@gmail.com` skips the paywall. Rows in `platform_admins`, custom user metadata, spoofed `full_name`, etc. cannot trigger it.

## 2. Upload ProcSchedule brand assets to the CDN

Upload the files from `/mnt/user-uploads/` via `lovable-assets create` and commit `.asset.json` pointers under `src/assets/brand/`:

- `procschedule-logo-light.svg` → used on dark email header
- `procschedule-logo-dark.svg` → used on light in-app surfaces (already themed, but pointer is useful)
- `procschedule-icon-192.png` → square mark for email footer + favicons
- `procschedule-favicon-32.png`, `procschedule-favicon-16.png`, `procschedule-icon-180.png` → wire into `src/routes/__root.tsx` `<link rel="icon"/apple-touch-icon>` head tags

Emails cannot reference the `/__l5e/...` relative URL — they need absolute URLs. Add a small helper `src/lib/email-templates/brand.ts` exporting:
```ts
export const BRAND = {
  logoLightUrl: "https://procschedule.com" + logoLight.url, // absolute
  iconUrl: "https://procschedule.com" + icon192.url,
  ink: "#141414",
  gold: "#C9A961",   // pulled from the current theme accent
  paper: "#ffffff",
  muted: "#64748b",
  supportEmail: "admin@procschedule.com",
};
```

## 3. Rebrand existing transactional templates

Update the three templates in `src/lib/email-templates/` so they share a common branded header/footer:

- `welcome.tsx`, `booking-confirmation.tsx`, `booking-alert.tsx`
- Header band: ink `#141414` background, centered `<Img src={BRAND.logoLightUrl} width="180" alt="ProcSchedule" />`, gold underline rule
- Body: keep white background, switch primary button + link colors to `BRAND.ink` with gold hover-equivalent border
- Footer: small mark + "ProcSchedule · Booking, payments, and reminders for pros" + support email + unsubscribe placeholder that dispatcher already injects

Extract the shared header/footer to `src/lib/email-templates/_layout.tsx` to avoid drift between templates.

## 4. Scaffold + brand auth emails

Currently no auth templates exist. In build mode:

1. Call `email_domain--scaffold_auth_email_templates` (domain already verified — no setup dialog needed).
2. Rewrite the six generated templates (`signup`, `magiclink`, `recovery`, `invite`, `email_change`, `reauthentication`) under `supabase/functions/_shared/email-templates/` to use the same `_layout.tsx`-style header/footer, ink + gold palette, and ProcSchedule logo (absolute URL, since edge-function templates ship separately from the app bundle — duplicate the small `BRAND` constants there).
3. Keep template copy short and on-brand: subject lines start with "ProcSchedule —", CTA buttons use ink background, magic-link expiry note in muted gray.
4. Deploy with `supabase--deploy_edge_functions function_names: ["auth-email-hook"]`.

## 5. Favicons / head metadata

`src/routes/__root.tsx` — replace any placeholder favicon links with the uploaded 16/32/180/192 assets and ensure `og:image` on the marketing home route uses `procschedule-icon-1024.png` (absolute URL).

## 6. Verify

- `bunx tsgo --noEmit` clean.
- Preview `/lovable/email/transactional/preview?template=welcome` and confirm the logo renders + colors match.
- After deploy, trigger a test password reset from `/auth` and confirm the branded email lands.
- Sign in as `takiyah472@gmail.com` → dashboard loads without paywall. Sign in as any other user (even a platform admin added to the table) → paywall behaves normally.

## Technical notes

- `context.claims.email` comes from the Supabase JWT, which is signed by Supabase Auth — it can't be spoofed by client code. Comparing lowercase is enough; no need to also check `email_confirmed_at` because Supabase only issues a JWT after confirmation for password/OAuth flows already in use here.
- The gold accent `#C9A961` should be pulled from the actual `--brand-gold` token in `src/styles.css` when I open build mode, in case the palette was tweaked; the plan value is a placeholder.
- Auth email templates live in `supabase/functions/_shared/email-templates/` (edge function bundle) — they cannot import from `src/`, so brand constants + logo URL are duplicated there intentionally.
