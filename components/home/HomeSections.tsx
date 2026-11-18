import { FabricsBand } from "@/components/home/FabricsBand";
import { NewIn } from "@/components/home/NewIn";
import { NewInTabs, type NewInTab } from "@/components/home/NewInTabs";
import { ShopTheLook } from "@/components/home/ShopTheLook";
import { SHOP_THE_LOOK_IDS } from "@/data/home";
import { shopHref } from "@/lib/links";
import { toCardData } from "@/lib/normalize";
import { safely } from "@/lib/safely";
import { getProductById, getProducts } from "@/lib/woocommerce";

/**
 * Data-driven Home sections. Each one is independent: if the store is unreachable the
 * section renders nothing and the rest of the page still loads.
 */

export async function NewInSection() {
  const [fabrics, rtw] = await Promise.all([
    safely(() => getProducts({ category: "fabrics", perPage: 4 })),
    safely(() => getProducts({ category: "ready-to-wear", perPage: 4 })),
  ]);
  // Fabrics is the default (first) tab. If one list fails to load, show the other alone.
  const tabs = [
    fabrics?.items.length && {
      id: "fabrics",
      label: "Fabrics",
      products: fabrics.items.map(toCardData),
    },
    rtw?.items.length && {
      id: "rtw",
      label: "Ready to wear",
      products: rtw.items.map(toCardData),
    },
  ].filter((t): t is NewInTab => !!t);
  if (tabs.length === 0) return null;
  return <NewInTabs tabs={tabs} />;
}

/** Women's wear, without repeating the pieces already shown in "New in" above it. */
export async function WomenSection() {
  const [newIn, women] = await Promise.all([
    safely(() => getProducts({ category: "ready-to-wear", perPage: 4 })),
    safely(() => getProducts({ category: "ladies-wear", perPage: 16 })),
  ]);
  if (!women) return null;
  const shown = new Set((newIn?.items ?? []).map((p) => p.id));
  const items = women.items.filter((p) => !shown.has(p.id)).slice(0, 8);
  if (items.length === 0) return null;
  return (
    <NewIn
      products={items.map(toCardData)}
      eyebrow="Women"
      heading="Women's wear"
      linkLabel="Shop women"
      linkHref={shopHref("women")}
      eager={false}
    />
  );
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
