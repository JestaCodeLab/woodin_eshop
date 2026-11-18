import { unstable_rethrow } from "next/navigation";
import { finalizeByReference } from "@/lib/checkout/server";
import { verifyWebhookSignature } from "@/lib/paystack";
import { paymentsEnabled } from "@/lib/payments-config";

/**
 * Paystack webhook (set this URL in the Paystack dashboard under Settings > API Keys & Webhooks).
 * - Signature (HMAC-SHA512 of the raw body with the secret key) is checked before anything else.
 * - The payment is then re-verified with Paystack inside finalizeByReference, so a forged or
 *   replayed body can never mark an order paid.
 * - Responds 200 for events we ignore, 500 on a real failure so Paystack retries.
 */
export async function POST(req: Request) {
  if (!paymentsEnabled()) return Response.json({ error: "payments_disabled" }, { status: 503 });

  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-paystack-signature"))) {
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ ok: true });
  }

  if (event.event === "charge.success" && typeof event.data?.reference === "string" && event.data.reference.startsWith("WD-")) {
    try {
      const result = await finalizeByReference(event.data.reference);
      return Response.json({ ok: true, status: result.status });
    } catch (e) {
      unstable_rethrow(e);
      console.error("[paystack webhook]", e instanceof Error ? e.message : e);
      return Response.json({ error: "processing_failed" }, { status: 500 });
    }
  }
  return Response.json({ ok: true, ignored: event.event ?? null });
}
