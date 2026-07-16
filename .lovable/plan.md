# Password Reset Flow

Right now `/login` has no "Forgot password" link and there's no route that handles the recovery redirect, so you can't reset your password from the UI. I'll add both.

## What I'll build

1. **"Forgot password?" link on `/login`** — small link under the password field that routes to `/forgot-password`.

2. **New `/forgot-password` page** — email input that calls:
   ```ts
   supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${window.location.origin}/reset-password`
   })
   ```
   Shows a "check your email" confirmation after submit. Styled to match the existing login page (cream background, dark button, Georgia headline).

3. **New `/reset-password` page** (public route) — detects the `type=recovery` token in the URL hash that Supabase appends, then shows a "new password" + "confirm password" form that calls `supabase.auth.updateUser({ password })`. On success, redirects to `/dashboard/home`. Handles the case where the link is expired/invalid with a clear message and a link back to `/forgot-password`.

4. **Send you the reset email** — once the pages are live, I'll trigger `resetPasswordForEmail` for `takiyah472@gmail.com` so the email lands in your inbox. You click the link, set a new password, and you're in with platform-admin access.

## Notes

- Both new routes are public (not under `_authenticated/`) so the recovery link works when you're signed out.
- Uses the existing Lovable-managed auth email templates — no email setup needed.
- No changes to auth config, DB, or the platform-admin grant already in place.

## Files

- `src/routes/login.tsx` — add "Forgot password?" link
- `src/routes/forgot-password.tsx` — new
- `src/routes/reset-password.tsx` — new
