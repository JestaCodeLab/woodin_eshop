import Link from "next/link";
import { shopQuery, type ShopParams, type TypeFacet } from "@/lib/catalogue";

/** Removable chips for the active filters, plus "Clear all". */
export function AppliedFilters({ params, types }: { params: ShopParams; types: TypeFacet[] }) {
  const chips: { label: string; href: string }[] = [];
  const without = (patch: Partial<Record<keyof ShopParams, undefined>>) => `/shop${shopQuery(params, { ...patch, page: 1 })}`;

  if (params.type) chips.push({ label: types.find((t) => t.slug === params.type)?.label ?? params.type, href: without({ type: undefined }) });
  if (params.q) chips.push({ label: `“${params.q}”`, href: without({ q: undefined }) });
  if (params.min !== undefined) chips.push({ label: `From GH₵ ${params.min}`, href: without({ min: undefined }) });
  if (params.max !== undefined) chips.push({ label: `Up to GH₵ ${params.max}`, href: without({ max: undefined }) });
  if (params.stock) chips.push({ label: "In stock", href: without({ stock: undefined }) });

  if (chips.length === 0) return <div className="min-h-11" aria-hidden="true" />;

  const clearAll = `/shop${shopQuery({ ...params, type: undefined, q: undefined, min: undefined, max: undefined, stock: undefined, page: 1 })}`;
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-2">
      {chips.map((c) => (
        <Link key={c.label} href={c.href} aria-label={`Remove filter ${c.label}`} className="flex h-10 items-center border border-brown bg-white px-3.5 text-[15px] text-brown no-underline">
          {c.label} <span aria-hidden="true" className="ml-2">✕</span>
        </Link>
      ))}
      <Link href={clearAll} className="flex h-11 items-center px-2 text-[15px] text-ink underline">
        Clear all
      </Link>
    </div>
  );
}
