/**
 * DEMO OVERRIDES, delete once Woodin cleans up the catalogue.
 *
 * The live woodinfashion.com catalogue has SKU-style names ("RTW-Shirt-27"), a price of 0
 * on every product (no active ecommerce) and inconsistent categories. For the client pitch
 * this file supplies display names, category lines and GH₵ prices, keyed by WooCommerce SKU.
 *
 *  - Names were written from the product photos, not from Woodin. [CONFIRM] with Woodin.
 *  - Prices are INVENTED placeholders. [CONFIRM] with Woodin. A real WooCommerce price > 0
 *    always wins over anything here.
 *  - Products without an entry fall back to the rules in lib/normalize.ts.
 */

export interface ProductOverride {
  name?: string;
  /** Category line shown on cards, e.g. "Women · Dresses". */
  category?: string;
  /** GH₵, major units. */
  price?: number;
  badge?: string;
  /** object-position crop for the card image. */
  pos?: string;
}

const o = (name: string, category: string, price: number, badge?: string): ProductOverride => ({
  name,
  category,
  price,
  ...(badge ? { badge } : null),
});

export const PRODUCT_OVERRIDES: Record<string, ProductOverride> = {
  // Women: dresses
  "RTW-Shirt-27": o("Sunburst Maxi Dress", "Women · Dresses", 520, "New"),
  "RTW-Shirt-26": o("Rose Wrap Maxi Dress", "Women · Dresses", 540, "New"),
  "RTW-Shirt-24": o("Lilac Flow Dress", "Women · Dresses", 500, "Simulation"),
  "RTW-Shirt-22": o("Emerald Stripe Maxi", "Women · Dresses", 520),
  "RTW-Shirt-08-2-1-5-7-9-5": o("Puff Sleeve Dress", "Women · Dresses", 460, "Last few"),
  "RTW-Shirt-08-2-1-5-7-9-4": o("Patchwork Shirt Dress", "Women · Dresses", 480, "Bestseller"),
  "RTW-Shirt-08-2-1-5-7-6": o("Blue Polo Dress", "Women · Dresses", 380),
  "RTW-Shirt-08-2-1-5-7-5": o("Black Mandarin Dress", "Women · Dresses", 400),
  "RTW-Shirt-08-2-1-5-7-4": o("Sunshine Polo Dress", "Women · Dresses", 380, "New"),

  // Women: shirts and tops
  "RTW-Shirt-25": o("Green Print Overshirt", "Women · Shirts", 320),
  "RTW-Shirt-21": o("Graphic Print Tee", "Women · Tops", 180),
  "RTW-Shirt-20": o("Fuchsia Panel Tee", "Women · Tops", 190, "New"),
  "RTW-Shirt-09-2-1-3-1-1": o("Black Patch Tee", "Women · Tops", 190),
  "RTW-Shirt-08-2-1-5-7-9-7": o("Burgundy Block Tee", "Women · Tops", 200),
  "RTW-Shirt-08-2-1-5-7-9-6": o("Magenta Block Tee", "Women · Tops", 200),
  "RTW-Shirt-08-2-1-5-7-1": o("Magenta Band Tee", "Women · Tops", 190),
  "RTW-Shirt-08-2-1-5-8": o("Bloom Band Tee", "Women · Tops", 190),
  "RTW-Shirt-08-2-1-5-7": o("Crimson Band Tee", "Women · Tops", 190),
  "RTW-Shirt-08-2-1-5-4": o("Zebra Band Tee", "Women · Tops", 190),
  "RTW-Shirt-08-2-1-5-3": o("Slate Band Tee", "Women · Tops", 190),
  "RTW-Shirt-08-2-1-5-2": o("Monochrome Stripe Tee", "Women · Tops", 190),
  "RTW-Shirt-08-2-1-5-1": o("Heritage Stripe Tee", "Women · Tops", 190),

  // Women: trousers and skirts
  "RTW-Shirt-08-2-1-5-7-9": o("Gold Print Culottes", "Women · Trousers", 330),
  "RTW-Shirt-08-2-1-5-7-8": o("Rose Print Trousers", "Women · Trousers", 330),
  "RTW-Shirt-08-2-1-5-7-7": o("Rainbow Stripe Skirt", "Women · Skirts", 300),

  // Jackets
  "RTW-Shirt-08-2-1-5-7-9-3": o("Cobalt Print Bomber", "Women · Jackets", 480, "New"),
  "RTW-Shirt-08-2-1-5-7-9-2": o("Midnight Print Bomber", "Women · Jackets", 480),

  // Polos (unisex product shots)
  "RTW-Shirt-08-2-1-5-6": o("Grey Print-Sleeve Polo", "Polos", 220),
  "RTW-Shirt-08-2-1-5-5": o("Black Heritage Polo", "Polos", 220),
  "RTW-Shirt-08-2-1-5-7-3": o("White Print-Sleeve Polo", "Polos", 220),
  "RTW-Shirt-08-2-1-5-7-2": o("Yellow Print-Sleeve Polo", "Polos", 220),

  // Men (model shots)
  "RTW-Shirt-08-2-1-5": o("Red Panel Tee", "Men · Tees", 200, "New"),
  "RTW-Shirt-08-2-1-3": o("Black Print-Sleeve Polo", "Men · Polos", 230),
  "RTW-Shirt-08-2-1-2": o("Yellow Square Tee", "Men · Tees", 200),
  "RTW-Shirt-08-2-1-1": o("Yellow Heritage Polo", "Men · Polos", 230, "Bestseller"),
  "RTW-Shirt-08-2-1": o("Blue Collar-Print Polo", "Men · Polos", 230),
};

/**
 * Fallback demo prices (GH₵) by leaf category slug, used when WooCommerce has no price and
 * there is no per-SKU override. [CONFIRM] with Woodin.
 */
export const DEMO_PRICE_BY_CATEGORY: Record<string, number> = {
  dress: 450,
  jacket: 480,
  "jacket-ladies-wear": 480,
  jackets: 480,
  trouser: 320,
  shirts: 280,
  "button-shirts": 300,
  top: 200,
  "polo-shirts": 220,
  "polo-shirst": 220,
};
export const DEMO_PRICE_DEFAULT_RTW = 280;
/** Fabrics are sold by the piece. [CONFIRM] length and price with Woodin. */
export const DEMO_PRICE_FABRIC_PIECE = 180;
export const DEMO_PRICE_DEFAULT = 150;
