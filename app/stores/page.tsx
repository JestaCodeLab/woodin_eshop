import type { Metadata } from "next";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { StoreLocator } from "@/components/stores/StoreLocator";
import { Button } from "@/components/ui/Button";
import { IMG } from "@/lib/images";
import { getStores } from "@/lib/stores";

export const metadata: Metadata = {
  title: "Find a store",
  description: "Find a Woodin store near you, see opening hours and collect your online order in store.",
};

export default async function StoresPage({ searchParams }: PageProps<"/stores">) {
  const sp = await searchParams;
  const initial = typeof sp.store === "string" ? sp.store : undefined;
  return (
    <>
      <Header />
      <main>
        <StoreLocator stores={getStores()} initialId={initial} />

        <section className="relative flex min-h-[420px] items-center justify-center overflow-hidden bg-espresso">
          <Image src={IMG.menSunset} alt="" fill sizes="100vw" className="object-cover" style={{ objectPosition: "50% 35%" }} />
          <div aria-hidden="true" className="absolute inset-0 bg-[rgba(26,18,14,0.45)]" />
          <div className="relative flex flex-col items-center gap-[18px] px-4 py-16 text-center text-ivory">
            <h2 className="m-0 font-display text-[clamp(34px,5vw,54px)] font-normal leading-[1.05]">
              Order online, <span className="italic">collect in store</span>
            </h2>
            <p className="m-0 text-base font-light">Free click &amp; collect at every Woodin store. Ready in [X] hours.</p>
            <Button href="/shop" variant="ivory" className="px-[34px] py-[18px]">
              Start shopping
            </Button>
          </div>
        </section>
      </main>
    </>
  );
}
