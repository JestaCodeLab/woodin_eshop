import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { getProductById } from "@/lib/woocommerce";
import { addItemSchema } from "./schemas";
import { CartError, MAX_LINE_QUANTITY, type Cart, type CartBackend, type CartItem, type CartVariation } from "./types";

/**
 * Local demo cart. Nothing is sent to WooCommerce: the cart lives in an httpOnly cookie as
 * [{ id, qty, variation }]. Prices are never stored in the cookie. They are looked up on the
 * server on every read, so editing the cookie cannot change a price.
 */

const COOKIE = "woodin_demo_cart";
const MAX_LINES = 40;

const storedSchema = z
  .array(
    z.object({
      id: z.number().int().positive(),
      qty: z.number().int().min(1).max(MAX_LINE_QUANTITY),
      variation: addItemSchema.shape.variation,
    }),
  )
  .max(MAX_LINES);
type Stored = z.infer<typeof storedSchema>;

export function lineKey(productId: number, variation: CartVariation[]): string {
  const v = variation
    .map((x) => `${x.attribute}=${x.value}`)
    .sort()
    .join("&");
  return v ? `${productId}|${v}` : String(productId);
}

async function read(): Promise<Stored> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = storedSchema.safeParse(JSON.parse(Buffer.from(raw, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

async function write(lines: Stored): Promise<void> {
  (await cookies()).set(COOKIE, Buffer.from(JSON.stringify(lines)).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function build(lines: Stored): Promise<Cart> {
  const products = await Promise.all(lines.map((l) => getProductById(l.id)));
  const items: CartItem[] = [];
  lines.forEach((l, i) => {
    const p = products[i];
    if (!p) return; // product removed from the catalogue since it was added
    const unit = p.price.amount;
    items.push({
      key: lineKey(l.id, l.variation),
      productId: p.id,
      slug: p.slug,
      name: p.title,
      image: p.images[0]?.thumb ?? null,
      quantity: l.qty,
      variation: l.variation,
      unitPrice: unit,
      lineTotal: unit === null ? null : unit * l.qty,
      inStock: p.inStock,
    });
  });

  const priced = items.every((i) => i.lineTotal !== null);
  const subtotal = priced ? items.reduce((n, i) => n + (i.lineTotal ?? 0), 0) : null;
  return {
    mode: "demo",
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    currency: "GHS",
    subtotal,
    discount: 0,
    total: subtotal,
    coupons: [],
  };
}

export const demoCart: CartBackend = {
  async get() {
    return build(await read());
  },

  async add({ productId, quantity, variation }) {
    const product = await getProductById(productId);
    if (!product) throw new CartError(404, "product_not_found", "That product no longer exists.");
    if (!product.inStock) throw new CartError(409, "out_of_stock", "That product is out of stock.");

    const lines = await read();
    const key = lineKey(productId, variation);
    const existing = lines.find((l) => lineKey(l.id, l.variation) === key);
    if (existing) {
      existing.qty = Math.min(MAX_LINE_QUANTITY, existing.qty + quantity);
    } else {
      if (lines.length >= MAX_LINES) throw new CartError(409, "cart_full", "Your bag is full.");
      lines.push({ id: productId, qty: quantity, variation });
    }
    await write(lines);
    return build(lines);
  },

  async update({ key, quantity }) {
    const lines = await read();
    const next = lines
      .map((l) => (lineKey(l.id, l.variation) === key ? { ...l, qty: quantity } : l))
      .filter((l) => l.qty > 0);
    await write(next);
    return build(next);
  },

  async remove({ key }) {
    const next = (await read()).filter((l) => lineKey(l.id, l.variation) !== key);
    await write(next);
    return build(next);
  },

  async clear() {
    await write([]);
    return build([]);
  },

  async coupon() {
    throw new CartError(400, "coupons_unavailable", "Promo codes are not available in this demo.");
  },
};
