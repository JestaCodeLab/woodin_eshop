import { z } from "zod";
import { failure, guardBrowserPost, json } from "@/lib/checkout/http";
import { ordersConfigured } from "@/lib/payments-config";
import { trackOrder } from "@/lib/tracking";

const schema = z.object({
  orderNumber: z.string().trim().regex(/^#?\d{1,10}$/),
  email: z.string().trim().email().max(200),
});

/** Light brute-force brake. Per server instance only (serverless), so it slows guessing, not stops it. */
const attempts = new Map<string, { n: number; reset: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || rec.reset < now) {
    attempts.set(ip, { n: 1, reset: now + 10 * 60_000 });
    return false;
  }
  return ++rec.n > 12;
}

/** POST /api/orders/track { orderNumber, email } */
export async function POST(req: Request) {
  const blocked = guardBrowserPost(req);
  if (blocked) return blocked;
  if (!ordersConfigured()) return json({ error: "tracking_unavailable", message: "Order tracking is not available yet." }, 503);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) return json({ error: "too_many_attempts", message: "Too many attempts. Please wait a few minutes and try again." }, 429);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_request", message: "Enter your order number and the email you used at checkout." }, 400);

  try {
    const view = await trackOrder(parsed.data.orderNumber.replace("#", ""), parsed.data.email);
    if (!view) {
      await new Promise((r) => setTimeout(r, 400)); // same cost for every miss
      return json({ error: "not_found", message: "We could not find an order with those details. Check the number and email and try again." }, 404);
    }
    return json(view);
  } catch (e) {
    return failure(e);
  }
}
