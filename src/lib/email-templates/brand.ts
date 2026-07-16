// Absolute-URL brand constants for email rendering.
// Emails are opened outside the app, so all image URLs must be absolute.

const CDN_ORIGIN = "https://procschedule.com";

export const BRAND = {
  name: "ProcSchedule",
  origin: CDN_ORIGIN,
  logoLightUrl:
    CDN_ORIGIN + "/__l5e/assets-v1/55284b0a-ca0d-43d6-ad44-f1201442a892/procschedule-logo-light.svg",
  logoDarkUrl:
    CDN_ORIGIN + "/__l5e/assets-v1/26403994-9ff1-4a20-82ca-ca306f3ecf69/procschedule-logo-dark.svg",
  iconUrl:
    CDN_ORIGIN + "/__l5e/assets-v1/3e94def5-d6d4-42c9-bb72-6a71e1cf5ad6/procschedule-icon-192.png",
  ink: "#141414",
  gold: "#C9A15A",
  goldSoft: "#E7C989",
  paper: "#ffffff",
  parchment: "#FAF7F1",
  border: "#e5e0d4",
  text: "#334155",
  muted: "#6b6558",
  supportEmail: "admin@procschedule.com",
  tagline: "Booking, payments, and reminders for service pros.",
  dashboardUrl: "https://procschedule.com/dashboard/home",
} as const;
