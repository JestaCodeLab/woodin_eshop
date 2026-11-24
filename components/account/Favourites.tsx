import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { getSectionProducts } from "@/lib/catalogue";
import { toCardData } from "@/lib/normalize";
import type { ProductCardData } from "@/lib/types";
import { getProductById } from "@/lib/woocommerce";

/** Saved products as card data (newest first). Products that left the catalogue are skipped. */
export async function savedCards(ids: number[], limit: number): Promise<ProductCardData[]> {
  const products = await Promise.all(ids.slice(0, limit).map((id) => getProductById(id).catch(() => null)));
  return products.flatMap((p) => (p ? [toCardData(p)] : []));
}

/** A few pieces to browse when nothing is saved yet. */
export async function suggestionCards(limit = 3): Promise<ProductCardData[]> {
  const all = await getSectionProducts().catch(() => []);
  return all.slice(0, limit).map(toCardData);
}

export function CardGrid({ cards }: { cards: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-5 gap-y-8">
      {cards.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export const EmptyHint = () => (
  <p className="m-0 -mt-2 text-[15px] font-light text-body">
    Tap the <span aria-hidden="true">♡</span> on any piece to save it here. A few pieces to start with:{" "}
    <Link href="/shop" className="text-brown underline">Browse everything</Link>
  </p>
);
