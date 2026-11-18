/** Site-wide constants used by metadata, sitemap, robots and structured data. */

/**
 * Canonical origin. Set NEXT_PUBLIC_SITE_URL=https://shop.woodinfashion.com in production.
 * Falls back to Vercel's production URL, then to localhost for local work.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/+$/, "");

export const SITE_NAME = "Woodin";

export const DEFAULT_TITLE = "Woodin Shop | Wax-print ready-to-wear & fabrics";

export const DEFAULT_DESCRIPTION =
  "Shop Woodin wax-print ready-to-wear and fabrics online. Pay with MTN MoMo, Telecel Cash, AT Money or card, and collect free in a Woodin store.";

export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** Trims text to a search-result-friendly length without cutting a word in half. */
export function clip(text: string, max = 158): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}
