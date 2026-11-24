import { z } from "zod";
import { getSession } from "@/lib/auth";
import { guardBrowserPost, json } from "@/lib/checkout/http";
import { confirmPhoneVerification } from "@/lib/phone-verify";

const schema = z.object({ code: z.string().trim().regex(/^\d{6}$/) });

/** POST /api/account/phone/verify { code }: confirms the texted code and marks the account's phone as verified. */
export async function POST(req: Request) {
  const blocked = guardBrowserPost(req, { scope: "phone-verify", max: 20, windowMs: 10 * 60_000 });
  if (blocked) return blocked;
  const session = await getSession();
  if (!session) return json({ error: "signed_out", message: "Please sign in again." }, 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid", message: "Enter the 6-digit code from the text message." }, 400);

  const r = await confirmPhoneVerification(session.customerId, parsed.data.code);
  return r.ok ? json({ ok: true }) : json({ error: "phone_verify_failed", message: r.message }, r.status);
}
