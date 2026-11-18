export interface CartVariation {
  attribute: string;
  value: string;
}

export interface CartItem {
  /** Stable line key. Pass back to update/remove. */
  key: string;
  productId: number;
  slug: string;
  name: string;
  image: string | null;
  quantity: number;
  variation: CartVariation[];
  /** Major units (GH₵ 450). Null when no price is known. */
  unitPrice: number | null;
  lineTotal: number | null;
  inStock: boolean;
  /** True when the price comes from the demo layer (data/product-overrides.ts), not WooCommerce. */
  demoPrice: boolean;
}

export interface CartCoupon {
  code: string;
  discount: number | null;
}

export interface Cart {
  /** `demo`: local cookie cart, nothing sent to WooCommerce. `woo`: Store API cart (staging only). */
  mode: "demo" | "woo";
  items: CartItem[];
  itemCount: number;
  currency: string;
  subtotal: number | null;
  discount: number;
  /** Before delivery: delivery is chosen at checkout. */
  total: number | null;
  coupons: CartCoupon[];
}

export interface AddItemInput {
  productId: number;
  quantity: number;
  variation: CartVariation[];
}

/** One cart implementation per mode. Each reads/writes its own httpOnly cookie. */
export interface CartBackend {
  get(): Promise<Cart>;
  add(input: AddItemInput): Promise<Cart>;
  update(input: { key: string; quantity: number }): Promise<Cart>;
  remove(input: { key: string }): Promise<Cart>;
  coupon(input: { code: string }): Promise<Cart>;
  /** Empties the cart (after an order completes). */
  clear(): Promise<Cart>;
}

export class CartError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CartError";
  }
}

export const MAX_LINE_QUANTITY = 9;
