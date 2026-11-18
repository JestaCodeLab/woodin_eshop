const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

/** Decodes the HTML entities WordPress puts in titles (&#8220; &amp; …). */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** Strips tags and collapses whitespace. For excerpts and plain-text descriptions only. */
export function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/** "GH₵ 450" for cedis, Intl formatting for anything else WooCommerce reports. */
export function formatMoney(amount: number, currency: string): string {
  if (currency === "GHS") {
    const n = Number.isInteger(amount) ? amount.toLocaleString("en-GH") : amount.toLocaleString("en-GH", { minimumFractionDigits: 2 });
    return `GH₵ ${n}`;
  }
  return new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(amount);
}
