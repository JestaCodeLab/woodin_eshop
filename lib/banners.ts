import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { getStoreUrl } from "./woocommerce";

/**
 * Shop-page banners (two slides each for Men, Women and Fabrics), managed in WordPress under
 * "Shop banners" (wordpress/woodin-shop-banners.php) and read from /wp-json/woodin/v1/banners.
 * Read-only. Anything missing or malformed just means no banner: a failure never breaks the shop page.
 */

export type BannerSection = "men" | "women" | "fabrics";

/** A site path ("/shop?cat=men") or an https URL. Anything else (javascript:, //host, http:) is dropped. */
const safeHref = z
  .string()
  .trim()
  .max(300)
  .transform((v) => (/^\/(?![/\\])/.test(v) || /^https:\/\//i.test(v) ? v : ""));

const bannerSchema = z.object({
  id: z.number(),
  section: z.enum(["men", "women", "fabrics"]),
  heading: z.string().trim().min(1).max(120),
  badge: z.string().trim().max(60).default(""),
  eyebrow: z.string().trim().max(60).default(""),
  text: z.string().trim().max(240).default(""),
  ctaLabel: z.string().trim().max(60).default(""),
  ctaUrl: safeHref.default(""),
  linkLabel: z.string().trim().max(60).default(""),
  linkUrl: safeHref.default(""),
  image: z.object({
    url: z.string().url(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    alt: z.string().default(""),
  }),
});

export type ShopBanner = z.infer<typeof bannerSchema>;

/** Cached: every published banner. Tag `banners`. */
async function fetchBannersRaw(): Promise<unknown[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  cacheTag("banners");

  const root = getStoreUrl();
  // The pretty URL first; `?rest_route=` works on sites where /wp-json/ routing is off.
  for (const url of [`${root}/wp-json/woodin/v1/banners`, `${root}/?rest_route=/woodin/v1/banners`]) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "woodin-storefront" }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data)) return data;
    } catch {
      // try the next form
    }
  }
  return [];
}

/** The (up to two) banner slides for a shop section. Empty when none are set up. */
export async function getShopBanners(section: BannerSection): Promise<ShopBanner[]> {
  const raw = await fetchBannersRaw();
  // next/image only optimises images from the store's own /wp-content/uploads/ (see next.config.ts).
  const host = new URL(getStoreUrl()).host;
  const out: ShopBanner[] = [];
  for (const item of raw) {
    const parsed = bannerSchema.safeParse(item);
    if (!parsed.success || parsed.data.section !== section) continue;
    const img = new URL(parsed.data.image.url);
    if (img.host !== host || !img.pathname.startsWith("/wp-content/uploads/")) continue;
    out.push(parsed.data);
  }
  return out.slice(0, 2);
}
