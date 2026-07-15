// Server-only Stripe helpers.
//
// Lovable's built-in Stripe integration is reached through the connector
// gateway (it mirrors the Paddle setup). We never talk to api.stripe.com
// directly — the gateway injects the real Stripe credentials based on the
// X-Connection-Api-Key / Lovable-API-Key headers.
import Stripe from "stripe";

export type StripeEnv = "sandbox" | "live";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev/stripe";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
}

export function getStripeApiKey(env: StripeEnv): string {
  return env === "sandbox"
    ? getEnv("STRIPE_SANDBOX_API_KEY")
    : getEnv("STRIPE_LIVE_API_KEY");
}

export function getWebhookSecret(env: StripeEnv): string {
  return env === "sandbox"
    ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
    : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
}

// ---- Stripe-style form encoding (supports nested objects & arrays) ----
function buildPairs(value: unknown, keyPrefix: string, pairs: [string, string][]) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => {
      if (v !== null && typeof v === "object") {
        buildPairs(v, `${keyPrefix}[${i}]`, pairs);
      } else if (v !== undefined && v !== null) {
        pairs.push([`${keyPrefix}[]`, String(v)]);
      }
    });
  } else if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      buildPairs(v, keyPrefix ? `${keyPrefix}[${k}]` : k, pairs);
    }
  } else {
    pairs.push([keyPrefix, String(value)]);
  }
}

export function toFormBody(params: Record<string, unknown>): string {
  const pairs: [string, string][] = [];
  buildPairs(params, "", pairs);
  return pairs
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

type StripeFetchOptions = {
  method?: "GET" | "POST";
  params?: Record<string, unknown>;
};

export async function stripeFetch<T = any>(
  env: StripeEnv,
  path: string,
  { method = "GET", params }: StripeFetchOptions = {},
): Promise<T> {
  const connectionApiKey = getStripeApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");

  const headers: Record<string, string> = {
    "X-Connection-Api-Key": connectionApiKey,
    "Lovable-API-Key": lovableApiKey,
  };

  let url = `${GATEWAY_BASE_URL}${path}`;
  const init: RequestInit = { method, headers };

  if (params && Object.keys(params).length) {
    if (method === "GET") {
      url += `?${toFormBody(params)}`;
    } else {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      init.body = toFormBody(params);
    }
  }

  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as any)?.error?.message || `Stripe request failed (${res.status})`;
    throw new Error(message);
  }
  return json as T;
}

/** Resolve a human-readable lookup_key (e.g. "pro_monthly") to its Stripe price. */
export async function resolvePrice(
  env: StripeEnv,
  lookupKey: string,
): Promise<{ id: string; recurring: boolean }> {
  const json = await stripeFetch<{ data: any[] }>(env, "/v1/prices", {
    params: { lookup_keys: [lookupKey], active: true, limit: 1 },
  });
  const price = json.data?.[0];
  if (!price) throw new Error(`No active Stripe price found for "${lookupKey}"`);
  return { id: price.id as string, recurring: Boolean(price.recurring) };
}

// Webhook signature verification is performed offline (no network call), so we
// can reuse a single Stripe instance regardless of environment. In the Worker /
// edge runtime the synchronous crypto path is unavailable, so use the async
// verifier — sync throws "SubtleCryptoProvider cannot be used in a synchronous
// context".
const verifier = new Stripe("sk_signature_verification_only", {
  httpClient: Stripe.createFetchHttpClient(),
});

export function constructWebhookEvent(
  body: string,
  signature: string,
  env: StripeEnv,
): Promise<Stripe.Event> {
  return verifier.webhooks.constructEventAsync(body, signature, getWebhookSecret(env));
}
