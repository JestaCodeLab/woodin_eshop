import type { MetadataRoute } from "next";
import { getSectionProducts } from "@/lib/catalogue";
import { getAllPostSlugs } from "@/lib/journal";
import { shopHref } from "@/lib/links";
import { safely } from "@/lib/safely";
import { absoluteUrl } from "@/lib/site";

/**
 * Home, shop sections, the store locator and every product. If the store is unreachable the
 * sitemap still lists the static pages rather than failing. Cart, checkout and the API are left out.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/shop"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl(shopHref("men")), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl(shopHref("women")), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl(shopHref("fabrics")), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/insights"), changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/stores"), changeFrequency: "monthly", priority: 0.5 },
  ];

  const products = (await safely(() => getSectionProducts())) ?? [];
  const posts = (await safely(() => getAllPostSlugs())) ?? [];
  return [
    ...pages,
    ...posts.map((p) => ({
      url: absoluteUrl(`/insights/${p.slug}`),
      lastModified: p.date,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...products.map((p) => ({
      url: absoluteUrl(`/product/${p.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
