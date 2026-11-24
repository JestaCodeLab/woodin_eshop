import "server-only";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import { z } from "zod";
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
  date_created_gmt?: string;
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
 * The customer id for an email, or null when there is none. Staff accounts (anything other than the "customer"
 * role) are refused: an eshop sign-in must never get a session on, or write profile data to, an admin or shop
 * manager's WordPress user.
 */
export async function findCustomer(email: string): Promise<number | null> {
  const found = await wc<WCCustomer[]>("GET", `/customers?email=${encodeURIComponent(email)}&role=all`);
  const existing = found.find((c) => c.email.toLowerCase() === email.toLowerCase());
  if (!existing) return null;
  if (existing.role !== "customer") throw new NotACustomerError();
  return existing.id;
}

/** Creates the account for a confirmed email. Called only after the emailed code was verified. */
export async function createCustomer(email: string, p: { name: string; phone: string }): Promise<number> {
  const [first = "", ...rest] = p.name.trim().split(/\s+/);
  const last = rest.join(" ");
  try {
    const created = await wc<WCCustomer>("POST", "/customers", {
      email,
      first_name: first,
      last_name: last,
      billing: { first_name: first, last_name: last, email, phone: p.phone, country: "GH" },
      // The phone was typed, not confirmed: nothing is sent to it until it has been verified.
      meta_data: [{ key: "woodin_phone_verified", value: "no" }],
    });
    return created.id;
  } catch (e) {
    // Two registrations for the same email at once: the second finds the first.
    const again = await findCustomer(email).catch(() => null);
    if (again) return again;
    throw e;
  }
}

export const getCustomer = cache((id: number) => wc<WCCustomer>("GET", `/customers/${id}`));

/** "March 2026" from the customer's creation date, or null. */
export function memberSince(c: WCCustomer): string | null {
  if (!c.date_created_gmt) return null;
  const d = new Date(`${c.date_created_gmt}Z`);
  return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat("en-GH", { month: "long", year: "numeric", timeZone: "Africa/Accra" }).format(d);
}

export const customerNames = (c: WCCustomer) => ({
  first: (c.first_name || c.billing?.first_name || "").trim(),
  last: (c.last_name || c.billing?.last_name || "").trim(),
});

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
  // Once the customer manages an address book in their account, checkout must not rewrite it.
  const hasBook = hasAddressBook(await getCustomer(id));
  const place = p.address && !hasBook ? { address_1: p.address, address_2: p.area ?? "" } : {};
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

// --- Addresses -------------------------------------------------------------

const ADDRESSES_KEY = "woodin_addresses";
export const MAX_ADDRESSES = 10;

const storedAddress = z.object({
  id: z.string().regex(/^[a-z0-9]{4,20}$/),
  label: z.string().max(30),
  name: z.string().max(120),
  phone: z.string().max(20),
  address: z.string().max(240),
  area: z.string().max(160),
  isDefault: z.boolean(),
});
export type Address = z.infer<typeof storedAddress>;

export const newAddressId = () => randomBytes(5).toString("hex");

/** Exactly one default whenever the list is not empty. */
function withOneDefault(list: Address[]): Address[] {
  if (list.length === 0) return list;
  const first = list.findIndex((a) => a.isDefault);
  const keep = first === -1 ? 0 : first;
  return list.map((a, i) => ({ ...a, isDefault: i === keep }));
}

/**
 * The customer's address book. Before they have saved one here, the address from their last
 * checkout (WooCommerce billing) is shown as a default "Home", so nothing looks empty.
 */
/** True once the customer has saved or edited their address book (even if they later emptied it). */
export function hasAddressBook(c: WCCustomer): boolean {
  return typeof metaValue(c, ADDRESSES_KEY) === "string";
}

export function getAddresses(c: WCCustomer): Address[] {
  const raw = metaValue(c, ADDRESSES_KEY);
  if (typeof raw === "string") {
    try {
      const parsed = z.array(storedAddress).max(MAX_ADDRESSES).safeParse(JSON.parse(raw));
      // An empty saved book stays empty: the checkout address must not reappear after they delete it.
      if (parsed.success) return withOneDefault(parsed.data);
    } catch {
      /* unreadable: fall through to the billing address */
    }
  }
  const b = c.billing;
  if (b?.address_1) {
    return [{ id: "billing", label: "Home", name: [b.first_name, b.last_name].filter(Boolean).join(" "), phone: b.phone ?? "", address: b.address_1, area: b.address_2 ?? "", isDefault: true }];
  }
  return [];
}

/** Saves the list, and mirrors the default into WooCommerce billing/shipping so staff see it on the order screen. */
export async function saveAddresses(id: number, list: Address[]): Promise<Address[]> {
  const clean = withOneDefault(list).slice(0, MAX_ADDRESSES);
  const patch: Record<string, unknown> = { meta_data: [{ key: ADDRESSES_KEY, value: JSON.stringify(clean) }] };
  const d = clean.find((a) => a.isDefault);
  if (d) {
    const [first = "", ...rest] = d.name.split(" ");
    const place = { first_name: first, last_name: rest.join(" "), address_1: d.address, address_2: d.area, country: "GH" };
    patch.billing = { ...place, phone: d.phone };
    patch.shipping = place;
  }
  await wc("PUT", `/customers/${id}`, patch);
  return clean;
}

export async function updateProfile(id: number, p: { firstName: string; lastName: string; phone: string }): Promise<void> {
  await wc("PUT", `/customers/${id}`, {
    first_name: p.firstName,
    last_name: p.lastName,
    billing: { first_name: p.firstName, last_name: p.lastName, phone: p.phone, country: "GH" },
  });
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
export const listOrders = cache(async (customerId: number): Promise<WCOrder[]> => {
  const orders = await wc<WCOrder[]>("GET", `/orders?customer=${customerId}&per_page=30&orderby=date&order=desc`);
  return orders.filter((o) => !["pending", "failed", "trash", "checkout-draft"].includes(o.status));
});
