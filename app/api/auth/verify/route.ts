import { accountsEnabled, startSession } from "@/lib/auth";
import { verifyLoginCode } from "@/lib/auth-wp";
import { registerDetails, verifySchema } from "@/lib/auth-schemas";
import { mergeSavedCart } from "@/lib/cart/demo";
import { guardBrowserPost, json } from "@/lib/checkout/http";
import { createCustomer, findCustomer, getSavedCart, NotACustomerError } from "@/lib/customers";

const MESSAGES = {
  wrong: "That code is not right. Check it and try again.",
  expired: "That code has expired. Ask for a new one.",
  locked: "Too many wrong tries. Ask for a new code.",
  invalid: "Enter the 6-digit code from your email.",
} as const;

const FAILED = { error: "unavailable", message: "We could not finish signing you in. Please try again." } as const;

/**
 * POST /api/auth/verify: checks the code (WordPress), then signs the customer in.
 * An account is created ONLY here, only for a registration, and only after the emailed code proved the address.
 * Signing in never creates an account.
 */
export async function POST(req: Request) {
  const blocked = guardBrowserPost(req, { scope: "auth-verify", max: 20, windowMs: 10 * 60_000 });
  if (blocked) return blocked;
  if (!accountsEnabled()) return json({ error: "accounts_disabled", message: "Accounts are not available yet." }, 503);

  const parsed = verifySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid", message: MESSAGES.invalid }, 400);
  const { mode, email, code } = parsed.data;

  const r = await verifyLoginCode(email, code);
  if (!r.ok) {
    if (r.reason === "unavailable") return json({ error: "unavailable", message: "We could not check your code right now. Please try again." }, 502);
    return json({ error: r.reason, message: MESSAGES[r.reason] }, 401);
  }

  try {
    let customerId = await findCustomer(email);
    if (customerId === null) {
      // A sign-in never creates an account. (The code could not have been sent for an unknown email anyway.)
      if (mode !== "register") return json({ error: "expired", message: MESSAGES.expired }, 401);
      const d = registerDetails.safeParse({ name: parsed.data.name, phone: parsed.data.phone });
      if (!d.success) return json({ error: "invalid_request", message: d.error.issues[0]?.message ?? "Check your details and try again." }, 400);
      customerId = await createCustomer(email, d.data);
    }

    if (!(await startSession(req, customerId, email))) return json(FAILED, 502);

    // The bag is a nicety: never block sign-in on it.
    await getSavedCart(customerId)
      .then((saved) => mergeSavedCart(customerId, saved))
      .catch((e) => console.error("[auth] could not merge the saved bag:", e instanceof Error ? e.message : e));
    return json({ ok: true });
  } catch (e) {
    // Same wording for a staff address as for any failure: do not reveal that it belongs to staff.
    if (e instanceof NotACustomerError) console.error("[auth] refused: the email belongs to a non-customer WordPress user");
    else console.error("[auth] sign-in failed after a valid code:", e instanceof Error ? e.message : e);
    return json(FAILED, 502);
  }
}
