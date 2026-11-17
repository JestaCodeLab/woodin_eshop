/** Normalised product shape the UI renders. Step 3 maps WooCommerce Store API data into this. */
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
}
