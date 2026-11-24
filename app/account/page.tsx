import Link from "next/link";
import { CardGrid, EmptyHint, savedCards, suggestionCards } from "@/components/account/Favourites";
import { LatestOrder } from "@/components/account/OrderViews";
import { CoverImage } from "@/components/ui/CoverImage";
import { Button } from "@/components/ui/Button";
import { requireSession } from "@/lib/account";
import { toAccountOrder } from "@/lib/account-orders";
import { getAddresses, getCustomer, getFavorites, listOrders } from "@/lib/customers";

const h2 = "m-0 font-display text-[clamp(28px,3vw,36px)] font-normal";

export default async function AccountOverview() {
  const session = await requireSession();
  const [customer, orders, favIds] = await Promise.all([
    getCustomer(session.customerId).catch(() => null),
    listOrders(session.customerId).catch(() => null),
    getFavorites(session.customerId).catch(() => null),
  ]);

  const latest = orders?.[0] ? toAccountOrder(orders[0]) : null;
  const saved = favIds && favIds.length > 0 ? await savedCards(favIds, 3) : [];
  const preview = saved.length > 0 ? saved : await suggestionCards(3);
  const address = customer ? getAddresses(customer).find((a) => a.isDefault) : undefined;

  return (
    <>
      {latest ? (
        <LatestOrder order={latest} />
      ) : orders !== null ? (
        <section aria-label="Start shopping" className="flex flex-wrap border border-line bg-white">
          <div className="relative min-h-[260px] min-w-0 flex-[1_1_280px] overflow-hidden bg-espresso">
            <CoverImage src="/images/women-peplum-blouse-fit-flare-dress.jpg" alt="" pos="50% 22%" sizes="(min-width: 1024px) 30vw, 100vw" />
          </div>
          <div className="flex flex-[1.4_1_380px] flex-col justify-center gap-4 p-8 md:p-11">
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold">Orders</span>
            <span className="font-display text-[clamp(30px,3.4vw,40px)] leading-[1.05]">Your first order starts here</span>
            <span className="text-[15px] font-light leading-relaxed text-body">When you order, you can follow it here from payment to your door.</span>
            <div className="mt-1.5 flex flex-wrap gap-2.5">
              <Button href="/shop?cat=women">Shop women</Button>
              <Button href="/shop?cat=men" variant="outline-brown">Shop men</Button>
              <Button href="/shop?cat=fabrics" variant="outline-brown">Shop fabrics</Button>
            </div>
          </div>
        </section>
      ) : (
        <p className="m-0 text-[15px] text-body">We could not load your orders right now. Please try again in a moment.</p>
      )}

      <section aria-label="Favourites" className="flex flex-col gap-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className={h2}>{saved.length > 0 ? "Your favourites" : "Nothing saved yet"}</h2>
          <Link href={saved.length > 0 ? "/account/favorites" : "/shop"} className="label-caps text-ink underline underline-offset-[6px]">
            {saved.length > 0 ? `View all (${favIds?.length ?? saved.length})` : "Browse new in"}
          </Link>
        </div>
        {saved.length === 0 ? <EmptyHint /> : null}
        <CardGrid cards={preview} />
      </section>

      <section aria-label="Default address" className="flex max-w-[460px] flex-col gap-2.5 border border-line bg-white p-[26px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold">Default address</span>
          <Link href="/account/addresses" className="text-[13px] text-ink underline">{address ? "Edit" : "Add"}</Link>
        </div>
        {address ? (
          <>
            <span className="font-display text-[22px]">{address.label}</span>
            <span className="text-[15px] font-light leading-relaxed text-body">
              {address.name}
              <br />
              {address.address}
              {address.area ? <><br />{address.area}</> : null}
              <br />
              {address.phone}
            </span>
          </>
        ) : (
          <span className="text-[15px] font-light text-body">No address saved yet. Add one and checkout fills it in for you.</span>
        )}
      </section>
    </>
  );
}
