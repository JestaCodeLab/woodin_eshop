import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { normalizeCategory, normalizePost, normalizeProduct } from "./normalize";
import type {
  Category,
  Post,
  PostPage,
  Product,
  ProductPage,
  ProductQuery,
  WCCategory,
  WCProduct,
  WPPost,
} from "./types";

/**
 * Read-only catalogue client for WooCommerce (Store API) and WordPress (wp/v2).
 *
 * Caching: every exported getter is a `'use cache'` function with a 300s revalidate window
 * (ISR). With Cache Components enabled this replaces `export const revalidate`.
 * Tags: `products`, `product:<slug>`, `product-id:<id>`, `categories`, `posts`, `post:<slug>`.
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
      signal: AbortSignal.timeout(15_000),
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

const store = (path: string, query?: Query) => buildUrl("/wp-json/wc/store/v1", path, query);
const wp = (path: string, query?: Query) => buildUrl("/wp-json/wp/v2", path, query);

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
    getJson<WCProduct[]>(store("/products", { slug })),
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
      getJson<WCProduct>(store(`/products/${id}`)),
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

// ---------------------------------------------------------------------------
// Insights (WordPress posts)
// ---------------------------------------------------------------------------

export async function getPosts(opts: { page?: number; perPage?: number; category?: number } = {}): Promise<PostPage> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  cacheTag("posts");

  const page = Math.max(1, opts.page ?? 1);
  const { data, total, totalPages } = await getJson<WPPost[]>(
    wp("/posts", {
      page,
      per_page: Math.min(100, opts.perPage ?? 9),
      categories: opts.category,
      _embed: "wp:featuredmedia,wp:term",
      // No body on list pages: the full content is large.
      _fields: "id,slug,date,title,excerpt,categories,_links,_embedded",
    }),
  );
  return { items: data.map((p) => normalizePost(p)), total, totalPages, page };
}

export async function getPost(slug: string): Promise<Post | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  cacheTag("posts", `post:${slug}`);

  const { data } = await getJson<WPPost[]>(wp("/posts", { slug, _embed: "wp:featuredmedia,wp:term" }));
  return data[0] ? normalizePost(data[0], true) : null;
}
