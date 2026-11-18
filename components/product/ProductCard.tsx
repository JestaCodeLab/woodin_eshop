import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import { PRICE_PLACEHOLDER } from "@/lib/placeholder";
import type { ProductCardData } from "@/lib/types";
import { WishlistButton } from "./WishlistButton";

interface ProductCardProps {
  product: ProductCardData;
  /** Tailwind aspect class for the image box. 4:5 (the design's 7:10 felt too tall). */
  aspect?: string;
  sizes?: string;
  priority?: boolean;
}

export function ProductCard({
  product,
  aspect = "aspect-[4/5]",
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority,
}: ProductCardProps) {
  const href = `/product/${product.slug}`;
  const { title, cat, badge, swatches } = product;

  return (
    <article className="group flex flex-col gap-3 text-ink">
      <div className={`relative overflow-hidden bg-sand ${aspect}`}>
        {/* The text link below is the accessible one; this image link is a pointer convenience. */}
        <Link href={href} tabIndex={-1} aria-hidden="true" className="absolute inset-0 block">
          <CoverImage
            src={product.image}
            alt=""
            pos={product.pos}
            sizes={sizes}
            priority={priority}
            className="transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </Link>
        {badge ? (
          <span className="absolute left-3 top-3 bg-ivory px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em]">
            {badge}
          </span>
        ) : null}
        <WishlistButton title={title} />
      </div>

      <Link href={href} className="flex flex-col gap-1 text-ink no-underline">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">{cat}</span>
        <span className="font-display text-[18px] leading-[1.2] md:text-[21px]">{title}</span>
        <span className="text-[15px]">{product.price ?? PRICE_PLACEHOLDER}</span>
      </Link>

      {swatches.length > 0 ? (
        <div role="img" aria-label={`Available in ${swatches.length} colours`} className="flex gap-1.5">
          {swatches.map((hex) => (
            <span
              key={hex}
              className="h-3.5 w-3.5 rounded-full border border-line-strong"
              style={{ background: hex }}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
