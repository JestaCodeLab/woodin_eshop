import "server-only";

/**
 * Payments are only "on" when BOTH Paystack and the WooCommerce orders site are configured.
 * Otherwise the checkout falls back to the simulated demo flow (no money, no orders).
 */

export function paystackSecret(): string | null {
  const k = process.env.PAYSTACK_SECRET_KEY?.trim();
  return k ? k : null;
}

/** sk_live_… keys move real money. Anything else is test mode. */
export function isLivePaystackKey(): boolean {
  return (paystackSecret() ?? "").startsWith("sk_live_");
}

export function paystackApiUrl(): string {
  return (process.env.PAYSTACK_API_URL?.trim() || "https://api.paystack.co").replace(/\/+$/, "");
}

/** WooCommerce REST credentials. WOOCOMMERCE_CONSUMER_* is accepted as an alias. */
export function wcCredentials(): { key: string; secret: string } | null {
  const key = (process.env.WC_CONSUMER_KEY ?? process.env.WOOCOMMERCE_CONSUMER_KEY)?.trim();
  const secret = (process.env.WC_CONSUMER_SECRET ?? process.env.WOOCOMMERCE_CONSUMER_SECRET)?.trim();
  return key && secret ? { key, secret } : null;
}

export function ordersConfigured(): boolean {
  return Boolean(process.env.WC_ORDERS_URL && wcCredentials());
}

let warnedLiveKey = false;

/**
 * Real payments are on only when Paystack AND the orders site are configured. A LIVE Paystack key
 * (real money) additionally needs PAYSTACK_ALLOW_LIVE=true, so pasting the wrong key can never
 * silently start taking real payments: checkout stays in the simulated demo instead.
 */
export function paymentsEnabled(): boolean {
  if (paystackSecret() === null || !ordersConfigured()) return false;
  if (isLivePaystackKey() && process.env.PAYSTACK_ALLOW_LIVE !== "true") {
    if (!warnedLiveKey) {
      warnedLiveKey = true;
      console.error("[payments] PAYSTACK_SECRET_KEY is a LIVE key (sk_live_) and PAYSTACK_ALLOW_LIVE is not true. Real payments are OFF. Use an sk_test_ key while testing.");
    }
    return false;
  }
  return true;
}

/** Channels offered in the Paystack popup. Default: Mobile Money and cards. */
export function paystackChannels(): string[] {
  return (process.env.PAYSTACK_CHANNELS ?? "mobile_money,card")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}
