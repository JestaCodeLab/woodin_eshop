import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { normalizeCategory, normalizeProduct } from "./normalize";
import type {
  Category,
  Product,
  ProductPage,
  ProductQuery,
  WCCategory,
  WCProduct,
} from "./types";

/**
 * Read-only catalogue client for the WooCommerce Store API.
 *
 * Caching: every exported getter is a `'use cache'` function with a 300s revalidate window
 * (ISR). With Cache Components enabled this replaces `export const revalidate`.
 * Tags: `products`, `product:<slug>`, `product-id:<id>`, `categories`.
 * The /api/revalidate webhook invalidates them when WooCommerce reports a change.
 *
 * Nothing here writes. Cart mutations live in lib/cart and never touch the live site.
 */

export class WooError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "WooError";
  }
}

export function getStoreUrl(): string {
  const raw = process.env.WC_STORE_URL?.trim();
  if (!raw) throw new WooError(500, "WC_STORE_URL is not set. Copy .env.example to .env.local.");
  return raw.replace(/\/+$/, "");
}

type Query = Record<string, string | number | boolean | undefined>;

function buildUrl(root: string, path: string, query: Query = {}): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const s = qs.toString();
  return `${getStoreUrl()}${root}${path}${s ? `?${s}` : ""}`;
}

async function getJson<T>(url: string): Promise<{ data: T; total: number; totalPages: number }> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "woodin-storefront" },
      // Cached server-side reads against a slow origin: be patient rather than fail the page.
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new WooError(502, `Could not reach ${new URL(url).host}`);
  }
  if (!res.ok) throw new WooError(res.status, `${new URL(url).host} responded ${res.status}`);
  const data = (await res.json()) as T;
  return {
    data,
    total: Number(res.headers.get("x-wp-total") ?? (Array.isArray(data) ? data.length : 0)),
    totalPages: Number(res.headers.get("x-wp-totalpages") ?? 1),
  };
}

/** Only what the UI reads. Trims the Store API payload by ~40% (descriptions, attributes, links…). */
const LIST_FIELDS = "id,name,slug,sku,permalink,short_description,prices,images,categories,is_in_stock,low_stock_remaining";
const DETAIL_FIELDS = `${LIST_FIELDS},description`;

const store = (path: string, query?: Query) => buildUrl("/wp-json/wc/store/v1", path, query);

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  cacheTag("categories");

  const { data } = await getJson<WCCategory[]>(store("/products/categories", { per_page: 100 }));
  return data.map(normalizeCategory);
}

export async function getProducts(query: ProductQuery = {}): Promise<ProductPage> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  cacheTag("products");

  const page = Math.max(1, query.page ?? 1);
  const perPage = Math.min(100, Math.max(1, query.perPage ?? 12));

  const [{ data, total, totalPages }, categories] = await Promise.all([
    getJson<WCProduct[]>(
      store("/products", {
        category: query.category,
        page,
        per_page: perPage,
        orderby: query.orderby,
        order: query.order,
        search: query.search,
        stock_status: query.inStock ? "instock" : undefined,
        _fields: LIST_FIELDS,
      }),
    ),
    getCategories(),
  ]);

  return { items: data.map((p) => normalizeProduct(p, categories)), total, totalPages, page, perPage };
}

export async function getProduct(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  cacheTag("products", `product:${slug}`);

  const [{ data }, categories] = await Promise.all([
    getJson<WCProduct[]>(store("/products", { slug, _fields: DETAIL_FIELDS })),
    getCategories(),
  ]);
  return data[0] ? normalizeProduct(data[0], categories) : null;
}

export async function getProductById(id: number): Promise<Product | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  cacheTag("products", `product-id:${id}`);

  try {
    const [{ data }, categories] = await Promise.all([
      getJson<WCProduct>(store(`/products/${id}`, { _fields: DETAIL_FIELDS })),
      getCategories(),
    ]);
    return normalizeProduct(data, categories);
  } catch (e) {
    if (e instanceof WooError && e.status === 404) return null;
    throw e;
  }
}

/** Other products from the same leaf category (the live catalogue has no "related" data). */
export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  if (!product.leafCategory) return [];
  const { items } = await getProducts({ category: product.leafCategory.slug, perPage: limit + 1 });
  return items.filter((p) => p.id !== product.id).slice(0, limit);
}
