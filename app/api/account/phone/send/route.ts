import { getSession } from "@/lib/auth";
import { guardBrowserPost, json } from "@/lib/checkout/http";
import { startPhoneVerification } from "@/lib/phone-verify";
import { clientIp } from "@/lib/rate-limit";

/** POST /api/account/phone/send: texts a 6-digit code to the phone number on the signed-in customer's account. */
export async function POST(req: Request) {
  const blocked = guardBrowserPost(req, { scope: "phone-send", max: 6, windowMs: 10 * 60_000 });
  if (blocked) return blocked;
  // The customer comes from the session. There is no phone number in the request on purpose.
  const session = await getSession();
  if (!session) return json({ error: "signed_out", message: "Please sign in again." }, 401);

  const r = await startPhoneVerification(session.customerId, clientIp(req));
  return r.ok ? json({ ok: true, already: r.already === true }) : json({ error: "phone_send_failed", message: r.message }, r.status);
}
