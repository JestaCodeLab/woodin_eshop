import { z } from "zod";
import { cartMutate } from "@/lib/cart/http";

/** POST /api/cart/clear  {}  Empties the bag (called after a completed order). */
export async function POST(req: Request) {
  return cartMutate(req, z.object({}), (cart) => cart.clear());
}
