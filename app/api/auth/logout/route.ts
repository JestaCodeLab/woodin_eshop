import { endSession } from "@/lib/auth";
import { forgetLocalCart } from "@/lib/cart/demo";
import { guardBrowserPost, json } from "@/lib/checkout/http";

/** POST /api/auth/logout: ends the session and clears the bag from this browser. */
export async function POST(req: Request) {
  const blocked = guardBrowserPost(req);
  if (blocked) return blocked;
  await endSession();
  await forgetLocalCart();
  return json({ ok: true });
}
