import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CoverImage } from "@/components/ui/CoverImage";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { IMG } from "@/lib/images";
import { shopHref } from "@/lib/links";

interface TileProps {
  href: string;
  img: string;
  alt: string;
  pos: string;
  eyebrow: string;
  title: string;
  cta: string;
  /** feature = tall gold-button tile, wide/small = underlined "Shop now". */
  kind: "feature" | "wide" | "small";
  className?: string;
  sizes: string;
}

function LookTile({ href, img, alt, pos, eyebrow, title, cta, kind, className = "", sizes }: TileProps) {
  const feature = kind === "feature";
  return (
    <Link
      href={href}
      className={`group relative flex flex-col items-start justify-end overflow-hidden bg-espresso text-white no-underline ${
        feature ? "p-6 md:p-14" : kind === "wide" ? "p-6 md:p-10" : "p-6 md:p-8"
      } ${className}`}
    >
      <CoverImage
        src={img}
        alt={alt}
        pos={pos}
        sizes={sizes}
        className="transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
      <span
        aria-hidden="true"
        className={`absolute inset-0 ${
          feature
            ? "bg-[linear-gradient(0deg,rgba(26,18,14,0.66)_0%,rgba(26,18,14,0)_42%)]"
            : "bg-[linear-gradient(0deg,rgba(26,18,14,0.6)_0%,rgba(26,18,14,0)_50%)]"
        }`}
      />
      <span
        className={`relative font-medium uppercase text-[#e9c77f] ${
          feature ? "text-[13px] tracking-[0.32em]" : "text-xs tracking-[0.3em]"
        }`}
      >
        {eyebrow}
      </span>
      <span
        className={`relative mt-2.5 font-display leading-none ${
          feature
            ? "text-[clamp(44px,6vw,72px)]"
            : kind === "wide"
              ? "text-[clamp(34px,3.6vw,44px)]"
              : "text-[clamp(28px,2.6vw,34px)] leading-[1.05]"
        }`}
      >
        {title}
      </span>
      {feature ? (
        <span className="relative mt-[26px] bg-gold-btn px-7 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-ink">
          {cta}
        </span>
      ) : (
        <span className="relative mt-4 border-b border-white pb-[5px] text-[13px] uppercase tracking-[0.16em]">
          {cta}
        </span>
      )}
    </Link>
  );
}

/** Full-width (8px gutters) editorial grid: one tall tile, one wide, two small. */
export function FeaturedLooks() {
  return (
    <section aria-label="Featured looks" className="pb-16 md:pb-28">
      <div className="content-wrap flex flex-wrap items-end justify-between gap-5 pb-9">
        <div className="flex flex-col gap-2.5">
          <Eyebrow className="tracking-[0.28em]">Our styles</Eyebrow>
          <h2 className="m-0 font-display text-[clamp(36px,5vw,58px)] font-normal leading-none">Featured looks</h2>
        </div>
        <Button href={shopHref()} variant="outline">
          View more
        </Button>
      </div>

      <div className="grid gap-2 px-2 lg:grid-cols-2">
        <LookTile
          kind="feature"
          href={shopHref()}
          img={IMG.womanBoxyShirt}
          alt="Woman in a yellow and red patchwork boxy shirt with a black fringe skirt"
          pos="50% 30%"
          eyebrow="Ready to wear"
          title="Bold Fusion"
          cta="Discover more"
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="h-[520px] md:h-[720px] lg:h-[900px]"
        />
        <div className="flex flex-col gap-2">
          <LookTile
            kind="wide"
            href={shopHref("men")}
            img={IMG.menHeritage}
            alt="Three men in heritage print shirts against a sky gradient"
            pos="50% 28%"
            eyebrow="Men"
            title="Heritage"
            cta="Shop now"
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="h-[380px] md:h-[446px]"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <LookTile
              kind="small"
              href={shopHref("men")}
              img={IMG.menPatchworkHat}
              alt="Two men in terracotta and green patchwork shirts, one in a straw hat"
              pos="50% 30%"
              eyebrow="Shirts"
              title="The weekend shirt"
              cta="Shop now"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="h-[380px] md:h-[446px]"
            />
            <LookTile
              kind="small"
              href={shopHref("women")}
              img={IMG.womanShorts}
              alt="Woman in a white tee and yellow patchwork paperbag shorts"
              pos="50% 30%"
              eyebrow="Women"
              title="Elegance"
              cta="Shop now"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="h-[380px] md:h-[446px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
