import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { ProductCardData } from "@/lib/types";

interface ProductRowProps {
  products: ProductCardData[];
  eyebrow?: string;
  heading?: string;
  linkLabel?: string;
  linkHref?: string;
  /** Preload the first two images (only for the section right under the banner). */
  eager?: boolean;
}

/** A headed row/grid of product cards. Defaults render the "New in" section. */
export function NewIn({
  products,
  eyebrow = "Just landed",
  heading = "New in",
  linkLabel = "Shop all new in",
  linkHref = "/shop",
  eager = true,
}: ProductRowProps) {
  return (
    <section className="content-wrap pb-16 md:pb-[110px]">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="m-0 font-display text-[clamp(36px,5vw,58px)] font-normal leading-none">{heading}</h2>
        </div>
        <Link href={linkHref} className="label-caps py-3 text-ink">
          {linkLabel}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.slug} product={p} priority={eager && i < 2} />
        ))}
      </div>
    </section>
  );
}
