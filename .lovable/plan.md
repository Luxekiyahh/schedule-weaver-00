# Unify Signup into Onboarding → Pricing → Dashboard

## Goal
Collapse the funnel into a single path:
`/onboarding` (create account + build site) → `/pricing` (pick a plan + pay) → `/dashboard/home` (after successful payment). Remove the now-redundant `/signup` and `/setup` pages.

## Flow after change
```
Visitor → /onboarding
  Step 1: Create account (business name, URL, email, password)  ← NEW
  Steps 2–8: industry, identity, photos, services, hours, policies, intake, preview
  Finish → redirect to /pricing
/pricing → "Get started" (logged in) → Paddle checkout (setup fee + plan)
         → payment success → /dashboard/home
```

## Changes

### 1. `/onboarding` becomes the account-creation entry point
File: `src/routes/onboarding.tsx`
- Add a new **Step 1 "Account"** before the current Industry step (shifting the wizard from 8 to 9 steps; update `STEP_LABELS`, progress bar, and `next()/back()` bounds).
- The Account step collects **business name, URL slug, email, password**, reusing the exact controls and live slug-availability check currently in `signup.tsx` (`checkSlugAvailable`, `slugify`, debounce, status icons).
- On "Continue" from the Account step: call `supabase.auth.signUp(...)` then `finalizeTenantSignup({ businessName, slug })` (same calls signup.tsx makes today). Store the returned context so the rest of the wizard has a `workspaceId` for image uploads and `completeOnboarding`.
- Replace the current `getOnboardingContext()`-on-mount logic: instead of redirecting unauthenticated visitors to `/login`, only load context if a session already exists; otherwise begin at the Account step. (Already-logged-in users skip straight to Industry.)
- Pre-fill the wizard `businessName` from the Account step.

### 2. Onboarding completion → `/pricing`
File: `src/routes/onboarding.tsx` (`StepPreview`)
- Change both "Go to my dashboard" / "Go to dashboard anyway" destinations from `/dashboard/home` to `/pricing` (the next step is now choosing a plan). Copy updated to "Choose your plan".

### 3. `/pricing` drives checkout
File: `src/routes/pricing.tsx`
- Convert the static "Get started" `<Link to="/signup">` buttons into plan-aware actions:
  - **Logged in:** open Paddle checkout for that tier using the same logic as billing (`usePaddleCheckout`, `useSubscription`, setup fee via `SETUP_FEE_PRICE_ID` when unpaid, `customData: { workspaceId }`), with `successUrl = ${origin}/dashboard/home?checkout=success`.
  - **Logged out:** navigate to `/onboarding`.
- Add a small `?checkout=success` handler on `/dashboard/home` (toast + brief subscription refresh poll), mirroring what `/dashboard/billing` already does, so the post-payment landing on the dashboard reflects the active plan.

### 4. Delete redundant routes
- Remove `src/routes/signup.tsx` and `src/routes/setup.tsx` (the route tree regenerates automatically).
- Update every reference to point at the new flow:
  - `src/routes/index.tsx` (4× `to="/signup"`) → `/onboarding`.
  - `src/routes/$slug.tsx` (links + absolute `procschedule.com/signup` URLs) → `/onboarding`.
  - `src/routes/admin.services.tsx` `to="/setup"` → `/onboarding` (or `/dashboard/services`).
  - `src/routes/dashboard.home.tsx` `ActionCard to="/setup"` → `/onboarding`.

## Technical notes
- **Session requirement:** uploads and `completeOnboarding` use `requireSupabaseAuth`, so the account must exist with an active session before the photo/save steps. This requires email auto-confirm to remain enabled (already on); if confirmation were required there'd be no session mid-wizard. I'll keep the signup's existing "no session → go to /login" fallback as a safety net.
- No database or server-function signature changes are needed — `finalizeTenantSignup`, `checkSlugAvailable`, `completeOnboarding`, and the Paddle checkout/webhook all stay as-is.
- `head()` meta on `/onboarding` updated to signup-oriented copy.

## Out of scope
- No changes to billing webhook, plan definitions, or the `/dashboard/billing` page (it remains for existing users to manage/switch plans).
