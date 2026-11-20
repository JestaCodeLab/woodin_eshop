import "server-only";
import { unstable_rethrow } from "next/navigation";
import { CartError } from "@/lib/cart";
import { OrdersError } from "@/lib/orders";
import { PaystackError } from "@/lib/paystack";
import { isSameOrigin } from "@/lib/http-guard";
import { rateLimit } from "@/lib/rate-limit";
import { CheckoutError } from "./server";

const NO_STORE = { "Cache-Control": "no-store" };

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

/**
 * Checkout endpoints are cookie-authenticated, so require a JSON content type (a cross-site form
 * cannot send one without a CORS preflight) and a same-origin Origin header.
 */
export function guardBrowserPost(req: Request, limit?: { scope: string; max: number; windowMs: number }): Response | null {
  if (!isSameOrigin(req)) return json({ error: "forbidden_origin" }, 403);
  if (!req.headers.get("content-type")?.includes("application/json")) return json({ error: "unsupported_media_type" }, 415);
  if (limit && rateLimit(req, limit.scope, limit.max, limit.windowMs)) {
    return json({ error: "too_many_requests", message: "Too many requests. Please wait a moment and try again." }, 429);
  }
  return null;
}

/** Customer-safe errors pass through; upstream detail is logged server-side and never shown. */
export function failure(e: unknown): Response {
  unstable_rethrow(e);
  if (e instanceof CheckoutError) return json({ error: e.code, message: e.message }, e.status);
  if (e instanceof CartError && e.status < 500) return json({ error: e.code, message: e.message }, e.status);
  const detail = e instanceof PaystackError || e instanceof OrdersError ? `${e.name} ${e.status}: ${e.message}` : e instanceof Error ? e.message : String(e);
  console.error("[checkout]", detail);
  return json({ error: "checkout_unavailable", message: "We could not process your order right now. Please try again." }, 502);
}
