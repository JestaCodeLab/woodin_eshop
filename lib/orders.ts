import "server-only";

/**
 * WooCommerce orders over the authenticated REST API (wc/v3). Orders land in the WordPress
 * dashboard (WooCommerce > Orders) for admins to review. Needs a read/write API key.
 *
 * The orders site is configured separately from the catalogue site (WC_STORE_URL, live and
 * read-only): test orders belong on a STAGING site. Writing to woodinfashion.com is refused
 * unless WC_ORDERS_ALLOW_LIVE=true.
 */

import { wcCredentials } from "./payments-config";

const LIVE_HOSTS = new Set(["woodinfashion.com", "www.woodinfashion.com"]);

export class OrdersError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "OrdersError";
  }
}

function base(): string {
  const raw = process.env.WC_ORDERS_URL?.trim();
  if (!raw) throw new OrdersError(500, "WC_ORDERS_URL is not set");
  const url = new URL(raw);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !local) throw new OrdersError(500, "WC_ORDERS_URL must be https (API keys are sent as Basic auth)");
  if (LIVE_HOSTS.has(url.hostname) && process.env.WC_ORDERS_ALLOW_LIVE !== "true") {
    console.error(`[orders] Refusing to write orders to the live site (${url.hostname}). Point WC_ORDERS_URL at staging.`);
    throw new OrdersError(500, "Orders site not available");
  }
  return raw.replace(/\/+$/, "");
}

async function wc<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<T> {
  const creds = wcCredentials();
  if (!creds) throw new OrdersError(500, "WooCommerce API credentials are not set");

  let res: Response;
  try {
    // `?rest_route=` works whatever the site's permalink/rewrite setup: the live site answers
    // /wp-json/wc/v3/* with "no route" but serves this form.
    res = await fetch(`${base()}/?rest_route=/wc/v3${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.key}:${creds.secret}`).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    if (e instanceof OrdersError) throw e;
    throw new OrdersError(502, "Could not reach the orders site");
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new OrdersError(res.status, err?.message ?? `Orders site responded ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface WCOrder {
  id: number;
  number: string;
  status: string;
  currency: string;
  total: string;
  date_created_gmt?: string;
  meta_data: { id?: number; key: string; value: unknown }[];
  billing?: { first_name?: string; last_name?: string; email?: string; phone?: string };
  line_items?: { name: string; quantity: number }[];
  shipping_lines: { method_id?: string; method_title: string }[];
  /** Refunds on the order. `total` is a negative amount string, e.g. "-50.00". */
  refunds?: { id: number; reason?: string; total: string }[];
}

/** Reads a meta value off an order (string, or undefined). */
export const orderMeta = (o: WCOrder, key: string): string | undefined => {
  const v = o.meta_data.find((m) => m.key === key)?.value;
  return typeof v === "string" ? v : undefined;
};

export interface NewOrder {
  status: "pending";
  currency: "GHS";
  payment_method: string;
  payment_method_title: string;
  set_paid: false;
  billing: Record<string, string>;
  shipping: Record<string, string>;
  customer_note?: string;
  line_items: { product_id: number; quantity: number; subtotal: string; total: string; meta_data?: { key: string; value: string }[] }[];
  shipping_lines: { method_id: string; method_title: string; total: string }[];
  meta_data: { key: string; value: string }[];
}

export const createOrder = (order: NewOrder) => wc<WCOrder>("POST", "/orders", order);
export const getOrder = (id: number) => wc<WCOrder>("GET", `/orders/${id}`);
export const updateOrder = (id: number, patch: Record<string, unknown>) => wc<WCOrder>("PUT", `/orders/${id}`, patch);
export const addOrderNote = (id: number, note: string) => wc<unknown>("POST", `/orders/${id}/notes`, { note, customer_note: false });

export interface WCShippingZone {
  id: number;
  name: string;
}
export interface WCShippingMethod {
  method_id: string; // flat_rate | free_shipping | local_pickup
  enabled: boolean;
  settings: Record<string, { value?: string }>;
}
export const getShippingZones = () => wc<WCShippingZone[]>("GET", "/shipping/zones");
export const getShippingMethods = (zoneId: number) => wc<WCShippingMethod[]>("GET", `/shipping/zones/${zoneId}/methods`);
