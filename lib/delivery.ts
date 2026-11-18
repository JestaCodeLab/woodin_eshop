import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { ZONES } from "./checkout-config";
import { getShippingMethods, getShippingZones } from "./orders";
import { paymentsEnabled } from "./payments-config";

export interface DeliveryOption {
  /** "store" for click & collect, otherwise "zone-<WooCommerce zone id>" (or a fallback id). */
  id: string;
  name: string;
  short: string;
  /** Shown under the name. Empty when WooCommerce provides none. */
  eta: string;
  /** GH₵. Null = not set yet (simulated checkout shows the [FEE] placeholder). */
  fee: number | null;
  /** The "Free Accra delivery over GH₵ X" rule applies to this option. */
  freeEligible: boolean;
  /** True when the fee is a built-in test value, not read from WooCommerce shipping zones. */
  demo: boolean;
}

interface ZoneInfo {
  id: number;
  name: string;
  order: number;
  flat: number | null;
  pickup: number | null;
}

const num = (v: string | undefined): number | null => (v !== undefined && /^\d+(\.\d+)?$/.test(v.trim()) ? parseFloat(v) : null);

/** Cached raw read of the WooCommerce shipping zones (throws on failure: callers catch it). */
async function fetchZones(): Promise<ZoneInfo[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag("shipping");

  const zones = await getShippingZones();
  const out: ZoneInfo[] = [];
  for (const z of zones) {
    const methods = (await getShippingMethods(z.id)).filter((m) => m.enabled);
    const flat = methods.find((m) => m.method_id === "flat_rate");
    const pickup = methods.find((m) => m.method_id === "local_pickup");
    const free = methods.find((m) => m.method_id === "free_shipping");
    out.push({
      id: z.id,
      name: z.name,
      order: (z as { order?: number }).order ?? 0,
      flat: flat ? num(flat.settings.cost?.value) : free ? 0 : null,
      pickup: pickup ? (num(pickup.settings.cost?.value) ?? 0) : null,
    });
  }
  return out;
}

/** Test-mode fallback used only when payments are on but the zones cannot be read. [CONFIRM] */
const DEMO_FEES: Record<string, number> = { accra: 25, nation: 45, store: 0 };

const slugFor = (z: ZoneInfo) => `zone-${z.id}`;

/**
 * Delivery choices with fees. With payments on they come from the WooCommerce shipping zones:
 *  - every zone with a Flat rate becomes an option (its name and cost),
 *  - any zone with Local pickup adds "Click & collect",
 * so whatever Woodin sets up in WooCommerce > Settings > Shipping appears here (cached 5 min).
 * If the zones cannot be read, flagged demo fees are used (refused with a live Paystack key).
 * With payments off, fees stay null (the [FEE] placeholder in the simulated checkout).
 */
export async function getDeliveryOptions(): Promise<DeliveryOption[]> {
  const fallback = (demo: boolean): DeliveryOption[] =>
    ZONES.map((z) => ({ id: z.id, name: z.name, short: z.short, eta: z.eta, fee: demo ? DEMO_FEES[z.id] : z.fee, freeEligible: z.id === "accra", demo }));

  if (!paymentsEnabled()) return fallback(false);

  // Request time only. Calling WooCommerce while the site is being built would make every deploy
  // depend on the store being reachable (and an error inside a cached function fails the build).
  await connection();

  let zones: ZoneInfo[];
  try {
    zones = await fetchZones();
  } catch (e) {
    console.error("[delivery] could not read WooCommerce shipping zones:", e instanceof Error ? e.message : e);
    return fallback(true);
  }

  const options: DeliveryOption[] = zones
    .filter((z) => z.flat !== null)
    .sort((a, b) => a.order - b.order || a.id - b.id)
    .map((z) => ({ id: slugFor(z), name: z.name, short: z.name, eta: "", fee: z.flat, freeEligible: /accra/i.test(z.name), demo: false }));

  const pickup = zones.find((z) => z.pickup !== null);
  if (pickup) {
    const store = ZONES.find((z) => z.id === "store")!;
    options.push({ id: "store", name: store.name, short: store.short, eta: store.eta, fee: pickup.pickup, freeEligible: false, demo: false });
  }
  return options.length > 0 ? options : fallback(true);
}
