# Stop silent account inheritance on `/login` and `/onboarding`

## Root cause

Any visitor to this browser inherits whatever Supabase session is sitting in `localStorage`. Two routes make that dangerous:

- `src/routes/login.tsx` — never inspects the current session. The bug the user describes (Onboarding → "Sign in" → lands inside AlluringDolls) is actually the *next* click on any protected link picking up the stale session.
- `src/routes/onboarding.tsx` (lines 152–173) — on mount, if `getSession()` returns anything, it calls `getOnboardingContext()` and `navigate({ to: "/dashboard" })`. A guest opening `/onboarding` on a browser where AlluringDolls once signed in is dropped straight into their dashboard with no confirmation.

Custom domains + a shared preview browser make this trivially reproducible; there is no RLS bypass — the session cookie/localStorage is genuinely valid, which is why the dashboard opens.

## Fix

Treat `/login` and `/onboarding` as **identity-gate** routes: never act on a background session, always require an explicit user gesture.

### 1. `src/routes/login.tsx`

On mount, read `supabase.auth.getUser()` (revalidates with the auth server, unlike `getSession()`). Three outcomes:

- **No user** → render the sign-in form as today.
- **User present** → render an "Already signed in" card above the form:
  - `Signed in as <email>`
  - Primary button: `Continue to your dashboard` → runs the same role-aware redirect the form's success path already does (owner/admin/staff → `/dashboard/home`, client → `/`, no membership → `/onboarding`).
  - Secondary button: `Sign out & use a different account` → `supabase.auth.signOut()`, clear React Query cache, re-render the empty form.
- Never auto-navigate. The user must click one of the two buttons. This is what stops "I hit Sign in and I'm suddenly in someone else's account".

Also: when the user *does* submit the form, call `supabase.auth.signOut()` first if the entered email differs from the currently-signed-in user's email, so we never end up in a mixed state.

### 2. `src/routes/onboarding.tsx`

Replace the silent redirect in the `useEffect` at lines 152–173 with the same "Already signed in" gate:

- If `getUser()` returns a user AND `getOnboardingContext()` shows they already onboarded → render a full-page card: `You're signed in as <email>. Continue to your dashboard, or sign out to set up a new business.` Two buttons, same as above. No automatic `navigate`.
- If signed in but not yet onboarded → keep current behaviour (skip the account step, pre-fill business name). This is the same person mid-setup, not account inheritance.
- If not signed in → start at step 1 as today.

### 3. Sign-out hygiene helper

Add a small helper `src/lib/auth-signout.ts`:

```ts
export async function signOutAndReset(queryClient?: QueryClient) {
  await queryClient?.cancelQueries();
  queryClient?.clear();
  await supabase.auth.signOut();
}
```

Use it in both routes and in the existing dashboard sign-out path so cache teardown is consistent (per the auth-guards knowledge — prevents 401 storms from cached protected queries).

## What this does NOT change

- No RLS/policy changes. The session is genuinely valid for its owner; the problem is trusting it silently for a different human at the keyboard.
- No changes to `/dashboard` `beforeLoad` — it correctly redirects unauth'd users to `/login`.
- No changes to the password-reset flow shipped earlier.
- No change to the auto-injected preview session in the Lovable editor iframe (that's a dev-only convenience and only applies to the workspace owner).

## Files touched

- `src/routes/login.tsx` — add signed-in gate + sign-out button, guard form submit against email mismatch
- `src/routes/onboarding.tsx` — replace silent `navigate("/dashboard")` with the same gate UI
- `src/lib/auth-signout.ts` — new helper

## Verification

After building: open `/login` on a browser that already has a session → the form is replaced with the "Signed in as …" card, no auto-redirect. Click "Sign out" → form appears, session cleared. Repeat for `/onboarding`. Guest browser (no session) sees the normal form and wizard.
