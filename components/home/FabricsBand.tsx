import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CoverImage } from "@/components/ui/CoverImage";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { shopHref } from "@/lib/links";

export interface FabricTile {
  name: string;
  href: string;
  image: string;
}

/** Brown band introducing fabrics: three real fabric products from the catalogue. */
export function FabricsBand({ fabrics }: { fabrics: FabricTile[] }) {
  return (
    <section className="bg-brown text-ivory">
      <div className="content-wrap flex flex-wrap items-center gap-10 py-16 md:gap-14 md:py-[100px]">
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-5">
          <Eyebrow tone="light">Fabrics</Eyebrow>
          <h2 className="m-0 font-display text-[clamp(36px,5vw,56px)] font-normal leading-none">
            The print is the <span className="italic">story</span>.
          </h2>
          <p className="m-0 text-[19px] font-light leading-[1.7] text-[#e9ded0]">
            Shop Woodin prints by the piece and have them tailored your way. Every print online, with stock
            checked at your nearest store.
          </p>
          <Button href={shopHref("fabrics")} variant="outline-light" className="self-start">
            Shop fabrics
          </Button>
        </div>

        <ul className="m-0 grid min-w-0 flex-[1.4_1_520px] list-none grid-cols-3 gap-3 p-0">
          {fabrics.map((f) => (
            <li key={f.href}>
              <Link href={f.href} className="flex flex-col gap-2.5 text-ivory no-underline">
                <span className="relative block h-[200px] overflow-hidden md:h-[300px]">
                  <CoverImage src={f.image} alt={`${f.name} print`} sizes="(min-width: 1024px) 20vw, 30vw" />
                </span>
                <span className="font-display text-[15px] leading-tight md:text-lg">{f.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
