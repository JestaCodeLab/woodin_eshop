import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import type { InsightTeaser } from "@/data/home";

export function InsightsTeaser({ posts }: { posts: InsightTeaser[] }) {
  return (
    <section className="content-wrap pb-14 pt-16 md:pb-[90px] md:pt-[110px]">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <h2 className="m-0 font-display text-[clamp(36px,5vw,58px)] font-normal leading-none">Insights</h2>
        <Link href="/insights" className="label-caps py-3 text-ink">
          All stories
        </Link>
      </div>
      <div className="grid gap-10 md:grid-cols-3 md:gap-7">
        {posts.map((post) => (
          <Link key={post.title} href={post.href} className="flex flex-col gap-3.5 text-ink no-underline">
            <span className="relative block h-[260px] overflow-hidden md:h-[300px]">
              <CoverImage src={post.img} alt="" pos={post.pos} sizes="(min-width: 768px) 33vw, 100vw" />
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold">
              {post.tag} · {post.date}
            </span>
            <span className="font-display text-[22px] leading-[1.2] md:text-[25px]">{post.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
