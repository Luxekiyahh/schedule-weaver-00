# Luxe Allure Artistry booking page

Build a fully custom, high-end booking site for your own makeup business under your master admin account, free of charge, without turning your admin account into a normal tenant.

## What you'll get

A public booking page at `procschedule.com/luxe-allure-artistry` with:

- Soft nude and champagne look: warm cream and beige base, soft gold accents, editorial beauty typography, large imagery, generous spacing. Built as its own custom page, not the standard tenant template.
- Services: Soft Glam $75 (1 hr 20 min) and Full Glam $95 (1 hr 20 min). Easy to add more later from your dashboard.
- Location choice at booking: "Come to my studio" or "Travel to me". Studio bookings show your studio address; travel bookings ask the client for their address, which appears on your alert text and email.
- Flat deposit collected at booking before the appointment is held. Default $25, changeable by you.
- Phone number required, then the existing flow runs as normal: client gets the reply YES text, then the confirmation text with time and address, and you get an owner alert.
- Everything lands on your existing calendar, and confirmation emails use your branding.

## How your admin account stays an admin account

Today any workspace owned by a platform admin is blocked from having a public booking page. Rather than remove that rule, your one business workspace gets an explicit opt-in flag; every other admin-owned workspace stays blocked.

Your existing "Takiyah Testing" workspace (no services, no appointments) is renamed to Luxe Allure Artistry with slug `luxe-allure-artistry` and reused, so you keep one workspace and the dashboard keeps working. You will still land on `/admin` after signing in, with a link into the business dashboard.

## Free for you

The dashboard paywall bypass for your email already exists. Feature gating (text messages and similar) reads paid-plan records, so your workspace gets a comped top-tier record with no Stripe charge, marked as comped so it is never billed or cancelled by webhooks.

## What I need from you

- Your studio address (used on the page, confirmations and the booking timezone).
- Deposit amount if not $25.
- Any photos or a logo you want on the page. Without them I will use tasteful generated beauty imagery you can swap out later.

## Technical notes

1. Migration: add `storefront_enabled boolean not null default false` to `public.workspaces`; set it true only for this workspace. Update `isOwnerPlatformAdmin` usage in `booking.functions.ts`, `book.functions.ts`, `tenant.functions.ts` and `getStorefront` to allow an admin-owned workspace when `storefront_enabled` is true.
2. Migration also: rename/slug the workspace, set `business_address`, derive timezone via `guessTimezoneFromAddress`, seed a `service_categories` row plus the two services with prices and 80-minute durations, seed availability, and insert comped `subscriptions` rows (plan_tier `enterprise`, status `active`, `environment` live and sandbox, no Stripe ids) flagged as comped so `syncWorkspaceSubscription` and the Stripe webhook skip them.
3. New route `src/routes/luxe.$slug.tsx`-style custom flow, reached from `/booking/luxe-allure-artistry` by branching on the slug the same way `AlluringDollsBookingFlow` does today, with a dedicated `LuxeAllureBookingFlow` component and a nude/champagne palette expressed as CSS tokens (no hardcoded color utilities).
4. Location mode: store the choice and optional client address in the appointment notes/metadata used by `booking-sms.server.ts` and `appointment-emails.server.ts` so both texts and emails show the right address.
5. Deposit: reuse the existing deposit/payment-intent path in `booking.functions.ts` (already validates payment before confirming) with a flat amount from payment settings.
6. Keep timezone handling, E.164 phone normalization and the pending → YES → confirmed sequence unchanged.
