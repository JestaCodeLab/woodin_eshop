import { CardGrid, EmptyHint, savedCards, suggestionCards } from "@/components/account/Favourites";
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
      <h2 className="m-0 font-display text-[clamp(30px,3.4vw,44px)] font-normal">{saved.length > 0 ? "Your favourites" : "Nothing saved yet"}</h2>
      {ids === null ? <p className="m-0 text-[15px] text-body">We could not load your favourites right now.</p> : null}
      {ids !== null && saved.length === 0 ? <EmptyHint /> : null}
      <CardGrid cards={cards} />
    </section>
  );
}
