// Client-side Stripe helpers.
//
// Unlike Paddle there is no public client token to key off, so the
// environment is derived from where the app is running: the Lovable preview
// (and local dev) use the Stripe test environment, while the published site
// uses live. This must stay in sync with the `?env=` value Lovable configures
// on the webhook endpoint and with `useSubscription`.
export type StripeEnv = "sandbox" | "live";

const PREVIEW_HOST_PATTERNS = [
  "localhost",
  "127.0.0.1",
  ".lovableproject.com",
  ".lovable.app",
  ".lovable.dev",
  "lovableproject.com",
];

export function getStripeEnvironment(): StripeEnv {
  if (typeof window === "undefined") return "sandbox";
  const host = window.location.hostname.toLowerCase();
  const isPreview = PREVIEW_HOST_PATTERNS.some(
    (p) => host === p || host.endsWith(p),
  );
  return isPreview ? "sandbox" : "live";
}
