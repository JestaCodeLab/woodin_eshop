import { getSession } from "@/lib/auth";
import { SignInLink, UserMenuDropdown } from "./UserMenuDropdown";

/**
 * The account control at the end of the navbar. It reads the session cookie (no WooCommerce call), so
 * render it behind <Suspense>: the page shell stays static and this part streams in.
 */
export async function UserMenu() {
  const session = await getSession();
  if (!session) return <SignInLink />;
  const initials = session.email.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "W";
  return <UserMenuDropdown email={session.email} initials={initials} />;
}
