import { FabricsBand } from "@/components/home/FabricsBand";
import { NewIn } from "@/components/home/NewIn";
import { ShopTheLook } from "@/components/home/ShopTheLook";
import { SHOP_THE_LOOK_IDS } from "@/data/home";
import { toCardData } from "@/lib/normalize";
import { safely } from "@/lib/safely";
import { getProductById, getProducts } from "@/lib/woocommerce";

/**
 * Data-driven Home sections. Each one is independent: if the store is unreachable the
 * section renders nothing and the rest of the page still loads.
 */

export async function NewInSection() {
  const page = await safely(() => getProducts({ category: "ready-to-wear", perPage: 4 }));
  if (!page || page.items.length === 0) return null;
  return <NewIn products={page.items.map(toCardData)} />;
}

export async function ShopTheLookSection() {
  const found = await safely(() => Promise.all(SHOP_THE_LOOK_IDS.map((id) => getProductById(id))));
  const items = (found ?? []).filter((p) => p !== null).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    category: p.categoryLabel,
    image: p.images[0]?.thumb ?? "",
    price: p.price.amount,
    priceLabel: p.price.formatted,
  }));
  if (items.length === 0) return null;
  return <ShopTheLook items={items} />;
}

export async function FabricsSection() {
  const page = await safely(() => getProducts({ category: "fabrics", perPage: 3 }));
  if (!page || page.items.length === 0) return null;
  return (
    <FabricsBand
      fabrics={page.items.map((p) => ({ name: p.title, href: `/product/${p.slug}`, image: p.images[0]?.card ?? "" }))}
    />
  );
}
