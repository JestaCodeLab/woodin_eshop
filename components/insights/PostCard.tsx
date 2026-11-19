import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import type { PostCardData } from "@/lib/journal";

/** Journal grid card: image, topic and date, title, standfirst. */
export function PostCard({ post, priority }: { post: PostCardData; priority?: boolean }) {
  const href = `/insights/${post.slug}`;
  return (
    <article className="group flex flex-col gap-3.5 text-ink">
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        {/* The title link below is the accessible one; this image link is a pointer convenience. */}
        <Link href={href} tabIndex={-1} aria-hidden="true" className="absolute inset-0 block">
          {post.image ? (
            <CoverImage
              src={post.image.card}
              alt=""
              pos="50% 30%"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              priority={priority}
              className="transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
          ) : null}
        </Link>
      </div>
      <span className="label-caps text-[11px] text-gold">{[post.topic, post.dateLabel].filter(Boolean).join(" · ")}</span>
      <h3 className="m-0 font-display text-[24px] font-normal leading-[1.2] md:text-[26px]">
        <Link href={href} className="text-ink no-underline hover:text-brown">
          {post.title}
        </Link>
      </h3>
      {post.dek ? <p className="m-0 text-[17px] font-light leading-[1.65] text-body">{post.dek}</p> : null}
    </article>
  );
}
