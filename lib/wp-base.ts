/**
 * Base URL of the WooCommerce site that receives orders and hosts the login plugin (WC_ORDERS_URL).
 * No "server-only" import: the proxy (middleware) uses this too.
 */

const LIVE_HOSTS = new Set(["woodinfashion.com", "www.woodinfashion.com"]);

export function ordersBase(): string {
  const raw = process.env.WC_ORDERS_URL?.trim();
  if (!raw) throw new Error("WC_ORDERS_URL is not set");
  const url = new URL(raw);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !local) throw new Error("WC_ORDERS_URL must be https (API keys and the login secret are sent with each call)");
  if (LIVE_HOSTS.has(url.hostname) && process.env.WC_ORDERS_ALLOW_LIVE !== "true") {
    console.error(`[orders] Refusing to write orders to the live site (${url.hostname}). Point WC_ORDERS_URL at staging.`);
    throw new Error("Orders site not available");
  }
  // Only the site root matters: tolerate a pasted API path such as /wp-json/wc/v3/orders.
  return url.origin;
}
