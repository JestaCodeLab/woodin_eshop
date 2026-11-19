import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import type { PostCardData } from "@/lib/journal";

/** The lead story at the top of page 1: a large image beside the headline. */
export function FeaturedPost({ post }: { post: PostCardData }) {
  const href = `/insights/${post.slug}`;
  return (
    <article className="group flex flex-wrap items-center gap-x-12 gap-y-6 lg:flex-nowrap">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand lg:aspect-[10/7] lg:flex-[1.4_1_0%]">
        <Link href={href} tabIndex={-1} aria-hidden="true" className="absolute inset-0 block">
          {post.image ? (
            <CoverImage src={post.image.wide} alt="" pos="50% 30%" sizes="(min-width: 1024px) 58vw, 100vw" priority />
          ) : null}
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 basis-[360px] flex-col gap-[18px]">
        <span className="label-caps text-gold">{["Featured", post.topic, post.dateLabel].filter(Boolean).join(" · ")}</span>
        <h2 className="m-0 font-display text-[clamp(30px,4vw,50px)] font-normal leading-[1.05]">
          <Link href={href} className="text-ink no-underline hover:text-brown">
            {post.title}
          </Link>
        </h2>
        {post.dek ? <p className="m-0 text-[19px] font-light leading-[1.7] text-body">{post.dek}</p> : null}
        <Link href={href} className="label-caps self-start py-2 text-ink underline underline-offset-[6px] hover:text-brown">
          Read the story · {post.readMins} min
        </Link>
      </div>
    </article>
  );
}
