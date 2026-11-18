import {
  DEMO_PRICE_BY_CATEGORY,
  DEMO_PRICE_DEFAULT,
  DEMO_PRICE_DEFAULT_RTW,
  DEMO_PRICE_FABRIC_PIECE,
  PRODUCT_OVERRIDES,
} from "@/data/product-overrides";
import { decodeEntities, formatMoney, stripHtml } from "./format";
import type {
  Category,
  Price,
  Product,
  ProductCardData,
  ProductKind,
  WCCategory,
  WCProduct,
} from "./types";

/** Currency used for demo prices (data/product-overrides.ts). */
export const DEMO_CURRENCY = "GHS";

/** Default card crop: product shots are portrait, faces sit in the upper third. */
const DEFAULT_POS = "50% 20%";

const TYPE_LABEL: Record<string, string> = {
  dress: "Dresses",
  jacket: "Jackets",
  jackets: "Jackets",
  "jacket-ladies-wear": "Jackets",
  "polo-shirts": "Polos",
  "polo-shirst": "Polos", // sic: typo in the live category slug
  top: "Tops",
  shirts: "Shirts",
  "button-shirts": "Shirts",
  trouser: "Trousers",
};

export function normalizeCategory(c: WCCategory): Category {
  return { id: c.id, slug: c.slug, name: decodeEntities(c.name), parent: c.parent, count: c.count };
}

function ancestorChain(cat: Category, byId: Map<number, Category>): Category[] {
  const chain: Category[] = [];
  let cur: Category | undefined = cat;
  while (cur && chain.length < 8) {
    chain.push(cur);
    cur = cur.parent ? byId.get(cur.parent) : undefined;
  }
  return chain;
}

function cleanTitle(rawName: string, kind: ProductKind, leaf: Category | null): string {
  const name = decodeEntities(rawName).replace(/\s+/g, " ").trim();

  // Fabric codes like "83000A-3" become "Tendresse De Woodin · 83000A-3".
  if (kind === "fabric" && /\d/.test(name) && /^[0-9A-Za-z-]+$/.test(name) && leaf) {
    return `${leaf.name} · ${name}`;
  }

  // "RTW dress" -> "Dress", "RTW-Shirt-27" -> "Shirt 27"
  const rtw = name.match(/^RTW[\s-]+(.+)$/i);
  if (rtw) {
    const rest = rtw[1].replace(/-/g, " ").trim();
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return name;
}

function categoryLabel(kind: ProductKind, leaf: Category | null, slugs: Set<string>): string {
  if (kind === "fabric") return leaf ? `Fabrics · ${leaf.name}` : "Fabrics";
  if (kind === "rtw") {
    const women = slugs.has("ladies-wear");
    const men = slugs.has("mens-wear");
    const audience = women && !men ? "Women" : men && !women ? "Men" : null;
    const type = leaf ? (TYPE_LABEL[leaf.slug] ?? leaf.name) : "Ready To Wear";
    return audience ? `${audience} · ${type}` : type;
  }
  return leaf?.name ?? "Woodin";
}

/** Smallest WordPress-generated size at least `min` px wide, else the original. */
function pickVariant(srcset: string | undefined, min: number, fallback: string): string {
  if (!srcset) return fallback;
  const sizes = srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/))
    .map(([url, w]) => ({ url, width: parseInt(w ?? "", 10) }))
    .filter((v) => v.url && Number.isFinite(v.width))
    .sort((a, b) => a.width - b.width);
  return sizes.find((v) => v.width >= min)?.url ?? fallback;
}

function resolvePrice(raw: WCProduct, kind: ProductKind, leaf: Category | null, override?: number): Price {
  const minor = raw.prices?.currency_minor_unit ?? 2;
  const wc = Number(raw.prices?.price ?? 0) / 10 ** minor;
  if (Number.isFinite(wc) && wc > 0) {
    const currency = raw.prices.currency_code;
    return { amount: wc, currency, formatted: formatMoney(wc, currency), isDemo: false };
  }
  const demo =
    override ??
    (leaf ? DEMO_PRICE_BY_CATEGORY[leaf.slug] : undefined) ??
    (kind === "fabric" ? DEMO_PRICE_FABRIC_PIECE : kind === "rtw" ? DEMO_PRICE_DEFAULT_RTW : DEMO_PRICE_DEFAULT);
  return { amount: demo, currency: DEMO_CURRENCY, formatted: formatMoney(demo, DEMO_CURRENCY), isDemo: true };
}

export function normalizeProduct(raw: WCProduct, categories: Category[]): Product {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const refs: Category[] = raw.categories.map(
    (r) => byId.get(r.id) ?? { id: r.id, slug: r.slug, name: decodeEntities(r.name), parent: 0, count: 0 },
  );

  const slugs = new Set<string>();
  let leaf: Category | null = null;
  let leafDepth = -1;
  for (const ref of refs) {
    const chain = ancestorChain(ref, byId);
    chain.forEach((c) => slugs.add(c.slug));
    if (chain.length > leafDepth) {
      leaf = ref;
      leafDepth = chain.length;
    }
  }

  const kind: ProductKind = slugs.has("ready-to-wear")
    ? "rtw"
    : slugs.has("fabrics")
      ? "fabric"
      : "other";

  const override = PRODUCT_OVERRIDES[raw.sku];
  const title = override?.name ?? cleanTitle(raw.name, kind, leaf);

  return {
    id: raw.id,
    slug: raw.slug,
    sku: raw.sku,
    title,
    rawName: raw.name,
    kind,
    categoryLabel: override?.category ?? categoryLabel(kind, leaf, slugs),
    categories: refs,
    leafCategory: leaf,
    price: resolvePrice(raw, kind, leaf, override?.price),
    images: raw.images.map((i) => ({
      src: i.src,
      card: pickVariant(i.srcset, 600, i.src),
      thumb: pickVariant(i.srcset, 300, i.src),
      alt: i.alt || title,
    })),
    inStock: raw.is_in_stock,
    lowStock: raw.low_stock_remaining,
    description: stripHtml(raw.description ?? ""),
    shortDescription: stripHtml(raw.short_description ?? ""),
    badge: override?.badge,
    pos: override?.pos ?? DEFAULT_POS,
    permalink: raw.permalink,
  };
}

/** Adapter for <ProductCard>. */
export function toCardData(p: Product): ProductCardData {
  return {
    slug: p.slug,
    title: p.title,
    cat: p.categoryLabel,
    badge: p.badge,
    image: p.images[0]?.card ?? "",
    pos: p.pos,
    swatches: [],
    price: p.price.amount === null ? undefined : p.price.formatted,
  };
}
