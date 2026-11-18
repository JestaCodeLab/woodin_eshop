import { Suspense } from "react";
import { FeaturedLooks } from "@/components/home/FeaturedLooks";
import { Hero } from "@/components/home/Hero";
import { FabricsSection, NewInSection, ShopTheLookSection } from "@/components/home/HomeSections";
import { ServicesRow } from "@/components/home/ServicesRow";
import { WearWoodin } from "@/components/home/WearWoodin";
import { WorldCarousel } from "@/components/home/WorldCarousel";
import { SERVICES, WEAR_WOODIN_TILES, WORLD_CARDS } from "@/data/home";

/** Reserves space while a live section loads, so the page does not jump. */
const Reserve = ({ h }: { h: string }) => <div aria-hidden="true" className={h} />;

export default function HomePage() {
  return (
    <main>
      <Hero />
      <WorldCarousel cards={WORLD_CARDS} />
      <FeaturedLooks />
      <Suspense fallback={<Reserve h="h-[640px]" />}>
        <NewInSection />
      </Suspense>
      <Suspense fallback={<Reserve h="h-[760px] bg-sand" />}>
        <ShopTheLookSection />
      </Suspense>
      <Suspense fallback={<Reserve h="h-[560px] bg-brown" />}>
        <FabricsSection />
      </Suspense>
      <ServicesRow services={SERVICES} />
      <WearWoodin tiles={WEAR_WOODIN_TILES} />
    </main>
  );
}
