"use client";

import { useRouter } from "next/navigation";

/** Sort dropdown. Each option carries its precomputed URL so the filters stay server-built. */
export function SortSelect({
  value,
  options,
}: {
  value: string;
  options: { value: string; label: string; href: string }[];
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-3.5">
      <label htmlFor="shop-sort" className="label-caps tracking-[0.16em]">
        Sort
      </label>
      <select
        id="shop-sort"
        value={value}
        onChange={(e) => {
          const next = options.find((o) => o.value === e.target.value);
          if (next) router.push(next.href);
        }}
        className="h-11 border border-line-strong bg-white px-3 text-[15px]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
