import "server-only";
import { wc, type WCOrder } from "./orders";

/**
 * WooCommerce customers over wc/v3. The eshop account IS a WooCommerce customer, so staff see
 * accounts and orders together in WordPress. Favorites and the saved bag live in customer meta,
 * which needs no extra database.
 */

interface WCCustomer {
  id: number;
  email: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  billing?: { first_name?: string; last_name?: string; phone?: string; address_1?: string; address_2?: string };
  meta_data?: { key: string; value: unknown }[];
}

const FAVORITES_KEY = "woodin_favorites";
const CART_KEY = "woodin_cart";
export const MAX_FAVORITES = 200;

const metaValue = (c: WCCustomer, key: string): unknown => c.meta_data?.find((m) => m.key === key)?.value;

/** Thrown when the email belongs to a WordPress user who is not a shop customer (admin, editor…). */
export class NotACustomerError extends Error {
  constructor() {
    super("That email belongs to a staff account");
    this.name = "NotACustomerError";
  }
}

/**
 * Finds the customer for this email, creating it on first sign-in. Staff accounts (anything other
 * than the "customer" role) are refused: an eshop sign-in must never get a session on, or write
 * profile data to, an admin or shop manager's WordPress user.
 */
export async function findOrCreateCustomer(email: string): Promise<{ id: number; created: boolean }> {
  const found = await wc<WCCustomer[]>("GET", `/customers?email=${encodeURIComponent(email)}&role=all`);
  const existing = found.find((c) => c.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    if (existing.role !== "customer") throw new NotACustomerError();
    return { id: existing.id, created: false };
  }
  const created = await wc<WCCustomer>("POST", "/customers", { email, billing: { email } });
  return { id: created.id, created: true };
}

export const getCustomer = (id: number) => wc<WCCustomer>("GET", `/customers/${id}`);

export interface Profile {
  name: string;
  phone: string;
  address: string;
  area: string;
}

export function profileOf(c: WCCustomer): Profile {
  const b = c.billing ?? {};
  const name = [b.first_name || c.first_name, b.last_name || c.last_name].filter(Boolean).join(" ");
  return { name, phone: b.phone ?? "", address: b.address_1 ?? "", area: b.address_2 ?? "" };
}

/**
 * Remembers the details used at checkout so the next order is prefilled. Address fields are only
 * touched when given, so a store-pickup order never blanks a saved delivery address.
 */
export async function saveProfile(
  id: number,
  p: { firstName: string; lastName: string; phone: string; address?: string; area?: string },
): Promise<void> {
  const place = p.address ? { address_1: p.address, address_2: p.area ?? "" } : {};
  await wc("PUT", `/customers/${id}`, {
    first_name: p.firstName,
    last_name: p.lastName,
    billing: { first_name: p.firstName, last_name: p.lastName, phone: p.phone, country: "GH", ...place },
    shipping: { first_name: p.firstName, last_name: p.lastName, country: "GH", ...place },
  });
}

// --- Favorites -------------------------------------------------------------

function parseIds(raw: unknown): number[] {
  if (typeof raw !== "string") return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((n): n is number => Number.isInteger(n) && n > 0).slice(0, MAX_FAVORITES) : [];
  } catch {
    return [];
  }
}

export async function getFavorites(id: number): Promise<number[]> {
  return parseIds(metaValue(await getCustomer(id), FAVORITES_KEY));
}

export async function setFavorites(id: number, ids: number[]): Promise<void> {
  await wc("PUT", `/customers/${id}`, { meta_data: [{ key: FAVORITES_KEY, value: JSON.stringify(ids.slice(0, MAX_FAVORITES)) }] });
}

// --- Saved bag -------------------------------------------------------------

export interface SavedLine {
  id: number;
  qty: number;
  variation: { attribute: string; value: string }[];
}

export async function getSavedCart(id: number): Promise<unknown> {
  const raw = metaValue(await getCustomer(id), CART_KEY);
  if (typeof raw !== "string") return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveCart(id: number, lines: SavedLine[]): Promise<void> {
  await wc("PUT", `/customers/${id}`, { meta_data: [{ key: CART_KEY, value: JSON.stringify(lines) }] });
}

// --- Orders ----------------------------------------------------------------

/** Paid-or-progressing orders for this customer, newest first. Unpaid checkout attempts are hidden. */
export async function listOrders(customerId: number): Promise<WCOrder[]> {
  const orders = await wc<WCOrder[]>("GET", `/orders?customer=${customerId}&per_page=30&orderby=date&order=desc`);
  return orders.filter((o) => !["pending", "failed", "trash", "checkout-draft"].includes(o.status));
}
