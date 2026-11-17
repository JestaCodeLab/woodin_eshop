import { FabricsBand } from "@/components/home/FabricsBand";
import { FeaturedLooks } from "@/components/home/FeaturedLooks";
import { Hero } from "@/components/home/Hero";
import { InsightsTeaser } from "@/components/home/InsightsTeaser";
import { NewIn } from "@/components/home/NewIn";
import { ServicesRow } from "@/components/home/ServicesRow";
import { ShopTheLook } from "@/components/home/ShopTheLook";
import { WearWoodin } from "@/components/home/WearWoodin";
import { WorldCarousel } from "@/components/home/WorldCarousel";
import {
  FABRIC_PRINTS,
  INSIGHT_TEASERS,
  NEW_IN,
  SERVICES,
  SHOP_THE_LOOK,
  WEAR_WOODIN_TILES,
  WORLD_CARDS,
} from "@/data/home";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <WorldCarousel cards={WORLD_CARDS} />
      <FeaturedLooks />
      <NewIn products={NEW_IN} />
      <ShopTheLook items={SHOP_THE_LOOK} />
      <FabricsBand prints={FABRIC_PRINTS} />
      <InsightsTeaser posts={INSIGHT_TEASERS} />
      <ServicesRow services={SERVICES} />
      <WearWoodin tiles={WEAR_WOODIN_TILES} />
    </main>
  );
}
