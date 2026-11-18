import { cartGet } from "@/lib/cart/http";

/** GET /api/cart: current cart for this browser (cookie-scoped, never cached). */
export async function GET() {
  return cartGet();
}
