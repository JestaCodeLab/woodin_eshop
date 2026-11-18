import { CoverImage } from "@/components/ui/CoverImage";
import type { Product } from "@/lib/types";

/**
 * One large image plus two detail tiles, as in the design. The live catalogue has a single
 * photo per product, so with one image the tiles are zoomed crops of it.
 */
export function ProductGallery({ product }: { product: Product }) {
  const [main, second, third] = product.images;
  if (!main) {
    return <div role="img" aria-label="No photo available" className="aspect-[4/5] bg-sand" />;
  }
  const sizes = "(min-width: 1024px) 55vw, 100vw";

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="relative col-span-2 aspect-[4/5] overflow-hidden bg-sand">
        <CoverImage src={main.src} alt={main.alt} pos="50% 20%" sizes={sizes} priority />
      </div>
      <div className="relative aspect-square overflow-hidden bg-sand">
        <CoverImage
          src={(second ?? main).src}
          alt={second ? second.alt : `Close-up of the print on ${product.title}`}
          pos={second ? "50% 30%" : "50% 25%"}
          zoom={second ? undefined : 1.9}
          sizes="(min-width: 1024px) 27vw, 50vw"
        />
      </div>
      <div className="relative aspect-square overflow-hidden bg-sand">
        <CoverImage
          src={(third ?? main).src}
          alt={third ? third.alt : `Detail of ${product.title}`}
          pos={third ? "50% 30%" : "35% 70%"}
          zoom={third ? undefined : 2.3}
          sizes="(min-width: 1024px) 27vw, 50vw"
        />
      </div>
    </div>
  );
}
