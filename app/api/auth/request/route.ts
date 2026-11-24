import { accountsEnabled } from "@/lib/auth";
import { requestLoginCode } from "@/lib/auth-wp";
import { registerDetails, requestSchema } from "@/lib/auth-schemas";
import { guardBrowserPost, json } from "@/lib/checkout/http";
import { clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

/**
 * POST /api/auth/request: asks for a 6-digit code by email.
 *
 * - Turnstile first, so a script cannot make us send mail.
 * - "login" only ever reaches an existing customer; "register" reaches the address being registered (name and
 *   phone are checked here and again when the code is confirmed).
 * - The answer is the same whether or not an email went out, so this cannot be used to find out who has an account.
 */
export async function POST(req: Request) {
  const blocked = guardBrowserPost(req, { scope: "auth-request", max: 6, windowMs: 10 * 60_000 });
  if (blocked) return blocked;
  if (!accountsEnabled()) return json({ error: "accounts_disabled", message: "Accounts are not available yet." }, 503);

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_email", message: "Enter a valid email address." }, 400);
  const { mode, email, turnstile } = parsed.data;

  if (mode === "register") {
    const d = registerDetails.safeParse({ name: parsed.data.name, phone: parsed.data.phone });
    if (!d.success) return json({ error: "invalid_request", message: d.error.issues[0]?.message ?? "Check your details and try again." }, 400);
  }

  const ip = clientIp(req);
  if (!(await verifyTurnstile(turnstile, ip))) {
    return json({ error: "captcha", message: "Please complete the check below the form, then try again." }, 400);
  }

  const result = await requestLoginCode(email, ip, mode);
  if (result === "rate_limited") return json({ error: "too_many", message: "Too many requests. Please wait a few minutes and try again." }, 429);
  if (result === "unavailable") return json({ error: "unavailable", message: "We could not send your code right now. Please try again." }, 502);
  return json({ ok: true });
}
