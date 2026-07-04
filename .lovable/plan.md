## Goal
Run the full 4-step booking + Square deposit payment flow for Alluring Dolls in preview, as client `takiyah472@gmail.com`, and verify the appointment confirms and the confirmation email fires. Use the provided Square **sandbox** credentials so a real charge isn't required (the token only authenticates against Square sandbox; production returns 401).

## Key facts discovered
- Alluring Dolls (`workspace_id 5542a2d5-...`) uses **Square**, `connected`, deposit `$25.00` (2500 cents).
- Stored `workspace_payment_credentials` are **live** (token + location `K2SAFHS72K75Z`, `environment=live`). The deposit checkout reads this row and picks the Square host from `creds.environment`.
- Provided token is Square **sandbox**, location `LDZX8HJEN7AHM`.
- To exercise the real payment code path without real money, the credentials row must temporarily point at sandbox, then be restored to the original live values afterward.

## Steps
1. **Back up live credentials safely.** Dump the current Alluring Dolls `workspace_payment_credentials` row to a local `/tmp` restore SQL file via psql (value not printed to console), so the live Square token can be restored exactly.
2. **Swap to sandbox (migration/data change).** Update that row to `square_access_token=<provided sandbox token>`, `square_location_id=LDZX8HJEN7AHM`, `environment=sandbox`. Leave `workspace_payment_settings` (provider/deposit) unchanged.
3. **Drive the booking with Playwright** against the live preview at `/booking/alluringdolls`:
   - Select a service/category and any add-on, pick date + time, enter client details for `takiyah472@gmail.com`, advance through all 4 steps.
   - Follow the redirect to Square's hosted sandbox checkout and pay the $25 deposit with test card `4111 1111 1111 1111`, future expiry, any CVV/ZIP.
   - Return to the app and confirm the return handler flips the appointment to `confirmed`.
   - Screenshot each step for evidence.
4. **Verify results** in the database: a new `appointments` row for the client is `confirmed` with the deposit recorded, and check `email_send_log` for the confirmation/alert emails to `takiyah472@gmail.com`.
5. **Restore live credentials** from the `/tmp` backup file, re-confirm the row matches the original (`environment=live`, location `K2SAFHS72K75Z`), then shred the temp file.
6. **Report** the observed outcome (booking status, payment result, email send status) with screenshots.

## Notes / risks
- This temporarily repoints Alluring Dolls' payment credentials to sandbox; live checkout is effectively disabled for the brief test window and restored immediately after. Best run when no real customer is booking.
- The confirmation email to `takiyah472@gmail.com` is a real send (email infra is live), which is intended as part of the test.
- No application code changes are expected; this is a verification run. If the flow reveals a bug, I'll report it and propose a follow-up fix rather than editing code mid-test.
