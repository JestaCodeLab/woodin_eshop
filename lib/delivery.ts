import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { ZONES, type ZoneId } from "./checkout-config";
import { getShippingMethods, getShippingZones } from "./orders";
import { paymentsEnabled } from "./payments-config";

export interface DeliveryOption {
  id: ZoneId;
  name: string;
  short: string;
  eta: string;
  /** GH₵. Null = not set yet (simulated checkout shows the [FEE] placeholder). */
  fee: number | null;
  /** True when the fee is a built-in test value, not read from WooCommerce shipping zones. */
  demo: boolean;
}

/** Test-mode fallbacks used only when payments are on but WooCommerce has no matching zone. [CONFIRM] */
const DEMO_FEES: Record<ZoneId, number> = { accra: 25, nation: 45, store: 0 };

const num = (v: string | undefined): number | null => (v !== undefined && /^\d+(\.\d+)?$/.test(v.trim()) ? parseFloat(v) : null);

/** Cached raw read of WooCommerce shipping zones, reduced to the fee per delivery option. */
async function fetchZoneFees(): Promise<Partial<Record<ZoneId, number>>> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  cacheTag("shipping");

  const zones = await getShippingZones();
  const fees: Partial<Record<ZoneId, number>> = {};
  for (const z of zones) {
    const methods = (await getShippingMethods(z.id)).filter((m) => m.enabled);
    const flat = methods.find((m) => m.method_id === "flat_rate");
    const pickup = methods.find((m) => m.method_id === "local_pickup");
    const free = methods.find((m) => m.method_id === "free_shipping");
    const zoneFee = flat ? num(flat.settings.cost?.value) : free ? 0 : null;

    const name = z.name.toLowerCase();
    if (pickup) fees.store = num(pickup.settings.cost?.value) ?? 0;
    if (zoneFee !== null) {
      if (/accra|tema/.test(name)) fees.accra = zoneFee;
      else if (/other|region|nation|rest/.test(name)) fees.nation = zoneFee;
    }
  }
  return fees;
}

/**
 * Delivery choices with fees. With payments on, fees come from the WooCommerce shipping zones
 * ("Accra & Tema", "Other regions", and a Local pickup method). Anything missing falls back to
 * a clearly flagged demo fee. With payments off, fees stay null (the [FEE] placeholder).
 */
export async function getDeliveryOptions(): Promise<DeliveryOption[]> {
  if (!paymentsEnabled()) return ZONES.map((z) => ({ id: z.id, name: z.name, short: z.short, eta: z.eta, fee: z.fee, demo: false }));

  // Request time only. Calling WooCommerce while the site is being built would make every deploy
  // depend on the store being reachable (and an error inside a cached function fails the build).
  await connection();

  let fees: Partial<Record<ZoneId, number>> = {};
  try {
    fees = await fetchZoneFees();
  } catch (e) {
    console.error("[delivery] could not read WooCommerce shipping zones:", e instanceof Error ? e.message : e);
  }
  return ZONES.map((z) => {
    const fee = fees[z.id];
    return { id: z.id, name: z.name, short: z.short, eta: z.eta, fee: fee ?? DEMO_FEES[z.id], demo: fee === undefined };
  });
}
