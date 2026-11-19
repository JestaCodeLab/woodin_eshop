import "server-only";
import { SITE_URL } from "@/lib/site";

/**
 * Customer SMS templates. Kept to plain GSM characters (no ₵, no curly quotes, no dashes) so each
 * stays within one 160-character SMS where possible. Amounts are written "GHS 215.00".
 */
export type SmsEvent =
  | { type: "paid"; first: string; order: string; total: string }
  | { type: "shipped"; order: string; tracking?: string }
  | { type: "ready"; order: string; store?: string }
  | { type: "delivered"; order: string; pickup: boolean }
  | { type: "refund"; order: string; amount: string };

const clean = (s: string) => s.replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, " ").trim();

export function smsText(e: SmsEvent): string {
  switch (e.type) {
    case "paid":
      return `Woodin: Thank you ${clean(e.first) || "for your order"}! We received your payment of GHS ${e.total} for order #${e.order}. We will text you when it ships. ${SITE_URL}/track`;
    case "shipped":
      return `Woodin: Order #${e.order} is on its way with Ghana Post.${e.tracking ? ` Tracking no: ${clean(e.tracking)}.` : ""} Track: ${SITE_URL}/track?order=${e.order}`;
    case "ready":
      return `Woodin: Order #${e.order} is ready for collection${e.store ? ` at ${clean(e.store)}` : ""}. Please bring your order number.`;
    case "delivered":
      return `Woodin: Order #${e.order} has been ${e.pickup ? "collected" : "delivered"}. Thank you for shopping with Woodin!`;
    case "refund":
      return `Woodin: A refund of GHS ${e.amount} for order #${e.order} has been processed. Contact us if you have any questions.`;
  }
}
