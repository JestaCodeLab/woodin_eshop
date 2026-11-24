import "server-only";
import type { WCOrder } from "./orders";
import { buildTrackingView, type TrackingView } from "./tracking";

export interface AccountOrder {
  view: TrackingView;
  /** Raw WooCommerce status, used for the chip colour. */
  status: string;
  /** Up to two product photos (only ones served by the catalogue site, which next/image is allowed to load). */
  thumbs: string[];
  itemCount: number;
}

/** next/image only loads hosts listed in next.config.ts, so accept only the catalogue site's uploads. */
function safeImage(src: string | undefined): string | null {
  try {
    if (!src || !process.env.WC_STORE_URL) return null;
    const u = new URL(src);
    return u.hostname === new URL(process.env.WC_STORE_URL).hostname && u.pathname.startsWith("/wp-content/uploads/") ? u.toString() : null;
  } catch {
    return null;
  }
}

export function toAccountOrder(o: WCOrder): AccountOrder {
  const lines = o.line_items ?? [];
  return {
    view: buildTrackingView(o),
    status: o.status,
    thumbs: lines.flatMap((l) => safeImage(l.image?.src ?? undefined) ?? []).slice(0, 2),
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
  };
}

export const isOnTheWay = (status: string) => status === "shipped" || status === "ready-collection";
