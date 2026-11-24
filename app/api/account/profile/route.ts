import { getSession } from "@/lib/auth";
import { profileInput } from "@/lib/account-schemas";
import { guardBrowserPost, json } from "@/lib/checkout/http";
import { updateProfile } from "@/lib/customers";

/** POST /api/account/profile: name and phone. The email is how they sign in, so it cannot be changed here. */
export async function POST(req: Request) {
  const blocked = guardBrowserPost(req, { scope: "profile", max: 20, windowMs: 10 * 60_000 });
  if (blocked) return blocked;
  const session = await getSession();
  if (!session) return json({ error: "signed_out", message: "Please sign in again." }, 401);

  const parsed = profileInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_request", message: parsed.error.issues[0]?.message ?? "Check the details and try again." }, 400);

  try {
    await updateProfile(session.customerId, parsed.data);
    return json({ ok: true });
  } catch (e) {
    console.error("[profile] failed:", e instanceof Error ? e.message : e);
    return json({ error: "unavailable", message: "We could not save that. Please try again." }, 502);
  }
}
