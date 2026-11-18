import Link from "next/link";

/** Link-based pagination (URL driven, works without JS). */
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const list = [...pages].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const base = "flex h-11 min-w-11 items-center justify-center border border-line-strong px-3 text-sm no-underline";

  return (
    <nav aria-label="Pagination" className="flex flex-wrap justify-center gap-1.5 pt-10">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={`${base} label-caps tracking-[0.16em]`} rel="prev">
          Prev
        </Link>
      ) : null}
      {list.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && n - list[i - 1] > 1 ? <span aria-hidden="true" className="flex h-11 items-center px-1 text-muted">…</span> : null}
          {n === page ? (
            <span aria-current="page" className="flex h-11 min-w-11 items-center justify-center bg-brown px-3 text-sm text-ivory">
              {n}
            </span>
          ) : (
            <Link href={hrefFor(n)} className={base} aria-label={`Page ${n}`}>
              {n}
            </Link>
          )}
        </span>
      ))}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={`${base} label-caps tracking-[0.16em]`} rel="next">
          Next
        </Link>
      ) : null}
    </nav>
  );
}
