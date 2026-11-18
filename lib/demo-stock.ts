import type { Product, SizeOption } from "./types";

/**
 * DEMO sizes and stock states. WooCommerce has no sizes or variations for these products
 * (all `simple`, no attributes), so the product page invents deterministic availability to
 * show the design's three states. Delete when Woodin sets up size attributes. [CONFIRM]
 */
const SIZES = ["XS", "S", "M", "L", "XL"] as const;

export function sizeOptionsFor(product: Product): SizeOption[] {
  if (product.kind !== "rtw") return [];
  return SIZES.map((label, i) => {
    // Deterministic per product + size so the page never flickers between renders.
    const h = (product.id * 31 + i * 17) % 11;
    if (label === "M") return { label, state: "in" as const }; // always keep one size buyable
    if (h === 0) return { label, state: "out" as const };
    if (h === 1 || h === 2) return { label, state: "low" as const, left: 1 + (h % 3) };
    return { label, state: "in" as const };
  });
}
