import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./auth";
import { customerNames, getAddresses, getCustomer, type Address } from "./customers";

/** Details to prefill at checkout for the signed-in customer: their default address. Null for guests. */
export async function getCheckoutPrefill(): Promise<{ name: string; phone: string; email: string; address: string; area: string; addresses: Address[] } | null> {
  const session = await getSession();
  if (!session) return null;
  const c = await getCustomer(session.customerId).catch(() => null);
  if (!c) return { name: "", phone: "", address: "", area: "", email: session.email, addresses: [] };
  const addresses = getAddresses(c);
  const d = addresses.find((a) => a.isDefault);
  const { first, last } = customerNames(c);
  return {
    name: d?.name || [first, last].filter(Boolean).join(" "),
    phone: d?.phone || c.billing?.phone || "",
    address: d?.address ?? "",
    area: d?.area ?? "",
    email: session.email,
    addresses,
  };
}

/** The signed-in session, or a redirect to sign in. For account pages (call behind <Suspense>). */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");
  return session;
}
