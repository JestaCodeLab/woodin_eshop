import { z } from "zod";
import { accountsEnabled, startSession, verifyLoginCode } from "@/lib/auth";
import { mergeSavedCart } from "@/lib/cart/demo";
import { guardBrowserPost, json } from "@/lib/checkout/http";
import { findOrCreateCustomer, getSavedCart, NotACustomerError } from "@/lib/customers";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  code: z.string().trim().regex(/^\d{6}$/),
});

const MESSAGES = {
  wrong: "That code is not right. Check it and try again.",
  expired: "That code has expired. Ask for a new one.",
  locked: "Too many wrong tries. Ask for a new code.",
  invalid: "Enter the 6-digit code from your email.",
} as const;

/** POST /api/auth/verify: checks the code (WordPress), then signs the customer in. */
export async function POST(req: Request) {
  const blocked = guardBrowserPost(req, { scope: "auth-verify", max: 20, windowMs: 10 * 60_000 });
  if (blocked) return blocked;
  if (!accountsEnabled()) return json({ error: "accounts_disabled", message: "Accounts are not available yet." }, 503);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid", message: MESSAGES.invalid }, 400);
  const { email, code } = parsed.data;

  const r = await verifyLoginCode(email, code);
  if (!r.ok) {
    if (r.reason === "unavailable") return json({ error: "unavailable", message: "We could not check your code right now. Please try again." }, 502);
    return json({ error: r.reason, message: MESSAGES[r.reason] }, 401);
  }

  try {
    const customer = await findOrCreateCustomer(email);
    await startSession(customer.id, email);
    // The bag is a nicety: never block sign-in on it.
    await getSavedCart(customer.id)
      .then((saved) => mergeSavedCart(customer.id, saved))
      .catch((e) => console.error("[auth] could not merge the saved bag:", e instanceof Error ? e.message : e));
    return json({ ok: true });
  } catch (e) {
    if (e instanceof NotACustomerError) {
      // Same wording as any failure: do not reveal that the address belongs to staff.
      console.error("[auth] refused: the email belongs to a non-customer WordPress user");
      return json({ error: "unavailable", message: "We could not finish signing you in. Please try again." }, 502);
    }
    console.error("[auth] sign-in failed after a valid code:", e instanceof Error ? e.message : e);
    return json({ error: "unavailable", message: "We could not finish signing you in. Please try again." }, 502);
  }
}
