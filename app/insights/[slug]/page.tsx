import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostCard } from "@/components/insights/PostCard";
import { Header } from "@/components/layout/Header";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { getMorePosts, getPost } from "@/lib/journal";
import { safely } from "@/lib/safely";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await safely(() => getPost(slug));
  if (!post) return { title: "Story not found", robots: { index: false } };

  const canonical = `/insights/${post.slug}`;
  const images = post.image ? [{ url: post.image.wide, width: post.image.width, height: post.image.height, alt: post.title }] : undefined;
  return {
    title: post.title,
    description: post.dek || undefined,
    alternates: { canonical },
    openGraph: { type: "article", siteName: SITE_NAME, locale: "en_GH", title: `${post.title} · Woodin`, description: post.dek || undefined, url: canonical, publishedTime: post.date, images },
    twitter: { card: "summary_large_image", title: `${post.title} · Woodin`, description: post.dek || undefined, images: images?.map((i) => i.url) },
  };
}

async function More({ slug }: { slug: string }) {
  const more = await safely(() => getMorePosts(slug, 3));
  if (!more || more.length === 0) return null;
  return (
    <section className="content-wrap border-t border-line pb-20 pt-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h2 className="m-0 font-display text-[clamp(28px,3.6vw,40px)] font-normal leading-[1.1]">More from Insights</h2>
        <Link href="/insights" className="label-caps text-ink underline underline-offset-[6px] hover:text-brown">
          All stories
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {more.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </section>
  );
}

async function ArticleContent({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          datePublished: post.date,
          description: post.dek || undefined,
          image: post.image ? [post.image.wide] : undefined,
          mainEntityOfPage: absoluteUrl(`/insights/${post.slug}`),
          publisher: { "@id": absoluteUrl("/#organization") },
        }}
      />
      <article>
        <header className="content-wrap mx-auto flex max-w-[860px] flex-col items-center gap-5 pb-10 pt-12 text-center md:pt-[72px]">
          <Link href="/insights" className="label-caps text-muted no-underline hover:text-brown">
            ← Insights
          </Link>
          <Eyebrow>{[post.topic, post.dateLabel, `${post.readMins} min read`].filter(Boolean).join(" · ")}</Eyebrow>
          <h1 className="m-0 font-display text-[clamp(32px,5vw,56px)] font-normal leading-[1.08] text-brown">{post.title}</h1>
          {post.dek ? <p className="m-0 max-w-[640px] text-[19px] font-light leading-[1.7] text-body">{post.dek}</p> : null}
        </header>

        {post.image ? (
          <div className="content-wrap mx-auto max-w-[1200px]">
            <Image
              src={post.image.wide}
              alt={post.image.alt}
              width={post.image.width}
              height={post.image.height}
              sizes="(min-width: 1280px) 1200px, 100vw"
              priority
              className="h-auto max-h-[640px] w-full bg-sand object-cover"
              style={{ objectPosition: "50% 30%" }}
            />
          </div>
        ) : null}

        <div className="content-wrap mx-auto max-w-[760px] py-12 md:py-16">
          {/* post.html is rebuilt from an allowlist in lib/journal-html.ts; it never contains raw WordPress markup. */}
          <div className="journal-body" dangerouslySetInnerHTML={{ __html: post.html }} />
        </div>
      </article>

      <section className="bg-sand">
        <div className="content-wrap flex flex-wrap items-center justify-between gap-6 py-12">
          <p className="m-0 font-display text-[clamp(24px,3vw,34px)] leading-[1.1]">
            Wear the story <span className="italic">in Woodin</span>
          </p>
          <Button href="/shop" variant="outline-brown" className="px-[34px] py-[18px]">
            Shop the collection
          </Button>
        </div>
      </section>

      <Suspense fallback={null}>
        <More slug={post.slug} />
      </Suspense>
    </>
  );
}

export default function ArticlePage(props: { params: Params }) {
  return (
    <>
      <Header />
      <main>
        <Suspense
          fallback={
            <div className="content-wrap">
              <LogoLoader label="Loading story" className="min-h-[70vh]" />
            </div>
          }
        >
          <ArticleContent params={props.params} />
        </Suspense>
      </main>
    </>
  );
}
