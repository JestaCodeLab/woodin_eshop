import type { Metadata } from "next";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { StoreLocator } from "@/components/stores/StoreLocator";
import { Button } from "@/components/ui/Button";
import { IMG } from "@/lib/images";
import { JsonLd } from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/site";
import { getStores } from "@/lib/stores";

export const metadata: Metadata = {
  title: "Find a store",
  description: "Find a Woodin store near you, see opening hours and collect your online order in store.",
  alternates: { canonical: "/stores" },
};

export default function StoresPage() {
  const stores = getStores();
  // Structured data only for real stores (the placeholder list uses "[Store name]").
  const real = stores.filter((s) => !s.name.includes("["));
  return (
    <>
      {real.length > 0 ? (
        <JsonLd
          data={real.map((s) => ({
            "@context": "https://schema.org",
            "@type": "ClothingStore",
            name: s.name,
            url: absoluteUrl(`/stores?store=${s.id}`),
            image: absoluteUrl("/icon-512.png"),
            telephone: s.phone,
            address: { "@type": "PostalAddress", streetAddress: s.address, addressRegion: s.region, addressCountry: "GH" },
            geo: s.lat !== undefined && s.lng !== undefined ? { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng } : undefined,
            parentOrganization: { "@id": absoluteUrl("/#organization") },
          }))}
        />
      ) : null}
      <Header />
      <main>
        <StoreLocator stores={stores} />

        <section className="relative flex min-h-[420px] items-center justify-center overflow-hidden bg-espresso">
          <Image src={IMG.menSunset} alt="" fill sizes="100vw" className="object-cover" style={{ objectPosition: "50% 35%" }} />
          <div aria-hidden="true" className="absolute inset-0 bg-[rgba(26,18,14,0.45)]" />
          <div className="relative flex flex-col items-center gap-[18px] px-4 py-16 text-center text-ivory">
            <h2 className="m-0 font-display text-[clamp(34px,5vw,54px)] font-normal leading-[1.05]">
              Shop Woodin <span className="italic">online</span>
            </h2>
            <Button href="/shop" variant="ivory" className="px-[34px] py-[18px]">
              Start shopping
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
