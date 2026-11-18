import { cartMutate } from "@/lib/cart/http";
import { updateItemSchema } from "@/lib/cart/schemas";

/** POST /api/cart/update-item  { key, quantity }  (quantity 0 removes the line) */
export async function POST(req: Request) {
  return cartMutate(req, updateItemSchema, (cart, input) => cart.update(input));
}
