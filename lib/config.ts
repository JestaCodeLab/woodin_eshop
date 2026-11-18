import "server-only";
import { formatMoney } from "./format";

/**
 * Free-delivery threshold in GH₵. Unconfirmed by Woodin: set FREE_DELIVERY_THRESHOLD to demo
 * the progress bar. Unset renders the design's "[X]" placeholder and a disabled bar. [CONFIRM]
 */
export function freeDeliveryThreshold(): number | null {
  const n = Number(process.env.FREE_DELIVERY_THRESHOLD);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function freeDeliveryLabel(): string {
  const t = freeDeliveryThreshold();
  return t === null ? "GH₵ [X]" : formatMoney(t, "GHS");
}
