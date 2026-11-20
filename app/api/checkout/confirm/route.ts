import { failure, guardBrowserPost, json } from "@/lib/checkout/http";
import { referenceSchema } from "@/lib/checkout/schemas";
import { finalizeByReference } from "@/lib/checkout/server";
import { paymentsEnabled } from "@/lib/payments-config";

/**
 * POST /api/checkout/confirm  { reference }
 * Asks Paystack whether the payment succeeded and, if so, marks the order paid. Idempotent, so
 * the confirmation page can poll it while a Mobile Money prompt is still waiting on the phone.
 */
export async function POST(req: Request) {
  const blocked = guardBrowserPost(req, { scope: "checkout-confirm", max: 60, windowMs: 60_000 }); // the page polls every 3s (20/min)
  if (blocked) return blocked;
  if (!paymentsEnabled()) return json({ error: "payments_disabled" }, 503);

  const parsed = referenceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_request" }, 400);
  try {
    return json(await finalizeByReference(parsed.data.reference));
  } catch (e) {
    return failure(e);
  }
}
