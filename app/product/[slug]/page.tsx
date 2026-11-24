import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { BackLink } from "@/components/product/BackLink";
import { InfoBlocks } from "@/components/product/InfoBlocks";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGallery } from "@/components/product/ProductGallery";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { Accordion, type AccordionItem } from "@/components/ui/Accordion";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { JsonLd } from "@/components/seo/JsonLd";
import { freeDeliveryThreshold } from "@/lib/config";
import { sizeOptionsFor } from "@/lib/demo-stock";
import { shopHref, type ShopSectionKey } from "@/lib/links";
import { toCardData } from "@/lib/normalize";
import { safely } from "@/lib/safely";
import { SITE_NAME, absoluteUrl, clip } from "@/lib/site";
import type { Product } from "@/lib/types";
import { getProduct, getRelatedProducts } from "@/lib/woocommerce";

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await safely(() => getProduct(slug));
  if (!product) return { title: "Product not found", robots: { index: false } };

  const description = clip(
    `${product.title}, ${product.categoryLabel}. ${product.shortDescription || "Woodin wax-print ready-to-wear and fabrics. Pay with Mobile Money or card, collect free in store."}`,
  );
  const canonical = `/product/${product.slug}`;
  const images = product.images[0] ? [{ url: product.images[0].src, alt: product.images[0].alt }] : undefined;
  return {
    title: product.title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_GH", title: `${product.title} · Woodin`, description, url: canonical, images },
    twitter: { card: "summary_large_image", title: `${product.title} · Woodin`, description, images: images?.map((i) => i.url) },
  };
}

function sectionOf(p: Product): ShopSectionKey | null {
  if (p.kind === "fabric") return "fabrics";
  if (p.categoryLabel.startsWith("Women")) return "women";
  if (p.categoryLabel.startsWith("Men")) return "men";
  return null;
}

function panelsFor(p: Product): AccordionItem[] {
  const items: AccordionItem[] = [
    { title: "Description", body: p.description || "[Product description from Woodin: the cut, how to wear it, what makes it special.]" },
    { title: "Fabric & care", body: "[Fabric composition and care instructions.]" },
    { title: "Delivery & returns", body: "Accra delivery in [X] days, other regions in [X] days. Size exchanges in store within 3 business days." },
  ];
  if (p.kind === "rtw") items.push({ title: "Size guide", body: "[Measurements table for XS to XL.]" });
  return items;
}

async function Related({ product }: { product: Product }) {
  const related = await safely(() => getRelatedProducts(product, 4));
  if (!related || related.length === 0) return null;
  return (
    <section className="content-standard pb-24 pt-20 md:pt-[88px]">
      <h2 className="m-0 mb-8 font-display text-[clamp(32px,4vw,44px)] font-normal">You may also like</h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 lg:grid-cols-4">
        {related.map((p) => (
          <ProductCard key={p.id} product={toCardData(p)} />
        ))}
      </div>
    </section>
  );
}

async function ProductContent({ params }: { params: PageProps<"/product/[slug]">["params"] }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const section = sectionOf(product);
  const sizes = sizeOptionsFor(product);

  const url = absoluteUrl(`/product/${product.slug}`);
  const crumbs = [
    { name: "Home", url: absoluteUrl("/") },
    { name: "Shop", url: absoluteUrl("/shop") },
    ...(section ? [{ name: section[0].toUpperCase() + section.slice(1), url: absoluteUrl(shopHref(section)) }] : []),
    { name: product.title, url },
  ];

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            sku: product.sku || undefined,
            url,
            image: product.images.map((i) => i.src),
            description: product.description || product.shortDescription || undefined,
            category: product.categoryLabel,
            brand: { "@type": "Brand", name: SITE_NAME },
            // Prices from the demo layer are placeholders, never published as real offers.
            ...(product.price.amount !== null && !product.price.isDemo
              ? {
                  offers: {
                    "@type": "Offer",
                    url,
                    priceCurrency: product.price.currency,
                    price: product.price.amount.toFixed(2),
                    availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                    itemCondition: "https://schema.org/NewCondition",
                  },
                }
              : null),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
          },
        ]}
      />
      <section className="content-standard pb-12 pt-6 md:pb-20">
        <div className="mb-2">
          <BackLink fallbackHref={section ? shopHref(section) : "/shop"} />
        </div>
        <nav aria-label="Breadcrumb" className="label-caps mb-6 tracking-[0.16em] text-muted">
          <Link href="/" className="text-muted">Home</Link> / <Link href="/shop" className="text-muted">Shop</Link>
          {section ? (
            <>
              {" "}/ <Link href={shopHref(section)} className="text-muted">{section[0].toUpperCase() + section.slice(1)}</Link>
            </>
          ) : null}
        </nav>

        <div className="flex flex-wrap items-start gap-10 lg:gap-16">
          <div className="min-w-0 flex-[999_1_560px]">
            <ProductGallery product={product} />
          </div>

          <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-[26px] lg:sticky lg:top-6">
            <div className="flex flex-col gap-2.5">
              {product.badge ? <Eyebrow className="tracking-[0.22em]">{product.badge}</Eyebrow> : null}
              <h1 className="m-0 font-display text-[clamp(28px,3.4vw,40px)] font-normal leading-[1.05]">{product.title}</h1>
              <span className="text-[13px] text-muted">
                {product.categoryLabel} · Code {product.sku || "[CODE]"}
              </span>
              <span className="mt-1.5 text-2xl font-light">{product.price.formatted}</span>
            </div>

            <PurchasePanel
              productId={product.id}
              title={product.title}
              priceLabel={product.price.formatted}
              inStock={product.inStock}
              sizes={sizes}
              sizesAreDemo
              threshold={freeDeliveryThreshold()}
            />

            <InfoBlocks />
            <div id="size-guide">
              <Accordion items={panelsFor(product)} />
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <Related product={product} />
      </Suspense>
    </>
  );
}

function ProductSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading product" className="content-standard flex flex-wrap gap-10 py-10">
      <div className="aspect-[4/5] min-w-0 flex-[999_1_560px] animate-pulse bg-sand" />
      <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-4">
        <div className="h-12 w-3/4 animate-pulse bg-sand" />
        <div className="h-5 w-1/2 animate-pulse bg-sand" />
        <div className="h-[60px] animate-pulse bg-sand" />
      </div>
    </div>
  );
}

export default function ProductPage(props: PageProps<"/product/[slug]">) {
  return (
    <>
      <Header />
      <main>
        <Suspense fallback={<ProductSkeleton />}>
          <ProductContent params={props.params} />
        </Suspense>
      </main>
    </>
  );
}
