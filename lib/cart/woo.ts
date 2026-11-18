import "server-only";
import { cookies } from "next/headers";
import { getStoreUrl } from "@/lib/woocommerce";
import { CartError, type Cart, type CartBackend, type CartItem } from "./types";

/**
 * WooCommerce Store API cart, authenticated with a Cart-Token.
 * The token lives in an httpOnly cookie and is never exposed to browser JavaScript.
 *
 * DISABLED by default (WC_ALLOW_CART_WRITES=false). Only meant for a staging site: the live
 * woodinfashion.com has no active ecommerce, and lib/cart/index.ts refuses to use this
 * backend against it.
 */

const COOKIE = "woodin_cart_token";

interface WCCartItem {
  key: string;
  id: number;
  quantity: number;
  name: string;
  permalink: string;
  images: { src: string }[];
  variation: { attribute: string; value: string }[];
  prices: { price: string; currency_minor_unit: number };
  totals: { line_total: string; currency_minor_unit: number };
}

interface WCCart {
  items: WCCartItem[];
  items_count: number;
  coupons: { code: string; totals: { total_discount: string } }[];
  totals: {
    currency_code: string;
    currency_minor_unit: number;
    total_items: string;
    total_discount: string;
  };
}

const money = (minor: string, unit: number) => Number(minor) / 10 ** unit;

function toCart(c: WCCart): Cart {
  const unit = c.totals.currency_minor_unit;
  const items: CartItem[] = c.items.map((i) => ({
    key: i.key,
    productId: i.id,
    slug: new URL(i.permalink).pathname.split("/").filter(Boolean).pop() ?? String(i.id),
    name: i.name,
    image: i.images[0]?.src ?? null,
    quantity: i.quantity,
    variation: i.variation.map((v) => ({ attribute: v.attribute, value: v.value })),
    unitPrice: money(i.prices.price, i.prices.currency_minor_unit),
    lineTotal: money(i.totals.line_total, i.totals.currency_minor_unit),
    inStock: true,
  }));
  const subtotal = money(c.totals.total_items, unit);
  const discount = money(c.totals.total_discount, unit);
  return {
    mode: "woo",
    items,
    itemCount: c.items_count,
    currency: c.totals.currency_code,
    subtotal,
    discount,
    total: subtotal - discount,
    coupons: c.coupons.map((k) => ({ code: k.code, discount: money(k.totals.total_discount, unit) })),
  };
}

async function request(method: "GET" | "POST", path: string, body?: unknown): Promise<Cart> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;

  let res: Response;
  try {
    res = await fetch(`${getStoreUrl()}/wp-json/wc/store/v1${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { "Cart-Token": token } : null),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new CartError(502, "upstream_unreachable", "The store is unreachable. Try again shortly.");
  }

  // WooCommerce rotates the token. Always store the latest one.
  const fresh = res.headers.get("cart-token");
  if (fresh && fresh !== token) {
    jar.set(COOKIE, fresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
    throw new CartError(res.status, err?.code ?? "upstream_error", err?.message ?? "The store rejected the request.");
  }
  return toCart((await res.json()) as WCCart);
}

export const wooCart: CartBackend = {
  get: () => request("GET", "/cart"),
  add: ({ productId, quantity, variation }) =>
    request("POST", "/cart/add-item", { id: productId, quantity, variation }),
  update: ({ key, quantity }) =>
    quantity === 0 ? request("POST", "/cart/remove-item", { key }) : request("POST", "/cart/update-item", { key, quantity }),
  remove: ({ key }) => request("POST", "/cart/remove-item", { key }),
  coupon: ({ code }) => request("POST", "/cart/apply-coupon", { code }),
};
