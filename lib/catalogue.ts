import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { SHOP_SECTIONS, type ShopSectionKey } from "./links";
import { getCategories, getProducts } from "./woocommerce";
import type { Product } from "./types";

/**
 * Shop listing engine.
 *
 * WooCommerce can't sort or filter by price here (every live price is 0; prices come from the
 * demo layer), so each section is fetched once, cached for 300s, and filtered/sorted/paginated
 * in the app. 448 products is small enough for this to be cheap.
 */

// ---------------------------------------------------------------------------
// Fetching (cached)
// ---------------------------------------------------------------------------

/**
 * Every product in a WooCommerce category (all pages), cached.
 * Page count comes from the cached category tree, so all pages are requested in ONE parallel
 * round (the origin is slow: two sequential rounds doubled the wait). If the tree is stale and
 * more pages exist, the remainder is fetched afterwards.
 */
async function getAllInCategory(wcSlug: string): Promise<Product[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  cacheTag("products");

  const categories = await getCategories();
  const expected = Math.max(1, Math.ceil((categories.find((c) => c.slug === wcSlug)?.count ?? 0) / 100));
  const pages = await Promise.all(
    Array.from({ length: expected }, (_, i) => getProducts({ category: wcSlug, perPage: 100, page: i + 1 })),
  );
  const totalPages = pages[0].totalPages;
  if (totalPages > expected) {
    pages.push(
      ...(await Promise.all(
        Array.from({ length: totalPages - expected }, (_, i) =>
          getProducts({ category: wcSlug, perPage: 100, page: expected + i + 1 }),
        ),
      )),
    );
  }
  return pages.flatMap((r) => r.items);
}

/**
 * Products for a section. With no section: ready-to-wear first, then fabrics (374 of 448 products are fabrics and would otherwise bury the garments).
 */
export async function getSectionProducts(section?: ShopSectionKey): Promise<Product[]> {
  if (section) {
    const wc = SHOP_SECTIONS.find((s) => s.key === section)!.wcSlug;
    return getAllInCategory(wc);
  }
  const [rtw, fabrics] = await Promise.all([getAllInCategory("ready-to-wear"), getAllInCategory("fabrics")]);
  const seen = new Set<number>();
  return [...rtw, ...fabrics].filter((p) => !seen.has(p.id) && seen.add(p.id));
}

// ---------------------------------------------------------------------------
// URL parameters
// ---------------------------------------------------------------------------

export const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
] as const;

const slugLike = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,60}$/);
const money = z.coerce.number().min(0).max(1_000_000);

export const shopParamsSchema = z.object({
  cat: z.enum(SHOP_SECTIONS.map((s) => s.key) as [ShopSectionKey, ...ShopSectionKey[]]).optional(),
  type: slugLike.optional(),
  min: money.optional(),
  max: money.optional(),
  stock: z.literal("1").optional(),
  q: z.string().trim().max(80).optional(),
  sort: z.enum(SORTS.map((s) => s.value) as [string, ...string[]]).default("featured"),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export type ShopParams = z.infer<typeof shopParamsSchema>;

/** Parses Next's searchParams. Invalid values are dropped one by one, never an error page. */
export function parseShopParams(raw: Record<string, string | string[] | undefined>): ShopParams {
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) flat[k] = Array.isArray(v) ? v[0] : v;

  const whole = shopParamsSchema.safeParse(flat);
  if (whole.success) return whole.data;

  const cleaned: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(flat)) {
    const field = (shopParamsSchema.shape as Record<string, z.ZodType>)[k];
    if (field && field.safeParse(v).success) cleaned[k] = v;
  }
  return shopParamsSchema.parse(cleaned);
}

/** Serialises params back into a query string (omitting defaults), with overrides applied. */
export function shopQuery(params: ShopParams, patch: Partial<Record<keyof ShopParams, string | number | undefined | null>> = {}): string {
  const merged: Record<string, string | number | undefined | null> = { ...params, ...patch };
  const qs = new URLSearchParams();
  for (const key of ["cat", "type", "q", "min", "max", "stock", "sort", "page"] as const) {
    const v = merged[key];
    if (v === undefined || v === null || v === "") continue;
    if (key === "sort" && v === "featured") continue;
    if (key === "page" && Number(v) === 1) continue;
    qs.set(key, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

export interface TypeFacet {
  slug: string;
  label: string;
  count: number;
}

export interface ShopResult {
  items: Product[];
  /** Matches after every filter. */
  total: number;
  /** Matches in the section before filters, for the "N pieces" label. */
  sectionTotal: number;
  page: number;
  totalPages: number;
  perPage: number;
  /** Product types in the section (Dresses, Tops…), counted before the type filter. */
  types: TypeFacet[];
}

const PER_PAGE = 24;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * "Women · Dresses" -> Dresses, "Fabrics · Tendresse De Woodin" -> Tendresse De Woodin.
 * Labels come from data/product-overrides.ts and the rules in lib/normalize.ts.
 */
export function productType(p: Product): { slug: string; label: string } {
  const label = p.categoryLabel.split(" · ").pop() ?? p.categoryLabel;
  return { slug: slugify(label), label };
}

export function filterShop(all: Product[], params: ShopParams): ShopResult {
  const typeCounts = new Map<string, TypeFacet>();
  for (const p of all) {
    const t = productType(p);
    const cur = typeCounts.get(t.slug);
    if (cur) cur.count++;
    else typeCounts.set(t.slug, { ...t, count: 1 });
  }
  const types = [...typeCounts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const q = params.q?.toLowerCase();
  let items = all.filter((p) => {
    if (params.type && productType(p).slug !== params.type) return false;
    if (params.stock && !p.inStock) return false;
    const price = p.price.amount;
    if (params.min !== undefined && (price === null || price < params.min)) return false;
    if (params.max !== undefined && (price === null || price > params.max)) return false;
    if (q && !`${p.title} ${p.sku} ${p.categoryLabel}`.toLowerCase().includes(q)) return false;
    return true;
  });

  if (params.sort === "price-asc") items = [...items].sort((a, b) => (a.price.amount ?? 0) - (b.price.amount ?? 0));
  else if (params.sort === "price-desc") items = [...items].sort((a, b) => (b.price.amount ?? 0) - (a.price.amount ?? 0));
  else if (params.sort === "name") items = [...items].sort((a, b) => a.title.localeCompare(b.title, "en", { numeric: true }));

  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const page = Math.min(params.page, totalPages);
  return {
    items: items.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    total: items.length,
    sectionTotal: all.length,
    page,
    totalPages,
    perPage: PER_PAGE,
    types,
  };
}

/** Rows for the section list in the sidebar, with live counts. */
export function sectionLabel(section?: ShopSectionKey): string {
  return section ? SHOP_SECTIONS.find((s) => s.key === section)!.label : "Shop all";
}
