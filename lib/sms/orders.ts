import "server-only";
import { orderMeta, updateOrder, type WCOrder } from "@/lib/orders";
import { sendSms, toE164 } from "./index";
import { smsText, type SmsEvent } from "./messages";

/**
 * Decides which customer texts an order is due and sends each one at most once.
 * "Already sent" is remembered on the WooCommerce order itself (meta woodin_sms_sent, a JSON list of
 * keys), so editing the order again, webhook retries and double triggers never repeat a text.
 */

const SENT_KEY = "woodin_sms_sent";
const inFlight = new Set<string>(); // same-instance guard against two triggers racing

function readSent(order: WCOrder): string[] {
  try {
    const v = JSON.parse(orderMeta(order, SENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const storeOf = (order: WCOrder) => order.shipping_lines.find((l) => l.method_id === "local_pickup")?.method_title.split(": ")[1];
const isPickup = (order: WCOrder) => order.shipping_lines.some((l) => l.method_id === "local_pickup");

/** Which texts the order's CURRENT state calls for. `only` limits it to certain kinds. */
export function dueEvents(order: WCOrder, only?: SmsEvent["type"][]): { key: string; event: SmsEvent }[] {
  const due: { key: string; event: SmsEvent }[] = [];
  const n = order.number;
  const tracking = orderMeta(order, "woodin_tracking_number")?.trim();
  const pickup = isPickup(order);
  const add = (key: string, event: SmsEvent) => (!only || only.includes(event.type)) && due.push({ key, event });

  if (order.status === "processing" || order.status === "shipped" || order.status === "completed") {
    add("paid", { type: "paid", first: order.billing?.first_name ?? "", order: n, total: Number(order.total).toFixed(2) });
  }
  if (!pickup && order.status === "shipped") {
    add(`shipped:${tracking ?? "-"}`, { type: "shipped", order: n, tracking });
  }
  if (pickup && order.status === "ready-collection") add("ready", { type: "ready", order: n, store: storeOf(order) });
  if (order.status === "completed") add("delivered", { type: "delivered", order: n, pickup });
  // Only paid orders: an unpaid order that WooCommerce cancels on its own should not text the customer.
  if (order.status === "cancelled" && order.date_paid_gmt) add("cancelled", { type: "cancelled", order: n });
  for (const r of order.refunds ?? []) {
    add(`refund:${r.id}`, { type: "refund", order: n, amount: Math.abs(Number(r.total) || 0).toFixed(2) });
  }
  return due;
}

/** Sends whatever is due and not yet sent. Never throws: SMS must not break an order. */
export async function notifyOrder(order: WCOrder, only?: SmsEvent["type"][]): Promise<{ sent: string[]; skipped: string }> {
  const lock = `${order.id}`;
  if (inFlight.has(lock)) return { sent: [], skipped: "in progress" };
  inFlight.add(lock);
  try {
    const phone = toE164(order.billing?.phone);
    if (!phone) return { sent: [], skipped: "no valid phone number" };

    const alreadySent = readSent(order);
    const sent: string[] = [];
    for (const { key, event } of dueEvents(order, only)) {
      if (alreadySent.includes(key)) continue;
      const r = await sendSms({ to: phone, name: order.billing?.first_name || undefined, text: smsText(event) });
      if (r.ok) sent.push(key);
      else console.error(`[sms] ${key} for order ${order.number} not sent (${r.provider}: ${r.detail ?? "failed"})`);
    }

    if (sent.length > 0) {
      const existing = order.meta_data.find((m) => m.key === SENT_KEY);
      await updateOrder(order.id, {
        meta_data: [{ ...(existing?.id ? { id: existing.id } : null), key: SENT_KEY, value: JSON.stringify([...alreadySent, ...sent]) }],
      });
    }
    return { sent, skipped: "" };
  } catch (e) {
    console.error("[sms] notifyOrder failed:", e instanceof Error ? e.message : e);
    return { sent: [], skipped: "error" };
  } finally {
    inFlight.delete(lock);
  }
}
