import { z } from "zod";
import { clearSessionCookies, getSession } from "@/lib/auth";
import { listSessions, revokeSessions } from "@/lib/auth-wp";
import { guardBrowserPost, json } from "@/lib/checkout/http";
import { cookies } from "next/headers";

/** GET /api/account/sessions: the devices signed in to this account. */
export async function GET() {
  const session = await getSession();
  if (!session) return json({ error: "signed_out" }, 401);
  const list = await listSessions(session.customerId);
  if (!list) return json({ error: "unavailable", message: "Could not load your devices." }, 502);
  return json({ current: session.sid, sessions: list });
}

const schema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("revoke"), sid: z.string().regex(/^[a-f0-9]{12}$/) }),
  z.object({ op: z.literal("revoke_others") }),
  z.object({ op: z.literal("revoke_all") }),
]);

/** POST /api/account/sessions: sign out one device, every other device, or everywhere (this one too). */
export async function POST(req: Request) {
  const blocked = guardBrowserPost(req, { scope: "sessions", max: 30, windowMs: 10 * 60_000 });
  if (blocked) return blocked;
  const session = await getSession();
  if (!session) return json({ error: "signed_out", message: "Please sign in again." }, 401);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_request" }, 400);
  const op = parsed.data;

  // The customer id always comes from the signed access cookie, never from the request.
  const ok =
    op.op === "revoke"
      ? await revokeSessions({ customerId: session.customerId, sid: op.sid })
      : op.op === "revoke_others"
        ? await revokeSessions({ customerId: session.customerId, exceptSid: session.sid })
        : await revokeSessions({ customerId: session.customerId, all: true });
  if (!ok) return json({ error: "unavailable", message: "We could not do that. Please try again." }, 502);

  // Ending this device (directly or via "everywhere") also clears its cookies.
  const endedHere = op.op === "revoke_all" || (op.op === "revoke" && op.sid === session.sid);
  if (endedHere) clearSessionCookies(await cookies());
  return json({ ok: true, signedOut: endedHere });
}
