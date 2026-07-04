# Change email sender name to "Procschedule"

App emails currently show a From line of `schedule-weaver-00 <noreply@notify.procschedule.com>`. The display name comes from a `SITE_NAME` constant defined in two server files. I'll change both to `Procschedule` so emails read `Procschedule <noreply@notify.procschedule.com>`.

## Changes

- `src/routes/lovable/email/transactional/send.ts` — set `SITE_NAME = "Procschedule"` (line 8).
- `src/lib/email/dispatch.server.ts` — set `SITE_NAME = "Procschedule"` (line 14).

The From address domain (`noreply@notify.procschedule.com`) stays the same — only the visible sender name changes.

## Notes

- This covers the app/transactional emails (booking confirmations, alerts, etc.).
- Auth emails (signup, password reset) currently use Lovable's default templates and aren't affected by this constant. If you also want those to say "Procschedule", tell me and I'll scaffold branded auth email templates as a follow-up.
