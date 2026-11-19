import Link from "next/link";
import type { Topic } from "@/lib/journal";

/** "All" plus one tab per topic that has posts. Link based, so it works without JS and is indexable. */
export function TopicTabs({ topics, active }: { topics: Topic[]; active: string | null }) {
  const tabs = [{ slug: null as string | null, name: "All" }, ...topics.map((t) => ({ slug: t.slug as string | null, name: t.name }))];
  return (
    <nav aria-label="Topics" className="content-wrap">
      {/* Scrolls sideways on narrow screens rather than wrapping into rows. */}
      <ul className="m-0 flex list-none gap-7 overflow-x-auto border-y border-line p-0">
        {tabs.map((t) => {
          const on = t.slug === active;
          return (
            <li key={t.slug ?? "all"} className="shrink-0">
              <Link
                href={t.slug ? `/insights?topic=${t.slug}` : "/insights"}
                aria-current={on ? "page" : undefined}
                className={`label-caps flex h-14 items-center border-b tracking-[0.18em] no-underline ${on ? "border-brown text-brown" : "border-transparent text-ink hover:text-brown"}`}
              >
                {t.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
