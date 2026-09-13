# Match each tenant's booking timezone to their business address

## The problem (verified)

Every booking time is now stored and displayed in the workspace's `timezone` field. But that field is almost never set correctly:

- Onboarding never sets a timezone. It saves the business address but leaves `timezone` at `UTC` (only the hardcoded "dolliimarie" special case sets New York, and even that workspace is currently `UTC`).
- Of the 15 workspaces today, only `alluringdolls` has a real timezone (`America/New_York`) - and it's the only one with a business address on file. The other 14 are all `UTC`.

Result: any tenant who hasn't manually visited Availability -> Booking timezone is running on UTC, so their slots, confirmation screens, emails and texts are up to 4-8 hours off from their real local time.

## What to build

**1. Derive the timezone from the address automatically**

When a tenant enters or updates their business address, resolve a timezone from it and store it:

- US/Canada addresses: map from the ZIP/postal code and state abbreviation in the address string to an IANA zone (covers all US states plus Alaska/Hawaii and the Arizona no-DST case).
- If the address can't be parsed, fall back to the timezone the tenant's own browser reports (`Intl.DateTimeFormat().resolvedOptions().timeZone`) - already far better than UTC.
- Never silently overwrite a timezone a tenant explicitly chose on the Availability page.

**2. Show and confirm it during onboarding**

In the onboarding location step, once an address is entered, display the detected timezone inline ("Booking times will use Eastern Time - New York") with a dropdown to correct it. The chosen value is saved with the rest of the onboarding data.

**3. Show and confirm it in business settings**

Wherever the business address is edited after onboarding, show the same detected-timezone line with an override dropdown, so changing address to a new region prompts a timezone update instead of leaving a stale value.

**4. Backfill existing tenants**

- Set every workspace with a parsable address to its derived timezone.
- For the 13 workspaces with no address and still on UTC, surface a dismissible banner on the dashboard: "Confirm your booking timezone" linking to Availability. Do not guess for them - a wrong guess would shift live appointments.
- Leave existing appointment rows untouched. Changing a tenant's timezone from UTC to their real zone would shift already-booked times, so any tenant with future appointments gets a warning on the Availability page telling them to re-check upcoming bookings after switching.

**5. Admin visibility**

Add a "Timezone" column to the admin tenant list and flag tenants still on UTC, so mismatches are visible without querying the database.

## Technical notes

- New `src/lib/timezone-from-address.ts`: pure function `guessTimezoneFromAddress(address: string): string | null`, using a ZIP-prefix and state-abbreviation table for US/CA. No network calls, Worker-safe.
- `src/lib/onboarding.functions.ts` (`saveOnboarding`) accepts an optional `timezone` from the wizard and writes it alongside `business_address`; when absent it derives it server-side from the address.
- `src/lib/tenant.functions.ts` (`saveBusinessInfo`) does the same on address change, and `saveWorkspaceTimezone` sets an explicit-override marker so automatic derivation stops for that workspace.
- Onboarding wizard: add `timezone` to the location step state in `src/components/onboarding/wizard-config.ts` and the corresponding step UI in `src/routes/onboarding.tsx`, reusing the timezone `<select>` already built in `src/routes/dashboard.availability.tsx`.
- Backfill runs as a data update (not a schema migration); the only schema change is a small boolean/timestamp column on `workspaces` to record an explicit tenant override.
