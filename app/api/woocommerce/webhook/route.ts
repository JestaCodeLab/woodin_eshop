import { createHmac, timingSafeEqual } from "node:crypto";
import { orderMeta, type WCOrder } from "@/lib/orders";
import { notifyOrder } from "@/lib/sms/orders";

/**
 * WooCommerce "Order updated" webhook: texts the customer when a shop manager changes an order in
 * WordPress (shipped + tracking number, ready for collection, completed, refunds).
 *
 * Set up in WordPress > WooCommerce > Settings > Advanced > Webhooks:
 *   Name: Woodin SMS | Status: Active | Topic: Order updated
 *   Delivery URL: https://<your-domain>/api/woocommerce/webhook
 *   Secret: the value of WC_WEBHOOK_SECRET
 * WooCommerce signs the raw body (HMAC-SHA256, base64) in X-WC-Webhook-Signature. Fails closed.
 * The "payment received" text is sent by the checkout itself, not from here.
 */

function validSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(req: Request) {
  const secret = process.env.WC_WEBHOOK_SECRET ?? process.env.REVALIDATE_SECRET;
  if (!secret || secret === "change-me") {
    console.error("[wc webhook] WC_WEBHOOK_SECRET is not set");
    return Response.json({ error: "not_configured" }, { status: 500 });
  }

  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-wc-webhook-signature"), secret)) {
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  let order: WCOrder;
  try {
    order = JSON.parse(raw);
  } catch {
    return Response.json({ ok: true, ping: true }); // WooCommerce sends a form-encoded ping on creation
  }
  if (typeof order?.id !== "number" || !Array.isArray(order.meta_data)) return Response.json({ ok: true, ignored: "not an order" });

  // Only orders placed through the eshop.
  if (orderMeta(order, "woodin_eshop") !== "1") return Response.json({ ok: true, ignored: "not an eshop order" });

  // "paid" is sent by checkout; everything else follows what the shop manager did in WordPress.
  const result = await notifyOrder(order, ["shipped", "ready", "delivered", "refund", "cancelled"]);
  return Response.json({ ok: true, ...result });
}
