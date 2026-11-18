import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";

/**
 * WooCommerce webhook receiver. Configure in WooCommerce > Settings > Advanced > Webhooks:
 *   Topic: "Product updated" (and created / deleted / restored)
 *   Delivery URL: https://<your-domain>/api/revalidate
 *   Secret: the same value as REVALIDATE_SECRET
 *
 * WooCommerce signs the raw body with HMAC-SHA256 (base64) in X-WC-Webhook-Signature.
 * Fails closed: no secret configured, or a bad signature, means nothing is revalidated.
 */

function validSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.error("[revalidate] REVALIDATE_SECRET is not set");
    return Response.json({ error: "not_configured" }, { status: 500 });
  }

  const body = await req.text();
  if (!validSignature(body, req.headers.get("x-wc-webhook-signature"), secret)) {
    return Response.json({ error: "invalid_signature" }, { status: 401 });
  }

  const topic = req.headers.get("x-wc-webhook-topic") ?? "";

  // WooCommerce sends a form-encoded "ping" (webhook_id=...) when a webhook is created.
  let payload: { id?: number; slug?: string } = {};
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ ok: true, ping: true });
  }

  // Webhook callers have no Server Action context, so expire immediately ({ expire: 0 }).
  const tags = new Set<string>(["products"]);
  if (typeof payload.slug === "string" && payload.slug.length <= 200) tags.add(`product:${payload.slug}`);
  if (typeof payload.id === "number") tags.add(`product-id:${payload.id}`);
  // Category counts change when products are created or deleted.
  if (/created|deleted|restored/.test(topic)) tags.add("categories");

  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ ok: true, topic, revalidated: [...tags] });
}
