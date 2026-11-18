import { cartMutate } from "@/lib/cart/http";
import { couponSchema } from "@/lib/cart/schemas";

/** POST /api/cart/coupon  { code }  (unsupported in demo mode: returns 400 coupons_unavailable) */
export async function POST(req: Request) {
  return cartMutate(req, couponSchema, (cart, input) => cart.coupon(input));
}
