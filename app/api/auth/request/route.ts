import { z } from "zod";
import { accountsEnabled, requestLoginCode } from "@/lib/auth";
import { guardBrowserPost, json } from "@/lib/checkout/http";
import { clientIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(200) });

/** POST /api/auth/request: emails a 6-digit sign-in code (sent by WordPress). */
export async function POST(req: Request) {
  const blocked = guardBrowserPost(req, { scope: "auth-request", max: 6, windowMs: 10 * 60_000 });
  if (blocked) return blocked;
  if (!accountsEnabled()) return json({ error: "accounts_disabled", message: "Accounts are not available yet." }, 503);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_email", message: "Enter a valid email address." }, 400);

  const r = await requestLoginCode(parsed.data.email, clientIp(req));
  if (r.ok) return json({ ok: true });
  if (r.reason === "too_soon") return json({ error: "too_soon", message: "A code was just sent. Please wait a moment before asking for another." }, 429);
  if (r.reason === "invalid_email") return json({ error: "invalid_email", message: "Enter a valid email address." }, 400);
  return json({ error: "unavailable", message: "We could not send your code right now. Please try again." }, 502);
}
