import type { Metadata } from "next";
import { Suspense } from "react";
import { CartView } from "@/components/cart/CartView";
import { Header } from "@/components/layout/Header";
import { ProductCard } from "@/components/product/ProductCard";
import { freeDeliveryThreshold } from "@/lib/config";
import { toCardData } from "@/lib/normalize";
import { safely } from "@/lib/safely";
import { getProducts } from "@/lib/woocommerce";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };

async function PairsWith() {
  const page = await safely(() => getProducts({ category: "accessories", perPage: 4 }));
  if (!page || page.items.length === 0) return null;
  return (
    <section className="bg-sand">
      <div className="content-wrap pb-20 pt-16 md:pt-20">
        <h2 className="m-0 mb-[30px] font-display text-[clamp(32px,4vw,44px)] font-normal">Pairs well with</h2>
        <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 lg:grid-cols-4">
          {page.items.map((p) => (
            <ProductCard key={p.id} product={toCardData(p)} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function CartPage() {
  return (
    <>
      <Header />
      <main>
        <CartView threshold={freeDeliveryThreshold()} />
        <Suspense fallback={null}>
          <PairsWith />
        </Suspense>
      </main>
    </>
  );
}
