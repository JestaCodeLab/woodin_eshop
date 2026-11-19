import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getOrder, orderMeta, type WCOrder } from "./orders";

/**
 * Customer-facing order tracking. Orders live in WooCommerce; shop managers update them by hand
 * (status + the "Woodin tracking" number). Shipped parcels go by Ghana Post.
 *
 * WooCommerce statuses used: pending, on-hold, processing, shipped*, ready-collection*, completed,
 * cancelled, failed, refunded.   (* = added by wordpress/woodin-order-tracking.php)
 */

export interface TrackingStep {
  key: string;
  label: string;
  state: "done" | "current" | "todo";
}

export interface TrackingView {
  orderNumber: string;
  placedAt: string | null;
  statusLabel: string;
  statusNote: string;
  steps: TrackingStep[];
  pickup: boolean;
  delivery: string;
  items: { name: string; quantity: number }[];
  total: string;
  currency: string;
  refunded: string | null;
  cancelled: boolean;
  tracking: { carrier: string; number: string; url: string | null } | null;
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a.trim().toLowerCase());
  const y = Buffer.from(b.trim().toLowerCase());
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Tracking link template with {number}, e.g. from Ghana Post. Unset = show the number only. */
function trackingUrl(number: string): string | null {
  const tpl = process.env.TRACKING_URL_TEMPLATE?.trim();
  if (!tpl || !/^https:\/\//.test(tpl)) return null;
  return tpl.replace("{number}", encodeURIComponent(number));
}

/** Exported for tests. */
export function buildTrackingView(order: WCOrder): TrackingView {
  const pickup = order.shipping_lines.some((l) => l.method_id === "local_pickup");
  const number = orderMeta(order, "woodin_tracking_number")?.trim() || null;
  const status = order.status;
  const cancelled = status === "cancelled" || status === "failed";
  const refundedTotal = (order.refunds ?? []).reduce((n, r) => n + Math.abs(Number(r.total) || 0), 0);

  // How many steps are finished; the next one is "current". Strictly follows the WooCommerce status:
  // pending -> placed | on-hold -> placed (under review) | processing -> placed + paid |
  // shipped / ready-collection -> + processing | completed / refunded -> everything.
  let done = 1;
  if (status === "processing") done = 2;
  else if (status === "shipped" || status === "ready-collection") done = 3;
  else if (status === "completed" || status === "refunded") done = 5;

  const labels = pickup
    ? ["Order placed", "Payment received", "Order processing", "Ready for collection", "Collected"]
    : ["Order placed", "Payment received", "Order processing", "Shipped", "Delivered"];
  const steps: TrackingStep[] = labels.map((label, i) => ({
    key: ["placed", "paid", "processing", "dispatch", "final"][i],
    label,
    state: i < done ? "done" : i === done ? "current" : "todo",
  }));

  const notes: Record<string, [string, string]> = {
    pending: ["Awaiting payment", "We have not received your payment yet."],
    "on-hold": ["Being reviewed", "We are checking your order and will be in touch shortly."],
    processing: ["Order processing", pickup ? "We are getting your order ready for collection." : "We are packing your order for dispatch."],
    shipped: ["On its way", "Your parcel has been handed to Ghana Post."],
    "ready-collection": ["Ready for collection", "Your order is ready. Bring your order number when you collect."],
    completed: [pickup ? "Collected" : "Delivered", pickup ? "Thank you for collecting your order." : "Your order has been delivered. Thank you for shopping with Woodin."],
    cancelled: ["Cancelled", "This order was cancelled."],
    failed: ["Payment failed", "The payment for this order did not go through."],
    refunded: ["Refunded", "This order has been refunded."],
  };
  const [statusLabel, statusNote] = notes[status] ?? ["In progress", "We are working on your order."];

  return {
    orderNumber: order.number,
    placedAt: order.date_created_gmt ? `${order.date_created_gmt}Z` : null,
    statusLabel,
    statusNote,
    steps: cancelled ? [] : steps,
    pickup,
    delivery: order.shipping_lines[0]?.method_title ?? "",
    items: (order.line_items ?? []).map((i) => ({ name: i.name, quantity: i.quantity })),
    total: order.total,
    currency: order.currency,
    refunded: refundedTotal > 0 ? refundedTotal.toFixed(2) : null,
    cancelled,
    tracking: number && !pickup ? { carrier: "Ghana Post", number, url: trackingUrl(number) } : null,
  };
}

/**
 * Looks an order up by number AND billing email. A wrong number, a wrong email and a non-eshop
 * order all return null, so the answer reveals nothing about which orders exist.
 */
export async function trackOrder(orderNumber: string, email: string): Promise<TrackingView | null> {
  if (!/^\d{1,10}$/.test(orderNumber.trim())) return null;
  const order = await getOrder(Number(orderNumber)).catch(() => null);
  if (!order || orderMeta(order, "woodin_eshop") !== "1") return null;
  if (!order.billing?.email || !same(order.billing.email, email)) return null;
  return buildTrackingView(order);
}
