import { cartMutate } from "@/lib/cart/http";
import { addItemSchema } from "@/lib/cart/schemas";

/** POST /api/cart/add-item  { productId, quantity?, variation? } */
export async function POST(req: Request) {
  return cartMutate(req, addItemSchema, (cart, input) => cart.add(input));
}
