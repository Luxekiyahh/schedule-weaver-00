## Goal

Test the complete user journey in the live preview: create a business account, finish onboarding (workspace, services, availability), view the public storefront, and book the first appointment as a customer — then confirm the data landed correctly in the backend.

## Flow being tested

```text
/onboarding
  Step 1  Account      -> email + password (auto-confirmed, real session)
  Step 2  Workspace    -> business name + URL slug
  Step 3  Services     -> at least one service (name, duration, price)
  Step 4  Availability -> weekly hours
        -> /dashboard/home

Public storefront
  /<slug>           -> storefront renders
  /booking/<slug>   -> pick service -> date -> time -> details -> confirm
        -> appointment created
```

## Steps

1. **Enable auto-confirm email (test setting).** Turn on auto-confirm so signup returns a live session immediately and onboarding can proceed without an inbox click. (Keep signup enabled; leave other auth settings as-is.) Note: this is a temporary testing convenience — flag it so it can be reverted afterward if desired.

2. **Run the onboarding wizard in the browser** at `/onboarding` with a throwaway business + unique email:
   - Step 1: fill first/last name, email, password (≥8 chars); continue and confirm a session + auto-provisioned workspace.
   - Step 2: set a business name and a unique URL slug; wait for the "available" check.
   - Step 3: keep/edit the default service (name, duration, price).
   - Step 4: confirm weekday hours; finish setup and land on `/dashboard/home`.

3. **Verify the dashboard** loads with the new workspace (home, services, availability reflect what was entered).

4. **View the public storefront** at `/<slug>` to confirm it renders the business and its service(s).

5. **Book the first appointment** at `/booking/<slug>` as a customer: select the service, pick an available date, choose a time slot, enter customer details, and submit to the confirmation state.

6. **Confirm in the backend** that the records were created: `workspaces`, `services`, `provider_availability`, `customers`, and `appointments` rows for the new slug.

7. **Report results**, including any step that breaks, with the exact error/console output and a proposed fix. (Fixes would be applied in a follow-up once approved.)

## Notes / decisions

- Account creation path: onboarding wizard (`/onboarding`), the most complete flow.
- Test data: a fresh throwaway account created during the test.
- I'll test the real outcomes (appointment actually created), not just that buttons click.
- No destructive actions on existing data; everything created is net-new test data.
