import { z } from "zod";
import { getSession } from "@/lib/auth";
import { guardBrowserPost, json } from "@/lib/checkout/http";
import { getFavorites, MAX_FAVORITES, setFavorites } from "@/lib/customers";

/** GET /api/account/favorites: { signedIn, ids }. Guests get an empty list, not an error. */
export async function GET() {
  const session = await getSession();
  if (!session) return json({ signedIn: false, ids: [] });
  try {
    return json({ signedIn: true, ids: await getFavorites(session.customerId) });
  } catch (e) {
    console.error("[favorites] read failed:", e instanceof Error ? e.message : e);
    return json({ error: "unavailable", message: "Could not load your favorites." }, 502);
  }
}

const schema = z.object({ productId: z.number().int().positive(), saved: z.boolean() });

/** POST /api/account/favorites: { productId, saved } adds or removes one product. */
export async function POST(req: Request) {
  const blocked = guardBrowserPost(req, { scope: "favorites", max: 60, windowMs: 10 * 60_000 });
  if (blocked) return blocked;
  const session = await getSession();
  if (!session) return json({ error: "signed_out", message: "Sign in to save favorites." }, 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_request" }, 400);
  const { productId, saved } = parsed.data;

  try {
    const current = await getFavorites(session.customerId);
    const without = current.filter((id) => id !== productId);
    if (saved && current.length >= MAX_FAVORITES && !current.includes(productId)) {
      return json({ error: "too_many", message: "Your favorites list is full." }, 409);
    }
    const next = saved ? [productId, ...without] : without;
    await setFavorites(session.customerId, next);
    return json({ signedIn: true, ids: next });
  } catch (e) {
    console.error("[favorites] write failed:", e instanceof Error ? e.message : e);
    return json({ error: "unavailable", message: "Could not save that. Please try again." }, 502);
  }
}
