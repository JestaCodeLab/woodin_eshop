import { Heart } from "lucide-react";
import { EmptyState } from "@/components/account/EmptyState";
import { CardGrid, savedCards, suggestionCards } from "@/components/account/Favourites";
import { requireSession } from "@/lib/account";
import { getFavorites } from "@/lib/customers";

export const metadata = { title: "Favourites" };

export default async function FavoritesPage() {
  const session = await requireSession();
  const ids = await getFavorites(session.customerId).catch(() => null);
  const saved = ids && ids.length > 0 ? await savedCards(ids, 48) : [];
  const cards = saved.length > 0 ? saved : await suggestionCards(4);
  return (
    <section aria-label="Favourites" className="flex flex-col gap-6">
      <h2 className="m-0 font-display text-[clamp(30px,3.4vw,44px)] font-normal">Favourites</h2>
      {ids === null ? <p className="m-0 text-[15px] text-body">We could not load your favourites right now.</p> : null}
      {ids !== null && saved.length === 0 ? (
        <EmptyState icon={Heart} title="Nothing saved yet" action={{ label: "Browse new in", href: "/shop" }}>
          Tap the heart on any piece to keep it here, so you can find it again in one tap.
        </EmptyState>
      ) : null}
      {ids !== null && saved.length === 0 ? <h3 className="m-0 mt-4 font-display text-[26px] font-normal">A few pieces to start with</h3> : null}
      <CardGrid cards={cards} />
    </section>
  );
}
