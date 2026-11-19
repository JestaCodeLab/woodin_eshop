import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { ProductCard } from "@/components/product/ProductCard";
import { AppliedFilters } from "@/components/shop/AppliedFilters";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { SortSelect } from "@/components/shop/SortSelect";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { Pagination } from "@/components/ui/Pagination";
import { SORTS, filterShop, getSectionProducts, parseShopParams, sectionLabel, shopQuery } from "@/lib/catalogue";
import { SHOP_SECTIONS } from "@/lib/links";
import { SITE_NAME } from "@/lib/site";
import { toCardData } from "@/lib/normalize";
import { getCategories } from "@/lib/woocommerce";

const SECTION_SEO = {
  men: { title: "Men's wear", description: "Shop Woodin men's wear: wax-print shirts, polos and tees. Pay with MTN MoMo, Telecel Cash, AT Money or card." },
  women: { title: "Women's wear", description: "Shop Woodin women's wear: wax-print dresses, tops, trousers and skirts. Pay with MoMo or card, collect free in store." },
  fabrics: { title: "Wax-print fabrics", description: "Shop Woodin wax-print fabrics by the piece. Choose your print online and collect free in a Woodin store." },
} as const;

/**
 * Titles and canonicals per section. Filtered, searched and sorted views are kept out of the index
 * (they are near-duplicates of the section page); plain pagination stays indexable.
 */
export async function generateMetadata({ searchParams }: PageProps<"/shop">): Promise<Metadata> {
  const p = parseShopParams(await searchParams);
  const seo = p.cat ? SECTION_SEO[p.cat as keyof typeof SECTION_SEO] : undefined;
  const title = seo?.title ?? "Shop all";
  const description = seo?.description ?? "Shop all Woodin wax-print ready-to-wear and fabrics. Pay with MTN MoMo, Telecel Cash, AT Money or card.";
  const filtered = Boolean(p.q || p.type || p.min !== undefined || p.max !== undefined || p.stock || p.sort !== "featured");
  const canonical = `/shop${shopQuery(p, { type: undefined, q: undefined, min: undefined, max: undefined, stock: undefined, sort: undefined })}`;

  return {
    title: p.page > 1 ? `${title} (page ${p.page})` : title,
    description,
    alternates: { canonical },
    // Setting openGraph replaces the inherited block, so repeat site name, locale and the share image.
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_GH",
      title: `${title} · Woodin`,
      description,
      url: canonical,
      images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "Woodin: wax-print ready-to-wear and fabrics" }],
    },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

async function ShopContent({ searchParams }: { searchParams: PageProps<"/shop">["searchParams"] }) {
  const params = parseShopParams(await searchParams);
  const [all, categories, men, women] = await Promise.all([
    getSectionProducts(params.cat),
    getCategories(),
    getSectionProducts("men"),
    getSectionProducts("women"),
  ]);
  const result = filterShop(all, params);

  // Men / Women counts come from the audience-filtered lists so they match what is listed.
  const sectionCounts: Record<string, number> = Object.fromEntries(
    SHOP_SECTIONS.map((s) => [s.wcSlug, categories.find((c) => c.slug === s.wcSlug)?.count ?? 0]),
  );
  sectionCounts["mens-wear"] = men.length;
  sectionCounts["ladies-wear"] = women.length;
  const allCount = SHOP_SECTIONS.filter((s) => s.key !== "men" && s.key !== "women").reduce(
    (n, s) => n + (sectionCounts[s.wcSlug] ?? 0),
    categories.find((c) => c.slug === "ready-to-wear")?.count ?? 0,
  );

  const filtersProps = { params, types: result.types, sectionCounts, allCount };
  const href = (patch: Parameters<typeof shopQuery>[1]) => `/shop${shopQuery(params, patch)}`;

  return (
    <>
      <section className="content-wrap flex flex-wrap items-end justify-between gap-5 pb-7 pt-10 md:pt-14">
        <div className="flex flex-col gap-3">
          <nav aria-label="Breadcrumb" className="label-caps text-muted tracking-[0.16em]">
            <Link href="/" className="text-muted">Home</Link> / {params.cat ? <><Link href="/shop" className="text-muted">Shop</Link> / {sectionLabel(params.cat)}</> : "Shop"}
          </nav>
          <h1 className="m-0 font-display text-[clamp(44px,7vw,84px)] font-normal leading-[0.95] text-brown">
            {sectionLabel(params.cat)}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          <span className="text-muted">
            {result.total} {result.total === 1 ? "piece" : "pieces"}
          </span>
          <SortSelect
            value={params.sort}
            options={SORTS.map((s) => ({ ...s, href: href({ sort: s.value, page: 1 }) }))}
          />
        </div>
      </section>

      <section className="content-wrap flex flex-wrap items-start gap-x-10 gap-y-6 pb-20">
        <aside aria-label="Filters" className="w-full lg:w-[250px] lg:flex-none">
          <details className="lg:hidden [&[open]>summary]:mb-4">
            <summary className="label-caps flex h-12 cursor-pointer list-none items-center justify-between border border-line-strong bg-white px-4 tracking-[0.18em]">
              Filters <span aria-hidden="true">+</span>
            </summary>
            <ShopFilters {...filtersProps} idPrefix="m" />
          </details>
          <div className="hidden lg:block">
            <ShopFilters {...filtersProps} idPrefix="d" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
          <AppliedFilters params={params} types={result.types} />
          {result.items.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 lg:grid-cols-3 min-[1700px]:grid-cols-4">
                {result.items.map((p, i) => (
                  <ProductCard key={p.id} product={toCardData(p)} sizes="(min-width: 1024px) 28vw, 50vw" priority={i < 3} />
                ))}
              </div>
              <Pagination page={result.page} totalPages={result.totalPages} hrefFor={(n) => href({ page: n })} />
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <span className="font-display text-[30px]">No pieces match</span>
              <p className="m-0 text-[19px] font-light text-body">Try removing a filter or searching for something else.</p>
              <Link href={`/shop${params.cat ? `?cat=${params.cat}` : ""}`} className="label-caps border border-brown px-7 py-4 text-brown no-underline">
                Clear all filters
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function ShopPage(props: PageProps<"/shop">) {
  return (
    <>
      <Header />
      <main>
        <Suspense
          fallback={
            <div className="content-wrap">
              <LogoLoader label="Loading products" className="min-h-[70vh]" />
            </div>
          }
        >
          <ShopContent searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}
