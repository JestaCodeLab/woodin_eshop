/**
 * Where the eshop sends people for things that live on the main WordPress site.
 * Safe for client and server code (constants only).
 */
export const MAIN_SITE = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://woodinfashion.com";

export const mainUrl = (path: string) => `${MAIN_SITE}${path}`;

export const MAIN_LINKS = {
  home: mainUrl("/"),
} as const;

export const isExternal = (href: string) => /^https?:\/\//.test(href);

/** Shop top-level sections. `cat` values used in /shop?cat=… */
export const SHOP_SECTIONS = [
  { key: "men", label: "Men", wcSlug: "mens-wear" },
  { key: "women", label: "Women", wcSlug: "ladies-wear" },
  { key: "fabrics", label: "Fabrics", wcSlug: "fabrics" },
] as const;

export type ShopSectionKey = (typeof SHOP_SECTIONS)[number]["key"];

export const shopHref = (cat?: ShopSectionKey, extra: Record<string, string> = {}) => {
  const qs = new URLSearchParams({ ...(cat ? { cat } : null), ...extra }).toString();
  return qs ? `/shop?${qs}` : "/shop";
};
