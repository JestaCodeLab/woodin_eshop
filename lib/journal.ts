import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { decodeEntities, sanitizePostHtml, stripTags } from "./journal-html";
import { clip } from "./site";
import { getStoreUrl, WooError } from "./woocommerce";

/**
 * "Insights": the journal. Posts are read from the WordPress REST API on the same site as the
 * catalogue (WC_STORE_URL). Read-only; nothing here writes. The WordPress "Uncategorized" category
 * (id 1, holds the default "Hello world!" post) is never shown.
 *
 * Layering rule (see lib/woocommerce.ts): cached functions only fetch; the public getters are not
 * cached and combine them.
 */

const UNCATEGORIZED = 1;
/** Page 1 shows one featured story plus a grid of GRID_SIZE; later pages show GRID_SIZE. */
export const GRID_SIZE = 9;
const FIRST_PAGE = GRID_SIZE + 1;

export interface Topic {
  id: number;
  slug: string;
  name: string;
}

export interface PostImage {
  /** Around 768px wide: cards. */
  card: string;
  /** Around 1536px wide: the featured story and the article header. */
  wide: string;
  width: number;
  height: number;
  alt: string;
}

export interface PostCardData {
  id: number;
  slug: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  dateLabel: string;
  dek: string;
  topic: string | null;
  image: PostImage | null;
  readMins: number;
}

export interface PostDetail extends PostCardData {
  html: string;
  topicSlug: string | null;
}

interface WPTerm {
  id: number;
  slug: string;
  name: string;
  taxonomy: string;
}
interface WPMedia {
  source_url: string;
  alt_text?: string;
  media_details?: { width?: number; height?: number; sizes?: Record<string, { source_url: string; width: number; height: number }> };
}
interface WPPost {
  id: number;
  slug: string;
  date: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  _embedded?: { "wp:featuredmedia"?: WPMedia[]; "wp:term"?: WPTerm[][] };
}

const FIELDS = "id,slug,date,title,excerpt,content,categories,featured_media,_embedded,_links";

