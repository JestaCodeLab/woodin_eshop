import { CoverImage } from "@/components/ui/CoverImage";
import { INSTAGRAM_URL } from "@/lib/social";

export function WearWoodin({ tiles }: { tiles: { img: string; pos: string }[] }) {
  return (
    <section className="content-wrap py-16 md:py-[100px]">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <h2 className="m-0 font-display text-[clamp(36px,5vw,58px)] font-normal italic leading-none">
          #WearWoodin
        </h2>
        {INSTAGRAM_URL ? (
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="label-caps py-3 text-ink">
            Follow on Instagram
          </a>
        ) : null}
      </div>
      <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t, i) => (
          <li key={i} className="relative h-[200px] overflow-hidden md:h-[240px]">
            <CoverImage src={t.img} alt="#WearWoodin post" pos={t.pos} sizes="(min-width: 1024px) 16vw, 50vw" />
          </li>
        ))}
      </ul>
    </section>
  );
}
