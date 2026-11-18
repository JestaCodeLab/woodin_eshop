import { cartMutate } from "@/lib/cart/http";
import { removeItemSchema } from "@/lib/cart/schemas";

/** POST /api/cart/remove-item  { key } */
export async function POST(req: Request) {
  return cartMutate(req, removeItemSchema, (cart, input) => cart.remove(input));
}
