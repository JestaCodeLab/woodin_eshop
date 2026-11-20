import { failure, guardBrowserPost, json } from "@/lib/checkout/http";
import { startCheckoutSchema } from "@/lib/checkout/schemas";
import { startCheckout } from "@/lib/checkout/server";
import { paymentsEnabled } from "@/lib/payments-config";

/** POST /api/checkout/start: creates the pending WooCommerce order and the Paystack transaction. */
export async function POST(req: Request) {
  const blocked = guardBrowserPost(req, { scope: "checkout-start", max: 8, windowMs: 10 * 60_000 });
  if (blocked) return blocked;
  if (!paymentsEnabled()) return json({ error: "payments_disabled", message: "Online payment is not available yet." }, 503);

  const parsed = startCheckoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "invalid_request", issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })) }, 400);
  }
  try {
    return json(await startCheckout(parsed.data));
  } catch (e) {
    return failure(e);
  }
}
