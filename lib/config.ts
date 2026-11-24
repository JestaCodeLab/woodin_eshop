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

/**
 * Click & collect is not launched yet. While this is off, checkout never offers store pickup (the
 * server refuses it too) and no page mentions it. Set CLICK_COLLECT_ENABLED=true when it is ready,
 * then restore the copy that was removed (topbar, footer, product page, bag, home services, stores page).
 */
export function clickCollectEnabled(): boolean {
  return process.env.CLICK_COLLECT_ENABLED === "true";
}
