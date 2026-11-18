import "server-only";
import { demoCart } from "./demo";
import { CartError, type CartBackend } from "./types";
import { wooCart } from "./woo";

/** Hosts that must never receive cart writes (live store, no active ecommerce, all prices 0). */
const LIVE_HOSTS = new Set(["woodinfashion.com", "www.woodinfashion.com"]);

/**
 * Picks the cart implementation.
 * - default: local demo cart (cookie). Safe with the live catalogue.
 * - WC_ALLOW_CART_WRITES=true: real Store API cart, but only against a non-live host.
 */
export function cartBackend(): CartBackend {
  if (process.env.WC_ALLOW_CART_WRITES !== "true") return demoCart;

  const host = new URL(process.env.WC_STORE_URL ?? "http://invalid.local").hostname;
  if (LIVE_HOSTS.has(host)) {
    console.error(`[cart] WC_ALLOW_CART_WRITES=true but WC_STORE_URL points at the live site (${host}). Refusing.`);
    throw new CartError(500, "live_writes_blocked", "Cart is unavailable.");
  }
  return wooCart;
}

export * from "./types";