async function wp<T>(path: string, query: Record<string, string | number | undefined>): Promise<{ data: T; total: number }> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const url = `${getStoreUrl()}/wp-json/wp/v2${path}?${qs}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "woodin-storefront" }, signal: AbortSignal.timeout(30_000) });
  } catch {
    throw new WooError(502, `Could not reach ${new URL(url).host}`);
  }
  if (!res.ok) throw new WooError(res.status, `${new URL(url).host} responded ${res.status}`);
  return { data: (await res.json()) as T, total: Number(res.headers.get("x-wp-total") ?? 0) };
}

/** Cached: topics that have at least one post. */
async function fetchTopicsRaw(): Promise<Topic[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  cacheTag("journal");
  const { data } = await wp<Topic[]>("/categories", { per_page: 100, hide_empty: "true", exclude: UNCATEGORIZED, orderby: "count", order: "desc", _fields: "id,slug,name" });
  return data.map((c) => ({ id: c.id, slug: c.slug, name: decodeEntities(c.name) }));
}

/** Cached: one raw page of posts (newest first). `topicId` 0 means all topics. */
async function fetchPostsRaw(topicId: number, offset: number, perPage: number) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  cacheTag("journal");
  const { data, total } = await wp<WPPost[]>("/posts", {
    per_page: perPage,
    offset,
    categories: topicId || undefined,
    categories_exclude: topicId ? undefined : UNCATEGORIZED,
    orderby: "date",
    order: "desc",
    _embed: "wp:featuredmedia,wp:term",
    _fields: FIELDS,
  });
  return { data, total };
}

/** Cached: one raw post by slug. */
async function fetchPostRaw(slug: string): Promise<WPPost | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 86400 });
  cacheTag("journal", `post:${slug}`);
  const { data } = await wp<WPPost[]>("/posts", { slug, _embed: "wp:featuredmedia,wp:term", _fields: FIELDS });
  return data[0] ?? null;
}

// ---------------------------------------------------------------------------

function dateLabel(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function imageOf(p: WPPost): PostImage | null {
  const m = p._embedded?.["wp:featuredmedia"]?.[0];
  if (!m?.source_url) return null;
  const sz = m.media_details?.sizes ?? {};
  const wide = sz["1536x1536"] ?? sz["large"];
  const card = sz["medium_large"] ?? sz["large"];
  return {
    card: card?.source_url ?? m.source_url,
    wide: wide?.source_url ?? m.source_url,
    width: wide?.width ?? m.media_details?.width ?? 1536,
    height: wide?.height ?? m.media_details?.height ?? 878,
    alt: decodeEntities(m.alt_text ?? ""),
  };
}

function topicOf(p: WPPost): WPTerm | null {
  const cats = (p._embedded?.["wp:term"] ?? []).flat().filter((t) => t.taxonomy === "category" && t.id !== UNCATEGORIZED);
  return cats[0] ?? null;
}

function dekOf(p: WPPost, cleanHtml: string): string {
  const fromExcerpt = stripTags(p.excerpt.rendered).replace(/\s*\[(?:…|\.\.\.)\]\s*$/, "");
  if (fromExcerpt.length >= 30 && !/elementor|\{|\}/i.test(fromExcerpt)) return clip(fromExcerpt, 170);
  const firstPara = [...cleanHtml.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => stripTags(m[1])).find((t) => t.length >= 40);
  return firstPara ? clip(firstPara, 170) : "";
}

function toCard(p: WPPost): PostDetail {
  const html = sanitizePostHtml(p.content.rendered, getStoreUrl());
  const words = stripTags(html).split(/\s+/).filter(Boolean).length;
  const topic = topicOf(p);
  return {
    id: p.id,
    slug: p.slug,
    title: decodeEntities(stripTags(p.title.rendered)),
    date: p.date.slice(0, 10),
    dateLabel: dateLabel(p.date),
    dek: dekOf(p, html),
    topic: topic ? decodeEntities(topic.name) : null,
    topicSlug: topic?.slug ?? null,
    image: imageOf(p),
    readMins: Math.max(1, Math.round(words / 200)),
    html,
  };
}

/** Card data only: the article body is dropped so it never travels to the client in a list. */
const toListItem = ({ html: _html, topicSlug: _t, ...card }: PostDetail): PostCardData => card;

export const getTopics = (): Promise<Topic[]> => fetchTopicsRaw();

export interface PostsPage {
  /** The lead story: page 1 only. */
  featured: PostCardData | null;
  items: PostCardData[];
  total: number;
  totalPages: number;
  page: number;
}

export async function getPosts({ topic, page = 1 }: { topic?: string; page?: number }): Promise<PostsPage> {
  const topics = await getTopics();
  const match = topic ? topics.find((t) => t.slug === topic) : undefined;
  const p = Math.max(1, Math.floor(page));
  // An unknown topic is an empty list, not "all posts".
  if (topic && !match) return { featured: null, items: [], total: 0, totalPages: 0, page: p };

  const perPage = p === 1 ? FIRST_PAGE : GRID_SIZE;
  const offset = p === 1 ? 0 : FIRST_PAGE + (p - 2) * GRID_SIZE;
  const { data, total } = await fetchPostsRaw(match?.id ?? 0, offset, perPage);
  const cards = data.map((d) => toListItem(toCard(d)));
  const featured = p === 1 ? (cards[0] ?? null) : null;
  const items = p === 1 ? cards.slice(1) : cards;

  return {
    featured,
    items,
    total,
    totalPages: total <= FIRST_PAGE ? (total ? 1 : 0) : 1 + Math.ceil((total - FIRST_PAGE) / GRID_SIZE),
    page: p,
  };
}

export async function getPost(slug: string): Promise<PostDetail | null> {
  const raw = await fetchPostRaw(slug);
  return raw ? toCard(raw) : null;
}

/** Latest posts other than `slug`, for "More from Insights". */
export async function getMorePosts(slug: string, limit = 3): Promise<PostCardData[]> {
  const { data } = await fetchPostsRaw(0, 0, limit + 1);
  return data
    .filter((d) => d.slug !== slug)
    .slice(0, limit)
    .map((d) => toListItem(toCard(d)));
}

/** Every post for the sitemap (slug and date only). */
export async function getAllPostSlugs(): Promise<{ slug: string; date: string }[]> {
  const { data } = await fetchPostsRaw(0, 0, 100);
  return data.map((d) => ({ slug: d.slug, date: d.date.slice(0, 10) }));
}
