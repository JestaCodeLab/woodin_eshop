/** Normalised product shape the cards render (Home still feeds this from design data). */
export interface ProductCardData {
  slug: string;
  title: string;
  /** Category line, e.g. "Men · Shirts" */
  cat: string;
  badge?: string;
  image: string;
  /** CSS object-position crop, e.g. "22% 32%" */
  pos: string;
  /** Swatch colours as hex */
  swatches: string[];
  /** Formatted price, or undefined to show the [PRICE] placeholder */
  price?: string;
  /** Model view shown on hover (fabrics only), see data/fabric-models.ts */
  hover?: { src: string; pos: string };
}

// ---------------------------------------------------------------------------
// WooCommerce Store API: only the fields we read (wc/store/v1)
// ---------------------------------------------------------------------------

export interface WCImage {
  id: number;
  src: string;
  thumbnail: string;
  /** "url 1000w, url 600w, ..." of the sizes WordPress generated. */
  srcset: string;
  alt: string;
}

export interface WCPrices {
  /** Minor units as a string, e.g. "45000" with currency_minor_unit 2 = 450.00 */
  price: string;
  regular_price: string;
  sale_price: string;
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
}

export interface WCCategoryRef {
  id: number;
  name: string;
  slug: string;
  link?: string;
}

export interface WCProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  type: string;
  permalink: string;
  short_description: string;
  description: string;
  on_sale: boolean;
  prices: WCPrices;
  images: WCImage[];
  categories: WCCategoryRef[];
  is_in_stock: boolean;
  is_purchasable: boolean;
  low_stock_remaining: number | null;
  attributes: {
    id: number;
    name: string;
    taxonomy: string;
    has_variations: boolean;
    terms: { id: number; name: string; slug: string }[];
  }[];
  variations: { id: number; attributes: { name: string; value: string }[] }[];
}

export interface WCCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
}

// ---------------------------------------------------------------------------
// App-level types (what pages and components consume)
// ---------------------------------------------------------------------------

export interface Category {
  id: number;
  slug: string;
  name: string;
  parent: number;
  count: number;
}

export interface Price {
  /** In major units (GH₵ 450), null when neither WooCommerce nor the demo layer has one. */
  amount: number | null;
  currency: string;
  formatted: string;
  /** True when the amount comes from data/product-overrides.ts, not WooCommerce. */
  isDemo: boolean;
}

export interface ProductImage {
  /** Full-size original. Use for the product page. */
  src: string;
  /** ~600px wide variant for cards (the origin is slow: smaller sources load far faster). */
  card: string;
  /** ~300px wide variant for small thumbnails (cart, checkout, look lists). */
  thumb: string;
  alt: string;
}

export type ProductKind = "rtw" | "fabric" | "other";

export interface Product {
  id: number;
  slug: string;
  sku: string;
  /** Display title after cleanup / override. */
  title: string;
  /** Name exactly as WooCommerce returns it. */
  rawName: string;
  kind: ProductKind;
  /** "Women · Dresses", "Fabrics · Tendresse De Woodin"… */
  categoryLabel: string;
  categories: Category[];
  /** Deepest category, used for related products and breadcrumbs. */
  leafCategory: Category | null;
  price: Price;
  images: ProductImage[];
  inStock: boolean;
  lowStock: number | null;
  description: string;
  shortDescription: string;
  badge?: string;
  /** Crop for the first image on cards. */
  pos: string;
  /** Model wearing a Woodin print, for fabrics (hover on cards, tile on the product page). */
  modelView?: { src: string; alt: string; pos: string };
  permalink: string;
}

export interface ProductPage {
  items: Product[];
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
}

export interface ProductQuery {
  /** Category slug or numeric id. */
  category?: string | number;
  page?: number;
  perPage?: number;
  orderby?: "date" | "title" | "popularity" | "rating" | "price";
  order?: "asc" | "desc";
  search?: string;
  inStock?: boolean;
}

/** Demo size availability. WooCommerce has no sizes (see lib/demo-stock.ts). */
export interface SizeOption {
  label: string;
  state: "in" | "low" | "out";
  /** Units left, only when state is "low". */
  left?: number;
}
