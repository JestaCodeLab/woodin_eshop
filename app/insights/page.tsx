import type { Metadata } from "next";
import { Suspense } from "react";
import { FeaturedPost } from "@/components/insights/FeaturedPost";
import { PostCard } from "@/components/insights/PostCard";
import { TopicTabs } from "@/components/insights/TopicTabs";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LogoLoader } from "@/components/ui/LogoLoader";
import { Pagination } from "@/components/ui/Pagination";
import { getPosts, getTopics } from "@/lib/journal";
import { safely } from "@/lib/safely";
import { SITE_NAME } from "@/lib/site";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const parse = (sp: Record<string, string | string[] | undefined>) => ({
  topic: one(sp.topic)?.trim() || undefined,
  page: Math.max(1, Math.floor(Number(one(sp.page))) || 1),
});
const hrefFor = (topic: string | undefined, page: number) => {
  const qs = new URLSearchParams();
  if (topic) qs.set("topic", topic);
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `/insights?${s}` : "/insights";
};

const DESCRIPTION = "Collections, culture and style notes from the Woodin studio, plus news from our stores.";

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { topic, page } = parse(await searchParams);
  const canonical = hrefFor(topic, page);
  return {
    title: page > 1 ? `Insights (page ${page})` : "Insights",
    description: DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_GH",
      title: "Insights · Woodin",
      description: DESCRIPTION,
      url: canonical,
      images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "Woodin: wax-print ready-to-wear and fabrics" }],
    },
  };
}

async function InsightsContent({ searchParams }: { searchParams: SearchParams }) {
  const { topic, page } = parse(await searchParams);
  const [topics, data] = await Promise.all([safely(() => getTopics()), safely(() => getPosts({ topic, page }))]);

  return (
    <>
      <section className="content-wrap flex flex-wrap items-end justify-between gap-6 pb-8 pt-12 md:pt-[72px]">
        <div className="flex flex-col gap-3.5">
          <Eyebrow className="tracking-[0.28em]">The Woodin journal</Eyebrow>
          <h1 className="m-0 font-display text-[clamp(44px,7vw,72px)] font-normal leading-[0.92] text-brown">Insights</h1>
        </div>
        <p className="m-0 max-w-[420px] text-[19px] font-light leading-[1.7] text-body">{DESCRIPTION}</p>
      </section>

      {topics && topics.length > 1 ? <TopicTabs topics={topics} active={topic ?? null} /> : null}

      {!data ? (
        <p className="content-wrap py-20 text-center text-body">The journal is unavailable right now. Please try again in a moment.</p>
      ) : data.items.length === 0 && !data.featured ? (
        <div className="content-wrap flex flex-col items-center gap-5 py-20 text-center">
          <p className="m-0 text-body">No stories here yet.</p>
          <Button href="/insights" variant="outline-brown" className="px-[30px] py-[17px]">
            All stories
          </Button>
        </div>
      ) : (
        <>
          {data.featured ? (
            <section className="content-wrap pb-14 pt-10 md:pt-12">
              <FeaturedPost post={data.featured} />
            </section>
          ) : (
            <div className="pt-10 md:pt-12" />
          )}

          {data.items.length > 0 ? (
            <section className="content-wrap pb-16 md:pb-20">
              <div className="grid grid-cols-1 gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {data.items.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(n) => hrefFor(topic, n)} />
            </section>
          ) : null}
        </>
      )}

      <section className="bg-sand">
        <div className="content-wrap flex flex-wrap items-center justify-between gap-6 py-14 md:py-16">
          <div className="flex flex-col gap-2">
            <Eyebrow>Shop the collection</Eyebrow>
            <p className="m-0 font-display text-[clamp(26px,3.4vw,38px)] leading-[1.1]">
              From the studio <span className="italic">to your wardrobe</span>
            </p>
          </div>
          <Button href="/shop" variant="outline-brown" className="px-[34px] py-[18px]">
            Start shopping
          </Button>
        </div>
      </section>
    </>
  );
}

export default function InsightsPage(props: { searchParams: SearchParams }) {
  return (
    <>
      <Header />
      <main>
        <Suspense
          fallback={
            <div className="content-wrap">
              <LogoLoader label="Loading stories" className="min-h-[70vh]" />
            </div>
          }
        >
          <InsightsContent searchParams={props.searchParams} />
        </Suspense>
      </main>
    </>
  );
}
