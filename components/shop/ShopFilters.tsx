import Link from "next/link";
import { SORTS, shopQuery, type ShopParams, type TypeFacet } from "@/lib/catalogue";
import { SHOP_SECTIONS } from "@/lib/links";

interface Props {
  params: ShopParams;
  types: TypeFacet[];
  /** Product counts per section from the WooCommerce category tree. */
  sectionCounts: Record<string, number>;
  allCount: number;
  /** Unique prefix so the filter panel can be rendered twice (desktop + mobile) without duplicate ids. */
  idPrefix: string;
}

const heading = "label-caps tracking-[0.2em]";
const block = "flex flex-col gap-2.5 border-b border-line py-5";

/** Filter panel: plain links and a GET form, so it works without JavaScript. */
export function ShopFilters({ params, types, sectionCounts, allCount, idPrefix }: Props) {
  const link = (active: boolean) =>
    `flex min-h-8 items-center justify-between gap-3 text-[15px] no-underline ${active ? "font-medium text-brown" : "font-light text-ink"}`;

  return (
    <div className="flex flex-col border-t border-line">
      <div className={block}>
        <span id={`${idPrefix}-sec`} className={heading}>
          Shop
        </span>
        <ul aria-labelledby={`${idPrefix}-sec`} className="m-0 flex list-none flex-col p-0">
          <li>
            <Link href="/shop" aria-current={!params.cat ? "true" : undefined} className={link(!params.cat)}>
              All <span className="text-xs text-muted">{allCount}</span>
            </Link>
          </li>
          {SHOP_SECTIONS.map((s) => (
            <li key={s.key}>
              <Link
                href={`/shop${shopQuery({ ...params, cat: s.key }, { type: undefined, page: 1 })}`}
                aria-current={params.cat === s.key ? "true" : undefined}
                className={link(params.cat === s.key)}
              >
                {s.label} <span className="text-xs text-muted">{sectionCounts[s.wcSlug] ?? ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {types.length > 1 ? (
        <div className={block}>
          <span id={`${idPrefix}-type`} className={heading}>
            Type
          </span>
          <ul aria-labelledby={`${idPrefix}-type`} className="m-0 flex max-h-72 list-none flex-col overflow-y-auto p-0">
            {types.map((t) => {
              const active = params.type === t.slug;
              return (
                <li key={t.slug}>
                  <Link
                    href={`/shop${shopQuery(params, { type: active ? undefined : t.slug, page: 1 })}`}
                    aria-current={active ? "true" : undefined}
                    className={link(active)}
                  >
                    {t.label} <span className="text-xs text-muted">{t.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <form action="/shop" method="get" className="flex flex-col">
        {params.cat ? <input type="hidden" name="cat" value={params.cat} /> : null}
        {params.type ? <input type="hidden" name="type" value={params.type} /> : null}
        {params.sort !== "featured" ? <input type="hidden" name="sort" value={params.sort} /> : null}

        <div className={block}>
          <label htmlFor={`${idPrefix}-search`} className={heading}>
            Search
          </label>
          <input
            id={`${idPrefix}-search`}
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Name or code"
            className="h-11 border border-line-strong bg-white px-2.5 text-sm"
          />
        </div>

        <fieldset className={`${block} m-0 min-w-0 p-0 pb-5 pt-5`}>
          <legend className={`${heading} mb-2.5 p-0`}>Price (GH₵)</legend>
          <div className="flex items-center gap-2">
            <label htmlFor={`${idPrefix}-min`} className="sr-only">
              Minimum price
            </label>
            <input id={`${idPrefix}-min`} type="number" name="min" min={0} inputMode="numeric" defaultValue={params.min ?? ""} placeholder="Min" className="h-11 w-full min-w-0 border border-line-strong bg-white px-2.5 text-sm" />
            <span aria-hidden="true">–</span>
            <label htmlFor={`${idPrefix}-max`} className="sr-only">
              Maximum price
            </label>
            <input id={`${idPrefix}-max`} type="number" name="max" min={0} inputMode="numeric" defaultValue={params.max ?? ""} placeholder="Max" className="h-11 w-full min-w-0 border border-line-strong bg-white px-2.5 text-sm" />
          </div>
        </fieldset>

        <div className={block}>
          <span className={heading}>Availability</span>
          <label className="flex min-h-8 items-center gap-3 text-[15px] font-light">
            <input type="checkbox" name="stock" value="1" defaultChecked={params.stock === "1"} className="h-[18px] w-[18px] accent-brown" />
            In stock online
          </label>
        </div>

        <button type="submit" className="label-caps mt-5 h-12 border border-brown bg-transparent tracking-[0.18em] text-brown transition-colors hover:bg-brown hover:text-ivory">
          Apply filters
        </button>
      </form>
    </div>
  );
}

export { SORTS };
