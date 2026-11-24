import { getSession } from "@/lib/auth";
import { addressOp } from "@/lib/account-schemas";
import { guardBrowserPost, json } from "@/lib/checkout/http";
import { getAddresses, getCustomer, MAX_ADDRESSES, newAddressId, saveAddresses, type Address } from "@/lib/customers";

/** POST /api/account/addresses: add, update, remove or set the default address of the signed-in customer. */
export async function POST(req: Request) {
  const blocked = guardBrowserPost(req, { scope: "addresses", max: 40, windowMs: 10 * 60_000 });
  if (blocked) return blocked;
  const session = await getSession();
  if (!session) return json({ error: "signed_out", message: "Please sign in again." }, 401);

  const parsed = addressOp.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "invalid_request", message: parsed.error.issues[0]?.message ?? "Check the details and try again." }, 400);
  }
  const op = parsed.data;

  try {
    // The customer id comes from the session, never from the request.
    const list = getAddresses(await getCustomer(session.customerId));
    let next: Address[];
    switch (op.op) {
      case "add":
        if (list.length >= MAX_ADDRESSES) return json({ error: "too_many", message: `You can save up to ${MAX_ADDRESSES} addresses.` }, 409);
        next = [...list, { ...op.address, id: newAddressId(), isDefault: list.length === 0 }];
        break;
      case "update":
        if (!list.some((a) => a.id === op.id)) return json({ error: "not_found", message: "That address no longer exists." }, 404);
        next = list.map((a) => (a.id === op.id ? { ...op.address, id: a.id, isDefault: a.isDefault } : a));
        break;
      case "remove":
        next = list.filter((a) => a.id !== op.id);
        break;
      case "default":
        if (!list.some((a) => a.id === op.id)) return json({ error: "not_found", message: "That address no longer exists." }, 404);
        next = list.map((a) => ({ ...a, isDefault: a.id === op.id }));
        break;
    }
    return json({ ok: true, addresses: await saveAddresses(session.customerId, next) });
  } catch (e) {
    console.error("[addresses] failed:", e instanceof Error ? e.message : e);
    return json({ error: "unavailable", message: "We could not save that. Please try again." }, 502);
  }
}
