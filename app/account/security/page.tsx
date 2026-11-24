import { SessionsManager } from "@/components/account/SessionsManager";
import { requireSession } from "@/lib/account";
import { listSessions } from "@/lib/auth-wp";

export const metadata = { title: "Security" };

const fmt = new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra" });
const when = (unix: number) => fmt.format(new Date(unix * 1000));

export default async function SecurityPage() {
  const session = await requireSession();
  const list = await listSessions(session.customerId);
  return (
    <section aria-label="Security" className="flex flex-col gap-6">
      <h2 className="m-0 font-display text-[clamp(30px,3.4vw,44px)] font-normal">Security</h2>
      <p className="m-0 max-w-[560px] text-[15px] font-light text-body">
        These devices are signed in to your account. You sign in with an emailed code, so there is no password to protect. Sign out any device you do not recognise.
      </p>
      {list === null ? (
        <p className="m-0 text-[15px] text-body">We could not load your devices right now. Please try again in a moment.</p>
      ) : (
        <SessionsManager
          current={session.sid}
          devices={[...list]
            .sort((a, b) => b.last_used - a.last_used)
            .map((s) => ({ sid: s.sid, label: s.label, ip: s.ip, signedIn: when(s.created), lastUsed: when(s.last_used) }))}
        />
      )}
    </section>
  );
}
