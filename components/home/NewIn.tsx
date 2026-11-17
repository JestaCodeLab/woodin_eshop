import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { ProductCardData } from "@/lib/types";

export function NewIn({ products }: { products: ProductCardData[] }) {
  return (
    <section className="content-wrap pb-16 md:pb-[110px]">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <Eyebrow>Just landed</Eyebrow>
          <h2 className="m-0 font-display text-[clamp(36px,5vw,58px)] font-normal leading-none">New in</h2>
        </div>
        <Link href="/shop" className="label-caps py-3 text-ink">
          Shop all new in
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.slug} product={p} priority={i < 2} />
        ))}
      </div>
    </section>
  );
}
