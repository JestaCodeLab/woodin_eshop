import { ExchangeIcon, StoreIcon, TruckIcon, WalletIcon } from "@/components/ui/icons";

const ICONS = { pay: WalletIcon, delivery: TruckIcon, collect: StoreIcon, exchange: ExchangeIcon };

export function ServicesRow({ services }: { services: readonly { icon: keyof typeof ICONS; title: string; body: string }[] }) {
  return (
    <section aria-label="Services" className="border-y border-line">
      <ul className={`content-wrap m-0 grid list-none gap-7 py-10 sm:grid-cols-2 ${services.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        {services.map((s) => {
          const Icon = ICONS[s.icon];
          return (
            <li key={s.title} className="flex flex-col gap-2">
              <span className="flex items-center gap-3 font-display text-[21px]">
                <Icon size={26} className="shrink-0 text-brown" />
                {s.title}
              </span>
              <span className="text-[17px] font-light leading-[1.6] text-muted">{s.body}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
