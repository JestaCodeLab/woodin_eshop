/**
 * Turns WordPress post HTML into markup that is safe to render with dangerouslySetInnerHTML.
 *
 * The imported posts carry Elementor <style> blocks, YouTube embeds and srcsets that point at the old
 * woodinfashion.com host. Nothing is passed through as-is: the output is rebuilt from an allowlist
 * of tags and attributes, and every URL is checked after entity-decoding.
 */

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", ndash: "–", mdash: "—",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", copy: "©", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç",
};

/** Decodes the HTML entities WordPress emits (numeric and the common named ones). */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

export const stripTags = (html: string) => decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

const OLD_HOST = /^https?:\/\/(?:www\.)?woodinfashion\.com\/wp-content\//i;
const NEW_PATH = "/wp-content/";

const esc = (v: string) => v.replace(/&(?!#?\w+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function attrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of raw.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? "";
  return out;
}

/** An http(s) or site-relative URL, or null. Checked on the decoded value so entity tricks cannot slip through. */
function safeUrl(raw: string | undefined, base: string): string | null {
  if (!raw) return null;
  let u = decodeEntities(raw).trim();
  if (OLD_HOST.test(u)) u = `${base}${NEW_PATH}${u.replace(OLD_HOST, "")}`;
  // Site-relative paths must not start with "//" or "/\": browsers read both as a protocol-relative URL to another host.
  return /^(https?:\/\/|\/(?![/\\]))/i.test(u) ? u : null;
}

const YOUTUBE = /^https:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/embed\/[\w-]+/i;
const VOID = new Set(["br", "img"]);
const KEEP = new Set(["p", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "ul", "ol", "li", "blockquote", "a", "figure", "figcaption", "br", "img"]);

/** `base` is the WordPress origin, used to repair links to the old host. */
export function sanitizePostHtml(input: string, base: string): string {
  const src = input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(style|script|noscript|svg|form|object|embed)\b[\s\S]*?<\/\1\s*>/gi, "");

  const out: string[] = [];
  const stack: string[] = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|([^<]+)|</g;
  for (const m of src.matchAll(re)) {
    if (m[4] !== undefined) {
      out.push(m[4]);
      continue;
    }
    if (!m[2]) continue; // stray "<"
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();

    if (tag === "iframe") {
      if (closing) continue;
      const a = attrs(m[3]);
      const s = safeUrl(a.src, base);
      if (s && YOUTUBE.test(s)) {
        const title = esc(decodeEntities(a.title ?? "Video"));
        out.push(`<span class="journal-video"><iframe src="${esc(s)}" title="${title}" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></span>`);
      }
      continue;
    }
    if (!KEEP.has(tag)) continue; // div, span, section …: drop the wrapper, keep what is inside

    if (closing) {
      const at = stack.lastIndexOf(tag);
      if (at === -1) continue;
      while (stack.length > at) out.push(`</${stack.pop()}>`);
      continue;
    }

    const a = attrs(m[3]);
    if (tag === "img") {
      const s = safeUrl(a.src, base);
      // Only images served by our own WordPress: files on other hosts (an old staging site, say) are dead links.
      if (!s || new URL(s, base).origin !== new URL(base).origin) continue;
      const w = /^\d{1,5}$/.test(a.width ?? "") ? ` width="${a.width}"` : "";
      const h = /^\d{1,5}$/.test(a.height ?? "") ? ` height="${a.height}"` : "";
      out.push(`<img src="${esc(s)}" alt="${esc(a.alt ?? "")}"${w}${h} loading="lazy" decoding="async">`);
      continue;
    }
    if (tag === "a") {
      const href = decodeEntities(a.href ?? "").trim();
      const s = safeUrl(a.href, base) ?? (/^mailto:[^\s]+$/i.test(href) ? href : null);
      if (!s) {
        stack.push("a");
        out.push("<a>"); // keep the text, lose the unsafe link
        continue;
      }
      const external = /^https?:\/\//i.test(s);
      out.push(`<a href="${esc(s)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>`);
      stack.push("a");
      continue;
    }
    if (VOID.has(tag)) {
      out.push(`<${tag}>`);
      continue;
    }
    out.push(`<${tag}>`);
    stack.push(tag);
  }
  while (stack.length) out.push(`</${stack.pop()}>`);

  return out
    .join("")
    .replace(/<a>([\s\S]*?)<\/a>/g, "$1")
    .replace(/<(p|h[2-6]|strong|b|em|i|li|blockquote)>(?:\s|&nbsp;|<br>)*<\/\1>/gi, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
