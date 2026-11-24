import "server-only";
import { z } from "zod";

/**
 * Store locations come from the STORES_JSON environment variable (a JSON array), so Woodin can
 * add, remove and edit stores without a code change. Invalid entries are skipped with a server
 * log; if none are valid the placeholder list below is used so the page still renders.
 *
 * Example (single line in .env.local / Vercel):
 * STORES_JSON=[{"name":"Osu","region":"Greater Accra","address":"Cantonment Road, Osu, Accra","phone":"0503565236","lat":5.557,"lng":-0.182,"hours":[{"label":"Mon – Fri","hours":"8:00am – 7:00pm"},{"label":"Saturday","hours":"8:00am – 7:00pm"}]}]
 */

const text = (max: number) => z.string().trim().min(1).max(max);

const hoursRow = z.object({ label: text(40), hours: text(60) });

export const storeSchema = z.object({
  id: text(60).optional(),
  name: text(120),
  address: text(240),
  /** Used for the region chips, e.g. "Greater Accra", "Ashanti". */
  region: text(80).optional(),
  phone: text(40).optional(),
  /** GhanaPostGPS digital address, e.g. "GA-123-4567". */
  gps: text(30).optional(),
  /** What Google Maps should search for (e.g. "Woodin Boutique - Osu, Oxford St, Accra, Ghana"). Defaults to the address. */
  mapQuery: text(240).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  hours: z.array(hoursRow).max(10).optional(),
  services: z.array(text(80)).max(10).optional(),
  /** Overrides the generated Google Maps link. https only. */
  directionsUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), "must be https")
    .optional(),
});

export interface Store extends Omit<z.infer<typeof storeSchema>, "id"> {
  id: string;
}

const DEFAULT_SERVICES = ["Ready To Wear", "Fabrics by the piece", "Exchanges and returns"];

/** Shown only when STORES_JSON is missing or has no valid store. All values are placeholders. */
const PLACEHOLDER_STORES: Store[] = [
  { id: "store-1", name: "[Store name] — Accra", region: "Greater Accra", address: "[Street address], Accra" },
  { id: "store-2", name: "[Store name] — Kumasi", region: "Ashanti", address: "[Street address], Kumasi" },
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function parseStores(raw: string | undefined): Store[] {
  if (!raw?.trim()) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("[stores] STORES_JSON is not valid JSON:", e instanceof Error ? e.message : e);
    return [];
  }
  if (!Array.isArray(data)) {
    console.error("[stores] STORES_JSON must be a JSON array of stores");
    return [];
  }

  const stores: Store[] = [];
  const used = new Set<string>();
  data.forEach((item, i) => {
    const parsed = storeSchema.safeParse(item);
    if (!parsed.success) {
      console.error(`[stores] STORES_JSON[${i}] skipped:`, parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; "));
      return;
    }
    // A pin needs both coordinates, so drop a lone lat or lng.
    const { lat, lng, id, ...rest } = parsed.data;
    const hasCoords = lat !== undefined && lng !== undefined;
    let sid = slug(id ?? rest.name) || `store-${i + 1}`;
    while (used.has(sid)) sid += "-2";
    used.add(sid);
    stores.push({ ...rest, id: sid, ...(hasCoords ? { lat, lng } : null), services: rest.services ?? DEFAULT_SERVICES });
  });
  return stores;
}

/** All stores for the locator and the checkout pickup list. */
export function getStores(): Store[] {
  const stores = parseStores(process.env.STORES_JSON);
  return stores.length > 0 ? stores : PLACEHOLDER_STORES.map((s) => ({ ...s, services: DEFAULT_SERVICES }));
}
