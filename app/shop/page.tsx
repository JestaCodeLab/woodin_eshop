import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { ProductCard } from "@/components/product/ProductCard";
import { AppliedFilters } from "@/components/shop/AppliedFilters";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { SortSelect } from "@/components/shop/SortSelect";
import { Pagination } from "@/components/ui/Pagination";
import { SORTS, filterShop, getSectionProducts, parseShopParams, sectionLabel, shopQuery } from "@/lib/catalogue";
import { SHOP_SECTIONS } from "@/lib/links";
import { toCardData } from "@/lib/normalize";
import { getCategories } from "@/lib/woocommerce";

export const metadata: Metadata = {
  title: "Shop",
  description: "Shop Woodin ready-to-wear and wax-print fabrics. Pay with Mobile Money or card.",
};

function ShopSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading products" className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 lg:grid-cols-3">
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="aspect-[7/10] animate-pulse bg-sand" />
          <div className="h-4 w-2/3 animate-pulse bg-sand" />
          <div className="h-4 w-1/3 animate-pulse bg-sand" />
        </div>
      ))}
    </div>
  );
}

async function ShopContent({ searchParams }: { searchParams: PageProps<"/shop">["searchParams"] }) {
  const params = parseShopParams(await searchParams);
  const [all, categories] = await Promise.all([getSectionProducts(params.cat), getCategories()]);
  const result = filterShop(all, params);

  const sectionCounts = Object.fromEntries(
    SHOP_SECTIONS.map((s) => [s.wcSlug, categories.find((c) => c.slug === s.wcSlug)?.count ?? 0]),
  );
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
              <p className="m-0 text-[15px] font-light text-body">Try removing a filter or searching for something else.</p>
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
            <div className="content-wrap py-14">
              <ShopSkeleton />
            </div>
          }
        >
          <ShopContent searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}
